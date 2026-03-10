"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieBanner() {
    const [visible, setVisible] = useState(false);
    // Reading localStorage is only safe in an effect (SSR compat)
    useEffect(() => {
        const hasConsent = localStorage.getItem("cookie_consent");
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (!hasConsent) setVisible(true);
    }, []);

    const dismiss = () => {
        // Store consent with timestamp for GDPR audit trail
        localStorage.setItem("cookie_consent", JSON.stringify({
            value: "essential",
            timestamp: new Date().toISOString(),
            version: "1"
        }));
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-slate-900 border-t border-slate-700 shadow-2xl">
            <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1 text-sm text-slate-300">
                    <span className="font-semibold text-white">Cookie-Hinweis</span>
                    {" "}Wir verwenden ausschließlich technisch notwendige Cookies für Anmeldung und Session-Verwaltung.
                    Es werden keine Tracking- oder Werbe-Cookies gesetzt.{" "}
                    <Link href="/datenschutz" className="underline text-blue-400 hover:text-blue-300">
                        Datenschutzerklärung
                    </Link>
                </div>
                <div className="shrink-0">
                    <button
                        onClick={dismiss}
                        className="px-5 py-2 text-sm rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium transition-colors"
                    >
                        Verstanden
                    </button>
                </div>
            </div>
        </div>
    );
}
