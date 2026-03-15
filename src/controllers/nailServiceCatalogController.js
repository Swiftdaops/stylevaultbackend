import { DEFAULT_NAIL_SERVICE_CATALOG } from '../data/nailServiceCatalog.js';
import NailServiceCatalogItem from '../models/NailServiceCatalogItem.js';

const ensureCatalogSeeded = async () => {
  const total = await NailServiceCatalogItem.countDocuments();
  if (total > 0) return;

  await NailServiceCatalogItem.insertMany(DEFAULT_NAIL_SERVICE_CATALOG, { ordered: false });
};

export const getNailServiceCatalog = async (req, res) => {
  try {
    await ensureCatalogSeeded();
    const items = await NailServiceCatalogItem.find({ active: true }).sort({ category: 1, name: 1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createNailServiceCatalogItem = async (req, res) => {
  try {
    const item = await NailServiceCatalogItem.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateNailServiceCatalogItem = async (req, res) => {
  try {
    const item = await NailServiceCatalogItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ message: 'Catalog item not found' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
