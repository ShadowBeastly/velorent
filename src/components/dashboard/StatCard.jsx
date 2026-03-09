"use client";
export default function StatCard({ title, value, subtitle, icon: Icon, color, darkMode, trend }) {
    const colors = {
        orange: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
        blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
        emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
        violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"
    };

    return (
        <div className="premium-card p-6 hover:-translate-y-1 transition-transform duration-300 animate-fade-in-up">
            <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl ${colors[color]} flex items-center justify-center ring-4 ring-white dark:ring-slate-800`}>
                    <Icon className="w-6 h-6" />
                </div>
                {trend && (
                    <span className={`text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 ${trend.isPositive
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                            : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                        }`}>
                        {trend.isPositive ? "↗" : "↘"} {trend.value}%
                    </span>
                )}
            </div>

            <div>
                <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{title}</p>
                <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">{value}</p>
                {subtitle && <p className={`text-sm mt-1 font-medium ${darkMode ? "text-slate-500" : "text-slate-500"}`}>{subtitle}</p>}
            </div>
        </div>
    );
}
