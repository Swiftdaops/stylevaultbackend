import LashAppointment from '../models/LashAppointment.js';
import LashCustomer from '../models/LashCustomer.js';
import { emitLashTechnicianUpdate } from '../socket/index.js';

export const getLashCustomers = async (req, res) => {
  try {
    const customers = await LashCustomer.find({ lashTechnicianId: req.user.lashTechnicianId }).sort({ createdAt: -1 });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getLashCustomer = async (req, res) => {
  try {
    const customer = await LashCustomer.findOne({ _id: req.params.id, lashTechnicianId: req.user.lashTechnicianId });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateLashCustomer = async (req, res) => {
  try {
    const customer = await LashCustomer.findOneAndUpdate(
      { _id: req.params.id, lashTechnicianId: req.user.lashTechnicianId },
      req.body,
      { new: true }
    );

    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    await LashAppointment.updateMany(
      { lashTechnicianId: req.user.lashTechnicianId, customerId: customer._id },
      {
        ...(req.body.name ? { customerName: req.body.name } : {}),
        ...(req.body.email ? { customerEmail: req.body.email } : {}),
      }
    );

    emitLashTechnicianUpdate(req.user.lashTechnicianId, {
      type: 'customer',
      action: 'updated',
      customerId: customer._id.toString(),
    });

    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
