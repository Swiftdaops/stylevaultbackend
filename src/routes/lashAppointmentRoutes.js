import express from 'express';
import authMiddleware from '../middleware/auth.js';
import {
  cancelLashAppointment,
  checkLashAvailability,
  createLashAppointment,
  getLashAppointments,
  getLashCalendarAppointments,
  resendLashConfirmationEmail,
  updateLashAppointment,
} from '../controllers/lashAppointmentController.js';
import { getPublicLashBooking, updatePublicLashBooking } from '../controllers/publicBookingController.js';

const router = express.Router();

router.post('/', createLashAppointment);
router.get('/', authMiddleware, getLashAppointments);
router.get('/public/:id', getPublicLashBooking);
router.get('/calendar', getLashCalendarAppointments);
router.get('/availability', checkLashAvailability);
router.patch('/public/:id', updatePublicLashBooking);
router.patch('/:id', authMiddleware, updateLashAppointment);
router.patch('/:id/cancel', authMiddleware, cancelLashAppointment);
router.post('/:id/resend-email', authMiddleware, resendLashConfirmationEmail);

export default router;
