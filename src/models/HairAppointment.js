import mongoose from 'mongoose';

const hairAppointmentSchema = new mongoose.Schema({
  hairSpecialistId: { type: mongoose.Schema.Types.ObjectId, ref: 'HairSpecialist', required: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'HairService', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'HairCustomer', required: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  managementToken: { type: String, index: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  price: { type: Number, required: true },
  selectedPricingOption: { type: String },
  selectedAddOns: { type: [String], default: [] },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed'], default: 'pending' },
}, { timestamps: true });

hairAppointmentSchema.index({ hairSpecialistId: 1, date: 1, time: 1 }, { unique: true });

export default mongoose.model('HairAppointment', hairAppointmentSchema);
