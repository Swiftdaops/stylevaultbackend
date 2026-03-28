import express from 'express';
import authMiddleware from '../middleware/auth.js';
import {
  cancelHairAppointment,
  checkHairAvailability,
  createHairAppointment,
  getHairAppointments,
  getHairCalendarAppointments,
  resendHairConfirmationEmail,
  updateHairAppointment,
} from '../controllers/hairAppointmentController.js';
import { createPublicHairReview, getPublicHairBooking, updatePublicHairBooking } from '../controllers/publicBookingController.js';

const router = express.Router();

router.post('/', createHairAppointment);
router.get('/', authMiddleware, getHairAppointments);
router.get('/public/:id', getPublicHairBooking);
router.post('/public/:id/review', createPublicHairReview);
router.get('/calendar', getHairCalendarAppointments);
router.get('/availability', checkHairAvailability);
router.patch('/public/:id', updatePublicHairBooking);
router.patch('/:id', authMiddleware, updateHairAppointment);
router.patch('/:id/cancel', authMiddleware, cancelHairAppointment);
router.post('/:id/resend-email', authMiddleware, resendHairConfirmationEmail);

export default router;
