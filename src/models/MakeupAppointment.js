import mongoose from 'mongoose';

const makeupAppointmentSchema = new mongoose.Schema({
  makeupArtistId: { type: mongoose.Schema.Types.ObjectId, ref: 'MakeupArtist', required: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'MakeupService', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'MakeupCustomer', required: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  managementToken: { type: String, index: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  price: { type: Number, required: true },
  selectedPricingOption: { type: String },
  selectedAddOns: { type: [String], default: [] },
  status: { type: String, enum: ['confirmed', 'cancelled', 'completed'], default: 'confirmed' },
}, { timestamps: true });

makeupAppointmentSchema.index({ makeupArtistId: 1, date: 1, time: 1 }, { unique: true });

export default mongoose.model('MakeupAppointment', makeupAppointmentSchema);
