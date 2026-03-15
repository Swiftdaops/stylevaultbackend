import NailAppointment from '../models/NailAppointment.js';
import NailCustomer from '../models/NailCustomer.js';
import NailService from '../models/NailService.js';
import NailTechnician from '../models/NailTechnician.js';
import { emitNailTechnicianUpdate } from '../socket/index.js';
import { sanitizeProfileUpdates } from '../utils/profileOptions.js';

export const getNailTechnicians = async (req, res) => {
  try {
    const nailTechnicians = await NailTechnician.find().sort({ createdAt: -1 });
    res.json(nailTechnicians);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createNailTechnician = async (req, res) => {
  try {
    const nailTechnician = await NailTechnician.create(req.body);
    res.status(201).json(nailTechnician);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getNailTechnician = async (req, res) => {
  try {
    const nailTechnician = await NailTechnician.findById(req.params.id);
    if (!nailTechnician) return res.status(404).json({ message: 'Nail technician not found' });
    res.json(nailTechnician);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateNailTechnician = async (req, res) => {
  const id = req.user?.nailTechnicianId;
  const updates = sanitizeProfileUpdates(req.body);

  try {
    if (!id) return res.status(400).json({ message: 'Nail technician id is required' });

    const nailTechnician = await NailTechnician.findByIdAndUpdate(id, updates, { new: true });
    if (!nailTechnician) return res.status(404).json({ message: 'Nail technician not found' });

    emitNailTechnicianUpdate(id, { type: 'profile', action: 'updated' });
    res.json(nailTechnician);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getNailAnalytics = async (req, res) => {
  const id = req.user?.nailTechnicianId;

  try {
    if (!id) return res.status(400).json({ message: 'Nail technician id is required' });

    const appointments = await NailAppointment.find({ nailTechnicianId: id });
    const totalRevenue = appointments.reduce((sum, appointment) => sum + (appointment.price || 0), 0);
    const popularServices = await NailService.find({ nailTechnicianId: id }).sort({ bookingsCount: -1 });
    const totalCustomers = await NailCustomer.countDocuments({ nailTechnicianId: id });

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
