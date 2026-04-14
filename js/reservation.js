(function () {
  const PENDING_KEY = "campingOutdoorsPendingReservation";
  const LAST_CONFIRMATION_KEY = "campingOutdoorsLastConfirmation";
  const ELECTRICITY_RATE = 8;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  const tinyCatalog = {
    1: { price: 100, capacity: 2 },
    2: { price: 100, capacity: 2 },
    3: { price: 200, capacity: 4 },
    4: { price: 200, capacity: 4 },
    5: { price: 200, capacity: 4 },
    6: { price: 300, capacity: 6 },
    7: { price: 300, capacity: 6 },
    8: { price: 300, capacity: 6 }
  };

  const flatCatalog = {
    emplacement: { price: 10, capacity: 6 },
    tente: { price: 15, capacity: 3 }
  };

  function safeParse(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch (error) {
      return null;
    }
  }

  function getNights(checkin, checkout) {
    if (!checkin || !checkout) return 0;
    const start = new Date(`${checkin}T00:00:00`);
    const end = new Date(`${checkout}T00:00:00`);
    const ms = end - start;
    return ms > 0 ? Math.round(ms / 86400000) : 0;
  }

  function isSummerStay(checkin, checkout) {
    if (!checkin || !checkout) return false;
    const start = new Date(`${checkin}T00:00:00`);
    const end = new Date(`${checkout}T00:00:00`);
    const cursor = new Date(start);

    while (cursor < end) {
      const month = cursor.getMonth() + 1;
      if (month === 7 || month === 8) return true;
      cursor.setDate(cursor.getDate() + 1);
    }

    return false;
  }

  function formatMoney(amount) {
    return `${amount} TND`;
  }

  function formatType(type) {
    if (type === "tiny") return "Tiny House";
    if (type === "emplacement") return "Emplacement nu";
    if (type === "tente") return "Tente standard";
    return "-";
  }

  function getHebergementLabel(type, hebergementId) {
    if (type === "tiny") return `Tiny House ${hebergementId}`;
    if (type === "emplacement") return "Emplacement nu";
    if (type === "tente") return "Tente standard";
    return "-";
  }

  function getCapacity(type, tinyId) {
    if (type === "tiny") {
      return tinyCatalog[tinyId] ? tinyCatalog[tinyId].capacity : 2;
    }
    return flatCatalog[type] ? flatCatalog[type].capacity : 0;
  }

  function getBaseUnitPrice(type, tinyId, checkin, checkout) {
    if (type === "tiny") {
      const base = tinyCatalog[tinyId] ? tinyCatalog[tinyId].price : 100;
      return isSummerStay(checkin, checkout) ? base * 2 : base;
    }
    return flatCatalog[type] ? flatCatalog[type].price : 0;
  }

  function buildPricing(payload) {
    const nights = getNights(payload.checkin, payload.checkout);
    const baseUnit = getBaseUnitPrice(payload.type, payload.tinyChoice, payload.checkin, payload.checkout);
    const baseTotal = baseUnit * nights;
    const electricityTotal = payload.type === "emplacement" && payload.electricite ? ELECTRICITY_RATE * nights : 0;
    const total = baseTotal + electricityTotal;

    return {
      nights,
      baseUnit,
      baseTotal,
      electricityTotal,
      total,
      summer: isSummerStay(payload.checkin, payload.checkout)
    };
  }

  function generateCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const reservations = window.CampingCalendar ? window.CampingCalendar.getReservations() : [];
    const year = new Date().getFullYear();
    let code = "";

    do {
      let suffix = "";
      for (let index = 0; index < 5; index += 1) {
        suffix += chars[Math.floor(Math.random() * chars.length)];
      }
      code = `CAMP-${year}-${suffix}`;
    } while (reservations.some((item) => item.id === code));

    return code;
  }

  function savePendingReservation(payload) {
    localStorage.setItem(PENDING_KEY, JSON.stringify(payload));
  }

  function getPendingReservation() {
    return safeParse(PENDING_KEY);
  }

  function clearPendingReservation() {
    localStorage.removeItem(PENDING_KEY);
  }

  function saveConfirmedReservation(pending) {
    const existing = window.CampingCalendar.getReservations();
    const finalReservation = {
      ...pending,
      id: generateCode(),
      created_at: new Date().toISOString(),
      statut: "confirmee"
    };
    existing.push(finalReservation);
    window.CampingCalendar.setReservations(existing);
    localStorage.setItem(LAST_CONFIRMATION_KEY, JSON.stringify(finalReservation));
    return finalReservation;
  }

  function renderReservationSummary(data) {
    const pricing = buildPricing(data);
    if (!data.type || !pricing.nights) {
      return "Complétez le formulaire pour voir le détail du séjour.";
    }

    const hebergementLabel = getHebergementLabel(data.type, data.type === "tiny" ? data.tinyChoice : data.hebergement_id);
    const peopleTotal = data.adultes + data.enfants;
    const extrasLabel = pricing.electricityTotal ? `<p><strong>Supplément électricité:</strong> ${formatMoney(pricing.electricityTotal)}</p>` : "";
    const seasonLabel = pricing.summer ? "Tarif été appliqué" : "Tarif hors été appliqué";

    return `
      <span class="status-pill success-pill">${seasonLabel}</span>
      <p><strong>Type:</strong> ${formatType(data.type)}</p>
      <p><strong>Hébergement:</strong> ${escapeHtml(hebergementLabel)}</p>
      <p><strong>Séjour:</strong> ${escapeHtml(data.checkin)} au ${escapeHtml(data.checkout)}</p>
      <p><strong>Nuits:</strong> ${pricing.nights}</p>
      <p><strong>Voyageurs:</strong> ${peopleTotal} (${data.adultes} adultes, ${data.enfants} enfants)</p>
      <p><strong>Prix de base:</strong> ${formatMoney(pricing.baseUnit)} / nuit</p>
      ${extrasLabel}
      <div class="summary-total"><span>Total estimé</span><strong>${formatMoney(pricing.total)}</strong></div>
    `;
  }

  function renderAvailabilityPreview(type, tinyId) {
    const preview = document.getElementById("availabilityPreview");
    if (!preview || !window.CampingCalendar || !type) return;

    const hebergementId = type === "tiny" ? tinyId : type === "emplacement" ? "terrain" : "standard";
    const ranges = window.CampingCalendar.getBlockedRanges(type, hebergementId);

    if (!ranges.length) {
      preview.innerHTML = '<div class="availability-item">Aucune période bloquée enregistrée pour le moment.</div>';
      return;
    }

    preview.innerHTML = ranges
      .map((range) => `<div class="availability-item"><strong>${escapeHtml(range.checkin)}</strong> → <strong>${escapeHtml(range.checkout)}</strong><br />Réservation ${escapeHtml(range.id)}</div>`)
      .join("");
  }

  function setupReservationPage() {
    const form = document.getElementById("reservationForm");
    if (!form || !window.CampingCalendar) return;

    window.CampingCalendar.loadReservations();

    const typeHebergement = document.getElementById("typeHebergement");
    const tinyWrap = document.getElementById("tinyChoiceWrap");
    const tinyChoice = document.getElementById("tinyChoice");
    const electricityWrap = document.getElementById("electricityWrap");
    const electricite = document.getElementById("electricite");
    const checkin = document.getElementById("checkin");
    const checkout = document.getElementById("checkout");
    const adultes = document.getElementById("adultes");
    const enfants = document.getElementById("enfants");
    const summaryContent = document.getElementById("summaryContent");
    const reserveBtn = document.getElementById("reserveBtn");
    const groupMessage = document.getElementById("groupMessage");
    const capacityMessage = document.getElementById("capacityMessage");
    const dateMessage = document.getElementById("dateMessage");
    const notesClient = document.getElementById("notesClient");

    window.CampingCalendar.setupDateInputs(checkin, checkout);

    const params = new URLSearchParams(window.location.search);
    if (params.get("type")) typeHebergement.value = params.get("type");
    if (params.get("tiny")) tinyChoice.value = params.get("tiny");

    function getPayload() {
      const type = typeHebergement.value;
      const hebergementId = type === "tiny" ? tinyChoice.value : type === "emplacement" ? "terrain" : "standard";
      return {
        type,
        hebergement_id: hebergementId,
        tinyChoice: Number(tinyChoice.value),
        checkin: checkin.value,
        checkout: checkout.value,
        adultes: Number(adultes.value || 0),
        enfants: Number(enfants.value || 0),
        electricite: Boolean(electricite && electricite.checked),
        notes: notesClient ? notesClient.value.trim() : ""
      };
    }

    function updateVisibility() {
      const isTiny = typeHebergement.value === "tiny";
      const isEmplacement = typeHebergement.value === "emplacement";
      tinyWrap.style.display = isTiny ? "flex" : "none";
      tinyChoice.required = isTiny;
      electricityWrap.style.display = isEmplacement ? "block" : "none";
      if (!isEmplacement) {
        electricite.checked = false;
      }
      renderAvailabilityPreview(typeHebergement.value, tinyChoice.value);
    }

    function updateGroupBlocking(totalPeople) {
      if (totalPeople >= 6) {
        groupMessage.innerHTML = '<div class="warning">Pour les groupes de 6 personnes ou plus, veuillez nous contacter. <a href="contact.html"><strong>Contacter l\'équipe</strong></a></div>';
        reserveBtn.disabled = true;
        return true;
      }

      groupMessage.innerHTML = "";
      reserveBtn.disabled = false;
      return false;
    }

    function updateCapacityMessage(payload) {
      if (!payload.type) {
        capacityMessage.innerHTML = "";
        return false;
      }

      const totalPeople = payload.adultes + payload.enfants;
      const capacity = getCapacity(payload.type, payload.tinyChoice);
      if (totalPeople > capacity) {
        capacityMessage.innerHTML = `<div class="warning">La capacité maximale de ${escapeHtml(getHebergementLabel(payload.type, payload.hebergement_id))} est de ${capacity} personne(s).</div>`;
        reserveBtn.disabled = true;
        return true;
      }

      capacityMessage.innerHTML = `<div class="subtle-note">Capacité maximale pour cette option: ${capacity} personne(s).</div>`;
      return false;
    }

    function updateSummary() {
      updateVisibility();
      const payload = getPayload();
      summaryContent.innerHTML = renderReservationSummary(payload);
      const totalPeople = payload.adultes + payload.enfants;
      const groupBlocked = updateGroupBlocking(totalPeople);
      const capacityBlocked = updateCapacityMessage(payload);
      if (!groupBlocked && !capacityBlocked) {
        reserveBtn.disabled = false;
      }
    }

    [typeHebergement, tinyChoice, electricite, checkin, checkout, adultes, enfants, notesClient].forEach((element) => {
      if (!element) return;
      element.addEventListener("change", updateSummary);
      element.addEventListener("input", updateSummary);
    });

    updateSummary();

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const payload = getPayload();
      const totalPeople = payload.adultes + payload.enfants;

      if (updateGroupBlocking(totalPeople)) return;
      if (updateCapacityMessage(payload)) return;

      const dateValidation = window.CampingCalendar.validateDateRange(payload.checkin, payload.checkout);
      if (!dateValidation.valid) {
        checkin.setAttribute("aria-invalid", "true");
        checkout.setAttribute("aria-invalid", "true");
        dateMessage.innerHTML = `<div class="warning">${dateValidation.message}</div>`;
        return;
      }

      checkin.setAttribute("aria-invalid", "false");
      checkout.setAttribute("aria-invalid", "false");

      const available = window.CampingCalendar.isRangeAvailable(payload.type, payload.hebergement_id, payload.checkin, payload.checkout);
      if (!available) {
        checkin.setAttribute("aria-invalid", "true");
        checkout.setAttribute("aria-invalid", "true");
        dateMessage.innerHTML = '<div class="warning">Dates déjà réservées pour cet hébergement. Choisissez une autre période.</div>';
        return;
      }

      dateMessage.innerHTML = "";
      checkin.setAttribute("aria-invalid", "false");
      checkout.setAttribute("aria-invalid", "false");

      const pricing = buildPricing(payload);
      const pending = {
        id: null,
        type: payload.type,
        hebergement_id: payload.hebergement_id,
        dates: { checkin: payload.checkin, checkout: payload.checkout },
        personnes: { adultes: payload.adultes, enfants: payload.enfants },
        options: { electricite: payload.electricite },
        notes: payload.notes,
        pricing,
        prix: pricing.total,
        nom: document.getElementById("nomClient").value.trim(),
        email: document.getElementById("emailClient").value.trim(),
        tel: document.getElementById("telClient").value.trim(),
        statut: "en_attente"
      };

      savePendingReservation(pending);
      window.location.href = "paiement.html";
    });
  }

  function setupPaymentPage() {
    const summaryNode = document.getElementById("paymentSummary");
    const payButton = document.getElementById("payNowBtn");
    if (!summaryNode || !payButton || !window.CampingCalendar) return;

    window.CampingCalendar.loadReservations();

    const pending = getPendingReservation();
    if (!pending) {
      summaryNode.innerHTML = '<p class="warning">Aucune réservation en attente. Veuillez recommencer.</p>';
      payButton.disabled = true;
      return;
    }

    const electricityLine = pending.options && pending.options.electricite
      ? `<p><strong>Option électricité:</strong> ${formatMoney(pending.pricing.electricityTotal)}</p>`
      : "";

    summaryNode.innerHTML = `
      <h3>Récapitulatif avant paiement</h3>
      <p><strong>Nom:</strong> ${escapeHtml(pending.nom)}</p>
      <p><strong>Type:</strong> ${formatType(pending.type)}</p>
      <p><strong>Hébergement:</strong> ${escapeHtml(getHebergementLabel(pending.type, pending.hebergement_id))}</p>
      <p><strong>Séjour:</strong> ${escapeHtml(pending.dates.checkin)} au ${escapeHtml(pending.dates.checkout)}</p>
      <p><strong>Nuits:</strong> ${pending.pricing.nights}</p>
      <p><strong>Voyageurs:</strong> ${pending.personnes.adultes + pending.personnes.enfants}</p>
      <p><strong>Base:</strong> ${formatMoney(pending.pricing.baseTotal)}</p>
      ${electricityLine}
      <div class="summary-total"><span>Total à payer</span><strong>${formatMoney(pending.prix)}</strong></div>
    `;

    payButton.addEventListener("click", function () {
      const finalReservation = saveConfirmedReservation(pending);
      clearPendingReservation();
      window.location.href = `confirmation.html?code=${encodeURIComponent(finalReservation.id)}`;
    });
  }

  function setupConfirmationPage() {
    const node = document.getElementById("confirmationResult");
    if (!node || !window.CampingCalendar) return;

    window.CampingCalendar.loadReservations();

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const reservations = window.CampingCalendar.getReservations();
    const current = reservations.find((item) => item.id === code) || safeParse(LAST_CONFIRMATION_KEY);

    if (!current) {
      node.innerHTML = '<div class="warning">Impossible de charger la confirmation.</div>';
      return;
    }

    const verifyLink = document.getElementById("verifyReservationBtn");
    if (verifyLink) {
      verifyLink.href = `verification.html?code=${encodeURIComponent(current.id)}`;
    }

    const copyBtn = document.getElementById("copyCodeBtn");
    if (copyBtn) {
      copyBtn.dataset.code = current.id;
    }

    const electricityLine = current.options && current.options.electricite
      ? `<p><strong>Option électricité:</strong> Oui</p>`
      : "";

    node.innerHTML = `
      <div class="success"><p><strong>Numéro de réservation:</strong> ${escapeHtml(current.id)}</p></div>
      <p><strong>Type:</strong> ${formatType(current.type)}</p>
      <p><strong>Hébergement:</strong> ${escapeHtml(getHebergementLabel(current.type, current.hebergement_id))}</p>
      <p><strong>Dates:</strong> ${escapeHtml(current.dates.checkin)} au ${escapeHtml(current.dates.checkout)}</p>
      <p><strong>Voyageurs:</strong> ${current.personnes.adultes + current.personnes.enfants}</p>
      ${electricityLine}
      <p><strong>Prix total:</strong> ${formatMoney(current.prix)}</p>
      <p><strong>Statut:</strong> ${escapeHtml(current.statut)}</p>
    `;
  }

  function setupAnnulationPage() {
    const infoNode = document.getElementById("cancelInfo");
    if (!infoNode) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) {
      infoNode.innerHTML = "Aucun code transmis.";
      return;
    }

    const reservations = window.CampingCalendar ? window.CampingCalendar.getReservations() : [];
    const found = reservations.find((item) => item.id === code);
    infoNode.innerHTML = `
      <p><strong>Réservation:</strong> ${escapeHtml(code)}</p>
      <p><strong>Statut:</strong> annulée (non remboursable)</p>
      <p><strong>Hébergement:</strong> ${found ? escapeHtml(getHebergementLabel(found.type, found.hebergement_id)) : "-"}</p>
    `;
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupReservationPage();
    setupPaymentPage();
    setupConfirmationPage();
    setupAnnulationPage();
  });

  window.CampingReservationHelpers = {
    formatMoney,
    formatType,
    getHebergementLabel
  };
})();
