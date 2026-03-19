// GET  /api/v1/customers  — list customers
// POST /api/v1/customers  — create customer (customers:write)

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
  const search = searchParams.get("q");

  const supabase = getServiceClient();
  let query = supabase
    .from("customers")
    .select("*", { count: "exact" })
    .eq("organization_id", auth.orgId)
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (cursor) query = query.lt("id", cursor);
  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query;
  if (error) return err("SERVER_ERROR", error.message, 500);

  const { page, pagination } = buildPagination(data ?? [], limit);
  return ok(page, { pagination, meta: { total: count } });
}

export async function POST(request) {
  let auth;
  try {
    auth = await getAuthWithRL(request);
    requirePermission(auth.permissions, "customers:write");
  } catch (res) {
    return res;
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return err("BAD_REQUEST", "Invalid JSON body");
  }

  const { first_name, last_name, email, phone, address, notes } = body;
  if (!first_name || !last_name) return err("BAD_REQUEST", "first_name and last_name are required");

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({ first_name, last_name, email, phone, address, notes, organization_id: auth.orgId })
    .select()
    .single();

  if (error) return err("SERVER_ERROR", error.message, 500);
  return Response.json({ data }, { status: 201 });
}
