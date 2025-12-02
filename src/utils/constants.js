export const STATUS = {
    reserved: { label: "Reserviert", color: "bg-amber-100 text-amber-800 border-amber-300", dot: "bg-amber-500" },
    confirmed: { label: "Bestätigt", color: "bg-emerald-100 text-emerald-800 border-emerald-300", dot: "bg-emerald-500" },
    picked_up: { label: "Abgeholt", color: "bg-blue-100 text-blue-800 border-blue-300", dot: "bg-blue-500" },
    returned: { label: "Zurück", color: "bg-slate-100 text-slate-800 border-slate-300", dot: "bg-slate-500" },
    cancelled: { label: "Storniert", color: "bg-rose-100 text-rose-800 border-rose-300", dot: "bg-rose-500" },
    no_show: { label: "No-Show", color: "bg-purple-100 text-purple-800 border-purple-300", dot: "bg-purple-500" }
};

export const BIKE_COLORS = [
    "bg-rose-500", "bg-orange-500", "bg-amber-500", "bg-lime-500", "bg-emerald-500",
    "bg-teal-500", "bg-cyan-500", "bg-sky-500", "bg-indigo-500", "bg-violet-500", "bg-fuchsia-500"
];
