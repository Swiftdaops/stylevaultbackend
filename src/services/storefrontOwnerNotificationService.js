import User from '../models/User.js';
import { sendEmail } from './emailService.js';
import { sendUserPushNotification } from './pushNotificationService.js';
import { storefrontOwnerBookingNotificationTemplate } from '../templates/storefrontOwnerBookingNotificationEmail.js';
import { storefrontOwnerAppointmentCancelledTemplate } from '../templates/storefrontOwnerAppointmentCancelledEmail.js';
import { storefrontOwnerReviewNotificationTemplate } from '../templates/storefrontOwnerReviewNotificationEmail.js';
import { buildDashboardUrl } from '../utils/storefrontLinks.js';

const OWNER_CONFIG = {
  barber: {
    role: 'barber',
    providerIdField: 'barberId',
    providerLabel: 'Barber',
    dashboardPath: '/barbers/admin/appointments',
  },
  'hair-specialist': {
    role: 'hair-specialist',
    providerIdField: 'hairSpecialistId',
    providerLabel: 'Hair Specialist',
    dashboardPath: '/hair-specialists/admin/appointments',
  },
  'nail-technician': {
    role: 'nail-technician',
    providerIdField: 'nailTechnicianId',
    providerLabel: 'Nail Technician',
    dashboardPath: '/nail-technicians/admin/appointments',
  },
  'lash-technician': {
    role: 'lash-technician',
    providerIdField: 'lashTechnicianId',
    providerLabel: 'Lash Technician',
    dashboardPath: '/lash-technicians/admin/appointments',
  },
  'makeup-artist': {
    role: 'makeup-artist',
    providerIdField: 'makeupArtistId',
    providerLabel: 'Makeup Artist',
    dashboardPath: '/makeup-artists/admin/appointments',
  },
};

export function getStorefrontOwnerConfig(providerType = '') {
  return OWNER_CONFIG[String(providerType || '').trim().toLowerCase()] || null;
}

export async function resolveStorefrontOwnerUser({ providerType, providerId }) {
  const config = getStorefrontOwnerConfig(providerType);
  if (!config || !providerId) return null;

  return User.findOne({
    role: config.role,
    [config.providerIdField]: providerId,
  }).select('email notificationTokens').lean();
}

function resolveDashboardLink(providerType, explicitDashboardLink) {
  if (explicitDashboardLink) return explicitDashboardLink;
  const config = getStorefrontOwnerConfig(providerType);
  return config?.dashboardPath ? buildDashboardUrl(config.dashboardPath) : '';
}

export async function sendStorefrontOwnerBookingNotifications({
  ownerUser,
  providerType,
  customerName,
  customerEmail,
  customerPhone,
  providerName,
  providerLabel,
  serviceName,
  appointmentDate,
  appointmentTime,
  location,
  price,
  currency,
  dashboardLink,
  appointmentId,
  providerId,
}) {
  const resolvedDashboardLink = resolveDashboardLink(providerType, dashboardLink);
  const resolvedProviderLabel = providerLabel || getStorefrontOwnerConfig(providerType)?.providerLabel || 'Storefront';

  let emailResult = null;
  let emailError = null;
  let pushResult = null;
  let pushError = null;

  if (ownerUser?.email) {
    try {
      emailResult = await sendEmail({
        to: ownerUser.email,
        subject: `New booking for ${providerName}`,
        html: storefrontOwnerBookingNotificationTemplate({
          customerName,
          customerEmail,
          customerPhone,
          providerName,
          providerLabel: resolvedProviderLabel,
          serviceName,
          appointmentDate,
          appointmentTime,
          location,
          price,
          currency,
          dashboardLink: resolvedDashboardLink,
        }),
      });
    } catch (error) {
      emailError = error.message;
    }
  } else {
    emailError = `${resolvedProviderLabel} email is not configured`;
  }

  if (ownerUser) {
    try {
      pushResult = await sendUserPushNotification({
        user: ownerUser,
        title: 'New appointment booked',
        body: `${customerName} booked ${serviceName} on ${appointmentDate} at ${appointmentTime}.`,
        data: {
          type: 'appointment',
          action: 'created',
          appointmentId,
          providerRole: providerType,
          providerId,
          customerName,
          serviceName,
          appointmentDate,
          appointmentTime,
          link: getStorefrontOwnerConfig(providerType)?.dashboardPath || '/',
        },
        link: getStorefrontOwnerConfig(providerType)?.dashboardPath || '/',
      });
    } catch (error) {
      pushError = error.message;
    }
  } else {
    pushError = `${resolvedProviderLabel} account is not configured`;
  }

  return {
    emailResult,
    emailError,
    pushResult,
    pushError,
  };
}

export async function sendStorefrontOwnerCancellationNotification({
  ownerUser,
  providerType,
  customerName,
  customerEmail,
  providerName,
  providerLabel,
  serviceName,
  appointmentDate,
  appointmentTime,
  location,
  price,
  currency,
  cancelledBy = 'Customer',
  dashboardLink,
}) {
  const resolvedDashboardLink = resolveDashboardLink(providerType, dashboardLink);
  const resolvedProviderLabel = providerLabel || getStorefrontOwnerConfig(providerType)?.providerLabel || 'Storefront';

  if (!ownerUser?.email) {
    return {
      emailResult: null,
      emailError: `${resolvedProviderLabel} email is not configured`,
    };
  }

  try {
    const emailResult = await sendEmail({
      to: ownerUser.email,
      subject: `Appointment cancelled for ${providerName}`,
      html: storefrontOwnerAppointmentCancelledTemplate({
        customerName,
        customerEmail,
        providerName,
        providerLabel: resolvedProviderLabel,
        serviceName,
        appointmentDate,
        appointmentTime,
        location,
        price,
        currency,
        cancelledBy,
        dashboardLink: resolvedDashboardLink,
      }),
    });

    return { emailResult, emailError: null };
  } catch (error) {
    return { emailResult: null, emailError: error.message };
  }
}

export async function sendStorefrontOwnerReviewNotification({
  ownerUser,
  providerType,
  customerName,
  providerName,
  providerLabel,
  serviceName,
  rating,
  comment,
  createdAt,
  dashboardLink,
}) {
  const resolvedDashboardLink = resolveDashboardLink(providerType, dashboardLink);
  const resolvedProviderLabel = providerLabel || getStorefrontOwnerConfig(providerType)?.providerLabel || 'Storefront';

  if (!ownerUser?.email) {
    return {
      emailResult: null,
      emailError: `${resolvedProviderLabel} email is not configured`,
    };
  }

  try {
    const emailResult = await sendEmail({
      to: ownerUser.email,
      subject: `New ${rating}-star review for ${providerName}`,
      html: storefrontOwnerReviewNotificationTemplate({
        customerName,
        providerName,
        providerLabel: resolvedProviderLabel,
        serviceName,
        rating,
        comment,
        createdAt,
        dashboardLink: resolvedDashboardLink,
      }),
    });

    return { emailResult, emailError: null };
  } catch (error) {
    return { emailResult: null, emailError: error.message };
  }
}
