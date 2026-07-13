const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { callGradioApi } = require("../utils/hfClient");

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${req.userId}-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB, matches the frontend's stated limit
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image uploads are allowed."));
    }
    cb(null, true);
  },
});

function severityFromConfidence(status, confidence) {
  if (status === "Healthy") return null;
  if (confidence >= 85) return "Severe";
  if (confidence >= 60) return "Moderate";
  return "Mild";
}

function toPublicDiagnosis(d) {
  return {
    id: d.id,
    imageUrl: `/uploads/${path.basename(d.imagePath)}`,
    plant: d.plant,
    condition: d.condition,
    status: d.status,
    confidence: d.confidence,
    severity: d.severity,
    workflowStatus: d.workflowStatus,
    createdAt: d.createdAt,
  };
}

// POST /api/diagnoses — multipart/form-data, field name "image"
router.post("/", requireAuth, upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "An image file is required (field name: image)." });
  }

  try {
    const result = await callGradioApi(req.file.path);
    const severity = severityFromConfidence(result.status, result.confidence);

    
    const diagnosis = db.diagnoses.create({
      userId: req.userId,
      imagePath: req.file.path,
      plant: result.plant,
      condition: result.condition,
      status: result.status,
      confidence: result.confidence,
      severity,
    });

    res.status(201).json({ diagnosis: toPublicDiagnosis(diagnosis) });
  } catch (err) {
    fs.unlink(req.file.path, () => {});
    res.status(502).json({ error: err.message || "Failed to reach the diagnosis model." });
  }
});

// GET /api/diagnoses — list current user's diagnoses (newest first)
router.get("/", requireAuth, (req, res) => {
  const rows = db.diagnoses.findByUser(req.userId);
  res.json({ diagnoses: rows.map(toPublicDiagnosis) });
});

// GET /api/diagnoses/:id
router.get("/:id", requireAuth, (req, res) => {
  const row = db.diagnoses.findById(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: "Diagnosis not found." });
  res.json({ diagnosis: toPublicDiagnosis(row) });
});

// PUT /api/diagnoses/:id — update workflow status (e.g. mark as Treated)
router.put("/:id", requireAuth, (req, res) => {
  const { workflowStatus } = req.body;
  const allowed = ["In Progress", "Treated", "Monitoring"];
  if (!allowed.includes(workflowStatus)) {
    return res.status(400).json({ error: `workflowStatus must be one of: ${allowed.join(", ")}` });
  }

  const row = db.diagnoses.findById(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: "Diagnosis not found." });

  const updated = db.diagnoses.update(req.params.id, { workflowStatus });
  res.json({ diagnosis: toPublicDiagnosis(updated) });
});

// DELETE /api/diagnoses/:id
router.delete("/:id", requireAuth, (req, res) => {
  const row = db.diagnoses.findById(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: "Diagnosis not found." });

  db.diagnoses.delete(req.params.id);
  fs.unlink(row.imagePath, () => {});
  res.json({ ok: true });
});

module.exports = router;
