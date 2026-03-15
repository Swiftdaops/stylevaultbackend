import express from 'express';
import {
  createLashServiceCatalogItem,
  getLashServiceCatalog,
  updateLashServiceCatalogItem,
} from '../controllers/lashServiceCatalogController.js';

const router = express.Router();

router.get('/', getLashServiceCatalog);
router.post('/', createLashServiceCatalogItem);
router.patch('/:id', updateLashServiceCatalogItem);

export default router;
