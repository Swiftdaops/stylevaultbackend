import NailAppointment from '../models/NailAppointment.js';
import NailCustomer from '../models/NailCustomer.js';
import NailService from '../models/NailService.js';
import NailTechnician from '../models/NailTechnician.js';
import User from '../models/User.js';
import { sendEmail } from '../services/emailService.js';
import { sendUserPushNotification } from '../services/pushNotificationService.js';
import { emitNailTechnicianUpdate } from '../socket/index.js';
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

const resolveNailTechnicianId = async (nailReference) => {
  if (!nailReference) return null;

  if (typeof nailReference === 'object' && nailReference !== null && nailReference.toString) {
    return nailReference.toString();
  }

  if (typeof nailReference === 'string' && /^[0-9a-fA-F]{24}$/.test(nailReference)) {
    return nailReference;
  }

  const nailTechnician = await NailTechnician.findOne({ slug: nailReference }).select('_id');
  return nailTechnician?._id?.toString() || null;
};

const getNailTechnicianIdFromRequest = async (req) => {
  if (req.user?.nailTechnicianId) return req.user.nailTechnicianId.toString();

  return resolveNailTechnicianId(
    req.body?.nailTechnicianId
      || req.body?.nailTechnician
      || req.body?.slug
      || req.query?.nailTechnicianId
      || req.query?.nailTechnician
      || req.query?.slug
  );
};

const getAdminBookingEmail = () => (
  process.env.ADMIN_BOOKING_EMAIL
  || process.env.ADMIN_NOTIFICATION_EMAIL
  || 'stylevaultlite@gmail.com'
);

const upsertCustomer = async ({ nailTechnicianId, name, email, phone }) => {
  let customer = await NailCustomer.findOne({ nailTechnicianId, email });

  if (!customer) {
    customer = await NailCustomer.create({
      nailTechnicianId,
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

export const createNailAppointment = async (req, res) => {
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
      nailTechnicianId: bodyNailTechnicianId,
      nailTechnician,
      slug,
    } = req.body;

    const nailTechnicianId = await getNailTechnicianIdFromRequest({
      ...req,
      body: { ...req.body, nailTechnicianId: bodyNailTechnicianId || nailTechnician || slug },
    });

    if (!nailTechnicianId) return res.status(400).json({ message: 'Nail technician is required' });

    const cName = customerName || name;
    const cEmail = customerEmail || email;
    if (!cName || !cEmail) {
      return res.status(400).json({ message: 'Customer name and email are required' });
    }

    const service = await NailService.findOne({ _id: serviceId, nailTechnicianId });
    if (!service) return res.status(404).json({ message: 'Service not found' });

    const technicianProfile = await NailTechnician.findById(nailTechnicianId).lean();
    if (!technicianProfile) return res.status(404).json({ message: 'Nail technician not found' });

    const technicianUser = await User.findOne({ nailTechnicianId, role: 'nail-technician' }).select('email notificationTokens').lean();

    const exists = await NailAppointment.findOne({ nailTechnicianId, date, time, status: { $ne: 'cancelled' } });
    if (exists) return res.status(400).json({ message: 'Time slot already booked' });

    const customer = await upsertCustomer({ nailTechnicianId, name: cName, email: cEmail, phone });
    const bookingSelections = resolveBookingSelections(service, req.body);

    const appointment = await NailAppointment.create({
      nailTechnicianId,
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

    await NailService.findByIdAndUpdate(serviceId, { $inc: { bookingsCount: 1 } });

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
          providerLabel: 'Nail Technician',
          serviceName: service.name,
          appointmentDate: date,
          appointmentTime: time,
          location: technicianProfile.location || 'StyleVault booking',
          price: bookingSelections.totalPrice,
          currency: technicianProfile.currency || 'USD',
          manageLink: `${appBaseUrl}/nail-technicians/${technicianProfile.slug}`,
        }),
      });
    } catch (err) {
      emailError = err.message;
      console.error('Nail booking confirmation email failed:', err.message);
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
          providerLabel: 'Nail Technician',
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
      console.error('Nail admin booking email failed:', err.message);
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
            providerLabel: 'Nail Technician',
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
        console.error('Nail technician booking email failed:', err.message);
      }
    } else {
      technicianEmailError = 'Nail technician email is not configured';
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
            providerRole: 'nail-technician',
            providerId: nailTechnicianId,
            customerName: cName,
            serviceName: service.name,
            appointmentDate: date,
            appointmentTime: time,
            link: '/nail-technicians/admin/appointments',
          },
          link: '/nail-technicians/admin/appointments',
        });
      } catch (err) {
        technicianPushError = err.message;
        console.error('Nail technician push notification failed:', err.message);
      }
    } else {
      technicianPushError = 'Nail technician account is not configured';
    }

    emitNailTechnicianUpdate(nailTechnicianId, {
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

export const getNailAppointments = async (req, res) => {
  try {
    const nailTechnicianId = await getNailTechnicianIdFromRequest(req);
    if (!nailTechnicianId) return res.status(400).json({ message: 'Nail technician is required' });

    const filter = { nailTechnicianId };

    if (req.query.status) filter.status = req.query.status;
    if (req.query.date) filter.date = req.query.date;
    if (req.query.customerId) filter.customerId = req.query.customerId;
    if (req.query.includeCancelled !== 'true') filter.status = { $ne: 'cancelled' };

    const appointments = await NailAppointment.find(filter)
      .populate('serviceId', 'name duration price pricingOptions addOns')
      .populate('customerId', 'name email phone')
      .sort({ date: 1, time: 1 });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getNailCalendarAppointments = async (req, res) => {
  try {
    const nailTechnicianId = await getNailTechnicianIdFromRequest(req);
    if (!nailTechnicianId) return res.status(400).json({ message: 'Nail technician is required' });

    const filter = { nailTechnicianId };

    if (req.query.start || req.query.end) {
      filter.date = {};
      if (req.query.start) filter.date.$gte = req.query.start;
      if (req.query.end) filter.date.$lte = req.query.end;
    }

    const appointments = await NailAppointment.find(filter)
      .populate('serviceId', 'name duration price pricingOptions addOns')
      .populate('customerId', 'name email phone')
      .sort({ date: 1, time: 1 });

    res.json(appointments.map(mapCalendarEvent));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const checkNailAvailability = async (req, res) => {
  try {
    const { date, time } = req.query;
    const nailTechnicianId = await getNailTechnicianIdFromRequest(req);

    if (!nailTechnicianId) return res.status(400).json({ message: 'Nail technician is required' });
    if (!date) return res.status(400).json({ message: 'Date is required' });

    const appointments = await NailAppointment.find({ nailTechnicianId, date, status: { $ne: 'cancelled' } });
    const bookedTimes = appointments.map((appointment) => appointment.time);

    res.json({
      bookedTimes,
      available: time ? !bookedTimes.includes(time) : undefined,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateNailAppointment = async (req, res) => {
  try {
    const nailTechnicianId = req.user?.nailTechnicianId;
    const appointment = await NailAppointment.findOne({ _id: req.params.id, nailTechnicianId });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    const nextDate = req.body.date || appointment.date;
    const nextTime = req.body.time || appointment.time;

    if (nextDate !== appointment.date || nextTime !== appointment.time) {
      const conflictingAppointment = await NailAppointment.findOne({
        _id: { $ne: appointment._id },
        nailTechnicianId,
        date: nextDate,
        time: nextTime,
        status: { $ne: 'cancelled' },
      });

      if (conflictingAppointment) {
        return res.status(400).json({ message: 'Time slot already booked' });
      }
    }

    const service = await NailService.findOne({
      _id: req.body.serviceId || appointment.serviceId,
      nailTechnicianId,
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
        nailTechnicianId,
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

    const populatedAppointment = await NailAppointment.findById(appointment._id)
      .populate('serviceId', 'name duration price pricingOptions addOns')
      .populate('customerId', 'name email phone');

    emitNailTechnicianUpdate(nailTechnicianId, {
      type: 'appointment',
      action: 'updated',
      appointmentId: appointment._id.toString(),
    });

    res.json(populatedAppointment);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const cancelNailAppointment = async (req, res) => {
  try {
    const nailTechnicianId = req.user?.nailTechnicianId;
    const appointment = await NailAppointment.findOne({ _id: req.params.id, nailTechnicianId })
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
      console.error('Nail cancellation email failed:', err.message);
    }

    emitNailTechnicianUpdate(nailTechnicianId, {
      type: 'appointment',
      action: 'cancelled',
      appointmentId: appointment._id.toString(),
    });

    res.json({ appointment, emailResult, emailError });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resendNailConfirmationEmail = async (req, res) => {
  try {
    const nailTechnicianId = req.user?.nailTechnicianId;
    if (!nailTechnicianId) return res.status(403).json({ message: 'Not authorized' });

    const appointment = await NailAppointment.findOne({ _id: req.params.id, nailTechnicianId })
      .populate('serviceId', 'name duration price pricingOptions addOns')
      .populate('customerId', 'name email phone');

    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    const nailTechnician = await NailTechnician.findById(nailTechnicianId).lean();

    let emailResult = null;
    let emailError = null;

    try {
      const appBaseUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
      emailResult = await sendEmail({
        to: appointment.customerEmail,
        subject: 'Your appointment is confirmed',
        html: bookingConfirmationTemplate({
          customerName: appointment.customerName,
          providerName: nailTechnician?.name || 'StyleVault',
          providerLabel: 'Nail Technician',
          serviceName: appointment.serviceId?.name || 'Appointment',
          appointmentDate: appointment.date,
          appointmentTime: appointment.time,
          location: nailTechnician?.location || 'StyleVault booking',
          price: appointment.price || appointment.serviceId?.price || 0,
          currency: nailTechnician?.currency || 'USD',
          manageLink: `${appBaseUrl}/nail-technicians/${nailTechnician?.slug}`,
        }),
      });
    } catch (err) {
      emailError = err.message;
      console.error('Nail resend confirmation email failed:', err.message);
    }

    res.json({ appointment, emailResult, emailError });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
