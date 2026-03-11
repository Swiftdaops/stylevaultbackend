// src/controllers/serviceController.js
import Service from '../models/Service.js';
import ServiceCatalogItem from '../models/ServiceCatalogItem.js';
import { emitBarberUpdate } from '../socket/index.js';

// Create service
export const createService = async (req, res) => {
  try {
    if (!req.user?.barberId) return res.status(401).json({ message: 'Unauthorized' });

    if (!req.body.sampleImage) {
      return res.status(400).json({ message: 'Sample image is required' });
    }

    let catalogItem = null;
    if (req.body.catalogId) {
      catalogItem = await ServiceCatalogItem.findById(req.body.catalogId);
      if (!catalogItem) return res.status(404).json({ message: 'Catalog service not found' });
    }

    const service = await Service.create({
      ...req.body,
      barberId: req.user.barberId,
      catalogId: catalogItem?._id,
      name: req.body.name || catalogItem?.name,
      category: req.body.category || catalogItem?.category,
      description: req.body.description || catalogItem?.description,
    });

    emitBarberUpdate(req.user.barberId, { type: 'service', action: 'created', serviceId: service._id.toString() });
    res.status(201).json(service);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get authenticated barber services only
export const getMyServices = async (req, res) => {
  try {
    if (!req.user?.barberId) return res.status(401).json({ message: 'Unauthorized' });

    const services = await Service.find({ barberId: req.user.barberId })
      .populate('catalogId')
      .sort({ createdAt: -1 });
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get barber services
export const getServices = async (req, res) => {
  try {
    const barberId = req.query.barber || req.query.barberId;
    const filter = barberId ? { barberId } : null;

    if (!filter) {
      return res.status(400).json({ message: 'barberId is required' });
    }

    const services = await Service.find(filter).populate('catalogId').sort({ createdAt: -1 });
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update service
export const updateService = async (req, res) => {
  try {
    const updates = { ...req.body };

    if ('catalogId' in updates && updates.catalogId) {
      const catalogItem = await ServiceCatalogItem.findById(updates.catalogId);
      if (!catalogItem) return res.status(404).json({ message: 'Catalog service not found' });

      updates.category = updates.category || catalogItem.category;
      updates.name = updates.name || catalogItem.name;
      updates.description = updates.description || catalogItem.description;
    }

    const service = await Service.findOneAndUpdate(
      { _id: req.params.id, barberId: req.user?.barberId },
      updates,
      { new: true }
    );

    if (!service) return res.status(404).json({ message: 'Service not found' });

    emitBarberUpdate(req.user?.barberId, { type: 'service', action: 'updated', serviceId: service._id.toString() });
    res.json(service);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete service
export const deleteService = async (req, res) => {
  try {
    const service = await Service.findOneAndDelete({ _id: req.params.id, barberId: req.user?.barberId });
    if (!service) return res.status(404).json({ message: 'Service not found' });

    emitBarberUpdate(req.user?.barberId, { type: 'service', action: 'deleted', serviceId: service._id.toString() });
    res.json({ message: 'Service deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};