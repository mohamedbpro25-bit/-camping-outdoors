-- Reporting queries for admin dashboard (PostgreSQL)

-- 1) Revenue of current day
SELECT COALESCE(SUM(amount_tnd), 0) AS revenue_day
FROM reservations
WHERE status = 'confirmed'
  AND created_at::date = CURRENT_DATE;

-- 2) Revenue of current week (Monday -> today)
SELECT COALESCE(SUM(amount_tnd), 0) AS revenue_week
FROM reservations
WHERE status = 'confirmed'
  AND created_at::date >= date_trunc('week', CURRENT_DATE)::date
  AND created_at::date <= CURRENT_DATE;

-- 3) Revenue of current month
SELECT COALESCE(SUM(amount_tnd), 0) AS revenue_month
FROM reservations
WHERE status = 'confirmed'
  AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE);

-- 4) Revenue for a custom range (bind :from_date and :to_date)
SELECT COALESCE(SUM(amount_tnd), 0) AS revenue_range
FROM reservations
WHERE status = 'confirmed'
  AND created_at::date BETWEEN :from_date AND :to_date;

-- 5) Client list with reservation count
SELECT
  c.id,
  c.full_name,
  c.email,
  c.phone,
  COUNT(r.id) AS reservations_count
FROM clients c
LEFT JOIN reservations r ON r.client_id = c.id
GROUP BY c.id, c.full_name, c.email, c.phone
ORDER BY reservations_count DESC, c.full_name ASC;

-- 6) Reservation list
SELECT
  r.reservation_code,
  c.full_name AS client_name,
  c.email,
  c.phone,
  r.lodging_type,
  r.lodging_ref,
  r.checkin_date,
  r.checkout_date,
  r.adults,
  r.children,
  r.amount_tnd,
  r.status,
  r.created_at
FROM reservations r
JOIN clients c ON c.id = r.client_id
ORDER BY r.created_at DESC;
