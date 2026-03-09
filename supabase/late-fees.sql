-- Late fee configuration columns on organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS late_fee_enabled BOOLEAN DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS late_fee_type TEXT DEFAULT 'fixed' CHECK (late_fee_type IN ('fixed', 'percentage'));
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS late_fee_amount DECIMAL(10,2) DEFAULT 10;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS late_fee_grace_hours INTEGER DEFAULT 2;
