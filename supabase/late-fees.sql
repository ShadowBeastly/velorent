-- Late fee configuration columns on organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS late_fee_enabled BOOLEAN DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS late_fee_type TEXT DEFAULT 'fixed';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS late_fee_amount DECIMAL(10,2) DEFAULT 10;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS late_fee_grace_hours INTEGER DEFAULT 2;

-- Add CHECK constraint idempotently
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'organizations_late_fee_type_check'
    ) THEN
        ALTER TABLE organizations ADD CONSTRAINT organizations_late_fee_type_check
            CHECK (late_fee_type IN ('fixed', 'percentage'));
    END IF;
END $$;
