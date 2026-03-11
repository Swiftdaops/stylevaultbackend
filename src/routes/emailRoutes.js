// src/routes/emailRoutes.js
import express from 'express';
import { sendBookingEmail, sendReminderEmail, sendAdminEmail } from '../controllers/emailController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.post('/admin', authMiddleware, sendAdminEmail);
router.post('/booking', authMiddleware, sendBookingEmail);
router.post('/reminder', authMiddleware, sendReminderEmail);

export default router;