"use client";
import { Zap } from "lucide-react";
import { useLocivaHotel } from "@/src/context/LocivaHotelContext";
import { useApp } from "@/src/context/AppContext";
import { useHotelActivities } from "@/src/hooks/useHotelActivities";

const C = {
    primary: "#1A7D5A",
    light: "#3BAA82",
    tint: "#D4EDE2",
};

const CATEGORIES = [
    { value: "wellness", label: "Wellness" },
    { value: "gastro", label: "Gastronomie" },
    { value: "transport", label: "Transport" },
    { value: "adventure", label: "Abenteuer" },
    { value: "culture", label: "Kultur" },
    { value: "sport", label: "Sport" },
    { value: "family", label: "Familie" },
    { value: "other", label: "Sonstiges" },
];

const CAT_COLOR = {
    wellness: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
    gastro: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    transport: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    adventure: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    culture: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
    sport: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    family: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
    other: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

function catLabel(value) {
    return CATEGORIES.find((category) => category.value === value)?.label ?? value;
}

function ActivityCard({ activity, darkMode }) {
    return (
        <div className={`rounded-2xl border overflow-hidden transition-shadow hover:shadow-md ${
            darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
        }`}>
            {activity.image_url && (
                <div className="h-32 overflow-hidden bg-slate-100 dark:bg-slate-700">
                    <img src={activity.image_url} alt={activity.name} className="w-full h-full object-cover" />
                </div>
            )}
            <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 dark:text-white truncate">{activity.name}</h3>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${CAT_COLOR[activity.category] ?? CAT_COLOR.other}`}>
                            {catLabel(activity.category)}
                        </span>
                    </div>
                    <span className={`shrink-0 mt-0.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        activity.is_active
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                    }`}>
                        {activity.is_active ? "Aktiv" : "Inaktiv"}
                    </span>
                </div>

                {activity.description && (
                    <p className={`text-sm line-clamp-2 mb-3 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                        {activity.description}
                    </p>
                )}

                <div className={`flex items-center gap-3 text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                    {activity.price != null && (
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(activity.price)}
                        </span>
                    )}
                    {activity.duration_minutes && <span>{activity.duration_minutes} Min.</span>}
                </div>
            </div>
        </div>
    );
}

export default function LocivaActivitiesPage() {
    const { hotelId } = useLocivaHotel();
    const { darkMode } = useApp();
    const { activities, loading } = useHotelActivities(hotelId);

    const card = darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";

    return (
        <div className="space-y-8 pb-10">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Aktivitäten</h1>
                    <p className={`text-sm mt-0.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                        Sicht auf das aktuelle Angebot. Pflege und Freigaben laufen zentral über Lociva.
                    </p>
                </div>
                <div className={`px-4 py-2 rounded-xl text-sm font-medium ${darkMode ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                    Read-only
                </div>
            </div>

            {loading && (
                <div className="flex items-center justify-center h-40">
                    <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: C.light, borderTopColor: "transparent" }} />
                </div>
            )}

            {!loading && activities.length === 0 && (
                <div className={`rounded-2xl border p-12 text-center ${card}`}>
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: C.tint }}>
                        <Zap className="w-7 h-7" style={{ color: C.primary }} />
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Noch keine Aktivitäten</h3>
                    <p className={`text-sm mb-5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                        Sobald Lociva Aktivitäten freigibt, erscheinen sie hier automatisch.
                    </p>
                </div>
            )}

            {!loading && activities.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {activities.map((activity) => (
                        <ActivityCard key={activity.id} activity={activity} darkMode={darkMode} />
                    ))}
                </div>
            )}
        </div>
    );
}
