export const fmtCurrency = (n) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n || 0);
export const fmtDate = (d) => new Date(d).toLocaleDateString("de-DE");
export const fmtDateShort = (d) => new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
