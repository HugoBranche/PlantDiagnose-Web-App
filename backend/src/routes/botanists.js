const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { filterRealBotanists } = require("../utils/botanistFiltering");

const router = express.Router();

// Haversine formula: great-circle distance in km between two lat/lng points.
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// GET /api/botanists?search=&specialty=&sort=distance|rating|reviews&lat=&lng=
// Reads only from real botanist accounts and their synced public profile rows.
router.get("/", async (req, res) => {
  try {
    const { search = "", specialty = "all", sort = "distance", lat, lng } = req.query;

    let rows = await db.botanists.all();
    const botanistUsers = await db.users.findByRole("botanist");

    rows = filterRealBotanists(rows, botanistUsers);

    const mergedByKey = new Map();
    rows.forEach((b) => {
      const key = `user:${b.userId}`;
      mergedByKey.set(key, { ...b, specializations: Array.isArray(b.specializations) ? b.specializations : [] });
    });

    botanistUsers.forEach((user) => {
      const key = `user:${user.id}`;
      const existing = mergedByKey.get(key);
      const normalizedUser = {
        id: user.id,
        userId: user.id,
        name: user.name,
        specialty: user.specialty || "General Botany",
        rating: user.rating ?? 4.5,
        reviews: user.reviews ?? 0,
        distanceKm: null,
        lat: user.lat,
        lng: user.lng,
        location: user.location || "Location not yet updated",
        phone: user.phone,
        email: user.email,
        experienceYears: user.experienceYears ?? 0,
        verified: user.verified ?? true,
        specializations: Array.isArray(user.specializations) ? user.specializations : [],
      };

      mergedByKey.set(key, existing
        ? {
            ...normalizedUser,
            ...existing,
            id: existing.id ?? normalizedUser.id,
            userId: normalizedUser.userId,
            name: existing.name || normalizedUser.name,
            specialty: existing.specialty || normalizedUser.specialty,
            rating: existing.rating ?? normalizedUser.rating,
            reviews: existing.reviews ?? normalizedUser.reviews,
            lat: existing.lat ?? normalizedUser.lat,
            lng: existing.lng ?? normalizedUser.lng,
            location: existing.location || normalizedUser.location,
            phone: existing.phone ?? normalizedUser.phone,
            email: existing.email ?? normalizedUser.email,
            experienceYears: existing.experienceYears ?? normalizedUser.experienceYears,
            verified: existing.verified ?? normalizedUser.verified,
            specializations: Array.isArray(existing.specializations) && existing.specializations.length > 0
              ? existing.specializations
              : normalizedUser.specializations,
          }
        : normalizedUser);
    });

    rows = Array.from(mergedByKey.values());

    const userLat = lat !== undefined ? parseFloat(lat) : null;
    const userLng = lng !== undefined ? parseFloat(lng) : null;
    const hasUserLocation = Number.isFinite(userLat) && Number.isFinite(userLng);

    rows = rows.map((b) => ({
      ...b,
      specializations: Array.isArray(b.specializations) ? b.specializations : [],
      distanceKm: hasUserLocation && b.lat != null && b.lng != null
        ? Math.round(haversineKm(userLat, userLng, b.lat, b.lng) * 10) / 10
        : b.distanceKm,
    }));

    const q = search.toLowerCase();
    if (q) {
      rows = rows.filter((b) => {
        const name = (b.name || "").toLowerCase();
        const specialty = (b.specialty || "").toLowerCase();
        const specials = (b.specializations || []).filter(Boolean).map((s) => String(s).toLowerCase());
        return name.includes(q) || specialty.includes(q) || specials.some((s) => s.includes(q));
      });
    }
    if (specialty !== "all") {
      rows = rows.filter((b) => b.specialty === specialty);
    }
    rows = [...rows].sort((a, b) => {
      if (sort === "rating") return b.rating - a.rating;
      if (sort === "reviews") return b.reviews - a.reviews;
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });

    res.json({ botanists: rows, usedRealLocation: hasUserLocation });
  } catch (err) {
    res.status(500).json({ error: err.message || "Could not load botanists." });
  }
});

// PUT /api/botanists/me — a logged-in botanist completes/updates their own
// public profile (specialty, specializations, bio, experience, location).
// This updates their `users` row (the source of truth for login/auth) AND
// syncs a matching row into `botanists` (what the Nearby Botanists listing
// actually reads from).
router.put("/me", requireAuth, async (req, res) => {
  try {
    const user = await db.users.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found." });
    if (user.role !== "botanist") {
      return res.status(403).json({ error: "Only botanist accounts can update a botanist profile." });
    }

    const { specialty, specializations, bio, experienceYears, phone, location, lat, lng } = req.body;
    const fields = {};
    if (specialty !== undefined) fields.specialty = specialty;
    if (specializations !== undefined) fields.specializations = specializations;
    if (bio !== undefined) fields.bio = bio;
    if (experienceYears !== undefined) fields.experienceYears = Number(experienceYears) || 0;
    if (phone !== undefined) fields.phone = phone;
    if (location !== undefined) fields.location = location;
    if (lat !== undefined) fields.lat = lat;
    if (lng !== undefined) fields.lng = lng;

    const merged = { ...user, ...fields };
    fields.profileComplete = Boolean(merged.specialty && merged.location && merged.lat != null && merged.lng != null);

    const saved = await db.users.update(req.userId, fields);

    // Only put them in the public Nearby Botanists listing once their
    // profile is actually complete, same rule as before.
    if (saved.profileComplete) {
      await db.botanists.upsertForUser(saved);
    }

    const { passwordHash, ...publicUser } = saved;
    res.json({ user: publicUser });
  } catch (err) {
    res.status(500).json({ error: err.message || "Could not update botanist profile." });
  }
});

module.exports = router;