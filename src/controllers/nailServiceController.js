import NailService from '../models/NailService.js';
import NailServiceCatalogItem from '../models/NailServiceCatalogItem.js';
import { emitNailTechnicianUpdate } from '../socket/index.js';

const toBoolean = (value) => value === true || value === 'true';

const normalizePricingOptions = (value) => {
  if (!Array.isArray(value)) return [];

  return value
    .map((option) => ({
      label: String(option?.label || '').trim(),
      price: Number(option?.price || 0),
      duration: option?.duration === undefined || option?.duration === null || option?.duration === '' ? undefined : Number(option.duration),
    }))
    .filter((option) => option.label && Number.isFinite(option.price) && option.price >= 0);
};

const normalizeAddOns = (value) => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => ({
      name: String(item?.name || '').trim(),
      price: Number(item?.price || 0),
      duration: Number(item?.duration || 0),
    }))
    .filter((item) => item.name && Number.isFinite(item.price) && item.price >= 0);
};

const buildServicePayload = async (body = {}) => {
  let catalogItem = null;
  if (body.catalogId) {
    catalogItem = await NailServiceCatalogItem.findById(body.catalogId);
    if (!catalogItem) {
      const error = new Error('Catalog service not found');
      error.statusCode = 404;
      throw error;
    }
  }

  const basePrice = Number(body.basePrice ?? body.price ?? catalogItem?.basePrice ?? 0);
  if (!Number.isFinite(basePrice) || basePrice < 0) {
    const error = new Error('Base price must be a valid amount');
    error.statusCode = 400;
    throw error;
  }

  const duration = Number(body.duration ?? 0);
  if (!Number.isFinite(duration) || duration <= 0) {
    const error = new Error('Duration must be greater than zero');
    error.statusCode = 400;
    throw error;
  }

  const sampleImage = body.sampleImage || catalogItem?.image || '';
  if (!sampleImage) {
    const error = new Error('Sample image is required');
    error.statusCode = 400;
    throw error;
  }

  return {
    catalogId: catalogItem?._id,
    category: body.category || catalogItem?.category || '',
    name: body.name || catalogItem?.name || '',
    description: body.description || catalogItem?.description || '',
    price: basePrice,
    basePrice,
    duration,
    sampleImage,
    pricingOptions: normalizePricingOptions(body.pricingOptions),
    addOns: normalizeAddOns(body.addOns),
    homeServiceAvailable: toBoolean(body.homeServiceAvailable),
    materialRequired: toBoolean(body.materialRequired),
  };
};

export const createNailService = async (req, res) => {
  try {
    if (!req.user?.nailTechnicianId) return res.status(401).json({ message: 'Unauthorized' });

    const payload = await buildServicePayload(req.body);
    const service = await NailService.create({
      ...payload,
      nailTechnicianId: req.user.nailTechnicianId,
    });

    emitNailTechnicianUpdate(req.user.nailTechnicianId, {
      type: 'service',
      action: 'created',
      serviceId: service._id.toString(),
    });

    res.status(201).json(service);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const getMyNailServices = async (req, res) => {
  try {
    if (!req.user?.nailTechnicianId) return res.status(401).json({ message: 'Unauthorized' });

    const services = await NailService.find({ nailTechnicianId: req.user.nailTechnicianId })
      .populate('catalogId')
      .sort({ createdAt: -1 });

    res.json(services);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getNailServices = async (req, res) => {
  try {
    const nailTechnicianId = req.query.nailTechnician || req.query.nailTechnicianId;
    if (!nailTechnicianId) return res.status(400).json({ message: 'nailTechnicianId is required' });

    const services = await NailService.find({ nailTechnicianId })
      .populate('catalogId')
      .sort({ createdAt: -1 });

    res.json(services);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateNailService = async (req, res) => {
  try {
    const payload = await buildServicePayload(req.body);
    const service = await NailService.findOneAndUpdate(
      { _id: req.params.id, nailTechnicianId: req.user?.nailTechnicianId },
      payload,
      { new: true }
    );

    if (!service) return res.status(404).json({ message: 'Service not found' });

    emitNailTechnicianUpdate(req.user?.nailTechnicianId, {
      type: 'service',
      action: 'updated',
      serviceId: service._id.toString(),
    });

    res.json(service);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const deleteNailService = async (req, res) => {
  try {
    const service = await NailService.findOneAndDelete({ _id: req.params.id, nailTechnicianId: req.user?.nailTechnicianId });
    if (!service) return res.status(404).json({ message: 'Service not found' });

    emitNailTechnicianUpdate(req.user?.nailTechnicianId, {
      type: 'service',
      action: 'deleted',
      serviceId: service._id.toString(),
    });

    res.json({ message: 'Service deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
