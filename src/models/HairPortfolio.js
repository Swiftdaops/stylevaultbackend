import mongoose from 'mongoose';

const hairPortfolioSchema = new mongoose.Schema({
  hairSpecialistId: { type: mongoose.Schema.Types.ObjectId, ref: 'HairSpecialist', required: true },
  image: { type: String, required: true },
  serviceType: { type: String },
  caption: { type: String },
}, { timestamps: true });

export default mongoose.model('HairPortfolio', hairPortfolioSchema);
