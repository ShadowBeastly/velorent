---
name: supabase-migrate
description: "Safe Supabase SQL migration writing, validation, and execution. MUST be used whenever writing, reading, or editing any .sql file in supabase/migrations/, whenever creating or modifying database tables, columns, views, RPCs, triggers, indexes, or RLS policies, whenever running supabase CLI commands (db push, db dump, migration), and whenever delegating database schema work to sub-agents. Also use when planning any schema change, writing ALTER TABLE, CREATE VIEW, CREATE FUNCTION, RENAME, DROP, or GRANT statements. If you are about to write SQL that touches the database schema — use this skill first."
metadata:
  filePattern:
    - "supabase/migrations/**"
    - "supabase/migrations/*.sql"
    - "**/migrations/*.sql"
    - "**/*.sql"
  bashPattern:
    - "supabase"
    - "npx\\s+supabase"
    - "db\\s+push"
    - "db\\s+dump"
    - "migration"
---

# supabase-migrate

Safe SQL migration writing, validation, and execution for the Lociva/RentCore Supabase project (`fqycoldheyxzxbxqmayf`).

---

## Naming Convention

`YYYYMMDD_NNN_beschreibung.sql`

Examples:
- `20260327_100_commission_rates.sql`
- `20260327_200_rename_bikes_to_items.sql`
- `20260327_300_rename_hotels_to_venues.sql`

Files live in `supabase/migrations/`.

---

## Migration Template

Every migration MUST follow this structure:

```sql
-- Migration: [descriptive name]
-- Rollback: [exact SQL to undo this migration]
-- Dependencies: [list any migrations this depends on, or "none"]

BEGIN;

-- [migration body]

-- Schema reload for PostgREST (required after view/table changes)
NOTIFY pgrst, 'reload schema';

COMMIT;
```

---

## Table Rename Pattern

Use this three-phase pattern: alias first, migrate second, delete third. Never drop the old name until all code is updated.

```sql
-- Migration: rename bikes to items
-- Rollback: DROP VIEW bikes; ALTER TABLE items RENAME TO bikes;
-- Dependencies: none

BEGIN;

-- Step 1: Rename the table
ALTER TABLE bikes RENAME TO items;

-- Step 2: Create backward-compatible updatable view
CREATE OR REPLACE VIEW bikes AS SELECT * FROM items;

-- Step 3: GRANT permissions on the view (CRITICAL — without this, RLS breaks)
GRANT SELECT, INSERT, UPDATE, DELETE ON bikes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON bikes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON bikes TO service_role;

-- Step 4: Add alias columns with sync triggers (only if column renames are needed)
-- ALTER TABLE items ADD COLUMN IF NOT EXISTS new_col_name UUID;
-- Create trigger to sync old_col <-> new_col bidirectionally

-- Step 5: Schema reload
NOTIFY pgrst, 'reload schema';

COMMIT;
```

---

## Validation Checklist

Run through this before ANY migration is executed:

- [ ] Wrapped in `BEGIN` / `COMMIT`
- [ ] Rollback comment at top with exact reversal SQL
- [ ] No `DROP` without explicit user confirmation
- [ ] Views have `GRANT` for all 3 roles: `authenticated`, `anon`, `service_role`
- [ ] `NOTIFY pgrst, 'reload schema'` present after view/table changes
- [ ] Existing data backfilled if adding `NOT NULL` columns
- [ ] Foreign keys reference the real table (not a view)
- [ ] RLS policies still work through views — test mentally with `SET ROLE anon; SELECT * FROM view_name;`
- [ ] **Trigger cascade check**: Before any bulk `UPDATE`/`INSERT`, search for triggers on the target table AND on tables those triggers touch. Verify all referenced columns exist. Add `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for any missing columns BEFORE the triggering statement.
- [ ] Tables from `supabase-schema.sql` or `missing-tables.sql` may NOT exist in the live DB — always use `IF EXISTS` guards or `DO $$ IF EXISTS ... $$` blocks for those tables

---

## Execution Protocol

1. **Write the file first** — never execute SQL directly without a migration file.
2. **Validate** — check syntax, rollback comment, grants, and NOTIFY.
3. **Ask the user** before executing:
   > "Migration `[filename]` ist bereit. Soll ich sie auf Supabase ausführen?"
4. **Only after confirmation**, execute via:
   ```bash
   npx supabase db push --db-url postgresql://postgres:[password]@db.fqycoldheyxzxbxqmayf.supabase.co:5432/postgres
   ```
   Or use the Supabase Management API if CLI is not available.
5. **Verify** after execution with a targeted test query (e.g., `SELECT COUNT(*) FROM new_table_name`).

---

## Common Gotchas

- **PostgREST schema cache** — always `NOTIFY pgrst, 'reload schema'` after any view or table change. Without this, the API won't see the change until the next restart.
- **Updatable views** — only work if the view is a plain `SELECT *` from a single table with no joins, aggregates, or DISTINCT. The moment you add a join it becomes read-only.
- **RLS through views** — the base table's RLS policies still apply when querying through a view. But `GRANT` on the view itself is also required, or PostgREST will reject the request before RLS even runs.
- **INSTEAD OF triggers** — triggers on views must use `INSTEAD OF`, not `BEFORE` or `AFTER`.
- **Renamed primary key constraints** — `ALTER TABLE ... RENAME TO` also renames the primary key and index names. Check for hardcoded constraint names in other migrations or application code.
- **Foreign keys point to tables, not views** — if other tables have FKs to `bikes`, they need to be updated to reference `items` after the rename. Views cannot be FK targets.
- **Trigger cascades** — a bulk `UPDATE` on `bookings` fires `update_customer_stats()` which updates `customers`, which fires `update_updated_at()`. If any column in the chain is missing, the entire transaction fails. Always trace the full trigger chain before writing UPDATE statements. In this project, `supabase-schema.sql` defines triggers/columns that were never applied as migrations — never trust it as the live DB state.
- **Ghost tables** — `bike_categories`, `bike_health`, `maintenance_logs` are defined in `missing-tables.sql` (not in migrations). They may not exist in the live DB. Always guard operations on these with `IF EXISTS` checks.
