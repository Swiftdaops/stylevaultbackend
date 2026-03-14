import mongoose from 'mongoose';

const pricingOptionSchema = new mongoose.Schema({
  label: { type: String, required: true },
  price: { type: Number, required: true },
  duration: { type: Number },
}, { _id: false });

const addOnSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true, default: 0 },
  duration: { type: Number, default: 0 },
}, { _id: false });

const hairServiceSchema = new mongoose.Schema({
  hairSpecialistId: { type: mongoose.Schema.Types.ObjectId, ref: 'HairSpecialist', required: true },
  catalogId: { type: mongoose.Schema.Types.ObjectId, ref: 'HairServiceCatalogItem' },
  category: { type: String },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  basePrice: { type: Number, required: true },
  duration: { type: Number, required: true },
  description: { type: String },
  sampleImage: { type: String },
  pricingOptions: { type: [pricingOptionSchema], default: [] },
  addOns: { type: [addOnSchema], default: [] },
  homeServiceAvailable: { type: Boolean, default: false },
  materialRequired: { type: Boolean, default: false },
  bookingsCount: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model('HairService', hairServiceSchema);
