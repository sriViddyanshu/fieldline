USE fieldline;

ALTER TABLE toll_violations
  ADD COLUMN source_case_id VARCHAR(120) NULL AFTER next_action,
  ADD COLUMN exception_code VARCHAR(80) NOT NULL DEFAULT '' AFTER source_case_id,
  ADD COLUMN case_opened_at DATETIME(3) NULL AFTER exception_code,
  ADD COLUMN dispute_submitted_at DATETIME(3) NULL AFTER case_opened_at,
  ADD COLUMN resolution_at DATETIME(3) NULL AFTER dispute_submitted_at,
  ADD COLUMN source_authority_decision VARCHAR(120) NOT NULL DEFAULT '' AFTER resolution_at,
  ADD COLUMN source_payment_status VARCHAR(80) NOT NULL DEFAULT '' AFTER source_authority_decision,
  ADD COLUMN payment_event_id CHAR(36) NULL AFTER source_payment_status,
  ADD COLUMN prior_related_case_id VARCHAR(120) NOT NULL DEFAULT '' AFTER payment_event_id,
  ADD COLUMN closure_reason VARCHAR(255) NOT NULL DEFAULT '' AFTER prior_related_case_id,
  ADD COLUMN evidence_reference VARCHAR(180) NOT NULL DEFAULT '' AFTER closure_reason,
  ADD COLUMN internal_notes TEXT NOT NULL AFTER evidence_reference,
  ADD COLUMN synthetic_flag VARCHAR(40) NOT NULL DEFAULT '' AFTER internal_notes,
  ADD COLUMN source_data JSON NULL AFTER synthetic_flag,
  ADD UNIQUE KEY toll_violations_source_case_unique (source_case_id),
  ADD CONSTRAINT toll_violations_payment_event_fk
    FOREIGN KEY (payment_event_id) REFERENCES toll_payment_events(id) ON DELETE SET NULL;
