-- ============================================================
-- M8: Enhanced Maintenance Tracker
-- Milestone 8 of RentCore expansion
-- Adds: get_due_maintenances RPC
-- ============================================================

-- get_due_maintenances: returns all schedules that are overdue
-- or due within the next 7 days for a given org
CREATE OR REPLACE FUNCTION get_due_maintenances(p_org_id UUID)
RETURNS TABLE (
  id                UUID,
  bike_id           UUID,
  bike_name         TEXT,
  type              TEXT,
  interval_days     INT,
  interval_rentals  INT,
  last_performed_at TIMESTAMPTZ,
  next_due_at       TIMESTAMPTZ,
  is_overdue        BOOLEAN,
  days_overdue      INT,
  total_rentals     INT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ms.id,
    ms.bike_id,
    b.name  AS bike_name,
    ms.type,
    ms.interval_days,
    ms.interval_rentals,
    ms.last_performed_at,
    ms.next_due_at,
    (ms.next_due_at < now())                                          AS is_overdue,
    GREATEST(0, EXTRACT(DAY FROM (now() - ms.next_due_at))::INT)      AS days_overdue,
    COALESCE(bh.total_rentals, 0)                                     AS total_rentals
  FROM maintenance_schedules ms
  JOIN bikes b ON b.id = ms.bike_id
  LEFT JOIN bike_health bh ON bh.bike_id = ms.bike_id
  WHERE ms.organization_id = p_org_id
    AND ms.next_due_at IS NOT NULL
    AND ms.next_due_at <= (now() + INTERVAL '7 days')
  ORDER BY ms.next_due_at ASC;
$$;

GRANT EXECUTE ON FUNCTION get_due_maintenances(UUID) TO authenticated;
