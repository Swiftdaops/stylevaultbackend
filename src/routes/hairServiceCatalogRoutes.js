import express from 'express';
import {
  createHairServiceCatalogItem,
  getHairServiceCatalog,
  updateHairServiceCatalogItem,
} from '../controllers/hairServiceCatalogController.js';

const router = express.Router();

router.get('/', getHairServiceCatalog);
router.post('/', createHairServiceCatalogItem);
router.patch('/:id', updateHairServiceCatalogItem);

export default router;
