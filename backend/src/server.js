require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth");
const diagnosesRoutes = require("./routes/diagnoses");
const botanistsRoutes = require("./routes/botanists");
const dashboardRoutes = require("./routes/dashboard");
const recommendationsRoutes = require("./routes/recommendations");

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);
app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
  })
);
app.use(express.json({ limit: "1mb" }));

// Serve uploaded diagnosis images statically, e.g. /uploads/3-172839.jpg
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/diagnoses", diagnosesRoutes);
app.use("/api/botanists", botanistsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/recommendations", recommendationsRoutes);

// Fallback error handler (e.g. multer file-type/size errors)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Something went wrong." });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`PlantDiagnose backend running on http://localhost:${PORT}`);
});
