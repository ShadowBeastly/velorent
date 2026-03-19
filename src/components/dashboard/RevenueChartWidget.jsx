"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useApp } from "../../context/AppContext";
import { fmtCurrency } from "../../utils/formatters";

function CustomTooltip({ active, payload, label, darkMode }) {
    if (!active || !payload?.length) return null;
    return (
        <div className={`rounded-xl px-3 py-2 text-sm shadow-lg border-0 ${darkMode ? "bg-slate-800 text-white" : "bg-white text-slate-900"}`}
            style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}
        >
            <p className={`text-[11px] font-bold mb-0.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{label}</p>
            <p className="font-bold">{fmtCurrency(payload[0].value)}</p>
        </div>
    );
}

export default function RevenueChartWidget({ data = [] }) {
    const { darkMode } = useApp();

    const maxVal = Math.max(...data.map(d => d.value), 1);
    const total = data.reduce((s, d) => s + d.value, 0);

    return (
        <div className="premium-card p-6">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                        Umsatz — 12 Monate
                    </h3>
                    <p className={`text-sm mt-0.5 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                        Monatlicher Gesamtumsatz
                    </p>
                </div>
                <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${darkMode ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>
                    {fmtCurrency(total)} gesamt
                </div>
            </div>

            <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="28%">
                        <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke={darkMode ? "#1e293b" : "#f1f5f9"}
                        />
                        <XAxis
                            dataKey="month"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: darkMode ? "#64748b" : "#94a3b8", fontSize: 11 }}
                            dy={6}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: darkMode ? "#64748b" : "#94a3b8", fontSize: 11 }}
                            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
                            width={32}
                        />
                        <Tooltip
                            content={<CustomTooltip darkMode={darkMode} />}
                            cursor={{ fill: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", radius: 6 }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
                            {data.map((entry, idx) => (
                                <Cell
                                    key={`cell-${idx}`}
                                    fill={entry.value === maxVal
                                        ? "#1A7D5A"
                                        : darkMode ? "#334155" : "#e2e8f0"
                                    }
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
