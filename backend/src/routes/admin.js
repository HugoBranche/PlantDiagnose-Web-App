const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required." });
  }
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required." });
  }
  next();
}

router.use(requireAuth, (req, res, next) => {
  req.user = req.user || null;
  next();
});

router.get("/stats", async (req, res) => {
  try {
    const [users, botanists, admins, diagnoses] = await Promise.all([
      db.users.findByRole("user"),
      db.users.findByRole("botanist"),
      db.users.findByRole("admin"),
      db.diagnoses.all(),
    ]);

    const user = await db.users.findById(req.userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required." });
    }

    res.json({
      stats: {
        users: users.length,
        botanists: botanists.length,
        admins: admins.length,
        diagnoses: diagnoses.length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to load admin stats." });
  }
});

router.get("/users", async (req, res) => {
  try {
    const user = await db.users.findById(req.userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required." });
    }

    const allUsers = await db.users.all();
    res.json({ users: allUsers });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to load users." });
  }
});

router.post("/botanists/:id/approve", async (req, res) => {
  try {
    const user = await db.users.findById(req.userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required." });
    }

    const target = await db.users.findById(req.params.id);
    if (!target || target.role !== "botanist") {
      return res.status(404).json({ error: "Botanist account not found." });
    }

    const updated = await db.users.update(target.id, { verified: true, profileComplete: target.profileComplete || false });
    res.json({ user: updated });
  } catch (err) {
    res.status(500).json({ error: err.message || "Could not approve botanist." });
  }
});

router.post("/botanists/:id/reject", async (req, res) => {
  try {
    const user = await db.users.findById(req.userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required." });
    }

    const target = await db.users.findById(req.params.id);
    if (!target || target.role !== "botanist") {
      return res.status(404).json({ error: "Botanist account not found." });
    }

    const updated = await db.users.update(target.id, { verified: false });
    res.json({ user: updated });
  } catch (err) {
    res.status(500).json({ error: err.message || "Could not reject botanist." });
  }
});

module.exports = router;
