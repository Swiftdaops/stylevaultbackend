import { sendEmail } from './emailService.js';
import { bookingConfirmationTemplate } from '../templates/bookingConfirmationEmail.js';
import { adminAppointmentNotificationTemplate } from '../templates/adminAppointmentNotificationEmail.js';
import { storefrontOwnerBookingNotificationTemplate } from '../templates/storefrontOwnerBookingNotificationEmail.js';

export const sendCustomerBookingConfirmationEmail = ({ to, status = 'confirmed', ...templateData }) => {
  const normalizedStatus = String(status || 'confirmed').toLowerCase();
  const subject = normalizedStatus === 'pending'
    ? 'Booking request received'
    : 'Your booking is confirmed';

  return sendEmail({
    to,
    subject,
    html: bookingConfirmationTemplate({ ...templateData, status: normalizedStatus }),
  });
};

export const sendAdminBookingNotificationEmail = ({ to, ...templateData }) => sendEmail({
  to,
  subject: `New appointment: ${templateData.customerName} booked ${templateData.serviceName}`,
  html: adminAppointmentNotificationTemplate(templateData),
});

export const sendStorefrontOwnerBookingNotificationEmail = ({ to, ...templateData }) => sendEmail({
  to,
  subject: `New booking for ${templateData.providerName}`,
  html: storefrontOwnerBookingNotificationTemplate(templateData),
});
