import React, { useState, useMemo, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Search, Filter, User, Clock, MoreHorizontal, Settings, ChevronDown } from "lucide-react";
import BookingModal from "../components/bookings/BookingModal";
import { addDays, fmtISO, daysDiff, parseDate } from "../utils/dateUtils";
import { STATUS } from "../utils/constants";

export default function CalendarPage({ bikes, bookings, customers, darkMode }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showModal, setShowModal] = useState(false);
    const [editBooking, setEditBooking] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedBikeId, setSelectedBikeId] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [viewMode, setViewMode] = useState("month"); // day, week, month
    const scrollContainerRef = useRef(null);

    // Center current day on mount
    useEffect(() => {
        if (scrollContainerRef.current) {
            const dayWidth = 64; // min-width of day column
            const today = new Date().getDate();
            scrollContainerRef.current.scrollLeft = (today - 3) * dayWidth;
        }
    }, []);

    const daysInView = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = [];
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    }, [currentDate]);

    const viewStart = daysInView[0];
    const viewEnd = daysInView[daysInView.length - 1];
    const viewStartStr = fmtISO(viewStart);
    const viewEndStr = fmtISO(viewEnd);

    const filteredBikes = useMemo(() => {
        return bikes.bikes.filter(bike => {
            const matchesSearch = bike.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = categoryFilter === "all" || bike.category === categoryFilter;
            return matchesSearch && matchesCategory;
        });
    }, [bikes.bikes, searchTerm, categoryFilter]);

    const categories = useMemo(() => {
        const cats = new Set(bikes.bikes.map(b => b.category));
        return ["all", ...Array.from(cats)];
    }, [bikes.bikes]);

    const getBookingStyle = (booking) => {
        const start = new Date(booking.start_date);
        const end = new Date(booking.end_date);
        const effectiveStart = start < viewStart ? viewStart : start;
        const effectiveEnd = end > viewEnd ? viewEnd : end;
        const startIndex = daysDiff(viewStartStr, fmtISO(effectiveStart));
        const duration = daysDiff(fmtISO(effectiveStart), fmtISO(effectiveEnd)) + 1;

        // "Senior" Clean Styles (Solid Colors)
        const statusStyles = {
            reserved: "bg-blue-500 border-blue-600 shadow-sm",
            picked_up: "bg-orange-500 border-orange-600 shadow-sm",
            completed: "bg-emerald-500 border-emerald-600 shadow-sm",
            cancelled: "bg-slate-500 border-slate-600 shadow-sm"
        };

        const styleClass = statusStyles[booking.status] || statusStyles.reserved;

        return {
            gridColumnStart: startIndex + 1,
            gridColumnEnd: `span ${duration}`,
            className: `${styleClass} text-white text-xs rounded-lg px-2 py-1 flex items-center shadow-lg hover:brightness-110 hover:scale-[1.02] transition-all cursor-pointer truncate z-10 relative border h-9 mt-1.5 backdrop-blur-sm`
        };
    };

    const handleSave = async (bookingData) => {
        try {
            if (!bookingData.customer_id && bookingData.customer_name) {
                const [first, ...rest] = bookingData.customer_name.split(" ");
                const last = rest.join(" ") || "Kunde";
                const newCustomer = await customers.create({
                    first_name: first,
                    last_name: last,
                    email: bookingData.customer_email,
                    phone: bookingData.customer_phone
                });
                if (newCustomer) bookingData.customer_id = newCustomer.id;
            }
            if (editBooking) {
                await bookings.update(editBooking.id, bookingData);
            } else {
                await bookings.create(bookingData);
            }
            setShowModal(false);
        } catch (error) {
            console.error("Booking Error:", error);
            alert("Fehler beim Speichern: " + error.message);
        }
    };

    const handleNewBooking = (date, bikeId) => {
        setEditBooking(null);
        setSelectedDate(date);
        setSelectedBikeId(bikeId);
        setShowModal(true);
    };

    const getInitials = (name) => name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "??";

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col space-y-4 pb-4">
            {/* Pro Toolbar */}
            <div className="premium-card p-3 flex flex-col lg:flex-row gap-4 justify-between items-center z-30 relative shadow-xl shadow-slate-200/50 dark:shadow-black/20">
                <div className="flex items-center gap-4 w-full lg:w-auto">
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="px-4 flex flex-col items-center min-w-[140px]">
                            <span className="font-bold text-slate-900 dark:text-white text-sm">
                                {currentDate.toLocaleDateString("de-DE", { month: "long" })}
                            </span>
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                {currentDate.getFullYear()}
                            </span>
                        </div>
                        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-sm font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/20 dark:text-brand-400 rounded-xl transition-colors border border-brand-200 dark:border-brand-800">
                        Heute
                    </button>

                    <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden md:block" />

                    <div className="hidden md:flex bg-slate-100 dark:bg-slate-800/80 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                        {["Tag", "Woche", "Monat"].map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode === "Monat" ? "month" : "week")}
                                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${(mode === "Monat" && viewMode === "month") || (mode !== "Monat" && viewMode !== "month" && false) // Mock logic
                                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                                    }`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <div className="relative flex-1 lg:w-64 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Suchen..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border outline-none text-sm transition-all ${darkMode ? "bg-slate-800 border-slate-700 focus:border-brand-500 focus:bg-slate-800" : "bg-slate-50 border-slate-200 focus:border-brand-500 focus:bg-white focus:shadow-sm"}`}
                        />
                    </div>
                    <button
                        onClick={() => { setEditBooking(null); setSelectedDate(new Date()); setSelectedBikeId(null); setShowModal(true); }}
                        className="btn-primary flex items-center gap-2 whitespace-nowrap py-2.5 px-5 rounded-xl shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 hover:-translate-y-0.5 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline font-bold">Neue Buchung</span>
                    </button>
                </div>
            </div>

            {/* Gantt Chart View */}
            <div className="premium-card flex-1 overflow-hidden flex flex-col relative shadow-2xl shadow-slate-200/50 dark:shadow-black/40 border-0 ring-1 ring-slate-200 dark:ring-slate-700">
                {/* Sticky Header Row */}
                <div className={`flex border-b z-20 sticky top-0 backdrop-blur-xl ${darkMode ? "border-slate-800 bg-slate-900/90" : "border-slate-200 bg-white/90"}`}>
                    <div className={`w-64 flex-shrink-0 p-4 font-bold text-xs uppercase tracking-wider border-r flex items-center justify-between ${darkMode ? "border-slate-800 text-slate-400" : "border-slate-200 text-slate-500"}`}>
                        <span>Ressource</span>
                        <Settings className="w-4 h-4 opacity-50 hover:opacity-100 cursor-pointer" />
                    </div>
                    <div className="flex-1 overflow-hidden" ref={scrollContainerRef}>
                        <div className="grid" style={{ gridTemplateColumns: `repeat(${daysInView.length}, minmax(64px, 1fr))` }}>
                            {daysInView.map(day => {
                                const isToday = fmtISO(day) === fmtISO(new Date());
                                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                return (
                                    <div key={day.toISOString()} className={`text-center py-3 border-r last:border-r-0 text-xs flex flex-col items-center justify-center gap-1 group relative ${darkMode ? "border-slate-800" : "border-slate-100"} ${isWeekend ? (darkMode ? "bg-slate-800/30" : "bg-slate-50/80") : ""} ${isToday ? (darkMode ? "bg-brand-900/10" : "bg-brand-50/40") : ""}`}>
                                        <span className={`font-bold text-sm transition-transform group-hover:scale-110 ${isToday ? "text-brand-600 dark:text-brand-400" : "text-slate-700 dark:text-slate-300"}`}>{day.getDate()}</span>
                                        <span className={`text-[10px] uppercase tracking-wider font-semibold ${isToday ? "text-brand-600 dark:text-brand-400" : "text-slate-400"}`}>{day.toLocaleDateString("de-DE", { weekday: "short" })}</span>
                                        {isToday && <div className="absolute bottom-0 w-full h-0.5 bg-brand-500" />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar bg-slate-50/30 dark:bg-slate-900/30" onScroll={(e) => { if (scrollContainerRef.current) scrollContainerRef.current.scrollLeft = e.target.scrollLeft; }}>
                    <div className="min-w-fit pb-10">
                        {filteredBikes.map((bike, index) => {
                            const bikeBookings = bookings.bookings.filter(b =>
                                b.bike_id === bike.id &&
                                b.status !== "cancelled" &&
                                new Date(b.end_date) >= viewStart &&
                                new Date(b.start_date) <= viewEnd
                            );

                            return (
                                <div key={bike.id} className={`flex border-b last:border-b-0 ${darkMode ? "border-slate-800 hover:bg-slate-800/50" : "border-slate-100 hover:bg-white"} transition-colors group h-16`}>
                                    {/* Resource Column */}
                                    <div className={`w-64 flex-shrink-0 px-4 border-r flex items-center gap-4 sticky left-0 z-10 backdrop-blur-md ${darkMode ? "bg-slate-900/95 border-slate-800" : "bg-white/95 border-slate-200"}`}>
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shadow-sm ${bike.category === 'E-Bike' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                            {bike.name.charAt(0)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-bold text-sm truncate text-slate-900 dark:text-white flex items-center gap-2">
                                                {bike.name}
                                                {bike.status === 'maintenance' && <span className="w-2 h-2 rounded-full bg-red-500" title="Wartung" />}
                                            </div>
                                            <div className={`text-xs truncate flex items-center gap-1 ${darkMode ? "text-slate-500" : "text-slate-500"}`}>
                                                <span className="font-medium">{bike.category}</span>
                                                <span>•</span>
                                                <span>{bike.size}</span>
                                            </div>
                                        </div>
                                        <MoreHorizontal className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-all" />
                                    </div>

                                    {/* Timeline Grid */}
                                    <div className="flex-1 relative min-w-0">
                                        {/* Grid Lines */}
                                        <div className="absolute inset-0 grid h-full" style={{ gridTemplateColumns: `repeat(${daysInView.length}, minmax(64px, 1fr))` }}>
                                            {daysInView.map(day => {
                                                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                                const isToday = fmtISO(day) === fmtISO(new Date());
                                                return (
                                                    <div
                                                        key={day.toISOString()}
                                                        className={`border-r last:border-r-0 h-full transition-colors cursor-pointer
                                                            ${darkMode ? "border-slate-800" : "border-slate-100"} 
                                                            ${isWeekend ? (darkMode ? "bg-slate-800/20" : "bg-slate-50/60") : ""} 
                                                            ${isToday ? (darkMode ? "bg-brand-900/5" : "bg-brand-50/20") : ""}
                                                            hover:bg-brand-500/10`}
                                                        onClick={() => handleNewBooking(day, bike.id)}
                                                    />
                                                );
                                            })}
                                        </div>

                                        {/* Bookings */}
                                        <div className="absolute inset-y-0 left-0 right-0 py-1 grid items-center pointer-events-none" style={{ gridTemplateColumns: `repeat(${daysInView.length}, minmax(64px, 1fr))` }}>
                                            {bikeBookings.map(booking => {
                                                const style = getBookingStyle(booking);
                                                return (
                                                    <div
                                                        key={booking.id}
                                                        style={style}
                                                        onClick={(e) => { e.stopPropagation(); setEditBooking(booking); setShowModal(true); }}
                                                        className={`${style.className} pointer-events-auto group/booking`}
                                                    >
                                                        <div className="flex items-center gap-2 w-full overflow-hidden">
                                                            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                                                                {getInitials(booking.customer_name)}
                                                            </div>
                                                            <span className="truncate font-semibold text-[11px] drop-shadow-sm">{booking.customer_name}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {filteredBikes.length === 0 && (
                            <div className="p-20 text-center flex flex-col items-center justify-center opacity-50">
                                <Search className="w-12 h-12 mb-4 text-slate-300" />
                                <p className="text-lg font-medium text-slate-500">Keine Fahrräder gefunden</p>
                                <p className="text-sm text-slate-400">Versuchen Sie es mit einem anderen Suchbegriff</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Booking Modal */}
            {showModal && (
                <BookingModal
                    booking={editBooking}
                    initialDate={selectedDate}
                    initialBikeId={selectedBikeId}
                    bikes={bikes.bikes}
                    customers={customers.customers}
                    existingBookings={bookings.bookings}
                    onSave={handleSave}
                    onDelete={async (id) => { await bookings.remove(id); setShowModal(false); }}
                    onClose={() => setShowModal(false)}
                    darkMode={darkMode}
                />
            )}
        </div>
    );
}
