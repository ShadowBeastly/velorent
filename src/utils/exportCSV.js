export function exportToCSV(data, columns, filename) {
    // columns = [{ key: 'field_name', label: 'Header Label' }, ...]
    const header = columns.map(c => c.label).join(';');
    const rows = data.map(row =>
        columns.map(c => {
            let val = typeof c.key === 'function' ? c.key(row) : row[c.key];
            if (val === null || val === undefined) val = '';
            // Escape semicolons and quotes for CSV
            val = String(val).replace(/"/g, '""');
            if (val.includes(';') || val.includes('"') || val.includes('\n')) {
                val = `"${val}"`;
            }
            return val;
        }).join(';')
    );
    const csv = '\uFEFF' + [header, ...rows].join('\n'); // BOM for Excel UTF-8
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}
