export function serializeReview(review) {
  if (!review) return null;

  return {
    id: review._id?.toString?.() || String(review.id || ''),
    providerType: review.providerType,
    providerSlug: review.providerSlug,
    providerName: review.providerName,
    appointmentId: review.appointmentId?.toString?.() || String(review.appointmentId || ''),
    customerName: review.customerName,
    serviceName: review.serviceName || '',
    rating: Number(review.rating || 0),
    comment: String(review.comment || ''),
    hasComment: Boolean(String(review.comment || '').trim()),
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
}

export function buildReviewSummary(items = []) {
  const reviews = Array.isArray(items) ? items : [];
  const totalReviews = reviews.length;
  const averageRating = totalReviews
    ? Number((reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / totalReviews).toFixed(1))
    : 0;

  return {
    totalReviews,
    averageRating,
  };
}
