"use client";

import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function RevenueChart({ bookings = [], darkMode }) {
    const data = useMemo(() => {
        const result = [];
        const today = new Date();

        // Last 7 days including today
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().slice(0, 10);
            const dayName = d.toLocaleDateString("de-DE", { weekday: 'short' });

            const dailyRevenue = bookings
                .filter(b => b.start_date === dateStr && b.status !== 'cancelled') // Assuming start_date is the revenue date
                .reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);

            result.push({ name: dayName, value: dailyRevenue, fullDate: dateStr });
        }
        return result;
    }, [bookings]);

    const totalRevenue = data.reduce((acc, curr) => acc + curr.value, 0);

    return (
        <div className="premium-card p-6 h-[400px] animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Umsatzentwicklung</h3>
                    <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Letzte 7 Tage</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${darkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                    Summe: €{totalRevenue}
                </div>
            </div>

            <div className="h-[300px] w-full">
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
                            tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 12 }}
                            dy={10}
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
