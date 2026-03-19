// POST /api/v1/pricing/calculate
// Body: { bikeId, startDate, endDate, quantity? }
// Returns dynamic price breakdown using calculateDynamicPrice.

import { authenticateApiKey } from "../../../../../src/utils/apiAuth";
import { applyRateLimit } from "../../../../../src/utils/rateLimiter";
import { getServiceClient, ok, err } from "../../_shared";
import { calculateDynamicPrice } from "../../../../../src/utils/calculatePrice";

export const runtime = "nodejs";

export async function POST(request) {
  let auth;
  try {
    auth = await authenticateApiKey(request);
    const rawKey = request.headers.get("Authorization")?.slice(7) ?? auth.orgId;
    applyRateLimit(rawKey.slice(0, 8) || auth.orgId);
  } catch (res) {
    return res;
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return err("BAD_REQUEST", "Invalid JSON body");
  }

  const { bikeId, startDate, endDate, quantity = 1 } = body;
  if (!bikeId || !startDate || !endDate) {
    return err("BAD_REQUEST", "bikeId, startDate, and endDate are required");
  }

  const supabase = getServiceClient();

  // Load bike
  const { data: bike, error: bikeErr } = await supabase
    .from("bikes")
    .select("id, name, category, price_per_day")
    .eq("id", bikeId)
    .eq("organization_id", auth.orgId)
    .maybeSingle();

  if (bikeErr) return err("SERVER_ERROR", bikeErr.message, 500);
  if (!bike) return err("NOT_FOUND", "Bike not found", 404);

  // Load active pricing rules for this org
  const { data: pricingRules, error: rulesErr } = await supabase
    .from("pricing_rules")
    .select("*")
    .eq("organization_id", auth.orgId)
    .eq("is_active", true);

  if (rulesErr) return err("SERVER_ERROR", rulesErr.message, 500);

  const result = calculateDynamicPrice(bike, startDate, endDate, pricingRules ?? []);

  return ok({
    bike_id: bikeId,
    start_date: startDate,
    end_date: endDate,
    quantity,
    price_per_unit: result.totalPrice,
    total_price: Math.round(result.totalPrice * quantity * 100) / 100,
    base_total: result.baseTotal,
    savings: Math.round((result.baseTotal - result.totalPrice) * 100) / 100,
    daily_breakdown: result.dailyBreakdown,
  });
}
