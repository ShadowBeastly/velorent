"use client";
import { useState } from "react";
import { Code2, Plus, Trash2, Copy, Check, EyeOff, Loader2, X, Shield } from "lucide-react";
import { useApiKeys } from "../../hooks/useApiKeys";
import { useToast } from "../ui/Toast";

const ALL_PERMISSIONS = [
    { key: "bikes:read", label: "Bikes lesen" },
    { key: "bikes:write", label: "Bikes schreiben" },
    { key: "bookings:read", label: "Buchungen lesen" },
    { key: "bookings:write", label: "Buchungen schreiben" },
    { key: "customers:read", label: "Kunden lesen" },
    { key: "customers:write", label: "Kunden schreiben" },
];

function fmtDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function ApiSettings({ orgId, darkMode }) {
    const { apiKeys, loading, createApiKey, revokeApiKey, deleteApiKey } = useApiKeys(orgId);
    const { addToast } = useToast();

    const [showModal, setShowModal] = useState(false);
    const [newKeyName, setNewKeyName] = useState("");
    const [newKeyPerms, setNewKeyPerms] = useState(["bikes:read", "bookings:read", "customers:read"]);
    const [creating, setCreating] = useState(false);
    const [revealedKey, setRevealedKey] = useState(null); // { id, rawKey }
    const [copiedId, setCopiedId] = useState(null);

    const card = darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
    const inputCls = `w-full px-3 py-2 rounded-lg border outline-none text-sm ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"}`;
    const mutedText = darkMode ? "text-slate-500" : "text-slate-400";
    const labelText = `text-sm font-medium ${darkMode ? "text-slate-300" : "text-slate-700"}`;

    const togglePerm = (perm) => {
        setNewKeyPerms(prev =>
            prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
        );
    };

    const handleCreate = async () => {
        if (!newKeyName.trim()) { addToast("Bitte einen Namen eingeben.", "error"); return; }
        if (newKeyPerms.length === 0) { addToast("Mindestens eine Berechtigung auswählen.", "error"); return; }
        setCreating(true);
        const { data, rawKey, error } = await createApiKey({ name: newKeyName.trim(), permissions: newKeyPerms });
        setCreating(false);
        if (error) { addToast(`Fehler: ${error.message}`, "error"); return; }
        setRevealedKey({ id: data.id, rawKey });
        setShowModal(false);
        setNewKeyName("");
        setNewKeyPerms(["bikes:read", "bookings:read", "customers:read"]);
    };

    const copyKey = async (text, id) => {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleRevoke = async (id) => {
        const { error } = await revokeApiKey(id);
        if (error) addToast(`Fehler: ${error.message}`, "error");
        else addToast("API Key deaktiviert.", "info");
    };

    const handleDelete = async (id) => {
        const { error } = await deleteApiKey(id);
        if (error) addToast(`Fehler: ${error.message}`, "error");
        else {
            addToast("API Key gelöscht.", "info");
            if (revealedKey?.id === id) setRevealedKey(null);
        }
    };

    return (
        <div className={`rounded-2xl border p-6 ${card}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                        <Code2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">REST API</h3>
                        <p className={`text-sm ${mutedText}`}>Verbinde externe Tools via <code className="font-mono text-xs">Bearer</code>-Token unter <code className="font-mono text-xs">/api/v1/</code></p>
                    </div>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-medium rounded-lg shadow-lg shadow-indigo-500/25 hover:opacity-90 transition-opacity"
                >
                    <Plus className="w-4 h-4" />
                    Neuen Key erstellen
                </button>
            </div>

            {/* One-time reveal banner */}
            {revealedKey && (
                <div className={`mb-4 rounded-xl border p-4 ${darkMode ? "bg-emerald-900/20 border-emerald-700" : "bg-emerald-50 border-emerald-200"}`}>
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold mb-1 ${darkMode ? "text-emerald-300" : "text-emerald-800"}`}>
                                API Key erstellt — nur einmal sichtbar!
                            </p>
                            <p className={`text-xs mb-2 ${darkMode ? "text-emerald-400" : "text-emerald-700"}`}>
                                Kopiere diesen Key jetzt. Er wird danach nicht mehr angezeigt.
                            </p>
                            <div className="flex items-center gap-2">
                                <code className={`text-xs font-mono px-3 py-1.5 rounded-lg flex-1 break-all ${darkMode ? "bg-slate-800 text-emerald-300" : "bg-white text-slate-800 border border-emerald-200"}`}>
                                    {revealedKey.rawKey}
                                </code>
                                <button
                                    onClick={() => copyKey(revealedKey.rawKey, "reveal")}
                                    className={`p-2 rounded-lg shrink-0 ${darkMode ? "bg-slate-700 hover:bg-slate-600" : "bg-white border border-slate-200 hover:bg-slate-50"}`}
                                >
                                    {copiedId === "reveal" ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <button onClick={() => setRevealedKey(null)} className={`p-1 rounded ${darkMode ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600"}`}>
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Key table */}
            {loading ? (
                <div className="flex items-center gap-2 py-8 justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                    <span className={`text-sm ${mutedText}`}>Lade API Keys…</span>
                </div>
            ) : apiKeys.length === 0 ? (
                <div className={`text-center py-10 rounded-xl border-2 border-dashed ${darkMode ? "border-slate-700 text-slate-500" : "border-slate-200 text-slate-400"}`}>
                    <Code2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Noch keine API Keys. Erstelle deinen ersten Key.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className={`text-xs uppercase tracking-wide border-b ${darkMode ? "text-slate-500 border-slate-700" : "text-slate-400 border-slate-200"}`}>
                                <th className="pb-3 text-left font-medium">Name</th>
                                <th className="pb-3 text-left font-medium">Prefix</th>
                                <th className="pb-3 text-left font-medium hidden sm:table-cell">Berechtigungen</th>
                                <th className="pb-3 text-left font-medium hidden md:table-cell">Erstellt</th>
                                <th className="pb-3 text-left font-medium hidden md:table-cell">Letzter Zugriff</th>
                                <th className="pb-3 text-left font-medium">Status</th>
                                <th className="pb-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {apiKeys.map((key) => (
                                <tr key={key.id} className={`${darkMode ? "divide-slate-800" : ""}`}>
                                    <td className="py-3 pr-4 font-medium">{key.name}</td>
                                    <td className="py-3 pr-4">
                                        <code className={`text-xs font-mono px-2 py-1 rounded ${darkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"}`}>
                                            {key.key_prefix}…
                                        </code>
                                    </td>
                                    <td className="py-3 pr-4 hidden sm:table-cell">
                                        <div className="flex flex-wrap gap-1">
                                            {(key.permissions ?? []).map(p => (
                                                <span key={p} className={`text-xs px-1.5 py-0.5 rounded ${darkMode ? "bg-indigo-900/40 text-indigo-300" : "bg-indigo-50 text-indigo-700"}`}>
                                                    {p}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className={`py-3 pr-4 hidden md:table-cell ${mutedText}`}>{fmtDate(key.created_at)}</td>
                                    <td className={`py-3 pr-4 hidden md:table-cell ${mutedText}`}>{fmtDate(key.last_used_at)}</td>
                                    <td className="py-3 pr-4">
                                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                                            key.is_active
                                                ? darkMode ? "bg-emerald-900/40 text-emerald-400" : "bg-emerald-50 text-emerald-700"
                                                : darkMode ? "bg-slate-800 text-slate-500" : "bg-slate-100 text-slate-500"
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${key.is_active ? "bg-emerald-500" : "bg-slate-400"}`} />
                                            {key.is_active ? "Aktiv" : "Inaktiv"}
                                        </span>
                                    </td>
                                    <td className="py-3">
                                        <div className="flex items-center gap-1 justify-end">
                                            {key.is_active && (
                                                <button
                                                    onClick={() => handleRevoke(key.id)}
                                                    title="Deaktivieren"
                                                    className={`p-1.5 rounded-lg text-xs transition-colors ${darkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-100 text-slate-500"}`}
                                                >
                                                    <EyeOff className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDelete(key.id)}
                                                title="Löschen"
                                                className={`p-1.5 rounded-lg transition-colors ${darkMode ? "hover:bg-red-900/30 text-slate-400 hover:text-red-400" : "hover:bg-red-50 text-slate-400 hover:text-red-500"}`}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Endpoint reference */}
            <div className={`mt-6 rounded-xl p-4 text-xs font-mono space-y-1 ${darkMode ? "bg-slate-800 text-slate-400" : "bg-slate-50 text-slate-600 border border-slate-200"}`}>
                <p className={`font-sans font-medium text-sm mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Verfügbare Endpunkte</p>
                {[
                    "GET  /api/v1/bikes",
                    "POST /api/v1/bikes",
                    "GET  /api/v1/bikes/[id]",
                    "GET  /api/v1/bikes/[id]/availability?start=&end=",
                    "GET  /api/v1/bookings",
                    "POST /api/v1/bookings",
                    "POST /api/v1/bookings/[id]/cancel",
                    "GET  /api/v1/customers",
                    "POST /api/v1/customers",
                    "POST /api/v1/pricing/calculate",
                ].map(ep => (
                    <p key={ep} className="leading-relaxed">{ep}</p>
                ))}
            </div>

            {/* Create Key Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <div className={`relative w-full max-w-md rounded-2xl border p-6 shadow-2xl ${darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}>
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                                    <Shield className="w-4 h-4 text-white" />
                                </div>
                                <h3 className="font-semibold text-lg">Neuen API Key erstellen</h3>
                            </div>
                            <button onClick={() => setShowModal(false)} className={`p-1.5 rounded-lg ${darkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"}`}>
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className={labelText}>Name</label>
                                <input
                                    type="text"
                                    value={newKeyName}
                                    onChange={e => setNewKeyName(e.target.value)}
                                    placeholder="z.B. Shopify Integration"
                                    className={`mt-2 ${inputCls}`}
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className={labelText}>Berechtigungen</label>
                                <p className={`text-xs mt-0.5 mb-3 ${mutedText}`}>Wähle nur die notwendigen Rechte (Principle of Least Privilege).</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {ALL_PERMISSIONS.map(({ key, label }) => (
                                        <button
                                            key={key}
                                            onClick={() => togglePerm(key)}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                                                newKeyPerms.includes(key)
                                                    ? darkMode ? "border-indigo-500 bg-indigo-900/30 text-indigo-300" : "border-indigo-500 bg-indigo-50 text-indigo-700"
                                                    : darkMode ? "border-slate-700 text-slate-400 hover:bg-slate-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                            }`}
                                        >
                                            <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                                                newKeyPerms.includes(key)
                                                    ? "bg-indigo-500 border-indigo-500"
                                                    : darkMode ? "border-slate-600" : "border-slate-300"
                                            }`}>
                                                {newKeyPerms.includes(key) && <Check className="w-2.5 h-2.5 text-white" />}
                                            </span>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowModal(false)}
                                className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${darkMode ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                            >
                                Abbrechen
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={creating}
                                className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-medium shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
                            >
                                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                                Key erstellen
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
