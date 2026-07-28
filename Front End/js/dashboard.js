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

function getUserRole() {
  const user = Auth?.getUser?.();
  return (user?.role || "user").toLowerCase();
}

function setDashboardVisibility(role) {
  const farmerStatsGrid = document.getElementById("farmerStatsGrid");
  const farmerTrendCard = document.getElementById("farmerTrendCard");
  const farmerSectionsGrid = document.getElementById("farmerSectionsGrid");
  const roleDashboardContent = document.getElementById("roleDashboardContent");

  if (!farmerStatsGrid || !farmerTrendCard || !farmerSectionsGrid || !roleDashboardContent) return;

  const isFarmer = role === "user" || role === "farmer" || role === "";
  farmerStatsGrid.style.display = isFarmer ? "grid" : "none";
  farmerTrendCard.style.display = isFarmer ? "block" : "none";
  farmerSectionsGrid.style.display = isFarmer ? "grid" : "none";
  roleDashboardContent.style.display = isFarmer ? "none" : "block";
}

async function loadDashboard() {
  try {
    const [stats, diagnosesRes, recsRes, botanistsRes] = await Promise.all([
      apiFetch("/api/dashboard/stats"),
      apiFetch("/api/diagnoses"),
      apiFetch("/api/recommendations"),
      apiFetch("/api/botanists"),
    ]);

    const role = getUserRole();
    setDashboardVisibility(role);

    if (role === "admin") {
      renderAdminDashboard(stats);
    } else if (role === "botanist") {
      renderBotanistDashboard(stats);
    } else {
      renderStats(stats);
      renderDiagnosesTrend(diagnosesRes.diagnoses);
      renderRecentDiagnoses(diagnosesRes.diagnoses.slice(0, 3));
      renderDiseaseDistribution(stats.topDiseases);
      renderRecommendedActions(recsRes.actionItems.slice(0, 3));
      renderNearbyExperts(botanistsRes.botanists.slice(0, 3));
    }
  } catch (err) {
    console.error("Failed to load dashboard:", err.message);
  }
}

function renderAdminDashboard(stats) {
  const wrap = document.getElementById("roleDashboardContent");
  if (!wrap) return;

  const pending = Array.isArray(stats.pendingBotanists) ? stats.pendingBotanists : [];
  wrap.innerHTML = `
    <div class="grid grid-2 mt-4">
      <div class="card stat-card" style="text-decoration:none;color:inherit">
        <div>
          <p class="stat-label">New Farmers This Week</p>
          <p class="stat-value">${stats.newFarmersThisWeek || 0}</p>
          <p class="stat-sub">Fresh registrations</p>
        </div>
        <div class="stat-icon-wrap" style="background:#eff6ff;color:#2563eb"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6"/><path d="M23 11h-6"/></svg></div>
      </div>
      <div class="card stat-card" style="text-decoration:none;color:inherit">
        <div>
          <p class="stat-label">Pending Botanists</p>
          <p class="stat-value">${stats.pendingBotanistsCount || 0}</p>
          <p class="stat-sub">Awaiting review</p>
        </div>
        <div class="stat-icon-wrap" style="background:#fefce8;color:#ca8a04"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3 6 6 .8-4.5 4.4 1.1 6.4L12 17.4 6.4 19.6l1.1-6.4L3 8.8 9 8z"/></svg></div>
      </div>
    </div>

    <div class="card card-shadow mt-4">
      <div class="card-header">
        <div class="flex items-center justify-between">
          <div class="card-title">Admit New Botanists</div>
          <a class="btn btn-outline btn-sm" href="admin.html">Open Admin Panel</a>
        </div>
      </div>
      <div class="card-content">
        ${pending.length === 0 ? '<div class="empty-state"><h3 class="empty-title">No botanists waiting approval</h3><p class="empty-desc">New botanist requests will appear here when they sign up.</p></div>' : pending.map((botanist) => `
          <div class="flex items-center justify-between" style="padding:.7rem 0;border-bottom:1px solid var(--border)">
            <div>
              <p class="font-medium text-sm">${botanist.name || "Unnamed botanist"}</p>
              <p class="text-xs text-muted">${botanist.specialty || "Specialty pending"}</p>
            </div>
            <span class="badge badge-orange">Pending</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderBotanistDashboard(stats) {
  const wrap = document.getElementById("roleDashboardContent");
  if (!wrap) return;

  wrap.innerHTML = `
    <div class="grid grid-2 mt-4">
      <div class="card stat-card" style="text-decoration:none;color:inherit">
        <div>
          <p class="stat-label">Consultations</p>
          <p class="stat-value">${stats.consultationCount || 0}</p>
          <p class="stat-sub">Total conversations</p>
        </div>
        <div class="stat-icon-wrap" style="background:#ecfdf3;color:#16a34a"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
      </div>
      <div class="card stat-card" style="text-decoration:none;color:inherit">
        <div>
          <p class="stat-label">New People</p>
          <p class="stat-value">${stats.newContactsCount || 0}</p>
          <p class="stat-sub">Messaged you recently</p>
        </div>
        <div class="stat-icon-wrap" style="background:#faf5ff;color:#9333ea"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
      </div>
    </div>

    <div class="card card-shadow mt-4">
      <div class="card-header">
        <div class="card-title">Recent Conversations</div>
      </div>
      <div class="card-content">
        ${(stats.recentConsultations || []).length === 0 ? '<div class="empty-state"><h3 class="empty-title">No conversations yet</h3><p class="empty-desc">New farmer messages will appear here as soon as they contact you.</p></div>' : (stats.recentConsultations || []).map((consultation) => `
          <div class="flex items-center justify-between" style="padding:.7rem 0;border-bottom:1px solid var(--border)">
            <div>
              <p class="font-medium text-sm">Conversation #${consultation.id}</p>
              <p class="text-xs text-muted">${consultation.message || "New consultation request"}</p>
            </div>
            <span class="badge badge-green">${consultation.status || "new"}</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
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

function renderDiagnosesTrend(diagnoses) {
  const wrap = document.getElementById("diagnosesTrendWrap");
  if (!diagnoses || diagnoses.length === 0) return;

  const dayLabels = [];
  const counts = [];
  const today = new Date();

  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const key = date.toISOString().split("T")[0];
    const count = diagnoses.filter((d) => d.createdAt && d.createdAt.startsWith(key)).length;
    dayLabels.push(date.toLocaleDateString(undefined, { weekday: "short" }));
    counts.push(count);
  }

  const max = Math.max(1, ...counts);
  const chartHeight = 180;
  const chartWidth = 360;
  const barWidth = 38;
  const gap = 16;
  const chartLeft = 20;
  const chartBottom = 150;

  const bars = counts.map((count, index) => {
    const x = chartLeft + index * (barWidth + gap);
    const height = Math.max(12, (count / max) * 110);
    const y = chartBottom - height;
    return `
      <g>
        <rect x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="8" fill="#16a34a" opacity="0.85"></rect>
        <text x="${x + barWidth / 2}" y="${chartBottom + 20}" text-anchor="middle" font-size="11" fill="#6b7280">${dayLabels[index]}</text>
        <text x="${x + barWidth / 2}" y="${y - 8}" text-anchor="middle" font-size="11" fill="#111827">${count}</text>
      </g>
    `;
  }).join("");

  wrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem">
      <div>
        <p class="text-sm font-medium">${diagnoses.length} plants diagnosed total</p>
        <p class="text-xs text-muted">This week’s activity</p>
      </div>
      <div class="badge badge-green">+${counts[counts.length - 1] - (counts[0] || 0)} vs. start</div>
    </div>
    <svg viewBox="0 0 ${chartWidth} ${chartHeight}" width="100%" height="220" role="img" aria-label="Diagnoses trend chart">
      <line x1="${chartLeft}" y1="${chartBottom}" x2="${chartLeft + 7 * (barWidth + gap) + barWidth}" y2="${chartBottom}" stroke="#e5e7eb" stroke-width="1"></line>
      ${bars}
    </svg>
  `;
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
