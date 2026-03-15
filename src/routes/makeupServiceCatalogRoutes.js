import express from 'express';
import {
  createMakeupServiceCatalogItem,
  getMakeupServiceCatalog,
  updateMakeupServiceCatalogItem,
} from '../controllers/makeupServiceCatalogController.js';

const router = express.Router();

router.get('/', getMakeupServiceCatalog);
router.post('/', createMakeupServiceCatalogItem);
router.patch('/:id', updateMakeupServiceCatalogItem);

export default router;
