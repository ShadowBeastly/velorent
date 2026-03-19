// GET  /api/v1/bikes  — list bikes with cursor pagination
// POST /api/v1/bikes  — create a bike (requires bikes:write)

import { authenticateApiKey, requirePermission } from "../../../../src/utils/apiAuth";
import { applyRateLimit } from "../../../../src/utils/rateLimiter";
import { getServiceClient, ok, err, parsePagination, buildPagination } from "../_shared";

export const runtime = "nodejs";

export async function GET(request) {
  let auth;
  try {
    auth = await authenticateApiKey(request);
  } catch (res) {
    return res;
  }

  const { orgId } = auth;
  // Extract key_prefix from Authorization for rate limiting
  const rawKey = request.headers.get("Authorization")?.slice(7) ?? orgId;
  const identifier = rawKey.slice(0, 8) || orgId;
  let rlHeaders;
  try {
    rlHeaders = applyRateLimit(identifier);
  } catch (res) {
    return res;
  }

  const { searchParams } = new URL(request.url);
  const { cursor, limit } = parsePagination(request.url);
  const status = searchParams.get("status");
  const category = searchParams.get("category");

  const supabase = getServiceClient();
  let query = supabase
    .from("bikes")
    .select("*", { count: "exact" })
    .eq("organization_id", orgId)
    .order("id", { ascending: true })
    .limit(limit + 1);

  if (cursor) query = query.gt("id", cursor);
  if (status) query = query.eq("status", status);
  if (category) query = query.eq("category", category);

  const { data, error, count } = await query;
  if (error) return err("SERVER_ERROR", error.message, 500);

  const { page, pagination } = buildPagination(data ?? [], limit);
  return ok(page, { pagination, meta: { total: count }, headers: rlHeaders });
}

export async function POST(request) {
  let auth;
  try {
    auth = await authenticateApiKey(request);
    requirePermission(auth.permissions, "bikes:write");
  } catch (res) {
    return res;
  }

  const rawKey = request.headers.get("Authorization")?.slice(7) ?? auth.orgId;
  const identifier = rawKey.slice(0, 8) || auth.orgId;
  try {
    applyRateLimit(identifier);
  } catch (res) {
    return res;
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return err("BAD_REQUEST", "Invalid JSON body");
  }

  const { name, category, price_per_day, status = "active" } = body;
  if (!name || !price_per_day) return err("BAD_REQUEST", "name and price_per_day are required");

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("bikes")
    .insert({ name, category, price_per_day, status, organization_id: auth.orgId })
    .select()
    .single();

  if (error) return err("SERVER_ERROR", error.message, 500);
  return ok(data, {});
}
