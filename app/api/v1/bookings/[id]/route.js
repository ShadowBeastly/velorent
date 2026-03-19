// GET   /api/v1/bookings/[id]  — single booking
// PATCH /api/v1/bookings/[id]  — update booking (bookings:write)

import { authenticateApiKey, requirePermission } from "../../../../../src/utils/apiAuth";
import { applyRateLimit } from "../../../../../src/utils/rateLimiter";
import { getServiceClient, ok, err } from "../../_shared";

export const runtime = "nodejs";

async function getAuthWithRL(request) {
  const auth = await authenticateApiKey(request);
  const rawKey = request.headers.get("Authorization")?.slice(7) ?? auth.orgId;
  applyRateLimit(rawKey.slice(0, 8) || auth.orgId);
  return auth;
}

export async function GET(request, { params }) {
  let auth;
  try {
    auth = await getAuthWithRL(request);
  } catch (res) {
    return res;
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("*, customer:customers(id, first_name, last_name, email), bike:bikes(id, name, category)")
    .eq("id", params.id)
    .eq("organization_id", auth.orgId)
    .maybeSingle();

  if (error) return err("SERVER_ERROR", error.message, 500);
  if (!data) return err("NOT_FOUND", "Booking not found", 404);
  return ok(data);
}

export async function PATCH(request, { params }) {
  let auth;
  try {
    auth = await getAuthWithRL(request);
    requirePermission(auth.permissions, "bookings:write");
  } catch (res) {
    return res;
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return err("BAD_REQUEST", "Invalid JSON body");
  }

  const allowed = ["start_date", "end_date", "status", "notes", "total_price", "customer_id"];
  const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("bookings")
    .update(updates)
    .eq("id", params.id)
    .eq("organization_id", auth.orgId)
    .select()
    .maybeSingle();

  if (error) return err("SERVER_ERROR", error.message, 500);
  if (!data) return err("NOT_FOUND", "Booking not found", 404);
  return ok(data);
}
