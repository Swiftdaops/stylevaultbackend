import express from 'express';
import authMiddleware from '../middleware/auth.js';
import {
  cancelNailAppointment,
  checkNailAvailability,
  createNailAppointment,
  getNailAppointments,
  getNailCalendarAppointments,
  resendNailConfirmationEmail,
  updateNailAppointment,
} from '../controllers/nailAppointmentController.js';

const router = express.Router();

router.post('/', createNailAppointment);
router.get('/', authMiddleware, getNailAppointments);
router.get('/calendar', getNailCalendarAppointments);
router.get('/availability', checkNailAvailability);
router.patch('/:id', authMiddleware, updateNailAppointment);
router.patch('/:id/cancel', authMiddleware, cancelNailAppointment);
router.post('/:id/resend-email', authMiddleware, resendNailConfirmationEmail);

export default router;
