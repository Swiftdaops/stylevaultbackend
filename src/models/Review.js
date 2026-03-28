import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  providerType: {
    type: String,
    enum: ['barber', 'hair-specialist', 'nail-technician', 'lash-technician', 'makeup-artist'],
    required: true,
    index: true,
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  providerSlug: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true,
  },
  providerName: {
    type: String,
    required: true,
    trim: true,
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  customerName: {
    type: String,
    required: true,
    trim: true,
  },
  customerEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  serviceName: {
    type: String,
    trim: true,
    default: '',
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    validate: {
      validator: Number.isInteger,
      message: 'Rating must be a whole number between 1 and 5',
    },
  },
  comment: {
    type: String,
    trim: true,
    maxlength: 1200,
    default: '',
  },
  isVisible: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

reviewSchema.index({ providerType: 1, appointmentId: 1 }, { unique: true });
reviewSchema.index({ providerType: 1, providerSlug: 1, createdAt: -1 });
reviewSchema.index({ providerType: 1, providerId: 1, createdAt: -1 });

const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);

export default Review;
