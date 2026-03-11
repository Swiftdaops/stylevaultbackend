import express from 'express';
import authMiddleware from '../middleware/auth.js';
import requireAdmin from '../middleware/requireAdmin.js';
import {
  createServiceCatalogItem,
  getServiceCatalog,
  updateServiceCatalogItem,
} from '../controllers/serviceCatalogController.js';

const router = express.Router();

router.get('/', getServiceCatalog);
router.post('/', authMiddleware, requireAdmin, createServiceCatalogItem);
router.patch('/:id', authMiddleware, requireAdmin, updateServiceCatalogItem);

export default router;
