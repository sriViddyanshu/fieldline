USE fieldline;

-- A current plate may be known even when its effective start date is not.
ALTER TABLE vehicle_registrations
  MODIFY COLUMN effective_start DATE NULL;