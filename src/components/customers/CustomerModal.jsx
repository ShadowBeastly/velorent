"use client";
import { useState } from "react";
import { Loader2, X } from "lucide-react";

export default function CustomerModal({ customer, onSave, onDelete, onClose, darkMode }) {
    const [form, setForm] = useState(() => customer || {
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        postal_code: "",
        id_number: "",
        notes: ""
    });
    const [saving, setSaving] = useState(false);

    const modalBg = darkMode ? "bg-slate-900" : "bg-white";
    const inputStyle = `w-full px-3 py-2 rounded-lg border outline-none ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"}`;

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(form);
        } catch {
            // Error handled in parent
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className={`w-full max-w-lg rounded-2xl ${modalBg} shadow-2xl`}>
                <div className={`flex items-center justify-between p-4 border-b ${darkMode ? "border-slate-800" : "border-slate-200"}`}>
                    <h3 className="text-lg font-semibold">{customer ? "Kunde bearbeiten" : "Neuer Kunde"}</h3>
                    <button onClick={onClose} className={`p-2 rounded-lg ${darkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Vorname</label>
                            <input type="text" value={form.first_name} onChange={(e) => setForm(f => ({ ...f, first_name: e.target.value }))} className={inputStyle} />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Nachname</label>
                            <input type="text" value={form.last_name} onChange={(e) => setForm(f => ({ ...f, last_name: e.target.value }))} className={inputStyle} />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>E-Mail</label>
                            <input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} className={inputStyle} />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Telefon</label>
                            <input type="tel" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} className={inputStyle} />
                        </div>
                        <div className="col-span-2">
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Adresse</label>
                            <input type="text" value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} className={inputStyle} />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>PLZ</label>
                            <input type="text" value={form.postal_code} onChange={(e) => setForm(f => ({ ...f, postal_code: e.target.value }))} className={inputStyle} />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Stadt</label>
                            <input type="text" value={form.city} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} className={inputStyle} />
                        </div>
                        <div className="col-span-2">
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Ausweis-Nr.</label>
                            <input type="text" value={form.id_number} onChange={(e) => setForm(f => ({ ...f, id_number: e.target.value }))} className={inputStyle} />
                        </div>
                        <div className="col-span-2">
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Notizen</label>
                            <textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={inputStyle} />
                        </div>
                    </div>
                </div>

                <div className={`flex items-center justify-between p-4 border-t ${darkMode ? "border-slate-800" : "border-slate-200"}`}>
                    <div>
                        {customer && (
                            <button onClick={() => { if (confirm("Kunde löschen?")) onDelete(customer.id); }} className="text-rose-500">Löschen</button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className={`px-4 py-2 rounded-lg ${darkMode ? "bg-slate-800" : "bg-slate-100"}`}>Abbrechen</button>
                        <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-medium flex items-center gap-2">
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            Speichern
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
