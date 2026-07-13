const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /api/dashboard/stats — powers the Dashboard stat cards and Reports page
router.get("/stats", requireAuth, (req, res) => {
  const rows = db.diagnoses.findByUser(req.userId);

  const total = rows.length;
  const healthy = rows.filter((d) => d.status === "Healthy").length;
  const diseased = rows.filter((d) => d.status === "Diseased").length;
  const nearbyExperts = db.botanists.all().length;

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

  res.json({
    totalDiagnoses: total,
    healthyPlants: healthy,
    diseasedPlants: diseased,
    nearbyExperts,
    avgConfidence,
    diseaseDetectionRate: total > 0 ? Math.round((diseased / total) * 1000) / 10 : null,
    topDiseases,
  });
});

module.exports = router;
