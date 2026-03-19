"use client";
import { ChevronLeft, ChevronRight, Plus, Filter } from "lucide-react";

const VIEW_MODES = [
    { id: "day", label: "Tag" },
    { id: "week", label: "Woche" },
    { id: "month", label: "Monat" },
    { id: "gantt", label: "Gantt" },
];

const STATUS_FILTERS = [
    { id: "reserved", label: "Reserviert", color: "bg-amber-500" },
    { id: "confirmed", label: "Bestätigt", color: "bg-blue-500" },
    { id: "picked_up", label: "Aktiv", color: "bg-emerald-500" },
    { id: "overdue", label: "Überfällig", color: "bg-red-500" },
    { id: "maintenance", label: "Wartung", color: "bg-orange-500" },
];

function formatDateLabel(date, viewMode) {
    if (viewMode === "day") {
        return date.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    }
    if (viewMode === "week") {
        const start = new Date(date);
        const day = start.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        start.setDate(start.getDate() + diff);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        const startStr = start.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
        const endStr = end.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" });
        return `${startStr} – ${endStr}`;
    }
    return date.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
}

export default function CalendarToolbar({
    viewMode,
    onViewMode,
    currentDate,
    onPrev,
    onNext,
    onToday,
    categories,
    categoryFilter,
    onCategoryFilter,
    statusFilter,
    onStatusFilter,
    onNewBooking,
    darkMode,
}) {
    const toggleStatus = (id) => {
        if (statusFilter.includes(id)) {
            onStatusFilter(statusFilter.filter(s => s !== id));
        } else {
            onStatusFilter([...statusFilter, id]);
        }
    };

    return (
        <div className={`premium-card p-3 flex flex-col gap-3 z-30 relative shadow-xl shadow-slate-200/50 dark:shadow-black/20`}>
            <div className="flex flex-col lg:flex-row gap-3 justify-between items-start lg:items-center">
                {/* Left: nav + view toggle */}
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Date navigation */}
                    <div className={`flex items-center rounded-xl border p-1 ${darkMode ? "bg-slate-800/80 border-slate-700" : "bg-slate-100 border-slate-200"}`}>
                        <button
                            onClick={onPrev}
                            className={`p-2 rounded-lg transition-all ${darkMode ? "hover:bg-slate-700 text-slate-400 hover:text-white" : "hover:bg-white text-slate-500 hover:text-slate-900"}`}
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="px-3 min-w-[200px] text-center">
                            <span className={`font-bold text-sm ${darkMode ? "text-white" : "text-slate-900"}`}>
                                {formatDateLabel(currentDate, viewMode)}
                            </span>
                        </div>
                        <button
                            onClick={onNext}
                            className={`p-2 rounded-lg transition-all ${darkMode ? "hover:bg-slate-700 text-slate-400 hover:text-white" : "hover:bg-white text-slate-500 hover:text-slate-900"}`}
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Today button */}
                    <button
                        onClick={onToday}
                        className="px-4 py-2 text-sm font-bold text-[#1A7D5A] bg-[#D4EDE2] hover:bg-[#C5E5D4] dark:bg-[#1A7D5A]/20 dark:text-[#3BAA82] rounded-xl transition-colors border border-[#1A7D5A]/30"
                    >
                        Heute
                    </button>

                    {/* View mode toggle (desktop) */}
                    <div className={`hidden md:flex rounded-xl border p-1 ${darkMode ? "bg-slate-800/80 border-slate-700" : "bg-slate-100 border-slate-200"}`}>
                        {VIEW_MODES.map(mode => (
                            <button
                                key={mode.id}
                                onClick={() => onViewMode(mode.id)}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    viewMode === mode.id
                                        ? (darkMode ? "bg-slate-700 text-white shadow-sm" : "bg-white text-slate-900 shadow-sm")
                                        : (darkMode ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900")
                                }`}
                            >
                                {mode.label}
                            </button>
                        ))}
                    </div>

                    {/* Mobile view switcher */}
                    <select
                        value={viewMode}
                        onChange={e => onViewMode(e.target.value)}
                        className={`md:hidden px-3 py-1.5 rounded-xl border text-xs font-bold outline-none ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-100 border-slate-200 text-slate-900"}`}
                    >
                        {VIEW_MODES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </select>
                </div>

                {/* Right: filters + new booking */}
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Category filter */}
                    <select
                        value={categoryFilter}
                        onChange={e => onCategoryFilter(e.target.value)}
                        className={`px-3 py-2 rounded-xl border text-sm outline-none ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`}
                    >
                        <option value="all">Alle Kategorien</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>

                    {/* New booking button */}
                    <button
                        onClick={onNewBooking}
                        className="btn-primary flex items-center gap-2 whitespace-nowrap py-2.5 px-5 rounded-xl shadow-lg shadow-[#1A7D5A]/20 hover:shadow-[#1A7D5A]/30 hover:-translate-y-0.5 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline font-bold">Neue Buchung</span>
                    </button>
                </div>
            </div>

            {/* Status filter chips */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className={`flex items-center gap-1 text-xs font-semibold ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                    <Filter className="w-3.5 h-3.5" />
                    Status:
                </span>
                {STATUS_FILTERS.map(sf => {
                    const isActive = statusFilter.length === 0 || statusFilter.includes(sf.id);
                    return (
                        <button
                            key={sf.id}
                            onClick={() => toggleStatus(sf.id)}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                                isActive
                                    ? `${darkMode ? "border-slate-600 bg-slate-700 text-white" : "border-slate-300 bg-white text-slate-800"} shadow-sm`
                                    : `${darkMode ? "border-slate-700 text-slate-500 hover:text-slate-400" : "border-slate-200 text-slate-400 hover:text-slate-600"} opacity-50`
                            }`}
                        >
                            <div className={`w-2 h-2 rounded-full ${sf.color}`} />
                            {sf.label}
                        </button>
                    );
                })}
                {statusFilter.length > 0 && (
                    <button
                        onClick={() => onStatusFilter([])}
                        className={`text-xs font-semibold ${darkMode ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-slate-600"} transition-colors`}
                    >
                        Alle
                    </button>
                )}
            </div>
        </div>
    );
}
