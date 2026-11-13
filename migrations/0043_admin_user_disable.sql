-- Preserve financial/audit references when withdrawing an operator's access.
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS disabled_at timestamptz;
