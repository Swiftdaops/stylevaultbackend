// src/models/Customer.js
import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  barberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Barber', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  visitHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' }],
}, { timestamps: true });

export default mongoose.model('Customer', customerSchema);