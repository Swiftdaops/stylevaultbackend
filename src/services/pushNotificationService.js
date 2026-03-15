import User from '../models/User.js';
import { getFirebaseAdminMessaging } from '../config/firebaseAdmin.js';

const INVALID_TOKEN_ERROR_CODES = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
]);

const normalizeData = (data = {}) => Object.fromEntries(
  Object.entries(data)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => [key, String(value)])
);

const buildAppUrl = (path = '/') => {
  const baseUrl = String(process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');

  if (!path) return baseUrl;
  if (/^https?:\/\//i.test(path)) return path;

  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
};

export const sendUserPushNotification = async ({ user, title, body, data = {}, link = '/' }) => {
  if (!user?._id) {
    return { sent: false, reason: 'user-missing' };
  }

  const tokens = Array.isArray(user.notificationTokens)
    ? user.notificationTokens.map((entry) => entry?.token).filter(Boolean)
    : [];

  if (!tokens.length) {
    return { sent: false, reason: 'no-device-tokens' };
  }

  const messaging = getFirebaseAdminMessaging();
  if (!messaging) {
    return { sent: false, reason: 'firebase-not-configured' };
  }

  const result = await messaging.sendEachForMulticast({
    tokens,
    notification: {
      title,
      body,
    },
    data: normalizeData(data),
    webpush: {
      fcmOptions: {
        link: buildAppUrl(link),
      },
      notification: {
        icon: buildAppUrl('/icon'),
        badge: buildAppUrl('/icon'),
        tag: data?.appointmentId ? `appointment:${data.appointmentId}` : undefined,
        requireInteraction: true,
      },
    },
  });

  const invalidTokens = [];

  result.responses.forEach((response, index) => {
    if (!response.success && INVALID_TOKEN_ERROR_CODES.has(response.error?.code)) {
      invalidTokens.push(tokens[index]);
    }
  });

  if (invalidTokens.length) {
    await User.findByIdAndUpdate(user._id, {
      $pull: {
        notificationTokens: {
          token: { $in: invalidTokens },
        },
      },
    });
  }

  return {
    sent: result.successCount > 0,
    sentCount: result.successCount,
    failedCount: result.failureCount,
    invalidTokens,
  };
};
