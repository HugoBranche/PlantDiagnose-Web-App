const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function isWithinLastDays(dateValue, days) {
  if (!dateValue) return false;
  const createdAt = new Date(dateValue);
  if (Number.isNaN(createdAt.getTime())) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return createdAt >= cutoff;
}

// GET /api/dashboard/stats — powers the Dashboard stat cards and role-based views
router.get("/stats", requireAuth, async (req, res) => {
  try {
    const role = req.user?.role || "user";
    const [rows, botanists] = await Promise.all([
      db.diagnoses.findByUser(req.userId),
      db.botanists.all(),
    ]);

    const total = rows.length;
    const healthy = rows.filter((d) => d.status === "Healthy").length;
    const diseased = rows.filter((d) => d.status === "Diseased").length;
    const nearbyExperts = botanists.length;

    const withConfidence = rows.filter((d) => typeof d.confidence === "number");
    const avgConfidence =
      withConfidence.length > 0
        ? Math.round((withConfidence.reduce((sum, d) => sum + d.confidence, 0) / withConfidence.length) * 10) / 10
        : null;

    const diseaseCounts = {};
    rows
      .filter((d) => d.status === "Diseased" && d.condition)
      .forEach((d) => {
        diseaseCounts[d.condition] = (diseaseCounts[d.condition] || 0) + 1;
      });
    const topDiseases = Object.entries(diseaseCounts)
      .map(([condition, count]) => ({ condition, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const baseStats = {
      role,
      totalDiagnoses: total,
      healthyPlants: healthy,
      diseasedPlants: diseased,
      nearbyExperts,
      avgConfidence,
      diseaseDetectionRate: total > 0 ? Math.round((diseased / total) * 1000) / 10 : null,
      topDiseases,
    };

    if (role === "admin") {
      const farmers = (await db.users.findByRole("user")).filter((user) => isWithinLastDays(user.createdAt, 7));
      const pendingBotanists = (await db.users.findByRole("botanist")).filter((user) => !user.approved && !user.verified);

      return res.json({
        ...baseStats,
        dashboardType: "admin",
        newFarmersThisWeek: farmers.length,
        pendingBotanists: pendingBotanists.slice(0, 5),
        pendingBotanistsCount: pendingBotanists.length,
      });
    }

    if (role === "botanist") {
      const consultations = (await db.consultations.findForUser(req.userId))
        .filter((c) => Number(c.toBotanistUserId) === Number(req.userId));
      const uniqueSenders = new Set(consultations.map((c) => String(c.fromUserId)).filter(Boolean));

      return res.json({
        ...baseStats,
        dashboardType: "botanist",
        consultationCount: consultations.length,
        newContactsCount: uniqueSenders.size,
        recentConsultations: consultations.slice(0, 3),
      });
    }

    res.json({
      ...baseStats,
      dashboardType: "farmer",
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Could not load dashboard stats." });
  }
});

module.exports = router;