"use client";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "../../utils/supabase";

export default function LoadingScreen() {
    const [showEscape, setShowEscape] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setShowEscape(true), 8000);
        return () => clearTimeout(t);
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut().catch(() => {});
        localStorage.removeItem("currentOrgId");
        window.location.href = "/login";
    };

    return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: "#F5FAF7" }}>
            <div className="text-center">
                <div className="w-14 h-14 mx-auto mb-5 rounded-2xl flex items-center justify-center animate-pulse" style={{ background: "#1A7D5A" }}>
                    <span className="text-white font-light text-2xl tracking-widest">L</span>
                </div>
                <div className="flex items-center gap-2" style={{ color: "#6B7280" }}>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Laden...</span>
                </div>
                {showEscape && (
                    <button
                        onClick={handleLogout}
                        className="mt-6 text-xs underline"
                        style={{ color: "#9CA3AF" }}
                    >
                        Abmelden
                    </button>
                )}
            </div>
        </div>
    );
}
