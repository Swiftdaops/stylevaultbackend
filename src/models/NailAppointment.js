import mongoose from 'mongoose';

const nailAppointmentSchema = new mongoose.Schema({
  nailTechnicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'NailTechnician', required: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'NailService', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'NailCustomer', required: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  price: { type: Number, required: true },
  selectedPricingOption: { type: String },
  selectedAddOns: { type: [String], default: [] },
  status: { type: String, enum: ['confirmed', 'cancelled', 'completed'], default: 'confirmed' },
}, { timestamps: true });

nailAppointmentSchema.index({ nailTechnicianId: 1, date: 1, time: 1 }, { unique: true });

export default mongoose.model('NailAppointment', nailAppointmentSchema);
