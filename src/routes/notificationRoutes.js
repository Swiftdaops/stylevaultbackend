import express from 'express';
import authMiddleware from '../middleware/auth.js';
import { registerDeviceToken, saveDevicePreference, unregisterDeviceToken } from '../controllers/notificationController.js';

const router = express.Router();

router.post('/device-preference', authMiddleware, saveDevicePreference);
router.post('/device-token', authMiddleware, registerDeviceToken);
router.delete('/device-token', authMiddleware, unregisterDeviceToken);

export default router;
