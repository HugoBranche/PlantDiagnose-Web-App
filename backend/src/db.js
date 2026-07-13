// db.js — a tiny embedded JSON-file database. No native bindings, no
// separate database server: just one file on disk (data/plantdiagnose.json).
// Fine for a small student project's read/write volume; swap in a real
// database later if this ever needs to handle serious concurrent load.

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "plantdiagnose.json");

fs.mkdirSync(DATA_DIR, { recursive: true });

// lat/lng are the botanist's real position, used to calculate live distance
// from the user via the haversine formula. distanceKm is only a fallback for
// when the browser has no geolocation permission.
const SEED_BOTANISTS = [
  { id: 1, name: "Dr. Sarah Johnson", specialty: "Plant Pathology", rating: 4.8, reviews: 127, distanceKm: 2.3, lat: -1.2833, lng: 36.8172, location: "Green Valley Nursery, Main St", phone: "+1 (555) 123-4567", email: "sarah.j@botanist.com", experienceYears: 15, verified: true, specializations: ["Fungal Diseases", "Vegetable Crops", "Organic Solutions"] },
  { id: 2, name: "Prof. Michael Chen", specialty: "Agricultural Science", rating: 4.9, reviews: 203, distanceKm: 3.7, lat: -1.2921, lng: 36.7900, location: "Urban Farm Center, Oak Ave", phone: "+1 (555) 234-5678", email: "m.chen@agri.edu", experienceYears: 20, verified: true, specializations: ["Crop Management", "Pest Control", "Soil Health"] },
  { id: 3, name: "Dr. Emma Williams", specialty: "Horticulture", rating: 4.7, reviews: 89, distanceKm: 5.1, lat: -1.2667, lng: 36.8062, location: "Botanical Gardens, Park Rd", phone: "+1 (555) 345-6789", email: "emma.w@gardens.org", experienceYears: 12, verified: true, specializations: ["Ornamental Plants", "Rose Care", "Garden Design"] },
  { id: 4, name: "James Rodriguez", specialty: "Plant Nutrition", rating: 4.6, reviews: 64, distanceKm: 6.8, lat: -1.3197, lng: 36.8517, location: "Green Thumb Consultancy", phone: "+1 (555) 456-7890", email: "j.rodriguez@greenthumbs.com", experienceYears: 10, verified: false, specializations: ["Nutrient Management", "Hydroponic Systems", "Plant Health"] },
  { id: 5, name: "Dr. Lisa Anderson", specialty: "Plant Pathology", rating: 4.9, reviews: 156, distanceKm: 7.2, lat: -1.2205, lng: 36.8862, location: "AgriTech Research Institute", phone: "+1 (555) 567-8901", email: "l.anderson@agritech.org", experienceYears: 18, verified: true, specializations: ["Disease Diagnosis", "Bacterial Infections", "Research"] },
  { id: 6, name: "David Kumar", specialty: "Organic Farming", rating: 4.5, reviews: 72, distanceKm: 8.9, lat: -1.3733, lng: 36.8567, location: "Organic Solutions Farm", phone: "+1 (555) 678-9012", email: "d.kumar@organic.farm", experienceYears: 14, verified: false, specializations: ["Organic Pest Control", "Composting", "Sustainable Farming"] },
];

function defaultData() {
  return {
    nextUserId: 1,
    nextDiagnosisId: 1,
    users: [],
    diagnoses: [],
    botanists: SEED_BOTANISTS,
  };
}

function load() {
  if (!fs.existsSync(DATA_FILE)) {
    const initial = defaultData();
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  const data = JSON.parse(raw);

  // Migration: older data files were saved before botanists had lat/lng.
  // Patch them in from the seed so distance calculation works without
  // wiping any existing users/diagnoses.
  let changed = false;
  data.botanists = (data.botanists || []).map((b) => {
    if (b.lat === undefined || b.lng === undefined) {
      const seed = SEED_BOTANISTS.find((s) => s.id === b.id);
      if (seed) {
        changed = true;
        return { ...b, lat: seed.lat, lng: seed.lng };
      }
    }
    return b;
  });
  if (changed) fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

  return data;
}

let state = load();

function save() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
const users = {
  findByEmail(email) {
    return state.users.find((u) => u.email === email.toLowerCase()) || null;
  },
  findById(id) {
    return state.users.find((u) => u.id === Number(id)) || null;
  },
  // Real registered botanists who have finished setting up their profile
  // (specialty + location). Used to populate the Nearby Botanists page
  // alongside the seeded demo entries.
  allBotanists() {
    return state.users.filter((u) => u.role === "botanist" && u.profileComplete);
  },
  create({ name, email, passwordHash, role = "user" }) {
    const isBotanist = role === "botanist";
    const user = {
      id: state.nextUserId++,
      name,
      email: email.toLowerCase(),
      passwordHash,
      role, // "user" | "botanist"
      phone: "",
      location: "",
      bio: "",
      settings: {
        emailNotifications: true,
        pushNotifications: true,
        weeklyReports: false,
        marketingEmails: false,
        language: "en",
        theme: "light",
        units: "imperial",
      },
      // Botanist-only fields. Left blank for regular users.
      ...(isBotanist
        ? {
            specialty: "",
            specializations: [],
            experienceYears: 0,
            lat: null,
            lng: null,
            verified: true, // auto-verified for now, no admin approval step yet
            rating: 4.5, // placeholder so a brand-new profile isn't shown with 0 stars
            reviews: 0,
            profileComplete: false, // true once specialty + location are filled in
          }
        : {}),
      createdAt: new Date().toISOString(),
    };
    state.users.push(user);
    save();
    return user;
  },
  update(id, fields) {
    const user = users.findById(id);
    if (!user) return null;
    const { settings, ...rest } = fields;
    Object.assign(user, rest);
    if (settings) {
      user.settings = { ...user.settings, ...settings };
    }
    save();
    return user;
  },
};

// ---------------------------------------------------------------------------
// Diagnoses
// ---------------------------------------------------------------------------
const diagnoses = {
  create({ userId, imagePath, plant, condition, status, confidence, severity }) {
    const diagnosis = {
      id: state.nextDiagnosisId++,
      userId,
      imagePath,
      plant,
      condition,
      status,
      confidence,
      severity,
      workflowStatus: "In Progress",
      createdAt: new Date().toISOString(),
    };
    state.diagnoses.push(diagnosis);
    save();
    return diagnosis;
  },
  findByUser(userId) {
    return state.diagnoses
      .filter((d) => d.userId === Number(userId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },
  findById(id, userId) {
    return state.diagnoses.find((d) => d.id === Number(id) && d.userId === Number(userId)) || null;
  },
  update(id, fields) {
    const diagnosis = state.diagnoses.find((d) => d.id === Number(id));
    if (!diagnosis) return null;
    Object.assign(diagnosis, fields);
    save();
    return diagnosis;
  },
  delete(id) {
    const idx = state.diagnoses.findIndex((d) => d.id === Number(id));
    if (idx === -1) return null;
    const [removed] = state.diagnoses.splice(idx, 1);
    save();
    return removed;
  },
};

// ---------------------------------------------------------------------------
// Botanists (read-only, seeded once)
// ---------------------------------------------------------------------------
const botanists = {
  all() {
    return state.botanists;
  },
};

module.exports = { users, diagnoses, botanists };
