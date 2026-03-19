"use client";
import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";

export default function SideBySideCompare({ pickupPhotoUrl, returnPhotoUrl, position, darkMode }) {
    const [mobileView, setMobileView] = useState("pickup"); // "pickup" | "return"

    const labels = {
        front: "Front",
        rear: "Heck",
        left_side: "Links",
        right_side: "Rechts",
        top: "Oben",
        detail: "Detail",
    };
    const posLabel = labels[position] || position;

    const imgClass = "w-full aspect-[4/3] object-cover";
    const noImg = (label) => (
        <div className={`w-full aspect-[4/3] flex items-center justify-center ${darkMode ? "bg-slate-800 text-slate-600" : "bg-slate-100 text-slate-400"}`}>
            <span className="text-xs">Kein Foto ({label})</span>
        </div>
    );

    return (
        <div>
            {/* Desktop: side by side */}
            <div className="hidden sm:grid sm:grid-cols-2 gap-2">
                <div className="relative rounded-xl overflow-hidden">
                    {pickupPhotoUrl
                        ? <img src={pickupPhotoUrl} alt={`Übergabe ${posLabel}`} className={imgClass} />
                        : noImg("Übergabe")
                    }
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
                        <span className="text-white text-xs font-bold">Übergabe</span>
                    </div>
                </div>
                <div className="relative rounded-xl overflow-hidden">
                    {returnPhotoUrl
                        ? <img src={returnPhotoUrl} alt={`Rückgabe ${posLabel}`} className={imgClass} />
                        : noImg("Rückgabe")
                    }
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
                        <span className="text-white text-xs font-bold">Rückgabe</span>
                    </div>
                </div>
            </div>

            {/* Mobile: toggle */}
            <div className="sm:hidden">
                <div className={`flex rounded-xl overflow-hidden mb-2 border ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
                    <button
                        onClick={() => setMobileView("pickup")}
                        className={`flex-1 py-2 text-xs font-bold transition-colors ${mobileView === "pickup" ? "bg-[#1A7D5A] text-white" : darkMode ? "bg-slate-800 text-slate-400" : "bg-white text-slate-500"}`}
                    >
                        Übergabe
                    </button>
                    <button
                        onClick={() => setMobileView("return")}
                        className={`flex-1 py-2 text-xs font-bold transition-colors flex items-center justify-center gap-1 ${mobileView === "return" ? "bg-[#1A7D5A] text-white" : darkMode ? "bg-slate-800 text-slate-400" : "bg-white text-slate-500"}`}
                    >
                        <ArrowLeftRight className="w-3 h-3" />
                        Rückgabe
                    </button>
                </div>
                <div className="relative rounded-xl overflow-hidden">
                    {mobileView === "pickup"
                        ? (pickupPhotoUrl ? <img src={pickupPhotoUrl} alt="Übergabe" className={imgClass} /> : noImg("Übergabe"))
                        : (returnPhotoUrl ? <img src={returnPhotoUrl} alt="Rückgabe" className={imgClass} /> : noImg("Rückgabe"))
                    }
                </div>
            </div>
        </div>
    );
}
