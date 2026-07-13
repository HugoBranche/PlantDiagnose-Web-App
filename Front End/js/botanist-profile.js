/* Botanist profile setup — captures specialty + real location so this
   botanist shows up correctly on the Nearby Botanists page. */

requireAuth();

document.addEventListener("DOMContentLoaded", () => {
  const user = Auth.getUser();
  if (!user || user.role !== "botanist") {
    window.location.href = "dashboard.html";
    return;
  }

  const form = document.getElementById("profileForm");
  const submitBtn = document.getElementById("profileSubmit");
  const errorBox = document.getElementById("profileError");
  const errorMsg = document.getElementById("profileErrorMsg");
  const captureBtn = document.getElementById("captureLocationBtn");
  const coordsStatus = document.getElementById("coordsStatus");

  // Pre-fill with anything the botanist already saved (e.g. re-visiting
  // this page from Settings to update their info).
  document.getElementById("specialty").value = user.specialty || "";
  document.getElementById("specializations").value = (user.specializations || []).join(", ");
  document.getElementById("experienceYears").value = user.experienceYears || "";
  document.getElementById("phone").value = user.phone || "";
  document.getElementById("bio").value = user.bio || "";
  document.getElementById("location").value = user.location || "";

  let coords = user.lat != null && user.lng != null ? { lat: user.lat, lng: user.lng } : null;
  if (coords) {
    coordsStatus.textContent = "Location captured ✓";
  }

  captureBtn.addEventListener("click", () => {
    if (!navigator.geolocation) {
      coordsStatus.textContent = "Your browser doesn't support geolocation. You can still save without it, but distance won't show for users.";
      return;
    }
    captureBtn.disabled = true;
    captureBtn.textContent = "Locating…";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        coordsStatus.textContent = "Location captured ✓";
        captureBtn.disabled = false;
        captureBtn.textContent = "📍 Use My Current Location";
      },
      () => {
        coordsStatus.textContent = "Couldn't get your location — check browser permissions and try again.";
        captureBtn.disabled = false;
        captureBtn.textContent = "📍 Use My Current Location";
      },
      { timeout: 8000 }
    );
  });

  function showError(message) {
    errorMsg.textContent = message;
    errorBox.classList.remove("hidden");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.classList.add("hidden");

    if (!coords) {
      showError("Please capture your location so users can find you nearby.");
      return;
    }

    const original = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving…";

    try {
      const specializations = document
        .getElementById("specializations")
        .value.split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const data = await apiFetch("/api/botanists/me", {
        method: "PUT",
        body: {
          specialty: document.getElementById("specialty").value,
          specializations,
          experienceYears: document.getElementById("experienceYears").value,
          phone: document.getElementById("phone").value,
          bio: document.getElementById("bio").value,
          location: document.getElementById("location").value,
          lat: coords.lat,
          lng: coords.lng,
        },
      });

      Auth.setUser(data.user);
      window.location.href = "dashboard.html";
    } catch (err) {
      showError(err.message || "Something went wrong. Please try again.");
      submitBtn.disabled = false;
      submitBtn.textContent = original;
    }
  });
});
