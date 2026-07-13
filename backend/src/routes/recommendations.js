const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const SEASONAL_TIPS = [
  {
    title: "Winter Plant Care",
    tips: [
      "Reduce watering frequency as plants require less water in cooler months",
      "Monitor indoor humidity levels for houseplants",
      "Protect outdoor plants from frost with covers or mulch",
      "Clean and sterilize gardening tools",
    ],
  },
  {
    title: "Disease Prevention",
    tips: [
      "Remove fallen leaves and plant debris regularly",
      "Ensure good air circulation around plants",
      "Avoid overhead watering in humid conditions",
      "Inspect plants weekly for early disease signs",
    ],
  },
  {
    title: "Soil Health",
    tips: [
      "Test soil pH and nutrient levels quarterly",
      "Add organic compost to improve soil structure",
      "Practice crop rotation to prevent soil depletion",
      "Use mulch to retain moisture and suppress weeds",
    ],
  },
];

// GET /api/recommendations — action items generated from the user's
// un-treated diagnoses, plus the static seasonal tips shown to everyone.
router.get("/", requireAuth, (req, res) => {
  const all = db.diagnoses.findByUser(req.userId);
  const diseased = all.filter((d) => d.status === "Diseased");
  const pending = diseased.filter((d) => d.workflowStatus !== "Treated");
  const treatedCount = all.filter((d) => d.workflowStatus === "Treated").length;

  const actionItems = pending.map((d) => ({
    diagnosisId: d.id,
    title: `Treat ${d.condition || "detected issue"} on ${d.plant || "your plant"}`,
    severity: d.severity,
    createdAt: d.createdAt,
  }));

  res.json({
    actionItems,
    totalRecommendations: diseased.length,
    pendingActions: pending.length,
    completed: treatedCount,
    completionRate: diseased.length > 0 ? Math.round((treatedCount / diseased.length) * 100) : 0,
    seasonalTips: SEASONAL_TIPS,
  });
});

module.exports = router;
