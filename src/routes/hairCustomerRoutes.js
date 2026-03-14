import express from 'express';
import authMiddleware from '../middleware/auth.js';
import {
  getHairCustomer,
  getHairCustomers,
  updateHairCustomer,
} from '../controllers/hairCustomerController.js';

const router = express.Router();

router.get('/', authMiddleware, getHairCustomers);
router.get('/:id', authMiddleware, getHairCustomer);
router.patch('/:id', authMiddleware, updateHairCustomer);

export default router;
