import Appointment from '../models/Appointment.js';
import Barber from '../models/Barber.js';
import HairAppointment from '../models/HairAppointment.js';
import HairSpecialist from '../models/HairSpecialist.js';
import NailAppointment from '../models/NailAppointment.js';
import NailTechnician from '../models/NailTechnician.js';
import LashAppointment from '../models/LashAppointment.js';
import LashTechnician from '../models/LashTechnician.js';
import MakeupAppointment from '../models/MakeupAppointment.js';
import MakeupArtist from '../models/MakeupArtist.js';
import Review from '../models/Review.js';
import { matchesBookingManagementToken } from '../utils/bookingAccess.js';
import { resolveStorefrontOwnerUser, sendStorefrontOwnerCancellationNotification, sendStorefrontOwnerReviewNotification } from '../services/storefrontOwnerNotificationService.js';
import { serializeReview } from '../utils/reviews.js';
import { buildDashboardUrl, buildStorefrontBaseUrl, buildStorefrontCustomerBookingsUrl, buildStorefrontManageBookingUrl } from '../utils/storefrontLinks.js';

const bookingConfigs = {
  barber: {
    type: 'barber',
    providerLabel: 'Barber',
    providerPath: 'barbers',
    providerIdField: 'barberId',
    appointmentModel: Appointment,
    providerModel: Barber,
    servicePopulate: 'name duration price',
  },
  'hair-specialist': {
    type: 'hair-specialist',
    providerLabel: 'Hair Specialist',
    providerPath: 'hair-specialists',
    providerIdField: 'hairSpecialistId',
    appointmentModel: HairAppointment,
    providerModel: HairSpecialist,
    servicePopulate: 'name duration price pricingOptions addOns',
  },
  'nail-technician': {
    type: 'nail-technician',
    providerLabel: 'Nail Technician',
    providerPath: 'nail-technicians',
    providerIdField: 'nailTechnicianId',
    appointmentModel: NailAppointment,
    providerModel: NailTechnician,
    servicePopulate: 'name duration price pricingOptions addOns',
  },
  'lash-technician': {
    type: 'lash-technician',
    providerLabel: 'Lash Technician',
    providerPath: 'lash-technicians',
    providerIdField: 'lashTechnicianId',
    appointmentModel: LashAppointment,
    providerModel: LashTechnician,
    servicePopulate: 'name duration price pricingOptions addOns',
  },
  'makeup-artist': {
    type: 'makeup-artist',
    providerLabel: 'Makeup Artist',
    providerPath: 'makeup-artists',
    providerIdField: 'makeupArtistId',
    appointmentModel: MakeupAppointment,
    providerModel: MakeupArtist,
    servicePopulate: 'name duration price pricingOptions addOns',
  },
};

const getAccessToken = (req) => String(
  req.query?.access
  || req.body?.access
  || req.get('x-booking-access-token')
  || ''
).trim();

const loadAppointment = async (config, id) => config.appointmentModel.findById(id)
  .populate('serviceId', config.servicePopulate);

const findReviewForAppointment = async (config, appointmentId) => Review.findOne({
  providerType: config.type,
  appointmentId,
  isVisible: true,
}).lean();

const buildPublicResponse = async ({ config, appointment, provider, accessToken }) => {
  const review = await findReviewForAppointment(config, appointment._id);

  return {
    appointment: {
      id: appointment._id,
      date: appointment.date,
      time: appointment.time,
      status: appointment.status,
      price: appointment.price,
      customerName: appointment.customerName,
      customerEmail: appointment.customerEmail,
      selectedPricingOption: appointment.selectedPricingOption || '',
      selectedAddOns: appointment.selectedAddOns || [],
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
      canCustomerEdit: appointment.status === 'confirmed',
      canCustomerReview: appointment.status === 'completed',
      service: appointment.serviceId
        ? {
            id: appointment.serviceId._id,
            name: appointment.serviceId.name,
            duration: appointment.serviceId.duration,
            price: appointment.serviceId.price,
            pricingOptions: appointment.serviceId.pricingOptions || [],
            addOns: appointment.serviceId.addOns || [],
          }
        : null,
      provider: {
        id: provider?._id,
        type: config.type,
        label: config.providerLabel,
        name: provider?.name || 'StyleVault',
        slug: provider?.slug || '',
        location: provider?.location || '',
        currency: provider?.currency || 'USD',
        whatsapp: provider?.whatsapp || '',
        profileImage: provider?.profileImage || '',
      },
    },
    review: serializeReview(review),
    reviewLink: provider?.slug ? buildStorefrontCustomerBookingsUrl({
      slug: provider.slug,
      providerPath: config.providerPath,
      providerType: config.type,
      appointmentId: appointment._id.toString(),
      accessToken,
    }) : '',
    storeUrl: provider?.slug ? buildStorefrontBaseUrl({ slug: provider.slug, providerPath: config.providerPath }) : '',
    manageLink: provider?.slug ? buildStorefrontManageBookingUrl({
      slug: provider.slug,
      providerPath: config.providerPath,
      providerType: config.type,
      appointmentId: appointment._id.toString(),
      accessToken,
    }) : '',
  };
};

const createGetPublicBookingHandler = (type) => async (req, res) => {
  try {
    const config = bookingConfigs[type];
    const accessToken = getAccessToken(req);

    if (!accessToken) {
      return res.status(400).json({ message: 'Booking access token is required' });
    }

    const appointment = await loadAppointment(config, req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (!matchesBookingManagementToken(appointment, accessToken)) {
      return res.status(403).json({ message: 'This booking link is invalid or expired' });
    }

    const provider = await config.providerModel.findById(appointment[config.providerIdField])
      .select('name slug location currency whatsapp profileImage')
      .lean();

    if (!provider) {
      return res.status(404).json({ message: `${config.providerLabel} not found` });
    }

    res.json(await buildPublicResponse({ config, appointment, provider, accessToken }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createUpdatePublicBookingHandler = (type) => async (req, res) => {
  try {
    const config = bookingConfigs[type];
    const accessToken = getAccessToken(req);

    if (!accessToken) {
      return res.status(400).json({ message: 'Booking access token is required' });
    }

    const appointment = await loadAppointment(config, req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (!matchesBookingManagementToken(appointment, accessToken)) {
      return res.status(403).json({ message: 'This booking link is invalid or expired' });
    }

    if (appointment.status === 'completed') {
      return res.status(400).json({ message: 'Completed bookings can no longer be changed' });
    }

    if (appointment.status !== 'confirmed') {
      return res.status(400).json({ message: 'This booking is pending confirmation and cannot be changed yet' });
    }

    const nextDate = req.body?.date || appointment.date;
    const nextTime = req.body?.time || appointment.time;
    const nextStatus = req.body?.status || appointment.status;

    if (!['confirmed', 'cancelled'].includes(nextStatus)) {
      return res.status(400).json({ message: 'Customers can only keep or cancel a booking' });
    }

    if (nextDate !== appointment.date || nextTime !== appointment.time) {
      const conflict = await config.appointmentModel.findOne({
        _id: { $ne: appointment._id },
        [config.providerIdField]: appointment[config.providerIdField],
        date: nextDate,
        time: nextTime,
        status: { $ne: 'cancelled' },
      });

      if (conflict) {
        return res.status(400).json({ message: 'That time slot is already booked' });
      }
    }

    appointment.date = nextDate;
    appointment.time = nextTime;
    appointment.status = nextStatus;
    await appointment.save();

    const provider = await config.providerModel.findById(appointment[config.providerIdField])
      .select('name slug location currency whatsapp profileImage')
      .lean();

    if (!provider) {
      return res.status(404).json({ message: `${config.providerLabel} not found` });
    }

    let ownerEmailResult = null;
    let ownerEmailError = null;

    if (nextStatus === 'cancelled') {
      const ownerUser = await resolveStorefrontOwnerUser({
        providerType: config.type,
        providerId: appointment[config.providerIdField],
      });

      const ownerNotification = await sendStorefrontOwnerCancellationNotification({
        ownerUser,
        providerType: config.type,
        customerName: appointment.customerName,
        customerEmail: appointment.customerEmail,
        providerName: provider?.name || 'StyleVault',
        providerLabel: config.providerLabel,
        serviceName: appointment.serviceId?.name || 'Appointment',
        appointmentDate: appointment.date,
        appointmentTime: appointment.time,
        location: provider?.location || 'StyleVault booking',
        price: appointment.price || 0,
        currency: provider?.currency || 'USD',
        cancelledBy: 'Customer',
        dashboardLink: buildDashboardUrl(`/${config.providerPath}/admin/appointments`),
      });

      ownerEmailResult = ownerNotification.emailResult;
      ownerEmailError = ownerNotification.emailError;
    }

    const updatedAppointment = await loadAppointment(config, appointment._id);

    res.json({
      ...(await buildPublicResponse({ config, appointment: updatedAppointment, provider, accessToken })),
      ownerEmailResult,
      ownerEmailError,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createPublicReviewHandler = (type) => async (req, res) => {
  try {
    const config = bookingConfigs[type];
    const accessToken = getAccessToken(req);

    if (!accessToken) {
      return res.status(400).json({ message: 'Booking access token is required' });
    }

    const appointment = await loadAppointment(config, req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (!matchesBookingManagementToken(appointment, accessToken)) {
      return res.status(403).json({ message: 'This booking link is invalid or expired' });
    }

    if (appointment.status !== 'completed') {
      return res.status(400).json({ message: 'Reviews can only be left after an appointment is completed' });
    }

    const provider = await config.providerModel.findById(appointment[config.providerIdField])
      .select('name slug location currency whatsapp profileImage')
      .lean();

    if (!provider) {
      return res.status(404).json({ message: `${config.providerLabel} not found` });
    }

    const rating = Number(req.body?.rating);
    const comment = String(req.body?.comment || '').trim();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'A rating between 1 and 5 is required' });
    }

    if (comment.length > 1200) {
      return res.status(400).json({ message: 'Review comments must be 1200 characters or fewer' });
    }

    const existingReview = await Review.findOne({
      providerType: config.type,
      appointmentId: appointment._id,
    }).lean();

    const savedReview = await Review.findOneAndUpdate(
      {
        providerType: config.type,
        appointmentId: appointment._id,
      },
      {
        providerType: config.type,
        providerId: appointment[config.providerIdField],
        providerSlug: provider.slug,
        providerName: provider.name,
        appointmentId: appointment._id,
        customerId: appointment.customerId || null,
        customerName: appointment.customerName,
        customerEmail: appointment.customerEmail,
        serviceName: appointment.serviceId?.name || 'Appointment',
        rating,
        comment,
        isVisible: true,
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    let ownerEmailResult = null;
    let ownerEmailError = null;

    if (!existingReview) {
      const ownerUser = await resolveStorefrontOwnerUser({
        providerType: config.type,
        providerId: appointment[config.providerIdField],
      });

      const ownerNotification = await sendStorefrontOwnerReviewNotification({
        ownerUser,
        providerType: config.type,
        customerName: appointment.customerName,
        providerName: provider.name,
        providerLabel: config.providerLabel,
        serviceName: appointment.serviceId?.name || 'Appointment',
        rating,
        comment,
        createdAt: savedReview?.createdAt || new Date().toISOString(),
        dashboardLink: buildDashboardUrl(`/${config.providerPath}/admin/appointments`),
      });

      ownerEmailResult = ownerNotification.emailResult;
      ownerEmailError = ownerNotification.emailError;
    }

    const refreshedAppointment = await loadAppointment(config, appointment._id);

    res.status(existingReview ? 200 : 201).json({
      message: existingReview ? 'Review updated successfully' : 'Review saved successfully',
      ownerEmailResult,
      ownerEmailError,
      ...(await buildPublicResponse({ config, appointment: refreshedAppointment, provider, accessToken })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPublicBarberBooking = createGetPublicBookingHandler('barber');
export const updatePublicBarberBooking = createUpdatePublicBookingHandler('barber');
export const createPublicBarberReview = createPublicReviewHandler('barber');
export const getPublicHairBooking = createGetPublicBookingHandler('hair-specialist');
export const updatePublicHairBooking = createUpdatePublicBookingHandler('hair-specialist');
export const createPublicHairReview = createPublicReviewHandler('hair-specialist');
export const getPublicNailBooking = createGetPublicBookingHandler('nail-technician');
export const updatePublicNailBooking = createUpdatePublicBookingHandler('nail-technician');
export const createPublicNailReview = createPublicReviewHandler('nail-technician');
export const getPublicLashBooking = createGetPublicBookingHandler('lash-technician');
export const updatePublicLashBooking = createUpdatePublicBookingHandler('lash-technician');
export const createPublicLashReview = createPublicReviewHandler('lash-technician');
export const getPublicMakeupBooking = createGetPublicBookingHandler('makeup-artist');
export const updatePublicMakeupBooking = createUpdatePublicBookingHandler('makeup-artist');
export const createPublicMakeupReview = createPublicReviewHandler('makeup-artist');
