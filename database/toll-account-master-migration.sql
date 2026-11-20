USE fieldline;

ALTER TABLE toll_accounts
  ADD COLUMN account_display_name VARCHAR(180) NOT NULL DEFAULT '' AFTER account_reference,
  ADD COLUMN account_holder_legal_name VARCHAR(180) NOT NULL DEFAULT '' AFTER account_display_name,
  ADD COLUMN account_holder_type VARCHAR(30) NOT NULL DEFAULT '' AFTER account_holder_legal_name,
  ADD COLUMN account_opened DATE NULL AFTER account_holder_type,
  ADD COLUMN billing_method VARCHAR(80) NOT NULL DEFAULT '' AFTER account_opened,
  ADD COLUMN auto_replenishment VARCHAR(5) NOT NULL DEFAULT 'No' AFTER billing_method,
  ADD COLUMN auto_replenishment_threshold DECIMAL(12,2) NULL AFTER auto_replenishment,
  ADD COLUMN last_known_balance DECIMAL(12,2) NULL AFTER auto_replenishment_threshold,
  ADD COLUMN balance_as_of DATETIME(3) NULL AFTER last_known_balance,
  ADD COLUMN payment_method_status VARCHAR(30) NOT NULL DEFAULT '' AFTER balance_as_of,
  ADD COLUMN fmc_branch VARCHAR(180) NOT NULL DEFAULT '' AFTER payment_method_status,
  ADD COLUMN service_region VARCHAR(180) NOT NULL DEFAULT '' AFTER fmc_branch,
  ADD COLUMN portal_reference VARCHAR(180) NOT NULL DEFAULT '' AFTER service_region,
  ADD COLUMN last_sync_at DATETIME(3) NULL AFTER portal_reference;
