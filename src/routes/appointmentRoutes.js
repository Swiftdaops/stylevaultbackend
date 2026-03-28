// src/routes/appointmentRoutes.js
import express from 'express';
import {
	createAppointment,
	getAppointments,
	getCalendarAppointments,
	checkAvailability,
	updateAppointment,
	cancelAppointment,
	resendConfirmationEmail,
} from '../controllers/appointmentController.js';
import { createPublicBarberReview, getPublicBarberBooking, updatePublicBarberBooking } from '../controllers/publicBookingController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.post('/', createAppointment);
router.get('/', authMiddleware, getAppointments);
router.get('/public/:id', getPublicBarberBooking);
router.post('/public/:id/review', createPublicBarberReview);
router.get('/calendar', getCalendarAppointments);
router.get('/availability', checkAvailability);
router.patch('/public/:id', updatePublicBarberBooking);
router.patch('/:id', authMiddleware, updateAppointment);
router.patch('/:id/cancel', authMiddleware, cancelAppointment);
router.post('/:id/resend-email', authMiddleware, resendConfirmationEmail);

export default router;