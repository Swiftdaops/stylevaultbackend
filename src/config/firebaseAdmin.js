import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

let hasLoggedMissingConfigWarning = false;

const normalizePrivateKey = (value = '') => String(value).replace(/\\n/g, '\n');

export const isFirebaseAdminConfigured = () => Boolean(
  process.env.FIREBASE_PROJECT_ID
  && process.env.FIREBASE_CLIENT_EMAIL
  && process.env.FIREBASE_PRIVATE_KEY
);

export const getFirebaseAdminMessaging = () => {
  if (!isFirebaseAdminConfigured()) {
    if (!hasLoggedMissingConfigWarning) {
      console.warn(
        'Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY to enable push notifications.'
      );
      hasLoggedMissingConfigWarning = true;
    }

    return null;
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
      }),
    });
  }

  return getMessaging();
};
