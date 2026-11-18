USE fieldline;

-- Fictional demo fixtures for exercising Fieldline create, edit, and list flows.
-- Re-running this script refreshes only records with stable demo fixture IDs.
START TRANSACTION;

DROP TEMPORARY TABLE IF EXISTS fieldline_test_sequence;
CREATE TEMPORARY TABLE fieldline_test_sequence (n TINYINT UNSIGNED PRIMARY KEY);
INSERT INTO fieldline_test_sequence (n)
VALUES (1), (2), (3), (4), (5), (6), (7), (8), (9), (10);

INSERT INTO sites (id, name, site_type, address, status)
VALUES (
  '61000000-0000-4000-8000-000000000001',
  'Riverton Fleet Service Yard (Demo)',
  'Depot',
  'Industrial district, Riverton, OH (fictional demo location)',
  'Active'
)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  site_type = VALUES(site_type),
  address = VALUES(address),
  status = VALUES(status);

INSERT INTO assets (
  id, name, category, vehicle_type, internal_asset_id, fleet_unit_number, vin, year, color, fuel_type,
  ownership_type, legal_owner, leasing_company, managing_fmc, fleet_entry_date, acquisition_date,
  external_ref, manufacturer, model, serial, site_id, status
)
SELECT
  CONCAT('62000000-0000-4000-8000-', LPAD(n, 12, '0')),
  CASE n
    WHEN 1 THEN 'Demo Fleet Tractor 101 - North Route'
    WHEN 2 THEN 'Demo Fleet Tractor 102 - East Route'
    WHEN 3 THEN 'Demo Fleet Tractor 103 - Regional'
    WHEN 4 THEN 'Demo Fleet Pickup 201 - Field Team'
    WHEN 5 THEN 'Demo Fleet Sedan 202 - Pool'
    WHEN 6 THEN 'Demo Fleet Refrigerated Trailer 301'
    WHEN 7 THEN 'Demo Fleet Dry Van Trailer 302'
    WHEN 8 THEN 'Demo Fleet Excavator 401 - Site A'
    WHEN 9 THEN 'Demo Fleet Skid Steer 402 - Yard'
    ELSE 'Demo Fleet Boom Lift 403 - Site B'
  END,
  CASE WHEN n <= 3 THEN 'Truck' WHEN n <= 5 THEN 'Car' WHEN n <= 7 THEN 'Trailer' ELSE 'Equipment' END,
  CASE WHEN n <= 3 THEN 'Truck' WHEN n <= 5 THEN 'Car' WHEN n <= 7 THEN 'Trailer' ELSE 'Equipment' END,
  CONCAT('FLEET-DEMO-ASSET-', LPAD(n, 3, '0')),
  CASE WHEN n <= 3 THEN CONCAT('FLEET-DEMO-TRK-', 100 + n)
    WHEN n <= 5 THEN CONCAT('FLEET-DEMO-LDV-', 197 + n)
    WHEN n <= 7 THEN CONCAT('FLEET-DEMO-TRL-', 295 + n)
    ELSE CONCAT('FLEET-DEMO-EQP-', 393 + n)
  END,
  CONCAT('DEMO', LPAD(n, 13, '0')),
  CASE n WHEN 1 THEN 2022 WHEN 2 THEN 2021 WHEN 3 THEN 2020 WHEN 4 THEN 2023
    WHEN 5 THEN 2022 WHEN 6 THEN 2023 WHEN 7 THEN 2021 WHEN 8 THEN 2022
    WHEN 9 THEN 2020 ELSE 2024 END,
  CASE WHEN n IN (1, 3, 6, 8) THEN 'White'
    WHEN n IN (2, 5, 7) THEN 'Silver'
    WHEN n IN (4, 9) THEN 'Blue' ELSE 'Yellow' END,
  CASE WHEN n <= 3 OR n >= 8 THEN 'Diesel' WHEN n <= 5 THEN 'Gasoline' ELSE 'None' END,
  CASE MOD(n, 2) WHEN 0 THEN 'Owned' ELSE 'Leased' END,
  'Riverton Fleet Holdings (Demo)',
  CASE MOD(n, 2) WHEN 0 THEN '' ELSE 'Pioneer Commercial Leasing (Demo)' END,
  'Northstar Fleet Management (Demo)',
  DATE_SUB(CURRENT_DATE, INTERVAL (n * 30) DAY),
  DATE_SUB(CURRENT_DATE, INTERVAL (n * 45) DAY),
  CONCAT('TEST-FLEET-REF-', LPAD(n, 2, '0')),
  CASE n
    WHEN 1 THEN 'Freightliner' WHEN 2 THEN 'Kenworth' WHEN 3 THEN 'International'
    WHEN 4 THEN 'Ford' WHEN 5 THEN 'Toyota' WHEN 6 THEN 'Great Dane'
    WHEN 7 THEN 'Utility' WHEN 8 THEN 'Caterpillar' WHEN 9 THEN 'Bobcat'
    ELSE 'JLG'
  END,
  CASE n
    WHEN 1 THEN 'Cascadia' WHEN 2 THEN 'T680' WHEN 3 THEN 'LT'
    WHEN 4 THEN 'F-150 XL' WHEN 5 THEN 'Camry LE' WHEN 6 THEN 'Everest Reefer'
    WHEN 7 THEN '3000R Dry Van' WHEN 8 THEN '320 Excavator'
    WHEN 9 THEN 'S650 Skid-Steer' ELSE '450AJ Boom Lift'
  END,
  CONCAT('FLEET-DEMO-SERIAL-', LPAD(n, 3, '0')),
  '61000000-0000-4000-8000-000000000001',
  CASE n WHEN 3 THEN 'Out for maintenance' WHEN 5 THEN 'In yard'
    WHEN 9 THEN 'Out for maintenance' ELSE 'In service' END
FROM fieldline_test_sequence
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  category = VALUES(category),
  vehicle_type = VALUES(vehicle_type),
  internal_asset_id = VALUES(internal_asset_id),
  fleet_unit_number = VALUES(fleet_unit_number),
  vin = VALUES(vin),
  year = VALUES(year),
  color = VALUES(color),
  fuel_type = VALUES(fuel_type),
  ownership_type = VALUES(ownership_type),
  legal_owner = VALUES(legal_owner),
  leasing_company = VALUES(leasing_company),
  managing_fmc = VALUES(managing_fmc),
  fleet_entry_date = VALUES(fleet_entry_date),
  acquisition_date = VALUES(acquisition_date),
  external_ref = VALUES(external_ref),
  manufacturer = VALUES(manufacturer),
  model = VALUES(model),
  serial = VALUES(serial),
  site_id = VALUES(site_id),
  status = VALUES(status);

INSERT INTO fleet_customers (id, account_number, name, operating_location, contact_name, email, phone, status)
VALUES
  ('61100000-0000-4000-8000-000000000001', 'TEST-FLEET-CUST-01', 'Northstar Freight (Demo)', 'Riverton, OH', 'Fleet Contact 01 (Demo)', 'contact01@example.test', '+1-202-555-0101', 'Active'),
  ('61100000-0000-4000-8000-000000000002', 'TEST-FLEET-CUST-02', 'Cedar Ridge Transport (Demo)', 'Lakeview, OH', 'Fleet Contact 02 (Demo)', 'contact02@example.test', '+1-202-555-0102', 'Active'),
  ('61100000-0000-4000-8000-000000000003', 'TEST-FLEET-CUST-03', 'Summit Site Services (Demo)', 'Fairview, OH', 'Fleet Contact 03 (Demo)', 'contact03@example.test', '+1-202-555-0103', 'Active')
ON DUPLICATE KEY UPDATE
  account_number = VALUES(account_number),
  name = VALUES(name),
  operating_location = VALUES(operating_location),
  contact_name = VALUES(contact_name),
  email = VALUES(email),
  phone = VALUES(phone),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP(3);

INSERT INTO fleet_contracts (
  id, customer_id, contract_number, start_date, end_date, covered_units,
  toll_payer, violation_payer, maintenance_payer, other_charge_payer, rules_notes, status
)
SELECT
  CONCAT('61200000-0000-4000-8000-', LPAD(n, 12, '0')),
  CONCAT('61100000-0000-4000-8000-', LPAD(MOD(n - 1, 3) + 1, 12, '0')),
  CONCAT('DEMO-CONT-', YEAR(CURRENT_DATE), '-', LPAD(n, 3, '0')),
  DATE_SUB(CURRENT_DATE, INTERVAL 180 DAY),
  DATE_ADD(CURRENT_DATE, INTERVAL 180 DAY),
  CONCAT('FLEET-DEMO-ASSET-', LPAD(n, 3, '0')),
  CASE MOD(n, 2) WHEN 0 THEN 'FMC' ELSE 'Customer' END,
  'Customer',
  CASE MOD(n, 2) WHEN 0 THEN 'Owner' ELSE 'Customer' END,
  'Customer',
  'Demo fleet coverage; tolls billed to the customer, violations reviewed by fleet operations.',
  'Active'
FROM fieldline_test_sequence
ON DUPLICATE KEY UPDATE
  customer_id = VALUES(customer_id),
  contract_number = VALUES(contract_number),
  start_date = VALUES(start_date),
  end_date = VALUES(end_date),
  covered_units = VALUES(covered_units),
  toll_payer = VALUES(toll_payer),
  violation_payer = VALUES(violation_payer),
  maintenance_payer = VALUES(maintenance_payer),
  other_charge_payer = VALUES(other_charge_payer),
  rules_notes = VALUES(rules_notes),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP(3);

INSERT INTO fleet_drivers (id, driver_id, customer_id, employer, name, email, phone, status)
SELECT
  CONCAT('61300000-0000-4000-8000-', LPAD(n, 12, '0')),
  CONCAT('DEMO-DRV-', LPAD(n, 3, '0')),
  CONCAT('61100000-0000-4000-8000-', LPAD(MOD(n - 1, 3) + 1, 12, '0')),
  CASE MOD(n - 1, 3) WHEN 0 THEN 'Northstar Freight (Demo)' WHEN 1 THEN 'Cedar Ridge Transport (Demo)' ELSE 'Summit Site Services (Demo)' END,
  CONCAT('Fleet Driver ', LPAD(n, 2, '0'), ' (Demo)'),
  CONCAT('driver', LPAD(n, 2, '0'), '@example.test'),
  CONCAT('+1-202-555-01', LPAD(20 + n, 2, '0')),
  CASE MOD(n, 5) WHEN 0 THEN 'Inactive' ELSE 'Active' END
FROM fieldline_test_sequence
ON DUPLICATE KEY UPDATE
  driver_id = VALUES(driver_id),
  customer_id = VALUES(customer_id),
  employer = VALUES(employer),
  name = VALUES(name),
  email = VALUES(email),
  phone = VALUES(phone),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP(3);

INSERT INTO fleet_driver_assignments (
  id, vehicle_id, driver_id, customer_id, contract_id, assignment_start, assignment_end, status, handover_notes
)
SELECT
  CONCAT('61400000-0000-4000-8000-', LPAD(n, 12, '0')),
  CONCAT('62000000-0000-4000-8000-', LPAD(n, 12, '0')),
  CONCAT('61300000-0000-4000-8000-', LPAD(n, 12, '0')),
  CONCAT('61100000-0000-4000-8000-', LPAD(MOD(n - 1, 3) + 1, 12, '0')),
  CONCAT('61200000-0000-4000-8000-', LPAD(n, 12, '0')),
  DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL n DAY),
  CASE WHEN MOD(n, 3) = 0 THEN DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 1 DAY) ELSE NULL END,
  CASE WHEN MOD(n, 3) = 0 THEN 'Ended' ELSE 'Assigned' END,
  CONCAT('Demo handover: vehicle condition and keys verified for Driver ', LPAD(n, 2, '0'))
FROM fieldline_test_sequence
ON DUPLICATE KEY UPDATE
  vehicle_id = VALUES(vehicle_id),
  driver_id = VALUES(driver_id),
  customer_id = VALUES(customer_id),
  contract_id = VALUES(contract_id),
  assignment_start = VALUES(assignment_start),
  assignment_end = VALUES(assignment_end),
  status = VALUES(status),
  handover_notes = VALUES(handover_notes),
  updated_at = CURRENT_TIMESTAMP(3);

INSERT INTO toll_accounts (id, provider, authority, account_reference, status, notes)
VALUES
  ('61500000-0000-4000-8000-000000000001', 'Midstate Toll Services (Demo)', 'Ohio Turnpike Authority (Demo)', 'DEMO-TOLL-ACCOUNT-01', 'Active', 'Fictional account for toll workflow testing.'),
  ('61500000-0000-4000-8000-000000000002', 'Great Lakes Toll Network (Demo)', 'River County Expressway (Demo)', 'DEMO-TOLL-ACCOUNT-02', 'Active', 'Fictional account for toll workflow testing.')
ON DUPLICATE KEY UPDATE
  provider = VALUES(provider),
  authority = VALUES(authority),
  account_reference = VALUES(account_reference),
  status = VALUES(status),
  notes = VALUES(notes),
  updated_at = CURRENT_TIMESTAMP(3);

INSERT INTO toll_transponders (
  id, toll_account_id, transponder_id, vehicle_id, plate_number, effective_start, effective_end, status
)
SELECT
  CONCAT('61600000-0000-4000-8000-', LPAD(n, 12, '0')),
  CONCAT('61500000-0000-4000-8000-', LPAD(MOD(n - 1, 2) + 1, 12, '0')),
  CONCAT('DEMO-TRANSPONDER-', LPAD(n, 3, '0')),
  CONCAT('62000000-0000-4000-8000-', LPAD(n, 12, '0')),
  CONCAT('OH-DEMO-', 100 + n),
  DATE_SUB(CURRENT_DATE, INTERVAL (n * 14) DAY),
  CASE WHEN MOD(n, 4) = 0 THEN DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY) ELSE NULL END,
  CASE WHEN MOD(n, 4) = 0 THEN 'Returned' ELSE 'Active' END
FROM fieldline_test_sequence
ON DUPLICATE KEY UPDATE
  toll_account_id = VALUES(toll_account_id),
  transponder_id = VALUES(transponder_id),
  vehicle_id = VALUES(vehicle_id),
  plate_number = VALUES(plate_number),
  effective_start = VALUES(effective_start),
  effective_end = VALUES(effective_end),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP(3);

INSERT INTO toll_transactions (
  id, authority, toll_account_id, transponder_id, vehicle_id, plate_number, transaction_reference,
  toll_at, location, amount, posting_status
)
SELECT
  CONCAT('61700000-0000-4000-8000-', LPAD(n, 12, '0')),
  CASE MOD(n, 2) WHEN 0 THEN 'River County Expressway (Demo)' ELSE 'Ohio Turnpike Authority (Demo)' END,
  CONCAT('61500000-0000-4000-8000-', LPAD(MOD(n - 1, 2) + 1, 12, '0')),
  CONCAT('DEMO-TRANSPONDER-', LPAD(n, 3, '0')),
  CONCAT('62000000-0000-4000-8000-', LPAD(n, 12, '0')),
  CONCAT('OH-DEMO-', 100 + n),
  CONCAT('DEMO-TXN-', YEAR(CURRENT_DATE), '-', LPAD(n, 3, '0')),
  DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL (n * 3) HOUR),
  CASE MOD(n, 4)
    WHEN 0 THEN 'I-80 Eastbound Mainline Plaza (Demo)'
    WHEN 1 THEN 'I-71 Northbound Ramp (Demo)'
    WHEN 2 THEN 'I-90 Westbound Toll Point (Demo)'
    ELSE 'I-76 Connector Gantry (Demo)'
  END,
  4.25 + n,
  CASE MOD(n, 4) WHEN 0 THEN 'Pending' WHEN 1 THEN 'Posted' WHEN 2 THEN 'Disputed' ELSE 'Posted' END
FROM fieldline_test_sequence
ON DUPLICATE KEY UPDATE
  authority = VALUES(authority),
  toll_account_id = VALUES(toll_account_id),
  transponder_id = VALUES(transponder_id),
  vehicle_id = VALUES(vehicle_id),
  plate_number = VALUES(plate_number),
  transaction_reference = VALUES(transaction_reference),
  toll_at = VALUES(toll_at),
  location = VALUES(location),
  amount = VALUES(amount),
  posting_status = VALUES(posting_status),
  updated_at = CURRENT_TIMESTAMP(3);

INSERT INTO toll_violations (
  id, managing_fmc, authority, notice_number, vehicle_id, transaction_id, plate_shown,
  event_at, event_details, amount, deadline, verification_status, evidence_link,
  recommendation, approval_status, authority_outcome, case_status, case_owner, next_action
)
SELECT
  CONCAT('61800000-0000-4000-8000-', LPAD(n, 12, '0')),
  'Northstar Fleet Management (Demo)',
  CASE MOD(n, 2) WHEN 0 THEN 'River County Expressway (Demo)' ELSE 'Ohio Turnpike Authority (Demo)' END,
  CONCAT('DEMO-NOTICE-', YEAR(CURRENT_DATE), '-', LPAD(n, 3, '0')),
  CONCAT('62000000-0000-4000-8000-', LPAD(n, 12, '0')),
  CONCAT('61700000-0000-4000-8000-', LPAD(n, 12, '0')),
  CONCAT('OH-DEMO-', 100 + n),
  DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL (n * 2) DAY),
  CONCAT('Possible missed toll at ', CASE MOD(n, 4)
    WHEN 0 THEN 'I-80 Eastbound Mainline Plaza'
    WHEN 1 THEN 'I-71 Northbound Ramp'
    WHEN 2 THEN 'I-90 Westbound Toll Point'
    ELSE 'I-76 Connector Gantry'
  END, '; verify plate and transponder assignment.'),
  25.00 + n,
  DATE_ADD(CURRENT_DATE, INTERVAL n DAY),
  CASE MOD(n, 4) WHEN 0 THEN 'Needs evidence' WHEN 1 THEN 'Pending' WHEN 2 THEN 'Verified' ELSE 'Mismatch' END,
  '',
  'Compare the notice image, vehicle assignment, and toll transaction before responding.',
  CASE MOD(n, 3) WHEN 0 THEN 'Approved' ELSE 'Pending' END,
  '',
  CASE MOD(n, 4) WHEN 0 THEN 'In review' WHEN 1 THEN 'Open' WHEN 2 THEN 'Disputed' ELSE 'Open' END,
  CONCAT('Case Reviewer ', MOD(n, 3) + 1, ' (Demo)'),
  'Verify transaction, plate assignment, and notice evidence'
FROM fieldline_test_sequence
ON DUPLICATE KEY UPDATE
  managing_fmc = VALUES(managing_fmc),
  authority = VALUES(authority),
  notice_number = VALUES(notice_number),
  vehicle_id = VALUES(vehicle_id),
  transaction_id = VALUES(transaction_id),
  plate_shown = VALUES(plate_shown),
  event_at = VALUES(event_at),
  event_details = VALUES(event_details),
  amount = VALUES(amount),
  deadline = VALUES(deadline),
  verification_status = VALUES(verification_status),
  evidence_link = VALUES(evidence_link),
  recommendation = VALUES(recommendation),
  approval_status = VALUES(approval_status),
  authority_outcome = VALUES(authority_outcome),
  case_status = VALUES(case_status),
  case_owner = VALUES(case_owner),
  next_action = VALUES(next_action),
  updated_at = CURRENT_TIMESTAMP(3);

INSERT INTO fleet_payments (
  id, violation_id, vehicle_id, customer_id, payment_type, paid_party, payment_reference,
  amount, status, paid_at, receipt_link, reconciliation_notes
)
SELECT
  CONCAT('61900000-0000-4000-8000-', LPAD(n, 12, '0')),
  CONCAT('61800000-0000-4000-8000-', LPAD(n, 12, '0')),
  CONCAT('62000000-0000-4000-8000-', LPAD(n, 12, '0')),
  CONCAT('61100000-0000-4000-8000-', LPAD(MOD(n - 1, 3) + 1, 12, '0')),
  'Authority payment',
  'Northstar Fleet Management (Demo)',
  CONCAT('DEMO-AUTH-PAY-', YEAR(CURRENT_DATE), '-', LPAD(n, 3, '0')),
  25.00 + n,
  CASE MOD(n, 3) WHEN 0 THEN 'Paid' WHEN 1 THEN 'Pending' ELSE 'Reconciled' END,
  CASE WHEN MOD(n, 3) = 0 THEN DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL n DAY) ELSE NULL END,
  '',
  'Demo authority payment record; verify receipt before reconciliation.'
FROM fieldline_test_sequence
ON DUPLICATE KEY UPDATE
  violation_id = VALUES(violation_id),
  vehicle_id = VALUES(vehicle_id),
  customer_id = VALUES(customer_id),
  payment_type = VALUES(payment_type),
  paid_party = VALUES(paid_party),
  payment_reference = VALUES(payment_reference),
  amount = VALUES(amount),
  status = VALUES(status),
  paid_at = VALUES(paid_at),
  receipt_link = VALUES(receipt_link),
  reconciliation_notes = VALUES(reconciliation_notes),
  updated_at = CURRENT_TIMESTAMP(3);

INSERT INTO fleet_payments (
  id, violation_id, vehicle_id, customer_id, payment_type, paid_party, payment_reference,
  amount, status, paid_at, receipt_link, reconciliation_notes
)
SELECT
  CONCAT('61910000-0000-4000-8000-', LPAD(n, 12, '0')),
  CONCAT('61800000-0000-4000-8000-', LPAD(n, 12, '0')),
  CONCAT('62000000-0000-4000-8000-', LPAD(n, 12, '0')),
  CONCAT('61100000-0000-4000-8000-', LPAD(MOD(n - 1, 3) + 1, 12, '0')),
  'Customer chargeback',
  CASE MOD(n - 1, 3) WHEN 0 THEN 'Northstar Freight (Demo)' WHEN 1 THEN 'Cedar Ridge Transport (Demo)' ELSE 'Summit Site Services (Demo)' END,
  CONCAT('DEMO-CUST-CHARGEBACK-', YEAR(CURRENT_DATE), '-', LPAD(n, 3, '0')),
  25.00 + n,
  CASE MOD(n, 3) WHEN 0 THEN 'Reconciled' WHEN 1 THEN 'Pending' ELSE 'Disputed' END,
  CASE WHEN MOD(n, 3) = 0 THEN DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL n DAY) ELSE NULL END,
  '',
  'Demo customer recharge record; reconcile against the authority payment.'
FROM fieldline_test_sequence
ON DUPLICATE KEY UPDATE
  violation_id = VALUES(violation_id),
  vehicle_id = VALUES(vehicle_id),
  customer_id = VALUES(customer_id),
  payment_type = VALUES(payment_type),
  paid_party = VALUES(paid_party),
  payment_reference = VALUES(payment_reference),
  amount = VALUES(amount),
  status = VALUES(status),
  paid_at = VALUES(paid_at),
  receipt_link = VALUES(receipt_link),
  reconciliation_notes = VALUES(reconciliation_notes),
  updated_at = CURRENT_TIMESTAMP(3);

INSERT INTO work_orders (id, title, asset_id, priority, assigned_to, due_date, status)
SELECT
  CONCAT('62010000-0000-4000-8000-', LPAD(n, 12, '0')),
  CASE MOD(n, 4)
    WHEN 0 THEN CONCAT('Annual safety inspection - ', LPAD(n, 2, '0'))
    WHEN 1 THEN CONCAT('Engine oil and filter service - ', LPAD(n, 2, '0'))
    WHEN 2 THEN CONCAT('Brake and tire inspection - ', LPAD(n, 2, '0'))
    ELSE CONCAT('Trailer lighting repair - ', LPAD(n, 2, '0'))
  END,
  CONCAT('62000000-0000-4000-8000-', LPAD(n, 12, '0')),
  CASE MOD(n, 4) WHEN 0 THEN 'High' WHEN 1 THEN 'Normal' ELSE 'Low' END,
  CONCAT('Fleet Technician ', MOD(n, 3) + 1, ' (Demo)'),
  DATE_ADD(CURRENT_DATE, INTERVAL n DAY),
  CASE MOD(n, 3) WHEN 0 THEN 'In progress' WHEN 1 THEN 'Open' ELSE 'Completed' END
FROM fieldline_test_sequence
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  asset_id = VALUES(asset_id),
  priority = VALUES(priority),
  assigned_to = VALUES(assigned_to),
  due_date = VALUES(due_date),
  status = VALUES(status);

INSERT INTO incidents (id, title, asset_id, severity, description, status)
SELECT
  CONCAT('62020000-0000-4000-8000-', LPAD(n, 12, '0')),
  CASE MOD(n, 4)
    WHEN 0 THEN CONCAT('Mirror damage reported - ', LPAD(n, 2, '0'))
    WHEN 1 THEN CONCAT('Delayed return from route - ', LPAD(n, 2, '0'))
    WHEN 2 THEN CONCAT('Trailer tire issue - ', LPAD(n, 2, '0'))
    ELSE CONCAT('Equipment inspection follow-up - ', LPAD(n, 2, '0'))
  END,
  CONCAT('62000000-0000-4000-8000-', LPAD(n, 12, '0')),
  CASE MOD(n, 4) WHEN 0 THEN 'High' WHEN 1 THEN 'Medium' ELSE 'Low' END,
  CASE MOD(n, 4)
    WHEN 0 THEN 'Driver reported a cracked passenger-side mirror during post-route inspection; vehicle held for review.'
    WHEN 1 THEN 'Unit returned later than scheduled; dispatcher confirmed a weather-related route delay.'
    WHEN 2 THEN 'Technician noted uneven trailer tire wear during yard inspection; service review requested.'
    ELSE 'Pre-use equipment inspection found a hydraulic seep; supervisor review is pending.'
  END,
  CASE MOD(n, 3) WHEN 0 THEN 'Investigating' WHEN 1 THEN 'Open' ELSE 'Resolved' END
FROM fieldline_test_sequence
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  asset_id = VALUES(asset_id),
  severity = VALUES(severity),
  description = VALUES(description),
  status = VALUES(status);

INSERT INTO fleet_maintenance (
  id, vehicle_id, work_order_id, service_type, schedule_date, due_date, due_mileage, mileage_unit,
  vendor, repairs, cost, downtime_start, downtime_end, inspection_result, status
)
SELECT
  CONCAT('62200000-0000-4000-8000-', LPAD(n, 12, '0')),
  CONCAT('62000000-0000-4000-8000-', LPAD(n, 12, '0')),
  CONCAT('62010000-0000-4000-8000-', LPAD(n, 12, '0')),
  CASE MOD(n, 3) WHEN 0 THEN 'Safety inspection' WHEN 1 THEN 'Preventive service' ELSE 'Tire service' END,
  DATE_SUB(CURRENT_DATE, INTERVAL n DAY),
  DATE_ADD(CURRENT_DATE, INTERVAL n DAY),
  50000 + n * 2500,
  'mi',
  CASE MOD(n, 4)
    WHEN 0 THEN 'Riverton Diesel & Fleet (Demo)'
    WHEN 1 THEN 'Lakeview Tire Service (Demo)'
    WHEN 2 THEN 'Summit Equipment Repair (Demo)'
    ELSE 'North County Vehicle Inspection (Demo)'
  END,
  CASE MOD(n, 3)
    WHEN 0 THEN 'Oil and filter replaced; fluid levels and belts checked.'
    WHEN 1 THEN 'Tire condition and brake wear inspected; follow-up noted where needed.'
    ELSE 'Safety inspection completed; defects documented for repair tracking.'
  END,
  CASE WHEN n <= 3 THEN 425.00 + n * 35
    WHEN n <= 5 THEN 185.00 + n * 20
    WHEN n <= 7 THEN 310.00 + n * 30
    ELSE 575.00 + n * 45
  END,
  NULL,
  NULL,
  CASE MOD(n, 3) WHEN 0 THEN 'Pass' WHEN 1 THEN 'Advisory' ELSE '' END,
  CASE MOD(n, 3) WHEN 0 THEN 'Completed' WHEN 1 THEN 'Scheduled' ELSE 'In progress' END
FROM fieldline_test_sequence
ON DUPLICATE KEY UPDATE
  vehicle_id = VALUES(vehicle_id),
  work_order_id = VALUES(work_order_id),
  service_type = VALUES(service_type),
  schedule_date = VALUES(schedule_date),
  due_date = VALUES(due_date),
  due_mileage = VALUES(due_mileage),
  mileage_unit = VALUES(mileage_unit),
  vendor = VALUES(vendor),
  repairs = VALUES(repairs),
  cost = VALUES(cost),
  downtime_start = VALUES(downtime_start),
  downtime_end = VALUES(downtime_end),
  inspection_result = VALUES(inspection_result),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP(3);

INSERT INTO fleet_trips (
  id, vehicle_id, device_id, assignment_start, assignment_end, trip_start, trip_end,
  distance, distance_unit, start_location, end_location, evidence_link
)
SELECT
  CONCAT('62300000-0000-4000-8000-', LPAD(n, 12, '0')),
  CONCAT('62000000-0000-4000-8000-', LPAD(n, 12, '0')),
  CONCAT('DEMO-TELEMATICS-', LPAD(n, 3, '0')),
  DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL (n + 4) DAY),
  NULL,
  DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL (n * 2) HOUR),
  DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL (n * 2 - 1) HOUR),
  42.0 + n * 13.5,
  'mi',
  CASE MOD(n, 4)
    WHEN 0 THEN 'Riverton Service Yard (Demo)'
    WHEN 1 THEN 'Northstar Distribution Center (Demo)'
    WHEN 2 THEN 'Lakeview Customer Site (Demo)'
    ELSE 'Summit Equipment Yard (Demo)'
  END,
  CASE MOD(n, 4)
    WHEN 0 THEN 'Lakeview Customer Site (Demo)'
    WHEN 1 THEN 'Riverton Service Yard (Demo)'
    WHEN 2 THEN 'Summit Equipment Yard (Demo)'
    ELSE 'Northstar Distribution Center (Demo)'
  END,
  ''
FROM fieldline_test_sequence
ON DUPLICATE KEY UPDATE
  vehicle_id = VALUES(vehicle_id),
  device_id = VALUES(device_id),
  assignment_start = VALUES(assignment_start),
  assignment_end = VALUES(assignment_end),
  trip_start = VALUES(trip_start),
  trip_end = VALUES(trip_end),
  distance = VALUES(distance),
  distance_unit = VALUES(distance_unit),
  start_location = VALUES(start_location),
  end_location = VALUES(end_location),
  evidence_link = VALUES(evidence_link),
  updated_at = CURRENT_TIMESTAMP(3);

INSERT INTO fleet_tasks (id, vehicle_id, violation_id, case_owner, next_action, due_at, evidence_request, status)
SELECT
  CONCAT('62400000-0000-4000-8000-', LPAD(n, 12, '0')),
  CONCAT('62000000-0000-4000-8000-', LPAD(n, 12, '0')),
  CONCAT('61800000-0000-4000-8000-', LPAD(n, 12, '0')),
  CONCAT('Case Reviewer ', MOD(n, 3) + 1, ' (Demo)'),
  CONCAT('Review toll notice and vehicle evidence - ', LPAD(n, 2, '0')),
  DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL n DAY),
  CASE WHEN MOD(n, 2) = 0 THEN 'Request a toll-point image.' ELSE '' END,
  CASE MOD(n, 4) WHEN 0 THEN 'Waiting for evidence' WHEN 1 THEN 'Open' WHEN 2 THEN 'In progress' ELSE 'Completed' END
FROM fieldline_test_sequence
ON DUPLICATE KEY UPDATE
  vehicle_id = VALUES(vehicle_id),
  violation_id = VALUES(violation_id),
  case_owner = VALUES(case_owner),
  next_action = VALUES(next_action),
  due_at = VALUES(due_at),
  evidence_request = VALUES(evidence_request),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP(3);

INSERT INTO fleet_approvals (id, task_id, violation_id, approver, decision, decided_at, notes)
SELECT
  CONCAT('62500000-0000-4000-8000-', LPAD(n, 12, '0')),
  CONCAT('62400000-0000-4000-8000-', LPAD(n, 12, '0')),
  CONCAT('61800000-0000-4000-8000-', LPAD(n, 12, '0')),
  CONCAT('Operations Approver ', MOD(n, 3) + 1, ' (Demo)'),
  CASE MOD(n, 3) WHEN 0 THEN 'Approved' WHEN 1 THEN 'Pending' ELSE 'Needs changes' END,
  CASE WHEN MOD(n, 3) = 1 THEN NULL ELSE DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL n HOUR) END,
  'Demo approval record; confirm supporting documents before final submission.'
FROM fieldline_test_sequence
ON DUPLICATE KEY UPDATE
  task_id = VALUES(task_id),
  violation_id = VALUES(violation_id),
  approver = VALUES(approver),
  decision = VALUES(decision),
  decided_at = VALUES(decided_at),
  notes = VALUES(notes),
  updated_at = CURRENT_TIMESTAMP(3);

INSERT INTO vehicle_documents (id, asset_id, document_type, reference, issuing_party, issue_date, expiration_date, file_url)
SELECT
  CONCAT('62600000-0000-4000-8000-', LPAD(n, 12, '0')),
  CONCAT('62000000-0000-4000-8000-', LPAD(n, 12, '0')),
  CASE MOD(n, 4) WHEN 0 THEN 'Inspection' WHEN 1 THEN 'Registration' WHEN 2 THEN 'Insurance' ELSE 'Title' END,
  CONCAT('DEMO-DOC-', YEAR(CURRENT_DATE), '-', LPAD(n, 3, '0')),
  CASE MOD(n, 4)
    WHEN 0 THEN 'North County Inspection Office (Demo)'
    WHEN 1 THEN 'Ohio Vehicle Services (Demo)'
    WHEN 2 THEN 'Midstate Mutual Insurance (Demo)'
    ELSE 'Riverton Fleet Holdings (Demo)'
  END,
  DATE_SUB(CURRENT_DATE, INTERVAL n DAY),
  DATE_ADD(CURRENT_DATE, INTERVAL 180 DAY),
  ''
FROM fieldline_test_sequence
ON DUPLICATE KEY UPDATE
  asset_id = VALUES(asset_id),
  document_type = VALUES(document_type),
  reference = VALUES(reference),
  issuing_party = VALUES(issuing_party),
  issue_date = VALUES(issue_date),
  expiration_date = VALUES(expiration_date),
  file_url = VALUES(file_url);

INSERT INTO vehicle_ownership (
  id, asset_id, legal_owner, leasing_company, managing_fmc, ownership_type,
  fleet_entry_date, acquisition_date, lease_start_date, lease_end_date, effective_start, effective_end
)
SELECT
  CONCAT('62700000-0000-4000-8000-', LPAD(n, 12, '0')),
  CONCAT('62000000-0000-4000-8000-', LPAD(n, 12, '0')),
  'Riverton Fleet Holdings (Demo)',
  CASE MOD(n, 2) WHEN 0 THEN '' ELSE 'Pioneer Commercial Leasing (Demo)' END,
  'Northstar Fleet Management (Demo)',
  CASE MOD(n, 2) WHEN 0 THEN 'Owned' ELSE 'Leased' END,
  DATE_SUB(CURRENT_DATE, INTERVAL (n * 30) DAY),
  DATE_SUB(CURRENT_DATE, INTERVAL (n * 45) DAY),
  CASE MOD(n, 2) WHEN 0 THEN NULL ELSE DATE_SUB(CURRENT_DATE, INTERVAL (n * 20) DAY) END,
  CASE MOD(n, 2) WHEN 0 THEN NULL ELSE DATE_ADD(CURRENT_DATE, INTERVAL 365 DAY) END,
  DATE_SUB(CURRENT_DATE, INTERVAL (n * 30) DAY),
  NULL
FROM fieldline_test_sequence
ON DUPLICATE KEY UPDATE
  asset_id = VALUES(asset_id),
  legal_owner = VALUES(legal_owner),
  leasing_company = VALUES(leasing_company),
  managing_fmc = VALUES(managing_fmc),
  ownership_type = VALUES(ownership_type),
  fleet_entry_date = VALUES(fleet_entry_date),
  acquisition_date = VALUES(acquisition_date),
  lease_start_date = VALUES(lease_start_date),
  lease_end_date = VALUES(lease_end_date),
  effective_start = VALUES(effective_start),
  effective_end = VALUES(effective_end);

INSERT INTO vehicle_registrations (
  id, asset_id, plate_number, issuing_state, plate_type, registration_expiration,
  effective_start, effective_end, document_id
)
SELECT
  CONCAT('62800000-0000-4000-8000-', LPAD(n, 12, '0')),
  CONCAT('62000000-0000-4000-8000-', LPAD(n, 12, '0')),
  CONCAT('OH-DEMO-', 100 + n),
  'Ohio',
  CASE MOD(n, 2) WHEN 0 THEN 'Commercial' ELSE 'Standard' END,
  DATE_ADD(CURRENT_DATE, INTERVAL (90 + n) DAY),
  DATE_SUB(CURRENT_DATE, INTERVAL (n * 20) DAY),
  NULL,
  CONCAT('62600000-0000-4000-8000-', LPAD(n, 12, '0'))
FROM fieldline_test_sequence
ON DUPLICATE KEY UPDATE
  asset_id = VALUES(asset_id),
  plate_number = VALUES(plate_number),
  issuing_state = VALUES(issuing_state),
  plate_type = VALUES(plate_type),
  registration_expiration = VALUES(registration_expiration),
  effective_start = VALUES(effective_start),
  effective_end = VALUES(effective_end),
  document_id = VALUES(document_id);

INSERT INTO vehicle_assignments (
  id, asset_id, customer, contract, assignment_status, assigned_driver, driver_pool,
  branch, yard, assignment_start, assignment_end, handover_notes
)
SELECT
  CONCAT('62900000-0000-4000-8000-', LPAD(n, 12, '0')),
  CONCAT('62000000-0000-4000-8000-', LPAD(n, 12, '0')),
  CASE MOD(n - 1, 3) WHEN 0 THEN 'Northstar Freight (Demo)' WHEN 1 THEN 'Cedar Ridge Transport (Demo)' ELSE 'Summit Site Services (Demo)' END,
  CONCAT('DEMO-CONT-', YEAR(CURRENT_DATE), '-', LPAD(n, 3, '0')),
  CASE WHEN MOD(n, 3) = 0 THEN 'Unassigned' ELSE 'Assigned' END,
  CASE WHEN MOD(n, 3) = 0 THEN '' ELSE CONCAT('Fleet Driver ', LPAD(n, 2, '0'), ' (Demo)') END,
  CONCAT('Regional Driver Pool ', MOD(n, 3) + 1, ' (Demo)'),
  CASE MOD(n, 3) WHEN 0 THEN 'Riverton Branch (Demo)' WHEN 1 THEN 'Lakeview Branch (Demo)' ELSE 'Fairview Branch (Demo)' END,
  'Riverton Fleet Service Yard (Demo)',
  DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL n DAY),
  CASE WHEN MOD(n, 3) = 0 THEN DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 1 HOUR) ELSE NULL END,
  CONCAT('Demo handover checklist completed for unit ', LPAD(n, 2, '0'))
FROM fieldline_test_sequence
ON DUPLICATE KEY UPDATE
  asset_id = VALUES(asset_id),
  customer = VALUES(customer),
  contract = VALUES(contract),
  assignment_status = VALUES(assignment_status),
  assigned_driver = VALUES(assigned_driver),
  driver_pool = VALUES(driver_pool),
  branch = VALUES(branch),
  yard = VALUES(yard),
  assignment_start = VALUES(assignment_start),
  assignment_end = VALUES(assignment_end),
  handover_notes = VALUES(handover_notes);

INSERT INTO vehicle_events (
  id, asset_id, event_type, effective_at, reason, report_reference, reported_start,
  reported_end, recovery_at, handover_at, evidence_document_id
)
SELECT
  CONCAT('63000000-0000-4000-8000-', LPAD(n, 12, '0')),
  CONCAT('62000000-0000-4000-8000-', LPAD(n, 12, '0')),
  CASE MOD(n, 5) WHEN 0 THEN 'In yard' WHEN 1 THEN 'In service' WHEN 2 THEN 'Out for maintenance' WHEN 3 THEN 'Handover' ELSE 'Recovered' END,
  DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL n DAY),
  CASE MOD(n, 5)
    WHEN 0 THEN 'Vehicle checked in at the service yard after route completion.'
    WHEN 1 THEN 'Unit released to active service following routine inspection.'
    WHEN 2 THEN 'Vehicle sent to the shop for scheduled maintenance.'
    WHEN 3 THEN 'Vehicle handover recorded with keys and condition checklist.'
    ELSE 'Demo recovery event recorded; unit returned to service.'
  END,
  CONCAT('DEMO-EVENT-', YEAR(CURRENT_DATE), '-', LPAD(n, 3, '0')),
  DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL n DAY),
  DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL (n - 1) DAY),
  CASE WHEN MOD(n, 5) = 4 THEN DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL n DAY) ELSE NULL END,
  CASE WHEN MOD(n, 5) = 3 THEN DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL n DAY) ELSE NULL END,
  CONCAT('62600000-0000-4000-8000-', LPAD(n, 12, '0'))
FROM fieldline_test_sequence
ON DUPLICATE KEY UPDATE
  asset_id = VALUES(asset_id),
  event_type = VALUES(event_type),
  effective_at = VALUES(effective_at),
  reason = VALUES(reason),
  report_reference = VALUES(report_reference),
  reported_start = VALUES(reported_start),
  reported_end = VALUES(reported_end),
  recovery_at = VALUES(recovery_at),
  handover_at = VALUES(handover_at),
  evidence_document_id = VALUES(evidence_document_id);

INSERT INTO vehicle_mileage (id, asset_id, reading, unit, reading_at, source, notes)
SELECT
  CONCAT('63100000-0000-4000-8000-', LPAD(n, 12, '0')),
  CONCAT('62000000-0000-4000-8000-', LPAD(n, 12, '0')),
  18250 + n * 3275,
  'mi',
  DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL n DAY),
  CASE MOD(n, 3) WHEN 0 THEN 'Telematics' WHEN 1 THEN 'Manual entry' ELSE 'Service record' END,
  CONCAT('Demo odometer captured during ', CASE MOD(n, 3)
    WHEN 0 THEN 'telematics review'
    WHEN 1 THEN 'driver check-in'
    ELSE 'preventive service'
  END, '.')
FROM fieldline_test_sequence
ON DUPLICATE KEY UPDATE
  asset_id = VALUES(asset_id),
  reading = VALUES(reading),
  unit = VALUES(unit),
  reading_at = VALUES(reading_at),
  source = VALUES(source),
  notes = VALUES(notes);

INSERT INTO fleet_activity_log (
  id, vehicle_id, entity_type, entity_id, action, actor_id, actor_name, actor_type, change_data
)
SELECT
  CONCAT('63200000-0000-4000-8000-', LPAD(n, 12, '0')),
  CONCAT('62000000-0000-4000-8000-', LPAD(n, 12, '0')),
  'vehicle',
  CONCAT('62000000-0000-4000-8000-', LPAD(n, 12, '0')),
  'create',
  NULL,
  'Fieldline demo data',
  'backend',
  JSON_OBJECT(
    'record',
    JSON_OBJECT(
      'before', NULL,
      'after', JSON_OBJECT(
        'name', CASE n
          WHEN 1 THEN 'Demo Fleet Tractor 101 - North Route'
          WHEN 2 THEN 'Demo Fleet Tractor 102 - East Route'
          WHEN 3 THEN 'Demo Fleet Tractor 103 - Regional'
          WHEN 4 THEN 'Demo Fleet Pickup 201 - Field Team'
          WHEN 5 THEN 'Demo Fleet Sedan 202 - Pool'
          WHEN 6 THEN 'Demo Fleet Refrigerated Trailer 301'
          WHEN 7 THEN 'Demo Fleet Dry Van Trailer 302'
          WHEN 8 THEN 'Demo Fleet Excavator 401 - Site A'
          WHEN 9 THEN 'Demo Fleet Skid Steer 402 - Yard'
          ELSE 'Demo Fleet Boom Lift 403 - Site B'
        END,
        'internal_asset_id', CONCAT('FLEET-DEMO-ASSET-', LPAD(n, 3, '0')),
        'vehicle_type', CASE WHEN n <= 3 THEN 'Truck' WHEN n <= 5 THEN 'Car' WHEN n <= 7 THEN 'Trailer' ELSE 'Equipment' END
      )
    )
  )
FROM fieldline_test_sequence
ON DUPLICATE KEY UPDATE
  vehicle_id = VALUES(vehicle_id),
  entity_type = VALUES(entity_type),
  entity_id = VALUES(entity_id),
  action = VALUES(action),
  actor_name = VALUES(actor_name),
  actor_type = VALUES(actor_type),
  change_data = VALUES(change_data);

COMMIT;
DROP TEMPORARY TABLE IF EXISTS fieldline_test_sequence;

SELECT 'Vehicles' AS fixture, COUNT(*) AS rows_added FROM assets WHERE external_ref LIKE 'TEST-FLEET-REF-%'
UNION ALL SELECT 'Test site', COUNT(*) FROM sites WHERE name = 'Riverton Fleet Service Yard (Demo)'
UNION ALL SELECT 'Customers', COUNT(*) FROM fleet_customers WHERE account_number LIKE 'TEST-FLEET-CUST-%'
UNION ALL SELECT 'Contracts', COUNT(*) FROM fleet_contracts WHERE contract_number LIKE 'DEMO-CONT-%'
UNION ALL SELECT 'Drivers', COUNT(*) FROM fleet_drivers WHERE driver_id LIKE 'DEMO-DRV-%'
UNION ALL SELECT 'Driver assignments', COUNT(*) FROM fleet_driver_assignments WHERE handover_notes LIKE 'Demo handover:%'
UNION ALL SELECT 'Toll accounts', COUNT(*) FROM toll_accounts WHERE account_reference LIKE 'DEMO-TOLL-ACCOUNT-%'
UNION ALL SELECT 'Toll transponders', COUNT(*) FROM toll_transponders WHERE transponder_id LIKE 'DEMO-TRANSPONDER-%'
UNION ALL SELECT 'Toll transactions', COUNT(*) FROM toll_transactions WHERE transaction_reference LIKE 'DEMO-TXN-%'
UNION ALL SELECT 'Violations', COUNT(*) FROM toll_violations WHERE notice_number LIKE 'DEMO-NOTICE-%'
UNION ALL SELECT 'Payments and chargebacks', COUNT(*) FROM fleet_payments WHERE payment_reference LIKE 'DEMO-AUTH-PAY-%' OR payment_reference LIKE 'DEMO-CUST-CHARGEBACK-%'
UNION ALL SELECT 'Work orders', COUNT(*) FROM work_orders WHERE id LIKE '62010000-0000-4000-8000-%'
UNION ALL SELECT 'Incidents', COUNT(*) FROM incidents WHERE id LIKE '62020000-0000-4000-8000-%'
UNION ALL SELECT 'Maintenance', COUNT(*) FROM fleet_maintenance WHERE id LIKE '62200000-0000-4000-8000-%'
UNION ALL SELECT 'Trips', COUNT(*) FROM fleet_trips WHERE device_id LIKE 'DEMO-TELEMATICS-%'
UNION ALL SELECT 'Tasks', COUNT(*) FROM fleet_tasks WHERE next_action LIKE 'Review toll notice and vehicle evidence%'
UNION ALL SELECT 'Approvals', COUNT(*) FROM fleet_approvals WHERE notes LIKE 'Demo approval record%'
UNION ALL SELECT 'Vehicle documents', COUNT(*) FROM vehicle_documents WHERE reference LIKE 'DEMO-DOC-%'
UNION ALL SELECT 'Ownership periods', COUNT(*) FROM vehicle_ownership WHERE legal_owner = 'Riverton Fleet Holdings (Demo)'
UNION ALL SELECT 'Registrations', COUNT(*) FROM vehicle_registrations WHERE plate_number LIKE 'OH-DEMO-%'
UNION ALL SELECT 'Vehicle assignments', COUNT(*) FROM vehicle_assignments WHERE handover_notes LIKE 'Demo handover checklist%'
UNION ALL SELECT 'Vehicle events', COUNT(*) FROM vehicle_events WHERE report_reference LIKE 'DEMO-EVENT-%'
UNION ALL SELECT 'Mileage readings', COUNT(*) FROM vehicle_mileage WHERE notes LIKE 'Demo odometer captured%'
UNION ALL SELECT 'Vehicle activity', COUNT(*) FROM fleet_activity_log WHERE actor_name = 'Fieldline demo data';
