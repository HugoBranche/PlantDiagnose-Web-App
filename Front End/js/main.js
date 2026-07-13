/* ==========================================================================
   Shared behavior for every dashboard page: auth guard, mobile sidebar
   toggle, active nav link highlighting, profile dropdown, logout.
   ========================================================================== */

// Bounce straight to login if there's no token — before the page renders.
requireAuth();

// Botanists must finish their profile (specialty + location) before using
// the rest of the app, so their listing has real info instead of blanks.
(function enforceBotanistProfile() {
  const user = Auth.getUser();
  const current = window.location.pathname.split("/").pop() || "dashboard.html";
  const exempt = ["botanist-profile.html", "settings.html"];
  if (user && user.role === "botanist" && !user.profileComplete && !exempt.includes(current)) {
    window.location.href = "botanist-profile.html";
  }
})();

document.addEventListener("DOMContentLoaded", () => {
  // --- Populate profile name/initials from the logged-in user ---
  const user = Auth.getUser();
  if (user) {
    const initials = user.name
      ? user.name.trim().split(/\s+/).map((n) => n[0]).slice(0, 2).join("").toUpperCase()
      : "?";
    document.querySelectorAll(".profile-btn .avatar").forEach((el) => (el.textContent = initials));
    const nameEl = document.getElementById("profileName");
    if (nameEl) nameEl.textContent = user.name;
  }

  // --- Mobile sidebar open/close ---
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const menuBtn = document.getElementById("mobileMenuBtn");

  function openSidebar() {
    sidebar?.classList.add("open");
    overlay?.classList.add("open");
  }
  function closeSidebar() {
    sidebar?.classList.remove("open");
    overlay?.classList.remove("open");
  }
  menuBtn?.addEventListener("click", openSidebar);
  overlay?.addEventListener("click", closeSidebar);

  // --- Highlight active nav link based on current page filename ---
  const current = window.location.pathname.split("/").pop() || "dashboard.html";
  document.querySelectorAll(".nav-link[data-page]").forEach((link) => {
    if (link.dataset.page === current) {
      link.classList.add("active");
    }
  });

  // --- Profile dropdown ---
  const dropdown = document.getElementById("profileDropdown");
  const profileBtn = document.getElementById("profileBtn");
  profileBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown?.classList.toggle("open");
  });
  document.addEventListener("click", () => dropdown?.classList.remove("open"));

  // --- Logout (any element with data-logout) ---
  document.querySelectorAll("[data-logout]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      Auth.logout();
    });
  });
});

/* Generic modal helpers used across pages */
function openModal(id) {
  document.getElementById(id)?.classList.add("open");
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove("open");
}
