-- MySQL Schema pour Camping Outdoors
-- Exécute ce script dans ta base MySQL pour initialiser

CREATE TABLE IF NOT EXISTS clients (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  phone VARCHAR(40) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  INDEX idx_email (email)
);

CREATE TABLE IF NOT EXISTS admin_users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(60) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  last_login_at TIMESTAMP NULL,
  INDEX idx_username (username)
);

-- Seed admin user avec bcrypt hash de "Diablox9@"
INSERT INTO admin_users (username, password_hash, is_active)
VALUES ('Admin', '$2a$10$Y0Ie0112jGoflcLIyo4VSObCT4ABhhyG8z9pQPpAVPBzuC1IH5wiS', TRUE)
ON DUPLICATE KEY UPDATE is_active = TRUE;

CREATE TABLE IF NOT EXISTS reservations (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  reservation_code VARCHAR(40) NOT NULL UNIQUE,
  client_id BIGINT NOT NULL,
  lodging_type VARCHAR(30) NOT NULL,
  checkin_date DATE NOT NULL,
  checkout_date DATE NOT NULL,
  adults SMALLINT NOT NULL DEFAULT 1,
  children SMALLINT NOT NULL DEFAULT 0,
  electricity_option BOOLEAN DEFAULT FALSE,
  notes TEXT,
  amount_tnd DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'confirmed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  canceled_at TIMESTAMP NULL,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
  CHECK (checkout_date > checkin_date),
  CHECK (adults >= 1),
  CHECK (children >= 0),
  CHECK (status IN ('pending','confirmed','canceled')),
  INDEX idx_created_at (created_at),
  INDEX idx_status (status),
  INDEX idx_client_id (client_id),
  INDEX idx_reservation_code (reservation_code)
);

-- Données d'exemple (optionnel)
-- Pour tester avec données réelles, décommente les lignes suivantes:

/*
INSERT INTO clients (full_name, email, phone) VALUES
('Nadia Abassi', 'nadia@email.tn', '+216 91 234 567'),
('Karim Mansouri', 'karim@email.tn', '+216 92 345 678'),
('Inès Ben Ali', 'ines@email.tn', '+216 93 456 789');

INSERT INTO reservations (reservation_code, client_id, lodging_type, checkin_date, checkout_date, adults, children, electricity_option, amount_tnd, status)
VALUES
('CAMP-2026-ABC01', 1, 'tiny_house', '2026-04-20', '2026-04-24', 2, 1, 0, 400.00, 'confirmed'),
('CAMP-2026-ABC02', 2, 'emplacement', '2026-04-25', '2026-04-27', 4, 0, 1, 60.00, 'confirmed'),
('CAMP-2026-ABC03', 3, 'tente', '2026-05-01', '2026-05-03', 2, 0, 0, 30.00, 'confirmed');
*/
