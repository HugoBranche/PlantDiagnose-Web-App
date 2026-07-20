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

  // --- Ensure the Messages link is present in the sidebar on every dashboard page ---
  const current = window.location.pathname.split("/").pop() || "dashboard.html";
  const sidebarNav = document.querySelector(".sidebar-nav");
  if (sidebarNav && !sidebarNav.querySelector('[data-page="messages.html"]')) {
    const messagesLink = document.createElement("a");
    messagesLink.className = "nav-link";
    messagesLink.dataset.page = "messages.html";
    messagesLink.href = "messages.html";
    messagesLink.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span>Messages</span>';

    const insertBeforeEl = sidebarNav.querySelector('[data-page="recommendations.html"]')
      || sidebarNav.querySelector('[data-page="reports.html"]')
      || sidebarNav.querySelector('[data-page="settings.html"]');

    if (insertBeforeEl) {
      sidebarNav.insertBefore(messagesLink, insertBeforeEl);
    } else {
      sidebarNav.appendChild(messagesLink);
    }
  }

  const messagesLink = sidebarNav?.querySelector('[data-page="messages.html"]');
  if (messagesLink) {
    const badge = messagesLink.querySelector('.nav-badge') || document.createElement('span');
    badge.className = 'nav-badge';
    badge.textContent = '•';
    badge.style.display = 'none';
    badge.style.marginLeft = 'auto';
    badge.style.width = '8px';
    badge.style.height = '8px';
    badge.style.borderRadius = '999px';
    badge.style.background = '#16a34a';
    if (!messagesLink.querySelector('.nav-badge')) {
      messagesLink.appendChild(badge);
    }

    async function refreshMessagesBadge() {
      try {
        const data = await apiFetch('/api/consultations');
        const hasUnread = Array.isArray(data?.conversations)
          && data.conversations.some((c) => c.status === 'new' && !c.lastMessageFromMe);
        badge.style.display = hasUnread ? 'inline-block' : 'none';
      } catch {
        badge.style.display = 'none';
      }
    }

    refreshMessagesBadge();
    window.setInterval(refreshMessagesBadge, 10000);
  }

  // --- Highlight active nav link based on current page filename ---
  document.querySelectorAll(".nav-link[data-page]").forEach((link) => {
    if (link.dataset.page === current) {
      link.classList.add("active");
    }
  });

  if (user?.role === "admin" && !document.querySelector('.nav-link[data-page="admin.html"]')) {
    const adminLink = document.createElement("a");
    adminLink.className = "nav-link";
    adminLink.dataset.page = "admin.html";
    adminLink.href = "admin.html";
    adminLink.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l7 4v5c0 4.4-2.8 7.8-7 9-4.2-1.2-7-4.6-7-9V7z"/><path d="M9 12l2 2 4-4"/></svg><span>Admin</span>';
    sidebarNav?.appendChild(adminLink);
  }

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
