(function () {
  const KEY = "campingOutdoorsReservations";

  function parseDate(value) {
    const parts = value.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function overlaps(aStart, aEnd, bStart, bEnd) {
    return aStart < bEnd && bStart < aEnd;
  }

  function getReservations() {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY)) || [];
      const cleaned = parsed.filter((item) => {
        const isDemoClient = String(item.nom || "").toLowerCase() === "exemple client"
          && String(item.email || "").toLowerCase() === "demo@camping-outdoors.tn";
        return !isDemoClient;
      });

      if (cleaned.length !== parsed.length) {
        localStorage.setItem(KEY, JSON.stringify(cleaned));
      }

      return cleaned;
    } catch (error) {
      return [];
    }
  }

  function setReservations(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function loadReservations() {
    const reservations = getReservations();
    if (!reservations.length) return;
    setReservations(reservations);
  }

  function isPastDate(dateString) {
    const selected = parseDate(dateString);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return selected < now;
  }

  function validateDateRange(checkin, checkout) {
    if (!checkin || !checkout) {
      return { valid: false, message: "Veuillez sélectionner les deux dates." };
    }

    if (isPastDate(checkin) || isPastDate(checkout)) {
      return { valid: false, message: "Les dates passées ne sont pas autorisées." };
    }

    const inDate = parseDate(checkin);
    const outDate = parseDate(checkout);

    if (outDate <= inDate) {
      return { valid: false, message: "Le séjour doit être d'au moins 1 nuit." };
    }

    return { valid: true, message: "Dates valides." };
  }

  function isRangeAvailable(type, hebergementId, checkin, checkout, ignoreId) {
    const reservations = getReservations().filter((item) => item.statut !== "annulee");
    const wantedStart = parseDate(checkin);
    const wantedEnd = parseDate(checkout);

    return !reservations.some((item) => {
      if (ignoreId && item.id === ignoreId) return false;
      if (item.type !== type) return false;
      if (type === "tiny" && String(item.hebergement_id) !== String(hebergementId)) return false;

      const bookedStart = parseDate(item.dates.checkin);
      const bookedEnd = parseDate(item.dates.checkout);
      return overlaps(wantedStart, wantedEnd, bookedStart, bookedEnd);
    });
  }

  function setupDateInputs(checkinInput, checkoutInput) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const minDate = `${yyyy}-${mm}-${dd}`;

    checkinInput.min = minDate;
    checkoutInput.min = minDate;

    checkinInput.addEventListener("change", function () {
      checkoutInput.min = checkinInput.value || minDate;
    });
  }

  function getBlockedRanges(type, hebergementId) {
    return getReservations()
      .filter((item) => item.statut !== "annulee")
      .filter((item) => item.type === type)
      .filter((item) => type !== "tiny" || String(item.hebergement_id) === String(hebergementId))
      .map((item) => ({
        id: item.id,
        checkin: item.dates.checkin,
        checkout: item.dates.checkout
      }));
  }

  window.CampingCalendar = {
    KEY,
    getReservations,
    setReservations,
    loadReservations,
    validateDateRange,
    isRangeAvailable,
    setupDateInputs,
    getBlockedRanges
  };
})();
