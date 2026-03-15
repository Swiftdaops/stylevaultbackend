import MakeupAppointment from '../models/MakeupAppointment.js';
import MakeupCustomer from '../models/MakeupCustomer.js';
import MakeupService from '../models/MakeupService.js';
import MakeupArtist from '../models/MakeupArtist.js';
import User from '../models/User.js';
import { sendEmail } from '../services/emailService.js';
import {
  sendAdminBookingNotificationEmail,
  sendCustomerBookingConfirmationEmail,
  sendStorefrontOwnerBookingNotificationEmail,
} from '../services/bookingNotificationService.js';
import { sendPushNotificationToEntries, sendUserPushNotification } from '../services/pushNotificationService.js';
import { emitMakeupArtistUpdate } from '../socket/index.js';
import { ensureBookingManagementToken, generateBookingManagementToken } from '../utils/bookingAccess.js';
import { upsertNotificationDeviceEntries } from '../utils/notificationDevices.js';
import { buildDashboardUrl, buildStorefrontManageBookingUrl } from '../utils/storefrontLinks.js';

const pad = (value) => String(value).padStart(2, '0');

const formatLocalDateTime = (value) => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;

  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
};

const buildDateTime = (date, time) => {
  if (!date || !time) return null;
  const value = new Date(`${date}T${time}:00`);
  return Number.isNaN(value.getTime()) ? null : value;
};

const resolveMakeupArtistId = async (makeupReference) => {
  if (!makeupReference) return null;

  if (typeof makeupReference === 'object' && makeupReference !== null && makeupReference.toString) {
    return makeupReference.toString();
  }

  if (typeof makeupReference === 'string' && /^[0-9a-fA-F]{24}$/.test(makeupReference)) {
    return makeupReference;
  }

  const makeupArtist = await MakeupArtist.findOne({ slug: makeupReference }).select('_id');
  return makeupArtist?._id?.toString() || null;
};

const getMakeupArtistIdFromRequest = async (req) => {
  if (req.user?.makeupArtistId) return req.user.makeupArtistId.toString();

  return resolveMakeupArtistId(
    req.body?.makeupArtistId
      || req.body?.makeupArtist
      || req.body?.slug
      || req.query?.makeupArtistId
      || req.query?.makeupArtist
      || req.query?.slug
  );
};

const getAdminBookingEmail = () => (
  process.env.ADMIN_BOOKING_EMAIL
  || process.env.ADMIN_NOTIFICATION_EMAIL
  || 'stylevaultlite@gmail.com'
);

const MAX_NOTIFICATION_SUBSCRIPTIONS = 10;

const upsertCustomer = async ({ makeupArtistId, name, email, phone, notificationPreference, req }) => {
  let customer = await MakeupCustomer.findOne({ makeupArtistId, email });

  if (!customer) {
    customer = await MakeupCustomer.create({
      makeupArtistId,
      name,
      email,
      phone: phone || undefined,
      notificationSubscriptions: upsertNotificationDeviceEntries([], notificationPreference, { req, maxItems: MAX_NOTIFICATION_SUBSCRIPTIONS }),
      visitHistory: [],
    });
  } else {
    customer.name = name || customer.name;
    if (phone) customer.phone = phone;
    customer.notificationSubscriptions = upsertNotificationDeviceEntries(
      customer.notificationSubscriptions,
      notificationPreference,
      { req, maxItems: MAX_NOTIFICATION_SUBSCRIPTIONS }
    );
    await customer.save();
  }

  return customer;
};

const getServiceDuration = (service, selectedPricingOption) => {
  const option = service?.pricingOptions?.find((item) => item.label === selectedPricingOption);
  return option?.duration || service?.duration || 0;
};

const mapCalendarEvent = (appointment) => {
  const startAt = buildDateTime(appointment.date, appointment.time);
  const duration = getServiceDuration(appointment.serviceId, appointment.selectedPricingOption);
  const endAt = startAt ? new Date(startAt.getTime() + duration * 60 * 1000) : null;
  const serviceName = appointment.serviceId?.name || 'Appointment';

  return {
    id: appointment._id,
    title: `${serviceName} - ${appointment.customerName}`,
    start: formatLocalDateTime(startAt) || `${appointment.date}T${appointment.time}:00`,
    end: formatLocalDateTime(endAt),
    status: appointment.status,
    date: appointment.date,
    time: appointment.time,
    price: appointment.price,
    customerName: appointment.customerName,
    customerEmail: appointment.customerEmail,
    customerId: appointment.customerId?._id || appointment.customerId,
    selectedPricingOption: appointment.selectedPricingOption,
    selectedAddOns: appointment.selectedAddOns || [],
    service: appointment.serviceId
      ? {
          id: appointment.serviceId._id,
          name: appointment.serviceId.name,
          duration,
          price: appointment.serviceId.price,
        }
      : null,
  };
};

const resolveBookingSelections = (service, payload = {}) => {
  const selectedPricingOption = payload.selectedPricingOption || '';
  const selectedAddOns = Array.isArray(payload.selectedAddOns) ? payload.selectedAddOns : [];

  let totalPrice = Number(service.price || 0);

  if (selectedPricingOption) {
    const pricingOption = service.pricingOptions.find((item) => item.label === selectedPricingOption);
    if (!pricingOption) {
      const error = new Error('Selected pricing option is invalid');
      error.statusCode = 400;
      throw error;
    }
    totalPrice = Number(pricingOption.price || totalPrice);
  }

  const matchedAddOns = selectedAddOns
    .map((name) => service.addOns.find((item) => item.name === name))
    .filter(Boolean);

  totalPrice += matchedAddOns.reduce((sum, item) => sum + Number(item.price || 0), 0);

  return {
    selectedPricingOption,
    selectedAddOns: matchedAddOns.map((item) => item.name),
    totalPrice,
  };
};

export const createMakeupAppointment = async (req, res) => {
  try {
    const {
      serviceId,
      date,
      time,
      customerName,
      customerEmail,
      name,
      email,
      phone,
      notificationPreference,
      makeupArtistId: bodyMakeupArtistId,
      makeupArtist,
      slug,
    } = req.body;

    const makeupArtistId = await getMakeupArtistIdFromRequest({
      ...req,
      body: { ...req.body, makeupArtistId: bodyMakeupArtistId || makeupArtist || slug },
    });

    if (!makeupArtistId) return res.status(400).json({ message: 'Makeup artist is required' });

    const cName = customerName || name;
    const cEmail = customerEmail || email;
    if (!cName || !cEmail) {
      return res.status(400).json({ message: 'Customer name and email are required' });
    }

    const service = await MakeupService.findOne({ _id: serviceId, makeupArtistId });
    if (!service) return res.status(404).json({ message: 'Service not found' });

    const artistProfile = await MakeupArtist.findById(makeupArtistId).lean();
    if (!artistProfile) return res.status(404).json({ message: 'Makeup artist not found' });

    const artistUser = await User.findOne({ makeupArtistId, role: 'makeup-artist' }).select('email notificationTokens').lean();

    const exists = await MakeupAppointment.findOne({ makeupArtistId, date, time, status: { $ne: 'cancelled' } });
    if (exists) return res.status(400).json({ message: 'Time slot already booked' });

    const customer = await upsertCustomer({
      makeupArtistId,
      name: cName,
      email: cEmail,
      phone,
      notificationPreference,
      req,
    });
    const bookingSelections = resolveBookingSelections(service, req.body);

    const appointment = await MakeupAppointment.create({
      makeupArtistId,
      serviceId,
      date,
      time,
      customerId: customer._id,
      customerName: cName,
      customerEmail: cEmail,
      managementToken: generateBookingManagementToken(),
      price: bookingSelections.totalPrice,
      selectedPricingOption: bookingSelections.selectedPricingOption,
      selectedAddOns: bookingSelections.selectedAddOns,
      status: 'confirmed',
    });

    await MakeupService.findByIdAndUpdate(serviceId, { $inc: { bookingsCount: 1 } });

    customer.visitHistory.push(appointment._id);
    await customer.save();

    let emailResult = null;
    let emailError = null;
    let adminEmailResult = null;
    let adminEmailError = null;
    let artistEmailResult = null;
    let artistEmailError = null;
    let artistPushResult = null;
    let artistPushError = null;
    let customerPushResult = null;
    let customerPushError = null;

    const manageLink = buildStorefrontManageBookingUrl({
      slug: artistProfile.slug,
      providerPath: 'makeup-artists',
      providerType: 'makeup-artist',
      appointmentId: appointment._id.toString(),
      accessToken: appointment.managementToken,
    });

    try {
      emailResult = await sendCustomerBookingConfirmationEmail({
        to: cEmail,
        customerName: cName,
        providerName: artistProfile.name,
        providerLabel: 'Makeup Artist',
        serviceName: service.name,
        appointmentDate: date,
        appointmentTime: time,
        location: artistProfile.location || 'StyleVault booking',
        price: bookingSelections.totalPrice,
        currency: artistProfile.currency || 'USD',
        manageLink,
      });
    } catch (err) {
      emailError = err.message;
      console.error('Makeup booking confirmation email failed:', err.message);
    }

    try {
      adminEmailResult = await sendAdminBookingNotificationEmail({
        to: getAdminBookingEmail(),
        customerName: cName,
        customerEmail: cEmail,
        customerPhone: phone,
        providerName: artistProfile.name,
        providerLabel: 'Makeup Artist',
        serviceName: service.name,
        appointmentDate: date,
        appointmentTime: time,
        location: artistProfile.location || 'StyleVault booking',
        price: bookingSelections.totalPrice,
        currency: artistProfile.currency || 'USD',
      });
    } catch (err) {
      adminEmailError = err.message;
      console.error('Makeup admin booking email failed:', err.message);
    }

    if (artistUser?.email) {
      try {
        artistEmailResult = await sendStorefrontOwnerBookingNotificationEmail({
          to: artistUser.email,
          customerName: cName,
          customerEmail: cEmail,
          customerPhone: phone,
          providerName: artistProfile.name,
          providerLabel: 'Makeup Artist',
          serviceName: service.name,
          appointmentDate: date,
          appointmentTime: time,
          location: artistProfile.location || 'StyleVault booking',
          price: bookingSelections.totalPrice,
          currency: artistProfile.currency || 'USD',
          dashboardLink: buildDashboardUrl('/makeup-artists/admin/appointments'),
        });
      } catch (err) {
        artistEmailError = err.message;
        console.error('Makeup artist booking email failed:', err.message);
      }
    } else {
      artistEmailError = 'Makeup artist email is not configured';
    }

    if (artistUser) {
      try {
        artistPushResult = await sendUserPushNotification({
          user: artistUser,
          title: 'New appointment booked',
          body: `${cName} booked ${service.name} on ${date} at ${time}.`,
          data: {
            type: 'appointment',
            action: 'created',
            appointmentId: appointment._id.toString(),
            providerRole: 'makeup-artist',
            providerId: makeupArtistId,
            customerName: cName,
            serviceName: service.name,
            appointmentDate: date,
            appointmentTime: time,
            link: '/makeup-artists/admin/appointments',
          },
          link: '/makeup-artists/admin/appointments',
        });
      } catch (err) {
        artistPushError = err.message;
        console.error('Makeup artist push notification failed:', err.message);
      }
    } else {
      artistPushError = 'Makeup artist account is not configured';
    }

    try {
      customerPushResult = await sendPushNotificationToEntries({
        entries: customer.notificationSubscriptions,
        title: 'Booking confirmed',
        body: `${service.name} with ${artistProfile.name} is confirmed for ${date} at ${time}.`,
        data: {
          type: 'appointment',
          action: 'confirmed',
          appointmentId: appointment._id.toString(),
          providerRole: 'makeup-artist',
          providerId: makeupArtistId,
          customerName: cName,
          serviceName: service.name,
          appointmentDate: date,
          appointmentTime: time,
          link: manageLink,
        },
        link: manageLink,
        pruneInvalidTokens: async (invalidTokens) => {
          await MakeupCustomer.findByIdAndUpdate(customer._id, {
            $pull: {
              notificationSubscriptions: {
                token: { $in: invalidTokens },
              },
            },
          });
        },
      });
    } catch (err) {
      customerPushError = err.message;
      console.error('Makeup customer push notification failed:', err.message);
    }

    emitMakeupArtistUpdate(makeupArtistId, {
      type: 'appointment',
      action: 'created',
      appointmentId: appointment._id.toString(),
      customerName: cName,
      serviceName: service.name,
      appointmentDate: date,
      appointmentTime: time,
    });

    res.status(201).json({
      appointment,
      manageLink,
      emailResult,
      emailError,
      adminEmailResult,
      adminEmailError,
      artistEmailResult,
      artistEmailError,
      artistPushResult,
      artistPushError,
      customerPushResult,
      customerPushError,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const getMakeupAppointments = async (req, res) => {
  try {
    const makeupArtistId = await getMakeupArtistIdFromRequest(req);
    if (!makeupArtistId) return res.status(400).json({ message: 'Makeup artist is required' });

    const filter = { makeupArtistId };

    if (req.query.status) filter.status = req.query.status;
    if (req.query.date) filter.date = req.query.date;
    if (req.query.customerId) filter.customerId = req.query.customerId;
    if (req.query.includeCancelled !== 'true') filter.status = { $ne: 'cancelled' };

    const appointments = await MakeupAppointment.find(filter)
      .populate('serviceId', 'name duration price pricingOptions addOns')
      .populate('customerId', 'name email phone')
      .sort({ date: 1, time: 1 });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMakeupCalendarAppointments = async (req, res) => {
  try {
    const makeupArtistId = await getMakeupArtistIdFromRequest(req);
    if (!makeupArtistId) return res.status(400).json({ message: 'Makeup artist is required' });

    const filter = { makeupArtistId };

    if (req.query.start || req.query.end) {
      filter.date = {};
      if (req.query.start) filter.date.$gte = req.query.start;
      if (req.query.end) filter.date.$lte = req.query.end;
    }

    const appointments = await MakeupAppointment.find(filter)
      .populate('serviceId', 'name duration price pricingOptions addOns')
      .populate('customerId', 'name email phone')
      .sort({ date: 1, time: 1 });

    res.json(appointments.map(mapCalendarEvent));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const checkMakeupAvailability = async (req, res) => {
  try {
    const { date, time } = req.query;
    const makeupArtistId = await getMakeupArtistIdFromRequest(req);

    if (!makeupArtistId) return res.status(400).json({ message: 'Makeup artist is required' });
    if (!date) return res.status(400).json({ message: 'Date is required' });

    const appointments = await MakeupAppointment.find({ makeupArtistId, date, status: { $ne: 'cancelled' } });
    const bookedTimes = appointments.map((appointment) => appointment.time);

    res.json({
      bookedTimes,
      available: time ? !bookedTimes.includes(time) : undefined,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateMakeupAppointment = async (req, res) => {
  try {
    const makeupArtistId = req.user?.makeupArtistId;
    const appointment = await MakeupAppointment.findOne({ _id: req.params.id, makeupArtistId });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    const nextDate = req.body.date || appointment.date;
    const nextTime = req.body.time || appointment.time;

    if (nextDate !== appointment.date || nextTime !== appointment.time) {
      const conflictingAppointment = await MakeupAppointment.findOne({
        _id: { $ne: appointment._id },
        makeupArtistId,
        date: nextDate,
        time: nextTime,
        status: { $ne: 'cancelled' },
      });

      if (conflictingAppointment) {
        return res.status(400).json({ message: 'Time slot already booked' });
      }
    }

    const service = await MakeupService.findOne({
      _id: req.body.serviceId || appointment.serviceId,
      makeupArtistId,
    });

    if (!service) return res.status(404).json({ message: 'Service not found' });

    const bookingSelections = resolveBookingSelections(service, {
      selectedPricingOption: req.body.selectedPricingOption ?? appointment.selectedPricingOption,
      selectedAddOns: req.body.selectedAddOns ?? appointment.selectedAddOns,
    });

    const nextCustomerName = req.body.customerName || req.body.name || appointment.customerName;
    const nextCustomerEmail = req.body.customerEmail || req.body.email || appointment.customerEmail;
    const nextCustomerPhone = req.body.phone;

    if (nextCustomerEmail) {
      const customer = await upsertCustomer({
        makeupArtistId,
        name: nextCustomerName,
        email: nextCustomerEmail,
        phone: nextCustomerPhone,
      });

      appointment.customerId = customer._id;
      appointment.customerName = nextCustomerName;
      appointment.customerEmail = nextCustomerEmail;

      if (!customer.visitHistory.some((visitId) => visitId.toString() === appointment._id.toString())) {
        customer.visitHistory.push(appointment._id);
        await customer.save();
      }
    }

    appointment.serviceId = service._id;
    appointment.price = bookingSelections.totalPrice;
    appointment.selectedPricingOption = bookingSelections.selectedPricingOption;
    appointment.selectedAddOns = bookingSelections.selectedAddOns;
    if (req.body.date) appointment.date = req.body.date;
    if (req.body.time) appointment.time = req.body.time;
    if (req.body.status) appointment.status = req.body.status;

    await appointment.save();

    const populatedAppointment = await MakeupAppointment.findById(appointment._id)
      .populate('serviceId', 'name duration price pricingOptions addOns')
      .populate('customerId', 'name email phone');

    emitMakeupArtistUpdate(makeupArtistId, {
      type: 'appointment',
      action: 'updated',
      appointmentId: appointment._id.toString(),
    });

    res.json(populatedAppointment);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const cancelMakeupAppointment = async (req, res) => {
  try {
    const makeupArtistId = req.user?.makeupArtistId;
    const appointment = await MakeupAppointment.findOne({ _id: req.params.id, makeupArtistId })
      .populate('serviceId', 'name');

    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    appointment.status = 'cancelled';
    await appointment.save();

    let emailResult = null;
    let emailError = null;

    try {
      emailResult = await sendEmail({
        to: appointment.customerEmail,
        subject: 'Your appointment was cancelled',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
            <h2>Appointment Cancelled</h2>
            <p>Hi ${appointment.customerName},</p>
            <p>Your ${appointment.serviceId?.name || 'appointment'} on ${appointment.date} at ${appointment.time} has been cancelled.</p>
          </div>
        `,
      });
    } catch (err) {
      emailError = err.message;
      console.error('Makeup cancellation email failed:', err.message);
    }

    emitMakeupArtistUpdate(makeupArtistId, {
      type: 'appointment',
      action: 'cancelled',
      appointmentId: appointment._id.toString(),
    });

    res.json({ appointment, emailResult, emailError });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resendMakeupConfirmationEmail = async (req, res) => {
  try {
    const makeupArtistId = req.user?.makeupArtistId;
    if (!makeupArtistId) return res.status(403).json({ message: 'Not authorized' });

    const appointment = await MakeupAppointment.findOne({ _id: req.params.id, makeupArtistId })
      .populate('serviceId', 'name duration price pricingOptions addOns')
      .populate('customerId', 'name email phone');

    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    const makeupArtist = await MakeupArtist.findById(makeupArtistId).lean();

    let emailResult = null;
    let emailError = null;

    try {
      const accessToken = await ensureBookingManagementToken(appointment);
      const manageLink = buildStorefrontManageBookingUrl({
        slug: makeupArtist?.slug,
        providerPath: 'makeup-artists',
        providerType: 'makeup-artist',
        appointmentId: appointment._id.toString(),
        accessToken,
      });
      emailResult = await sendCustomerBookingConfirmationEmail({
        to: appointment.customerEmail,
        customerName: appointment.customerName,
        providerName: makeupArtist?.name || 'StyleVault',
        providerLabel: 'Makeup Artist',
        serviceName: appointment.serviceId?.name || 'Appointment',
        appointmentDate: appointment.date,
        appointmentTime: appointment.time,
        location: makeupArtist?.location || 'StyleVault booking',
        price: appointment.price || appointment.serviceId?.price || 0,
        currency: makeupArtist?.currency || 'USD',
        manageLink,
      });
    } catch (err) {
      emailError = err.message;
      console.error('Makeup resend confirmation email failed:', err.message);
    }

    res.json({ appointment, emailResult, emailError });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
