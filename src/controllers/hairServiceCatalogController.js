import { DEFAULT_HAIR_SERVICE_CATALOG } from '../data/hairServiceCatalog.js';
import HairServiceCatalogItem from '../models/HairServiceCatalogItem.js';

const ensureCatalogSeeded = async () => {
  const total = await HairServiceCatalogItem.countDocuments();
  if (total > 0) return;

  await HairServiceCatalogItem.insertMany(DEFAULT_HAIR_SERVICE_CATALOG, { ordered: false });
};

export const getHairServiceCatalog = async (req, res) => {
  try {
    await ensureCatalogSeeded();
    const items = await HairServiceCatalogItem.find({ active: true }).sort({ category: 1, name: 1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createHairServiceCatalogItem = async (req, res) => {
  try {
    const item = await HairServiceCatalogItem.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateHairServiceCatalogItem = async (req, res) => {
  try {
    const item = await HairServiceCatalogItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ message: 'Catalog item not found' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
