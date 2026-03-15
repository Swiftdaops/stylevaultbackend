// src/models/Customer.js
import mongoose from 'mongoose';
import notificationDeviceSchema from './schemas/notificationDeviceSchema.js';

const customerSchema = new mongoose.Schema({
  barberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Barber', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  notificationSubscriptions: { type: [notificationDeviceSchema], default: [] },
  visitHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' }],
}, { timestamps: true });

export default mongoose.model('Customer', customerSchema);