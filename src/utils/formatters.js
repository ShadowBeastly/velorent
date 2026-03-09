// ============ DATE UTILITIES ============
// Parse date strings as local time (not UTC) to avoid off-by-one in western timezones
const toLocal = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + "T00:00:00") : new Date(s);
export const fmtISO = (d) => { const dt = toLocal(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`; };
export const parseDate = (s) => toLocal(s);
export const addDays = (d, n) => { const r = toLocal(d); r.setDate(r.getDate() + n); return r; };
export const daysDiff = (a, b) => Math.ceil((toLocal(b) - toLocal(a)) / (1000 * 60 * 60 * 24)) + 1;

// ============ FORMAT UTILITIES ============
export const fmtDate = (s) => s ? toLocal(s).toLocaleDateString("de-DE") : "—";
export const fmtDateShort = (s) => toLocal(s).toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
export const fmtDateCompact = (d) => toLocal(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
export const fmtCurrency = (n) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n || 0);
