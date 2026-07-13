/* ==========================================================================
   Recommendations page — GET /api/recommendations.
   Seasonal tips are static in the HTML (they match the backend's static
   SEASONAL_TIPS exactly), so only the stats + action items are dynamic.
   ========================================================================== */

function severityBadgeClass(sev) {
  switch ((sev || "").toLowerCase()) {
    case "mild": return "badge-green";
    case "moderate": return "badge-orange";
    case "severe": return "badge-red";
    default: return "badge-gray";
  }
}

async function loadRecommendations() {
  try {
    const data = await apiFetch("/api/recommendations");

    document.getElementById("statTotalRecs").textContent = data.totalRecommendations;
    document.getElementById("statPending").textContent = data.pendingActions;
    document.getElementById("statCompleted").textContent = data.completed;
    document.getElementById("statCompletionRate").textContent = data.completionRate + "%";

    document.getElementById("progressLabel").textContent =
      `Completed ${data.completed} of ${data.totalRecommendations} recommendations`;
    document.getElementById("progressPercent").textContent = data.completionRate + "%";
    document.getElementById("progressBarFill").style.width = data.completionRate + "%";

    if (data.actionItems.length > 0) {
      document.getElementById("actionItemsWrap").innerHTML = data.actionItems
        .map(
          (a) => `
          <div class="flex items-center justify-between" style="padding:.75rem 0;border-bottom:1px solid var(--border)">
            <div>
              <p class="font-medium text-sm">${a.title}</p>
              <p class="text-xs text-muted">${new Date(a.createdAt).toLocaleDateString()}</p>
            </div>
            <span class="badge ${severityBadgeClass(a.severity)}">${a.severity || "—"}</span>
          </div>
        `
        )
        .join("");
    }
  } catch (err) {
    console.error("Failed to load recommendations:", err.message);
  }
}

document.addEventListener("DOMContentLoaded", loadRecommendations);
