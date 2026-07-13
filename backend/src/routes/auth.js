const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "30d" });
}

function toPublicUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

// POST /api/auth/register
router.post("/register", (req, res) => {
  const { name, email, password, role = "user" } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email and password are required." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }
  if (!["user", "botanist"].includes(role)) {
    return res.status(400).json({ error: "role must be 'user' or 'botanist'." });
  }
  if (db.users.findByEmail(email)) {
    return res.status(409).json({ error: "An account with this email already exists." });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const user = db.users.create({ name, email, passwordHash, role });

  res.status(201).json({ token: signToken(user.id), user: toPublicUser(user) });
});

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required." });
  }

  const user = db.users.findByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  res.json({ token: signToken(user.id), user: toPublicUser(user) });
});

// GET /api/auth/me
router.get("/me", requireAuth, (req, res) => {
  const user = db.users.findById(req.userId);
  if (!user) return res.status(404).json({ error: "User not found." });
  res.json({ user: toPublicUser(user) });
});

// PUT /api/auth/me — update profile fields and/or settings
router.put("/me", requireAuth, (req, res) => {
  const { name, phone, location, bio, settings } = req.body;
  const fields = {};
  if (name !== undefined) fields.name = name;
  if (phone !== undefined) fields.phone = phone;
  if (location !== undefined) fields.location = location;
  if (bio !== undefined) fields.bio = bio;
  if (settings !== undefined) fields.settings = settings;

  if (Object.keys(fields).length === 0) {
    return res.status(400).json({ error: "No valid fields to update." });
  }

  const user = db.users.update(req.userId, fields);
  res.json({ user: toPublicUser(user) });
});

// PUT /api/auth/password
router.put("/password", requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "currentPassword and newPassword are required." });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters." });
  }

  const user = db.users.findById(req.userId);
  if (!bcrypt.compareSync(currentPassword, user.passwordHash)) {
    return res.status(401).json({ error: "Current password is incorrect." });
  }

  db.users.update(req.userId, { passwordHash: bcrypt.hashSync(newPassword, 10) });
  res.json({ ok: true });
});

module.exports = router;
