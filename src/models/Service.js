// src/models/Service.js
import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema({
  barberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Barber', required: true },
  catalogId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCatalogItem' },
  category: { type: String },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  duration: { type: Number, required: true }, // in minutes
  description: { type: String },
  sampleImage: { type: String },
  homeServiceAvailable: { type: Boolean, default: false },
  bookingsCount: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model('Service', serviceSchema);