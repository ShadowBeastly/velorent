// GET    /api/v1/bikes/[id]  — single bike
// PUT    /api/v1/bikes/[id]  — update bike (bikes:write)
// DELETE /api/v1/bikes/[id]  — delete bike (bikes:write)

import { authenticateApiKey, requirePermission } from "../../../../../src/utils/apiAuth";
import { applyRateLimit } from "../../../../../src/utils/rateLimiter";
import { getServiceClient, ok, err } from "../../_shared";

export const runtime = "nodejs";

async function getAuth(request) {
  const auth = await authenticateApiKey(request);
  const rawKey = request.headers.get("Authorization")?.slice(7) ?? auth.orgId;
  applyRateLimit(rawKey.slice(0, 8) || auth.orgId);
  return auth;
}

export async function GET(request, { params }) {
  let auth;
  try {
    auth = await getAuth(request);
  } catch (res) {
    return res;
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("bikes")
    .select("*")
    .eq("id", params.id)
    .eq("organization_id", auth.orgId)
    .maybeSingle();

  if (error) return err("SERVER_ERROR", error.message, 500);
  if (!data) return err("NOT_FOUND", "Bike not found", 404);
  return ok(data);
}

export async function PUT(request, { params }) {
  let auth;
  try {
    auth = await getAuth(request);
    requirePermission(auth.permissions, "bikes:write");
  } catch (res) {
    return res;
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return err("BAD_REQUEST", "Invalid JSON body");
  }

  // Only allow updating safe fields
  const allowed = ["name", "category", "price_per_day", "status", "description", "color", "size", "brand", "notes"];
  const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("bikes")
    .update(updates)
    .eq("id", params.id)
    .eq("organization_id", auth.orgId)
    .select()
    .maybeSingle();

  if (error) return err("SERVER_ERROR", error.message, 500);
  if (!data) return err("NOT_FOUND", "Bike not found", 404);
  return ok(data);
}

export async function DELETE(request, { params }) {
  let auth;
  try {
    auth = await getAuth(request);
    requirePermission(auth.permissions, "bikes:write");
  } catch (res) {
    return res;
  }

  const supabase = getServiceClient();
  const { error } = await supabase
    .from("bikes")
    .delete()
    .eq("id", params.id)
    .eq("organization_id", auth.orgId);

  if (error) return err("SERVER_ERROR", error.message, 500);
  return ok(null);
}
