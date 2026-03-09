"use client";
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function DateRangePicker({
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    blockedDates = [],
    minDays = 1,
    maxDays = 30,
    maxAdvanceDays = 90,
    primaryColor = "#f97316",
    borderRadius = 12
}) {
    const [viewMonth, setViewMonth] = useState(new Date());
    const [selecting, setSelecting] = useState("start"); // "start" or "end"
    const [rangeError, setRangeError] = useState(null);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + maxAdvanceDays);

    const blockedSet = useMemo(() => new Set(blockedDates), [blockedDates]);

    const calendar = useMemo(() => {
        const year = viewMonth.getFullYear();
        const month = viewMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const startPad = (firstDay.getDay() + 6) % 7;
        const days = [];

        for (let i = -startPad; i <= lastDay.getDate() + (6 - (lastDay.getDay() + 6) % 7); i++) {
            const d = new Date(year, month, i + 1);
            days.push(d);
        }

        return { days, monthLabel: viewMonth.toLocaleDateString("de-DE", { month: "long", year: "numeric" }) };
    }, [viewMonth]);

    const isBlocked = (d) => {
        const iso = d.toISOString().slice(0, 10);
        return blockedSet.has(iso);
    };

    const isDisabled = (d) => {
        return d < today || d > maxDate || isBlocked(d);
    };

    const isInRange = (d) => {
        if (!startDate || !endDate) return false;
        return d >= startDate && d <= endDate;
    };

    const handleDayClick = (d) => {
        if (isDisabled(d)) return;

        if (selecting === "start" || !startDate || d < startDate) {
            onStartDateChange(d);
            onEndDateChange(null);
            setSelecting("end");
        } else {
            // Check if range is valid
            const days = Math.ceil((d - startDate) / (1000 * 60 * 60 * 24)) + 1;
            if (days < minDays) {
                setRangeError(`Mindestens ${minDays} Tage buchbar`);
                return;
            }
            if (days > maxDays) {
                setRangeError(`Maximal ${maxDays} Tage buchbar`);
                return;
            }

            // Check if any blocked date in range
            for (let check = new Date(startDate); check <= d; check.setDate(check.getDate() + 1)) {
                if (isBlocked(check)) {
                    setRangeError("Im gewählten Zeitraum ist ein Tag bereits belegt");
                    return;
                }
            }

            setRangeError(null);
            onEndDateChange(d);
            setSelecting("start");
        }
    };

    return (
        <div>
            {/* Selected Dates Display */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div style={{
                    padding: "12px",
                    border: selecting === "start" ? `2px solid ${primaryColor}` : "1px solid #e2e8f0",
                    borderRadius: `${borderRadius}px`,
                    cursor: "pointer"
                }} onClick={() => setSelecting("start")}>
                    <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#64748b" }}>Von</p>
                    <p style={{ margin: 0, fontWeight: "600" }}>
                        {startDate ? startDate.toLocaleDateString("de-DE") : "Datum wählen"}
                    </p>
                </div>
                <div style={{
                    padding: "12px",
                    border: selecting === "end" ? `2px solid ${primaryColor}` : "1px solid #e2e8f0",
                    borderRadius: `${borderRadius}px`,
                    cursor: "pointer"
                }} onClick={() => startDate && setSelecting("end")}>
                    <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#64748b" }}>Bis</p>
                    <p style={{ margin: 0, fontWeight: "600" }}>
                        {endDate ? endDate.toLocaleDateString("de-DE") : "Datum wählen"}
                    </p>
                </div>
            </div>

            {/* Calendar */}
            <div style={{ border: "1px solid #e2e8f0", borderRadius: `${borderRadius}px`, overflow: "hidden" }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", backgroundColor: "#f8fafc" }}>
                    <button
                        onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1))}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "8px" }}
                    >
                        <ChevronLeft style={{ width: 20, height: 20 }} />
                    </button>
                    <span style={{ fontWeight: "600" }}>{calendar.monthLabel}</span>
                    <button
                        onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1))}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "8px" }}
                    >
                        <ChevronRight style={{ width: 20, height: 20 }} />
                    </button>
                </div>

                {/* Weekdays */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid #e2e8f0" }}>
                    {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map(d => (
                        <div key={d} style={{ padding: "8px", textAlign: "center", fontSize: "12px", fontWeight: "500", color: "#64748b" }}>
                            {d}
                        </div>
                    ))}
                </div>

                {/* Days */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                    {calendar.days.map((d, i) => {
                        const isCurrentMonth = d.getMonth() === viewMonth.getMonth();
                        const disabled = isDisabled(d);
                        const blocked = isBlocked(d);
                        const isStart = startDate && d.getTime() === startDate.getTime();
                        const isEnd = endDate && d.getTime() === endDate.getTime();
                        const inRange = isInRange(d);
                        const isToday = d.getTime() === today.getTime();

                        return (
                            <button
                                key={i}
                                onClick={() => handleDayClick(d)}
                                disabled={disabled}
                                style={{
                                    padding: "10px",
                                    border: "none",
                                    background: isStart || isEnd
                                        ? primaryColor
                                        : inRange
                                            ? `${primaryColor}20`
                                            : blocked
                                                ? "#fee2e2"
                                                : "transparent",
                                    color: isStart || isEnd
                                        ? "white"
                                        : disabled
                                            ? "#cbd5e1"
                                            : !isCurrentMonth
                                                ? "#94a3b8"
                                                : "#1e293b",
                                    fontWeight: isToday || isStart || isEnd ? "600" : "400",
                                    cursor: disabled ? "not-allowed" : "pointer",
                                    borderRadius: isStart ? `${borderRadius}px 0 0 ${borderRadius}px` : isEnd ? `0 ${borderRadius}px ${borderRadius}px 0` : 0,
                                    position: "relative"
                                }}
                            >
                                {d.getDate()}
                                {isToday && !isStart && !isEnd && (
                                    <div style={{
                                        position: "absolute",
                                        bottom: "4px",
                                        left: "50%",
                                        transform: "translateX(-50%)",
                                        width: "4px",
                                        height: "4px",
                                        borderRadius: "50%",
                                        backgroundColor: primaryColor
                                    }} />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {rangeError && (
                <div style={{ color: "#ef4444", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "6px", padding: "8px 12px", marginTop: "8px", fontSize: "13px" }}>
                    {rangeError}
                </div>
            )}

            {/* Legend */}
            <div style={{ display: "flex", gap: "16px", marginTop: "12px", fontSize: "12px", color: "#64748b" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <div style={{ width: "12px", height: "12px", borderRadius: "2px", backgroundColor: "#fee2e2" }} />
                    Belegt
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <div style={{ width: "12px", height: "12px", borderRadius: "2px", backgroundColor: `${primaryColor}20` }} />
                    Ihre Auswahl
                </div>
            </div>
        </div>
    );
}
