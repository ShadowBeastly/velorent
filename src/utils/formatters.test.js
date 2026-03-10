import { describe, it } from 'node:test';
import assert from 'node:assert';
import { daysDiff, fmtCurrency, fmtISO } from './formatters.js';
import { calculateLateFee } from './calculateLateFee.js';

function withMockedNow(nowIso, callback) {
    const RealDate = Date;

    class MockDate extends RealDate {
        constructor(...args) {
            if (args.length === 0) {
                super(nowIso);
                return;
            }
            super(...args);
        }

        static now() {
            return new RealDate(nowIso).getTime();
        }
    }

    global.Date = MockDate;

    try {
        callback();
    } finally {
        global.Date = RealDate;
    }
}

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

describe('calculateLateFee', () => {
    const booking = {
        status: 'picked_up',
        end_date: '2026-03-10',
        total_price: 90,
        total_days: 3,
    };

    const orgSettings = {
        late_fee_enabled: true,
        late_fee_type: 'fixed',
        late_fee_amount: 15,
        late_fee_grace_hours: 2,
    };

    it('ignores times before the return day is over', () => {
        withMockedNow('2026-03-10T23:30:00', () => {
            assert.deepStrictEqual(calculateLateFee(booking, orgSettings), {
                isLate: false,
                fee: 0,
                daysLate: 0,
                hoursLate: 0,
            });
        });
    });

    it('respects the grace window after midnight', () => {
        withMockedNow('2026-03-11T01:59:00', () => {
            assert.deepStrictEqual(calculateLateFee(booking, orgSettings), {
                isLate: false,
                fee: 0,
                daysLate: 0,
                hoursLate: 0,
            });
        });
    });

    it('starts charging after the grace window', () => {
        withMockedNow('2026-03-11T02:01:00', () => {
            const result = calculateLateFee(booking, orgSettings);

            assert.strictEqual(result.isLate, true);
            assert.strictEqual(result.fee, 15);
            assert.strictEqual(result.daysLate, 1);
            assert.strictEqual(result.hoursLate, 0);
        });
    });
});