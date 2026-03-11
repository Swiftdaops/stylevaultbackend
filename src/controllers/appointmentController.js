// src/controllers/appointmentController.js
import Appointment from '../models/Appointment.js';
import Barber from '../models/Barber.js';
import Customer from '../models/Customer.js';
import Service from '../models/Service.js';
import User from '../models/User.js';
import { sendEmail } from '../services/emailService.js';
import { emitBarberUpdate } from '../socket/index.js';
import { bookingConfirmationTemplate } from '../templates/bookingConfirmationEmail.js';
import { adminAppointmentNotificationTemplate } from '../templates/adminAppointmentNotificationEmail.js';

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

const upsertCustomer = async ({ barberId, name, email, phone }) => {
  let customer = await Customer.findOne({ barberId, email });

  if (!customer) {
    customer = await Customer.create({
      barberId,
      name,
      email,
      phone: phone || undefined,
      visitHistory: [],
    });
  } else {
    customer.name = name || customer.name;
    if (phone) customer.phone = phone;
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
    const barberUser = await User.findOne({ barberId, role: 'barber' }).select('email').lean();

    // Check if slot is free
    const exists = await Appointment.findOne({ barberId, date, time, status: { $ne: 'cancelled' } });
    if (exists) return res.status(400).json({ message: 'Time slot already booked' });

    // Upsert customer (match by email within barber)
    const customer = await upsertCustomer({ barberId, name: cName, email: cEmail, phone });

    const appointment = await Appointment.create({
      barberId,
      serviceId,
      date,
      time,
      customerId: customer._id,
      customerName: cName,
      customerEmail: cEmail,
      price: typeof price === 'number' ? price : service.price,
      status: 'confirmed',
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
    const appBaseUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
    const appointmentPrice = typeof price === 'number' ? price : service.price;

    try {
      emailResult = await sendEmail({
        to: cEmail,
        subject: 'Your appointment is confirmed',
        html: bookingConfirmationTemplate({
          customerName: cName,
          barberName: barberProfile.name,
          serviceName: service.name,
          appointmentDate: date,
          appointmentTime: time,
          location: barberProfile.location || 'StyleVault booking',
          price: appointmentPrice,
          currency: barberProfile.currency || 'USD',
          manageLink: `${appBaseUrl}/barbers/${barberProfile.slug}`,
        }),
      });
    } catch (err) {
      emailError = err.message;
      console.error('Booking confirmation email failed:', err.message);
    }

    try {
      adminEmailResult = await sendEmail({
        to: getAdminBookingEmail(),
        subject: `New appointment: ${cName} booked ${service.name}`,
        html: adminAppointmentNotificationTemplate({
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
        }),
      });
    } catch (err) {
      adminEmailError = err.message;
      console.error('Admin booking email failed:', err.message);
    }

    if (barberUser?.email) {
      try {
        barberEmailResult = await sendEmail({
          to: barberUser.email,
          subject: `New appointment booked with you: ${cName}`,
          html: adminAppointmentNotificationTemplate({
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
          }),
        });
      } catch (err) {
        barberEmailError = err.message;
        console.error('Barber booking email failed:', err.message);
      }
    } else {
      barberEmailError = 'Barber email is not configured';
    }

    emitBarberUpdate(barberId, {
      type: 'appointment',
      action: 'created',
      appointmentId: appointment._id.toString(),
    });

    res.status(201).json({
      appointment,
      emailResult,
      emailError,
      adminEmailResult,
      adminEmailError,
      barberEmailResult,
      barberEmailError,
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
      console.error('Cancellation email failed:', err.message);
    }

    emitBarberUpdate(barberId, {
      type: 'appointment',
      action: 'cancelled',
      appointmentId: appointment._id.toString(),
    });

    res.json({ appointment, emailResult, emailError });
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
      const appBaseUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
      const appointmentPrice = appointment.price || appointment.serviceId?.price || 0;

      emailResult = await sendEmail({
        to: appointment.customerEmail,
        subject: 'Your appointment is confirmed',
        html: bookingConfirmationTemplate({
          customerName: appointment.customerName,
          barberName: barberProfile?.name || 'StyleVault',
          serviceName: appointment.serviceId?.name || 'Appointment',
          appointmentDate: appointment.date,
          appointmentTime: appointment.time,
          location: barberProfile?.location || 'StyleVault booking',
          price: appointmentPrice,
          currency: barberProfile?.currency || 'USD',
          manageLink: `${appBaseUrl}/barbers/${barberProfile?.slug}`,
        }),
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