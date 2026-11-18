USE fieldline;

CREATE TABLE IF NOT EXISTS fleet_customers (
  id CHAR(36) PRIMARY KEY,
  account_number VARCHAR(100) NULL,
  name VARCHAR(180) NOT NULL,
  operating_location VARCHAR(240) NOT NULL DEFAULT '',
  contact_name VARCHAR(160) NOT NULL DEFAULT '',
  email VARCHAR(254) NOT NULL DEFAULT '',
  phone VARCHAR(50) NOT NULL DEFAULT '',
  status VARCHAR(30) NOT NULL DEFAULT 'Active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY fleet_customers_account_unique (account_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS fleet_contracts (
  id CHAR(36) PRIMARY KEY,
  customer_id CHAR(36) NOT NULL,
  contract_number VARCHAR(120) NOT NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  covered_units TEXT NOT NULL,
  toll_payer VARCHAR(30) NOT NULL DEFAULT 'Customer',
  violation_payer VARCHAR(30) NOT NULL DEFAULT 'Customer',
  maintenance_payer VARCHAR(30) NOT NULL DEFAULT 'Customer',
  other_charge_payer VARCHAR(30) NOT NULL DEFAULT 'Customer',
  rules_notes TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY fleet_contracts_customer_number_unique (customer_id, contract_number),
  CONSTRAINT fleet_contracts_customer_fk FOREIGN KEY (customer_id) REFERENCES fleet_customers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS fleet_drivers (
  id CHAR(36) PRIMARY KEY,
  driver_id VARCHAR(100) NOT NULL,
  customer_id CHAR(36) NULL,
  employer VARCHAR(180) NOT NULL DEFAULT '',
  name VARCHAR(160) NOT NULL,
  email VARCHAR(254) NOT NULL DEFAULT '',
  phone VARCHAR(50) NOT NULL DEFAULT '',
  status VARCHAR(30) NOT NULL DEFAULT 'Active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY fleet_drivers_driver_id_unique (driver_id),
  CONSTRAINT fleet_drivers_customer_fk FOREIGN KEY (customer_id) REFERENCES fleet_customers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS fleet_driver_assignments (
  id CHAR(36) PRIMARY KEY,
  vehicle_id CHAR(36) NOT NULL,
  driver_id CHAR(36) NULL,
  customer_id CHAR(36) NULL,
  contract_id CHAR(36) NULL,
  assignment_start DATETIME(3) NOT NULL,
  assignment_end DATETIME(3) NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Assigned',
  handover_notes TEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY fleet_driver_assignments_vehicle_date_idx (vehicle_id, assignment_start),
  CONSTRAINT fleet_driver_assignments_vehicle_fk FOREIGN KEY (vehicle_id) REFERENCES assets(id),
  CONSTRAINT fleet_driver_assignments_driver_fk FOREIGN KEY (driver_id) REFERENCES fleet_drivers(id) ON DELETE SET NULL,
  CONSTRAINT fleet_driver_assignments_customer_fk FOREIGN KEY (customer_id) REFERENCES fleet_customers(id) ON DELETE SET NULL,
  CONSTRAINT fleet_driver_assignments_contract_fk FOREIGN KEY (contract_id) REFERENCES fleet_contracts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS toll_accounts (
  id CHAR(36) PRIMARY KEY,
  provider VARCHAR(180) NOT NULL,
  authority VARCHAR(180) NOT NULL DEFAULT '',
  account_reference VARCHAR(120) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Active',
  notes VARCHAR(1000) NOT NULL DEFAULT '',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY toll_accounts_reference_unique (provider, account_reference)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS toll_transponders (
  id CHAR(36) PRIMARY KEY,
  toll_account_id CHAR(36) NOT NULL,
  transponder_id VARCHAR(120) NOT NULL,
  vehicle_id CHAR(36) NULL,
  plate_number VARCHAR(40) NOT NULL DEFAULT '',
  effective_start DATE NOT NULL,
  effective_end DATE NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY toll_transponders_assignment_unique (toll_account_id, transponder_id, effective_start),
  CONSTRAINT toll_transponders_account_fk FOREIGN KEY (toll_account_id) REFERENCES toll_accounts(id),
  CONSTRAINT toll_transponders_vehicle_fk FOREIGN KEY (vehicle_id) REFERENCES assets(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS toll_transactions (
  id CHAR(36) PRIMARY KEY,
  authority VARCHAR(180) NOT NULL,
  toll_account_id CHAR(36) NULL,
  transponder_id VARCHAR(120) NOT NULL DEFAULT '',
  vehicle_id CHAR(36) NULL,
  plate_number VARCHAR(40) NOT NULL DEFAULT '',
  transaction_reference VARCHAR(180) NOT NULL,
  toll_at DATETIME(3) NOT NULL,
  location VARCHAR(300) NOT NULL DEFAULT '',
  amount DECIMAL(12,2) NOT NULL,
  posting_status VARCHAR(30) NOT NULL DEFAULT 'Posted',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY toll_transactions_authority_reference_unique (authority, transaction_reference),
  KEY toll_transactions_vehicle_date_idx (vehicle_id, toll_at),
  CONSTRAINT toll_transactions_account_fk FOREIGN KEY (toll_account_id) REFERENCES toll_accounts(id) ON DELETE SET NULL,
  CONSTRAINT toll_transactions_vehicle_fk FOREIGN KEY (vehicle_id) REFERENCES assets(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS toll_violations (
  id CHAR(36) PRIMARY KEY,
  managing_fmc VARCHAR(180) NOT NULL,
  authority VARCHAR(180) NOT NULL,
  notice_number VARCHAR(180) NOT NULL,
  vehicle_id CHAR(36) NULL,
  transaction_id CHAR(36) NULL,
  plate_shown VARCHAR(40) NOT NULL DEFAULT '',
  event_at DATETIME(3) NULL,
  event_details TEXT NOT NULL,
  amount DECIMAL(12,2) NULL,
  deadline DATE NULL,
  verification_status VARCHAR(40) NOT NULL DEFAULT 'Pending',
  evidence_link VARCHAR(1000) NOT NULL DEFAULT '',
  recommendation TEXT NOT NULL,
  approval_status VARCHAR(40) NOT NULL DEFAULT 'Pending',
  authority_outcome VARCHAR(80) NOT NULL DEFAULT '',
  case_status VARCHAR(40) NOT NULL DEFAULT 'Open',
  case_owner VARCHAR(160) NOT NULL DEFAULT '',
  next_action VARCHAR(500) NOT NULL DEFAULT '',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY toll_violations_notice_unique (managing_fmc, authority, notice_number),
  KEY toll_violations_vehicle_idx (vehicle_id),
  CONSTRAINT toll_violations_vehicle_fk FOREIGN KEY (vehicle_id) REFERENCES assets(id) ON DELETE SET NULL,
  CONSTRAINT toll_violations_transaction_fk FOREIGN KEY (transaction_id) REFERENCES toll_transactions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS fleet_payments (
  id CHAR(36) PRIMARY KEY,
  violation_id CHAR(36) NULL,
  vehicle_id CHAR(36) NULL,
  customer_id CHAR(36) NULL,
  payment_type VARCHAR(30) NOT NULL,
  paid_party VARCHAR(180) NOT NULL DEFAULT '',
  payment_reference VARCHAR(180) NOT NULL DEFAULT '',
  amount DECIMAL(12,2) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Pending',
  paid_at DATETIME(3) NULL,
  receipt_link VARCHAR(1000) NOT NULL DEFAULT '',
  reconciliation_notes TEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY fleet_payments_violation_idx (violation_id),
  CONSTRAINT fleet_payments_violation_fk FOREIGN KEY (violation_id) REFERENCES toll_violations(id) ON DELETE SET NULL,
  CONSTRAINT fleet_payments_vehicle_fk FOREIGN KEY (vehicle_id) REFERENCES assets(id) ON DELETE SET NULL,
  CONSTRAINT fleet_payments_customer_fk FOREIGN KEY (customer_id) REFERENCES fleet_customers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS fleet_maintenance (
  id CHAR(36) PRIMARY KEY,
  vehicle_id CHAR(36) NOT NULL,
  work_order_id CHAR(36) NULL,
  service_type VARCHAR(60) NOT NULL,
  schedule_date DATE NULL,
  due_date DATE NULL,
  due_mileage DECIMAL(14,2) NULL,
  mileage_unit VARCHAR(12) NOT NULL DEFAULT 'km',
  vendor VARCHAR(180) NOT NULL DEFAULT '',
  repairs TEXT NOT NULL,
  cost DECIMAL(12,2) NULL,
  downtime_start DATETIME(3) NULL,
  downtime_end DATETIME(3) NULL,
  inspection_result VARCHAR(60) NOT NULL DEFAULT '',
  status VARCHAR(30) NOT NULL DEFAULT 'Scheduled',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY fleet_maintenance_vehicle_date_idx (vehicle_id, due_date),
  CONSTRAINT fleet_maintenance_vehicle_fk FOREIGN KEY (vehicle_id) REFERENCES assets(id),
  CONSTRAINT fleet_maintenance_work_order_fk FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS fleet_trips (
  id CHAR(36) PRIMARY KEY,
  vehicle_id CHAR(36) NOT NULL,
  device_id VARCHAR(120) NOT NULL DEFAULT '',
  assignment_start DATETIME(3) NULL,
  assignment_end DATETIME(3) NULL,
  trip_start DATETIME(3) NOT NULL,
  trip_end DATETIME(3) NULL,
  distance DECIMAL(14,2) NULL,
  distance_unit VARCHAR(12) NOT NULL DEFAULT 'km',
  start_location VARCHAR(300) NOT NULL DEFAULT '',
  end_location VARCHAR(300) NOT NULL DEFAULT '',
  evidence_link VARCHAR(1000) NOT NULL DEFAULT '',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY fleet_trips_vehicle_date_idx (vehicle_id, trip_start),
  CONSTRAINT fleet_trips_vehicle_fk FOREIGN KEY (vehicle_id) REFERENCES assets(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS fleet_tasks (
  id CHAR(36) PRIMARY KEY,
  vehicle_id CHAR(36) NULL,
  violation_id CHAR(36) NULL,
  case_owner VARCHAR(160) NOT NULL DEFAULT '',
  next_action VARCHAR(500) NOT NULL,
  due_at DATETIME(3) NULL,
  evidence_request VARCHAR(1000) NOT NULL DEFAULT '',
  status VARCHAR(30) NOT NULL DEFAULT 'Open',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fleet_tasks_vehicle_fk FOREIGN KEY (vehicle_id) REFERENCES assets(id) ON DELETE SET NULL,
  CONSTRAINT fleet_tasks_violation_fk FOREIGN KEY (violation_id) REFERENCES toll_violations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS fleet_approvals (
  id CHAR(36) PRIMARY KEY,
  task_id CHAR(36) NULL,
  violation_id CHAR(36) NULL,
  approver VARCHAR(160) NOT NULL,
  decision VARCHAR(30) NOT NULL DEFAULT 'Pending',
  decided_at DATETIME(3) NULL,
  notes TEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fleet_approvals_task_fk FOREIGN KEY (task_id) REFERENCES fleet_tasks(id) ON DELETE SET NULL,
  CONSTRAINT fleet_approvals_violation_fk FOREIGN KEY (violation_id) REFERENCES toll_violations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS fleet_activity_log (
  id CHAR(36) PRIMARY KEY,
  vehicle_id CHAR(36) NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id CHAR(36) NOT NULL,
  action VARCHAR(20) NOT NULL,
  actor_id CHAR(36) NULL,
  actor_name VARCHAR(120) NOT NULL DEFAULT '',
  actor_type VARCHAR(20) NOT NULL DEFAULT 'person',
  change_data JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY fleet_activity_vehicle_date_idx (vehicle_id, created_at),
  KEY fleet_activity_entity_idx (entity_type, entity_id, created_at),
  CONSTRAINT fleet_activity_vehicle_fk FOREIGN KEY (vehicle_id) REFERENCES assets(id) ON DELETE SET NULL,
  CONSTRAINT fleet_activity_actor_fk FOREIGN KEY (actor_id) REFERENCES fieldline_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
