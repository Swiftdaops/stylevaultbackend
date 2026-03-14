import mongoose from 'mongoose';

const hairServiceCatalogItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  category: { type: String, required: true },
  description: { type: String },
  image: { type: String, required: true },
  active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('HairServiceCatalogItem', hairServiceCatalogItemSchema);
