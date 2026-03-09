/* eslint-disable react-refresh/only-export-components */
"use client";
import { useState, useCallback, createContext, useContext } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

const ICONS = { success: CheckCircle, error: AlertCircle, info: Info };
const COLORS = {
    success: "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300",
    error: "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300",
    info: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300"
};

export const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = "info", duration = 4000) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        if (duration > 0) {
            setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
        }
    }, []);

    const dismiss = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
                {toasts.map(t => {
                    const Icon = ICONS[t.type] || Info;
                    return (
                        <div key={t.id} className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg pointer-events-auto ${COLORS[t.type] || COLORS.info}`}>
                            <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <span className="flex-1 text-sm font-medium">{t.message}</span>
                            <button onClick={() => dismiss(t.id)} className="opacity-60 hover:opacity-100 flex-shrink-0">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within ToastProvider");
    return ctx;
}
