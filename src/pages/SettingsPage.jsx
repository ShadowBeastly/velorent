import React, { useState } from "react";
import { Building, Loader2, Check, Key, Copy, CreditCard } from "lucide-react";
import { supabase } from "../utils/supabase";

export default function SettingsPage({ org, auth, darkMode }) {
    const [form, setForm] = useState(org.currentOrg || {});
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        await supabase.from("organizations").update({
            name: form.name,
            address: form.address,
            city: form.city,
            postal_code: form.postal_code,
            phone: form.phone,
            email: form.email,
            tax_id: form.tax_id
        }).eq("id", org.currentOrg.id);
        org.reload();
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const cardStyle = darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
    const inputStyle = `w-full px-3 py-2 rounded-lg border outline-none ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"}`;

    return (
        <div className="max-w-3xl space-y-6">
            {/* Company Settings */}
            <div className={`rounded-2xl border p-6 ${cardStyle}`}>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                        <Building className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">Firmendaten</h3>
                        <p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Diese Daten erscheinen auf Verträgen & Rechnungen</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Firmenname</label>
                        <input type="text" value={form.name || ""} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className={inputStyle} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Adresse</label>
                            <input type="text" value={form.address || ""} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} className={inputStyle} />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Stadt</label>
                            <input type="text" value={form.city || ""} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} className={inputStyle} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Telefon</label>
                            <input type="tel" value={form.phone || ""} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} className={inputStyle} />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>E-Mail</label>
                            <input type="email" value={form.email || ""} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} className={inputStyle} />
                        </div>
                    </div>
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>USt-IdNr.</label>
                        <input type="text" value={form.tax_id || ""} onChange={(e) => setForm(f => ({ ...f, tax_id: e.target.value }))} className={inputStyle} />
                    </div>
                </div>

                <div className="flex items-center gap-3 mt-6">
                    <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-medium shadow-lg shadow-orange-500/25 flex items-center gap-2">
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        Speichern
                    </button>
                    {saved && <span className="text-emerald-500 flex items-center gap-1"><Check className="w-4 h-4" /> Gespeichert!</span>}
                </div>
            </div>

            {/* API Key Info */}
            <div className={`rounded-2xl border p-6 ${cardStyle}`}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                        <Key className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">API & Integrationen</h3>
                        <p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Für externe Buchungssysteme</p>
                    </div>
                </div>
                <div className={`p-4 rounded-lg ${darkMode ? "bg-slate-800" : "bg-slate-100"}`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium">Organisation ID</p>
                            <p className={`text-xs font-mono ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{org.currentOrg?.id}</p>
                        </div>
                        <button
                            onClick={() => navigator.clipboard.writeText(org.currentOrg?.id || "")}
                            className={`p-2 rounded-lg ${darkMode ? "hover:bg-slate-700" : "hover:bg-slate-200"}`}
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <p className={`text-xs mt-3 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                    Nutze diese ID für API-Integrationen mit Booking.com, deiner Website oder anderen Systemen.
                </p>
            </div>

            {/* Subscription Info */}
            <div className={`rounded-2xl border p-6 ${cardStyle}`}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">Abo & Abrechnung</h3>
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium capitalize">{org.currentOrg?.subscription_tier || "Free"} Plan</p>
                        <p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                            Status: {org.currentOrg?.subscription_status === "active" ? "Aktiv" : "Inaktiv"}
                        </p>
                    </div>
                    <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-medium">
                        Upgrade
                    </button>
                </div>
            </div>
        </div>
    );
}
