-- ============================================================
-- 006_pricing_seed_rpc.sql
-- M2 Pricing Engine — Demo Seed Data RPC
--
-- Creates function seed_demo_pricing_rules(p_org_id UUID) that
-- inserts 5 standard pricing rules for an org.
-- Idempotent: skips rules whose name already exists for that org.
--
-- Rules seeded:
--   1. "7+ Tage Rabatt"   — duration ≥ 7 days, −20 %
--   2. "Hauptsaison"      — Jun 1 – Aug 31, +25 %
--   3. "Nebensaison"      — Nov 1 – Feb 28, −15 %
--   4. "Wochenende"       — Sa + So, +15 %
--   5. "Gruppenrabatt"    — 5+ bikes, −10 %  (uses pricing_rule_conditions)
--
-- Run for a specific org:
--   SELECT seed_demo_pricing_rules('<your-org-id>');
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION seed_demo_pricing_rules(p_org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rule_id  UUID;
    v_count    INT := 0;
BEGIN
    -- ── 1. 7+ Tage Rabatt ───────────────────────────────────────────────────────
    IF NOT EXISTS (
        SELECT 1 FROM pricing_rules
        WHERE organization_id = p_org_id AND name = '7+ Tage Rabatt'
    ) THEN
        INSERT INTO pricing_rules (
            organization_id, name, type,
            modifier_type, modifier_value,
            adjustment_type, adjustment_value,
            min_days, is_active, priority
        ) VALUES (
            p_org_id, '7+ Tage Rabatt', 'duration',
            'discount_percent', 20,
            'percentage', -20,
            7, true, 10
        );
        v_count := v_count + 1;
    END IF;

    -- ── 2. Hauptsaison ──────────────────────────────────────────────────────────
    IF NOT EXISTS (
        SELECT 1 FROM pricing_rules
        WHERE organization_id = p_org_id AND name = 'Hauptsaison'
    ) THEN
        INSERT INTO pricing_rules (
            organization_id, name, type,
            modifier_type, modifier_value,
            adjustment_type, adjustment_value,
            start_date, end_date,
            is_active, priority
        ) VALUES (
            p_org_id, 'Hauptsaison', 'seasonal',
            'multiplier', 1.25,
            'percentage', 25,
            '2026-06-01', '2026-08-31',
            true, 20
        );
        v_count := v_count + 1;
    END IF;

    -- ── 3. Nebensaison ──────────────────────────────────────────────────────────
    IF NOT EXISTS (
        SELECT 1 FROM pricing_rules
        WHERE organization_id = p_org_id AND name = 'Nebensaison'
    ) THEN
        INSERT INTO pricing_rules (
            organization_id, name, type,
            modifier_type, modifier_value,
            adjustment_type, adjustment_value,
            start_date, end_date,
            is_active, priority
        ) VALUES (
            p_org_id, 'Nebensaison', 'seasonal',
            'multiplier', 0.85,
            'percentage', -15,
            '2026-11-01', '2027-02-28',
            true, 20
        );
        v_count := v_count + 1;
    END IF;

    -- ── 4. Wochenende ───────────────────────────────────────────────────────────
    IF NOT EXISTS (
        SELECT 1 FROM pricing_rules
        WHERE organization_id = p_org_id AND name = 'Wochenende'
    ) THEN
        INSERT INTO pricing_rules (
            organization_id, name, type,
            modifier_type, modifier_value,
            adjustment_type, adjustment_value,
            days_of_week,
            is_active, priority
        ) VALUES (
            p_org_id, 'Wochenende', 'weekend',
            'multiplier', 1.15,
            'percentage', 15,
            '{6,0}',
            true, 15
        );
        v_count := v_count + 1;
    END IF;

    -- ── 5. Gruppenrabatt ────────────────────────────────────────────────────────
    IF NOT EXISTS (
        SELECT 1 FROM pricing_rules
        WHERE organization_id = p_org_id AND name = 'Gruppenrabatt'
    ) THEN
        INSERT INTO pricing_rules (
            organization_id, name, type,
            modifier_type, modifier_value,
            adjustment_type, adjustment_value,
            is_active, priority
        ) VALUES (
            p_org_id, 'Gruppenrabatt', 'group',
            'discount_percent', 10,
            'percentage', -10,
            true, 5
        ) RETURNING id INTO v_rule_id;

        -- Condition: minimum 5 bikes/items
        INSERT INTO pricing_rule_conditions (rule_id, condition_type, min_value)
        VALUES (v_rule_id, 'min_quantity', 5);

        v_count := v_count + 1;
    END IF;

    RETURN format('Seeded %s rule(s) for org %s', v_count, p_org_id);
END;
$$;

-- Grant execute to authenticated users (superadmin guard is on the calling layer)
GRANT EXECUTE ON FUNCTION seed_demo_pricing_rules(UUID) TO authenticated;

COMMIT;

-- ============================================================
-- Usage:
--   SELECT seed_demo_pricing_rules('<org-uuid>');
--
-- Test scenario (Sommer, 8 Tage, Wochenende → alle 3 Regeln greifen):
--   Buchung: 2026-07-04 (Sa) bis 2026-07-11 (Sa) = 8 Tage
--   Erwartung: Hauptsaison +25%, Wochenende +15% (auf Sa/So), 7+ Tage -20%
-- ============================================================
