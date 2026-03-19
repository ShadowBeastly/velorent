"use client";
import { useState, useCallback } from "react";
import {
    Plus, Trash2, X, Check, BedDouble, Loader2, AlertCircle,
    QrCode, Download, ToggleLeft, ToggleRight, Layers,
} from "lucide-react";
import QRCode from "qrcode";
import { useLocivaHotel } from "@/app/hotel/layout";
import { useApp } from "@/src/context/AppContext";
import { useHotelRooms } from "@/src/hooks/useHotelRooms";

// ─── Brand palette ───────────────────────────────────────────────────────────
const C = {
    primary: "#1A7D5A",
    light:   "#3BAA82",
    tint:    "#D4EDE2",
};

// ─── QR helpers ───────────────────────────────────────────────────────────────
async function generateQrDataUrl(url) {
    return QRCode.toDataURL(url, {
        width: 400,
        margin: 2,
        color: { dark: "#1E2D26", light: "#FFFFFF" },
    });
}

function getRoomUrl(slug, roomNumber) {
    const base = typeof window !== "undefined" ? window.location.origin : "https://lociva.de";
    return `${base}/hotel/${slug}?room=${encodeURIComponent(roomNumber)}`;
}

// ─── Single room form ─────────────────────────────────────────────────────────
function SingleRoomForm({ onSave, onCancel, darkMode, saving }) {
    const [roomNumber, setRoomNumber] = useState("");
    const [floor, setFloor]           = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ room_number: roomNumber.trim(), floor: floor.trim() || null, is_active: true });
    };

    const inputCls = `w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1A7D5A]/30 focus:border-[#1A7D5A] ${
        darkMode
            ? "bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
            : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
    }`;
    const labelCls = `block text-xs font-semibold uppercase tracking-wider mb-1.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`;

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className={labelCls}>Zimmernummer *</label>
                    <input required className={inputCls} value={roomNumber}
                        onChange={e => setRoomNumber(e.target.value)}
                        placeholder="z. B. 101" />
                </div>
                <div>
                    <label className={labelCls}>Etage</label>
                    <input className={inputCls} value={floor}
                        onChange={e => setFloor(e.target.value)}
                        placeholder="z. B. 1. OG" />
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button type="submit" disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-semibold transition-opacity disabled:opacity-60"
                    style={{ background: C.primary }}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Hinzufügen
                </button>
                <button type="button" onClick={onCancel}
                    className={`px-5 py-2 rounded-xl text-sm font-medium ${
                        darkMode ? "bg-slate-700 hover:bg-slate-600 text-slate-200" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    }`}>
                    Abbrechen
                </button>
            </div>
        </form>
    );
}

// ─── Bulk add form ────────────────────────────────────────────────────────────
function BulkRoomForm({ onSave, onCancel, darkMode, saving }) {
    const [range, setRange]   = useState("");  // e.g. "101-120"
    const [floor, setFloor]   = useState("");
    const [error, setError]   = useState(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        setError(null);

        const match = range.trim().match(/^(\d+)-(\d+)$/);
        if (!match) { setError("Bitte im Format '101-120' eingeben."); return; }

        const from = parseInt(match[1]);
        const to   = parseInt(match[2]);
        if (from >= to)        { setError("Startnummer muss kleiner als Endnummer sein."); return; }
        if (to - from > 99)    { setError("Maximal 100 Zimmer auf einmal möglich."); return; }

        const rooms = [];
        for (let i = from; i <= to; i++) {
            rooms.push({ room_number: String(i), floor: floor.trim() || null, is_active: true });
        }
        onSave(rooms);
    };

    const inputCls = `w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1A7D5A]/30 focus:border-[#1A7D5A] ${
        darkMode
            ? "bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
            : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
    }`;
    const labelCls = `block text-xs font-semibold uppercase tracking-wider mb-1.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`;

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className={labelCls}>Nummernbereich *</label>
                    <input required className={inputCls} value={range}
                        onChange={e => setRange(e.target.value)}
                        placeholder="z. B. 101-120" />
                    <p className={`text-xs mt-1 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Format: Von-Bis, z. B. 101-120</p>
                </div>
                <div>
                    <label className={labelCls}>Etage (für alle)</label>
                    <input className={inputCls} value={floor}
                        onChange={e => setFloor(e.target.value)}
                        placeholder="z. B. 1. OG" />
                </div>
            </div>
            {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
            )}
            <div className="flex items-center gap-3">
                <button type="submit" disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-semibold transition-opacity disabled:opacity-60"
                    style={{ background: C.primary }}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
                    Bulk hinzufügen
                </button>
                <button type="button" onClick={onCancel}
                    className={`px-5 py-2 rounded-xl text-sm font-medium ${
                        darkMode ? "bg-slate-700 hover:bg-slate-600 text-slate-200" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    }`}>
                    Abbrechen
                </button>
            </div>
        </form>
    );
}

// ─── Room row ─────────────────────────────────────────────────────────────────
function RoomRow({ room, hotelSlug, onDelete, onToggle, darkMode, deleting }) {
    const [qrDataUrl, setQrDataUrl] = useState(null);
    const [qrLoading, setQrLoading] = useState(false);

    const handleGenerateQr = useCallback(async () => {
        setQrLoading(true);
        try {
            const url = getRoomUrl(hotelSlug, room.room_number);
            const dataUrl = await generateQrDataUrl(url);
            setQrDataUrl(dataUrl);
        } catch (err) {
            console.error("QR generation failed:", err);
        } finally {
            setQrLoading(false);
        }
    }, [hotelSlug, room.room_number]);

    const handleDownload = () => {
        if (!qrDataUrl) return;
        const a = document.createElement("a");
        a.href = qrDataUrl;
        a.download = `qr-zimmer-${room.room_number}.png`;
        a.click();
    };

    return (
        <tr className={`border-b last:border-0 transition-colors ${
            darkMode ? "border-slate-700 hover:bg-slate-700/30" : "border-slate-100 hover:bg-slate-50"
        }`}>
            <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{room.room_number}</td>
            <td className={`px-4 py-3 text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                {room.floor || "—"}
            </td>
            <td className="px-4 py-3">
                {qrDataUrl ? (
                    <div className="flex items-center gap-2">
                        {/* QR data URL — base64, no Next Image needed */}
                        <img src={qrDataUrl} alt={`QR Zimmer ${room.room_number}`}
                            className="w-10 h-10 rounded border border-slate-200 dark:border-slate-700" />
                        <button onClick={handleDownload}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                            style={{ color: C.primary, background: C.tint }}>
                            <Download className="w-3.5 h-3.5" /> Herunterladen
                        </button>
                    </div>
                ) : (
                    <button onClick={handleGenerateQr} disabled={qrLoading}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                            darkMode ? "bg-slate-700 hover:bg-slate-600 text-slate-300" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                        }`}>
                        {qrLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <QrCode className="w-3.5 h-3.5" />}
                        QR generieren
                    </button>
                )}
            </td>
            <td className="px-4 py-3">
                <button onClick={() => onToggle(room)} title={room.is_active ? "Deaktivieren" : "Aktivieren"}>
                    {room.is_active
                        ? <ToggleRight className="w-6 h-6" style={{ color: C.primary }} />
                        : <ToggleLeft className={`w-6 h-6 ${darkMode ? "text-slate-600" : "text-slate-300"}`} />}
                </button>
            </td>
            <td className="px-4 py-3">
                <button onClick={() => onDelete(room.id)} disabled={deleting === room.id}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50">
                    {deleting === room.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
            </td>
        </tr>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function LocivaRoomsPage() {
    const { hotel, hotelId } = useLocivaHotel();
    const { darkMode } = useApp();
    const { rooms, loading, create, update, remove } = useHotelRooms(hotelId);

    const [mode, setMode]           = useState(null); // null | "single" | "bulk"
    const [saving, setSaving]       = useState(false);
    const [deleting, setDeleting]   = useState(null);
    const [saveError, setSaveError] = useState(null);

    const card = darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
    const th   = `px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? "text-slate-500" : "text-slate-400"}`;

    const handleCreateSingle = async (payload) => {
        setSaving(true);
        setSaveError(null);
        const { error } = await create(payload);
        setSaving(false);
        if (error) { setSaveError(error.message); return; }
        setMode(null);
    };

    const handleCreateBulk = async (roomList) => {
        setSaving(true);
        setSaveError(null);
        let lastError = null;
        for (const room of roomList) {
            const { error } = await create(room);
            if (error) { lastError = error; }
        }
        setSaving(false);
        if (lastError) { setSaveError(lastError.message); return; }
        setMode(null);
    };

    const handleDelete = async (id) => {
        if (!confirm("Zimmer wirklich löschen?")) return;
        setDeleting(id);
        await remove(id);
        setDeleting(null);
    };

    const handleToggle = (room) => update(room.id, { is_active: !room.is_active });

    // Group rooms by floor for display
    const byFloor = rooms.reduce((acc, r) => {
        const key = r.floor || "Keine Etage";
        if (!acc[key]) acc[key] = [];
        acc[key].push(r);
        return acc;
    }, {});

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Zimmer & QR-Codes</h1>
                    <p className={`text-sm mt-0.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                        Verwalten Sie Ihre Zimmer und generieren Sie QR-Codes für jeden Raum.
                    </p>
                </div>
                {!mode && (
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setMode("bulk"); setSaveError(null); }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                                darkMode ? "bg-slate-700 hover:bg-slate-600 text-slate-200" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            }`}>
                            <Layers className="w-4 h-4" /> Bulk hinzufügen
                        </button>
                        <button onClick={() => { setMode("single"); setSaveError(null); }}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-md"
                            style={{ background: C.primary }}>
                            <Plus className="w-4 h-4" /> Zimmer hinzufügen
                        </button>
                    </div>
                )}
            </div>

            {/* Form: single */}
            {mode === "single" && (
                <div className={`rounded-2xl border p-6 ${card}`}>
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Zimmer hinzufügen</h2>
                        <button onClick={() => { setMode(null); setSaveError(null); }}
                            className={`p-1.5 rounded-lg transition-colors ${darkMode ? "hover:bg-slate-700" : "hover:bg-slate-100"}`}>
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    {saveError && (
                        <div className="flex items-center gap-2 mb-4 text-sm text-red-600 dark:text-red-400">
                            <AlertCircle className="w-4 h-4 shrink-0" /> {saveError}
                        </div>
                    )}
                    <SingleRoomForm
                        onSave={handleCreateSingle}
                        onCancel={() => { setMode(null); setSaveError(null); }}
                        darkMode={darkMode}
                        saving={saving}
                    />
                </div>
            )}

            {/* Form: bulk */}
            {mode === "bulk" && (
                <div className={`rounded-2xl border p-6 ${card}`}>
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Mehrere Zimmer hinzufügen</h2>
                        <button onClick={() => { setMode(null); setSaveError(null); }}
                            className={`p-1.5 rounded-lg transition-colors ${darkMode ? "hover:bg-slate-700" : "hover:bg-slate-100"}`}>
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    {saveError && (
                        <div className="flex items-center gap-2 mb-4 text-sm text-red-600 dark:text-red-400">
                            <AlertCircle className="w-4 h-4 shrink-0" /> {saveError}
                        </div>
                    )}
                    <BulkRoomForm
                        onSave={handleCreateBulk}
                        onCancel={() => { setMode(null); setSaveError(null); }}
                        darkMode={darkMode}
                        saving={saving}
                    />
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center h-40">
                    <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
                        style={{ borderColor: C.light, borderTopColor: "transparent" }} />
                </div>
            )}

            {/* Empty state */}
            {!loading && rooms.length === 0 && !mode && (
                <div className={`rounded-2xl border p-12 text-center ${card}`}>
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                        style={{ background: C.tint }}>
                        <BedDouble className="w-7 h-7" style={{ color: C.primary }} />
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Noch keine Zimmer angelegt</h3>
                    <p className={`text-sm mb-5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                        Fügen Sie Ihre Zimmer hinzu und generieren Sie QR-Codes, die Gäste direkt zur Buchungsseite führen.
                    </p>
                    <div className="flex items-center justify-center gap-3 flex-wrap">
                        <button onClick={() => setMode("bulk")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${
                                darkMode ? "bg-slate-700 text-slate-200" : "bg-slate-100 text-slate-700"
                            }`}>
                            <Layers className="w-4 h-4" /> Bulk hinzufügen
                        </button>
                        <button onClick={() => setMode("single")}
                            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-semibold"
                            style={{ background: C.primary }}>
                            <Plus className="w-4 h-4" /> Erstes Zimmer anlegen
                        </button>
                    </div>
                </div>
            )}

            {/* Rooms table grouped by floor */}
            {!loading && rooms.length > 0 && (
                <div className="space-y-6">
                    {Object.entries(byFloor).map(([floor, floorRooms]) => (
                        <div key={floor} className={`rounded-2xl border overflow-hidden ${card}`}>
                            <div className={`px-5 py-3 border-b ${darkMode ? "border-slate-700 bg-slate-900/40" : "border-slate-100 bg-slate-50"} flex items-center justify-between`}>
                                <h3 className={`text-sm font-semibold ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                                    {floor}
                                </h3>
                                <span className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                    {floorRooms.length} {floorRooms.length === 1 ? "Zimmer" : "Zimmer"}
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className={`border-b ${darkMode ? "border-slate-700" : "border-slate-100"}`}>
                                        <tr>
                                            <th className={th}>Zimmer</th>
                                            <th className={th}>Etage</th>
                                            <th className={th}>QR-Code</th>
                                            <th className={th}>Aktiv</th>
                                            <th className={th}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {floorRooms.map(room => (
                                            <RoomRow
                                                key={room.id}
                                                room={room}
                                                hotelSlug={hotel?.slug ?? ""}
                                                onDelete={handleDelete}
                                                onToggle={handleToggle}
                                                darkMode={darkMode}
                                                deleting={deleting}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
