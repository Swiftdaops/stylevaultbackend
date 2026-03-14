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

const router = express.Router();

router.post('/', createHairAppointment);
router.get('/', authMiddleware, getHairAppointments);
router.get('/calendar', getHairCalendarAppointments);
router.get('/availability', checkHairAvailability);
router.patch('/:id', authMiddleware, updateHairAppointment);
router.patch('/:id/cancel', authMiddleware, cancelHairAppointment);
router.post('/:id/resend-email', authMiddleware, resendHairConfirmationEmail);

export default router;
