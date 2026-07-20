document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("adminLoginForm");
  const submitBtn = document.getElementById("adminLoginSubmit");

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const original = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Signing in...";

    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: {
          email: document.getElementById("adminEmail").value.trim(),
          password: document.getElementById("adminPassword").value,
        },
      });

      if (data.user.role !== "admin") {
        throw new Error("This account is not an admin account.");
      }

      Auth.setToken(data.token);
      Auth.setUser(data.user);
      window.location.href = "admin.html";
    } catch (err) {
      alert(err.message || "Unable to sign in as admin.");
      submitBtn.disabled = false;
      submitBtn.textContent = original;
    }
  });
});
