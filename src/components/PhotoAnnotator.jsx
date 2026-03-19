"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { X, Check, Trash2 } from "lucide-react";

const SEVERITY_COLORS = {
    minor: "#eab308",
    moderate: "#f97316",
    severe: "#ef4444",
};

const SEVERITY_LABELS = { minor: "Gering", moderate: "Mittel", severe: "Schwer" };

export default function PhotoAnnotator({ imageUrl, initialAnnotations = [], onSave, onCancel, darkMode = false }) {
    const [annotations, setAnnotations] = useState(initialAnnotations);
    const [selected, setSelected] = useState(null);
    const [labelInput, setLabelInput] = useState("");
    const [severity, setSeverity] = useState("minor");
    const canvasRef = useRef(null);
    const imgRef = useRef(null);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const img = imgRef.current;
        if (!canvas || !img) return;
        const ctx = canvas.getContext("2d");
        canvas.width = img.offsetWidth;
        canvas.height = img.offsetHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        annotations.forEach((ann, idx) => {
            const x = ann.x * canvas.width;
            const y = ann.y * canvas.height;
            const r = (ann.radius || 0.04) * canvas.width;
            const color = SEVERITY_COLORS[ann.severity] || SEVERITY_COLORS.minor;

            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.strokeStyle = color;
            ctx.lineWidth = selected === idx ? 3 : 2;
            ctx.stroke();

            ctx.fillStyle = color;
            ctx.font = `bold ${Math.max(10, r * 0.8)}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(String(idx + 1), x, y);
        });
    }, [annotations, selected]);

    useEffect(() => { draw(); }, [draw]);

    const handleCanvasClick = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const xRatio = (e.clientX - rect.left) / canvas.width;
        const yRatio = (e.clientY - rect.top) / canvas.height;

        // Check if clicking existing annotation
        const hit = annotations.findIndex(ann => {
            const dx = (ann.x - xRatio) * canvas.width;
            const dy = (ann.y - yRatio) * canvas.height;
            return Math.sqrt(dx * dx + dy * dy) < (ann.radius || 0.04) * canvas.width;
        });

        if (hit >= 0) {
            setSelected(hit);
            setLabelInput(annotations[hit].label || "");
            setSeverity(annotations[hit].severity || "minor");
        } else {
            const newAnn = { id: Date.now(), x: xRatio, y: yRatio, radius: 0.04, label: "", severity: "minor" };
            const idx = annotations.length;
            setAnnotations(prev => [...prev, newAnn]);
            setSelected(idx);
            setLabelInput("");
            setSeverity("minor");
        }
    };

    const updateSelected = (updates) => {
        if (selected === null) return;
        setAnnotations(prev => prev.map((a, i) => i === selected ? { ...a, ...updates } : a));
    };

    const deleteSelected = () => {
        setAnnotations(prev => prev.filter((_, i) => i !== selected));
        setSelected(null);
    };

    return (
        <div className="fixed inset-0 z-[60] flex" style={{ background: "rgba(0,0,0,0.92)" }}>
            <div className="flex-1 relative flex items-center justify-center p-4">
                <div className="relative max-w-full max-h-full">
                    <img
                        ref={imgRef}
                        src={imageUrl}
                        alt="Annotation"
                        className="max-w-full max-h-[80vh] rounded-lg object-contain select-none"
                        style={{ display: "block" }}
                        onLoad={draw}
                    />
                    <canvas
                        ref={canvasRef}
                        className="absolute inset-0 cursor-crosshair"
                        style={{ width: "100%", height: "100%" }}
                        onClick={handleCanvasClick}
                    />
                </div>
            </div>

            {/* Sidebar */}
            <div className={`w-72 flex flex-col border-l ${darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}>
                <div className={`flex items-center justify-between px-4 py-3 border-b ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
                    <h3 className={`font-bold text-sm ${darkMode ? "text-white" : "text-slate-900"}`}>
                        Schäden markieren
                    </h3>
                    <button onClick={onCancel} className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                        Klicke auf das Bild, um einen Schaden zu markieren.
                    </p>

                    {selected !== null && annotations[selected] && (
                        <div className={`rounded-lg p-3 space-y-3 border ${darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                            <p className={`text-xs font-bold ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                                Markierung #{selected + 1}
                            </p>
                            <div>
                                <label className={`text-xs font-medium ${darkMode ? "text-slate-400" : "text-slate-600"}`}>Beschreibung</label>
                                <input
                                    type="text"
                                    value={labelInput}
                                    onChange={e => { setLabelInput(e.target.value); updateSelected({ label: e.target.value }); }}
                                    placeholder="z.B. Kratzer am Rahmen"
                                    className={`w-full mt-1 px-2 py-1.5 rounded text-sm border outline-none focus:ring-1 focus:ring-[#1A7D5A] ${darkMode ? "bg-slate-900 border-slate-600 text-white" : "bg-white border-slate-300"}`}
                                />
                            </div>
                            <div>
                                <label className={`text-xs font-medium ${darkMode ? "text-slate-400" : "text-slate-600"}`}>Schwere</label>
                                <div className="flex gap-1 mt-1">
                                    {Object.entries(SEVERITY_LABELS).map(([k, v]) => (
                                        <button
                                            key={k}
                                            onClick={() => { setSeverity(k); updateSelected({ severity: k }); }}
                                            className={`flex-1 py-1 rounded text-xs font-semibold transition-colors ${severity === k ? "text-white" : darkMode ? "text-slate-400 bg-slate-700" : "text-slate-600 bg-slate-100"}`}
                                            style={severity === k ? { backgroundColor: SEVERITY_COLORS[k] } : {}}
                                        >
                                            {v}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button onClick={deleteSelected} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600">
                                <Trash2 className="w-3.5 h-3.5" /> Entfernen
                            </button>
                        </div>
                    )}

                    {annotations.length > 0 && (
                        <div className="space-y-1">
                            {annotations.map((ann, idx) => (
                                <button
                                    key={ann.id}
                                    onClick={() => { setSelected(idx); setLabelInput(ann.label || ""); setSeverity(ann.severity || "minor"); }}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-2 transition-colors ${selected === idx ? darkMode ? "bg-slate-700" : "bg-slate-100" : darkMode ? "hover:bg-slate-800" : "hover:bg-slate-50"}`}
                                >
                                    <span className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
                                        style={{ backgroundColor: SEVERITY_COLORS[ann.severity] }}>
                                        {idx + 1}
                                    </span>
                                    <span className={darkMode ? "text-slate-300" : "text-slate-700"}>{ann.label || "(keine Beschreibung)"}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className={`p-4 border-t ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
                    <button
                        onClick={() => onSave(annotations)}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#1A7D5A] text-white text-sm font-semibold hover:bg-[#166a4b] transition-colors"
                    >
                        <Check className="w-4 h-4" /> Speichern ({annotations.length})
                    </button>
                </div>
            </div>
        </div>
    );
}
