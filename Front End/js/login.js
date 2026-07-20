/* Sign In / Sign Up — calls the real backend (POST /api/auth/login and
   POST /api/auth/register), stores the JWT + user in localStorage via
   Auth, then redirects to the dashboard. */

document.addEventListener("DOMContentLoaded", () => {
  // If already logged in, skip straight to the dashboard (or profile setup).
  if (Auth.isLoggedIn()) {
    const user = Auth.getUser();
    if (user && user.role === "botanist" && !user.profileComplete) {
      window.location.href = "botanist-profile.html";
    } else {
      window.location.href = "dashboard.html";
    }
    return;
  }

  const authError = document.getElementById("authError");
  const authErrorMsg = document.getElementById("authErrorMsg");

  function showError(message) {
    authErrorMsg.textContent = message;
    authError.classList.remove("hidden");
  }
  function hideError() {
    authError.classList.add("hidden");
  }

  document.querySelectorAll("#authTabs .tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#authTabs .tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("panel-" + btn.dataset.panel).classList.add("active");
      hideError();
    });
  });

  async function handleAuth(form, submitBtn, loadingText, request) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideError();
      const original = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = loadingText;

      try {
        const data = await request();
        Auth.setToken(data.token);
        Auth.setUser(data.user);
        if (data.user.role === "admin") {
          window.location.href = "admin.html";
        } else if (data.user.role === "botanist" && !data.user.profileComplete) {
          window.location.href = "botanist-profile.html";
        } else {
          window.location.href = "dashboard.html";
        }
      } catch (err) {
        showError(err.message || "Something went wrong. Please try again.");
        submitBtn.disabled = false;
        submitBtn.textContent = original;
      }
    });
  }

  document.getElementById("adminSigninBtn")?.addEventListener("click", async () => {
    hideError();
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const submitBtn = document.getElementById("signinSubmit");
    const original = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Signing in...";

    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: {
          email: emailInput.value.trim(),
          password: passwordInput.value,
        },
      });

      if (data.user.role !== "admin") {
        throw new Error("This account is not an admin account.");
      }

      Auth.setToken(data.token);
      Auth.setUser(data.user);
      window.location.href = "admin.html";
    } catch (err) {
      showError(err.message || "Unable to sign in as admin.");
      submitBtn.disabled = false;
      submitBtn.textContent = original;
    }
  });

  handleAuth(
    document.getElementById("signinForm"),
    document.getElementById("signinSubmit"),
    "Signing in...",
    () =>
      apiFetch("/api/auth/login", {
        method: "POST",
        body: {
          email: document.getElementById("email").value.trim(),
          password: document.getElementById("password").value,
        },
      })
  );

  handleAuth(
    document.getElementById("signupForm"),
    document.getElementById("signupSubmit"),
    "Creating account...",
    () => {
      const password = document.getElementById("signup-password").value;
      const confirm = document.getElementById("confirm-password").value;
      if (password !== confirm) {
        return Promise.reject(new Error("Passwords do not match."));
      }
      const role = document.querySelector('input[name="role"]:checked')?.value || "user";
      return apiFetch("/api/auth/register", {
        method: "POST",
        body: {
          name: document.getElementById("name").value.trim(),
          email: document.getElementById("signup-email").value.trim(),
          password,
          role,
        },
      });
    }
  );
});
