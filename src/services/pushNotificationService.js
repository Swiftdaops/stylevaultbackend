import User from '../models/User.js';
import { getFirebaseAdminMessaging } from '../config/firebaseAdmin.js';

const DEFAULT_APP_URL = 'https://www.stylevault.site';

const isLocalHost = (hostname = '') => hostname.includes('localhost') || /^\d+\.\d+\.\d+\.\d+$/.test(hostname);

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
  const rawBaseUrl = String(process.env.APP_URL || process.env.FRONTEND_URL || DEFAULT_APP_URL).trim();

  let baseUrl = DEFAULT_APP_URL;

  try {
    const parsed = new URL(rawBaseUrl);
    const hostname = parsed.hostname.replace(/^www\./, '');
    baseUrl = process.env.NODE_ENV === 'production' && isLocalHost(hostname)
      ? DEFAULT_APP_URL
      : parsed.toString().replace(/\/+$/, '');
  } catch {
    baseUrl = DEFAULT_APP_URL;
  }

  if (!path) return baseUrl;
  if (/^https?:\/\//i.test(path)) return path;

  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
};

const getTokensFromEntries = (entries = []) => (
  Array.isArray(entries)
    ? entries.map((entry) => entry?.token).filter(Boolean)
    : []
);

export const sendPushNotificationToEntries = async ({ entries, title, body, data = {}, link = '/', pruneInvalidTokens }) => {
  const tokens = getTokensFromEntries(entries);

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

  if (invalidTokens.length && typeof pruneInvalidTokens === 'function') {
    await pruneInvalidTokens(invalidTokens);
  }

  return {
    sent: result.successCount > 0,
    sentCount: result.successCount,
    failedCount: result.failureCount,
    invalidTokens,
  };
};

export const sendUserPushNotification = async ({ user, title, body, data = {}, link = '/' }) => {
  if (!user?._id) {
    return { sent: false, reason: 'user-missing' };
  }

  return sendPushNotificationToEntries({
    entries: user.notificationTokens,
    title,
    body,
    data,
    link,
    pruneInvalidTokens: async (invalidTokens) => {
      await User.findByIdAndUpdate(user._id, {
        $pull: {
          notificationTokens: {
            token: { $in: invalidTokens },
          },
        },
      });
    },
  });
};
