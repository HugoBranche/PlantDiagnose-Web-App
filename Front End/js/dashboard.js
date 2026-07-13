/* ==========================================================================
   Dashboard page — pulls together data from several endpoints:
   GET /api/dashboard/stats, GET /api/diagnoses, GET /api/recommendations,
   GET /api/botanists.
   ========================================================================== */

function severityBadgeClass(sev) {
  switch ((sev || "").toLowerCase()) {
    case "mild": return "badge-green";
    case "moderate": return "badge-orange";
    case "severe": return "badge-red";
    default: return "badge-gray";
  }
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

async function loadDashboard() {
  try {
    const [stats, diagnosesRes, recsRes, botanistsRes] = await Promise.all([
      apiFetch("/api/dashboard/stats"),
      apiFetch("/api/diagnoses"),
      apiFetch("/api/recommendations"),
      apiFetch("/api/botanists"),
    ]);

    renderStats(stats);
    renderRecentDiagnoses(diagnosesRes.diagnoses.slice(0, 3));
    renderDiseaseDistribution(stats.topDiseases);
    renderRecommendedActions(recsRes.actionItems.slice(0, 3));
    renderNearbyExperts(botanistsRes.botanists.slice(0, 3));
  } catch (err) {
    console.error("Failed to load dashboard:", err.message);
  }
}

function renderStats(stats) {
  document.getElementById("statTotalValue").textContent = stats.totalDiagnoses;
  document.getElementById("statTotalSub").textContent =
    stats.totalDiagnoses > 0 ? "All time" : "No data yet";

  document.getElementById("statHealthyValue").textContent = stats.healthyPlants;
  document.getElementById("statHealthySub").textContent =
    stats.healthyPlants > 0 ? "Looking good" : "No data yet";

  document.getElementById("statDiseasedValue").textContent = stats.diseasedPlants;
  document.getElementById("statDiseasedSub").textContent =
    stats.diseaseDetectionRate != null ? `${stats.diseaseDetectionRate}% detection rate` : "No data yet";

  document.getElementById("statExpertsValue").textContent = stats.nearbyExperts;
  document.getElementById("statExpertsSub").textContent =
    stats.nearbyExperts > 0 ? "Available now" : "No data yet";
}

function renderRecentDiagnoses(diagnoses) {
  const wrap = document.getElementById("recentDiagnosesWrap");
  if (diagnoses.length === 0) return; // keep the default empty state

  wrap.innerHTML = diagnoses
    .map(
      (d) => `
      <div class="flex items-center gap-3" style="padding:.6rem 0;border-bottom:1px solid var(--border)">
        <img src="${API_BASE_URL}${d.imageUrl}" alt="${d.plant}" style="width:3rem;height:3rem;border-radius:var(--radius-sm);object-fit:cover">
        <div style="flex:1">
          <p class="font-medium text-sm">${d.plant}</p>
          <p class="text-xs text-muted">${d.condition} · ${timeAgo(d.createdAt)}</p>
        </div>
        <span class="badge ${d.status === "Healthy" ? "badge-green" : "badge-orange"}">${d.status}</span>
      </div>
    `
    )
    .join("");
}

function renderDiseaseDistribution(topDiseases) {
  const wrap = document.getElementById("diseaseDistWrap");
  if (!topDiseases || topDiseases.length === 0) return;

  const max = Math.max(...topDiseases.map((d) => d.count));
  wrap.innerHTML = topDiseases
    .map(
      (d) => `
      <div style="margin-bottom:.75rem">
        <div class="flex justify-between text-sm mb-1"><span>${d.condition}</span><span class="text-muted">${d.count}</span></div>
        <div class="progress"><span style="width:${(d.count / max) * 100}%"></span></div>
      </div>
    `
    )
    .join("");
}

function renderRecommendedActions(actionItems) {
  const wrap = document.getElementById("recommendedActionsWrap");
  if (actionItems.length === 0) return;

  wrap.innerHTML = actionItems
    .map(
      (a) => `
      <div class="flex items-center justify-between" style="padding:.6rem 0;border-bottom:1px solid var(--border)">
        <p class="text-sm font-medium">${a.title}</p>
        <span class="badge ${severityBadgeClass(a.severity)}">${a.severity || "—"}</span>
      </div>
    `
    )
    .join("");
}

function renderNearbyExperts(botanists) {
  const wrap = document.getElementById("nearbyExpertsWrap");
  if (botanists.length === 0) return;

  wrap.innerHTML = botanists
    .map(
      (b) => `
      <div class="flex items-center gap-3" style="padding:.6rem 0;border-bottom:1px solid var(--border)">
        <span class="avatar">${b.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}</span>
        <div style="flex:1">
          <p class="font-medium text-sm">${b.name}</p>
          <p class="text-xs text-muted">${b.specialty} · ${b.distanceKm} km</p>
        </div>
      </div>
    `
    )
    .join("");
}

document.addEventListener("DOMContentLoaded", loadDashboard);
