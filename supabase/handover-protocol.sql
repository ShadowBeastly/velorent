-- =====================================================
-- RentCore — Handover Protocol Columns
-- Run in Supabase SQL Editor.
-- Safe to re-run (ADD COLUMN IF NOT EXISTS).
-- =====================================================

-- Missing columns on bookings table used by the app
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pickup_notes TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS return_notes TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_status TEXT DEFAULT 'pending'; -- pending, held, refunded, deducted

-- Structured handover protocols (JSON)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pickup_protocol JSONB DEFAULT '{}';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS return_protocol JSONB DEFAULT '{}';
