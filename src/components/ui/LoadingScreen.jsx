import React from "react";
import { Bike, Loader2 } from "lucide-react";

export default function LoadingScreen() {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30 animate-pulse">
                    <Bike className="w-8 h-8 text-white" />
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Laden...</span>
                </div>
            </div>
        </div>
    );
}
