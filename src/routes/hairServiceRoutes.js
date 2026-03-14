import express from 'express';
import authMiddleware from '../middleware/auth.js';
import {
  createHairService,
  deleteHairService,
  getHairServices,
  getMyHairServices,
  updateHairService,
} from '../controllers/hairServiceController.js';

const router = express.Router();

router.post('/', authMiddleware, createHairService);
router.get('/manage', authMiddleware, getMyHairServices);
router.get('/', getHairServices);
router.patch('/:id', authMiddleware, updateHairService);
router.delete('/:id', authMiddleware, deleteHairService);

export default router;
