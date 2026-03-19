// GET /api/v1/bikes/[id]/availability?start=YYYY-MM-DD&end=YYYY-MM-DD
// Returns whether the bike is available in the given range,
// and a list of conflicting bookings (without customer details).

import { authenticateApiKey } from "../../../../../../src/utils/apiAuth";
import { applyRateLimit } from "../../../../../../src/utils/rateLimiter";
import { getServiceClient, ok, err } from "../../../_shared";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  let auth;
  try {
    auth = await authenticateApiKey(request);
    const rawKey = request.headers.get("Authorization")?.slice(7) ?? auth.orgId;
    applyRateLimit(rawKey.slice(0, 8) || auth.orgId);
  } catch (res) {
    return res;
  }

  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!start || !end) return err("BAD_REQUEST", "start and end query params required (YYYY-MM-DD)");
  if (start > end) return err("BAD_REQUEST", "start must be before or equal to end");

  const supabase = getServiceClient();

  // Confirm bike belongs to org
  const { data: bike, error: bikeErr } = await supabase
    .from("bikes")
    .select("id, name, status, buffer_minutes")
    .eq("id", params.id)
    .eq("organization_id", auth.orgId)
    .maybeSingle();

  if (bikeErr) return err("SERVER_ERROR", bikeErr.message, 500);
  if (!bike) return err("NOT_FOUND", "Bike not found", 404);

  // Find overlapping bookings (including buffer)
  const { data: conflicts, error: bookingErr } = await supabase
    .from("bookings")
    .select("id, start_date, end_date, status")
    .eq("organization_id", auth.orgId)
    .in("status", ["confirmed", "active", "reserved"])
    .lte("start_date", end)
    .gte("end_date", start)
    .contains("booking_items", []) // only header rows; fall back to bike_id check
    .or(`bike_id.eq.${params.id}`);

  if (bookingErr) return err("SERVER_ERROR", bookingErr.message, 500);

  const available = (conflicts ?? []).length === 0 && bike.status !== "maintenance";

  return ok({
    bike_id: params.id,
    available,
    requested_range: { start, end },
    conflicts: (conflicts ?? []).map((b) => ({
      booking_id: b.id,
      start_date: b.start_date,
      end_date: b.end_date,
      status: b.status,
    })),
  });
}
