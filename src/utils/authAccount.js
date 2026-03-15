import bcrypt from 'bcryptjs';
import User from '../models/User.js';

export const normalizeEmailAddress = (email = '') => String(email || '').trim().toLowerCase();

export const findUserByNormalizedEmail = async (email = '') => {
  const normalizedEmail = normalizeEmailAddress(email);
  if (!normalizedEmail) return null;

  return User.findOne({ email: normalizedEmail });
};

export const changeAccountPassword = async ({ userId, role, currentPassword, newPassword }) => {
  const normalizedCurrentPassword = String(currentPassword || '');
  const normalizedNewPassword = String(newPassword || '');

  if (!normalizedCurrentPassword || !normalizedNewPassword) {
    const error = new Error('Current password and new password are required');
    error.statusCode = 400;
    throw error;
  }

  if (normalizedNewPassword.length < 6) {
    const error = new Error('New password must be at least 6 characters');
    error.statusCode = 400;
    throw error;
  }

  if (normalizedCurrentPassword === normalizedNewPassword) {
    const error = new Error('New password must be different from the current password');
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findById(userId);
  if (!user || (role && user.role !== role)) {
    const error = new Error('Account not found');
    error.statusCode = 404;
    throw error;
  }

  const isMatch = await bcrypt.compare(normalizedCurrentPassword, user.password);
  if (!isMatch) {
    const error = new Error('Current password is incorrect');
    error.statusCode = 400;
    throw error;
  }

  user.password = await bcrypt.hash(normalizedNewPassword, 12);
  await user.save();

  return user;
};
