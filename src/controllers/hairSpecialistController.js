import HairAppointment from '../models/HairAppointment.js';
import HairCustomer from '../models/HairCustomer.js';
import HairService from '../models/HairService.js';
import HairSpecialist from '../models/HairSpecialist.js';
import { emitHairSpecialistUpdate } from '../socket/index.js';
import { sanitizeProfileUpdates } from '../utils/profileOptions.js';

export const getHairSpecialists = async (req, res) => {
  try {
    const hairSpecialists = await HairSpecialist.find().sort({ createdAt: -1 });
    res.json(hairSpecialists);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createHairSpecialist = async (req, res) => {
  try {
    const hairSpecialist = await HairSpecialist.create(req.body);
    res.status(201).json(hairSpecialist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getHairSpecialist = async (req, res) => {
  try {
    const hairSpecialist = await HairSpecialist.findById(req.params.id);
    if (!hairSpecialist) return res.status(404).json({ message: 'Hair specialist not found' });
    res.json(hairSpecialist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateHairSpecialist = async (req, res) => {
  const id = req.user?.hairSpecialistId;
  const updates = sanitizeProfileUpdates(req.body);

  try {
    if (!id) return res.status(400).json({ message: 'Hair specialist id is required' });

    const hairSpecialist = await HairSpecialist.findByIdAndUpdate(id, updates, { new: true });
    if (!hairSpecialist) return res.status(404).json({ message: 'Hair specialist not found' });

    emitHairSpecialistUpdate(id, { type: 'profile', action: 'updated' });
    res.json(hairSpecialist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getHairAnalytics = async (req, res) => {
  const id = req.user?.hairSpecialistId;

  try {
    if (!id) return res.status(400).json({ message: 'Hair specialist id is required' });

    const appointments = await HairAppointment.find({ hairSpecialistId: id });
    const totalRevenue = appointments.reduce((sum, appointment) => sum + (appointment.price || 0), 0);
    const popularServices = await HairService.find({ hairSpecialistId: id }).sort({ bookingsCount: -1 });
    const totalCustomers = await HairCustomer.countDocuments({ hairSpecialistId: id });

    res.json({
      totalRevenue,
      totalAppointments: appointments.length,
      totalCustomers,
      popularServices,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
