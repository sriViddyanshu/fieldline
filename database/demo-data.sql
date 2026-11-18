USE fieldline;

-- Clearly labeled sample records for a new Fieldline database.
-- These are fictional and are not copied from Yard or any other system.
START TRANSACTION;

INSERT INTO sites (id, name, site_type, address, status)
VALUES (
  '10000000-0000-4000-8000-000000000001',
  'Demo Service Depot',
  'Depot',
  'Sample location - replace with your site',
  'Active'
);

INSERT INTO assets (
  id, name, category, vehicle_type, internal_asset_id, fleet_unit_number, vin, year, color, fuel_type,
  ownership_type, legal_owner, fleet_entry_date, external_ref, manufacturer, model, serial, site_id, status
) VALUES
(
  '20000000-0000-4000-8000-000000000001',
  'Demo Delivery Van',
  'Car',
  'Car',
  'DEMO-ASSET-001',
  'DEMO-UNIT-001',
  'DEMO-VIN-00000000001',
  2022,
  'White',
  'Gasoline',
  'Owned',
  'Demo Fleet LLC',
  CURRENT_DATE,
  'DEMO-VEH-001',
  'Ford',
  'Transit',
  'DEMO-SERIAL-001',
  '10000000-0000-4000-8000-000000000001',
  'In service'
),
(
  '20000000-0000-4000-8000-000000000003',
  'Demo Utility Trailer',
  'Trailer',
  'Trailer',
  'DEMO-ASSET-003',
  'DEMO-UNIT-003',
  'DEMO-VIN-00000000003',
  2020,
  'Silver',
  'None',
  'Leased',
  'Demo Leasing Co.',
  CURRENT_DATE,
  'DEMO-TRL-003',
  'Demo Trailer Works',
  'Cargo 16',
  'DEMO-SERIAL-003',
  '10000000-0000-4000-8000-000000000001',
  'In yard'
),
(
  '20000000-0000-4000-8000-000000000002',
  'Demo Utility Generator',
  'Equipment',
  'Equipment',
  'DEMO-ASSET-002',
  'DEMO-UNIT-002',
  'DEMO-VIN-00000000002',
  2021,
  'Yellow',
  'Diesel',
  'Owned',
  'Demo Fleet LLC',
  CURRENT_DATE,
  'DEMO-EQP-002',
  'Demo Manufacturer',
  'Portable 5kW',
  'DEMO-SERIAL-002',
  '10000000-0000-4000-8000-000000000001',
  'Out for maintenance'
);

INSERT INTO vehicle_documents (id, asset_id, document_type, reference, issuing_party, issue_date, expiration_date, file_url)
VALUES (
  '50000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'Registration',
  'DEMO-REG-001',
  'Sample motor vehicle department',
  CURRENT_DATE,
  DATE_ADD(CURRENT_DATE, INTERVAL 1 YEAR),
  ''
);

INSERT INTO vehicle_ownership (
  id, asset_id, legal_owner, ownership_type, fleet_entry_date, acquisition_date, effective_start
) VALUES (
  '51000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'Demo Fleet LLC',
  'Owned',
  CURRENT_DATE,
  CURRENT_DATE,
  CURRENT_DATE
);

INSERT INTO vehicle_registrations (
  id, asset_id, plate_number, issuing_state, plate_type, registration_expiration, effective_start, document_id
) VALUES (
  '52000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'DEMO-001',
  'Sample State',
  'Commercial',
  DATE_ADD(CURRENT_DATE, INTERVAL 1 YEAR),
  CURRENT_DATE,
  '50000000-0000-4000-8000-000000000001'
);

INSERT INTO vehicle_assignments (
  id, asset_id, customer, contract, assigned_driver, branch, yard, assignment_start, handover_notes
) VALUES (
  '53000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'Sample Customer',
  'DEMO-CONTRACT-001',
  'Sample Driver',
  'Demo Branch',
  'Demo Service Depot',
  CURRENT_TIMESTAMP(3),
  'Fictional example handover record.'
);

INSERT INTO vehicle_events (id, asset_id, event_type, effective_at, reason, handover_at)
VALUES (
  '54000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'In service',
  CURRENT_TIMESTAMP(3),
  'Fictional sample lifecycle event.',
  NULL
);

INSERT INTO vehicle_mileage (id, asset_id, reading, unit, reading_at, source, notes)
VALUES (
  '55000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  24500.00,
  'km',
  CURRENT_TIMESTAMP(3),
  'Manual entry',
  'Fictional sample reading.'
);

INSERT INTO work_orders (
  id, title, asset_id, priority, assigned_to, due_date, status
) VALUES (
  '30000000-0000-4000-8000-000000000001',
  'Demo inspection - delivery van',
  '20000000-0000-4000-8000-000000000001',
  'Normal',
  'Sample technician',
  DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY),
  'Open'
);

INSERT INTO incidents (id, title, asset_id, severity, description, status)
VALUES (
  '40000000-0000-4000-8000-000000000001',
  'Demo maintenance alert',
  '20000000-0000-4000-8000-000000000002',
  'Medium',
  'Sample record only - no real incident.',
  'Open'
);

COMMIT;

SELECT 'sites' AS table_name, COUNT(*) AS sample_rows FROM sites
WHERE id = '10000000-0000-4000-8000-000000000001'
UNION ALL
SELECT 'assets', COUNT(*) FROM assets WHERE external_ref LIKE 'DEMO-%'
UNION ALL
SELECT 'work_orders', COUNT(*) FROM work_orders
WHERE id = '30000000-0000-4000-8000-000000000001'
UNION ALL
SELECT 'incidents', COUNT(*) FROM incidents
WHERE id = '40000000-0000-4000-8000-000000000001';
