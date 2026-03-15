import HairAppointment from '../models/HairAppointment.js';
import HairCustomer from '../models/HairCustomer.js';
import HairService from '../models/HairService.js';
import HairSpecialist from '../models/HairSpecialist.js';
import User from '../models/User.js';
import {
  sendAdminBookingNotificationEmail,
  sendCustomerBookingConfirmationEmail,
  sendStorefrontOwnerBookingNotificationEmail,
} from '../services/bookingNotificationService.js';
import { sendUserPushNotification } from '../services/pushNotificationService.js';
import { sendCustomerAppointmentStatusNotifications } from '../services/customerAppointmentStatusService.js';
import { emitHairSpecialistUpdate } from '../socket/index.js';
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

const resolveHairSpecialistId = async (hairReference) => {
  if (!hairReference) return null;

  if (typeof hairReference === 'object' && hairReference !== null && hairReference.toString) {
    return hairReference.toString();
  }

  if (typeof hairReference === 'string' && /^[0-9a-fA-F]{24}$/.test(hairReference)) {
    return hairReference;
  }

  const hairSpecialist = await HairSpecialist.findOne({ slug: hairReference }).select('_id');
  return hairSpecialist?._id?.toString() || null;
};

const getHairSpecialistIdFromRequest = async (req) => {
  if (req.user?.hairSpecialistId) return req.user.hairSpecialistId.toString();

  return resolveHairSpecialistId(
    req.body?.hairSpecialistId
      || req.body?.hairSpecialist
      || req.body?.slug
      || req.query?.hairSpecialistId
      || req.query?.hairSpecialist
      || req.query?.slug
  );
};

const getAdminBookingEmail = () => (
  process.env.ADMIN_BOOKING_EMAIL
  || process.env.ADMIN_NOTIFICATION_EMAIL
  || 'stylevaultlite@gmail.com'
);

const MAX_NOTIFICATION_SUBSCRIPTIONS = 10;

const upsertCustomer = async ({ hairSpecialistId, name, email, phone, notificationPreference, req }) => {
  let customer = await HairCustomer.findOne({ hairSpecialistId, email });

  if (!customer) {
    customer = await HairCustomer.create({
      hairSpecialistId,
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

export const createHairAppointment = async (req, res) => {
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
      hairSpecialistId: bodyHairSpecialistId,
      hairSpecialist,
      slug,
    } = req.body;

    const hairSpecialistId = await getHairSpecialistIdFromRequest({
      ...req,
      body: { ...req.body, hairSpecialistId: bodyHairSpecialistId || hairSpecialist || slug },
    });

    if (!hairSpecialistId) return res.status(400).json({ message: 'Hair specialist is required' });

    const cName = customerName || name;
    const cEmail = customerEmail || email;
    if (!cName || !cEmail) {
      return res.status(400).json({ message: 'Customer name and email are required' });
    }

    const service = await HairService.findOne({ _id: serviceId, hairSpecialistId });
    if (!service) return res.status(404).json({ message: 'Service not found' });

    const specialistProfile = await HairSpecialist.findById(hairSpecialistId).lean();
    if (!specialistProfile) return res.status(404).json({ message: 'Hair specialist not found' });

    const specialistUser = await User.findOne({ hairSpecialistId, role: 'hair-specialist' }).select('email notificationTokens').lean();

    const exists = await HairAppointment.findOne({ hairSpecialistId, date, time, status: { $ne: 'cancelled' } });
    if (exists) return res.status(400).json({ message: 'Time slot already booked' });

    const customer = await upsertCustomer({
      hairSpecialistId,
      name: cName,
      email: cEmail,
      phone,
      notificationPreference,
      req,
    });
    const bookingSelections = resolveBookingSelections(service, req.body);

    const appointment = await HairAppointment.create({
      hairSpecialistId,
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
      status: 'pending',
    });

    await HairService.findByIdAndUpdate(serviceId, { $inc: { bookingsCount: 1 } });

    customer.visitHistory.push(appointment._id);
    await customer.save();

    let emailResult = null;
    let emailError = null;
    let adminEmailResult = null;
    let adminEmailError = null;
    let specialistEmailResult = null;
    let specialistEmailError = null;
    let specialistPushResult = null;
    let specialistPushError = null;
    let customerPushResult = null;
    let customerPushError = null;

    const manageLink = buildStorefrontManageBookingUrl({
      slug: specialistProfile.slug,
      providerPath: 'hair-specialists',
      providerType: 'hair-specialist',
      appointmentId: appointment._id.toString(),
      accessToken: appointment.managementToken,
    });

    try {
      adminEmailResult = await sendAdminBookingNotificationEmail({
        to: getAdminBookingEmail(),
        customerName: cName,
        customerEmail: cEmail,
        customerPhone: phone,
        providerName: specialistProfile.name,
        providerLabel: 'Hair Specialist',
        serviceName: service.name,
        appointmentDate: date,
        appointmentTime: time,
        location: specialistProfile.location || 'StyleVault booking',
        price: bookingSelections.totalPrice,
        currency: specialistProfile.currency || 'USD',
      });
    } catch (err) {
      adminEmailError = err.message;
      console.error('Hair admin booking email failed:', err.message);
    }

    if (specialistUser?.email) {
      try {
        specialistEmailResult = await sendStorefrontOwnerBookingNotificationEmail({
          to: specialistUser.email,
          customerName: cName,
          customerEmail: cEmail,
          customerPhone: phone,
          providerName: specialistProfile.name,
          providerLabel: 'Hair Specialist',
          serviceName: service.name,
          appointmentDate: date,
          appointmentTime: time,
          location: specialistProfile.location || 'StyleVault booking',
          price: bookingSelections.totalPrice,
          currency: specialistProfile.currency || 'USD',
          dashboardLink: buildDashboardUrl('/hair-specialists/admin/appointments'),
        });
      } catch (err) {
        specialistEmailError = err.message;
        console.error('Hair specialist booking email failed:', err.message);
      }
    } else {
      specialistEmailError = 'Hair specialist email is not configured';
    }

    if (specialistUser) {
      try {
        specialistPushResult = await sendUserPushNotification({
          user: specialistUser,
          title: 'New appointment booked',
          body: `${cName} booked ${service.name} on ${date} at ${time}.`,
          data: {
            type: 'appointment',
            action: 'created',
            appointmentId: appointment._id.toString(),
            providerRole: 'hair-specialist',
            providerId: hairSpecialistId,
            customerName: cName,
            serviceName: service.name,
            appointmentDate: date,
            appointmentTime: time,
            link: '/hair-specialists/admin/appointments',
          },
          link: '/hair-specialists/admin/appointments',
        });
      } catch (err) {
        specialistPushError = err.message;
        console.error('Hair specialist push notification failed:', err.message);
      }
    } else {
      specialistPushError = 'Hair specialist account is not configured';
    }

    try {
      const customerNotification = await sendCustomerAppointmentStatusNotifications({
        to: cEmail,
        status: appointment.status,
        customerName: cName,
        providerName: specialistProfile.name,
        providerLabel: 'Hair Specialist',
        serviceName: service.name,
        appointmentDate: date,
        appointmentTime: time,
        location: specialistProfile.location || 'StyleVault booking',
        price: bookingSelections.totalPrice,
        currency: specialistProfile.currency || 'USD',
        manageLink,
        pushEntries: customer.notificationSubscriptions,
        pushData: {
          appointmentId: appointment._id.toString(),
          providerRole: 'hair-specialist',
          providerId: hairSpecialistId,
          customerName: cName,
          serviceName: service.name,
        },
        pruneInvalidTokens: async (invalidTokens) => {
          await HairCustomer.findByIdAndUpdate(customer._id, {
            $pull: {
              notificationSubscriptions: {
                token: { $in: invalidTokens },
              },
            },
          });
        },
      });

      emailResult = customerNotification.emailResult;
      emailError = customerNotification.emailError;
      customerPushResult = customerNotification.pushResult;
      customerPushError = customerNotification.pushError;
    } catch (err) {
      emailError = err.message;
      customerPushError = err.message;
      console.error('Hair customer notifications failed:', err.message);
    }

    emitHairSpecialistUpdate(hairSpecialistId, {
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
      specialistEmailResult,
      specialistEmailError,
      specialistPushResult,
      specialistPushError,
      customerPushResult,
      customerPushError,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const getHairAppointments = async (req, res) => {
  try {
    const hairSpecialistId = await getHairSpecialistIdFromRequest(req);
    if (!hairSpecialistId) return res.status(400).json({ message: 'Hair specialist is required' });

    const filter = { hairSpecialistId };

    if (req.query.status) filter.status = req.query.status;
    if (req.query.date) filter.date = req.query.date;
    if (req.query.customerId) filter.customerId = req.query.customerId;
    if (req.query.includeCancelled !== 'true') filter.status = { $ne: 'cancelled' };

    const appointments = await HairAppointment.find(filter)
      .populate('serviceId', 'name duration price pricingOptions addOns')
      .populate('customerId', 'name email phone')
      .sort({ date: 1, time: 1 });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getHairCalendarAppointments = async (req, res) => {
  try {
    const hairSpecialistId = await getHairSpecialistIdFromRequest(req);
    if (!hairSpecialistId) return res.status(400).json({ message: 'Hair specialist is required' });

    const filter = { hairSpecialistId };

    if (req.query.start || req.query.end) {
      filter.date = {};
      if (req.query.start) filter.date.$gte = req.query.start;
      if (req.query.end) filter.date.$lte = req.query.end;
    }

    const appointments = await HairAppointment.find(filter)
      .populate('serviceId', 'name duration price pricingOptions addOns')
      .populate('customerId', 'name email phone')
      .sort({ date: 1, time: 1 });

    res.json(appointments.map(mapCalendarEvent));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const checkHairAvailability = async (req, res) => {
  try {
    const { date, time } = req.query;
    const hairSpecialistId = await getHairSpecialistIdFromRequest(req);

    if (!hairSpecialistId) return res.status(400).json({ message: 'Hair specialist is required' });
    if (!date) return res.status(400).json({ message: 'Date is required' });

    const appointments = await HairAppointment.find({ hairSpecialistId, date, status: { $ne: 'cancelled' } });
    const bookedTimes = appointments.map((appointment) => appointment.time);

    res.json({
      bookedTimes,
      available: time ? !bookedTimes.includes(time) : undefined,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateHairAppointment = async (req, res) => {
  try {
    const hairSpecialistId = req.user?.hairSpecialistId;
    const appointment = await HairAppointment.findOne({ _id: req.params.id, hairSpecialistId });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    const previousStatus = appointment.status;

    const nextDate = req.body.date || appointment.date;
    const nextTime = req.body.time || appointment.time;

    if (nextDate !== appointment.date || nextTime !== appointment.time) {
      const conflictingAppointment = await HairAppointment.findOne({
        _id: { $ne: appointment._id },
        hairSpecialistId,
        date: nextDate,
        time: nextTime,
        status: { $ne: 'cancelled' },
      });

      if (conflictingAppointment) {
        return res.status(400).json({ message: 'Time slot already booked' });
      }
    }

    const service = await HairService.findOne({
      _id: req.body.serviceId || appointment.serviceId,
      hairSpecialistId,
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
        hairSpecialistId,
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

    if (previousStatus !== appointment.status) {
      try {
        const hairSpecialist = await HairSpecialist.findById(hairSpecialistId).lean();
        const accessToken = await ensureBookingManagementToken(appointment);
        const manageLink = buildStorefrontManageBookingUrl({
          slug: hairSpecialist?.slug,
          providerPath: 'hair-specialists',
          providerType: 'hair-specialist',
          appointmentId: appointment._id.toString(),
          accessToken,
        });

        const customer = await HairCustomer.findById(appointment.customerId).select('notificationSubscriptions').lean();
        await sendCustomerAppointmentStatusNotifications({
          to: appointment.customerEmail,
          status: appointment.status,
          customerName: appointment.customerName,
          providerName: hairSpecialist?.name || 'StyleVault',
          providerLabel: 'Hair Specialist',
          serviceName: service?.name || 'Appointment',
          appointmentDate: appointment.date,
          appointmentTime: appointment.time,
          location: hairSpecialist?.location || 'StyleVault booking',
          price: appointment.price || service?.price || 0,
          currency: hairSpecialist?.currency || 'USD',
          manageLink,
          pushEntries: customer?.notificationSubscriptions || [],
          pushData: {
            appointmentId: appointment._id.toString(),
            providerRole: 'hair-specialist',
            providerId: hairSpecialistId,
            customerName: appointment.customerName,
            serviceName: service?.name || 'Appointment',
          },
          pruneInvalidTokens: async (invalidTokens) => {
            await HairCustomer.findByIdAndUpdate(appointment.customerId, {
              $pull: {
                notificationSubscriptions: {
                  token: { $in: invalidTokens },
                },
              },
            });
          },
        });
      } catch (notificationError) {
        console.error('Hair customer status notifications failed:', notificationError.message);
      }
    }

    const populatedAppointment = await HairAppointment.findById(appointment._id)
      .populate('serviceId', 'name duration price pricingOptions addOns')
      .populate('customerId', 'name email phone');

    emitHairSpecialistUpdate(hairSpecialistId, {
      type: 'appointment',
      action: 'updated',
      appointmentId: appointment._id.toString(),
    });

    res.json(populatedAppointment);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const cancelHairAppointment = async (req, res) => {
  try {
    const hairSpecialistId = req.user?.hairSpecialistId;
    const appointment = await HairAppointment.findOne({ _id: req.params.id, hairSpecialistId })
      .populate('serviceId', 'name');

    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    appointment.status = 'cancelled';
    await appointment.save();

    let emailResult = null;
    let emailError = null;
    let customerPushResult = null;
    let customerPushError = null;

    try {
      const hairSpecialist = await HairSpecialist.findById(hairSpecialistId).lean();
      const customer = await HairCustomer.findById(appointment.customerId).select('notificationSubscriptions').lean();
      const accessToken = await ensureBookingManagementToken(appointment);
      const manageLink = buildStorefrontManageBookingUrl({
        slug: hairSpecialist?.slug,
        providerPath: 'hair-specialists',
        providerType: 'hair-specialist',
        appointmentId: appointment._id.toString(),
        accessToken,
      });

      const notificationResult = await sendCustomerAppointmentStatusNotifications({
        to: appointment.customerEmail,
        status: 'cancelled',
        customerName: appointment.customerName,
        providerName: hairSpecialist?.name || 'StyleVault',
        providerLabel: 'Hair Specialist',
        serviceName: appointment.serviceId?.name || 'Appointment',
        appointmentDate: appointment.date,
        appointmentTime: appointment.time,
        location: hairSpecialist?.location || 'StyleVault booking',
        price: appointment.price || 0,
        currency: hairSpecialist?.currency || 'USD',
        manageLink,
        pushEntries: customer?.notificationSubscriptions || [],
        pushData: {
          appointmentId: appointment._id.toString(),
          providerRole: 'hair-specialist',
          providerId: hairSpecialistId,
          customerName: appointment.customerName,
          serviceName: appointment.serviceId?.name || 'Appointment',
        },
        pruneInvalidTokens: async (invalidTokens) => {
          await HairCustomer.findByIdAndUpdate(appointment.customerId, {
            $pull: {
              notificationSubscriptions: {
                token: { $in: invalidTokens },
              },
            },
          });
        },
      });

      emailResult = notificationResult.emailResult;
      emailError = notificationResult.emailError;
      customerPushResult = notificationResult.pushResult;
      customerPushError = notificationResult.pushError;
    } catch (err) {
      emailError = err.message;
      customerPushError = err.message;
      console.error('Hair cancellation notifications failed:', err.message);
    }

    emitHairSpecialistUpdate(hairSpecialistId, {
      type: 'appointment',
      action: 'cancelled',
      appointmentId: appointment._id.toString(),
    });

    res.json({ appointment, emailResult, emailError, customerPushResult, customerPushError });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resendHairConfirmationEmail = async (req, res) => {
  try {
    const hairSpecialistId = req.user?.hairSpecialistId;
    if (!hairSpecialistId) return res.status(403).json({ message: 'Not authorized' });

    const appointment = await HairAppointment.findOne({ _id: req.params.id, hairSpecialistId })
      .populate('serviceId', 'name duration price pricingOptions addOns')
      .populate('customerId', 'name email phone');

    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    const hairSpecialist = await HairSpecialist.findById(hairSpecialistId).lean();

    let emailResult = null;
    let emailError = null;

    try {
      const accessToken = await ensureBookingManagementToken(appointment);
      const manageLink = buildStorefrontManageBookingUrl({
        slug: hairSpecialist?.slug,
        providerPath: 'hair-specialists',
        providerType: 'hair-specialist',
        appointmentId: appointment._id.toString(),
        accessToken,
      });
      emailResult = await sendCustomerBookingConfirmationEmail({
        to: appointment.customerEmail,
        status: appointment.status === 'pending' ? 'pending' : 'confirmed',
        customerName: appointment.customerName,
        providerName: hairSpecialist?.name || 'StyleVault',
        providerLabel: 'Hair Specialist',
        serviceName: appointment.serviceId?.name || 'Appointment',
        appointmentDate: appointment.date,
        appointmentTime: appointment.time,
        location: hairSpecialist?.location || 'StyleVault booking',
        price: appointment.price || appointment.serviceId?.price || 0,
        currency: hairSpecialist?.currency || 'USD',
        manageLink,
      });
    } catch (err) {
      emailError = err.message;
      console.error('Hair resend confirmation email failed:', err.message);
    }

    res.json({ appointment, emailResult, emailError });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
