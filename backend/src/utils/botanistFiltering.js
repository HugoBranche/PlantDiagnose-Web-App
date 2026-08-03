function filterRealBotanists(rows, botanistUsers) {
  const visibleBotanistUserIds = new Set(
    (botanistUsers || [])
      .filter((user) => user?.role === 'botanist' && user.verified !== false)
      .map((user) => Number(user.id))
  );

  return (rows || []).filter((botanist) => {
    const userId = Number(botanist?.userId);
    if (!Number.isFinite(userId) || userId <= 0) return false;
    return visibleBotanistUserIds.has(userId);
  });
}

module.exports = { filterRealBotanists };
