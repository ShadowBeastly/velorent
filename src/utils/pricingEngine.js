/**
 * pricingEngine.js — M2 Pricing Engine
 *
 * Replaces calculatePrice.js with a richer model:
 * - ALL matching rules apply cumulatively per day (not just highest-priority winner)
 * - Supports pricing_rule_conditions table for complex conditions
 * - Returns per-rule adjustments per day + savings summary
 *
 * Supports both old schema (modifier_type/modifier_value) and new schema
 * (adjustment_type/adjustment_value) transparently.
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toLocal(s) {
    if (s instanceof Date) return s;
    return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s)
        ? new Date(s + "T00:00:00")
        : new Date(s);
}

function enumerateDays(startDate, endDate) {
    const days = [];
    const cur = toLocal(startDate);
    const end = toLocal(endDate);
    while (cur <= end) {
        days.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
    }
    return days;
}

/**
 * Normalize a rule's adjustment to a standard descriptor.
 * Supports old schema (modifier_type/modifier_value) and new schema (adjustment_type/adjustment_value).
 *
 * @returns {{ type: 'percentage'|'fixed'|'multiplier'|'fixed_override', value: number } | null}
 */
function normalizeAdjustment(rule) {
    // New schema takes priority
    if (rule.adjustment_type != null && rule.adjustment_value != null) {
        return { type: rule.adjustment_type, value: Number(rule.adjustment_value) };
    }
    // Old schema fallback
    switch (rule.modifier_type) {
        case "multiplier":
            return { type: "multiplier", value: Number(rule.modifier_value ?? 1) };
        case "discount_percent":
            return { type: "percentage", value: -Number(rule.modifier_value ?? 0) };
        case "fixed_override":
            return { type: "fixed_override", value: Number(rule.modifier_value ?? 0) };
        default:
            return null;
    }
}

/**
 * Apply an adjustment to a running price.
 * @param {number} currentPrice
 * @param {{ type: string, value: number }} adjustment
 * @returns {{ newPrice: number, adjustmentAmount: number }}
 */
function applyAdjustment(currentPrice, adjustment) {
    if (!adjustment) return { newPrice: currentPrice, adjustmentAmount: 0 };
    switch (adjustment.type) {
        case "percentage": {
            const amount = Math.round(currentPrice * (adjustment.value / 100) * 100) / 100;
            return { newPrice: Math.max(0, currentPrice + amount), adjustmentAmount: amount };
        }
        case "fixed": {
            return {
                newPrice: Math.max(0, currentPrice + adjustment.value),
                adjustmentAmount: adjustment.value
            };
        }
        case "multiplier": {
            const newPrice = Math.max(0, currentPrice * adjustment.value);
            return { newPrice, adjustmentAmount: Math.round((newPrice - currentPrice) * 100) / 100 };
        }
        case "fixed_override": {
            const newPrice = Math.max(0, adjustment.value);
            return { newPrice, adjustmentAmount: newPrice - currentPrice };
        }
        default:
            return { newPrice: currentPrice, adjustmentAmount: 0 };
    }
}

/**
 * Extract conditions array from a rule (supports nested .pricing_rule_conditions or flat array).
 */
function getConditions(rule) {
    return Array.isArray(rule.pricing_rule_conditions) ? rule.pricing_rule_conditions : [];
}

/**
 * Check if a rule matches a specific calendar day.
 * Checks direct rule columns (old schema) AND pricing_rule_conditions (new schema).
 */
function ruleMatchesDay(rule, date) {
    const dateStr = date.toISOString().slice(0, 10);
    const dayOfWeek = date.getDay(); // 0=Sun … 6=Sat
    const conditions = getConditions(rule);

    // Old schema: direct type-based checks
    if (rule.type === "seasonal") {
        if (!rule.start_date || !rule.end_date) return false;
        return dateStr >= rule.start_date && dateStr <= rule.end_date;
    }
    if (rule.type === "weekend") {
        const targetDays = Array.isArray(rule.days_of_week) ? rule.days_of_week : [0, 6];
        return targetDays.includes(dayOfWeek);
    }
    // duration/group rules are not per-day
    if (rule.type === "duration" || rule.type === "group") return false;

    // New schema: infer from conditions
    const dayConditions = conditions.filter(
        c => c.condition_type === "date_range" || c.condition_type === "weekday"
    );
    if (dayConditions.length === 0) {
        // No day conditions → matches all days (generic rule)
        return true;
    }
    return dayConditions.every(c => {
        if (c.condition_type === "date_range") {
            if (!c.date_start || !c.date_end) return true;
            return dateStr >= c.date_start && dateStr <= c.date_end;
        }
        if (c.condition_type === "weekday") {
            const wds = Array.isArray(c.weekdays) ? c.weekdays : [0, 6];
            return wds.includes(dayOfWeek);
        }
        return true;
    });
}

/**
 * Check if a booking-level rule (duration/quantity) applies to this booking.
 */
function ruleMatchesBooking(rule, totalDays, quantity) {
    const conditions = getConditions(rule);

    // Old schema: duration rule
    if (rule.type === "duration") {
        return totalDays >= (rule.min_days ?? 0);
    }
    // Old schema: group rule with min_days as fallback
    if (rule.type === "group") {
        const qtyCondition = conditions.find(c => c.condition_type === "min_quantity");
        const minQty = qtyCondition ? (qtyCondition.min_value ?? 1) : (rule.min_days ?? 1);
        return quantity >= minQty;
    }

    // New schema: check booking-level conditions
    const bookingConditions = conditions.filter(
        c => c.condition_type === "min_duration" || c.condition_type === "min_quantity"
    );
    if (bookingConditions.length === 0) return false;
    return bookingConditions.every(c => {
        if (c.condition_type === "min_duration") return totalDays >= (c.min_value ?? 0);
        if (c.condition_type === "min_quantity") return quantity >= (c.min_value ?? 1);
        return true;
    });
}

/**
 * Determine if a rule is per-day vs. booking-level.
 */
function isBookingLevelRule(rule) {
    if (rule.type === "duration" || rule.type === "group") return true;
    const conditions = getConditions(rule);
    const hasBookingCondition = conditions.some(
        c => c.condition_type === "min_duration" || c.condition_type === "min_quantity"
    );
    const hasDayCondition = conditions.some(
        c => c.condition_type === "date_range" || c.condition_type === "weekday"
    );
    return hasBookingCondition && !hasDayCondition;
}

/**
 * Aggregate per-day adjustments into a booking-level summary.
 * Returns sorted array of {ruleName, totalAmount} for rules that had a non-zero impact.
 *
 * @param {Array} dailyBreakdown
 * @returns {Array<{ruleName: string, totalAmount: number}>}
 */
export function aggregateAdjustments(dailyBreakdown) {
    const totals = {};
    for (const day of dailyBreakdown) {
        for (const adj of day.adjustments) {
            totals[adj.ruleName] = (totals[adj.ruleName] ?? 0) + adj.amount;
        }
    }
    return Object.entries(totals)
        .map(([ruleName, totalAmount]) => ({
            ruleName,
            totalAmount: Math.round(totalAmount * 100) / 100
        }))
        .filter(a => Math.abs(a.totalAmount) > 0.001);
}

// ─── Core Engine ───────────────────────────────────────────────────────────────

/**
 * Pure sync price calculation — works with pre-loaded rules.
 * Each rule may optionally have a nested `pricing_rule_conditions` array.
 *
 * @param {Object}      bike        — must have price_per_day, id, category (optional)
 * @param {string|Date} startDate   — booking start (inclusive)
 * @param {string|Date} endDate     — booking end (inclusive)
 * @param {number}      quantity    — number of items/bikes (for group discount)
 * @param {Array}       rules       — pricing_rules rows (may include nested pricing_rule_conditions)
 * @returns {{
 *   basePricePerDay: number,
 *   dailyBreakdown: Array<{date: string, basePrice: number, adjustments: Array<{ruleName: string, amount: number}>, dayTotal: number}>,
 *   totalPrice: number,
 *   totalSavings: number,
 *   baseTotal: number,
 *   adjustmentsSummary: Array<{ruleName: string, totalAmount: number}>
 * }}
 */
export function calculatePriceSync(bike, startDate, endDate, quantity = 1, rules = []) {
    if (!bike || !startDate || !endDate) {
        return {
            basePricePerDay: 0, dailyBreakdown: [], totalPrice: 0,
            totalSavings: 0, baseTotal: 0, adjustmentsSummary: []
        };
    }

    const basePricePerDay = Number(bike.price_per_day) || 0;
    const days = enumerateDays(startDate, endDate);

    if (days.length === 0) {
        return {
            basePricePerDay, dailyBreakdown: [], totalPrice: 0,
            totalSavings: 0, baseTotal: 0, adjustmentsSummary: []
        };
    }

    const totalDays = days.length;
    const activeRules = rules.filter(r => r.is_active !== false);

    // Scope filter: only keep rules that apply to this bike's category / id
    const applicableRules = activeRules.filter(rule => {
        if (rule.bike_id && rule.bike_id !== bike.id) return false;
        if (rule.bike_category_id && rule.bike_category_id !== bike.category_id) return false;
        if (rule.bike_category && bike.category && rule.bike_category !== bike.category) return false;
        return true;
    });

    const sortedRules = [...applicableRules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    const perDayRules = sortedRules.filter(r => !isBookingLevelRule(r));
    const bookingRules = sortedRules.filter(r => isBookingLevelRule(r));

    // ── 1. Per-day breakdown ────────────────────────────────────────────────────
    const dailyBreakdown = days.map(date => {
        let dayTotal = basePricePerDay;
        const adjustments = [];

        for (const rule of perDayRules) {
            if (!ruleMatchesDay(rule, date)) continue;
            const adj = normalizeAdjustment(rule);
            if (!adj) continue;
            const { newPrice, adjustmentAmount } = applyAdjustment(dayTotal, adj);
            if (Math.abs(adjustmentAmount) > 0.001) {
                adjustments.push({
                    ruleName: rule.name,
                    amount: Math.round(adjustmentAmount * 100) / 100
                });
            }
            dayTotal = newPrice;
        }

        return {
            date: date.toISOString().slice(0, 10),
            basePrice: basePricePerDay,
            adjustments,
            dayTotal: Math.round(dayTotal * 100) / 100
        };
    });

    let subtotal = dailyBreakdown.reduce((sum, d) => sum + d.dayTotal, 0);
    const baseTotal = basePricePerDay * totalDays;

    // ── 2. Booking-level rules (duration, group) ────────────────────────────────
    for (const rule of bookingRules) {
        if (!ruleMatchesBooking(rule, totalDays, quantity)) continue;
        const adj = normalizeAdjustment(rule);
        if (!adj) continue;
        const { newPrice, adjustmentAmount } = applyAdjustment(subtotal, adj);
        if (Math.abs(adjustmentAmount) < 0.001) continue;

        // Distribute the booking-level adjustment proportionally across all days
        const factor = subtotal > 0 ? newPrice / subtotal : 1;
        for (const day of dailyBreakdown) {
            const dayAdj = Math.round((day.dayTotal * factor - day.dayTotal) * 100) / 100;
            if (Math.abs(dayAdj) > 0.001) {
                day.adjustments.push({ ruleName: rule.name, amount: dayAdj });
            }
            day.dayTotal = Math.round(day.dayTotal * factor * 100) / 100;
        }
        subtotal = newPrice;
    }

    const totalPrice = Math.round(subtotal * 100) / 100;
    const totalSavings = Math.round((baseTotal - totalPrice) * 100) / 100;
    const adjustmentsSummary = aggregateAdjustments(dailyBreakdown);

    return { basePricePerDay, dailyBreakdown, totalPrice, totalSavings, baseTotal, adjustmentsSummary };
}

/**
 * Async version — loads bike, active pricing rules, and conditions from Supabase.
 *
 * @param {string}  bikeId
 * @param {string}  startDate       YYYY-MM-DD
 * @param {string}  endDate         YYYY-MM-DD
 * @param {number}  quantity        number of items
 * @param {string}  orgId
 * @param {Object}  supabaseClient  Supabase browser/server client
 */
export async function calculatePrice(bikeId, startDate, endDate, quantity = 1, orgId, supabaseClient) {
    const { data: bike, error: bikeError } = await supabaseClient
        .from("bikes")
        .select("id, name, price_per_day, category, category_id")
        .eq("id", bikeId)
        .single();
    if (bikeError || !bike) throw new Error(`Bike not found: ${bikeId}`);

    const { data: rules, error: rulesError } = await supabaseClient
        .from("pricing_rules")
        .select("*, pricing_rule_conditions(*)")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .order("priority", { ascending: false });
    if (rulesError) throw new Error(`Failed to load pricing rules: ${rulesError.message}`);

    return calculatePriceSync(bike, startDate, endDate, quantity, rules || []);
}
