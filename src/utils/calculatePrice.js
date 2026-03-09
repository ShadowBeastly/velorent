/**
 * Dynamic / seasonal pricing calculation.
 *
 * Schema assumptions for pricing_rules rows:
 *   type            – 'seasonal' | 'duration' | 'weekend'
 *   modifier_type   – 'multiplier' | 'discount_percent' | 'fixed_override'
 *   modifier_value  – numeric value for the modifier
 *   start_date / end_date  – for seasonal rules (YYYY-MM-DD strings)
 *   min_days        – for duration rules
 *   days_of_week    – int[] for weekend rules (0=Sun,1=Mon,…,6=Sat)
 *   bike_category   – TEXT category name to scope (null = all)
 *   bike_category_id – UUID to scope (null = all)
 *   is_active       – boolean
 *   priority        – higher wins when multiple rules match a day
 */

/**
 * Parse a YYYY-MM-DD string as local midnight (avoids UTC off-by-one).
 * @param {string|Date} s
 * @returns {Date}
 */
function toLocal(s) {
    if (s instanceof Date) return s;
    return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s)
        ? new Date(s + "T00:00:00")
        : new Date(s);
}

/**
 * Enumerate every calendar date between startDate and endDate (inclusive).
 * @param {string|Date} startDate
 * @param {string|Date} endDate
 * @returns {Date[]}
 */
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
 * Select the single best (highest-priority) matching per-day rule.
 * Only 'seasonal' and 'weekend' rules are evaluated per day.
 * @param {Date} date
 * @param {Object} bike
 * @param {Array}  rules  – all pricing_rules for the org
 * @returns {{ rule: Object|null, priority: number }}
 */
function bestDayRule(date, bike, rules) {
    const dayOfWeek = date.getDay(); // 0=Sun … 6=Sat
    const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD (UTC OK for comparison)

    let best = null;
    let bestPriority = -Infinity;

    for (const rule of rules) {
        if (!rule.is_active) continue;

        // Scope: does this rule apply to this bike's category?
        if (rule.bike_category && bike.category && rule.bike_category !== bike.category) continue;

        let matches = false;

        if (rule.type === "seasonal") {
            if (!rule.start_date || !rule.end_date) continue;
            matches = dateStr >= rule.start_date && dateStr <= rule.end_date;
        } else if (rule.type === "weekend") {
            const targetDays = Array.isArray(rule.days_of_week) ? rule.days_of_week : [0, 6];
            matches = targetDays.includes(dayOfWeek);
        }

        if (matches) {
            const p = rule.priority ?? 0;
            if (p > bestPriority) {
                best = rule;
                bestPriority = p;
            }
        }
    }

    return best;
}

/**
 * Apply a modifier to a base price and return the final per-day price.
 * @param {number} basePrice
 * @param {Object} rule
 * @returns {number}
 */
function applyModifier(basePrice, rule) {
    const value = Number(rule.modifier_value ?? 1);
    switch (rule.modifier_type) {
        case "multiplier":
            return Math.max(0, basePrice * value);
        case "discount_percent":
            return Math.max(0, basePrice * (1 - value / 100));
        case "fixed_override":
            return Math.max(0, value);
        default:
            return basePrice;
    }
}

/**
 * Check whether a duration rule applies to the booking length.
 * Returns the best matching duration rule (highest priority).
 * @param {number} totalDays
 * @param {Object} bike
 * @param {Array}  rules
 * @returns {Object|null}
 */
function bestDurationRule(totalDays, bike, rules) {
    let best = null;
    let bestPriority = -Infinity;

    for (const rule of rules) {
        if (!rule.is_active) continue;
        if (rule.type !== "duration") continue;
        if (rule.bike_category && bike.category && rule.bike_category !== bike.category) continue;
        if ((rule.min_days ?? 0) > totalDays) continue;

        const p = rule.priority ?? 0;
        if (p > bestPriority) {
            best = rule;
            bestPriority = p;
        }
    }

    return best;
}

/**
 * Calculate dynamic price for a booking.
 *
 * @param {Object}        bike         – must have `.price_per_day` and `.category`
 * @param {string|Date}   startDate    – booking start (inclusive)
 * @param {string|Date}   endDate      – booking end   (inclusive)
 * @param {Array}         pricingRules – all org pricing_rules rows
 * @returns {{
 *   totalPrice: number,
 *   baseTotal: number,
 *   dailyBreakdown: Array<{date: string, basePrice: number, modifier: string|null, finalPrice: number}>
 * }}
 */
export function calculateDynamicPrice(bike, startDate, endDate, pricingRules = []) {
    if (!bike || !startDate || !endDate) {
        return { totalPrice: 0, baseTotal: 0, dailyBreakdown: [] };
    }

    const basePrice = Number(bike.price_per_day) || 0;
    const days = enumerateDays(startDate, endDate);

    if (days.length === 0) {
        return { totalPrice: 0, baseTotal: 0, dailyBreakdown: [] };
    }

    const activeRules = (pricingRules || []).filter(r => r.is_active !== false);

    // 1. Per-day breakdown with seasonal/weekend rules
    const dailyBreakdown = days.map(date => {
        const rule = bestDayRule(date, bike, activeRules);
        const finalPrice = rule ? applyModifier(basePrice, rule) : basePrice;
        return {
            date: date.toISOString().slice(0, 10),
            basePrice,
            modifier: rule
                ? `${rule.name} (${rule.modifier_type}: ${rule.modifier_value})`
                : null,
            finalPrice
        };
    });

    let subtotal = dailyBreakdown.reduce((sum, d) => sum + d.finalPrice, 0);
    const baseTotal = basePrice * days.length;

    // 2. Duration rule applied to the subtotal (post per-day calc)
    const durationRule = bestDurationRule(days.length, bike, activeRules);
    if (durationRule) {
        const discounted = applyModifier(subtotal, durationRule);
        // Proportionally adjust each day so breakdown stays consistent
        const factor = subtotal > 0 ? discounted / subtotal : 1;
        dailyBreakdown.forEach(d => { d.finalPrice = d.finalPrice * factor; });
        subtotal = discounted;
    }

    return {
        totalPrice: Math.round(subtotal * 100) / 100,
        baseTotal: Math.round(baseTotal * 100) / 100,
        dailyBreakdown
    };
}
