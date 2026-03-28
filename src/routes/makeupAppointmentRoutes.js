import express from 'express';
import authMiddleware from '../middleware/auth.js';
import {
  cancelMakeupAppointment,
  checkMakeupAvailability,
  createMakeupAppointment,
  getMakeupAppointments,
  getMakeupCalendarAppointments,
  resendMakeupConfirmationEmail,
  updateMakeupAppointment,
} from '../controllers/makeupAppointmentController.js';
import { createPublicMakeupReview, getPublicMakeupBooking, updatePublicMakeupBooking } from '../controllers/publicBookingController.js';

const router = express.Router();

router.post('/', createMakeupAppointment);
router.get('/', authMiddleware, getMakeupAppointments);
router.get('/public/:id', getPublicMakeupBooking);
router.post('/public/:id/review', createPublicMakeupReview);
router.get('/calendar', getMakeupCalendarAppointments);
router.get('/availability', checkMakeupAvailability);
router.patch('/public/:id', updatePublicMakeupBooking);
router.patch('/:id', authMiddleware, updateMakeupAppointment);
router.patch('/:id/cancel', authMiddleware, cancelMakeupAppointment);
router.post('/:id/resend-email', authMiddleware, resendMakeupConfirmationEmail);

export default router;
