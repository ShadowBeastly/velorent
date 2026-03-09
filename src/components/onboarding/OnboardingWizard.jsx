"use client";
import { useState, useEffect } from "react";
import { CheckCircle, Circle, X, Bike, Calendar, ArrowRight, PartyPopper } from "lucide-react";

export default function OnboardingWizard({ bikes = [], bookings = [], onCreateBike, onCreateBooking, darkMode, hasWidgetKey = false, hasOrgData = false, onGoToSettings, onGoToWidget }) {
    const [visible, setVisible] = useState(false);
    const [minimized, setMinimized] = useState(false);

    const hasBike = bikes.length > 0;
    const hasBooking = bookings.length > 0;
    const isComplete = hasBike && hasBooking && hasWidgetKey && hasOrgData;

    useEffect(() => {
        // Show if not complete and not permanently dismissed
        const dismissed = localStorage.getItem("onboarding_dismissed");
        if (!dismissed && !isComplete) {
            // Delay slightly for effect
            const timer = setTimeout(() => setVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, [isComplete]);

    const handleDismiss = () => {
        setVisible(false);
        localStorage.setItem("onboarding_dismissed", "true");
    };

    useEffect(() => {
        if (isComplete && visible) {
            const timer = setTimeout(() => {
                setVisible(false);
                localStorage.setItem("onboarding_dismissed", "true");
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [isComplete, visible]);

    if (!visible && !isComplete) return null; // Don't show if hidden and not complete. If complete, we might show a celebration briefly?
    // actually, if complete, we show celebration then hide.

    const steps = [
        {
            id: "bike",
            label: "Erstes E-Bike anlegen",
            done: hasBike,
            icon: Bike,
            action: onCreateBike,
            btnText: "Bike anlegen"
        },
        {
            id: "booking",
            label: "Erste Buchung erstellen",
            done: hasBooking,
            icon: Calendar,
            action: onCreateBooking,
            btnText: "Buchung anlegen"
        },
        {
            id: "orgdata",
            label: "Firmendaten vervollständigen",
            done: hasOrgData,
            icon: ArrowRight,
            action: onGoToSettings,
            btnText: "Zu den Einstellungen"
        },
        {
            id: "widget",
            label: "Buchungs-Widget aktivieren",
            done: hasWidgetKey,
            icon: ArrowRight,
            action: onGoToWidget,
            btnText: "Widget einrichten"
        }
    ];

    const progress = steps.filter(s => s.done).length / steps.length * 100;

    if (minimized) {
        return (
            <div className="fixed bottom-6 right-6 z-50">
                <button
                    onClick={() => setMinimized(false)}
                    className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-3 rounded-full shadow-lg hover:scale-105 transition-transform"
                >
                    <PartyPopper className="w-6 h-6" />
                </button>
            </div>
        )
    }

    return (
        <div className={`fixed bottom-6 right-6 z-50 w-full max-w-sm transition-all duration-500 transform ${visible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"}`}>
            <div className={`rounded-xl shadow-2xl border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"} overflow-hidden`}>
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-4 flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                        <PartyPopper className="w-5 h-5" />
                        <h3 className="font-bold">Erste Schritte</h3>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setMinimized(true)} className="p-1 hover:bg-white/20 rounded">
                            <span className="sr-only">Minimize</span>
                            <div className="w-4 h-0.5 bg-white"></div>
                        </button>
                        <button onClick={handleDismiss} className="p-1 hover:bg-white/20 rounded">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4">
                    {isComplete ? (
                        <div className="text-center py-4">
                            <div className="mx-auto w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                            <h4 className={`font-semibold ${darkMode ? "text-white" : "text-slate-900"}`}>Fantastisch!</h4>
                            <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Du bist bereit für deinen ersten Kunden.</p>
                        </div>
                    ) : (
                        <>
                            <div className="relative h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className="absolute top-0 left-0 h-full bg-emerald-500 transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <div className="space-y-3">
                                {steps.map((step) => (
                                    <div key={step.id} className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${step.done ? "opacity-50" : ""}`}>
                                        <div className={`mt-1 ${step.done ? "text-emerald-500" : darkMode ? "text-slate-400" : "text-slate-300"}`}>
                                            {step.done ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className={`text-sm font-medium ${step.done ? "line-through text-slate-400" : darkMode ? "text-slate-200" : "text-slate-700"}`}>
                                                {step.label}
                                            </h4>
                                            {!step.done && (
                                                <button
                                                    onClick={step.action}
                                                    className="mt-2 text-xs flex items-center gap-1 text-orange-500 font-medium hover:text-orange-600 hover:underline"
                                                >
                                                    {step.btnText} <ArrowRight className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
