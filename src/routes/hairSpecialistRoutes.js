import express from 'express';
import authMiddleware from '../middleware/auth.js';
import {
  createHairSpecialist,
  getHairAnalytics,
  getHairSpecialist,
  getHairSpecialists,
  updateHairSpecialist,
} from '../controllers/hairSpecialistController.js';

const router = express.Router();

router.get('/', getHairSpecialists);
router.post('/', authMiddleware, createHairSpecialist);
router.patch('/', authMiddleware, updateHairSpecialist);
router.get('/:id', getHairSpecialist);
router.patch('/:id', authMiddleware, updateHairSpecialist);
router.get('/:id/analytics', authMiddleware, getHairAnalytics);

export default router;
