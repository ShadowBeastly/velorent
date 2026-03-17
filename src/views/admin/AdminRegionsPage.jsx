"use client";
import { useState, useEffect } from "react";
import { useApp } from "@/src/context/AppContext";
import { supabase } from "@/src/utils/supabase";
import { MapPin, Plus, Pencil, Trash2, UserCheck } from "lucide-react";

export default function AdminRegionsPage() {
  const { darkMode } = useApp();
  const [regions, setRegions] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRegion, setEditingRegion] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", scout_user_id: "" });

  const card = darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const inputCls = `w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#1A7D5A] ${darkMode ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-white border-slate-300 text-slate-900 placeholder-slate-400"}`;
  const labelCls = `block text-sm font-medium mb-1 ${darkMode ? "text-slate-300" : "text-slate-700"}`;

  async function loadRegions() {
    setLoading(true);
    const { data } = await supabase
      .from("regions")
      .select("*, scout:profiles!regions_scout_user_id_fkey(id, full_name, email), hotels(count)")
      .order("name");
    setRegions(data || []);
    setLoading(false);
  }

  async function loadProfiles() {
    const { data } = await supabase.from("profiles").select("id, full_name, email").order("full_name");
    setProfiles(data || []);
  }

  useEffect(() => {
    async function init() { await Promise.all([loadRegions(), loadProfiles()]); }
    init();
  }, []);

  function openAddModal() {
    setEditingRegion(null);
    setForm({ name: "", scout_user_id: "" });
    setError("");
    setShowModal(true);
  }

  function openEditModal(region) {
    setEditingRegion(region);
    setForm({ name: region.name || "", scout_user_id: region.scout_user_id || "" });
    setError("");
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Name ist ein Pflichtfeld."); return; }
    setSaving(true);
    setError("");
    const payload = {
      name: form.name.trim(),
      scout_user_id: form.scout_user_id || null,
    };
    let err;
    if (editingRegion) {
      ({ error: err } = await supabase.from("regions").update(payload).eq("id", editingRegion.id));
    } else {
      ({ error: err } = await supabase.from("regions").insert(payload));
    }
    if (err) { setError(err.message); setSaving(false); return; }
    setShowModal(false);
    setSaving(false);
    loadRegions();
  }

  async function handleDelete(region) {
    const hotelCount = region.hotels?.[0]?.count ?? 0;
    const msg = hotelCount > 0
      ? `Region "${region.name}" hat ${hotelCount} Hotels. Trotzdem loschen? (Hotels werden nicht geloscht, nur die Zuordnung entfernt.)`
      : `Region "${region.name}" wirklich loschen?`;
    if (!confirm(msg)) return;
    await supabase.from("regions").delete().eq("id", region.id);
    loadRegions();
  }

  return (
    <div className={`min-h-screen p-6 ${darkMode ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-900"}`}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <MapPin className={`w-7 h-7 ${darkMode ? "text-[#3BAA82]" : "text-[#1A7D5A]"}`} />
            <div>
              <h1 className="text-2xl font-bold">Regionen verwalten</h1>
              <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{regions.length} Regionen</p>
            </div>
          </div>
          <button onClick={openAddModal} className="flex items-center gap-2 bg-[#1A7D5A] hover:bg-[#145E44] text-white px-4 py-2 rounded-lg font-medium transition-colors">
            <Plus className="w-4 h-4" /> Region hinzufugen
          </button>
        </div>

        <div className={`border rounded-xl overflow-hidden ${card}`}>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-8 h-8 border-4 border-[#1A7D5A] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : regions.length === 0 ? (
            <div className="text-center py-16">
              <MapPin className={`w-12 h-12 mx-auto mb-3 ${darkMode ? "text-slate-600" : "text-slate-300"}`} />
              <p className={darkMode ? "text-slate-400" : "text-slate-500"}>Noch keine Regionen angelegt</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className={`border-b ${darkMode ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-slate-50"}`}>
                <tr>
                  {["Region", "Scout", "Hotels", "Erstellt", "Aktionen"].map(h => (
                    <th key={h} className={`text-left px-4 py-3 font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {regions.map((region) => (
                  <tr key={region.id} className={`border-b last:border-0 ${darkMode ? "border-slate-700 hover:bg-slate-700/30" : "border-slate-100 hover:bg-slate-50"}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{region.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      {region.scout ? (
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-3.5 h-3.5 text-[#3BAA82]" />
                          <div>
                            <p className="text-sm">{region.scout.full_name || region.scout.email}</p>
                            {region.scout.full_name && (
                              <p className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{region.scout.email}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Kein Scout</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${darkMode ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                        {region.hotels?.[0]?.count ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                        {new Date(region.created_at).toLocaleDateString("de-DE")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditModal(region)} className={`p-1.5 rounded transition-colors ${darkMode ? "hover:bg-slate-600" : "hover:bg-slate-100"}`} title="Bearbeiten">
                          <Pencil className="w-4 h-4 text-slate-400" />
                        </button>
                        <button onClick={() => handleDelete(region)} className={`p-1.5 rounded transition-colors ${darkMode ? "hover:bg-red-900/40" : "hover:bg-red-50"}`} title="Loschen">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
            <h2 className="text-xl font-bold mb-5">{editingRegion ? "Region bearbeiten" : "Region hinzufugen"}</h2>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Name *</label>
                <input className={inputCls} value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. Rhein-Main, Bodensee, Schwarzwald" />
              </div>
              <div>
                <label className={labelCls}>Scout zuweisen</label>
                <select className={inputCls} value={form.scout_user_id} onChange={(e) => setForm(f => ({ ...f, scout_user_id: e.target.value }))}>
                  <option value="">Kein Scout</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                  ))}
                </select>
                <p className={`text-xs mt-1 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                  Scouts akquirieren Hotels und Anbieter in ihrer Region.
                </p>
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className={`flex-1 py-2.5 rounded-lg border font-medium transition-colors ${darkMode ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}>Abbrechen</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#1A7D5A] hover:bg-[#145E44] disabled:bg-[#1A7D5A]/40 text-white py-2.5 rounded-lg font-medium transition-colors">
                {saving ? "Speichern..." : "Speichern"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
