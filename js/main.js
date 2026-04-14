(function () {
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatMoney(amount) {
    if (window.CampingReservationHelpers) {
      return window.CampingReservationHelpers.formatMoney(amount);
    }
    return `${amount} TND`;
  }

  function formatType(type) {
    if (window.CampingReservationHelpers) {
      return window.CampingReservationHelpers.formatType(type);
    }
    if (type === "tiny") return "Tiny House";
    if (type === "emplacement") return "Emplacement nu";
    if (type === "tente") return "Tente standard";
    return type;
  }

  function getHebergementLabel(type, id) {
    if (window.CampingReservationHelpers) {
      return window.CampingReservationHelpers.getHebergementLabel(type, id);
    }
    if (type === "tiny") return `Tiny House ${id}`;
    if (type === "emplacement") return "Emplacement nu";
    if (type === "tente") return "Tente standard";
    return id;
  }

  function setupMenu() {
    const menuBtn = document.getElementById("menuBtn");
    const navLinks = document.getElementById("navLinks");
    if (!menuBtn || !navLinks) return;

    menuBtn.setAttribute("aria-expanded", "false");

    function closeMenu() {
      navLinks.classList.remove("open");
      menuBtn.setAttribute("aria-expanded", "false");
    }

    menuBtn.addEventListener("click", function () {
      const isOpen = navLinks.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", String(isOpen));
    });

    navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", function () {
        closeMenu();
      });
    });

    document.addEventListener("click", function (event) {
      if (!navLinks.classList.contains("open")) return;
      if (navLinks.contains(event.target) || menuBtn.contains(event.target)) return;
      closeMenu();
    });
  }

  function setupFadeIn() {
    const elements = document.querySelectorAll(".fade-in");
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    elements.forEach((element) => observer.observe(element));
  }

  function setupContactForm() {
    const form = document.getElementById("contactForm");
    const feedback = document.getElementById("contactFeedback");
    if (!form || !feedback) return;

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const payload = {
        nom: document.getElementById("nom").value,
        email: document.getElementById("email").value,
        telephone: document.getElementById("telephone").value,
        message: document.getElementById("message").value,
        date: new Date().toISOString()
      };

      const list = JSON.parse(localStorage.getItem("campingOutdoorsContacts") || "[]");
      list.push(payload);
      localStorage.setItem("campingOutdoorsContacts", JSON.stringify(list));
      feedback.innerHTML = '<div class="success">Message envoyé. Nous vous répondrons rapidement.</div>';
      form.reset();
    });
  }

  function setupVerificationForm() {
    const form = document.getElementById("verificationForm");
    const result = document.getElementById("verificationResult");
    if (!form || !result) return;

    if (window.CampingCalendar) {
      window.CampingCalendar.loadReservations();
    }

    function renderReservation(code) {
      const reservations = JSON.parse(localStorage.getItem("campingOutdoorsReservations") || "[]");
      const found = reservations.find((item) => item.id.toUpperCase() === code.toUpperCase());

      if (!found) {
        result.innerHTML = '<div class="warning">Aucune réservation trouvée pour ce code.</div>';
        return;
      }

      const totalPeople = found.personnes.adultes + found.personnes.enfants;
      const statusClass = found.statut === "annulee" ? "warning-pill" : "success-pill";
      const statusLabel = found.statut === "annulee" ? "Annulée" : "Confirmée";
      const optionsLine = found.options && found.options.electricite ? '<p><strong>Option électricité:</strong> Oui</p>' : '';
      const cancelAction = found.statut === "annulee"
        ? '<div class="subtle-note">Cette réservation est déjà annulée.</div>'
        : '<button class="btn btn-primary" id="cancelBtn">Annuler ma réservation (non remboursable)</button>';

      result.innerHTML = `
        <span class="status-pill ${statusClass}">${statusLabel}</span>
        <h3>Détails de la réservation</h3>
        <p><strong>Code:</strong> ${escapeHtml(found.id)}</p>
        <p><strong>Type:</strong> ${formatType(found.type)}</p>
        <p><strong>Hébergement:</strong> ${escapeHtml(getHebergementLabel(found.type, found.hebergement_id))}</p>
        <p><strong>Dates:</strong> ${escapeHtml(found.dates.checkin)} au ${escapeHtml(found.dates.checkout)}</p>
        <p><strong>Voyageurs:</strong> ${totalPeople}</p>
        ${optionsLine}
        <p><strong>Prix:</strong> ${formatMoney(found.prix)}</p>
        <p><strong>Nom:</strong> ${escapeHtml(found.nom)}</p>
        <p><strong>Email:</strong> ${escapeHtml(found.email)}</p>
        <div class="button-row">${cancelAction}</div>
      `;

      const cancelBtn = document.getElementById("cancelBtn");
      if (!cancelBtn) return;

      cancelBtn.addEventListener("click", function () {
        const sure = window.confirm("Confirmer l'annulation ? Cette action est non remboursable.");
        if (!sure) return;

        const updated = reservations.map((item) => {
          if (item.id === found.id) {
            return { ...item, statut: "annulee" };
          }
          return item;
        });
        localStorage.setItem("campingOutdoorsReservations", JSON.stringify(updated));
        window.location.href = `annulation.html?code=${encodeURIComponent(found.id)}`;
      });
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const code = document.getElementById("reservationCode").value.trim().toUpperCase();
      renderReservation(code);
    });

    const params = new URLSearchParams(window.location.search);
    const prefilledCode = params.get("code");
    if (prefilledCode) {
      document.getElementById("reservationCode").value = prefilledCode;
      renderReservation(prefilledCode);
    }
  }

  function setupCopyCodeButton() {
    const copyBtn = document.getElementById("copyCodeBtn");
    if (!copyBtn) return;

    copyBtn.addEventListener("click", async function () {
      const code = copyBtn.dataset.code;
      if (!code) return;

      try {
        await navigator.clipboard.writeText(code);
        copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Code copié';
      } catch (error) {
        copyBtn.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Copie indisponible';
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupMenu();
    setupFadeIn();
    setupContactForm();
    setupVerificationForm();
    setupCopyCodeButton();
  });
})();
