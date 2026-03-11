// src/routes/barberRoutes.js
import express from 'express';
import {
	getBarbers,
	createBarber,
	getBarber,
	updateBarber,
	getAnalytics,
} from '../controllers/barberController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.get('/', getBarbers);
router.post('/', authMiddleware, createBarber);
router.patch('/', authMiddleware, updateBarber);
router.get('/:id', getBarber);
router.patch('/:id', authMiddleware, updateBarber);
router.get('/:id/analytics', authMiddleware, getAnalytics);

export default router;