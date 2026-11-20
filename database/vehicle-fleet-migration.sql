USE fieldline;

ALTER TABLE assets
  ADD COLUMN vehicle_type VARCHAR(30) NULL AFTER category,
  ADD COLUMN internal_asset_id VARCHAR(80) NULL AFTER vehicle_type,
  ADD COLUMN fleet_unit_number VARCHAR(80) NULL AFTER internal_asset_id,
  ADD COLUMN vin VARCHAR(32) NULL AFTER fleet_unit_number,
  ADD COLUMN year SMALLINT UNSIGNED NULL AFTER vin,
  ADD COLUMN color VARCHAR(60) NOT NULL DEFAULT '' AFTER year,
  ADD COLUMN fuel_type VARCHAR(40) NOT NULL DEFAULT '' AFTER color,
  ADD COLUMN ownership_type VARCHAR(40) NOT NULL DEFAULT '' AFTER fuel_type,
  ADD COLUMN legal_owner VARCHAR(180) NOT NULL DEFAULT '' AFTER ownership_type,
  ADD COLUMN leasing_company VARCHAR(180) NOT NULL DEFAULT '' AFTER legal_owner,
  ADD COLUMN managing_fmc VARCHAR(180) NOT NULL DEFAULT '' AFTER leasing_company,
  ADD COLUMN fleet_entry_date DATE NULL AFTER managing_fmc,
  ADD COLUMN fleet_exit_date DATE NULL AFTER fleet_entry_date,
  ADD COLUMN acquisition_date DATE NULL AFTER fleet_exit_date,
  ADD COLUMN lease_start_date DATE NULL AFTER acquisition_date,
  ADD COLUMN lease_end_date DATE NULL AFTER lease_start_date,
  ADD UNIQUE KEY assets_internal_asset_id_unique (internal_asset_id),
  ADD UNIQUE KEY assets_vin_unique (vin);

UPDATE assets
SET vehicle_type = CASE
  WHEN category = 'Equipment' THEN 'Equipment'
  WHEN category IN ('Truck', 'Car', 'Trailer') THEN category
  ELSE NULL
END
WHERE vehicle_type IS NULL;

CREATE TABLE vehicle_documents (
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

CREATE TABLE vehicle_ownership (
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

CREATE TABLE vehicle_registrations (
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

CREATE TABLE vehicle_assignments (
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

CREATE TABLE vehicle_events (
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

CREATE TABLE vehicle_mileage (
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
