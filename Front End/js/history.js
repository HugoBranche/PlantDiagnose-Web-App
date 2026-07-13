/* Diagnosis History page — wired to the real backend (GET /api/diagnoses),
   same source as the Dashboard's "Recent Diagnoses" and the Reports page. */

let allHistory = [];

const historyBody = document.getElementById("historyBody");
const historyEmpty = document.getElementById("historyEmpty");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");

function severityBadgeClass(sev) {
  switch ((sev || "").toLowerCase()) {
    case "mild": return "badge-green";
    case "moderate": return "badge-orange";
    case "severe": return "badge-red";
    default: return "badge-gray";
  }
}
function statusBadgeClass(status) {
  switch ((status || "").toLowerCase()) {
    case "treated": return "badge-green";
    case "in progress": return "badge-blue";
    case "monitoring": return "badge-yellow";
    default: return "badge-gray";
  }
}
function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

async function loadHistory() {
  try {
    const { diagnoses } = await apiFetch("/api/diagnoses");
    allHistory = diagnoses;
    render();
  } catch (err) {
    console.error("Failed to load diagnosis history:", err.message);
    historyEmpty.querySelector("p") && (historyEmpty.querySelector("p").textContent = "Could not load your diagnosis history. Please try again.");
    historyEmpty.classList.remove("hidden");
  }
}

function render() {
  const q = (searchInput.value || "").toLowerCase();
  const status = statusFilter.value;

  const filtered = allHistory.filter((item) => {
    const matchesSearch =
      (item.plant || "").toLowerCase().includes(q) ||
      (item.condition || "").toLowerCase().includes(q) ||
      String(item.id).toLowerCase().includes(q);
    const matchesFilter = status === "all" || (item.workflowStatus || "").toLowerCase() === status.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  document.getElementById("statTotal").textContent = allHistory.length;
  document.getElementById("statProgress").textContent = allHistory.filter((d) => d.workflowStatus === "In Progress").length;
  document.getElementById("statTreated").textContent = allHistory.filter((d) => d.workflowStatus === "Treated").length;
  document.getElementById("statSevere").textContent = allHistory.filter((d) => d.severity === "Severe").length;

  historyBody.innerHTML = "";
  if (filtered.length === 0) {
    historyEmpty.classList.remove("hidden");
    return;
  }
  historyEmpty.classList.add("hidden");

  filtered.forEach((d) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="font-medium">#${d.id}</td>
      <td>${formatDate(d.createdAt)}</td>
      <td><img class="table-img" src="${API_BASE_URL}${d.imageUrl}" alt="${d.plant}"></td>
      <td>${d.plant}</td>
      <td>${d.condition}</td>
      <td>${d.severity ? `<span class="badge ${severityBadgeClass(d.severity)}">${d.severity}</span>` : "—"}</td>
      <td>${d.confidence}%</td>
      <td><span class="badge ${statusBadgeClass(d.workflowStatus)}">${d.workflowStatus}</span></td>
      <td><button class="btn btn-ghost btn-sm" data-id="${d.id}">View</button></td>
    `;
    tr.querySelector("button").addEventListener("click", () => showDetail(d));
    historyBody.appendChild(tr);
  });
}

function showDetail(d) {
  document.getElementById("modalTitle").textContent = `Diagnosis Details - #${d.id}`;
  document.getElementById("modalBody").innerHTML = `
    <img src="${API_BASE_URL}${d.imageUrl}" alt="${d.plant}" style="width:100%;height:16rem;object-fit:cover;border-radius:var(--radius);margin-bottom:1rem">
    <div class="grid grid-2" style="gap:1rem">
      <div><p class="text-sm text-muted">Plant Type</p><p class="font-medium">${d.plant}</p></div>
      <div><p class="text-sm text-muted">Disease</p><p class="font-medium">${d.condition}</p></div>
      <div><p class="text-sm text-muted">Severity</p>${d.severity ? `<span class="badge ${severityBadgeClass(d.severity)}">${d.severity}</span>` : "<p class=\"font-medium\">—</p>"}</div>
      <div><p class="text-sm text-muted">Confidence</p><p class="font-medium">${d.confidence}%</p></div>
    </div>
  `;
  openModal("historyModal");
}

searchInput.addEventListener("input", render);
statusFilter.addEventListener("change", render);
loadHistory();