"use client";
import { useState, useEffect } from "react";
import { Building, Loader2, Check, Key, Copy, CreditCard, Palette } from "lucide-react";
import { supabase } from "../utils/supabase";
import { useApp } from "../context/AppContext";
import { useOrganization } from "../context/OrgContext";
import WidgetSettings from "./WidgetSettings";

export default function SettingsPage() {
    const { darkMode } = useApp();
    const org = useOrganization();
    const [form, setForm] = useState(org.currentOrg || {});
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (org.currentOrg) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setForm(org.currentOrg);
        }
    }, [org.currentOrg]);

    const handleSave = async () => {
        setSaving(true);
        await supabase.from("organizations").update({
            name: form.name,
            address: form.address,
            city: form.city,
            postal_code: form.postal_code,
            phone: form.phone,
            email: form.email,
            tax_id: form.tax_id,
            iban: form.iban,
            bic: form.bic,
            logo_url: form.logo_url,
            settings: form.settings
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
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>IBAN</label>
                            <input type="text" placeholder="DE00 0000 0000 0000 0000 00" value={form.iban || ""} onChange={(e) => setForm(f => ({ ...f, iban: e.target.value }))} className={inputStyle} />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>BIC</label>
                            <input type="text" placeholder="XXXXDEXX" value={form.bic || ""} onChange={(e) => setForm(f => ({ ...f, bic: e.target.value }))} className={inputStyle} />
                        </div>
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

            {/* Branding Settings */}
            <div className={`rounded-2xl border p-6 ${cardStyle}`}>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                        <Palette className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">Design & Branding (White-Label)</h3>
                        <p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Passe das Aussehen an dein Unternehmen an.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Logo URL</label>
                        <div className="flex gap-4">
                            <input
                                type="text"
                                placeholder="https://example.com/logo.png"
                                value={form.logo_url || ""}
                                onChange={(e) => setForm(f => ({ ...f, logo_url: e.target.value }))}
                                className={inputStyle}
                            />
                            {form.logo_url && (
                                <div className="w-12 h-12 rounded-lg border border-slate-200 bg-white flex items-center justify-center p-1 shrink-0">
                                    <img src={form.logo_url} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                                </div>
                            )}
                        </div>
                        <p className={`text-xs mt-1 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                            Rechteckiges Format (z.B. 200x50px) empfohlen.
                        </p>
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Primärfarbe</label>
                        <div className="flex gap-4 items-center">
                            <input
                                type="color"
                                value={form.settings?.primary_color || "#f97316"}
                                onChange={(e) => setForm(f => ({
                                    ...f,
                                    settings: { ...f.settings, primary_color: e.target.value }
                                }))}
                                className="h-10 w-20 rounded cursor-pointer border-0 p-0"
                            />
                            <div className={`text-sm px-3 py-1 rounded bg-slate-100 dark:bg-slate-800 font-mono`}>
                                {form.settings?.primary_color || "#f97316"}
                            </div>
                        </div>
                    </div>
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
                    <button onClick={() => alert("Funktion kommt bald! Wir arbeiten noch an den Zahlungsanbindungen.")} className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-medium">
                        Upgrade
                    </button>
                </div>
            </div>

            {/* Widget Settings */}
            <WidgetSettings supabase={supabase} orgId={org.currentOrg?.id} darkMode={darkMode} />
        </div>
    );
}
