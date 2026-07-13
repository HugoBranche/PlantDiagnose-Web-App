/* ==========================================================================
   Diagnose Plant page — upload, preview, and send the image to our own
   backend (POST /api/diagnoses), which proxies the call to the
   PlantDiagnose ML model and saves the result to the user's history.
   ========================================================================== */

let currentFile = null;

const uploadZone = document.getElementById("uploadZone");
const fileInput = document.getElementById("fileInput");
const browseBtn = document.getElementById("browseBtn");
const cameraBtn = document.getElementById("cameraBtn");
const previewWrap = document.getElementById("previewWrap");
const previewImg = document.getElementById("previewImg");
const removeImgBtn = document.getElementById("removeImgBtn");
const analyzeBtn = document.getElementById("analyzeBtn");
const analyzingWrap = document.getElementById("analyzingWrap");
const progressBar = document.getElementById("progressBar");
const errorWrap = document.getElementById("errorWrap");
const errorMsg = document.getElementById("errorMsg");
const resultEmpty = document.getElementById("resultEmpty");
const resultWrap = document.getElementById("resultWrap");
const newDiagnosisBtn1 = document.getElementById("newDiagnosisBtn1");
const newDiagnosisBtn2 = document.getElementById("newDiagnosisBtn2");
const viewInHistoryBtn = document.getElementById("viewInHistoryBtn");

function handleFileSelect(file) {
  if (!file || !file.type.startsWith("image/")) return;
  currentFile = file;
  resetResult();
  const reader = new FileReader();
  reader.onloadend = () => {
    previewImg.src = reader.result;
    uploadZone.classList.add("hidden");
    previewWrap.classList.remove("hidden");
  };
  reader.readAsDataURL(file);
}

function resetResult() {
  errorWrap.classList.add("hidden");
  resultWrap.classList.add("hidden");
  resultEmpty.classList.remove("hidden");
  analyzeBtn.classList.remove("hidden");
  newDiagnosisBtn1.classList.add("hidden");
}

function resetAll() {
  currentFile = null;
  fileInput.value = "";
  uploadZone.classList.remove("hidden");
  previewWrap.classList.add("hidden");
  resetResult();
}

uploadZone.addEventListener("click", () => fileInput.click());
browseBtn.addEventListener("click", (e) => { e.stopPropagation(); fileInput.click(); });
cameraBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  fileInput.setAttribute("capture", "environment");
  fileInput.click();
});
fileInput.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (file) handleFileSelect(file);
});

["dragenter", "dragover"].forEach((evt) =>
  uploadZone.addEventListener(evt, (e) => { e.preventDefault(); uploadZone.classList.add("drag"); })
);
["dragleave", "drop"].forEach((evt) =>
  uploadZone.addEventListener(evt, (e) => { e.preventDefault(); uploadZone.classList.remove("drag"); })
);
uploadZone.addEventListener("drop", (e) => {
  const file = e.dataTransfer.files?.[0];
  if (file) handleFileSelect(file);
});

if (removeImgBtn) {
    removeImgBtn.addEventListener("click", resetAll);
}

if (newDiagnosisBtn1) {
    newDiagnosisBtn1.addEventListener("click", resetAll);
}

if (newDiagnosisBtn2) {
    newDiagnosisBtn2.addEventListener("click", resetAll);
}

if (viewInHistoryBtn) {
    viewInHistoryBtn.addEventListener("click", () => {
        window.location.href = "history.html";
    });
  }


analyzeBtn.addEventListener("click", async () => {
  if (!currentFile) return;
  errorWrap.classList.add("hidden");
  analyzingWrap.classList.remove("hidden");
  analyzeBtn.classList.add("hidden");
  progressBar.style.width = "0%";

  let progress = 0;
  const tick = setInterval(() => {
    if (progress < 85) {
      progress += 5;
      progressBar.style.width = progress + "%";
    }
  }, 300);

  try {
    const formData = new FormData();
    formData.append("image", currentFile);

    const data = await apiFetch("/api/diagnoses", {
      method: "POST",
      body: formData,
    });

    clearInterval(tick);
    progressBar.style.width = "100%";
    showResult(data.diagnosis);
  } catch (err) {
    clearInterval(tick);
    errorMsg.textContent = err.message || "Failed to connect to the diagnosis API. Please try again.";
    errorWrap.classList.remove("hidden");
    analyzeBtn.classList.remove("hidden");
  } finally {
    analyzingWrap.classList.add("hidden");
  }
});

function severityBadgeClass(sev) {
  switch ((sev || "").toLowerCase()) {
    case "mild": return "badge-green";
    case "moderate": return "badge-orange";
    case "severe": return "badge-red";
    default: return "badge-gray";
  }
}

function showResult(result) {
  const isHealthy = result.status === "Healthy";

  resultEmpty.classList.add("hidden");
  resultWrap.classList.remove("hidden");
  newDiagnosisBtn1.classList.remove("hidden");

  const statusAlert = document.getElementById("statusAlert");
  statusAlert.className = "alert " + (isHealthy ? "alert-green" : "alert-orange");
  document.getElementById("statusIcon").textContent = isHealthy ? "✓" : "⚠";
  document.getElementById("statusTitle").textContent = isHealthy ? "Plant is Healthy" : "Disease Detected";
  document.getElementById("statusDesc").textContent = result.condition;

  document.getElementById("resPlant").textContent = result.plant;

  const badge = document.getElementById("resStatusBadge");
  badge.textContent = result.status;
  badge.className = "badge " + (isHealthy ? "badge-green" : "badge-orange");

  const severityWrap = document.getElementById("resSeverityWrap");
  if (result.severity) {
    severityWrap.classList.remove("hidden");
    const severityBadge = document.getElementById("resSeverityBadge");
    severityBadge.textContent = result.severity;
    severityBadge.className = "badge " + severityBadgeClass(result.severity);
  } else {
    severityWrap.classList.add("hidden");
  }

  document.getElementById("confBar").style.width = result.confidence + "%";
  document.getElementById("confLabel").textContent = result.confidence.toFixed(1) + "%";

  document.getElementById("resCondition").textContent = result.condition;
}
