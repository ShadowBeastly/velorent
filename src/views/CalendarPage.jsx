"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Plus, Search, MoreHorizontal, Settings, Wrench } from "lucide-react";
import { DndContext, useSensor, useSensors, MouseSensor, TouchSensor, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import BookingModal from "../components/bookings/BookingModal";
import { fmtISO, fmtDate, daysDiff } from "../utils/formatters";
import { useApp } from "../context/AppContext";
import { useData } from "../context/DataContext";


// --- DND Components ---

function DraggableBooking({ booking, style, onClick, children }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `booking-${booking.id}`,
        data: { booking }
    });

    const dndStyle = {
        ...style,
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 100 : 10,
        opacity: isDragging ? 0.8 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
    };

    return (
        <div ref={setNodeRef} style={dndStyle} {...listeners} {...attributes} onClick={onClick} className={style.className}>
            {children}
        </div>
    );
}

function DroppableCell({ id, date, bikeId, children, onClick, className }) {
    const { setNodeRef, isOver } = useDroppable({
        id: id,
        data: { date, bikeId }
    });

    return (
        <div
            ref={setNodeRef}
            onClick={onClick}
            className={`${className} ${isOver ? 'bg-brand-500/20' : ''}`}
        >
            {children}
        </div>
    );
}

// --- Main Component ---

export default function CalendarPage() {
    const { darkMode } = useApp();
    const { bikes, bookings, customers, maintenanceBlocks } = useData();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showModal, setShowModal] = useState(false);
    const [editBooking, setEditBooking] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedBikeId, setSelectedBikeId] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [viewMode, setViewMode] = useState("month"); // day, week, month
    const scrollContainerRef = useRef(null);
    const bodyContainerRef = useRef(null);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    );

    // Sync header scroll with body scroll
    const handleBodyScroll = (e) => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = e.target.scrollLeft;
        }
    };

    // Auto-scroll logic to center "Today"
    useEffect(() => {
        if (bodyContainerRef.current) {
            const dayWidth = 64; // min-width of day column in month view

            // Allow layout to paint first
            const timer = setTimeout(() => {
                if (!bodyContainerRef.current) return;

                let scrollPos = 0;

                if (viewMode === 'month') {
                    const now = new Date();
                    const isCurrentMonth = currentDate.getMonth() === now.getMonth() && currentDate.getFullYear() === now.getFullYear();

                    if (isCurrentMonth) {
                        const containerWidth = bodyContainerRef.current.offsetWidth;
                        const resourceColWidth = 256; // w-64
                        const todayIndex = now.getDate() - 1; // 0-indexed

                        // Calculate position of Today's column center relative to the start of the SCROLLABLE content
                        const targetPixel = resourceColWidth + (todayIndex * dayWidth) + (dayWidth / 2);
                        // We deduct containerWidth / 2 to center firmly in the middle of viewport
                        // and add back resourceColWidth? No.
                        // The 'containerWidth' is the width of the VIEWPORT.
                        // 'scrollPos' sets the left edge of the VIEWPORT.
                        // If scrollPos = X. Viewport is [X, X+W].
                        // We want TargetPixel to be at X + W/2.
                        // So X = TargetPixel - W/2.

                        scrollPos = targetPixel - (containerWidth / 2);

                        if (scrollPos < 0) scrollPos = 0;
                    }
                }

                bodyContainerRef.current.scrollTo({ left: scrollPos, behavior: 'instant' });
                // Manually sync header so it matches immediately
                if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTo({ left: scrollPos, behavior: 'instant' });
                }
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [currentDate, viewMode]);

    const daysInView = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        if (viewMode === 'day') {
            return [new Date(currentDate)];
        } else if (viewMode === 'week') {
            const startNode = new Date(currentDate);
            startNode.setDate(currentDate.getDate() - 3); // Start 3 days before

            const week = [];
            for (let i = 0; i < 7; i++) {
                const d = new Date(startNode);
                d.setDate(startNode.getDate() + i);
                week.push(d);
            }
            return week;
        } else {
            // Month View
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const days = [];
            for (let i = 1; i <= daysInMonth; i++) {
                days.push(new Date(year, month, i));
            }
            return days;
        }
    }, [currentDate, viewMode]);

    const handlePrev = () => {
        if (viewMode === 'day') {
            const d = new Date(currentDate);
            d.setDate(d.getDate() - 1);
            setCurrentDate(d);
        } else if (viewMode === 'week') {
            const d = new Date(currentDate);
            d.setDate(d.getDate() - 7);
            setCurrentDate(d);
        } else {
            setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
        }
    };

    const handleNext = () => {
        if (viewMode === 'day') {
            const d = new Date(currentDate);
            d.setDate(d.getDate() + 1);
            setCurrentDate(d);
        } else if (viewMode === 'week') {
            const d = new Date(currentDate);
            d.setDate(d.getDate() + 7);
            setCurrentDate(d);
        } else {
            setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
        }
    };

    const viewStart = daysInView[0];
    const viewEnd = daysInView[daysInView.length - 1];
    const viewStartStr = fmtISO(viewStart);


    const filteredBikes = useMemo(() => {
        return bikes.bikes.filter(bike => {
            const matchesSearch = bike.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = categoryFilter === "all" || bike.category === categoryFilter;
            return matchesSearch && matchesCategory;
        });
    }, [bikes.bikes, searchTerm, categoryFilter]);

    const getBookingStyle = (booking) => {
        const start = new Date(booking.start_date);
        const end = new Date(booking.end_date);
        const effectiveStart = start < viewStart ? viewStart : start;
        const effectiveEnd = end > viewEnd ? viewEnd : end;

        // Handle out of view
        if (effectiveStart > viewEnd || effectiveEnd < viewStart) return { display: 'none' };

        const startIndex = daysDiff(viewStartStr, fmtISO(effectiveStart)) - 1;
        const duration = daysDiff(fmtISO(effectiveStart), fmtISO(effectiveEnd));

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
            className: `${styleClass} text-white text-xs rounded-lg px-2 py-1 flex items-center shadow-lg hover:brightness-110 transition-all truncate z-10 relative border h-9 mt-1.5 backdrop-blur-sm`
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
                const { error } = await bookings.update(editBooking.id, bookingData);
                if (error) throw error;
            } else {
                const { error } = await bookings.create(bookingData);
                if (error) throw error;
            }
            setShowModal(false);
        } catch (error) {
            console.error("Booking Error:", error);
            console.error("Fehler beim Speichern:", error.message);
        }
    };

    const handleNewBooking = (date, bikeId) => {
        setEditBooking(null);
        setSelectedDate(date);
        setSelectedBikeId(bikeId);
        setShowModal(true);
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const booking = active.data.current.booking;
            const { date: newStartDate, bikeId: newBikeId } = over.data.current;

            // Calculate duration to keep it constant
            const oldStart = new Date(booking.start_date);
            const oldEnd = new Date(booking.end_date);
            const durationMs = oldEnd - oldStart;

            const newStart = new Date(newStartDate);
            // Adjust time to noon to avoid timezone issues when converting back to ISO string date part
            newStart.setHours(12, 0, 0, 0);

            const newEnd = new Date(newStart.getTime() + durationMs);

            const updates = {
                start_date: fmtISO(newStart),
                end_date: fmtISO(newEnd),
                bike_id: newBikeId
            };

            // Optimistic update (optional, but good for UX - here we just rely on the await reload)
            // For now, let's just call update
            try {
                const { error } = await bookings.update(booking.id, updates);
                if (error) throw error;
            } catch (error) {
                console.error("Move failed:", error);
                console.error("Verschieben fehlgeschlagen:", error.message);
            }
        }
    };

    const getInitials = (name) => name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "??";

    const gridCols = viewMode === "day"
        ? "1fr"
        : viewMode === "week"
            ? "repeat(7, minmax(120px, 1fr))"
            : `repeat(${daysInView.length}, minmax(64px, 1fr))`;

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="h-[calc(100vh-6rem)] flex flex-col space-y-4 pb-4">
                {/* Pro Toolbar */}
                <div className="premium-card p-3 flex flex-col lg:flex-row gap-4 justify-between items-center z-30 relative shadow-xl shadow-slate-200/50 dark:shadow-black/20">
                    <div className="flex items-center gap-4 w-full lg:w-auto">
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                            <button onClick={handlePrev} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div className="px-4 flex flex-col items-center min-w-[140px]">
                                <span className="font-bold text-slate-900 dark:text-white text-sm">
                                    {viewMode === 'day'
                                        ? currentDate.toLocaleDateString("de-DE", { day: 'numeric', month: "long" })
                                        : currentDate.toLocaleDateString("de-DE", { month: "long" })
                                    }
                                </span>
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                    {currentDate.getFullYear()}
                                </span>
                            </div>
                            <button onClick={handleNext} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>

                        <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-sm font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/20 dark:text-brand-400 rounded-xl transition-colors border border-brand-200 dark:border-brand-800">
                            Heute
                        </button>

                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden md:block" />

                        <div className="hidden md:flex bg-slate-100 dark:bg-slate-800/80 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                            {[
                                { id: "day", label: "Tag" },
                                { id: "week", label: "Woche" },
                                { id: "month", label: "Monat" }
                            ].map((mode) => (
                                <button
                                    key={mode.id}
                                    onClick={() => setViewMode(mode.id)}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === mode.id
                                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                                        }`}
                                >
                                    {mode.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full lg:w-auto">
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className={`px-3 py-2 rounded-xl border text-sm outline-none ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"}`}
                        >
                            <option value="all">Alle Kategorien</option>
                            {[...new Set(bikes.bikes.map(b => b.category).filter(Boolean))].map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
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
                            <Settings className="w-4 h-4 opacity-30 pointer-events-none" title="Kalendereinstellungen (kommt bald)" />
                        </div>
                        <div className="flex-1 overflow-hidden" ref={scrollContainerRef}>
                            <div className="grid" style={{ gridTemplateColumns: gridCols }}>
                                {daysInView.map(day => {
                                    const isToday = fmtISO(day) === fmtISO(new Date());
                                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                    return (
                                        <div key={day.toISOString()} className={`text-center py-3 border-r last:border-r-0 text-xs flex flex-col items-center justify-center gap-1 group relative ${darkMode ? "border-slate-800" : "border-slate-100"} ${isWeekend ? (darkMode ? "bg-slate-800/30" : "bg-slate-50/80") : ""} ${isToday ? (darkMode ? "bg-brand-900/10" : "bg-brand-50/40") : ""}`}>
                                            <span className={`font-bold text-sm transition-transform group-hover:scale-110 ${isToday ? "text-brand-600 dark:text-brand-400" : "text-slate-700 dark:text-slate-300"}`}>{day.getDate()}</span>
                                            <span className={`text-[10px] uppercase tracking-wider font-semibold ${isToday ? "text-brand-600 dark:text-brand-400" : "text-slate-400"}`}>
                                                {viewMode === 'month'
                                                    ? day.toLocaleDateString("de-DE", { weekday: "short" })
                                                    : day.toLocaleDateString("de-DE", { weekday: "long" })
                                                }
                                            </span>
                                            {isToday && <div className="absolute bottom-0 w-full h-0.5 bg-brand-500" />}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Scrollable Body */}
                    <div ref={bodyContainerRef} className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar bg-slate-50/30 dark:bg-slate-900/30" onScroll={handleBodyScroll}>
                        {/* Use min-w-max to ensure content expands and isn't cut off */}
                        <div className={`min-w-max pb-10 ${viewMode === 'day' ? 'w-full' : ''}`}>
                            {filteredBikes.map((bike) => {
                                const bikeBookings = bookings.bookings.filter(b =>
                                    b.bike_id === bike.id &&
                                    b.status !== "cancelled" &&
                                    new Date(b.end_date) >= viewStart &&
                                    new Date(b.start_date) <= viewEnd
                                );
                                const bikeMaintenance = maintenanceBlocks.blocks.filter(m =>
                                    m.bike_id === bike.id &&
                                    m.status !== "completed" &&
                                    new Date(m.end_date || m.start_date) >= viewStart &&
                                    new Date(m.start_date) <= viewEnd
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
                                            <MoreHorizontal className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-30 pointer-events-none transition-all" />
                                        </div>

                                        {/* Timeline Grid */}
                                        <div className="flex-1 relative min-w-0">
                                            {/* Grid Lines */}
                                            <div className="absolute inset-0 grid h-full" style={{ gridTemplateColumns: gridCols }}>
                                                {daysInView.map(day => {
                                                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                                    const isToday = fmtISO(day) === fmtISO(new Date());
                                                    const cellId = `cell-${bike.id}-${fmtISO(day)}`;
                                                    return (
                                                        <DroppableCell
                                                            key={day.toISOString()}
                                                            id={cellId}
                                                            date={fmtISO(day)}
                                                            bikeId={bike.id}
                                                            onClick={() => handleNewBooking(day, bike.id)}
                                                            className={`border-r last:border-r-0 h-full transition-colors cursor-pointer
                                                                ${darkMode ? "border-slate-800" : "border-slate-100"} 
                                                                ${isWeekend ? (darkMode ? "bg-slate-800/20" : "bg-slate-50/60") : ""} 
                                                                ${isToday ? (darkMode ? "bg-brand-900/5" : "bg-brand-50/20") : ""}
                                                                hover:bg-brand-500/10`}
                                                        />
                                                    );
                                                })}
                                            </div>

                                            {/* Bookings */}
                                            <div className="absolute inset-y-0 left-0 right-0 py-1 grid items-center pointer-events-none" style={{ gridTemplateColumns: gridCols }}>
                                                {(() => {
                                                    // 1. Calculate Lanes for this row
                                                    const sortedBookings = [...bikeBookings].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
                                                    const lanes = []; // stores end date of last booking in each lane

                                                    const bookingsWithLanes = sortedBookings.map(booking => {
                                                        const start = new Date(booking.start_date);
                                                        const end = new Date(booking.end_date);

                                                        let laneIndex = lanes.findIndex(laneEnd => laneEnd < start);
                                                        if (laneIndex === -1) {
                                                            laneIndex = lanes.length;
                                                            lanes.push(end);
                                                        } else {
                                                            lanes[laneIndex] = end;
                                                        }
                                                        return { ...booking, laneIndex };
                                                    });

                                                    const maxLanes = lanes.length > 0 ? lanes.length : 1;

                                                    return bookingsWithLanes.map(booking => {
                                                        const style = getBookingStyle(booking);

                                                        // Adjust style for lanes
                                                        const isMultiLane = maxLanes > 1;
                                                        const heightPercent = isMultiLane ? (100 / maxLanes) - 2 : 100; // -2% gap
                                                        const topPercent = isMultiLane ? (100 / maxLanes) * booking.laneIndex : 0;

                                                        const laneStyle = {
                                                            ...style,
                                                            height: isMultiLane ? `${heightPercent}%` : '2.25rem', // 2.25rem is h-9
                                                            marginTop: isMultiLane ? 0 : '0.375rem', // mt-1.5
                                                            top: isMultiLane ? `${topPercent}%` : 'auto',
                                                            position: 'relative' // was relative in getBookingStyle, keeping it
                                                        };

                                                        return (
                                                            <DraggableBooking
                                                                key={booking.id}
                                                                booking={booking}
                                                                style={laneStyle}
                                                                onClick={(e) => { e.stopPropagation(); setEditBooking(booking); setShowModal(true); }}
                                                            >
                                                                <div className="flex items-center gap-2 w-full overflow-hidden pointer-events-none">
                                                                    <div className={`rounded-full bg-white/20 flex items-center justify-center font-bold flex-shrink-0 ${isMultiLane ? "w-3 h-3 text-[8px]" : "w-5 h-5 text-[9px]"}`}>
                                                                        {getInitials(booking.customer_name)}
                                                                    </div>
                                                                    <span className={`truncate font-semibold drop-shadow-sm ${isMultiLane ? "text-[9px]" : "text-[11px]"}`}>{booking.customer_name}</span>
                                                                </div>
                                                            </DraggableBooking>
                                                        );
                                                    });
                                                })()}
                                            </div>

                                            {/* Maintenance Blocks */}
                                            {bikeMaintenance.map(block => {
                                                const start = new Date(block.start_date);
                                                const end = new Date(block.end_date || block.start_date);
                                                const effectiveStart = start < viewStart ? viewStart : start;
                                                const effectiveEnd = end > viewEnd ? viewEnd : end;
                                                if (effectiveStart > viewEnd || effectiveEnd < viewStart) return null;
                                                const startIndex = daysDiff(viewStartStr, fmtISO(effectiveStart)) - 1;
                                                const duration = daysDiff(fmtISO(effectiveStart), fmtISO(effectiveEnd));
                                                return (
                                                    <div key={`maint-${block.id}`}
                                                        className="absolute bg-red-500/20 border border-red-500/40 border-dashed rounded-lg flex items-center gap-1 px-2 text-red-500 dark:text-red-400 text-[10px] font-semibold z-[5] pointer-events-none"
                                                        style={{
                                                            gridColumnStart: startIndex + 1,
                                                            gridColumnEnd: `span ${duration}`,
                                                            top: 0, bottom: 0,
                                                            backgroundImage: 'repeating-linear-gradient(135deg, transparent, transparent 6px, rgba(239,68,68,0.08) 6px, rgba(239,68,68,0.08) 12px)'
                                                        }}
                                                        title={`Wartung: ${block.description || block.type} (${fmtDate(block.start_date)} – ${fmtDate(block.end_date || block.start_date)})`}
                                                    >
                                                        <Wrench className="w-3 h-3 flex-shrink-0" />
                                                        <span className="truncate">{block.description || 'Wartung'}</span>
                                                    </div>
                                                );
                                            })}
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
                        onDelete={async (id) => {
                            const { error } = await bookings.remove(id);
                            if (error) {
                                console.error("Fehler beim Stornieren:", error.message);
                            } else {
                                setShowModal(false);
                            }
                        }}
                        onClose={() => setShowModal(false)}
                        darkMode={darkMode}
                    />
                )}
            </div>
        </DndContext>
    );
}
