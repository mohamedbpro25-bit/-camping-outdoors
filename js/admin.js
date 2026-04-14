(function () {
  const AUTH_KEY = "campingOutdoorsAdminAuth";
  const AUTH_TOKEN_KEY = "campingOutdoorsAdminToken";
  
  // URLs depuis config globale (définie dans config.js)
  const ADMIN_LOGIN_ENDPOINT = window.APP_CONFIG?.ADMIN_LOGIN || "/api/admin/login";
  const ADMIN_RESERVATIONS_ENDPOINT = window.APP_CONFIG?.ADMIN_RESERVATIONS || "/api/admin/reservations";

  function formatMoney(amount) {
    return `${Number(amount || 0).toFixed(2)} TND`;
  }

  function parseDay(value) {
    if (!value) return null;
    const day = new Date(`${value}T00:00:00`);
    return Number.isNaN(day.getTime()) ? null : day;
  }

  function dateToInput(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function formatDateLabel(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("fr-FR");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeStatus(status) {
    const source = String(status || "pending").toLowerCase();
    if (source.includes("annul") || source.includes("cancel")) return "canceled";
    if (source.includes("confirm") || source.includes("paid") || source.includes("valide")) return "confirmed";
    return "pending";
  }

  function statusLabel(status) {
    const normalized = normalizeStatus(status);
    if (normalized === "confirmed") return "Confirmée";
    if (normalized === "canceled") return "Annulée";
    return "En attente";
  }

  function isRevenueStatus(status) {
    return normalizeStatus(status) !== "canceled";
  }

  function normalizeReservation(item) {
    const createdAt = item.created_at || `${item.dates && item.dates.checkin ? item.dates.checkin : dateToInput(new Date())}T12:00:00`;
    return {
      id: item.id || "-",
      nom: item.nom || "-",
      email: item.email || "-",
      tel: item.tel || "-",
      type: item.type || "-",
      checkin: item.checkin || (item.dates ? item.dates.checkin : "-"),
      checkout: item.checkout || (item.dates ? item.dates.checkout : "-"),
      prix: Number(item.prix || item.amount_tnd || 0),
      statut: normalizeStatus(item.statut || item.status),
      created_at: createdAt
    };
  }

  function localReservations() {
    if (!window.CampingCalendar) return [];
    return window.CampingCalendar.getReservations().map(normalizeReservation);
  }

  async function loadReservations(token) {
    try {
      const response = await fetch(ADMIN_RESERVATIONS_ENDPOINT, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      if (!response.ok) throw new Error("reservations_api_error");
      const payload = await response.json();
      if (!Array.isArray(payload)) throw new Error("invalid_payload");
      return payload.map(normalizeReservation);
    } catch (error) {
      return localReservations();
    }
  }

  async function updateReservationStatus(id, status, token) {
    try {
      const response = await fetch(`${ADMIN_RESERVATIONS_ENDPOINT}/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status })
      });
      if (!response.ok) throw new Error("status_api_error");
      return true;
    } catch (error) {
      if (!window.CampingCalendar) return false;
      const items = window.CampingCalendar.getReservations();
      const next = items.map((item) => {
        if (String(item.id) !== String(id)) return item;
        return { ...item, statut: statusLabel(status) };
      });
      window.CampingCalendar.setReservations(next);
      return true;
    }
  }

  async function deleteReservation(id, token) {
    try {
      const response = await fetch(`${ADMIN_RESERVATIONS_ENDPOINT}/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      if (!response.ok) throw new Error("delete_api_error");
      return true;
    } catch (error) {
      if (!window.CampingCalendar) return false;
      const items = window.CampingCalendar.getReservations();
      const next = items.filter((item) => String(item.id) !== String(id));
      window.CampingCalendar.setReservations(next);
      return true;
    }
  }

  function inRange(value, from, to) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  }

  function collectClients(reservations) {
    const byEmail = new Map();

    reservations.forEach((r) => {
      const key = String(r.email || `${r.nom}-${r.tel}`).trim().toLowerCase();
      const created = new Date(r.created_at);
      if (!byEmail.has(key)) {
        byEmail.set(key, {
          nom: r.nom,
          email: r.email,
          tel: r.tel,
          count: 0,
          spent: 0,
          firstDate: created,
          lastDate: created
        });
      }

      const current = byEmail.get(key);
      current.count += 1;
      if (isRevenueStatus(r.statut)) current.spent += Number(r.prix || 0);

      if (!Number.isNaN(created.getTime())) {
        if (Number.isNaN(current.firstDate.getTime()) || created < current.firstDate) current.firstDate = created;
        if (Number.isNaN(current.lastDate.getTime()) || created > current.lastDate) current.lastDate = created;
      }
    });

    return Array.from(byEmail.values()).sort((a, b) => b.spent - a.spent);
  }

  function sumRevenue(reservations, from, to) {
    return reservations
      .filter((r) => inRange(r.created_at, from, to) && isRevenueStatus(r.statut))
      .reduce((sum, r) => sum + Number(r.prix || 0), 0);
  }

  function startOfWeek(date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
  }

  function renderTableRows(tbody, rows, colspan) {
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="${colspan}" class="muted">Aucune donnée sur cette période.</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.join("");
  }

  function buildRevenueSeries(reservations, from, to) {
    const filtered = reservations.filter((r) => inRange(r.created_at, from, to) && isRevenueStatus(r.statut));
    const byDay = new Map();

    filtered.forEach((r) => {
      const date = new Date(r.created_at);
      if (Number.isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      byDay.set(key, (byDay.get(key) || 0) + Number(r.prix || 0));
    });

    const series = Array.from(byDay.entries())
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .map(([day, amount]) => ({ day, amount }));

    if (series.length <= 28) return series;

    const size = Math.ceil(series.length / 28);
    const compact = [];
    for (let i = 0; i < series.length; i += size) {
      const bucket = series.slice(i, i + size);
      const total = bucket.reduce((sum, point) => sum + point.amount, 0);
      const first = bucket[0].day;
      const last = bucket[bucket.length - 1].day;
      compact.push({
        day: first === last ? first : `${first} -> ${last}`,
        amount: total
      });
    }
    return compact;
  }

  function renderRevenueChart(node, series) {
    if (!node) return;

    if (!series.length) {
      node.innerHTML = '<div class="muted">Aucune donnée de chiffre d\'affaires sur la période sélectionnée.</div>';
      return;
    }

    const maxAmount = Math.max(...series.map((point) => point.amount), 1);
    node.innerHTML = `
      <div class="revenue-chart-bars">
        ${series.map((point) => {
          const height = Math.max(8, Math.round((point.amount / maxAmount) * 160));
          const shortLabel = point.day.includes("->") ? point.day.split(" -> ")[0].slice(5) : point.day.slice(5);
          return `
            <div class="revenue-bar-item" title="${escapeHtml(point.day)} : ${formatMoney(point.amount)}">
              <div class="revenue-bar" style="height:${height}px"></div>
              <div class="revenue-bar-label">${escapeHtml(shortLabel)}</div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function setupAdminPage() {
    const loginSection = document.getElementById("adminLoginSection");
    const dashboardSection = document.getElementById("adminDashboardSection");
    const loginForm = document.getElementById("adminLoginForm");
    const loginMessage = document.getElementById("adminLoginMessage");

    if (!loginSection || !dashboardSection || !loginForm || !loginMessage) return;

    const fromDate = document.getElementById("fromDate");
    const toDate = document.getElementById("toDate");
    const applyRangeBtn = document.getElementById("applyRangeBtn");
    const logoutBtn = document.getElementById("adminLogoutBtn");
    const filterMessage = document.getElementById("adminFilterMessage");
    const clientsCount = document.getElementById("clientsCount");
    const reservationsCount = document.getElementById("reservationsCount");
    const clientsTableBody = document.getElementById("clientsTableBody");
    const reservationsTableBody = document.getElementById("reservationsTableBody");
    const chartPeriodLabel = document.getElementById("chartPeriodLabel");
    const revenueChart = document.getElementById("revenueChart");
    const topClients = document.getElementById("topClients");

    const caDay = document.getElementById("caDay");
    const caWeek = document.getElementById("caWeek");
    const caMonth = document.getElementById("caMonth");
    const caRange = document.getElementById("caRange");
    const totalClients = document.getElementById("totalClients");
    const totalReservations = document.getElementById("totalReservations");
    const averageBasket = document.getElementById("averageBasket");
    const bestClientAmount = document.getElementById("bestClientAmount");

    let from = null;
    let to = null;
    let allReservations = [];

    async function loginWithApi(username, password) {
      const response = await fetch(ADMIN_LOGIN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch (error) {
        payload = null;
      }

      if (!response.ok || !payload || !payload.token) {
        throw new Error("invalid_credentials");
      }

      return payload.token;
    }

    function showDashboard(isAuthed) {
      loginSection.style.display = isAuthed ? "none" : "block";
      dashboardSection.style.display = isAuthed ? "block" : "none";
    }

    async function refreshReservations() {
      const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || "";
      allReservations = await loadReservations(token);
    }

    function render() {
      const filteredReservations = allReservations.filter((r) => inRange(r.created_at, from, to));
      const clients = collectClients(filteredReservations);

      const today = new Date();
      const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const weekStart = startOfWeek(today);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      caDay.textContent = formatMoney(sumRevenue(allReservations, dayStart, dayStart));
      caWeek.textContent = formatMoney(sumRevenue(allReservations, weekStart, today));
      caMonth.textContent = formatMoney(sumRevenue(allReservations, monthStart, today));
      caRange.textContent = formatMoney(sumRevenue(allReservations, from, to));

      totalClients.textContent = String(clients.length);
      totalReservations.textContent = String(filteredReservations.length);

      const rangeRevenue = sumRevenue(allReservations, from, to);
      const basket = filteredReservations.length ? rangeRevenue / filteredReservations.length : 0;
      averageBasket.textContent = formatMoney(basket);
      bestClientAmount.textContent = formatMoney(clients[0] ? clients[0].spent : 0);

      clientsCount.textContent = `${clients.length} client(s)`;
      reservationsCount.textContent = `${filteredReservations.length} réservation(s)`;

      renderTableRows(
        clientsTableBody,
        clients.map((c) => `
          <tr>
            <td>${escapeHtml(c.nom)}</td>
            <td>${escapeHtml(c.email)}</td>
            <td>${escapeHtml(c.tel)}</td>
            <td>${c.count}</td>
            <td>${formatMoney(c.spent)}</td>
            <td>${formatDateLabel(c.firstDate)}</td>
            <td>${formatDateLabel(c.lastDate)}</td>
          </tr>
        `),
        7
      );

      renderTableRows(
        reservationsTableBody,
        filteredReservations
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .map((r) => `
            <tr>
              <td>${escapeHtml(r.id)}</td>
              <td>${escapeHtml(r.nom)}<br /><span class="muted">${escapeHtml(r.email)}</span></td>
              <td>${escapeHtml(r.checkin)} -> ${escapeHtml(r.checkout)}</td>
              <td>${formatMoney(r.prix)}</td>
              <td>
                <span class="status-pill ${r.statut === "confirmed" ? "success-pill" : r.statut === "canceled" ? "warning-pill" : ""}">${statusLabel(r.statut)}</span>
              </td>
              <td>${formatDateLabel(r.created_at)}</td>
              <td>
                <div class="admin-actions-inline">
                  <select data-res-id="${escapeHtml(r.id)}" class="admin-status-select">
                    <option value="pending" ${r.statut === "pending" ? "selected" : ""}>En attente</option>
                    <option value="confirmed" ${r.statut === "confirmed" ? "selected" : ""}>Confirmée</option>
                    <option value="canceled" ${r.statut === "canceled" ? "selected" : ""}>Annulée</option>
                  </select>
                  <button type="button" class="btn btn-secondary admin-action-btn" data-action="save" data-res-id="${escapeHtml(r.id)}">Enregistrer</button>
                  <button type="button" class="btn btn-light admin-action-btn" data-action="delete" data-res-id="${escapeHtml(r.id)}">Supprimer</button>
                </div>
              </td>
            </tr>
          `),
        7
      );

      const fromLabel = from ? from.toLocaleDateString("fr-FR") : "début";
      const toLabel = to ? to.toLocaleDateString("fr-FR") : "aujourd'hui";
      filterMessage.textContent = `Filtre actif: ${fromLabel} -> ${toLabel}`;
      chartPeriodLabel.textContent = `CA affiché du ${fromLabel} au ${toLabel}`;

      const series = buildRevenueSeries(allReservations, from, to);
      renderRevenueChart(revenueChart, series);

      topClients.innerHTML = clients.slice(0, 5).map((client, index) => `
        <article class="top-client-item">
          <div>
            <strong>#${index + 1} ${escapeHtml(client.nom)}</strong>
            <div class="muted">${escapeHtml(client.email)} - ${client.count} réservation(s)</div>
            <div class="muted">Dernière réservation: ${formatDateLabel(client.lastDate)}</div>
          </div>
          <div class="top-client-amount">${formatMoney(client.spent)}</div>
        </article>
      `).join("") || '<p class="muted">Aucun client sur la période sélectionnée.</p>';
    }

    async function applyAndRender() {
      await refreshReservations();
      render();
    }

    function setPeriod(period) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (period === "today") {
        from = today;
        to = today;
      } else if (period === "week") {
        from = startOfWeek(today);
        to = today;
      } else if (period === "month") {
        from = new Date(today.getFullYear(), today.getMonth(), 1);
        to = today;
      } else {
        from = null;
        to = null;
      }

      fromDate.value = from ? dateToInput(from) : "";
      toDate.value = to ? dateToInput(to) : "";
      applyAndRender();
    }

    document.querySelectorAll("[data-period]").forEach((button) => {
      button.addEventListener("click", function () {
        setPeriod(button.dataset.period);
      });
    });

    applyRangeBtn.addEventListener("click", function () {
      const fromValue = parseDay(fromDate.value);
      const toValue = parseDay(toDate.value);

      if (fromValue && toValue && toValue < fromValue) {
        filterMessage.textContent = "La date de fin doit être supérieure ou égale à la date de début.";
        return;
      }

      from = fromValue;
      to = toValue;
      applyAndRender();
    });

    reservationsTableBody.addEventListener("click", async function (event) {
      const actionNode = event.target.closest("[data-action]");
      if (!actionNode) return;

      const action = actionNode.dataset.action;
      const reservationId = actionNode.dataset.resId;
      if (!reservationId) return;

      const token = sessionStorage.getItem(AUTH_TOKEN_KEY) || "";

      if (action === "save") {
        const select = reservationsTableBody.querySelector(`select[data-res-id="${CSS.escape(reservationId)}"]`);
        if (!select) return;
        const success = await updateReservationStatus(reservationId, select.value, token);
        filterMessage.textContent = success
          ? `Statut mis à jour pour la réservation ${reservationId}.`
          : `Impossible de modifier la réservation ${reservationId}.`;
        await applyAndRender();
      }

      if (action === "delete") {
        const confirmed = window.confirm(`Supprimer la réservation ${reservationId} ? Cette action est irréversible.`);
        if (!confirmed) return;
        const success = await deleteReservation(reservationId, token);
        filterMessage.textContent = success
          ? `Réservation ${reservationId} supprimée.`
          : `Impossible de supprimer la réservation ${reservationId}.`;
        await applyAndRender();
      }
    });

    logoutBtn.addEventListener("click", function () {
      sessionStorage.removeItem(AUTH_KEY);
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
      showDashboard(false);
      loginForm.reset();
      loginMessage.innerHTML = '<div class="subtle-note">Déconnecté de l\'espace admin.</div>';
    });

    loginForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      const username = document.getElementById("adminUsername").value.trim().toLowerCase().normalize("NFKC");
      const password = document.getElementById("adminPassword").value.trim().normalize("NFKC");

      try {
        const token = await loginWithApi(username, password);
        sessionStorage.setItem(AUTH_TOKEN_KEY, token);
        sessionStorage.setItem(AUTH_KEY, "true");
        showDashboard(true);
        loginMessage.innerHTML = "";
        await applyAndRender();
      } catch (error) {
        loginMessage.innerHTML = '<div class="warning">Connexion admin impossible. Vérifiez vos identifiants ou la disponibilité de l\'API backend.</div>';
      }
    });

    const isAuthed = sessionStorage.getItem(AUTH_KEY) === "true";
    showDashboard(isAuthed);
    if (isAuthed) {
      applyAndRender();
    }
  }

  document.addEventListener("DOMContentLoaded", setupAdminPage);
})();
