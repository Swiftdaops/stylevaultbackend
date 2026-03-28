import { sendCustomerBookingConfirmationEmail } from './bookingNotificationService.js';
import { sendEmail } from './emailService.js';
import { sendPushNotificationToEntries } from './pushNotificationService.js';
import { completedAppointmentReviewTemplate } from '../templates/completedAppointmentReviewEmail.js';

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const STATUS_COPY = {
  pending: {
    pushTitle: 'Booking request sent',
    pushBody: ({ providerName }) => `Your booking request has been sent to ${providerName}. We will notify you when it is confirmed.`,
    emailSubject: 'Booking request received',
    emailHeading: 'Booking request received',
    emailMessage: ({ providerName }) => `Your booking request has been sent to ${providerName}. We will notify you once it is confirmed.`,
  },
  confirmed: {
    pushTitle: 'Booking confirmed',
    pushBody: ({ providerName }) => `Your appointment with ${providerName} has been confirmed. We look forward to seeing you.`,
    emailSubject: 'Your booking has been confirmed',
    emailHeading: 'Booking confirmed',
    emailMessage: ({ providerName }) => `Your appointment with ${providerName} has been confirmed. We look forward to seeing you.`,
  },
  completed: {
    pushTitle: 'Thank you for coming',
    pushBody: ({ providerName }) => `Thank you for visiting ${providerName}. We hope you enjoyed your appointment.`,
    emailSubject: ({ providerName }) => `Thanks for visiting ${providerName}`,
    emailHeading: 'Thank you for visiting',
    emailMessage: ({ providerName }) => `Thank you for visiting ${providerName}. We hope you enjoyed your appointment and would love to see you again soon.`,
  },
  cancelled: {
    pushTitle: 'Booking cancelled',
    pushBody: ({ providerName }) => `Your booking with ${providerName} has been cancelled.`,
    emailSubject: 'Your appointment was cancelled',
    emailHeading: 'Appointment cancelled',
    emailMessage: ({ providerName }) => `Your booking with ${providerName} has been cancelled.`,
  },
};

function resolveCopyValue(value, params = {}) {
  return typeof value === 'function' ? value(params) : value;
}

function normalizeStatus(status = 'pending') {
  const normalized = String(status || 'pending').trim().toLowerCase();
  return STATUS_COPY[normalized] ? normalized : 'pending';
}

function renderStatusEmailTemplate({
  status,
  customerName,
  providerName,
  serviceName,
  appointmentDate,
  appointmentTime,
  manageLink,
}) {
  const copy = STATUS_COPY[status] || STATUS_COPY.pending;
  const details = [
    serviceName ? `<li><strong>Service:</strong> ${escapeHtml(serviceName)}</li>` : '',
    appointmentDate ? `<li><strong>Date:</strong> ${escapeHtml(appointmentDate)}</li>` : '',
    appointmentTime ? `<li><strong>Time:</strong> ${escapeHtml(appointmentTime)}</li>` : '',
  ].filter(Boolean).join('');

  const manageLinkMarkup = manageLink
    ? `<p style="margin-top:24px;"><a href="${escapeHtml(manageLink)}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#111111;color:#ffffff;text-decoration:none;font-weight:700;">Open booking manager</a></p>`
    : '';

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#111827;max-width:600px;margin:0 auto;padding:24px;">
      <div style="background:#111111;color:#ffffff;padding:20px 24px;border-radius:16px 16px 0 0;font-size:24px;font-weight:700;">StyleVault</div>
      <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;padding:24px;background:#ffffff;">
        <h2 style="margin:0 0 12px;">${escapeHtml(copy.emailHeading)}</h2>
        <p>Hello ${escapeHtml(customerName || 'there')},</p>
        <p>${escapeHtml(copy.emailMessage({ providerName: providerName || 'StyleVault' }))}</p>
        ${details ? `<ul style="padding-left:18px;">${details}</ul>` : ''}
        ${manageLinkMarkup}
      </div>
    </div>
  `;
}

export async function sendCustomerAppointmentStatusNotifications({
  to,
  status,
  customerName,
  providerName,
  providerLabel,
  serviceName,
  appointmentDate,
  appointmentTime,
  location,
  price,
  currency,
  manageLink,
  reviewLink,
  pushEntries,
  pushData = {},
  pruneInvalidTokens,
}) {
  const normalizedStatus = normalizeStatus(status);
  const copy = STATUS_COPY[normalizedStatus];

  let emailResult = null;
  let emailError = null;
  let pushResult = null;
  let pushError = null;

  try {
    if (normalizedStatus === 'pending' || normalizedStatus === 'confirmed') {
      emailResult = await sendCustomerBookingConfirmationEmail({
        to,
        status: normalizedStatus,
        customerName,
        providerName,
        providerLabel,
        serviceName,
        appointmentDate,
        appointmentTime,
        location,
        price,
        currency,
        manageLink,
      });
    } else if (normalizedStatus === 'completed') {
      emailResult = await sendEmail({
        to,
        subject: resolveCopyValue(copy.emailSubject, { providerName: providerName || 'StyleVault' }),
        html: completedAppointmentReviewTemplate({
          customerName,
          providerName,
          providerLabel,
          serviceName,
          appointmentDate,
          appointmentTime,
          reviewLink,
          manageLink,
        }),
      });
    } else {
      emailResult = await sendEmail({
        to,
        subject: resolveCopyValue(copy.emailSubject, { providerName: providerName || 'StyleVault' }),
        html: renderStatusEmailTemplate({
          status: normalizedStatus,
          customerName,
          providerName,
          serviceName,
          appointmentDate,
          appointmentTime,
          manageLink,
        }),
      });
    }
  } catch (error) {
    emailError = error?.message || 'email-notification-failed';
  }

  if (Array.isArray(pushEntries) && pushEntries.length) {
    try {
      pushResult = await sendPushNotificationToEntries({
        entries: pushEntries,
        title: copy.pushTitle,
        body: copy.pushBody({ providerName: providerName || 'StyleVault' }),
        data: {
          type: 'appointment',
          action: normalizedStatus,
          providerName,
          providerLabel,
          serviceName,
          appointmentDate,
          appointmentTime,
          link: manageLink,
          ...pushData,
        },
        link: manageLink,
        pruneInvalidTokens,
      });
    } catch (error) {
      pushError = error?.message || 'push-notification-failed';
    }
  }

  return {
    emailResult,
    emailError,
    pushResult,
    pushError,
  };
}

export default sendCustomerAppointmentStatusNotifications;
