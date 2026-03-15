import crypto from 'crypto';

export const generateBookingManagementToken = () => crypto.randomBytes(24).toString('hex');

export const ensureBookingManagementToken = async (appointment) => {
  if (!appointment) return '';
  if (appointment.managementToken) return appointment.managementToken;

  appointment.managementToken = generateBookingManagementToken();
  await appointment.save();
  return appointment.managementToken;
};

export const matchesBookingManagementToken = (appointment, token) => {
  if (!appointment?.managementToken || !token) return false;
  return String(appointment.managementToken) === String(token).trim();
};
