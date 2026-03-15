import express from 'express';
import {
  createNailServiceCatalogItem,
  getNailServiceCatalog,
  updateNailServiceCatalogItem,
} from '../controllers/nailServiceCatalogController.js';

const router = express.Router();

router.get('/', getNailServiceCatalog);
router.post('/', createNailServiceCatalogItem);
router.patch('/:id', updateNailServiceCatalogItem);

export default router;
