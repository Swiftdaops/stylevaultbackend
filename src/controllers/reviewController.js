import Review from '../models/Review.js';
import { serializeReview } from '../utils/reviews.js';

function normalizeProviderType(value = '') {
  return String(value || '').trim().toLowerCase();
}

function normalizeProviderSlug(value = '') {
  return String(value || '').trim().toLowerCase();
}

export const listPublicReviews = async (req, res) => {
  try {
    const providerType = normalizeProviderType(req.query?.providerType);
    const providerSlug = normalizeProviderSlug(req.query?.providerSlug);
    const providerId = String(req.query?.providerId || '').trim();
    const requestedLimit = Number(req.query?.limit || 6);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.floor(requestedLimit), 1), 24) : 6;

    if (!providerType) {
      return res.status(400).json({ message: 'providerType is required' });
    }

    if (!providerSlug && !providerId) {
      return res.status(400).json({ message: 'providerSlug or providerId is required' });
    }

    const filter = {
      providerType,
      isVisible: true,
    };

    if (providerSlug) {
      filter.providerSlug = providerSlug;
    }

    if (providerId) {
      filter.providerId = providerId;
    }

    const [reviews, aggregate] = await Promise.all([
      Review.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Review.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalReviews: { $sum: 1 },
            averageRating: { $avg: '$rating' },
          },
        },
      ]),
    ]);

    const summary = aggregate[0] || { totalReviews: 0, averageRating: 0 };

    res.json({
      providerType,
      providerSlug,
      providerId,
      totalReviews: Number(summary.totalReviews || 0),
      averageRating: Number(Number(summary.averageRating || 0).toFixed(1)),
      items: reviews.map((review) => serializeReview(review)),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
