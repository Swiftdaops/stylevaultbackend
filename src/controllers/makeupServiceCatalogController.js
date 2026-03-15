import { DEFAULT_MAKEUP_SERVICE_CATALOG } from '../data/makeupServiceCatalog.js';
import MakeupServiceCatalogItem from '../models/MakeupServiceCatalogItem.js';

const ensureCatalogSeeded = async () => {
  const total = await MakeupServiceCatalogItem.countDocuments();
  if (total > 0) return;

  await MakeupServiceCatalogItem.insertMany(DEFAULT_MAKEUP_SERVICE_CATALOG, { ordered: false });
};

export const getMakeupServiceCatalog = async (req, res) => {
  try {
    await ensureCatalogSeeded();
    const items = await MakeupServiceCatalogItem.find({ active: true }).sort({ category: 1, name: 1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createMakeupServiceCatalogItem = async (req, res) => {
  try {
    const item = await MakeupServiceCatalogItem.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateMakeupServiceCatalogItem = async (req, res) => {
  try {
    const item = await MakeupServiceCatalogItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ message: 'Catalog item not found' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
