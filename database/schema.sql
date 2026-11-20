CREATE DATABASE IF NOT EXISTS fieldline
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE fieldline;

CREATE TABLE IF NOT EXISTS sites (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  site_type VARCHAR(60) NOT NULL DEFAULT 'Facility',
  address VARCHAR(500) NOT NULL DEFAULT '',
  status VARCHAR(40) NOT NULL DEFAULT 'Active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS assets (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  category VARCHAR(60) NOT NULL DEFAULT 'Truck',
  vehicle_type VARCHAR(30) NULL,
  internal_asset_id VARCHAR(80) NULL,
  fleet_unit_number VARCHAR(80) NULL,
  vin VARCHAR(32) NULL,
  year SMALLINT UNSIGNED NULL,
  color VARCHAR(60) NOT NULL DEFAULT '',
  fuel_type VARCHAR(40) NOT NULL DEFAULT '',
  ownership_type VARCHAR(40) NOT NULL DEFAULT '',
  legal_owner VARCHAR(180) NOT NULL DEFAULT '',
  leasing_company VARCHAR(180) NOT NULL DEFAULT '',
  managing_fmc VARCHAR(180) NOT NULL DEFAULT '',
  fleet_entry_date DATE NULL,
  fleet_exit_date DATE NULL,
  acquisition_date DATE NULL,
  lease_start_date DATE NULL,
  lease_end_date DATE NULL,
  external_ref VARCHAR(120) NULL,
  manufacturer VARCHAR(120) NOT NULL DEFAULT '',
  model VARCHAR(120) NOT NULL DEFAULT '',
  serial VARCHAR(120) NOT NULL DEFAULT '',
  site_id CHAR(36) NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'Active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY assets_internal_asset_id_unique (internal_asset_id),
  UNIQUE KEY assets_vin_unique (vin),
  UNIQUE KEY assets_external_ref_unique (external_ref),
  CONSTRAINT assets_site_fk FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS vehicle_documents (
  id CHAR(36) PRIMARY KEY,
  asset_id CHAR(36) NOT NULL,
  document_type VARCHAR(40) NOT NULL,
  reference VARCHAR(180) NOT NULL DEFAULT '',
  issuing_party VARCHAR(180) NOT NULL DEFAULT '',
  issue_date DATE NULL,
  expiration_date DATE NULL,
  file_url VARCHAR(1000) NOT NULL DEFAULT '',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY vehicle_documents_asset_idx (asset_id, created_at),
  CONSTRAINT vehicle_documents_asset_fk FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS vehicle_ownership (
  id CHAR(36) PRIMARY KEY,
  asset_id CHAR(36) NOT NULL,
  legal_owner VARCHAR(180) NOT NULL DEFAULT '',
  leasing_company VARCHAR(180) NOT NULL DEFAULT '',
  managing_fmc VARCHAR(180) NOT NULL DEFAULT '',
  ownership_type VARCHAR(40) NOT NULL DEFAULT '',
  fleet_entry_date DATE NULL,
  fleet_exit_date DATE NULL,
  acquisition_date DATE NULL,
  lease_start_date DATE NULL,
  lease_end_date DATE NULL,
  effective_start DATE NOT NULL,
  effective_end DATE NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY vehicle_ownership_effective_idx (asset_id, effective_start, effective_end),
  CONSTRAINT vehicle_ownership_asset_fk FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS vehicle_registrations (
  id CHAR(36) PRIMARY KEY,
  asset_id CHAR(36) NOT NULL,
  plate_number VARCHAR(40) NOT NULL,
  issuing_state VARCHAR(80) NOT NULL DEFAULT '',
  plate_type VARCHAR(60) NOT NULL DEFAULT '',
  registration_expiration DATE NULL,
  effective_start DATE NULL,
  effective_end DATE NULL,
  document_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY vehicle_registrations_effective_idx (asset_id, effective_start, effective_end),
  CONSTRAINT vehicle_registrations_asset_fk FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  CONSTRAINT vehicle_registrations_document_fk FOREIGN KEY (document_id) REFERENCES vehicle_documents(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS vehicle_assignments (
  id CHAR(36) PRIMARY KEY,
  asset_id CHAR(36) NOT NULL,
  customer VARCHAR(180) NOT NULL DEFAULT '',
  contract VARCHAR(180) NOT NULL DEFAULT '',
  assignment_status VARCHAR(20) NOT NULL DEFAULT 'Assigned',
  assigned_driver VARCHAR(180) NOT NULL DEFAULT '',
  driver_pool VARCHAR(180) NOT NULL DEFAULT '',
  branch VARCHAR(180) NOT NULL DEFAULT '',
  yard VARCHAR(180) NOT NULL DEFAULT '',
  assignment_start DATETIME(3) NOT NULL,
  assignment_end DATETIME(3) NULL,
  handover_notes TEXT NOT NULL,
  handover_document_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY vehicle_assignments_effective_idx (asset_id, assignment_start, assignment_end),
  CONSTRAINT vehicle_assignments_asset_fk FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  CONSTRAINT vehicle_assignments_document_fk FOREIGN KEY (handover_document_id) REFERENCES vehicle_documents(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS vehicle_events (
  id CHAR(36) PRIMARY KEY,
  asset_id CHAR(36) NOT NULL,
  event_type VARCHAR(40) NOT NULL,
  effective_at DATETIME(3) NOT NULL,
  reason TEXT NOT NULL,
  report_reference VARCHAR(180) NOT NULL DEFAULT '',
  reported_start DATETIME(3) NULL,
  reported_end DATETIME(3) NULL,
  recovery_at DATETIME(3) NULL,
  handover_at DATETIME(3) NULL,
  evidence_document_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY vehicle_events_effective_idx (asset_id, effective_at),
  CONSTRAINT vehicle_events_asset_fk FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  CONSTRAINT vehicle_events_document_fk FOREIGN KEY (evidence_document_id) REFERENCES vehicle_documents(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS vehicle_mileage (
  id CHAR(36) PRIMARY KEY,
  asset_id CHAR(36) NOT NULL,
  reading DECIMAL(14,2) NOT NULL,
  unit VARCHAR(12) NOT NULL DEFAULT 'km',
  reading_at DATETIME(3) NOT NULL,
  source VARCHAR(40) NOT NULL,
  notes VARCHAR(500) NOT NULL DEFAULT '',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY vehicle_mileage_timeline_idx (asset_id, reading_at),
  CONSTRAINT vehicle_mileage_asset_fk FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS work_orders (
  id CHAR(36) PRIMARY KEY,
  title VARCHAR(240) NOT NULL,
  asset_id CHAR(36) NULL,
  priority VARCHAR(40) NOT NULL DEFAULT 'Normal',
  assigned_to VARCHAR(180) NOT NULL DEFAULT '',
  due_date DATE NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'Open',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT work_orders_asset_fk FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS incidents (
  id CHAR(36) PRIMARY KEY,
  title VARCHAR(240) NOT NULL,
  asset_id CHAR(36) NULL,
  severity VARCHAR(40) NOT NULL DEFAULT 'Medium',
  description TEXT NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'Open',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT incidents_asset_fk FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS fieldline_auth_config (
  id TINYINT UNSIGNED PRIMARY KEY,
  setup_complete BOOLEAN NOT NULL DEFAULT FALSE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO fieldline_auth_config (id, setup_complete)
VALUES (1, FALSE)
ON DUPLICATE KEY UPDATE id = VALUES(id);

CREATE TABLE IF NOT EXISTS fieldline_users (
  id CHAR(36) PRIMARY KEY,
  display_name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'administrator',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY fieldline_users_email_unique (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS fieldline_sessions (
  token_hash CHAR(64) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY fieldline_sessions_expiry_idx (expires_at),
  CONSTRAINT fieldline_sessions_user_fk FOREIGN KEY (user_id)
    REFERENCES fieldline_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- After running this schema, the database administrator should create an
-- application user scoped to the Fieldline host's actual source IP.
-- Replace both placeholders; do not use the MySQL root account for the app.
-- CREATE USER 'fieldline_app'@'<FIELDLINE_CLIENT_IP>'
--   IDENTIFIED BY '<GENERATE_AND_SHARE_SECURELY>';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON fieldline.*
--   TO 'fieldline_app'@'<FIELDLINE_CLIENT_IP>';
-- FLUSH PRIVILEGES;
