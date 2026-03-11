// src/routes/serviceRoutes.js
import express from 'express';
import { createService, getMyServices, getServices, updateService, deleteService } from '../controllers/serviceController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.post('/', authMiddleware, createService);
router.get('/manage', authMiddleware, getMyServices);
router.get('/', getServices);
router.patch('/:id', authMiddleware, updateService);
router.delete('/:id', authMiddleware, deleteService);

export default router;