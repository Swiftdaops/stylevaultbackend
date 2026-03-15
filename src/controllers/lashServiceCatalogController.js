import { DEFAULT_LASH_SERVICE_CATALOG } from '../data/lashServiceCatalog.js';
import LashServiceCatalogItem from '../models/LashServiceCatalogItem.js';

const ensureCatalogSeeded = async () => {
  const total = await LashServiceCatalogItem.countDocuments();
  if (total > 0) return;

  await LashServiceCatalogItem.insertMany(DEFAULT_LASH_SERVICE_CATALOG, { ordered: false });
};

export const getLashServiceCatalog = async (req, res) => {
  try {
    await ensureCatalogSeeded();
    const items = await LashServiceCatalogItem.find({ active: true }).sort({ category: 1, name: 1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createLashServiceCatalogItem = async (req, res) => {
  try {
    const item = await LashServiceCatalogItem.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateLashServiceCatalogItem = async (req, res) => {
  try {
    const item = await LashServiceCatalogItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ message: 'Catalog item not found' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
