"use client";
import { Loader2 } from "lucide-react";

export default function LoadingScreen() {
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
            </div>
        </div>
    );
}
