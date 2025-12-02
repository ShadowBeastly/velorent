export const fmtISO = (d) => new Date(d).toISOString().slice(0, 10);
export const parseDate = (s) => new Date(s + "T00:00:00");
export const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
export const daysDiff = (a, b) => Math.ceil((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24)) + 1;
export const fmtDate = (s) => s ? new Date(s).toLocaleDateString("de-DE") : "—";
export const fmtDateShort = (s) => new Date(s).toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
