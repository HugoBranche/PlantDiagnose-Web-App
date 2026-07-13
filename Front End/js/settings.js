/* ==========================================================================
   Settings page — GET /api/auth/me to populate the form, then:
   - PUT /api/auth/me for profile fields + notification/preference settings
   - PUT /api/auth/password for the password change form
   ========================================================================== */

function initials(name) {
  return (name || "?")
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

async function loadProfile() {
  try {
    const { user } = await apiFetch("/api/auth/me");
    fillForm(user);
  } catch (err) {
    console.error("Failed to load profile:", err.message);
  }
}

function fillForm(user) {
  document.getElementById("botanistProfileCard").classList.toggle("hidden", user.role !== "botanist");
  document.getElementById("profileAvatarLg").textContent = initials(user.name);
  document.getElementById("settingsName").value = user.name || "";
  document.getElementById("settingsEmail").value = user.email || "";
  document.getElementById("settingsPhone").value = user.phone || "";
  document.getElementById("settingsLocation").value = user.location || "";
  document.getElementById("settingsBio").value = user.bio || "";

  const s = user.settings || {};
  document.getElementById("notifEmail").checked = !!s.emailNotifications;
  document.getElementById("notifPush").checked = !!s.pushNotifications;
  document.getElementById("notifWeekly").checked = !!s.weeklyReports;
  document.getElementById("notifMarketing").checked = !!s.marketingEmails;
  if (s.language) document.getElementById("prefLanguage").value = s.language;
  if (s.units) document.getElementById("prefUnits").value = s.units;
  if (s.theme) document.getElementById("prefTheme").value = s.theme;
}

async function saveProfile() {
  const btn = document.getElementById("saveProfileBtn");
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Saving...";
  try {
    const { user } = await apiFetch("/api/auth/me", {
      method: "PUT",
      body: {
        name: document.getElementById("settingsName").value.trim(),
        phone: document.getElementById("settingsPhone").value.trim(),
        location: document.getElementById("settingsLocation").value.trim(),
        bio: document.getElementById("settingsBio").value.trim(),
      },
    });
    Auth.setUser(user);
    alert("Profile updated.");
  } catch (err) {
    alert(err.message || "Failed to update profile.");
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}

async function saveNotifications() {
  const btn = document.getElementById("saveNotifsBtn");
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Saving...";
  try {
    const { user } = await apiFetch("/api/auth/me", {
      method: "PUT",
      body: {
        settings: {
          emailNotifications: document.getElementById("notifEmail").checked,
          pushNotifications: document.getElementById("notifPush").checked,
          weeklyReports: document.getElementById("notifWeekly").checked,
          marketingEmails: document.getElementById("notifMarketing").checked,
        },
      },
    });
    Auth.setUser(user);
    alert("Notification preferences saved.");
  } catch (err) {
    alert(err.message || "Failed to save preferences.");
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}

async function savePreferences() {
  const btn = document.getElementById("savePrefsBtn");
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Saving...";
  try {
    const { user } = await apiFetch("/api/auth/me", {
      method: "PUT",
      body: {
        settings: {
          language: document.getElementById("prefLanguage").value,
          units: document.getElementById("prefUnits").value,
          theme: document.getElementById("prefTheme").value,
        },
      },
    });
    Auth.setUser(user);
    alert("Preferences saved.");
  } catch (err) {
    alert(err.message || "Failed to save preferences.");
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}

async function updatePassword() {
  const btn = document.getElementById("updatePasswordBtn");
  const currentPassword = document.getElementById("currentPassword").value;
  const newPassword = document.getElementById("newPassword").value;
  const confirmNewPassword = document.getElementById("confirmNewPassword").value;

  if (newPassword !== confirmNewPassword) {
    alert("New passwords do not match.");
    return;
  }

  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Updating...";
  try {
    await apiFetch("/api/auth/password", {
      method: "PUT",
      body: { currentPassword, newPassword },
    });
    document.getElementById("currentPassword").value = "";
    document.getElementById("newPassword").value = "";
    document.getElementById("confirmNewPassword").value = "";
    alert("Password updated.");
  } catch (err) {
    alert(err.message || "Failed to update password.");
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadProfile();
  document.getElementById("saveProfileBtn").addEventListener("click", saveProfile);
  document.getElementById("saveNotifsBtn").addEventListener("click", saveNotifications);
  document.getElementById("savePrefsBtn").addEventListener("click", savePreferences);
  document.getElementById("updatePasswordBtn").addEventListener("click", updatePassword);
});
