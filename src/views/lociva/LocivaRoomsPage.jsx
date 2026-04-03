"use client";
import { useState, useCallback } from "react";
import { BedDouble, Loader2, QrCode, Download } from "lucide-react";
import QRCode from "qrcode";
import { useLocivaHotel } from "@/src/context/LocivaHotelContext";
import { useApp } from "@/src/context/AppContext";
import { useHotelRooms } from "@/src/hooks/useHotelRooms";

const C = {
    primary: "#1A7D5A",
    light: "#3BAA82",
    tint: "#D4EDE2",
};

async function generateQrDataUrl(url) {
    return QRCode.toDataURL(url, {
        width: 400,
        margin: 2,
        color: { dark: "#1E2D26", light: "#FFFFFF" },
    });
}

function getRoomUrl(slug) {
    const base = typeof window !== "undefined" ? window.location.origin : "https://lociva.de";
    return `${base}/hotel/${slug}`;
}

function RoomRow({ room, hotelSlug, darkMode }) {
    const [qrDataUrl, setQrDataUrl] = useState(null);
    const [qrLoading, setQrLoading] = useState(false);

    const handleGenerateQr = useCallback(async () => {
        setQrLoading(true);
        try {
            const url = getRoomUrl(hotelSlug);
            const dataUrl = await generateQrDataUrl(url);
            setQrDataUrl(dataUrl);
        } catch (err) {
            console.error("QR generation failed:", err);
        } finally {
            setQrLoading(false);
        }
    }, [hotelSlug]);

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
                {room.floor || "Keine Angabe"}
            </td>
            <td className="px-4 py-3">
                {qrDataUrl ? (
                    <div className="flex items-center gap-2">
                        <img
                            src={qrDataUrl}
                            alt={`QR Zimmer ${room.room_number}`}
                            className="w-10 h-10 rounded border border-slate-200 dark:border-slate-700"
                        />
                        <button
                            onClick={handleDownload}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                            style={{ color: C.primary, background: C.tint }}
                        >
                            <Download className="w-3.5 h-3.5" /> Herunterladen
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={handleGenerateQr}
                        disabled={qrLoading}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                            darkMode ? "bg-slate-700 hover:bg-slate-600 text-slate-300" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                        }`}
                    >
                        {qrLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <QrCode className="w-3.5 h-3.5" />}
                        QR generieren
                    </button>
                )}
            </td>
            <td className="px-4 py-3">
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                    room.is_active
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                }`}>
                    {room.is_active ? "Aktiv" : "Inaktiv"}
                </span>
            </td>
        </tr>
    );
}

export default function LocivaRoomsPage() {
    const { hotel, hotelId } = useLocivaHotel();
    const { darkMode } = useApp();
    const { rooms, loading } = useHotelRooms(hotelId);

    const isSelfManaged = !!hotel?.is_self_managed;
    const zimmer = isSelfManaged ? "Bereich/Stellplatz" : "Zimmer";
    const zimmerPlural = isSelfManaged ? "Bereiche/Stellplätze" : "Zimmer";

    const card = darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
    const th = `px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? "text-slate-500" : "text-slate-400"}`;

    const byFloor = rooms.reduce((acc, room) => {
        const key = room.floor || "Keine Etage";
        if (!acc[key]) acc[key] = [];
        acc[key].push(room);
        return acc;
    }, {});

    return (
        <div className="space-y-8 pb-10">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{zimmerPlural} & QR-Codes</h1>
                    <p className={`text-sm mt-0.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                        QR-Codes bleiben verfügbar. Die Stammdaten werden zentral von Lociva verwaltet.
                    </p>
                </div>
                <div className={`px-4 py-2 rounded-xl text-sm font-medium ${darkMode ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                    Read-only
                </div>
            </div>

            {loading && (
                <div className="flex items-center justify-center h-40">
                    <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: C.light, borderTopColor: "transparent" }} />
                </div>
            )}

            {!loading && rooms.length === 0 && (
                <div className={`rounded-2xl border p-12 text-center ${card}`}>
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: C.tint }}>
                        <BedDouble className="w-7 h-7" style={{ color: C.primary }} />
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Noch keine {zimmerPlural.toLowerCase()} angelegt</h3>
                    <p className={`text-sm mb-5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                        Sobald Lociva Bereiche angelegt hat, können Sie hier die QR-Codes herunterladen.
                    </p>
                </div>
            )}

            {!loading && rooms.length > 0 && (
                <div className="space-y-6">
                    {Object.entries(byFloor).map(([floor, floorRooms]) => (
                        <div key={floor} className={`rounded-2xl border overflow-hidden ${card}`}>
                            <div className={`px-5 py-3 border-b ${darkMode ? "border-slate-700 bg-slate-900/40" : "border-slate-100 bg-slate-50"} flex items-center justify-between`}>
                                <h3 className={`text-sm font-semibold ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{floor}</h3>
                                <span className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                    {floorRooms.length} {floorRooms.length === 1 ? zimmer : zimmerPlural}
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className={`border-b ${darkMode ? "border-slate-700" : "border-slate-100"}`}>
                                        <tr>
                                            <th className={th}>{zimmer}</th>
                                            <th className={th}>Etage</th>
                                            <th className={th}>QR-Code</th>
                                            <th className={th}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {floorRooms.map((room) => (
                                            <RoomRow
                                                key={room.id}
                                                room={room}
                                                hotelSlug={hotel?.slug ?? ""}
                                                darkMode={darkMode}
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
