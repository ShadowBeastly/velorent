"use client";
import { useState, useEffect } from "react";
import { useApp } from "@/src/context/AppContext";
import { supabase } from "@/src/utils/supabase";
import { Store, Pencil, CheckCircle, XCircle, Clock } from "lucide-react";

export default function AdminProvidersPage() {
  const { darkMode } = useApp();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProvider, setEditingProvider] = useState(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ provider_description: "", provider_address: "", provider_phone: "", provider_website: "", is_platform_provider: false });

  const card = darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const inputCls = `w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${darkMode ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-white border-slate-300 text-slate-900"}`;
  const labelCls = `block text-sm font-medium mb-1 ${darkMode ? "text-slate-300" : "text-slate-700"}`;

  async function loadProviders() {
    setLoading(true);
    const { data } = await supabase.from("organizations").select("id, name, slug, is_platform_provider, stripe_account_id, stripe_onboarding_complete, stripe_charges_enabled, provider_description, provider_address, provider_phone, provider_website").order("name");
    setProviders(data || []);
    setLoading(false);
  }

  useEffect(() => { loadProviders(); }, []);

  function openEdit(provider) {
    setEditingProvider(provider);
    setForm({ provider_description: provider.provider_description || "", provider_address: provider.provider_address || "", provider_phone: provider.provider_phone || "", provider_website: provider.provider_website || "", is_platform_provider: provider.is_platform_provider || false });
  }

  async function handleSave() {
    setSaving(true);
    await supabase.from("organizations").update({ is_platform_provider: form.is_platform_provider, provider_description: form.provider_description || null, provider_address: form.provider_address || null, provider_phone: form.provider_phone || null, provider_website: form.provider_website || null }).eq("id", editingProvider.id);
    setSaving(false);
    setEditingProvider(null);
    loadProviders();
  }

  function StripeStatus({ provider }) {
    if (!provider.stripe_account_id) return <span className="flex items-center gap-1 text-xs text-slate-500"><XCircle className="w-3.5 h-3.5" /> Nicht verbunden</span>;
    if (provider.stripe_charges_enabled) return <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle className="w-3.5 h-3.5" /> Aktiv</span>;
    return <span className="flex items-center gap-1 text-xs text-yellow-400"><Clock className="w-3.5 h-3.5" /> KYC ausstehend</span>;
  }

  const filtered = providers.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className={`min-h-screen p-6 ${darkMode ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-900"}`}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Store className={`w-7 h-7 ${darkMode ? "text-indigo-400" : "text-indigo-600"}`} />
          <div>
            <h1 className="text-2xl font-bold">Anbieter verwalten</h1>
            <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{providers.filter(p => p.is_platform_provider).length} Plattform-Anbieter aktiv</p>
          </div>
        </div>

        <div className="mb-4">
          <input type="text" placeholder="Anbieter suchen..." value={search} onChange={(e) => setSearch(e.target.value)} className={inputCls} />
        </div>

        <div className={`border rounded-xl overflow-hidden ${card}`}>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16"><p className={darkMode ? "text-slate-400" : "text-slate-500"}>Keine Anbieter gefunden</p></div>
          ) : (
            <table className="w-full text-sm">
              <thead className={`border-b ${darkMode ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-slate-50"}`}>
                <tr>
                  {["Anbieter", "Plattform-Status", "Stripe", "Adresse", "Aktionen"].map(h => (
                    <th key={h} className={`text-left px-4 py-3 font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(provider => (
                  <tr key={provider.id} className={`border-b last:border-0 ${darkMode ? "border-slate-700 hover:bg-slate-700/30" : "border-slate-100 hover:bg-slate-50"}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{provider.name}</p>
                      {provider.provider_description && <p className={`text-xs mt-0.5 line-clamp-1 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{provider.provider_description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${provider.is_platform_provider ? "bg-indigo-900/40 text-indigo-300" : "bg-slate-700 text-slate-400"}`}>
                        {provider.is_platform_provider ? "Plattform-Anbieter" : "Intern"}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StripeStatus provider={provider} /></td>
                    <td className="px-4 py-3">
                      <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{provider.provider_address || "–"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => openEdit(provider)} className={`p-1.5 rounded transition-colors ${darkMode ? "hover:bg-slate-600" : "hover:bg-slate-100"}`}>
                        <Pencil className="w-4 h-4 text-slate-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {editingProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
            <h2 className="text-xl font-bold mb-5">{editingProvider.name} bearbeiten</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-indigo-900/20 border border-indigo-800/40">
                <input type="checkbox" id="platform_provider" checked={form.is_platform_provider} onChange={(e) => setForm(f => ({ ...f, is_platform_provider: e.target.checked }))} className="w-4 h-4 accent-indigo-600" />
                <label htmlFor="platform_provider" className="text-sm font-medium text-indigo-300">Auf Plattform-Marktplatz aktiv</label>
              </div>
              <div>
                <label className={labelCls}>Beschreibung (für Gäste)</label>
                <textarea rows={3} className={inputCls} value={form.provider_description} onChange={(e) => setForm(f => ({ ...f, provider_description: e.target.value }))} placeholder="Ihr E-Bike Spezialist..." />
              </div>
              <div>
                <label className={labelCls}>Adresse</label>
                <input className={inputCls} value={form.provider_address} onChange={(e) => setForm(f => ({ ...f, provider_address: e.target.value }))} placeholder="Hauptstr. 1, 65779 Kelkheim" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Telefon</label>
                  <input className={inputCls} value={form.provider_phone} onChange={(e) => setForm(f => ({ ...f, provider_phone: e.target.value }))} placeholder="+49 6195 123456" />
                </div>
                <div>
                  <label className={labelCls}>Website</label>
                  <input className={inputCls} value={form.provider_website} onChange={(e) => setForm(f => ({ ...f, provider_website: e.target.value }))} placeholder="https://..." />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditingProvider(null)} className={`flex-1 py-2.5 rounded-lg border font-medium ${darkMode ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}>Abbrechen</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white py-2.5 rounded-lg font-medium">
                {saving ? "Speichern..." : "Speichern"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
