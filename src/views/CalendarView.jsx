"use client";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { useData } from "../context/DataContext";
import { useToast } from "../components/ui/Toast";
import { fmtISO, daysDiff } from "../utils/formatters";
import { DndContext, useSensor, useSensors, MouseSensor, TouchSensor, useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Wrench } from "lucide-react";

import CalendarToolbar from "../components/calendar/CalendarToolbar";
import DayView from "../components/calendar/DayView";
import WeekView from "../components/calendar/WeekView";
import MonthView from "../components/calendar/MonthView";
import QuickBookingModal from "../components/calendar/QuickBookingModal";
import BookingDetailModal from "../components/calendar/BookingDetailModal";
import BookingModal from "../components/bookings/BookingModal";
import { getBookingColor } from "../components/calendar/bookingColors";

// ─── Gantt DnD helpers ────────────────────────────────────────────────────────

function DraggableBooking({ booking, style, onClick, children }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `booking-${booking.id}`,
        data: { booking },
    });
    const dndStyle = {
        ...style,
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 100 : 10,
        opacity: isDragging ? 0.8 : 1,
        cursor: isDragging ? "grabbing" : "grab",
    };
    return (
        <div ref={setNodeRef} style={dndStyle} {...listeners} {...attributes} onClick={onClick} className={style.className}>
            {children}
        </div>
    );
}

function DroppableCell({ id, date, bikeId, children, onClick, className }) {
    const { setNodeRef, isOver } = useDroppable({ id, data: { date, bikeId } });
    return (
        <div ref={setNodeRef} onClick={onClick} className={`${className} ${isOver ? "bg-[#3BAA82]/20" : ""}`}>
            {children}
        </div>
    );
}

// ─── Inline Gantt view ────────────────────────────────────────────────────────

function GanttView({ currentDate, filteredBikes, filteredBookings, filteredMaintenance, onClickSlot, onClickBooking, darkMode }) {
    const { bookings } = useData();
    const { addToast } = useToast();
    const scrollContainerRef = useRef(null);
    const bodyContainerRef = useRef(null);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    );

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

    const handleBodyScroll = (e) => {
        if (scrollContainerRef.current) scrollContainerRef.current.scrollLeft = e.target.scrollLeft;
    };

    useEffect(() => {
        if (!bodyContainerRef.current) return;
        const timer = setTimeout(() => {
            if (!bodyContainerRef.current) return;
            const now = new Date();
            const isCurrentMonth = currentDate.getMonth() === now.getMonth() && currentDate.getFullYear() === now.getFullYear();
            if (!isCurrentMonth) return;
            const dayWidth = 64;
            const containerWidth = bodyContainerRef.current.offsetWidth;
            const resourceColWidth = bodyContainerRef.current.offsetWidth < 768 ? 128 : 256;
            const todayIndex = now.getDate() - 1;
            const targetPixel = resourceColWidth + todayIndex * dayWidth + dayWidth / 2;
            const scrollPos = Math.max(0, targetPixel - containerWidth / 2);
            bodyContainerRef.current.scrollTo({ left: scrollPos, behavior: "instant" });
            if (scrollContainerRef.current) scrollContainerRef.current.scrollTo({ left: scrollPos, behavior: "instant" });
        }, 50);
        return () => clearTimeout(timer);
    }, [currentDate]);

    const gridCols = `repeat(${daysInView.length}, minmax(64px, 1fr))`;

    const getBookingStyle = (booking) => {
        const start = new Date(booking.start_date);
        const end = new Date(booking.end_date);
        const effectiveStart = start < viewStart ? viewStart : start;
        const effectiveEnd = end > viewEnd ? viewEnd : end;
        if (effectiveStart > viewEnd || effectiveEnd < viewStart) return { display: "none" };
        const startIndex = daysDiff(viewStartStr, fmtISO(effectiveStart)) - 1;
        const duration = daysDiff(fmtISO(effectiveStart), fmtISO(effectiveEnd));
        const color = getBookingColor(booking);
        return {
            gridColumnStart: startIndex + 1,
            gridColumnEnd: `span ${duration}`,
            className: `${color.bg} ${color.text} text-xs rounded-lg px-2 py-1 flex items-center shadow-lg hover:brightness-110 transition-all truncate z-10 relative border ${color.border} h-9 mt-1.5`,
        };
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const booking = active.data.current.booking;
        const { date: newStartDate, bikeId: newBikeId } = over.data.current;
        const oldStart = new Date(booking.start_date);
        const oldEnd = new Date(booking.end_date);
        const durationMs = oldEnd - oldStart;
        const newStart = new Date(newStartDate);
        newStart.setHours(12, 0, 0, 0);
        const newEnd = new Date(newStart.getTime() + durationMs);
        try {
            const { error } = await bookings.update(booking.id, {
                start_date: fmtISO(newStart),
                end_date: fmtISO(newEnd),
                bike_id: newBikeId,
            });
            if (error) throw error;
        } catch {
            addToast("Verschieben fehlgeschlagen.", "error");
        }
    };

    const getInitials = (name) => name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "??";

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="flex flex-col flex-1 overflow-hidden">
                {/* Header */}
                <div className={`flex border-b z-20 sticky top-0 backdrop-blur-xl ${darkMode ? "border-slate-800 bg-slate-900/90" : "border-slate-200 bg-white/90"}`}>
                    <div className={`w-32 md:w-64 flex-shrink-0 p-4 font-bold text-xs uppercase tracking-wider border-r ${darkMode ? "border-slate-800 text-slate-400" : "border-slate-200 text-slate-500"}`}>
                        Ressource
                    </div>
                    <div className="flex-1 overflow-hidden" ref={scrollContainerRef}>
                        <div className="grid" style={{ gridTemplateColumns: gridCols }}>
                            {daysInView.map(day => {
                                const isToday = fmtISO(day) === fmtISO(new Date());
                                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                return (
                                    <div key={day.toISOString()} className={`text-center py-3 border-r last:border-r-0 text-xs flex flex-col items-center justify-center gap-1 relative ${darkMode ? "border-slate-800" : "border-slate-100"} ${isWeekend ? (darkMode ? "bg-slate-800/30" : "bg-slate-50/80") : ""} ${isToday ? (darkMode ? "bg-[#1A7D5A]/10" : "bg-[#D4EDE2]/40") : ""}`}>
                                        <span className={`font-bold text-sm ${isToday ? "text-[#1A7D5A]" : (darkMode ? "text-slate-300" : "text-slate-700")}`}>{day.getDate()}</span>
                                        <span className={`text-[10px] uppercase tracking-wider font-semibold ${isToday ? "text-[#1A7D5A]" : "text-slate-400"}`}>
                                            {day.toLocaleDateString("de-DE", { weekday: "short" })}
                                        </span>
                                        {isToday && <div className="absolute bottom-0 w-full h-0.5 bg-[#3BAA82]" />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div ref={bodyContainerRef} className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar" onScroll={handleBodyScroll}>
                    <div className="min-w-max pb-10">
                        {filteredBikes.map(bike => {
                            const bikeBookings = filteredBookings.filter(b =>
                                b.bike_id === bike.id &&
                                new Date(b.end_date) >= viewStart &&
                                new Date(b.start_date) <= viewEnd
                            );
                            const bikeMaintenance = filteredMaintenance.filter(m =>
                                m.bike_id === bike.id &&
                                m.status !== "completed" &&
                                new Date(m.end_date || m.start_date) >= viewStart &&
                                new Date(m.start_date) <= viewEnd
                            );

                            return (
                                <div key={bike.id} className={`flex border-b last:border-b-0 ${darkMode ? "border-slate-800 hover:bg-slate-800/50" : "border-slate-100 hover:bg-white"} transition-colors h-16`}>
                                    <div className={`w-32 md:w-64 flex-shrink-0 px-2 md:px-4 border-r flex items-center gap-2 md:gap-4 sticky left-0 z-10 backdrop-blur-md ${darkMode ? "bg-slate-900/95 border-slate-800" : "bg-white/95 border-slate-200"}`}>
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shadow-sm ${bike.category === "E-Bike" ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"}`}>
                                            {bike.name.charAt(0)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className={`font-bold text-sm truncate ${darkMode ? "text-white" : "text-slate-900"}`}>{bike.name}</div>
                                            <div className={`text-xs truncate ${darkMode ? "text-slate-500" : "text-slate-500"}`}>{bike.category} {bike.size ? `• ${bike.size}` : ""}</div>
                                        </div>
                                    </div>
                                    <div className="flex-1 relative min-w-0">
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
                                                        onClick={() => onClickSlot?.(day, bike.id)}
                                                        className={`border-r last:border-r-0 h-full transition-colors cursor-pointer ${darkMode ? "border-slate-800" : "border-slate-100"} ${isWeekend ? (darkMode ? "bg-slate-800/20" : "bg-slate-50/60") : ""} ${isToday ? (darkMode ? "bg-[#1A7D5A]/5" : "bg-[#D4EDE2]/20") : ""} hover:bg-[#3BAA82]/10`}
                                                    />
                                                );
                                            })}
                                        </div>
                                        <div className="absolute inset-y-0 left-0 right-0 py-1 grid items-center pointer-events-none" style={{ gridTemplateColumns: gridCols }}>
                                            {(() => {
                                                const sorted = [...bikeBookings].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
                                                const lanes = [];
                                                const withLanes = sorted.map(b => {
                                                    const s = new Date(b.start_date);
                                                    const e = new Date(b.end_date);
                                                    let li = lanes.findIndex(le => le < s);
                                                    if (li === -1) { li = lanes.length; lanes.push(e); } else { lanes[li] = e; }
                                                    return { ...b, laneIndex: li };
                                                });
                                                const maxLanes = lanes.length || 1;
                                                return withLanes.map(booking => {
                                                    const style = getBookingStyle(booking);
                                                    const isML = maxLanes > 1;
                                                    const laneStyle = {
                                                        ...style,
                                                        height: isML ? `${(100 / maxLanes) - 2}%` : "2.25rem",
                                                        marginTop: isML ? 0 : "0.375rem",
                                                        top: isML ? `${(100 / maxLanes) * booking.laneIndex}%` : "auto",
                                                        position: "relative",
                                                    };
                                                    const customerName = booking.customer
                                                        ? `${booking.customer.first_name} ${booking.customer.last_name}`.trim()
                                                        : booking.customer_name || "Unbekannt";
                                                    return (
                                                        <DraggableBooking
                                                            key={booking.id}
                                                            booking={booking}
                                                            style={laneStyle}
                                                            onClick={(e) => { e.stopPropagation(); onClickBooking?.(booking); }}
                                                        >
                                                            <div className="flex items-center gap-2 w-full overflow-hidden pointer-events-none">
                                                                <div className={`rounded-full bg-white/20 flex items-center justify-center font-bold flex-shrink-0 ${isML ? "w-3 h-3 text-[8px]" : "w-5 h-5 text-[9px]"}`}>
                                                                    {getInitials(customerName)}
                                                                </div>
                                                                <span className={`truncate font-semibold ${isML ? "text-[9px]" : "text-[11px]"}`}>{customerName}</span>
                                                            </div>
                                                        </DraggableBooking>
                                                    );
                                                });
                                            })()}
                                        </div>
                                        {bikeMaintenance.length > 0 && (
                                            <div className="absolute inset-y-0 left-0 right-0 grid items-stretch pointer-events-none z-[5]" style={{ gridTemplateColumns: gridCols }}>
                                                {bikeMaintenance.map(block => {
                                                    const start = new Date(block.start_date);
                                                    const end = new Date(block.end_date || block.start_date);
                                                    const es = start < viewStart ? viewStart : start;
                                                    const ee = end > viewEnd ? viewEnd : end;
                                                    if (es > viewEnd || ee < viewStart) return null;
                                                    const si = daysDiff(viewStartStr, fmtISO(es)) - 1;
                                                    const dur = daysDiff(fmtISO(es), fmtISO(ee));
                                                    return (
                                                        <div
                                                            key={`maint-${block.id}`}
                                                            className="bg-orange-500/15 border border-orange-500/40 border-dashed rounded-lg flex items-center gap-1 px-2 text-orange-500 dark:text-orange-400 text-[10px] font-semibold pointer-events-none"
                                                            style={{
                                                                gridColumnStart: si + 1,
                                                                gridColumnEnd: `span ${dur}`,
                                                                backgroundImage: "repeating-linear-gradient(135deg, transparent, transparent 6px, rgba(249,115,22,0.08) 6px, rgba(249,115,22,0.08) 12px)",
                                                            }}
                                                            title={`Wartung: ${block.description || block.type}`}
                                                        >
                                                            <Wrench className="w-3 h-3 flex-shrink-0" />
                                                            <span className="truncate">{block.description || "Wartung"}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {filteredBikes.length === 0 && (
                            <div className="p-20 text-center opacity-50">
                                <p className="text-lg font-medium text-slate-500">Keine Fahrräder gefunden</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DndContext>
    );
}

// ─── Main CalendarView ────────────────────────────────────────────────────────

export default function CalendarView() {
    const { darkMode } = useApp();
    const { bikes, bookings, customers, maintenanceBlocks, pricingRules, addOns } = useData();
    const { addToast } = useToast();

    const [viewMode, setViewMode] = useState("week");
    const [currentDate, setCurrentDate] = useState(new Date());

    // Filters
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState([]); // empty = show all

    // Modals
    const [quickBooking, setQuickBooking] = useState(null); // { date, bikeId }
    const [detailBooking, setDetailBooking] = useState(null);
    const [fullModal, setFullModal] = useState(null); // { open: true } for full BookingModal
    const [editBooking, setEditBooking] = useState(null);

    // Navigation
    const handlePrev = useCallback(() => {
        const d = new Date(currentDate);
        if (viewMode === "day") d.setDate(d.getDate() - 1);
        else if (viewMode === "week") d.setDate(d.getDate() - 7);
        else d.setMonth(d.getMonth() - 1, 1);
        setCurrentDate(d);
    }, [currentDate, viewMode]);

    const handleNext = useCallback(() => {
        const d = new Date(currentDate);
        if (viewMode === "day") d.setDate(d.getDate() + 1);
        else if (viewMode === "week") d.setDate(d.getDate() + 7);
        else d.setMonth(d.getMonth() + 1, 1);
        setCurrentDate(d);
    }, [currentDate, viewMode]);

    const handleToday = useCallback(() => setCurrentDate(new Date()), []);

    // Filtered bikes
    const filteredBikes = useMemo(() => {
        return bikes.bikes.filter(bike => {
            if (categoryFilter !== "all" && bike.category !== categoryFilter) return false;
            return true;
        });
    }, [bikes.bikes, categoryFilter]);

    // Filtered bookings
    const filteredBookings = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return bookings.bookings.filter(b => {
            if (b.status === "cancelled") return false;
            if (statusFilter.length === 0) return true;

            const end = new Date(b.end_date + "T00:00:00");

            for (const sf of statusFilter) {
                if (sf === "overdue" && b.status === "picked_up" && end < today) return true;
                if (sf === "picked_up" && b.status === "picked_up" && end >= today) return true;
                if (sf === "reserved" && b.status === "reserved") return true;
                if (sf === "confirmed" && b.status === "confirmed") return true;
            }
            return false;
        });
    }, [bookings.bookings, statusFilter]);

    const filteredMaintenance = useMemo(() => {
        if (statusFilter.length > 0 && !statusFilter.includes("maintenance")) return [];
        return maintenanceBlocks.blocks || [];
    }, [maintenanceBlocks.blocks, statusFilter]);

    // Available categories
    const categories = useMemo(() =>
        [...new Set(bikes.bikes.map(b => b.category).filter(Boolean))],
        [bikes.bikes]
    );

    // Handlers
    const handleClickSlot = useCallback((date, bikeId) => {
        setQuickBooking({ date, bikeId });
    }, []);

    const handleClickBooking = useCallback((booking) => {
        setDetailBooking(booking);
    }, []);

    const handleClickDay = useCallback((day) => {
        setCurrentDate(day);
        setViewMode("day");
    }, []);

    const handleQuickSave = useCallback(async (bookingData) => {
        try {
            let customerId = null;
            if (bookingData._first_name || bookingData.customer_email) {
                // eslint-disable-next-line no-unused-vars
                const { _first_name, _last_name, ..._ } = bookingData;
                const { data: newCustomer, error: customerError } = await customers.create({
                    first_name: _first_name || bookingData.customer_name?.split(" ")[0] || "Gast",
                    last_name: _last_name || bookingData.customer_name?.split(" ").slice(1).join(" ") || "Gast",
                    email: bookingData.customer_email || null,
                    phone: bookingData.customer_phone || null,
                });
                if (customerError) throw customerError;
                if (newCustomer) customerId = newCustomer.id;
            }

            // eslint-disable-next-line no-unused-vars
            const { _first_name, _last_name, ...cleanData } = bookingData;
            const { error } = await bookings.create({
                ...cleanData,
                customer_id: customerId,
                selectedBikes: [],
                selectedAddOns: [],
            }, addOns.addOns);

            if (error) throw error;
            addToast("Buchung erstellt.", "success");
        } catch (err) {
            console.error("QuickBooking error:", err);
            addToast("Fehler beim Erstellen der Buchung.", "error");
            throw err;
        }
    }, [bookings, customers, addOns.addOns, addToast]);

    const handleFullSave = useCallback(async (bookingData) => {
        try {
            if (!bookingData.customer_id && bookingData.customer_name) {
                const [first, ...rest] = bookingData.customer_name.trim().split(/\s+/);
                const { data: newCustomer, error: customerError } = await customers.create({
                    first_name: first,
                    last_name: rest.join(" ") || "Kunde",
                    email: bookingData.customer_email || null,
                    phone: bookingData.customer_phone || null,
                });
                if (customerError) throw customerError;
                if (newCustomer) bookingData.customer_id = newCustomer.id;
            }
            if (editBooking) {
                const { error } = await bookings.update(editBooking.id, bookingData, addOns.addOns);
                if (error) throw error;
            } else {
                const { error } = await bookings.create(bookingData, addOns.addOns);
                if (error) throw error;
            }
            setFullModal(null);
            setEditBooking(null);
        } catch (err) {
            console.error("Booking save error:", err);
            addToast("Fehler beim Speichern der Buchung.", "error");
        }
    }, [bookings, customers, addOns.addOns, addToast, editBooking]);

    const handleEditBooking = useCallback((booking) => {
        setEditBooking(booking);
        setFullModal({ open: true });
    }, []);

    const handleCancelBooking = useCallback(async (booking) => {
        if (!window.confirm(`Buchung von ${booking.customer_name || "Kunde"} stornieren?`)) return;
        const { error } = await bookings.remove(booking.id);
        if (error) {
            addToast("Fehler beim Stornieren.", "error");
        } else {
            addToast("Buchung storniert.", "success");
            setDetailBooking(null);
        }
    }, [bookings, addToast]);

    const handleNewBooking = useCallback(() => {
        setEditBooking(null);
        setFullModal({ open: true });
    }, []);

    return (
        <div className="h-[calc(100dvh-6rem)] flex flex-col gap-4 pb-4">
            {/* Toolbar */}
            <CalendarToolbar
                viewMode={viewMode}
                onViewMode={setViewMode}
                currentDate={currentDate}
                onPrev={handlePrev}
                onNext={handleNext}
                onToday={handleToday}
                categories={categories}
                categoryFilter={categoryFilter}
                onCategoryFilter={setCategoryFilter}
                statusFilter={statusFilter}
                onStatusFilter={setStatusFilter}
                onNewBooking={handleNewBooking}
                darkMode={darkMode}
            />

            {/* Calendar body */}
            <div className={`premium-card flex-1 overflow-hidden flex flex-col shadow-2xl shadow-slate-200/50 dark:shadow-black/40 border-0 ring-1 ring-slate-200 dark:ring-slate-700`}>
                {viewMode === "day" && (
                    <DayView
                        date={currentDate}
                        bikes={filteredBikes}
                        bookings={filteredBookings}
                        maintenanceBlocks={filteredMaintenance}
                        onClickSlot={handleClickSlot}
                        onClickBooking={handleClickBooking}
                        darkMode={darkMode}
                    />
                )}

                {viewMode === "week" && (
                    <WeekView
                        date={currentDate}
                        bikes={filteredBikes}
                        bookings={filteredBookings}
                        maintenanceBlocks={filteredMaintenance}
                        onClickSlot={handleClickSlot}
                        onClickBooking={handleClickBooking}
                        darkMode={darkMode}
                    />
                )}

                {viewMode === "month" && (
                    <MonthView
                        date={currentDate}
                        bikes={filteredBikes}
                        bookings={filteredBookings}
                        maintenanceBlocks={filteredMaintenance}
                        onClickDay={handleClickDay}
                        darkMode={darkMode}
                    />
                )}

                {viewMode === "gantt" && (
                    <GanttView
                        currentDate={currentDate}
                        filteredBikes={filteredBikes}
                        filteredBookings={filteredBookings}
                        filteredMaintenance={filteredMaintenance}
                        onClickSlot={handleClickSlot}
                        onClickBooking={handleClickBooking}
                        darkMode={darkMode}
                    />
                )}
            </div>

            {/* Quick Booking Modal */}
            {quickBooking && (
                <QuickBookingModal
                    initialDate={quickBooking.date}
                    initialBikeId={quickBooking.bikeId}
                    bikes={filteredBikes}
                    onSave={handleQuickSave}
                    onClose={() => setQuickBooking(null)}
                    darkMode={darkMode}
                />
            )}

            {/* Booking Detail Modal */}
            {detailBooking && (
                <BookingDetailModal
                    booking={detailBooking}
                    onClose={() => setDetailBooking(null)}
                    onEdit={handleEditBooking}
                    onCancel={handleCancelBooking}
                    darkMode={darkMode}
                />
            )}

            {/* Full Booking Modal */}
            {fullModal?.open && (
                <BookingModal
                    booking={editBooking}
                    initialDate={new Date()}
                    initialBikeId={null}
                    bikes={bikes.bikes}
                    customers={customers.customers}
                    existingBookings={bookings.bookings}
                    pricingRules={pricingRules?.rules || []}
                    addOns={addOns.addOns}
                    onSave={handleFullSave}
                    onDelete={async (id) => {
                        const { error } = await bookings.remove(id);
                        if (error) {
                            addToast("Fehler beim Stornieren.", "error");
                        } else {
                            setFullModal(null);
                            setEditBooking(null);
                        }
                    }}
                    onClose={() => { setFullModal(null); setEditBooking(null); }}
                    darkMode={darkMode}
                />
            )}
        </div>
    );
}
