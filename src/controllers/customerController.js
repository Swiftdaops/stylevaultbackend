// src/controllers/customerController.js
import Customer from '../models/Customer.js';
import Appointment from '../models/Appointment.js';
import { emitBarberUpdate } from '../socket/index.js';

// Get barber customers
export const getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find({ barberId: req.user.barberId }).sort({ createdAt: -1 });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single customer
export const getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, barberId: req.user.barberId });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update customer info
export const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, barberId: req.user.barberId },
      req.body,
      { new: true }
    );

    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    await Appointment.updateMany(
      { barberId: req.user.barberId, customerId: customer._id },
      {
        ...(req.body.name ? { customerName: req.body.name } : {}),
        ...(req.body.email ? { customerEmail: req.body.email } : {}),
      }
    );

    emitBarberUpdate(req.user.barberId, { type: 'customer', action: 'updated', customerId: customer._id.toString() });

    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};