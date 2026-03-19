// POST /api/v1/bookings/[id]/cancel  — cancel a booking (bookings:write)

import { authenticateApiKey, requirePermission } from "../../../../../../src/utils/apiAuth";
import { applyRateLimit } from "../../../../../../src/utils/rateLimiter";
import { getServiceClient, ok, err } from "../../../_shared";

export const runtime = "nodejs";

export async function POST(request, { params }) {
  let auth;
  try {
    auth = await authenticateApiKey(request);
    requirePermission(auth.permissions, "bookings:write");
    const rawKey = request.headers.get("Authorization")?.slice(7) ?? auth.orgId;
    applyRateLimit(rawKey.slice(0, 8) || auth.orgId);
  } catch (res) {
    return res;
  }

  const supabase = getServiceClient();

  // Verify booking belongs to org and is cancellable
  const { data: booking, error: fetchErr } = await supabase
    .from("bookings")
    .select("id, status")
    .eq("id", params.id)
    .eq("organization_id", auth.orgId)
    .maybeSingle();

  if (fetchErr) return err("SERVER_ERROR", fetchErr.message, 500);
  if (!booking) return err("NOT_FOUND", "Booking not found", 404);
  if (["cancelled", "canceled"].includes(booking.status)) {
    return err("CONFLICT", "Booking is already cancelled", 409);
  }

  const { data, error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", params.id)
    .eq("organization_id", auth.orgId)
    .select()
    .single();

  if (error) return err("SERVER_ERROR", error.message, 500);
  return ok(data);
}
