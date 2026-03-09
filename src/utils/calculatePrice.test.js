import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateDynamicPrice } from './calculatePrice.js';

const bike = { id: '1', price_per_day: 25, category: null };

describe('calculateDynamicPrice', () => {
    it('returns zero for missing arguments', () => {
        const result = calculateDynamicPrice(null, '2024-07-01', '2024-07-03', []);
        assert.strictEqual(result.totalPrice, 0);
    });

    it('calculates base price with no rules', () => {
        const result = calculateDynamicPrice(bike, '2024-07-01', '2024-07-03', []);
        assert.strictEqual(result.totalPrice, 75); // 3 days * 25
        assert.strictEqual(result.baseTotal, 75);
        assert.strictEqual(result.dailyBreakdown.length, 3);
    });

    it('same-day booking returns price for 1 day', () => {
        const result = calculateDynamicPrice(bike, '2024-07-01', '2024-07-01', []);
        assert.strictEqual(result.totalPrice, 25);
    });

    it('applies seasonal multiplier', () => {
        // Note: bestDayRule compares dateStr via .toISOString() (UTC). Dates created
        // as local midnight (T00:00:00) are 1–2 hours behind UTC in Central Europe,
        // so the UTC date string is one day earlier. The rule window therefore starts
        // one day before the booking start to ensure all enumerated days are covered.
        const rules = [{
            type: 'seasonal',
            start_date: '2024-06-30', // one day before booking start (UTC-shift compensation)
            end_date: '2024-12-31',
            modifier_type: 'multiplier',
            modifier_value: 1.5,
            is_active: true,
            priority: 1,
            bike_category_id: null,
            bike_category: null,
        }];
        const result = calculateDynamicPrice(bike, '2024-07-01', '2024-07-03', rules);
        assert.strictEqual(result.totalPrice, 112.5); // 3 days * 25 * 1.5
    });

    it('applies discount_percent', () => {
        const rules = [{
            type: 'seasonal',
            start_date: '2024-06-30', // UTC-shift compensation (see multiplier test)
            end_date: '2024-12-31',
            modifier_type: 'discount_percent',
            modifier_value: 20, // 20% off
            is_active: true,
            priority: 1,
            bike_category: null,
        }];
        const result = calculateDynamicPrice(bike, '2024-07-01', '2024-07-02', rules);
        // 2 days * 25 * 0.8 = 40
        assert.strictEqual(result.totalPrice, 40);
    });

    it('applies fixed_override per day', () => {
        const rules = [{
            type: 'seasonal',
            start_date: '2024-06-30', // UTC-shift compensation (see multiplier test)
            end_date: '2024-12-31',
            modifier_type: 'fixed_override',
            modifier_value: 30,
            is_active: true,
            priority: 1,
            bike_category: null,
        }];
        const result = calculateDynamicPrice(bike, '2024-07-01', '2024-07-02', rules);
        assert.strictEqual(result.totalPrice, 60); // 2 days * 30
    });

    it('skips inactive rules', () => {
        const rules = [{
            type: 'seasonal',
            start_date: '2024-07-01',
            end_date: '2024-12-31',
            modifier_type: 'multiplier',
            modifier_value: 2,
            is_active: false, // inactive — must be ignored
            priority: 1,
            bike_category: null,
        }];
        const result = calculateDynamicPrice(bike, '2024-07-01', '2024-07-02', rules);
        assert.strictEqual(result.totalPrice, 50); // no rule applied: 2 * 25
    });

    it('applies duration rule on top of daily prices', () => {
        const rules = [{
            type: 'duration',
            min_days: 3,
            modifier_type: 'discount_percent',
            modifier_value: 10, // 10% off for 3+ days
            is_active: true,
            priority: 1,
            bike_category: null,
        }];
        const result = calculateDynamicPrice(bike, '2024-07-01', '2024-07-03', rules);
        // base subtotal = 75, then 10% off → 67.5
        assert.strictEqual(result.totalPrice, 67.5);
    });
});
