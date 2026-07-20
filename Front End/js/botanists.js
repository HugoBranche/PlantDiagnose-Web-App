/* Nearby Botanists — wired to the real backend API. */
/* main.js already calls requireAuth() globally on protected pages. */

const searchInput = document.getElementById("searchInput");
const specialtyFilter = document.getElementById("specialtyFilter");
const sortBy = document.getElementById("sortBy");
const grid = document.getElementById("botanistGrid");
const emptyState = document.getElementById("botanistsEmpty");
const locationStatus = document.getElementById("locationStatus");

let botanists = [];
let userCoords = null; // { lat, lng } once geolocation succeeds
let activeMessageBotanist = null;
const contactModalTitle = document.getElementById("contactModalTitle");
const contactModalSub = document.getElementById("contactModalSub");
const phoneLink = document.getElementById("contactModalPhoneLink");
const phoneCopyBtn = document.getElementById("contactModalPhoneCopy");
const emailLink = document.getElementById("contactModalEmailLink");
const emailCopyBtn = document.getElementById("contactModalEmailCopy");
const messageModalTitle = document.getElementById("messageModalTitle");
const messageModalSub = document.getElementById("messageModalSub");
const messageComposer = document.getElementById("messageComposer");
const messageModalStatus = document.getElementById("messageModalStatus");
const messageSendBtn = document.getElementById("messageModalSend");

function initials(name) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2);
}

async function copyToClipboard(text, btn) {
  const original = btn.textContent;
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = "Copied ✓";
  } catch {
    btn.textContent = "Couldn't copy";
  }
  setTimeout(() => (btn.textContent = original), 1500);
}

// Shows the botanist's real phone/email in a modal — tel:/mailto: links are
// included as a convenience, but the visible, copyable text is the part
// that actually works regardless of whether the browser/OS has a phone or
// mail app registered to handle those links.
function openContactModal(b) {
  contactModalTitle.textContent = b.name;
  contactModalSub.textContent = b.specialty;

  if (b.phone) {
    const cleanPhone = b.phone.replace(/[^\d+]/g, "");
    phoneLink.href = `tel:${cleanPhone}`;
    phoneLink.textContent = `📞 ${b.phone}`;
    phoneLink.classList.remove("hidden");
    phoneCopyBtn.classList.remove("hidden");
    phoneCopyBtn.onclick = () => copyToClipboard(b.phone, phoneCopyBtn);
  } else {
    phoneLink.textContent = "No phone number on file";
    phoneLink.removeAttribute("href");
    phoneCopyBtn.classList.add("hidden");
  }

  if (b.email) {
    const subject = encodeURIComponent("PlantDiagnose — Plant health enquiry");
    emailLink.href = `mailto:${b.email}?subject=${subject}`;
    emailLink.textContent = `✉️ ${b.email}`;
    emailLink.classList.remove("hidden");
    emailCopyBtn.classList.remove("hidden");
    emailCopyBtn.onclick = () => copyToClipboard(b.email, emailCopyBtn);
  } else {
    emailLink.textContent = "No email on file";
    emailLink.removeAttribute("href");
    emailCopyBtn.classList.add("hidden");
  }

  openModal("contactModal");
}

function openMessageModal(b) {
  activeMessageBotanist = b;
  messageModalTitle.textContent = `Message ${b.name}`;
  messageModalSub.textContent = b.specialty || "Plant specialist";
  messageComposer.value = "";
  messageModalStatus.textContent = "";
  messageModalStatus.className = "text-sm text-muted mt-2";
  messageSendBtn.disabled = false;
  openModal("messageModal");
}

async function sendMessageToBotanist() {
  if (!activeMessageBotanist || !activeMessageBotanist.userId) return;

  const message = messageComposer.value.trim();
  if (!message) {
    messageModalStatus.textContent = "Please enter a message before sending.";
    messageModalStatus.className = "text-sm text-danger mt-2";
    return;
  }

  messageSendBtn.disabled = true;
  messageModalStatus.textContent = "Sending...";
  messageModalStatus.className = "text-sm text-muted mt-2";

  try {
    await apiFetch("/api/consultations", {
      method: "POST",
      body: {
        botanistId: activeMessageBotanist.userId,
        message,
      },
    });

    closeModal("messageModal");
    window.location.href = `messages.html?botanist=${activeMessageBotanist.userId}&name=${encodeURIComponent(activeMessageBotanist.name)}`;
  } catch (err) {
    messageModalStatus.textContent = err.message || "Could not send message.";
    messageModalStatus.className = "text-sm text-danger mt-2";
    messageSendBtn.disabled = false;
  }
}

// Ask the browser for the user's real position. Resolves to null (instead
// of rejecting) if permission is denied or unsupported, so the page always
// falls back gracefully to the backend's placeholder distances.
function getUserLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 8000 }
    );
  });
}

async function loadBotanists() {
  const params = new URLSearchParams({
    search: searchInput.value || "",
    specialty: specialtyFilter.value,
    sort: sortBy.value,
  });
  if (userCoords) {
    params.set("lat", userCoords.lat);
    params.set("lng", userCoords.lng);
  }

  try {
    const data = await apiFetch(`/api/botanists?${params.toString()}`);
    botanists = data.botanists;
    render();
  } catch (err) {
    emptyState.querySelector("p").textContent = "Could not load botanists. Please try again.";
    emptyState.classList.remove("hidden");
    grid.innerHTML = "";
  }
}

function render() {
  document.getElementById("statTotal").textContent = botanists.length;
  document.getElementById("statVerified").textContent = botanists.filter((b) => b.verified).length;

  grid.innerHTML = "";
  emptyState.classList.toggle("hidden", botanists.length !== 0);

  botanists.forEach((b) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-header">
        <div class="flex gap-3" style="align-items:flex-start">
          <span class="avatar avatar-lg">${initials(b.name)}</span>
          <div style="flex:1">
            <div class="card-title flex items-center gap-2">${b.name} ${b.verified ? '<span class="badge badge-blue text-xs">Verified</span>' : ""}</div>
            <div class="card-description">${b.specialty}</div>
            <div class="flex items-center gap-3 text-sm mt-2">
              <span>★ <strong>${b.rating}</strong> <span class="text-muted">(${b.reviews})</span></span>
              <span class="text-muted">📍 ${b.distanceKm != null ? b.distanceKm + " km" : "Distance unavailable"}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="card-content space-y-4">
        <div><p class="text-sm font-medium mb-1">Experience</p><p class="text-sm text-muted">${b.experienceYears} years</p></div>
        <div><p class="text-sm font-medium mb-1">Location</p><p class="text-sm text-muted">📍 ${b.location}</p></div>
        <div>
          <p class="text-sm font-medium mb-2">Specializations</p>
          <div class="flex gap-1" style="flex-wrap:wrap">${(Array.isArray(b.specializations) ? b.specializations : []).map((s) => `<span class="badge badge-gray text-xs">${s}</span>`).join("")}</div>
        </div>
        
        <div class="flex gap-2 mt-2">
  <button class="btn btn-primary btn-contact" style="flex:1" type="button">Contact</button>
  <button class="btn btn-outline btn-contact" style="flex:1" type="button">Email</button>
  <button class="btn btn-outline btn-message" style="flex:1" type="button">Message</button>
</div>
      </div>
    `;
    card.querySelectorAll(".btn-contact").forEach((btn) => btn.addEventListener("click", () => openContactModal(b)));
    const messageBtn = card.querySelector(".btn-message");
    if (messageBtn) {
      messageBtn.addEventListener("click", () => openMessageModal(b));
    }
    grid.appendChild(card);
  });
}

async function init() {
  userCoords = await getUserLocation();
  locationStatus.textContent = userCoords
    ? "Showing distances based on your current location."
    : "Location access unavailable — showing approximate distances.";
  await loadBotanists();
}

searchInput.addEventListener("input", loadBotanists);
specialtyFilter.addEventListener("change", loadBotanists);
sortBy.addEventListener("change", loadBotanists);
messageSendBtn.addEventListener("click", sendMessageToBotanist);

init();

init();