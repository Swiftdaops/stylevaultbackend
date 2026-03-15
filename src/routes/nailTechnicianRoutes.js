import express from 'express';
import authMiddleware from '../middleware/auth.js';
import {
  createNailTechnician,
  getNailAnalytics,
  getNailTechnician,
  getNailTechnicians,
  updateNailTechnician,
} from '../controllers/nailTechnicianController.js';

const router = express.Router();

router.get('/', getNailTechnicians);
router.post('/', authMiddleware, createNailTechnician);
router.patch('/', authMiddleware, updateNailTechnician);
router.get('/:id', getNailTechnician);
router.patch('/:id', authMiddleware, updateNailTechnician);
router.get('/:id/analytics', authMiddleware, getNailAnalytics);

export default router;
