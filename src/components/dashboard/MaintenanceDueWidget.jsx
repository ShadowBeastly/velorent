"use client";
import { useRouter } from "next/navigation";
import { Wrench, AlertTriangle, Clock } from "lucide-react";
import { useApp } from "../../context/AppContext";

export default function MaintenanceDueWidget({ overdue = 0, dueSoon = 0 }) {
    const { darkMode } = useApp();
    const router = useRouter();

    const hasIssues = overdue > 0 || dueSoon > 0;

    return (
        <div
            onClick={() => router.push("/app/maintenance")}
            className={`premium-card p-6 cursor-pointer hover:-translate-y-1 transition-transform duration-300 group ${
                overdue > 0
                    ? darkMode ? "ring-1 ring-red-500/30" : "ring-1 ring-red-200"
                    : ""
            }`}
        >
            <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ring-4 ring-white dark:ring-slate-800 ${
                    overdue > 0
                        ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                        : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                }`}>
                    <Wrench className="w-6 h-6" />
                </div>
                <span className={`text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity ${
                    darkMode ? "text-slate-500" : "text-slate-400"
                }`}>
                    → Wartung
                </span>
            </div>

            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                Wartung
            </p>

            {!hasIssues ? (
                <div>
                    <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">✓</p>
                    <p className={`text-sm mt-1 font-medium ${darkMode ? "text-slate-500" : "text-slate-500"}`}>
                        Alles in Ordnung
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {overdue > 0 && (
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                            <span className="text-2xl font-bold text-red-600 dark:text-red-400 tabular-nums">{overdue}</span>
                            <span className={`text-sm font-medium ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                                überfällig
                            </span>
                        </div>
                    )}
                    {dueSoon > 0 && (
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">{dueSoon}</span>
                            <span className={`text-sm font-medium ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                                in 7 Tagen fällig
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
