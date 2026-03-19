/**
 * pricingEngine.js — M2 Pricing Engine
 * Wraps calculateDynamicPrice with the new calculatePriceSync signature.
 * Full expansion rules (pricing_rule_conditions) are handled here once M2
 * migration is applied; for now this delegates to the existing logic.
 */

import { calculateDynamicPrice } from "./calculatePrice";

/**
 * Calculate price for a rental.
 *
 * @param {object}  bike         - Bike object (price_per_day, price_per_hour, …)
 * @param {string}  startDate    - YYYY-MM-DD
 * @param {string}  endDate      - YYYY-MM-DD
 * @param {number}  quantity     - Number of items (1 for single bike)
 * @param {Array}   pricingRules - Array of pricing_rules rows
 * @returns {{ totalPrice, baseTotal, dailyBreakdown, adjustments, savings }}
 */
export function calculatePriceSync(bike, startDate, endDate, quantity = 1, pricingRules = []) {
    if (!bike || !startDate || !endDate) {
        return { totalPrice: 0, baseTotal: 0, dailyBreakdown: [], adjustments: [], savings: 0 };
    }

    const base = calculateDynamicPrice(bike, startDate, endDate, pricingRules);
    const q = Math.max(1, quantity);

    return {
        totalPrice: base.totalPrice * q,
        baseTotal: base.baseTotal * q,
        dailyBreakdown: base.dailyBreakdown,
        adjustments: [],
        savings: Math.max(0, base.baseTotal * q - base.totalPrice * q),
    };
}
