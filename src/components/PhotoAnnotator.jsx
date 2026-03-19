"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Plus, Trash2, Save, AlertCircle } from "lucide-react";

const SEVERITY_CONFIG = {
    minor: { label: "Gering", color: "#eab308", bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400" },
    moderate: { label: "Mittel", color: "#f97316", bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-400" },
    severe: { label: "Schwer", color: "#ef4444", bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400" },
};

export default function PhotoAnnotator({ imageUrl, initialAnnotations = [], onSave, onCancel, darkMode }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [annotations, setAnnotations] = useState(initialAnnotations);
    const [editingId, setEditingId] = useState(null);
    const [addMode, setAddMode] = useState(false);
    const imgRef = useRef(null);
    const [imgLoaded, setImgLoaded] = useState(false);

    // Draw annotations on canvas
    const drawAnnotations = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        annotations.forEach((ann, i) => {
            const cx = ann.x * canvas.width;
            const cy = ann.y * canvas.height;
            const r = Math.max(16, ann.radius * canvas.width);
            const color = SEVERITY_CONFIG[ann.severity]?.color || "#ef4444";

            // Circle
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, 2 * Math.PI);
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.stroke();

            // Fill with transparency
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, 2 * Math.PI);
            ctx.fillStyle = color + "33";
            ctx.fill();

            // Number badge
            const num = i + 1;
            const badgeR = 12;
            const bx = cx + r - badgeR / 2;
            const by = cy - r + badgeR / 2;
            ctx.beginPath();
            ctx.arc(bx, by, badgeR, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.font = "bold 11px system-ui";
            ctx.fillStyle = "#fff";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(num, bx, by);
            ctx.textAlign = "start";
            ctx.textBaseline = "alphabetic";
        });
    }, [annotations]);

    // Resize canvas to match image
    const syncCanvasSize = useCallback(() => {
        const canvas = canvasRef.current;
        const img = imgRef.current;
        if (!canvas || !img) return;
        const rect = img.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        drawAnnotations();
    }, [drawAnnotations]);

    useEffect(() => {
        if (imgLoaded) syncCanvasSize();
    }, [imgLoaded, syncCanvasSize]);

    useEffect(() => {
        drawAnnotations();
    }, [drawAnnotations]);

    useEffect(() => {
        window.addEventListener("resize", syncCanvasSize);
        return () => window.removeEventListener("resize", syncCanvasSize);
    }, [syncCanvasSize]);

    const handleCanvasClick = useCallback((e) => {
        if (!addMode) return;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        const newId = Date.now();
        const newAnnotation = { id: newId, x, y, radius: 0.04, label: "", severity: "minor" };
        setAnnotations(prev => [...prev, newAnnotation]);
        setEditingId(newId);
        setAddMode(false);
    }, [addMode]);

    const updateAnnotation = (id, updates) => {
        setAnnotations(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    };

    const removeAnnotation = (id) => {
        setAnnotations(prev => prev.filter(a => a.id !== id));
        if (editingId === id) setEditingId(null);
    };
    // eslint-disable-next-line no-unused-vars
    const base = darkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900";
    const input = darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900";

    return (
        <div className={`fixed inset-0 z-[60] flex flex-col ${darkMode ? "bg-slate-950" : "bg-slate-900"}`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 border-b ${darkMode ? "border-slate-800 bg-slate-900" : "border-slate-700 bg-slate-800"}`}>
                <h3 className="text-white font-semibold text-sm">Schaden markieren</h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => { setAddMode(a => !a); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${addMode ? "bg-[#1A7D5A] text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
                    >
                        <Plus className="w-3.5 h-3.5" />
                        {addMode ? "Auf Foto klicken…" : "Markierung hinzufügen"}
                    </button>
                </div>
            </div>

            {/* Main area: image + canvas */}
            <div className="flex flex-1 overflow-hidden">
                <div
                    ref={containerRef}
                    className="relative flex-1 overflow-hidden flex items-center justify-center bg-black"
                    style={{ cursor: addMode ? "crosshair" : "default" }}
                >
                    <img
                        ref={imgRef}
                        src={imageUrl}
                        alt="Zu annotierendes Foto"
                        className="max-w-full max-h-full object-contain"
                        onLoad={() => setImgLoaded(true)}
                        style={{ display: "block" }}
                    />
                    <canvas
                        ref={canvasRef}
                        onClick={handleCanvasClick}
                        className="absolute inset-0 pointer-events-auto"
                        style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
                    />
                    {addMode && (
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#1A7D5A] text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow pointer-events-none">
                            Tippen um Schaden zu markieren
                        </div>
                    )}
                </div>

                {/* Annotations sidebar */}
                <div className={`w-72 flex flex-col border-l overflow-y-auto ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
                    {annotations.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-2 p-6 text-center">
                            <AlertCircle className={`w-8 h-8 ${darkMode ? "text-slate-600" : "text-slate-300"}`} />
                            <p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                Noch keine Markierungen.<br />Tippe auf das Foto um einen Schaden zu markieren.
                            </p>
                        </div>
                    ) : (
                        <div className="p-3 space-y-3">
                            {annotations.map((ann, i) => {
                                const sev = SEVERITY_CONFIG[ann.severity];
                                return (
                                    <div key={ann.id} className={`rounded-xl border p-3 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white`}
                                                    style={{ backgroundColor: sev.color }}>
                                                    {i + 1}
                                                </span>
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${sev.bg} ${sev.text}`}>
                                                    {sev.label}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => removeAnnotation(ann.id)}
                                                className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        {/* Label input */}
                                        <input
                                            type="text"
                                            value={ann.label}
                                            onChange={e => updateAnnotation(ann.id, { label: e.target.value })}
                                            placeholder="z.B. Kratzer, Delle…"
                                            className={`w-full px-2 py-1.5 rounded-lg border text-xs outline-none mb-2 ${input}`}
                                        />

                                        {/* Severity selector */}
                                        <div className="flex gap-1">
                                            {Object.entries(SEVERITY_CONFIG).map(([key, cfg]) => (
                                                <button
                                                    key={key}
                                                    onClick={() => updateAnnotation(ann.id, { severity: key })}
                                                    className={`flex-1 py-1 rounded text-[10px] font-bold transition-all ${ann.severity === key ? `${cfg.bg} ${cfg.text} ring-1 ring-current` : darkMode ? "bg-slate-700 text-slate-400" : "bg-slate-200 text-slate-500"}`}
                                                >
                                                    {cfg.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className={`flex items-center justify-between px-4 py-3 border-t ${darkMode ? "border-slate-800 bg-slate-900" : "border-slate-700 bg-slate-800"}`}>
                <button
                    onClick={onCancel}
                    className="px-4 py-2 text-slate-400 hover:text-white text-sm font-medium transition-colors"
                >
                    Abbrechen
                </button>
                <button
                    onClick={() => onSave(annotations)}
                    className="flex items-center gap-2 px-5 py-2 bg-[#1A7D5A] hover:bg-[#15664A] text-white text-sm font-semibold rounded-xl transition-colors"
                >
                    <Save className="w-4 h-4" />
                    Markierungen speichern
                    {annotations.length > 0 && (
                        <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full">
                            {annotations.length}
                        </span>
                    )}
                </button>
            </div>
        </div>
    );
}
