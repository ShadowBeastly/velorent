// GET  /api/v1/bookings  — list bookings
// POST /api/v1/bookings  — create booking (bookings:write)

import { authenticateApiKey, requirePermission } from "../../../../src/utils/apiAuth";
import { applyRateLimit } from "../../../../src/utils/rateLimiter";
import { getServiceClient, ok, err, parsePagination, buildPagination } from "../_shared";

export const runtime = "nodejs";

async function getAuthWithRL(request) {
  const auth = await authenticateApiKey(request);
  const rawKey = request.headers.get("Authorization")?.slice(7) ?? auth.orgId;
  applyRateLimit(rawKey.slice(0, 8) || auth.orgId);
  return auth;
}

export async function GET(request) {
  let auth;
  try {
    auth = await getAuthWithRL(request);
  } catch (res) {
    return res;
  }

  const { searchParams } = new URL(request.url);
  const { cursor, limit } = parsePagination(request.url);
  const status = searchParams.get("status");
  const customerId = searchParams.get("customer_id");

  const supabase = getServiceClient();
  let query = supabase
    .from("bookings")
    .select("*, customer:customers(id, first_name, last_name, email)", { count: "exact" })
    .eq("organization_id", auth.orgId)
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (cursor) query = query.lt("id", cursor);
  if (status) query = query.eq("status", status);
  if (customerId) query = query.eq("customer_id", customerId);

  const { data, error, count } = await query;
  if (error) return err("SERVER_ERROR", error.message, 500);

  const { page, pagination } = buildPagination(data ?? [], limit);
  return ok(page, { pagination, meta: { total: count } });
}

export async function POST(request) {
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

  const { bike_id, customer_id, start_date, end_date, total_price, notes } = body;
  if (!bike_id || !start_date || !end_date) {
    return err("BAD_REQUEST", "bike_id, start_date, and end_date are required");
  }

  const supabase = getServiceClient();

  // Verify bike belongs to org
  const { data: bike } = await supabase
    .from("bikes")
    .select("id")
    .eq("id", bike_id)
    .eq("organization_id", auth.orgId)
    .maybeSingle();
  if (!bike) return err("NOT_FOUND", "Bike not found or not accessible", 404);

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      bike_id,
      customer_id: customer_id ?? null,
      start_date,
      end_date,
      total_price: total_price ?? 0,
      notes: notes ?? null,
      status: "confirmed",
      organization_id: auth.orgId,
    })
    .select()
    .single();

  if (error) return err("SERVER_ERROR", error.message, 500);
  return Response.json({ data }, { status: 201 });
}
