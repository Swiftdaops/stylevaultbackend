// src/controllers/appointmentController.js
import Appointment from '../models/Appointment.js';
import Barber from '../models/Barber.js';
import Customer from '../models/Customer.js';
import Service from '../models/Service.js';
import User from '../models/User.js';
import {
  sendAdminBookingNotificationEmail,
  sendCustomerBookingConfirmationEmail,
} from '../services/bookingNotificationService.js';
import { sendCustomerAppointmentStatusNotifications } from '../services/customerAppointmentStatusService.js';
import { sendStorefrontOwnerBookingNotifications, sendStorefrontOwnerCancellationNotification } from '../services/storefrontOwnerNotificationService.js';
import { emitBarberUpdate } from '../socket/index.js';
import { ensureBookingManagementToken, generateBookingManagementToken } from '../utils/bookingAccess.js';
import { upsertNotificationDeviceEntries } from '../utils/notificationDevices.js';
import { buildDashboardUrl, buildStorefrontCustomerBookingsUrl, buildStorefrontManageBookingUrl } from '../utils/storefrontLinks.js';

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

const resolveBarberId = async (barberReference) => {
  if (!barberReference) return null;

  if (typeof barberReference === 'object' && barberReference !== null && barberReference.toString) {
    return barberReference.toString();
  }

  // If a 24-character hex string (Mongo ObjectId) is provided, treat it as the ID
  if (typeof barberReference === 'string' && /^[0-9a-fA-F]{24}$/.test(barberReference)) {
    return barberReference;
  }

  const barber = await Barber.findOne({ slug: barberReference }).select('_id');
  return barber?._id?.toString() || null;
};

const getBarberIdFromRequest = async (req) => {
  if (req.user?.barberId) return req.user.barberId.toString();

  return resolveBarberId(
    req.body?.barberId
      || req.body?.barber
      || req.body?.slug
      || req.query?.barberId
      || req.query?.barber
      || req.query?.slug
  );
};

const getAdminBookingEmail = () => (
  process.env.ADMIN_BOOKING_EMAIL
  || process.env.ADMIN_NOTIFICATION_EMAIL
  || 'stylevaultlite@gmail.com'
);

const MAX_NOTIFICATION_SUBSCRIPTIONS = 10;

const upsertCustomer = async ({ barberId, name, email, phone, notificationPreference, req }) => {
  let customer = await Customer.findOne({ barberId, email });

  if (!customer) {
    customer = await Customer.create({
      barberId,
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

const mapCalendarEvent = (appointment) => {
  const startAt = buildDateTime(appointment.date, appointment.time);
  const duration = appointment.serviceId?.duration || 0;
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
    service: appointment.serviceId
      ? {
          id: appointment.serviceId._id,
          name: appointment.serviceId.name,
          duration: appointment.serviceId.duration,
          price: appointment.serviceId.price,
        }
      : null,
  };
};

// Book appointment
export const createAppointment = async (req, res) => {
  try {
    const {
      serviceId,
      date,
      time,
      price,
      // allow either customerName/customerEmail or name/email
      customerName,
      customerEmail,
      name,
      email,
      phone,
      notificationPreference,
      barberId: bodyBarberId,
      barber,
      slug,
    } = req.body;

    const barberId = await getBarberIdFromRequest({
      ...req,
      body: { ...req.body, barberId: bodyBarberId || barber || slug },
    });

    if (!barberId) return res.status(400).json({ message: 'Barber is required' });

    const cName = customerName || name;
    const cEmail = customerEmail || email;

    if (!cName || !cEmail) return res.status(400).json({ message: 'Customer name and email are required' });

    const service = await Service.findOne({ _id: serviceId, barberId });
    if (!service) return res.status(404).json({ message: 'Service not found' });

    const barberProfile = await Barber.findById(barberId).lean();
    if (!barberProfile) return res.status(404).json({ message: 'Barber not found' });
    const barberUser = await User.findOne({ barberId, role: 'barber' }).select('email notificationTokens').lean();

    // Check if slot is free
    const exists = await Appointment.findOne({ barberId, date, time, status: { $ne: 'cancelled' } });
    if (exists) return res.status(400).json({ message: 'Time slot already booked' });

    // Upsert customer (match by email within barber)
    const customer = await upsertCustomer({
      barberId,
      name: cName,
      email: cEmail,
      phone,
      notificationPreference,
      req,
    });

    const appointment = await Appointment.create({
      barberId,
      serviceId,
      date,
      time,
      customerId: customer._id,
      customerName: cName,
      customerEmail: cEmail,
      managementToken: generateBookingManagementToken(),
      price: typeof price === 'number' ? price : service.price,
      status: 'pending',
    });

    await Service.findByIdAndUpdate(serviceId, { $inc: { bookingsCount: 1 } });

    // Add visit to customer history
    customer.visitHistory.push(appointment._id);
    await customer.save();

    let emailResult = null;
    let emailError = null;
    let adminEmailResult = null;
    let adminEmailError = null;
    let barberEmailResult = null;
    let barberEmailError = null;
    let barberPushResult = null;
    let barberPushError = null;
    let customerPushResult = null;
    let customerPushError = null;
    const appointmentPrice = typeof price === 'number' ? price : service.price;
    const manageLink = buildStorefrontManageBookingUrl({
      slug: barberProfile.slug,
      providerPath: 'barbers',
      providerType: 'barber',
      appointmentId: appointment._id.toString(),
      accessToken: appointment.managementToken,
    });

    try {
      adminEmailResult = await sendAdminBookingNotificationEmail({
        to: getAdminBookingEmail(),
        customerName: cName,
        customerEmail: cEmail,
        customerPhone: phone,
        barberName: barberProfile.name,
        serviceName: service.name,
        appointmentDate: date,
        appointmentTime: time,
        location: barberProfile.location || 'StyleVault booking',
        price: appointmentPrice,
        currency: barberProfile.currency || 'USD',
      });
    } catch (err) {
      adminEmailError = err.message;
      console.error('Admin booking email failed:', err.message);
    }

    try {
      const ownerNotification = await sendStorefrontOwnerBookingNotifications({
        ownerUser: barberUser,
        providerType: 'barber',
        customerName: cName,
        customerEmail: cEmail,
        customerPhone: phone,
        providerName: barberProfile.name,
        providerLabel: 'Barber',
        serviceName: service.name,
        appointmentDate: date,
        appointmentTime: time,
        location: barberProfile.location || 'StyleVault booking',
        price: appointmentPrice,
        currency: barberProfile.currency || 'USD',
        dashboardLink: buildDashboardUrl('/barbers/admin/appointments'),
        appointmentId: appointment._id.toString(),
        providerId: barberId,
      });

      barberEmailResult = ownerNotification.emailResult;
      barberEmailError = ownerNotification.emailError;
      barberPushResult = ownerNotification.pushResult;
      barberPushError = ownerNotification.pushError;
    } catch (err) {
      barberEmailError = err.message;
      barberPushError = err.message;
      console.error('Barber owner booking notifications failed:', err.message);
    }

    try {
      const customerNotification = await sendCustomerAppointmentStatusNotifications({
        to: cEmail,
        status: appointment.status,
        customerName: cName,
        providerName: barberProfile.name,
        providerLabel: 'Barber',
        serviceName: service.name,
        appointmentDate: date,
        appointmentTime: time,
        location: barberProfile.location || 'StyleVault booking',
        price: appointmentPrice,
        currency: barberProfile.currency || 'USD',
        manageLink,
        pushEntries: customer.notificationSubscriptions,
        pushData: {
          appointmentId: appointment._id.toString(),
          providerRole: 'barber',
          providerId: barberId,
          customerName: cName,
          serviceName: service.name,
        },
        pruneInvalidTokens: async (invalidTokens) => {
          await Customer.findByIdAndUpdate(customer._id, {
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
      console.error('Customer booking notifications failed:', err.message);
    }

    emitBarberUpdate(barberId, {
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
      barberEmailResult,
      barberEmailError,
      barberPushResult,
      barberPushError,
      customerPushResult,
      customerPushError,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get barber appointments
export const getAppointments = async (req, res) => {
  try {
    const barberId = await getBarberIdFromRequest(req);
    if (!barberId) return res.status(400).json({ message: 'Barber is required' });

    const filter = { barberId };

    if (req.query.status) filter.status = req.query.status;
    if (req.query.date) filter.date = req.query.date;
    if (req.query.customerId) filter.customerId = req.query.customerId;

    if (req.query.includeCancelled !== 'true') {
      filter.status = { $ne: 'cancelled' };
    }

    const appointments = await Appointment.find(filter)
      .populate('serviceId', 'name duration price')
      .populate('customerId', 'name email phone')
      .sort({ date: 1, time: 1 });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Calendar appointment feed
export const getCalendarAppointments = async (req, res) => {
  try {
    const barberId = await getBarberIdFromRequest(req);
    if (!barberId) return res.status(400).json({ message: 'Barber is required' });

    const filter = { barberId };

    if (req.query.start || req.query.end) {
      filter.date = {};
      if (req.query.start) filter.date.$gte = req.query.start;
      if (req.query.end) filter.date.$lte = req.query.end;
    }

    const appointments = await Appointment.find(filter)
      .populate('serviceId', 'name duration price')
      .populate('customerId', 'name email phone')
      .sort({ date: 1, time: 1 });

    res.json(appointments.map(mapCalendarEvent));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Check availability
export const checkAvailability = async (req, res) => {
  try {
    const { date } = req.query;
    const { time } = req.query;
    const barberId = await getBarberIdFromRequest(req);

    if (!barberId) return res.status(400).json({ message: 'Barber is required' });
    if (!date) return res.status(400).json({ message: 'Date is required' });

    const appointments = await Appointment.find({ barberId, date, status: { $ne: 'cancelled' } });
    const bookedTimes = appointments.map(a => a.time);

    res.json({
      bookedTimes,
      available: time ? !bookedTimes.includes(time) : undefined,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update appointment
export const updateAppointment = async (req, res) => {
  try {
    const barberId = req.user?.barberId;
    const appointment = await Appointment.findOne({ _id: req.params.id, barberId });

    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    const previousStatus = appointment.status;

    const nextDate = req.body.date || appointment.date;
    const nextTime = req.body.time || appointment.time;

    if (nextDate !== appointment.date || nextTime !== appointment.time) {
      const conflictingAppointment = await Appointment.findOne({
        _id: { $ne: appointment._id },
        barberId,
        date: nextDate,
        time: nextTime,
        status: { $ne: 'cancelled' },
      });

      if (conflictingAppointment) {
        return res.status(400).json({ message: 'Time slot already booked' });
      }
    }

    if (req.body.serviceId) {
      const service = await Service.findOne({ _id: req.body.serviceId, barberId });
      if (!service) return res.status(404).json({ message: 'Service not found' });

      appointment.serviceId = service._id;
      if (typeof req.body.price !== 'number') {
        appointment.price = service.price;
      }
    }

    if (typeof req.body.price === 'number') {
      appointment.price = req.body.price;
    }

    const nextCustomerName = req.body.customerName || req.body.name || appointment.customerName;
    const nextCustomerEmail = req.body.customerEmail || req.body.email || appointment.customerEmail;
    const nextCustomerPhone = req.body.phone;

    if (nextCustomerEmail) {
      const customer = await upsertCustomer({
        barberId,
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

    if (req.body.date) appointment.date = req.body.date;
    if (req.body.time) appointment.time = req.body.time;
    if (req.body.status) appointment.status = req.body.status;

    await appointment.save();

    if (previousStatus !== appointment.status) {
      try {
        const barberProfile = await Barber.findById(barberId).lean();
        const serviceDoc = await Service.findById(appointment.serviceId).select('name').lean();
        const serviceName = serviceDoc?.name || 'Appointment';
        const accessToken = await ensureBookingManagementToken(appointment);
        const appointmentPrice = appointment.price || 0;
        const manageLink = buildStorefrontManageBookingUrl({
          slug: barberProfile?.slug,
          providerPath: 'barbers',
          providerType: 'barber',
          appointmentId: appointment._id.toString(),
          accessToken,
        });
        const reviewLink = buildStorefrontCustomerBookingsUrl({
          slug: barberProfile?.slug,
          providerPath: 'barbers',
          providerType: 'barber',
          appointmentId: appointment._id.toString(),
          accessToken,
        });

        const customer = await Customer.findById(appointment.customerId).select('notificationSubscriptions').lean();
        await sendCustomerAppointmentStatusNotifications({
          to: appointment.customerEmail,
          status: appointment.status,
          customerName: appointment.customerName,
          providerName: barberProfile?.name || 'StyleVault',
          providerLabel: 'Barber',
          serviceName,
          appointmentDate: appointment.date,
          appointmentTime: appointment.time,
          location: barberProfile?.location || 'StyleVault booking',
          price: appointmentPrice,
          currency: barberProfile?.currency || 'USD',
          manageLink,
          reviewLink,
          pushEntries: customer?.notificationSubscriptions || [],
          pushData: {
            appointmentId: appointment._id.toString(),
            providerRole: 'barber',
            providerId: barberId,
            customerName: appointment.customerName,
            serviceName,
          },
          pruneInvalidTokens: async (invalidTokens) => {
            await Customer.findByIdAndUpdate(appointment.customerId, {
              $pull: {
                notificationSubscriptions: {
                  token: { $in: invalidTokens },
                },
              },
            });
          },
        });
      } catch (notificationError) {
        console.error('Customer status notifications failed:', notificationError.message);
      }
    }

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('serviceId', 'name duration price')
      .populate('customerId', 'name email phone');

    emitBarberUpdate(barberId, {
      type: 'appointment',
      action: 'updated',
      appointmentId: appointment._id.toString(),
    });

    res.json(populatedAppointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cancel appointment
export const cancelAppointment = async (req, res) => {
  try {
    const barberId = req.user?.barberId;
    const appointment = await Appointment.findOne({ _id: req.params.id, barberId })
      .populate('serviceId', 'name');

    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    appointment.status = 'cancelled';
    await appointment.save();

    let emailResult = null;
    let emailError = null;
    let ownerEmailResult = null;
    let ownerEmailError = null;
    let customerPushResult = null;
    let customerPushError = null;

    try {
      const barberProfile = await Barber.findById(barberId).lean();
      const barberUser = await User.findOne({ barberId, role: 'barber' }).select('email notificationTokens').lean();
      const customer = await Customer.findById(appointment.customerId).select('notificationSubscriptions').lean();
      const accessToken = await ensureBookingManagementToken(appointment);
      const manageLink = buildStorefrontManageBookingUrl({
        slug: barberProfile?.slug,
        providerPath: 'barbers',
        providerType: 'barber',
        appointmentId: appointment._id.toString(),
        accessToken,
      });

      const notificationResult = await sendCustomerAppointmentStatusNotifications({
        to: appointment.customerEmail,
        status: 'cancelled',
        customerName: appointment.customerName,
        providerName: barberProfile?.name || 'StyleVault',
        providerLabel: 'Barber',
        serviceName: appointment.serviceId?.name || 'Appointment',
        appointmentDate: appointment.date,
        appointmentTime: appointment.time,
        location: barberProfile?.location || 'StyleVault booking',
        price: appointment.price || 0,
        currency: barberProfile?.currency || 'USD',
        manageLink,
        pushEntries: customer?.notificationSubscriptions || [],
        pushData: {
          appointmentId: appointment._id.toString(),
          providerRole: 'barber',
          providerId: barberId,
          customerName: appointment.customerName,
          serviceName: appointment.serviceId?.name || 'Appointment',
        },
        pruneInvalidTokens: async (invalidTokens) => {
          await Customer.findByIdAndUpdate(appointment.customerId, {
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

      const ownerNotification = await sendStorefrontOwnerCancellationNotification({
        ownerUser: barberUser,
        providerType: 'barber',
        customerName: appointment.customerName,
        customerEmail: appointment.customerEmail,
        providerName: barberProfile?.name || 'StyleVault',
        providerLabel: 'Barber',
        serviceName: appointment.serviceId?.name || 'Appointment',
        appointmentDate: appointment.date,
        appointmentTime: appointment.time,
        location: barberProfile?.location || 'StyleVault booking',
        price: appointment.price || 0,
        currency: barberProfile?.currency || 'USD',
        cancelledBy: 'Store owner',
        dashboardLink: buildDashboardUrl('/barbers/admin/appointments'),
      });

      ownerEmailResult = ownerNotification.emailResult;
      ownerEmailError = ownerNotification.emailError;
    } catch (err) {
      emailError = err.message;
      customerPushError = err.message;
      console.error('Cancellation notifications failed:', err.message);
    }

    emitBarberUpdate(barberId, {
      type: 'appointment',
      action: 'cancelled',
      appointmentId: appointment._id.toString(),
    });

    res.json({ appointment, emailResult, emailError, ownerEmailResult, ownerEmailError, customerPushResult, customerPushError });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Resend confirmation email for an appointment (barber only)
export const resendConfirmationEmail = async (req, res) => {
  try {
    const barberId = req.user?.barberId;
    if (!barberId) return res.status(403).json({ message: 'Not authorized' });

    const appointment = await Appointment.findOne({ _id: req.params.id, barberId })
      .populate('serviceId', 'name duration price')
      .populate('customerId', 'name email phone');

    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    const barberProfile = await Barber.findById(barberId).lean();

    let emailResult = null;
    let emailError = null;

    try {
      const accessToken = await ensureBookingManagementToken(appointment);
      const appointmentPrice = appointment.price || appointment.serviceId?.price || 0;
      const manageLink = buildStorefrontManageBookingUrl({
        slug: barberProfile?.slug,
        providerPath: 'barbers',
        providerType: 'barber',
        appointmentId: appointment._id.toString(),
        accessToken,
      });

      emailResult = await sendCustomerBookingConfirmationEmail({
        to: appointment.customerEmail,
        status: appointment.status === 'pending' ? 'pending' : 'confirmed',
        customerName: appointment.customerName,
        barberName: barberProfile?.name || 'StyleVault',
        serviceName: appointment.serviceId?.name || 'Appointment',
        appointmentDate: appointment.date,
        appointmentTime: appointment.time,
        location: barberProfile?.location || 'StyleVault booking',
        price: appointmentPrice,
        currency: barberProfile?.currency || 'USD',
        manageLink,
      });
    } catch (err) {
      emailError = err.message;
      console.error('Resend confirmation email failed:', err.message);
    }

    res.json({ appointment, emailResult, emailError });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};