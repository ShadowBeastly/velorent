"use client";

import { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fmtCurrency } from '../../utils/formatters';

const PERIODS = [
    { label: "7 Tage", value: "7d" },
    { label: "30 Tage", value: "30d" },
    { label: "90 Tage", value: "90w" },
    { label: "12 Monate", value: "12m" },
];

const MONTH_NAMES = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

export default function RevenueChart({ bookings = [], darkMode }) {
    const [period, setPeriod] = useState("7d");

    const data = useMemo(() => {
        const today = new Date();

        if (period === "7d") {
            const result = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                const dateStr = d.toISOString().slice(0, 10);
                const dayName = d.toLocaleDateString("de-DE", { weekday: 'short' });
                const dailyRevenue = bookings
                    .filter(b => b.start_date === dateStr && b.status !== 'cancelled')
                    .reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);
                result.push({ name: dayName, value: dailyRevenue, fullDate: dateStr });
            }
            return result;
        }

        if (period === "30d") {
            const result = [];
            for (let i = 29; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                const dateStr = d.toISOString().slice(0, 10);
                // Show every 5th label to avoid crowding
                const label = i % 5 === 0 ? `${d.getDate()}.${d.getMonth() + 1}.` : "";
                const dailyRevenue = bookings
                    .filter(b => b.start_date === dateStr && b.status !== 'cancelled')
                    .reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);
                result.push({ name: label, value: dailyRevenue, fullDate: dateStr });
            }
            return result;
        }

        if (period === "90w") {
            // 13 complete weeks (91 days), grouped by week
            const result = [];
            // Find the start of the current week (Monday)
            const startOfToday = new Date(today);
            startOfToday.setHours(0, 0, 0, 0);
            // Go back 12 full weeks so we have 13 weeks total (current + 12 past)
            for (let w = 12; w >= 0; w--) {
                const weekStart = new Date(startOfToday);
                weekStart.setDate(weekStart.getDate() - w * 7 - startOfToday.getDay() + 1);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);

                const weekStartStr = weekStart.toISOString().slice(0, 10);
                const weekEndStr = weekEnd.toISOString().slice(0, 10);

                const weekRevenue = bookings
                    .filter(b => b.start_date >= weekStartStr && b.start_date <= weekEndStr && b.status !== 'cancelled')
                    .reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);

                const label = `${weekStart.getDate()}.${weekStart.getMonth() + 1}.`;
                result.push({ name: label, value: weekRevenue, fullDate: `${weekStartStr} – ${weekEndStr}` });
            }
            return result;
        }

        if (period === "12m") {
            const result = [];
            for (let i = 11; i >= 0; i--) {
                const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
                const year = d.getFullYear();
                const month = d.getMonth(); // 0-based
                const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

                const monthRevenue = bookings
                    .filter(b => b.start_date && b.start_date.startsWith(monthStr) && b.status !== 'cancelled')
                    .reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);

                result.push({ name: MONTH_NAMES[month], value: monthRevenue, fullDate: `${MONTH_NAMES[month]} ${year}` });
            }
            return result;
        }

        return [];
    }, [bookings, period]);

    const totalRevenue = data.reduce((acc, curr) => acc + curr.value, 0);

    const periodLabel = PERIODS.find(p => p.value === period)?.label ?? "";

    return (
        <div className="premium-card p-6 h-[400px] animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Umsatzentwicklung</h3>
                    <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{periodLabel}</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Period pills */}
                    <div className={`flex items-center gap-1 p-1 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                        {PERIODS.map(p => (
                            <button
                                key={p.value}
                                onClick={() => setPeriod(p.value)}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-200 ${
                                    period === p.value
                                        ? 'bg-brand-500 text-white shadow-sm'
                                        : darkMode
                                            ? 'text-slate-400 hover:text-slate-200'
                                            : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                    {/* Total badge */}
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${darkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                        {fmtCurrency(totalRevenue)}
                    </div>
                </div>
            </div>

            <div className="h-[290px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#334155' : '#e2e8f0'} />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 11 }}
                            dy={10}
                            interval={period === "30d" ? 4 : "preserveStartEnd"}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 12 }}
                            tickFormatter={(value) => `€${value}`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: darkMode ? '#1e293b' : '#fff',
                                border: 'none',
                                borderRadius: '12px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                            itemStyle={{ color: darkMode ? '#fff' : '#0f172a' }}
                            formatter={(value) => [`€${value}`, "Umsatz"]}
                            labelFormatter={(label, payload) => {
                                if (payload && payload.length > 0) {
                                    return payload[0].payload.fullDate;
                                }
                                return label;
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            name="Umsatz"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorValue)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
