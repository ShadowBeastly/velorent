// GET /api/v1/customers/[id]  — single customer

import { authenticateApiKey } from "../../../../../src/utils/apiAuth";
import { applyRateLimit } from "../../../../../src/utils/rateLimiter";
import { getServiceClient, ok, err } from "../../_shared";

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

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", params.id)
    .eq("organization_id", auth.orgId)
    .maybeSingle();

  if (error) return err("SERVER_ERROR", error.message, 500);
  if (!data) return err("NOT_FOUND", "Customer not found", 404);
  return ok(data);
}
