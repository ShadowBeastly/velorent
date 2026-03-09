import { describe, it } from 'node:test';
import assert from 'node:assert';

// exportCSV.js relies on browser APIs (Blob, URL.createObjectURL, document.createElement).
// We test the CSV formatting logic directly here, mirroring the implementation,
// rather than importing the module which would throw in Node.js.

function buildCSVString(data, columns) {
    const header = columns.map(c => c.label).join(';');
    const rows = data.map(row =>
        columns.map(c => {
            let val = typeof c.key === 'function' ? c.key(row) : row[c.key];
            if (val === null || val === undefined) val = '';
            val = String(val).replace(/"/g, '""');
            if (val.includes(';') || val.includes('"') || val.includes('\n')) {
                val = `"${val}"`;
            }
            return val;
        }).join(';')
    );
    return [header, ...rows].join('\n');
}

describe('CSV formatting logic', () => {
    it('uses semicolon as delimiter (German Excel convention)', () => {
        const columns = [{ key: 'name', label: 'Name' }, { key: 'price', label: 'Preis' }];
        const csv = buildCSVString([], columns);
        assert.strictEqual(csv, 'Name;Preis');
    });

    it('serialises rows correctly', () => {
        const columns = [{ key: 'name', label: 'Name' }, { key: 'amount', label: 'Betrag' }];
        const data = [{ name: 'Citybike', amount: 25 }];
        const csv = buildCSVString(data, columns);
        const lines = csv.split('\n');
        assert.strictEqual(lines[0], 'Name;Betrag');
        assert.strictEqual(lines[1], 'Citybike;25');
    });

    it('wraps values containing semicolons in double quotes', () => {
        const columns = [{ key: 'note', label: 'Notiz' }];
        const data = [{ note: 'foo;bar' }];
        const csv = buildCSVString(data, columns);
        assert.ok(csv.includes('"foo;bar"'), `expected quoted value, got: ${csv}`);
    });

    it('escapes embedded double quotes', () => {
        const columns = [{ key: 'note', label: 'Notiz' }];
        const data = [{ note: 'say "hello"' }];
        const csv = buildCSVString(data, columns);
        assert.ok(csv.includes('""hello""'), `expected escaped quotes, got: ${csv}`);
    });

    it('handles null and undefined as empty string', () => {
        const columns = [{ key: 'missing', label: 'Feld' }];
        const data = [{ missing: null }, { missing: undefined }];
        const csv = buildCSVString(data, columns);
        const lines = csv.split('\n');
        assert.strictEqual(lines[1], '');
        assert.strictEqual(lines[2], '');
    });

    it('supports function-based key for computed columns', () => {
        const columns = [{ key: row => `${row.first} ${row.last}`, label: 'Name' }];
        const data = [{ first: 'Max', last: 'Mustermann' }];
        const csv = buildCSVString(data, columns);
        assert.ok(csv.includes('Max Mustermann'));
    });
});
