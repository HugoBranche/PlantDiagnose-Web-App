function calculateUpdatedBotanistRating(currentRating = 0, currentReviews = 0, newRating) {
  const safeCurrentRating = Number(currentRating) || 0;
  const safeCurrentReviews = Number(currentReviews) || 0;
  const safeNewRating = Number(newRating);

  if (!Number.isFinite(safeNewRating)) {
    throw new Error('A valid rating is required.');
  }

  const totalReviews = safeCurrentReviews + 1;
  const totalScore = safeCurrentRating * safeCurrentReviews + safeNewRating;
  const nextRating = Number((totalScore / totalReviews).toFixed(1));

  return {
    rating: nextRating,
    reviews: totalReviews,
  };
}

module.exports = { calculateUpdatedBotanistRating };
