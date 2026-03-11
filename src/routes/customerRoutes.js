// src/routes/customerRoutes.js
import express from 'express';
import { getCustomers, getCustomer, updateCustomer } from '../controllers/customerController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.get('/', authMiddleware, getCustomers);
router.get('/:id', authMiddleware, getCustomer);
router.patch('/:id', authMiddleware, updateCustomer);

export default router;