-- Phase 0: Feature flags infrastructure
-- Allows per-org rollout of new generic items UI without code deploy

BEGIN;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '{}';

COMMENT ON COLUMN organizations.feature_flags IS 'Per-org feature flags for incremental rollout. E.g. {"generic_items_ui": true}';

COMMIT;
