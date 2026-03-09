"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieBanner() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem("cookie_consent");
        if (!consent) setVisible(true);
    }, []);

    const accept = () => {
        localStorage.setItem("cookie_consent", "all");
        setVisible(false);
    };

    const acceptEssential = () => {
        localStorage.setItem("cookie_consent", "essential");
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-slate-900 border-t border-slate-700 shadow-2xl">
            <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1 text-sm text-slate-300">
                    <span className="font-semibold text-white">🍪 Cookie-Hinweis</span>
                    {" "}Wir verwenden Cookies, um die grundlegende Funktionalität (Anmeldung, Session) bereitzustellen.
                    Es werden keine Tracking- oder Werbe-Cookies gesetzt.{" "}
                    <Link href="/datenschutz" className="underline text-blue-400 hover:text-blue-300">
                        Datenschutzerklärung
                    </Link>
                </div>
                <div className="flex gap-2 shrink-0">
                    <button
                        onClick={acceptEssential}
                        className="px-4 py-2 text-sm rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors"
                    >
                        Nur notwendige
                    </button>
                    <button
                        onClick={accept}
                        className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
                    >
                        Alle akzeptieren
                    </button>
                </div>
            </div>
        </div>
    );
}
