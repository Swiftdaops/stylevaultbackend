import ServiceCatalogItem from '../models/ServiceCatalogItem.js';
import { DEFAULT_SERVICE_CATALOG } from '../data/serviceCatalog.js';

const ensureCatalogSeeded = async () => {
  const total = await ServiceCatalogItem.countDocuments();
  if (total > 0) return;

  await ServiceCatalogItem.insertMany(DEFAULT_SERVICE_CATALOG, { ordered: false });
};

export const getServiceCatalog = async (req, res) => {
  try {
    await ensureCatalogSeeded();
    const items = await ServiceCatalogItem.find({ active: true }).sort({ category: 1, name: 1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createServiceCatalogItem = async (req, res) => {
  try {
    const item = await ServiceCatalogItem.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateServiceCatalogItem = async (req, res) => {
  try {
    const item = await ServiceCatalogItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ message: 'Catalog item not found' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
