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
      <div class="table-wrap">
        <table class="admin-users-table" style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="padding:.75rem 1rem">Name</th>
              <th style="padding:.75rem 1rem">Email</th>
              <th style="padding:.75rem 1rem">Role</th>
              <th style="padding:.75rem 1rem">Status</th>
              <th style="padding:.75rem 1rem">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${users.map((u) => `
              <tr>
                <td style="padding:.75rem 1rem">${u.name}</td>
                <td style="padding:.75rem 1rem">${u.email}</td>
                <td style="padding:.75rem 1rem" class="table-role">${u.role}</td>
                <td style="padding:.75rem 1rem">
                  ${u.role === "botanist"
                    ? `<span class="badge ${u.approved ? "badge-green" : "badge-orange"} table-status">${u.approved ? "Approved" : "Pending"}</span>`
                    : '<span class="badge badge-blue table-status">Active</span>'
                  }
                </td>
                <td style="padding:.75rem 1rem">
                  ${u.role === "botanist"
                    ? `<button type="button" class="btn btn-outline-green btn-sm" data-approve="${u.id}" style="margin-right:.5rem">Approve</button><button type="button" class="btn btn-ghost btn-sm" data-reject="${u.id}">Reject</button>`
                    : "—"
                  }
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
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
