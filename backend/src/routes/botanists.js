const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

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

// Turns a real registered botanist user account into the same shape as the
// seeded demo botanists, so the frontend doesn't need to know the difference.
function toBotanistCard(user) {
  return {
    id: `u-${user.id}`,
    name: user.name,
    specialty: user.specialty,
    rating: user.rating,
    reviews: user.reviews,
    distanceKm: null, // filled in below once we know if we have the user's location
    lat: user.lat,
    lng: user.lng,
    location: user.location,
    phone: user.phone,
    email: user.email,
    experienceYears: user.experienceYears,
    verified: user.verified,
    specializations: user.specializations,
  };
}

// GET /api/botanists?search=&specialty=&sort=distance|rating|reviews&lat=&lng=
router.get("/", (req, res) => {
  const { search = "", specialty = "all", sort = "distance", lat, lng } = req.query;

  let rows = [...db.botanists.all(), ...db.users.allBotanists().map(toBotanistCard)];

  const userLat = lat !== undefined ? parseFloat(lat) : null;
  const userLng = lng !== undefined ? parseFloat(lng) : null;
  const hasUserLocation = Number.isFinite(userLat) && Number.isFinite(userLng);

  // If the browser gave us the user's real position, compute a real
  // distance for every botanist. Otherwise fall back to the seeded
  // placeholder distanceKm (real botanists with no fallback just show "—").
  rows = rows.map((b) => ({
    ...b,
    distanceKm: hasUserLocation && b.lat != null && b.lng != null
      ? Math.round(haversineKm(userLat, userLng, b.lat, b.lng) * 10) / 10
      : b.distanceKm,
  }));

  const q = search.toLowerCase();
  if (q) {
    rows = rows.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.specialty.toLowerCase().includes(q) ||
        b.specializations.some((s) => s.toLowerCase().includes(q))
    );
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
});

// PUT /api/botanists/me — a logged-in botanist completes/updates their own
// public profile (specialty, specializations, bio, experience, location).
router.put("/me", requireAuth, (req, res) => {
  const user = db.users.findById(req.userId);
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

  const updated = { ...user, ...fields };
  fields.profileComplete = Boolean(updated.specialty && updated.location && updated.lat != null && updated.lng != null);

  const saved = db.users.update(req.userId, fields);
  const { passwordHash, ...publicUser } = saved;
  res.json({ user: publicUser });
});

module.exports = router;
