document.addEventListener("DOMContentLoaded", async () => {
  const user = Auth.getUser();
  if (!user || user.role !== "admin") {
    window.location.href = "dashboard.html";
    return;
  }

  try {
    const { stats } = await apiFetch("/api/admin/stats");
    document.getElementById("statUsers").textContent = stats.users;
    document.getElementById("statBotanists").textContent = stats.botanists;
    document.getElementById("statAdmins").textContent = stats.admins;
    document.getElementById("statDiagnoses").textContent = stats.diagnoses;
  } catch (err) {
    console.error(err);
  }

  try {
    const { users } = await apiFetch("/api/admin/users");
    const container = document.getElementById("usersTable");
    container.innerHTML = `
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="text-align:left;border-bottom:1px solid #e5e7eb;">
            <th style="padding:.5rem">Name</th>
            <th style="padding:.5rem">Email</th>
            <th style="padding:.5rem">Role</th>
            <th style="padding:.5rem">Status</th>
            <th style="padding:.5rem">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${users.map((u) => `
            <tr>
              <td style="padding:.5rem">${u.name}</td>
              <td style="padding:.5rem">${u.email}</td>
              <td style="padding:.5rem">${u.role}</td>
              <td style="padding:.5rem">${u.role === "botanist" ? (u.approved ? "Approved" : "Pending") : "—"}</td>
              <td style="padding:.5rem">
                ${u.role === "botanist"
                  ? `<button type="button" class="btn btn-outline-green" data-approve="${u.id}" style="margin-right:.5rem">Approve</button><button type="button" class="btn btn-ghost" data-reject="${u.id}">Reject</button>`
                  : "—"
                }
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    container.querySelectorAll("[data-approve]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-approve");
        btn.disabled = true;
        btn.textContent = "Working...";
        try {
          await apiFetch(`/api/admin/botanists/${id}/approve`, { method: "POST" });
          location.reload();
        } catch (err) {
          btn.disabled = false;
          btn.textContent = "Approve";
          alert(err.message || "Could not approve botanist.");
        }
      });
    });

    container.querySelectorAll("[data-reject]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-reject");
        btn.disabled = true;
        btn.textContent = "Working...";
        try {
          await apiFetch(`/api/admin/botanists/${id}/reject`, { method: "POST" });
          location.reload();
        } catch (err) {
          btn.disabled = false;
          btn.textContent = "Reject";
          alert(err.message || "Could not reject botanist.");
        }
      });
    });
  } catch (err) {
    document.getElementById("usersTable").innerHTML = `<p class="text-muted">${err.message}</p>`;
  }
});
