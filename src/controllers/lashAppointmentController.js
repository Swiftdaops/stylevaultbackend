import LashAppointment from '../models/LashAppointment.js';
import LashCustomer from '../models/LashCustomer.js';
import LashService from '../models/LashService.js';
import LashTechnician from '../models/LashTechnician.js';
import User from '../models/User.js';
import { sendEmail } from '../services/emailService.js';
import { sendUserPushNotification } from '../services/pushNotificationService.js';
import { emitLashTechnicianUpdate } from '../socket/index.js';
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

const resolveLashTechnicianId = async (lashReference) => {
  if (!lashReference) return null;

  if (typeof lashReference === 'object' && lashReference !== null && lashReference.toString) {
    return lashReference.toString();
  }

  if (typeof lashReference === 'string' && /^[0-9a-fA-F]{24}$/.test(lashReference)) {
    return lashReference;
  }

  const lashTechnician = await LashTechnician.findOne({ slug: lashReference }).select('_id');
  return lashTechnician?._id?.toString() || null;
};

const getLashTechnicianIdFromRequest = async (req) => {
  if (req.user?.lashTechnicianId) return req.user.lashTechnicianId.toString();

  return resolveLashTechnicianId(
    req.body?.lashTechnicianId
      || req.body?.lashTechnician
      || req.body?.slug
      || req.query?.lashTechnicianId
      || req.query?.lashTechnician
      || req.query?.slug
  );
};

const getAdminBookingEmail = () => (
  process.env.ADMIN_BOOKING_EMAIL
  || process.env.ADMIN_NOTIFICATION_EMAIL
  || 'stylevaultlite@gmail.com'
);

const upsertCustomer = async ({ lashTechnicianId, name, email, phone }) => {
  let customer = await LashCustomer.findOne({ lashTechnicianId, email });

  if (!customer) {
    customer = await LashCustomer.create({
      lashTechnicianId,
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

export const createLashAppointment = async (req, res) => {
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
      lashTechnicianId: bodyLashTechnicianId,
      lashTechnician,
      slug,
    } = req.body;

    const lashTechnicianId = await getLashTechnicianIdFromRequest({
      ...req,
      body: { ...req.body, lashTechnicianId: bodyLashTechnicianId || lashTechnician || slug },
    });

    if (!lashTechnicianId) return res.status(400).json({ message: 'Lash technician is required' });

    const cName = customerName || name;
    const cEmail = customerEmail || email;
    if (!cName || !cEmail) {
      return res.status(400).json({ message: 'Customer name and email are required' });
    }

    const service = await LashService.findOne({ _id: serviceId, lashTechnicianId });
    if (!service) return res.status(404).json({ message: 'Service not found' });

    const technicianProfile = await LashTechnician.findById(lashTechnicianId).lean();
    if (!technicianProfile) return res.status(404).json({ message: 'Lash technician not found' });

    const technicianUser = await User.findOne({ lashTechnicianId, role: 'lash-technician' }).select('email notificationTokens').lean();

    const exists = await LashAppointment.findOne({ lashTechnicianId, date, time, status: { $ne: 'cancelled' } });
    if (exists) return res.status(400).json({ message: 'Time slot already booked' });

    const customer = await upsertCustomer({ lashTechnicianId, name: cName, email: cEmail, phone });
    const bookingSelections = resolveBookingSelections(service, req.body);

    const appointment = await LashAppointment.create({
      lashTechnicianId,
      serviceId,
      date,
      time,
      customerId: customer._id,
      customerName: cName,
      customerEmail: cEmail,
      price: bookingSelections.totalPrice,
      selectedPricingOption: bookingSelections.selectedPricingOption,
      selectedAddOns: bookingSelections.selectedAddOns,
      status: 'confirmed',
    });

    await LashService.findByIdAndUpdate(serviceId, { $inc: { bookingsCount: 1 } });

    customer.visitHistory.push(appointment._id);
    await customer.save();

    let emailResult = null;
    let emailError = null;
    let adminEmailResult = null;
    let adminEmailError = null;
    let technicianEmailResult = null;
    let technicianEmailError = null;
    let technicianPushResult = null;
    let technicianPushError = null;

    const appBaseUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000';

    try {
      emailResult = await sendEmail({
        to: cEmail,
        subject: 'Your appointment is confirmed',
        html: bookingConfirmationTemplate({
          customerName: cName,
          providerName: technicianProfile.name,
          providerLabel: 'Lash Technician',
          serviceName: service.name,
          appointmentDate: date,
          appointmentTime: time,
          location: technicianProfile.location || 'StyleVault booking',
          price: bookingSelections.totalPrice,
          currency: technicianProfile.currency || 'USD',
          manageLink: `${appBaseUrl}/lash-technicians/${technicianProfile.slug}`,
        }),
      });
    } catch (err) {
      emailError = err.message;
      console.error('Lash booking confirmation email failed:', err.message);
    }

    try {
      adminEmailResult = await sendEmail({
        to: getAdminBookingEmail(),
        subject: `New appointment: ${cName} booked ${service.name}`,
        html: adminAppointmentNotificationTemplate({
          customerName: cName,
          customerEmail: cEmail,
          customerPhone: phone,
          providerName: technicianProfile.name,
          providerLabel: 'Lash Technician',
          serviceName: service.name,
          appointmentDate: date,
          appointmentTime: time,
          location: technicianProfile.location || 'StyleVault booking',
          price: bookingSelections.totalPrice,
          currency: technicianProfile.currency || 'USD',
        }),
      });
    } catch (err) {
      adminEmailError = err.message;
      console.error('Lash admin booking email failed:', err.message);
    }

    if (technicianUser?.email) {
      try {
        technicianEmailResult = await sendEmail({
          to: technicianUser.email,
          subject: `New appointment booked with you: ${cName}`,
          html: adminAppointmentNotificationTemplate({
            customerName: cName,
            customerEmail: cEmail,
            customerPhone: phone,
            providerName: technicianProfile.name,
            providerLabel: 'Lash Technician',
            serviceName: service.name,
            appointmentDate: date,
            appointmentTime: time,
            location: technicianProfile.location || 'StyleVault booking',
            price: bookingSelections.totalPrice,
            currency: technicianProfile.currency || 'USD',
          }),
        });
      } catch (err) {
        technicianEmailError = err.message;
        console.error('Lash technician booking email failed:', err.message);
      }
    } else {
      technicianEmailError = 'Lash technician email is not configured';
    }

    if (technicianUser) {
      try {
        technicianPushResult = await sendUserPushNotification({
          user: technicianUser,
          title: 'New appointment booked',
          body: `${cName} booked ${service.name} on ${date} at ${time}.`,
          data: {
            type: 'appointment',
            action: 'created',
            appointmentId: appointment._id.toString(),
            providerRole: 'lash-technician',
            providerId: lashTechnicianId,
            customerName: cName,
            serviceName: service.name,
            appointmentDate: date,
            appointmentTime: time,
            link: '/lash-technicians/admin/appointments',
          },
          link: '/lash-technicians/admin/appointments',
        });
      } catch (err) {
        technicianPushError = err.message;
        console.error('Lash technician push notification failed:', err.message);
      }
    } else {
      technicianPushError = 'Lash technician account is not configured';
    }

    emitLashTechnicianUpdate(lashTechnicianId, {
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
      emailResult,
      emailError,
      adminEmailResult,
      adminEmailError,
      technicianEmailResult,
      technicianEmailError,
      technicianPushResult,
      technicianPushError,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const getLashAppointments = async (req, res) => {
  try {
    const lashTechnicianId = await getLashTechnicianIdFromRequest(req);
    if (!lashTechnicianId) return res.status(400).json({ message: 'Lash technician is required' });

    const filter = { lashTechnicianId };

    if (req.query.status) filter.status = req.query.status;
    if (req.query.date) filter.date = req.query.date;
    if (req.query.customerId) filter.customerId = req.query.customerId;
    if (req.query.includeCancelled !== 'true') filter.status = { $ne: 'cancelled' };

    const appointments = await LashAppointment.find(filter)
      .populate('serviceId', 'name duration price pricingOptions addOns')
      .populate('customerId', 'name email phone')
      .sort({ date: 1, time: 1 });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getLashCalendarAppointments = async (req, res) => {
  try {
    const lashTechnicianId = await getLashTechnicianIdFromRequest(req);
    if (!lashTechnicianId) return res.status(400).json({ message: 'Lash technician is required' });

    const filter = { lashTechnicianId };

    if (req.query.start || req.query.end) {
      filter.date = {};
      if (req.query.start) filter.date.$gte = req.query.start;
      if (req.query.end) filter.date.$lte = req.query.end;
    }

    const appointments = await LashAppointment.find(filter)
      .populate('serviceId', 'name duration price pricingOptions addOns')
      .populate('customerId', 'name email phone')
      .sort({ date: 1, time: 1 });

    res.json(appointments.map(mapCalendarEvent));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const checkLashAvailability = async (req, res) => {
  try {
    const { date, time } = req.query;
    const lashTechnicianId = await getLashTechnicianIdFromRequest(req);

    if (!lashTechnicianId) return res.status(400).json({ message: 'Lash technician is required' });
    if (!date) return res.status(400).json({ message: 'Date is required' });

    const appointments = await LashAppointment.find({ lashTechnicianId, date, status: { $ne: 'cancelled' } });
    const bookedTimes = appointments.map((appointment) => appointment.time);

    res.json({
      bookedTimes,
      available: time ? !bookedTimes.includes(time) : undefined,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateLashAppointment = async (req, res) => {
  try {
    const lashTechnicianId = req.user?.lashTechnicianId;
    const appointment = await LashAppointment.findOne({ _id: req.params.id, lashTechnicianId });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    const nextDate = req.body.date || appointment.date;
    const nextTime = req.body.time || appointment.time;

    if (nextDate !== appointment.date || nextTime !== appointment.time) {
      const conflictingAppointment = await LashAppointment.findOne({
        _id: { $ne: appointment._id },
        lashTechnicianId,
        date: nextDate,
        time: nextTime,
        status: { $ne: 'cancelled' },
      });

      if (conflictingAppointment) {
        return res.status(400).json({ message: 'Time slot already booked' });
      }
    }

    const service = await LashService.findOne({
      _id: req.body.serviceId || appointment.serviceId,
      lashTechnicianId,
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
        lashTechnicianId,
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

    const populatedAppointment = await LashAppointment.findById(appointment._id)
      .populate('serviceId', 'name duration price pricingOptions addOns')
      .populate('customerId', 'name email phone');

    emitLashTechnicianUpdate(lashTechnicianId, {
      type: 'appointment',
      action: 'updated',
      appointmentId: appointment._id.toString(),
    });

    res.json(populatedAppointment);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const cancelLashAppointment = async (req, res) => {
  try {
    const lashTechnicianId = req.user?.lashTechnicianId;
    const appointment = await LashAppointment.findOne({ _id: req.params.id, lashTechnicianId })
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
      console.error('Lash cancellation email failed:', err.message);
    }

    emitLashTechnicianUpdate(lashTechnicianId, {
      type: 'appointment',
      action: 'cancelled',
      appointmentId: appointment._id.toString(),
    });

    res.json({ appointment, emailResult, emailError });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resendLashConfirmationEmail = async (req, res) => {
  try {
    const lashTechnicianId = req.user?.lashTechnicianId;
    if (!lashTechnicianId) return res.status(403).json({ message: 'Not authorized' });

    const appointment = await LashAppointment.findOne({ _id: req.params.id, lashTechnicianId })
      .populate('serviceId', 'name duration price pricingOptions addOns')
      .populate('customerId', 'name email phone');

    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    const lashTechnician = await LashTechnician.findById(lashTechnicianId).lean();

    let emailResult = null;
    let emailError = null;

    try {
      const appBaseUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
      emailResult = await sendEmail({
        to: appointment.customerEmail,
        subject: 'Your appointment is confirmed',
        html: bookingConfirmationTemplate({
          customerName: appointment.customerName,
          providerName: lashTechnician?.name || 'StyleVault',
          providerLabel: 'Lash Technician',
          serviceName: appointment.serviceId?.name || 'Appointment',
          appointmentDate: appointment.date,
          appointmentTime: appointment.time,
          location: lashTechnician?.location || 'StyleVault booking',
          price: appointment.price || appointment.serviceId?.price || 0,
          currency: lashTechnician?.currency || 'USD',
          manageLink: `${appBaseUrl}/lash-technicians/${lashTechnician?.slug}`,
        }),
      });
    } catch (err) {
      emailError = err.message;
      console.error('Lash resend confirmation email failed:', err.message);
    }

    res.json({ appointment, emailResult, emailError });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
