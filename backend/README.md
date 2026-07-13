# PlantDiagnose Backend

A small Node.js + Express API for the PlantDiagnose app. Handles user
accounts, diagnosis history, the botanists directory, and settings. It
proxies image uploads to your existing ML model on Hugging Face Spaces
(`hugobranche-plantdiagnose-api.hf.space`) so the frontend never needs to
know that URL.

No database server and no native compiled modules are required — data is
stored in one JSON file (`data/plantdiagnose.json`) and uploaded images are
stored as plain files (`uploads/`). That keeps it easy to run locally and
easy to deploy on shared hosting like Hostinger.

## Setup

```bash
cd plantdiagnose-backend
npm install
cp .env.example .env
# edit .env: set JWT_SECRET to a long random string,
# and CORS_ORIGIN to wherever your frontend is served from
npm start
```

The server runs on `http://localhost:4000` by default (change `PORT` in `.env`).

For local development with auto-restart on file changes:
```bash
npm run dev
```

## Project structure

```
plantdiagnose-backend/
├── package.json
├── .env.example        → copy to .env and fill in real values
├── data/
│   └── plantdiagnose.json   → created automatically on first run
├── uploads/             → uploaded diagnosis images, served at /uploads/<file>
└── src/
    ├── server.js         → Express app entry point
    ├── db.js             → JSON file datastore (users, diagnoses, botanists)
    ├── middleware/
    │   └── auth.js        → verifies the JWT Bearer token on protected routes
    ├── routes/
    │   ├── auth.js          → register, login, profile, password
    │   ├── diagnoses.js     → upload image → call model → save/list/update/delete
    │   ├── botanists.js     → search/filter/sort the botanists directory
    │   ├── dashboard.js     → stats for the Dashboard + Reports pages
    │   └── recommendations.js → action items + seasonal tips
    └── utils/
        └── hfClient.js     → calls your Hugging Face Gradio model
```

## Authentication

Every protected route expects:
```
Authorization: Bearer <token>
```
Get a token from `POST /api/auth/register` or `POST /api/auth/login`. Tokens
last 30 days. On the frontend, store the token (e.g. `localStorage`) and
attach it to every API call.

## API Reference

### Auth

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| POST | `/api/auth/register` | – | `{ name, email, password }` | Returns `{ token, user }` |
| POST | `/api/auth/login` | – | `{ email, password }` | Returns `{ token, user }` |
| GET | `/api/auth/me` | ✓ | – | Returns `{ user }` |
| PUT | `/api/auth/me` | ✓ | `{ name?, phone?, location?, bio?, settings? }` | `settings` is a partial object: `emailNotifications, pushNotifications, weeklyReports, marketingEmails, language, theme, units` |
| PUT | `/api/auth/password` | ✓ | `{ currentPassword, newPassword }` | |

### Diagnoses

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| POST | `/api/diagnoses` | ✓ | `multipart/form-data`, field `image` | Uploads image, calls the ML model, saves + returns the result |
| GET | `/api/diagnoses` | ✓ | – | List current user's diagnoses, newest first |
| GET | `/api/diagnoses/:id` | ✓ | – | One diagnosis |
| PUT | `/api/diagnoses/:id` | ✓ | `{ workflowStatus }` | One of `In Progress`, `Treated`, `Monitoring` |
| DELETE | `/api/diagnoses/:id` | ✓ | – | Deletes the record and its image file |

A diagnosis object looks like:
```json
{
  "id": 1,
  "imageUrl": "/uploads/1-1730000000000.jpg",
  "plant": "tomato",
  "condition": "Early Blight",
  "status": "Diseased",
  "confidence": 94.2,
  "severity": "Severe",
  "workflowStatus": "In Progress",
  "createdAt": "2026-07-06T10:22:05.812Z"
}
```

### Botanists

| Method | Path | Auth | Query params | Notes |
|---|---|---|---|---|
| GET | `/api/botanists` | – | `search`, `specialty`, `sort` (`distance`\|`rating`\|`reviews`) | Public — no login needed |

### Dashboard

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/dashboard/stats` | ✓ | Total/healthy/diseased counts, avg confidence, top diseases — all computed from the user's real diagnoses |

### Recommendations

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/recommendations` | ✓ | Action items generated from un-treated diagnoses, plus static seasonal tips |

## Wiring up the frontend

The frontend currently talks directly to the Hugging Face model and uses
mock/empty data for history, botanists, and settings. To connect it to this
backend:

1. Add a small `js/api.js` on the frontend with a `BASE_URL` constant
   (e.g. `http://localhost:4000` for local dev) and a `apiFetch(path, options)`
   helper that attaches the stored token.
2. `login.js` → call `POST /api/auth/login` / `register` instead of the
   simulated timeout, store the returned token.
3. `diagnose.js` → send the uploaded file to `POST /api/diagnoses`
   (`multipart/form-data`) instead of calling the Hugging Face URL directly.
4. `history.js`, `botanists.js`, `settings.js`, dashboard stat cards →
   fetch from the matching endpoints above instead of the empty/mock arrays.

Happy to do that integration pass next if you'd like — just say the word.

## Deploying

- Any Node hosting works (the JSON-file storage needs a persistent disk,
  which most Node hosts — including Hostinger's Node.js app feature —
  provide).
- Set real environment variables (`JWT_SECRET`, `CORS_ORIGIN`, `HF_API_URL`)
  in the hosting panel rather than committing `.env`.
- Make sure `uploads/` and `data/` are writable directories on the host.
