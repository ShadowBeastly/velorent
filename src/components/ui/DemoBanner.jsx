"use client";
import { FlaskConical, X } from "lucide-react";

const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_EMAIL;

export default function DemoBanner({ userEmail, onExit }) {
    if (!DEMO_EMAIL || userEmail !== DEMO_EMAIL) return null;

    return (
        <div
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center px-4 py-2"
            style={{ background: "#F59E0B", color: "#1C1917", minHeight: "40px" }}
        >
            <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs font-medium">
                    Demo-Modus. Alle Daten sind Beispieldaten. Kein echter Betrieb.
                </span>
            </div>
            <button
                onClick={onExit}
                className="absolute right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium flex-shrink-0 transition-colors"
                style={{ background: "rgba(0,0,0,0.12)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,0,0,0.22)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0,0,0,0.12)"; }}
            >
                <X className="w-3.5 h-3.5" />
                Demo beenden
            </button>
        </div>
    );
}
