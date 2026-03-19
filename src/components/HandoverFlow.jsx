"use client";
import { useState, useCallback } from "react";
import { ArrowLeft, ArrowRight, Camera, CheckCircle, ClipboardList, FileText, X, Edit3, AlertTriangle } from "lucide-react";
import CameraCapture from "./CameraCapture";
import PhotoAnnotator from "./PhotoAnnotator";
import ConditionChecklist from "./ConditionChecklist";
import SideBySideCompare from "./SideBySideCompare";

const POSITIONS = [
    { key: "front", label: "Front", icon: "⬆" },
    { key: "rear", label: "Heck", icon: "⬇" },
    { key: "left_side", label: "Links", icon: "◀" },
    { key: "right_side", label: "Rechts", icon: "▶" },
    { key: "top", label: "Oben", icon: "◉" },
    { key: "detail", label: "Detail", icon: "🔍" },
];

const STEPS = [
    { id: "photos", label: "Fotos", icon: Camera },
    { id: "checklist", label: "Checkliste", icon: ClipboardList },
    { id: "summary", label: "Abschluss", icon: FileText },
];

export default function HandoverFlow({
    booking,
    bike,
    type,           // "pickup" | "return"
    pickupProtocol, // for return: { checklist, condition_photos: [{position, photo_url}] }
    onComplete,     // async (result) => void
    onCancel,
    darkMode,
}) {
    const isReturn = type === "return";
    const isEBike = !!(bike?.category?.toLowerCase().includes("e-bike") || bike?.category?.toLowerCase().includes("ebike"));

    // Step state
    const [step, setStep] = useState(0);

    // Photo state: { front: base64|null, ... }
    const [photos, setPhotos] = useState({});

    // Annotation state: { front: [{id, x, y, radius, label, severity}], ... }
    const [annotations, setAnnotations] = useState({});

    // Which position is being expanded (camera/annotate view)
    const [activePosition, setActivePosition] = useState(null);
    const [annotatingPosition, setAnnotatingPosition] = useState(null);

    // Checklist state (from ConditionChecklist)
    const [checklist, setChecklist] = useState(null);

    // Notes
    const [notes, setNotes] = useState("");

    // Damage items for return flow (collected in summary step)
    const [damageItems, setDamageItems] = useState([]);

    // Submitting state
    const [saving, setSaving] = useState(false);

    const capturedCount = POSITIONS.filter(p => photos[p.key]).length;

    // Get pickup photo URL for a position
    const getPickupPhoto = (posKey) => {
        if (!pickupProtocol?.condition_photos) return null;
        return pickupProtocol.condition_photos.find(p => p.position === posKey)?.photo_url || null;
    };

    const handlePhotoCapture = useCallback((posKey, base64) => {
        setPhotos(prev => ({ ...prev, [posKey]: base64 }));
        // Clear annotations when photo is re-taken
        if (!base64) setAnnotations(prev => ({ ...prev, [posKey]: [] }));
    }, []);

    const handleAnnotationSave = (posKey, anns) => {
        setAnnotations(prev => ({ ...prev, [posKey]: anns }));
        setAnnotatingPosition(null);
    };

    // Detect damages: checklist items that went from ok/check → defect, plus photos with annotations
    const detectDamages = () => {
        if (!isReturn) return [];
        const damages = [];
        const pickupChecklist = pickupProtocol?.checklist || {};
        const returnChecklist = checklist || {};

        // Check for newly defect items
        Object.entries(returnChecklist).forEach(([key, val]) => {
            if (val === "defect") {
                const wasOk = !pickupChecklist[key] || pickupChecklist[key] !== "defect";
                if (wasOk) {
                    damages.push({
                        id: `cl_${key}`,
                        type: "checklist",
                        description: `${key.replace(/_/g, " ")} → Defekt`,
                        severity: "moderate",
                        estimated_cost: 0,
                    });
                }
            }
        });

        // Check for annotated photos
        POSITIONS.forEach(pos => {
            const anns = annotations[pos.key] || [];
            anns.forEach(ann => {
                if (ann.label) {
                    damages.push({
                        id: `ph_${pos.key}_${ann.id}`,
                        type: "photo",
                        description: ann.label || `Schaden an ${pos.label}`,
                        position: pos.key,
                        photo_annotation: ann,
                        severity: ann.severity,
                        estimated_cost: 0,
                    });
                }
            });
        });

        return damages;
    };

    // Advance to summary — initialize damage items for return
    const handleToSummary = () => {
        if (isReturn) {
            const detected = detectDamages();
            setDamageItems(detected);
        }
        setStep(2);
    };

    const handleComplete = async () => {
        setSaving(true);
        try {
            await onComplete({
                checklist,
                bikeConditionNotes: notes,
                photos,
                annotations,
                damageItems: isReturn ? damageItems : [],
            });
        } catch (err) {
            console.error("HandoverFlow complete error:", err);
        } finally {
            setSaving(false);
        }
    };

    const bg = darkMode ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900";
    const card = darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
    const inputCls = darkMode ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-[#1A7D5A]" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#1A7D5A]";

    // === PHOTO ANNOTATOR OVERLAY ===
    if (annotatingPosition) {
        const photo = photos[annotatingPosition];
        return (
            <PhotoAnnotator
                imageUrl={photo}
                initialAnnotations={annotations[annotatingPosition] || []}
                onSave={(anns) => handleAnnotationSave(annotatingPosition, anns)}
                onCancel={() => setAnnotatingPosition(null)}
                darkMode={darkMode}
            />
        );
    }

    // === POSITION LIGHTBOX (camera capture + side-by-side) ===
    if (activePosition) {
        const posConfig = POSITIONS.find(p => p.key === activePosition);
        const pickupPhotoUrl = getPickupPhoto(activePosition);
        const capturedPhoto = photos[activePosition];
        const annsForPos = annotations[activePosition] || [];

        return (
            <div className={`fixed inset-0 z-50 flex flex-col ${bg}`}>
                {/* Header */}
                <div className={`flex items-center gap-3 px-4 py-3 border-b ${darkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"} shadow-sm`}>
                    <button
                        onClick={() => setActivePosition(null)}
                        className={`p-2 rounded-xl transition-colors ${darkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="font-bold text-base">{posConfig?.label}</h2>
                        <p className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                            {isReturn ? "Rückgabe-Foto aufnehmen" : "Übergabe-Foto aufnehmen"}
                        </p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* For return: show side-by-side if we have both */}
                    {isReturn && (pickupPhotoUrl || capturedPhoto) && (
                        <div>
                            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                Vergleich
                            </p>
                            <SideBySideCompare
                                pickupPhotoUrl={pickupPhotoUrl}
                                returnPhotoUrl={capturedPhoto}
                                position={activePosition}
                                darkMode={darkMode}
                            />
                        </div>
                    )}

                    {/* Camera capture */}
                    <div>
                        <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                            {isReturn ? "Rückgabe-Foto" : "Foto aufnehmen"}
                        </p>
                        <CameraCapture
                            label={`${posConfig?.label} aufnehmen`}
                            onCapture={(base64) => handlePhotoCapture(activePosition, base64)}
                            existingPhotoUrl={capturedPhoto}
                            darkMode={darkMode}
                        />
                    </div>

                    {/* Annotate button (only if photo captured) */}
                    {capturedPhoto && (
                        <button
                            onClick={() => setAnnotatingPosition(activePosition)}
                            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border transition-colors ${
                                annsForPos.length > 0
                                    ? "border-red-400 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                                    : darkMode ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                        >
                            <Edit3 className="w-4 h-4" />
                            {annsForPos.length > 0
                                ? `${annsForPos.length} Schaden${annsForPos.length !== 1 ? "schäden" : ""} markiert — bearbeiten`
                                : "Schäden auf Foto markieren"
                            }
                        </button>
                    )}

                    {/* Annotations summary for this position */}
                    {annsForPos.length > 0 && (
                        <div className={`rounded-xl border p-3 space-y-2 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                            <p className="text-xs font-bold text-red-500">Markierte Schäden:</p>
                            {annsForPos.map((ann, i) => (
                                <div key={ann.id} className="flex items-center gap-2 text-sm">
                                    <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                        {i + 1}
                                    </span>
                                    <span className={darkMode ? "text-slate-300" : "text-slate-700"}>{ann.label || "Unbenannt"}</span>
                                    <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                        ann.severity === "severe" ? "bg-red-100 dark:bg-red-900/30 text-red-600"
                                        : ann.severity === "moderate" ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600"
                                        : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600"
                                    }`}>
                                        {ann.severity === "severe" ? "Schwer" : ann.severity === "moderate" ? "Mittel" : "Gering"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className={`px-4 py-3 border-t ${darkMode ? "border-slate-800" : "border-slate-200"}`}>
                    <button
                        onClick={() => setActivePosition(null)}
                        className="w-full py-3 bg-gradient-to-r from-[#1A7D5A] to-[#3BAA82] text-white font-semibold rounded-xl"
                    >
                        {capturedPhoto ? "Fertig" : "Ohne Foto fortfahren"}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen ${bg}`}>
            {/* Top header */}
            <div className={`sticky top-0 z-10 border-b ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"} shadow-sm`}>
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
                    <button onClick={onCancel} className={`p-2 rounded-xl transition-colors ${darkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}>
                        <X className="w-5 h-5" />
                    </button>
                    <div className="flex-1">
                        <h1 className="font-bold text-base">
                            {isReturn ? "Rücknahme" : "Übergabe"} — {bike?.name}
                        </h1>
                        <p className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                            {booking.customer_name} · {booking.booking_number}
                        </p>
                    </div>
                </div>

                {/* Step indicator */}
                <div className="max-w-2xl mx-auto px-4 pb-3 flex gap-2">
                    {STEPS.map((s, i) => {
                        const Icon = s.icon;
                        const isDone = i < step;
                        const isActive = i === step;
                        return (
                            <button
                                key={s.id}
                                onClick={() => i < step && setStep(i)}
                                disabled={i > step}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                                    isActive ? "bg-[#1A7D5A] text-white shadow-sm"
                                    : isDone ? darkMode ? "bg-slate-700 text-slate-300" : "bg-slate-200 text-slate-600"
                                    : darkMode ? "bg-slate-800 text-slate-600" : "bg-slate-100 text-slate-400"
                                }`}
                            >
                                {isDone ? <CheckCircle className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                                {s.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-6 pb-32 space-y-6">

                {/* ===== STEP 0: FOTOS ===== */}
                {step === 0 && (
                    <>
                        <div>
                            <h2 className="text-lg font-bold mb-1">Fotos aufnehmen</h2>
                            <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                Fotografiere alle Seiten des Fahrzeugs. {capturedCount}/6 Fotos aufgenommen.
                            </p>
                        </div>

                        {/* Progress bar */}
                        <div className={`h-2 rounded-full overflow-hidden ${darkMode ? "bg-slate-800" : "bg-slate-200"}`}>
                            <div
                                className="h-full bg-gradient-to-r from-[#1A7D5A] to-[#3BAA82] transition-all duration-300"
                                style={{ width: `${(capturedCount / 6) * 100}%` }}
                            />
                        </div>

                        {/* Photo grid */}
                        <div className="grid grid-cols-2 gap-3">
                            {POSITIONS.map(pos => {
                                const captured = !!photos[pos.key];
                                const annsCount = (annotations[pos.key] || []).length;
                                const pickupUrl = getPickupPhoto(pos.key);
                                return (
                                    <button
                                        key={pos.key}
                                        onClick={() => setActivePosition(pos.key)}
                                        className={`relative rounded-2xl overflow-hidden border text-left transition-all active:scale-95 ${
                                            captured
                                                ? "border-[#1A7D5A] ring-2 ring-[#1A7D5A]/30"
                                                : darkMode ? "border-slate-700 hover:border-slate-600" : "border-slate-200 hover:border-slate-300"
                                        }`}
                                    >
                                        {/* Photo or placeholder */}
                                        {captured ? (
                                            <img src={photos[pos.key]} alt={pos.label} className="w-full aspect-[4/3] object-cover" />
                                        ) : isReturn && pickupUrl ? (
                                            <div className="relative">
                                                <img src={pickupUrl} alt={`Übergabe ${pos.label}`} className="w-full aspect-[4/3] object-cover opacity-40" />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${darkMode ? "bg-slate-800 text-slate-300" : "bg-white text-slate-600"} shadow`}>
                                                        Tippen zum Aufnehmen
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className={`aspect-[4/3] flex flex-col items-center justify-center gap-1 ${darkMode ? "bg-slate-800" : "bg-slate-100"}`}>
                                                <span className="text-2xl">{pos.icon}</span>
                                                <span className={`text-xs font-medium ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{pos.label}</span>
                                            </div>
                                        )}

                                        {/* Overlay labels */}
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-white text-xs font-bold">{pos.label}</span>
                                                <div className="flex items-center gap-1">
                                                    {captured && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                                                    {annsCount > 0 && (
                                                        <span className="bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                                            {annsCount}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* ===== STEP 1: CHECKLISTE ===== */}
                {step === 1 && (
                    <>
                        <div>
                            <h2 className="text-lg font-bold mb-1">Fahrzeugzustand prüfen</h2>
                            <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                Prüfe alle Teile des Fahrzeugs und markiere den Zustand.
                            </p>
                        </div>
                        {isReturn && pickupProtocol?.checklist && (
                            <div className={`flex items-start gap-2 p-3 rounded-xl ${darkMode ? "bg-blue-900/20 border border-blue-800/40" : "bg-blue-50 border border-blue-100"}`}>
                                <AlertTriangle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                                <p className="text-xs text-blue-600 dark:text-blue-400">
                                    Vergleiche mit dem Zustand bei der Übergabe. Verschlechterte Zustände werden als Schäden erfasst.
                                </p>
                            </div>
                        )}
                        <ConditionChecklist
                            initialState={checklist}
                            isEBike={isEBike}
                            darkMode={darkMode}
                            onChange={setChecklist}
                        />
                    </>
                )}

                {/* ===== STEP 2: ABSCHLUSS ===== */}
                {step === 2 && (
                    <>
                        <div>
                            <h2 className="text-lg font-bold mb-1">
                                {isReturn ? "Rücknahme abschließen" : "Übergabe abschließen"}
                            </h2>
                            <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                Zusammenfassung prüfen und {isReturn ? "Rücknahme" : "Übergabe"} bestätigen.
                            </p>
                        </div>

                        {/* Summary card */}
                        <div className={`rounded-2xl border p-4 space-y-3 ${card}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${darkMode ? "bg-slate-800" : "bg-slate-100"}`}>
                                    🚲
                                </div>
                                <div>
                                    <div className="font-bold">{bike?.name}</div>
                                    <div className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{bike?.category}</div>
                                </div>
                            </div>
                            <div className={`h-px ${darkMode ? "bg-slate-800" : "bg-slate-100"}`} />
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div>
                                    <div className="text-lg font-bold text-[#1A7D5A]">{capturedCount}</div>
                                    <div className={`text-[10px] ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Fotos</div>
                                </div>
                                <div>
                                    <div className={`text-lg font-bold ${
                                        checklist && Object.values(checklist).some(v => v === "defect") ? "text-red-500" : "text-emerald-500"
                                    }`}>
                                        {checklist ? Object.values(checklist).filter(v => v === "defect").length : 0}
                                    </div>
                                    <div className={`text-[10px] ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Defekte</div>
                                </div>
                                <div>
                                    <div className={`text-lg font-bold ${damageItems.length > 0 ? "text-orange-500" : "text-slate-400"}`}>
                                        {Object.values(annotations).flat().filter(a => a.label).length}
                                    </div>
                                    <div className={`text-[10px] ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Markierungen</div>
                                </div>
                            </div>
                        </div>

                        {/* Detected damages (return only) */}
                        {isReturn && damageItems.length > 0 && (
                            <div className={`rounded-2xl border p-4 ${darkMode ? "bg-red-900/10 border-red-800/40" : "bg-red-50 border-red-100"}`}>
                                <h3 className="font-bold text-red-600 dark:text-red-400 text-sm mb-3 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    {damageItems.length} neu erkannte Schäden
                                </h3>
                                <div className="space-y-2">
                                    {damageItems.map((dmg) => (
                                        <div key={dmg.id} className="flex items-start gap-3">
                                            <div className="flex-1">
                                                <p className={`text-sm font-medium ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
                                                    {dmg.description}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span className="text-xs text-slate-500">€</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="5"
                                                    placeholder="0"
                                                    value={dmg.estimated_cost || ""}
                                                    onChange={e => setDamageItems(prev =>
                                                        prev.map(d => d.id === dmg.id ? { ...d, estimated_cost: parseFloat(e.target.value) || 0 } : d)
                                                    )}
                                                    className={`w-20 px-2 py-1 rounded-lg border text-sm outline-none ${inputCls}`}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {damageItems.some(d => d.estimated_cost > 0) && (
                                    <div className={`mt-3 pt-3 border-t flex items-center justify-between ${darkMode ? "border-red-800/40" : "border-red-200"}`}>
                                        <span className="text-sm font-bold text-red-600 dark:text-red-400">Gesamtkosten</span>
                                        <span className="text-sm font-bold text-red-600 dark:text-red-400">
                                            {new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
                                                damageItems.reduce((s, d) => s + (d.estimated_cost || 0), 0)
                                            )}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Notes */}
                        <div className={`rounded-2xl border p-4 ${card}`}>
                            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                Abschließende Notizen
                            </label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder={`Sonstige Anmerkungen zur ${isReturn ? "Rücknahme" : "Übergabe"}…`}
                                rows={3}
                                className={`w-full px-3 py-2.5 rounded-xl border outline-none text-sm resize-none ${inputCls}`}
                            />
                        </div>

                        {/* Photo thumbnail strip */}
                        {capturedCount > 0 && (
                            <div>
                                <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                    Aufgenommene Fotos
                                </p>
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {POSITIONS.filter(p => photos[p.key]).map(pos => (
                                        <div key={pos.key} className="relative shrink-0">
                                            <img
                                                src={photos[pos.key]}
                                                alt={pos.label}
                                                className="w-16 h-16 rounded-xl object-cover"
                                            />
                                            <span className="absolute bottom-0 left-0 right-0 text-[9px] font-bold text-white bg-black/50 text-center rounded-b-xl py-0.5">
                                                {pos.label}
                                            </span>
                                            {(annotations[pos.key]?.length > 0) && (
                                                <span className="absolute top-1 right-1 bg-red-500 text-white text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                                                    {annotations[pos.key].length}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Sticky bottom nav */}
            <div className={`fixed bottom-0 left-0 right-0 border-t px-4 py-4 ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"} shadow-2xl`}>
                <div className="max-w-2xl mx-auto flex gap-3">
                    {step > 0 && (
                        <button
                            onClick={() => setStep(s => s - 1)}
                            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold border transition-colors ${darkMode ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Zurück
                        </button>
                    )}
                    <button
                        onClick={() => {
                            if (step === 0) setStep(1);
                            else if (step === 1) handleToSummary();
                            else handleComplete();
                        }}
                        disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#1A7D5A] to-[#3BAA82] text-white text-sm font-bold rounded-xl shadow-lg shadow-[#1A7D5A]/25 transition-all active:scale-95 disabled:opacity-60"
                    >
                        {saving ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeLinecap="round" />
                                </svg>
                                Wird gespeichert…
                            </span>
                        ) : step === 2 ? (
                            <>
                                <CheckCircle className="w-4 h-4" />
                                {isReturn ? "Rücknahme abschließen" : "Übergabe abschließen"}
                            </>
                        ) : (
                            <>
                                Weiter
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
