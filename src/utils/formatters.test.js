import { describe, it } from 'node:test';
import assert from 'node:assert';
import { daysDiff, fmtCurrency, fmtISO } from './formatters.js';

describe('daysDiff', () => {
    it('same day returns 1', () => {
        assert.strictEqual(daysDiff('2024-03-10', '2024-03-10'), 1);
    });
    it('consecutive days returns 2', () => {
        assert.strictEqual(daysDiff('2024-03-10', '2024-03-11'), 2);
    });
    it('one week returns 8 (inclusive)', () => {
        assert.strictEqual(daysDiff('2024-03-10', '2024-03-17'), 8);
    });
});

describe('fmtCurrency', () => {
    it('formats number as EUR', () => {
        const result = fmtCurrency(1234.5);
        assert.ok(result.includes('1.234,50') || result.includes('1234,50'), `unexpected format: ${result}`);
    });
    it('handles null as 0', () => {
        const result = fmtCurrency(null);
        assert.ok(result.includes('0,00'), `unexpected format: ${result}`);
    });
});

describe('fmtISO', () => {
    it('formats Date object to YYYY-MM-DD string', () => {
        const result = fmtISO(new Date(2024, 2, 10)); // March 10 (month is 0-indexed)
        assert.strictEqual(result, '2024-03-10');
    });
    it('round-trips an ISO string', () => {
        assert.strictEqual(fmtISO('2024-07-04'), '2024-07-04');
    });
});
