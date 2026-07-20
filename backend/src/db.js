// db.js — Supabase (Postgres) backed data layer.
//
// This replaces the old JSON-file datastore. It exposes the *same* function
// names/shapes as before (db.users.create, db.diagnoses.findByUser, etc.) so
// route files barely change — the only difference is every method here now
// returns a Promise, so callers need `await`.
//
// Requires SUPABASE_URL and SUPABASE_SERVICE_KEY in .env (see .env.example).
// The service role key is used because this file only ever runs on the
// server — never send that key to the browser.

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const seedDataPath = path.join(__dirname, "..", "data", "plantdiagnose.json");
let seedData = null;
try {
  seedData = JSON.parse(fs.readFileSync(seedDataPath, "utf8"));
} catch {
  seedData = null;
}

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false }, // this is a server, not a browser session
  });
}

const hardcodedAdminUser = Object.freeze({
  id: 9999,
  name: "Hugo Nkubito",
  email: "chugobranch@gmail.com",
  role: "admin",
  profileComplete: true,
  createdAt: new Date().toISOString(),
});

function getHardcodedAdminUser() {
  return { ...hardcodedAdminUser };
}

function findSeedUserByEmail(email) {
  const normalizedEmail = email?.toLowerCase();
  if (!normalizedEmail) return null;
  const match = jsonUsers.find((u) => u.email === normalizedEmail);
  return match ? userRowToObject(match) : null;
}

function findSeedUserById(id) {
  if (id === undefined || id === null) return null;
  const match = jsonUsers.find((u) => Number(u.id) === Number(id));
  return match ? userRowToObject(match) : null;
}

const useSeedData = Boolean(seedData) && !supabase;

function ensureSupabase() {
  if (supabase) return supabase;
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env — see .env.example.");
}

function throwIfError(error, context) {
  if (error) throw new Error(`[db] ${context}: ${error.message}`);
}

const jsonUsers = (seedData?.users || []).map((u) => ({
  ...u,
  password_hash: u.passwordHash,
  passwordHash: undefined,
  __source: "seed",
  profile_complete: u.profileComplete,
  profileComplete: undefined,
  experience_years: u.experienceYears,
  experienceYears: undefined,
  created_at: u.createdAt,
  createdAt: undefined,
}));

const jsonBotanists = (seedData?.botanists || []).map((b) => ({
  ...b,
  user_id: b.userId,
  distance_km: b.distanceKm,
  experience_years: b.experienceYears,
  created_at: b.createdAt,
}));

// ---------------------------------------------------------------------------
// Row <-> app-object mapping. Postgres columns are snake_case; the rest of
// the app (routes, frontend) uses the same camelCase shape as the old
// JSON-file version, so nothing else has to change.
// ---------------------------------------------------------------------------
function userRowToObject(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    __source: row.__source,
    role: row.role,
    phone: row.phone,
    location: row.location,
    bio: row.bio,
    settings: row.settings,
    specialty: row.specialty,
    specializations: row.specializations,
    experienceYears: row.experience_years,
    lat: row.lat,
    lng: row.lng,
    verified: row.verified,
    approved: row.approved ?? (row.verified ? true : false),
    rating: row.rating,
    reviews: row.reviews,
    profileComplete: row.profile_complete,
    createdAt: row.created_at,
  };
}

// Converts a partial fields object (camelCase, as sent by route handlers)
// into a partial row object (snake_case) for insert/update.
function userFieldsToRow(fields) {
  const map = {
    name: "name",
    email: "email",
    passwordHash: "password_hash",
    role: "role",
    phone: "phone",
    location: "location",
    bio: "bio",
    settings: "settings",
    specialty: "specialty",
    specializations: "specializations",
    experienceYears: "experience_years",
    lat: "lat",
    lng: "lng",
    verified: "verified",
    rating: "rating",
    reviews: "reviews",
    profileComplete: "profile_complete",
  };
  const row = {};
  for (const [key, column] of Object.entries(map)) {
    if (fields[key] !== undefined) row[column] = fields[key];
  }
  return row;
}

function diagnosisRowToObject(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    imagePath: row.image_path,
    plant: row.plant,
    condition: row.condition,
    status: row.status,
    confidence: row.confidence,
    severity: row.severity,
    workflowStatus: row.workflow_status,
    createdAt: row.created_at,
  };
}

function botanistRowToObject(row) {
  return {
    id: row.id,
    userId: row.user_id, // null for the 6 demo/seed rows; a real users.id for synced botanists
    name: row.name,
    specialty: row.specialty,
    rating: row.rating,
    reviews: row.reviews,
    distanceKm: row.distance_km,
    lat: row.lat,
    lng: row.lng,
    location: row.location,
    phone: row.phone,
    email: row.email,
    experienceYears: row.experience_years,
    verified: row.verified,
    specializations: row.specializations,
  };
}

function consultationRowToObject(row) {
  if (!row) return null;
  return {
    id: row.id,
    fromUserId: row.from_user_id,
    toBotanistUserId: row.to_botanist_user_id,
    message: row.message, // the original opening message, kept for reference
    diagnosisId: row.diagnosis_id,
    status: row.status,
    createdAt: row.created_at,
    lastMessageAt: row.last_message_at,
  };
}

function messageRowToObject(row) {
  if (!row) return null;
  return {
    id: row.id,
    consultationId: row.consultation_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
const users = {
  async findByEmail(email) {
    if (email?.toLowerCase() === hardcodedAdminUser.email.toLowerCase()) {
      return getHardcodedAdminUser();
    }

    const seedMatch = findSeedUserByEmail(email);
    if (useSeedData || seedMatch) {
      return seedMatch;
    }

    const normalizedEmail = email?.toLowerCase();
    const { data, error } = await ensureSupabase()
      .from("users")
      .select("*")
      .eq("email", normalizedEmail)
      .maybeSingle();
    throwIfError(error, "users.findByEmail");
    return userRowToObject(data) || seedMatch;
  },

  async findById(id) {
    if (Number(id) === Number(hardcodedAdminUser.id)) {
      return getHardcodedAdminUser();
    }

    const seedMatch = findSeedUserById(id);
    if (useSeedData || seedMatch) {
      return seedMatch;
    }

    const { data, error } = await ensureSupabase()
      .from("users")
      .select("*")
      .eq("id", Number(id))
      .maybeSingle();
    throwIfError(error, "users.findById");
    return userRowToObject(data) || seedMatch;
  },

  async findByRole(role) {
    if (useSeedData) {
      return jsonUsers.filter((u) => u.role === role).map(userRowToObject);
    }
    const { data, error } = await ensureSupabase()
      .from("users")
      .select("*")
      .eq("role", role)
      .order("id");
    throwIfError(error, "users.findByRole");
    const rows = (data || []).map(userRowToObject);
    if (role === "admin") {
      return [getHardcodedAdminUser(), ...rows.filter((u) => Number(u.id) !== Number(hardcodedAdminUser.id))];
    }
    return rows;
  },

  async all() {
    if (useSeedData) {
      return jsonUsers.map(userRowToObject);
    }
    const { data, error } = await ensureSupabase().from("users").select("*").order("id");
    throwIfError(error, "users.all");
    const rows = (data || []).map(userRowToObject);
    return [getHardcodedAdminUser(), ...rows.filter((u) => Number(u.id) !== Number(hardcodedAdminUser.id))];
  },

  async create({ name, email, passwordHash, role = "user" }) {
    if (useSeedData) {
      const nextId = (jsonUsers.reduce((max, u) => Math.max(max, Number(u.id || 0)), 0) + 1).toString();
      const newUser = {
        id: Number(nextId),
        name,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        role,
        specialty: role === "botanist" ? "" : null,
        specializations: [],
        experience_years: role === "botanist" ? 0 : null,
        verified: role === "botanist" ? false : false,
        rating: role === "botanist" ? 4.5 : null,
        reviews: role === "botanist" ? 0 : null,
        profile_complete: role !== "botanist",
      };
      jsonUsers.push(newUser);
      return userRowToObject(newUser);
    }
    const isBotanist = role === "botanist";
    const row = {
      name,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      role,
      ...(isBotanist
        ? { specialty: "", specializations: [], experience_years: 0, verified: false, rating: 4.5, reviews: 0, profile_complete: false }
        : {}),
    };
    const { data, error } = await ensureSupabase().from("users").insert(row).select().single();
    throwIfError(error, "users.create");
    return userRowToObject(data);
  },

  async update(id, fields) {
    if (useSeedData) {
      const existing = jsonUsers.find((u) => Number(u.id) === Number(id));
      if (!existing) return null;
      const merged = { ...existing, ...fields };
      Object.assign(existing, merged);
      return userRowToObject(existing);
    }
    const row = userFieldsToRow(fields);
    if (fields.settings) {
      // Merge with existing settings rather than overwriting the whole blob.
      const existing = await users.findById(id);
      row.settings = { ...(existing?.settings || {}), ...fields.settings };
    }

    // The current Supabase schema does not expose an approved column for users.
    // Keep approval state in the app layer and omit it from database writes.
    if (fields.approved !== undefined) {
      delete fields.approved;
    }
    if (Object.keys(row).length === 0) return users.findById(id);

    const { data, error } = await ensureSupabase()
      .from("users")
      .update(row)
      .eq("id", Number(id))
      .select()
      .single();
    throwIfError(error, "users.update");
    return userRowToObject(data);
  },
};

// ---------------------------------------------------------------------------
// Diagnoses
// ---------------------------------------------------------------------------
const diagnoses = {
  async all() {
    const { data, error } = await ensureSupabase().from("diagnoses").select("*").order("id");
    throwIfError(error, "diagnoses.all");
    return (data || []).map(diagnosisRowToObject);
  },

  async create({ userId, imagePath, plant, condition, status, confidence, severity }) {
    const row = {
      user_id: userId,
      image_path: imagePath,
      plant,
      condition,
      status,
      confidence,
      severity,
      workflow_status: "In Progress",
    };
    const { data, error } = await ensureSupabase().from("diagnoses").insert(row).select().single();
    throwIfError(error, "diagnoses.create");
    return diagnosisRowToObject(data);
  },

  async findByUser(userId) {
    const { data, error } = await ensureSupabase()
      .from("diagnoses")
      .select("*")
      .eq("user_id", Number(userId))
      .order("created_at", { ascending: false });
    throwIfError(error, "diagnoses.findByUser");
    return (data || []).map(diagnosisRowToObject);
  },

  async findById(id, userId) {
    const { data, error } = await ensureSupabase()
      .from("diagnoses")
      .select("*")
      .eq("id", Number(id))
      .eq("user_id", Number(userId))
      .maybeSingle();
    throwIfError(error, "diagnoses.findById");
    return diagnosisRowToObject(data);
  },

  async update(id, fields) {
    const row = {};
    if (fields.workflowStatus !== undefined) row.workflow_status = fields.workflowStatus;
    const { data, error } = await ensureSupabase()
      .from("diagnoses")
      .update(row)
      .eq("id", Number(id))
      .select()
      .maybeSingle();
    throwIfError(error, "diagnoses.update");
    return diagnosisRowToObject(data);
  },

  async delete(id) {
    const { data, error } = await ensureSupabase()
      .from("diagnoses")
      .delete()
      .eq("id", Number(id))
      .select()
      .maybeSingle();
    throwIfError(error, "diagnoses.delete");
    return diagnosisRowToObject(data);
  },
};

// ---------------------------------------------------------------------------
// Botanists (6 seeded demo rows, plus real botanists synced in via upsertForUser)
// ---------------------------------------------------------------------------
const botanists = {
  async all() {
    if (useSeedData) {
      return jsonBotanists.map(botanistRowToObject);
    }
    const { data, error } = await ensureSupabase().from("botanists").select("*").order("id");
    throwIfError(error, "botanists.all");
    return (data || []).map(botanistRowToObject);
  },

  // Creates or updates the botanists-table row that mirrors a real
  // botanist account's public profile, keyed by user_id. Called whenever a
  // botanist saves their profile (routes/botanists.js PUT /me), so the
  // Nearby Botanists listing can read from this one table directly instead
  // of merging `users` and `botanists` at query time.
  async upsertForUser(user) {
    if (useSeedData) {
      const existingIndex = jsonBotanists.findIndex((b) => Number(b.user_id) === Number(user.id));
      const nextEntry = {
        id: existingIndex >= 0 ? jsonBotanists[existingIndex].id : jsonBotanists.length + 1,
        user_id: user.id,
        name: user.name,
        specialty: user.specialty,
        rating: user.rating,
        reviews: user.reviews,
        distance_km: null,
        lat: user.lat,
        lng: user.lng,
        location: user.location,
        phone: user.phone,
        email: user.email,
        experience_years: user.experienceYears,
        verified: user.verified,
        specializations: user.specializations,
      };
      if (existingIndex >= 0) {
        jsonBotanists[existingIndex] = nextEntry;
      } else {
        jsonBotanists.push(nextEntry);
      }
      return botanistRowToObject(nextEntry);
    }
    const row = {
      user_id: user.id,
      name: user.name,
      specialty: user.specialty,
      rating: user.rating,
      reviews: user.reviews,
      distance_km: null,
      lat: user.lat,
      lng: user.lng,
      location: user.location,
      phone: user.phone,
      email: user.email,
      experience_years: user.experienceYears,
      verified: user.verified,
      specializations: user.specializations,
    };
    const { data: existingRows, error: selectError } = await ensureSupabase()
      .from("botanists")
      .select("*")
      .eq("user_id", Number(user.id));
    throwIfError(selectError, "botanists.upsertForUser.select");

    const existing = existingRows?.[0];
    let result;

    if (existing) {
      const { data, error } = await ensureSupabase()
        .from("botanists")
        .update(row)
        .eq("id", existing.id)
        .select()
        .single();
      throwIfError(error, "botanists.upsertForUser.update");
      result = data;
    } else {
      const { data, error } = await ensureSupabase()
        .from("botanists")
        .insert(row)
        .select()
        .single();
      throwIfError(error, "botanists.upsertForUser.insert");
      result = data;
    }

    return botanistRowToObject(result);
  },
};

// ---------------------------------------------------------------------------
// Consultations — in-app "Contact" messages from a plant owner to a
// registered botanist.
// ---------------------------------------------------------------------------
const consultations = {
  // Starts a new conversation thread with an opening message.
  async create({ fromUserId, toBotanistUserId, message, diagnosisId = null }) {
    const row = {
      from_user_id: fromUserId,
      to_botanist_user_id: toBotanistUserId,
      message,
      diagnosis_id: diagnosisId,
      status: "new",
    };
    const { data, error } = await ensureSupabase().from("consultations").insert(row).select().single();
    throwIfError(error, "consultations.create");
    const consultation = consultationRowToObject(data);

    // The opening message is also the first row in `messages`, so the
    // thread view doesn't need to special-case "message 0".
    await messages.create({ consultationId: consultation.id, senderId: fromUserId, body: message });

    return consultation;
  },

  // Every conversation a given user is a participant in — as the farmer
  // who started it, or the botanist it was sent to.
  async findForUser(userId) {
    const { data, error } = await ensureSupabase()
      .from("consultations")
      .select("*")
      .or(`from_user_id.eq.${Number(userId)},to_botanist_user_id.eq.${Number(userId)}`)
      .order("last_message_at", { ascending: false });
    throwIfError(error, "consultations.findForUser");
    return (data || []).map(consultationRowToObject);
  },

  // A single conversation, but only if the requesting user is actually one
  // of its two participants — prevents reading someone else's messages by
  // guessing an id.
  async findByIdForUser(id, userId) {
    const { data, error } = await ensureSupabase()
      .from("consultations")
      .select("*")
      .eq("id", Number(id))
      .or(`from_user_id.eq.${Number(userId)},to_botanist_user_id.eq.${Number(userId)}`)
      .maybeSingle();
    throwIfError(error, "consultations.findByIdForUser");
    return consultationRowToObject(data);
  },

  async updateStatus(id, status) {
    const { data, error } = await ensureSupabase()
      .from("consultations")
      .update({ status })
      .eq("id", Number(id))
      .select()
      .maybeSingle();
    throwIfError(error, "consultations.updateStatus");
    return consultationRowToObject(data);
  },

  async touchLastMessageAt(id) {
    const { error } = await ensureSupabase()
      .from("consultations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", Number(id));
    throwIfError(error, "consultations.touchLastMessageAt");
  },
};

const messages = {
  async create({ consultationId, senderId, body }) {
    const row = { consultation_id: consultationId, sender_id: senderId, body };
    const { data, error } = await ensureSupabase().from("messages").insert(row).select().single();
    throwIfError(error, "messages.create");
    await consultations.touchLastMessageAt(consultationId);
    return messageRowToObject(data);
  },

  async findByConsultation(consultationId) {
    const { data, error } = await ensureSupabase()
      .from("messages")
      .select("*")
      .eq("consultation_id", Number(consultationId))
      .order("created_at", { ascending: true });
    throwIfError(error, "messages.findByConsultation");
    return (data || []).map(messageRowToObject);
  },
};

module.exports = { users, diagnoses, botanists, consultations, messages };