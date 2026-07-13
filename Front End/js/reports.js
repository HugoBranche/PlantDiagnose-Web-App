/* ==========================================================================
   Reports & Analytics page — GET /api/dashboard/stats + GET /api/diagnoses.
   Keeps things simple: fills in the real numbers and the Top Diseases list.
   The monthly-trend / plant-type / severity-trend charts stay as their
   "no data yet" placeholders — building real charts is a separate task.
   ========================================================================== */

async function loadReports() {
  try {
    const [stats, diagnosesRes] = await Promise.all([
      apiFetch("/api/dashboard/stats"),
      apiFetch("/api/diagnoses"),
    ]);
    const diagnoses = diagnosesRes.diagnoses;

    document.getElementById("rptTotal").textContent = stats.totalDiagnoses;
    document.getElementById("rptDetectionRate").textContent =
      stats.diseaseDetectionRate != null ? stats.diseaseDetectionRate + "%" : "—";
    document.getElementById("rptAvgConfidence").textContent =
      stats.avgConfidence != null ? stats.avgConfidence + "%" : "—";

    const plantCounts = {};
    diagnoses.forEach((d) => {
      if (d.plant) plantCounts[d.plant] = (plantCounts[d.plant] || 0) + 1;
    });
    const plantNames = Object.keys(plantCounts);
    document.getElementById("rptPlantsMonitored").textContent = plantNames.length;

    if (stats.totalDiagnoses > 0) {
      const successRate = Math.round((stats.healthyPlants / stats.totalDiagnoses) * 100);
      document.getElementById("rptSuccessRate").textContent = successRate + "%";
      document.getElementById("rptSuccessRate").style.color = "";
      document.getElementById("rptSuccessRateSub").textContent = "Of diagnosed plants are healthy";
    }

    if (plantNames.length > 0) {
      const topPlant = plantNames.sort((a, b) => plantCounts[b] - plantCounts[a])[0];
      document.getElementById("rptMostAffectedPlant").textContent = topPlant;
      document.getElementById("rptMostAffectedPlant").style.color = "";
      document.getElementById("rptMostAffectedPlantSub").textContent = `${plantCounts[topPlant]} diagnoses`;
    }

    if (stats.topDiseases.length > 0) {
      const top = stats.topDiseases[0];
      document.getElementById("rptMostCommonDisease").textContent = top.condition;
      document.getElementById("rptMostCommonDisease").style.color = "";
      document.getElementById("rptMostCommonDiseaseSub").textContent = `${top.count} occurrences`;

      const max = Math.max(...stats.topDiseases.map((d) => d.count));
      document.getElementById("topDiseasesWrap").innerHTML = stats.topDiseases
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
  } catch (err) {
    console.error("Failed to load reports:", err.message);
  }
}

document.addEventListener("DOMContentLoaded", loadReports);
