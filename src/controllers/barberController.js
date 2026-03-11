// src/controllers/barberController.js
import Barber from '../models/Barber.js';
import Appointment from '../models/Appointment.js';
import Service from '../models/Service.js';
import Customer from '../models/Customer.js';
import { emitBarberUpdate } from '../socket/index.js';

// Get all barber profiles
export const getBarbers = async (req, res) => {
  try {
    const barbers = await Barber.find().sort({ createdAt: -1 });
    res.json(barbers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create barber profile
export const createBarber = async (req, res) => {
  try {
    const barber = await Barber.create(req.body);
    res.status(201).json(barber);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get barber profile
export const getBarber = async (req, res) => {
  const { id } = req.params;
  try {
    const barber = await Barber.findById(id);
    if (!barber) return res.status(404).json({ message: 'Barber not found' });
    res.json(barber);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update barber profile
export const updateBarber = async (req, res) => {
  const id = req.user?.barberId;
  const updates = req.body;
  try {
    if (!id) return res.status(400).json({ message: 'Barber id is required' });

    const barber = await Barber.findByIdAndUpdate(id, updates, { new: true });
    if (!barber) return res.status(404).json({ message: 'Barber not found' });

    emitBarberUpdate(id, { type: 'profile', action: 'updated' });
    res.json(barber);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Barber analytics
export const getAnalytics = async (req, res) => {
  const id = req.user?.barberId;
  try {
    if (!id) return res.status(400).json({ message: 'Barber id is required' });

    const appointments = await Appointment.find({ barberId: id });
    const totalRevenue = appointments.reduce((acc, a) => acc + a.price, 0);
    const popularServices = await Service.find({ barberId: id }).sort({ bookingsCount: -1 });
    res.json({ totalRevenue, totalAppointments: appointments.length, popularServices });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};