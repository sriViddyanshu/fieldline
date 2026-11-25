USE fieldline;

CREATE TABLE IF NOT EXISTS geotab_devices (
  device_id VARCHAR(128) PRIMARY KEY,
  asset_id CHAR(36) NULL,
  device_name VARCHAR(180) NOT NULL DEFAULT '',
  serial_number VARCHAR(40) NOT NULL DEFAULT '',
  vin VARCHAR(32) NOT NULL DEFAULT '',
  vehicle_type VARCHAR(30) NOT NULL DEFAULT 'Equipment',
  last_seen_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY geotab_devices_asset_idx (asset_id),
  CONSTRAINT geotab_devices_asset_fk FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS geotab_telemetry (
  id CHAR(36) PRIMARY KEY,
  device_id VARCHAR(128) NOT NULL,
  captured_at DATETIME(3) NOT NULL,
  latitude DECIMAL(10, 7) NULL,
  longitude DECIMAL(10, 7) NULL,
  speed DECIMAL(12, 4) NULL,
  is_driving BOOLEAN NULL,
  location_at DATETIME(3) NULL,
  odometer DECIMAL(18, 3) NULL,
  odometer_at DATETIME(3) NULL,
  KEY geotab_telemetry_device_idx (device_id, captured_at),
  CONSTRAINT geotab_telemetry_device_fk FOREIGN KEY (device_id) REFERENCES geotab_devices(device_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS geotab_sync_runs (
  id CHAR(36) PRIMARY KEY,
  triggered_by VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  devices_seen INT UNSIGNED NOT NULL DEFAULT 0,
  vehicles_created INT UNSIGNED NOT NULL DEFAULT 0,
  telemetry_saved INT UNSIGNED NOT NULL DEFAULT 0,
  error_message VARCHAR(500) NOT NULL DEFAULT '',
  started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  completed_at DATETIME(3) NULL,
  KEY geotab_sync_runs_started_idx (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
