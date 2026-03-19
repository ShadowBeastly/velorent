"use client";
import { useRef, useEffect, useState } from "react";
import SignaturePadLib from "signature_pad";

/**
 * Touch-capable signature pad.
 * Props:
 *   onSave(base64Png) — called when user clicks "Bestätigen"
 *   onClear()         — called when user clicks "Löschen"
 *   darkMode          — boolean
 */
export default function SignaturePad({ onSave, onClear, darkMode }) {
    const canvasRef = useRef(null);
    const padRef = useRef(null);
    const [isEmpty, setIsEmpty] = useState(true);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ratio = Math.max(window.devicePixelRatio || 1, 1);

        const resizeCanvas = () => {
            const parent = canvas.parentElement;
            if (!parent) return;
            const w = parent.clientWidth || 300;
            const h = 150;
            canvas.width = w * ratio;
            canvas.height = h * ratio;
            canvas.style.width = w + "px";
            canvas.style.height = h + "px";
            canvas.getContext("2d").scale(ratio, ratio);
            padRef.current?.clear();
            setIsEmpty(true);
        };

        const pad = new SignaturePadLib(canvas, {
            penColor: "black",
            minWidth: 1,
            maxWidth: 2.5,
        });
        padRef.current = pad;

        pad.addEventListener("beginStroke", () => setIsEmpty(false));

        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);

        return () => {
            window.removeEventListener("resize", resizeCanvas);
            pad.off();
        };
    }, []);

    const handleClear = () => {
        padRef.current?.clear();
        setIsEmpty(true);
        onClear?.();
    };

    const handleSave = () => {
        if (!padRef.current || padRef.current.isEmpty()) return;
        onSave(padRef.current.toDataURL("image/png"));
    };

    return (
        <div className="space-y-3">
            <div
                className={`rounded-xl border-2 overflow-hidden ${
                    darkMode
                        ? "border-slate-600 bg-slate-800"
                        : "border-slate-300 bg-white"
                }`}
            >
                <canvas
                    ref={canvasRef}
                    className="touch-none block"
                    style={{ height: 150, width: "100%" }}
                />
            </div>
            <div className="flex gap-2 justify-end">
                <button
                    type="button"
                    onClick={handleClear}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        darkMode
                            ? "border-slate-600 hover:bg-slate-700 text-slate-300"
                            : "border-slate-300 hover:bg-slate-50 text-slate-600"
                    }`}
                >
                    Löschen
                </button>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={isEmpty}
                    className="px-4 py-2 bg-[#1A7D5A] text-white rounded-lg text-sm font-medium hover:bg-[#166a4d] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    Bestätigen
                </button>
            </div>
        </div>
    );
}
