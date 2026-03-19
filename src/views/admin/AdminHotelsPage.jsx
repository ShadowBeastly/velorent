"use client";
import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/src/context/AppContext";
import { supabase } from "@/src/utils/supabase";
import { Plus, Pencil, Trash2, Copy, Check, Building2, Link, QrCode, Download } from "lucide-react";
import QRCode from "qrcode";

function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export default function AdminHotelsPage() {
  const { darkMode } = useApp();
  const [hotels, setHotels] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingHotel, setEditingHotel] = useState(null);
  const [search, setSearch] = useState("");
  const [copiedSlug, setCopiedSlug] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [showProviderModal, setShowProviderModal] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [hotelProviders, setHotelProviders] = useState([]);
  const [allProviders, setAllProviders] = useState([]);
  const [providerDistance, setProviderDistance] = useState("");
  const [selectedProviderToAdd, setSelectedProviderToAdd] = useState("");

  const [showQrModal, setShowQrModal] = useState(false);
  const [qrHotel, setQrHotel] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrSvg, setQrSvg] = useState("");
  const [form, setForm] = useState({
    name: "", slug: "", address: "", latitude: "", longitude: "",
    contact_email: "", contact_phone: "", commission_pct: 0, region_id: "", is_active: true,
  });

  const card = darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const inputCls = `w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#1A7D5A] ${darkMode ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-white border-slate-300 text-slate-900 placeholder-slate-400"}`;
  const labelCls = `block text-sm font-medium mb-1 ${darkMode ? "text-slate-300" : "text-slate-700"}`;

  async function loadHotels() {
    setLoading(true);
    const { data } = await supabase.from("hotels").select("*, regions(name), hotel_providers(count)").order("name");
    setHotels(data || []);
    setLoading(false);
  }

  async function loadRegions() {
    const { data } = await supabase.from("regions").select("id, name").order("name");
    setRegions(data || []);
  }

  async function loadAllProviders() {
    const { data } = await supabase.from("organizations").select("id, name").order("name");
    setAllProviders(data || []);
  }

  useEffect(() => {
    async function init() { await Promise.all([loadHotels(), loadRegions(), loadAllProviders()]); }
    init();
  }, []);

  function openAddModal() {
    setEditingHotel(null);
    setForm({ name: "", slug: "", address: "", latitude: "", longitude: "", contact_email: "", contact_phone: "", commission_pct: 0, region_id: "", is_active: true });
    setError("");
    setShowModal(true);
  }

  function openEditModal(hotel) {
    setEditingHotel(hotel);
    setForm({
      name: hotel.name || "", slug: hotel.slug || "", address: hotel.address || "",
      latitude: hotel.latitude || "", longitude: hotel.longitude || "",
      contact_email: hotel.contact_email || "", contact_phone: hotel.contact_phone || "",
      commission_pct: hotel.commission_pct || 0, region_id: hotel.region_id || "",
      is_active: hotel.is_active !== false,
    });
    setError("");
    setShowModal(true);
  }

  async function openProviderModal(hotel) {
    setSelectedHotel(hotel);
    const { data } = await supabase.from("hotel_providers").select("id, distance_km, organization_id, organizations(name)").eq("hotel_id", hotel.id);
    setHotelProviders(data || []);
    setSelectedProviderToAdd("");
    setProviderDistance("");
    setShowProviderModal(true);
  }

  const openQrModal = useCallback(async (hotel) => {
    setQrHotel(hotel);
    const url = `https://lociva.de/hotel/${hotel.slug}`;
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 512, margin: 2, color: { dark: "#1A7D5A", light: "#FFFFFF" },
        errorCorrectionLevel: "H",
      });
      setQrDataUrl(dataUrl);
      const svgStr = await QRCode.toString(url, {
        type: "svg", width: 512, margin: 2, color: { dark: "#1A7D5A", light: "#FFFFFF" },
        errorCorrectionLevel: "H",
      });
      setQrSvg(svgStr);
    } catch (e) {
      console.error("QR generation error:", e);
    }
    setShowQrModal(true);
  }, []);

  function downloadQrPng() {
    if (!qrDataUrl || !qrHotel) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `lociva-qr-${qrHotel.slug}.png`;
    a.click();
  }

  function downloadQrSvg() {
    if (!qrSvg || !qrHotel) return;
    const blob = new Blob([qrSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lociva-qr-${qrHotel.slug}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.slug.trim()) { setError("Name und Slug sind Pflichtfelder."); return; }
    setSaving(true);
    setError("");
    const payload = {
      name: form.name.trim(), slug: form.slug.trim(),
      address: form.address || null,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
      commission_pct: parseFloat(form.commission_pct) || 0,
      region_id: form.region_id || null,
      is_active: form.is_active,
    };
    let err;
    if (editingHotel) {
      ({ error: err } = await supabase.from("hotels").update(payload).eq("id", editingHotel.id));
    } else {
      ({ error: err } = await supabase.from("hotels").insert(payload));
    }
    if (err) { setError(err.message); setSaving(false); return; }
    setShowModal(false);
    setSaving(false);
    loadHotels();
  }

  async function handleDelete(hotel) {
    if (!confirm(`Hotel "${hotel.name}" deaktivieren?`)) return;
    await supabase.from("hotels").update({ is_active: false }).eq("id", hotel.id);
    loadHotels();
  }

  async function handleAddProvider() {
    if (!selectedProviderToAdd) return;
    await supabase.from("hotel_providers").upsert({ hotel_id: selectedHotel.id, organization_id: selectedProviderToAdd, distance_km: providerDistance ? parseFloat(providerDistance) : null, is_active: true }, { onConflict: "hotel_id,organization_id" });
    const { data } = await supabase.from("hotel_providers").select("id, distance_km, organization_id, organizations(name)").eq("hotel_id", selectedHotel.id);
    setHotelProviders(data || []);
    setSelectedProviderToAdd("");
    setProviderDistance("");
    loadHotels();
  }

  async function handleRemoveProvider(linkId) {
    await supabase.from("hotel_providers").delete().eq("id", linkId);
    const { data } = await supabase.from("hotel_providers").select("id, distance_km, organization_id, organizations(name)").eq("hotel_id", selectedHotel.id);
    setHotelProviders(data || []);
    loadHotels();
  }

  function copyLink(slug) {
    const url = `https://lociva.de/hotel/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  }

  const filtered = hotels.filter(h =>
    h.name.toLowerCase().includes(search.toLowerCase()) || h.slug.includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${darkMode ? "bg-[#1A7D5A]/20" : "bg-[#D4EDE2]"}`}>
              <Building2 className="w-5 h-5 text-[#1A7D5A]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Hotels verwalten</h2>
              <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{hotels.length} Hotels insgesamt</p>
            </div>
          </div>
          <button onClick={openAddModal} className="flex items-center gap-2 bg-[#1A7D5A] hover:bg-[#145E44] text-white px-4 py-2 rounded-lg font-medium transition-colors">
            <Plus className="w-4 h-4" /> Hotel hinzufugen
          </button>
        </div>

        <div>
          <input type="text" placeholder="Hotel suchen..." value={search} onChange={(e) => setSearch(e.target.value)} className={inputCls} />
        </div>

        <div className={`border rounded-xl overflow-hidden ${card}`}>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-8 h-8 border-4 border-[#1A7D5A] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className={`w-12 h-12 mx-auto mb-3 ${darkMode ? "text-slate-600" : "text-slate-300"}`} />
              <p className={darkMode ? "text-slate-400" : "text-slate-500"}>Keine Hotels gefunden</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={`border-b ${darkMode ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-slate-50"}`}>
                  <tr>
                    {["Name", "Region", "Slug / Link", "Anbieter", "Provision", "Status", "Aktionen"].map(h => (
                      <th key={h} className={`text-left px-4 py-3 font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((hotel) => (
                    <tr key={hotel.id} className={`border-b last:border-0 ${darkMode ? "border-slate-700 hover:bg-slate-700/30" : "border-slate-100 hover:bg-slate-50"}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{hotel.name}</p>
                        {hotel.address && <p className={`text-xs mt-0.5 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{hotel.address}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{hotel.regions?.name || "–"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{hotel.slug}</span>
                          <button onClick={() => copyLink(hotel.slug)} className={`p-1 rounded transition-colors ${darkMode ? "hover:bg-slate-600" : "hover:bg-slate-200"}`} title="Link kopieren">
                            {copiedSlug === hotel.slug ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => openProviderModal(hotel)} className="text-[#3BAA82] hover:text-[#1A7D5A] font-medium text-xs flex items-center gap-1">
                          <Link className="w-3 h-3" />
                          {hotel.hotel_providers?.[0]?.count ?? 0} Anbieter
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className={darkMode ? "text-slate-300" : "text-slate-600"}>{hotel.commission_pct || 0}%</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${hotel.is_active ? "bg-green-900/40 text-green-400" : "bg-slate-700 text-slate-400"}`}>
                          {hotel.is_active ? "Aktiv" : "Inaktiv"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openQrModal(hotel)} className={`p-1.5 rounded transition-colors ${darkMode ? "hover:bg-slate-600" : "hover:bg-slate-100"}`} title="QR-Code">
                            <QrCode className="w-4 h-4 text-[#3BAA82]" />
                          </button>
                          <button onClick={() => openEditModal(hotel)} className={`p-1.5 rounded transition-colors ${darkMode ? "hover:bg-slate-600" : "hover:bg-slate-100"}`} title="Bearbeiten">
                            <Pencil className="w-4 h-4 text-slate-400" />
                          </button>
                          <button onClick={() => handleDelete(hotel)} className={`p-1.5 rounded transition-colors ${darkMode ? "hover:bg-red-900/40" : "hover:bg-red-50"}`} title="Deaktivieren">
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl max-h-[90vh] overflow-y-auto ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
            <h2 className="text-xl font-bold mb-5">{editingHotel ? "Hotel bearbeiten" : "Hotel hinzufugen"}</h2>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Name *</label>
                <input className={inputCls} value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value, ...(!editingHotel ? { slug: slugify(e.target.value) } : {}) }))} placeholder="Hotel Zum Taunus" />
              </div>
              <div>
                <label className={labelCls}>Slug * (URL-Identifier)</label>
                <input className={inputCls} value={form.slug} onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="hotel-zum-taunus" />
                <p className={`text-xs mt-1 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>URL: /hotel/{form.slug || "..."}</p>
              </div>
              <div>
                <label className={labelCls}>Region</label>
                <select className={inputCls} value={form.region_id} onChange={(e) => setForm(f => ({ ...f, region_id: e.target.value }))}>
                  <option value="">Keine Region</option>
                  {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Adresse</label>
                <input className={inputCls} value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Musterstr. 1, 12345 Stadt" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Breitengrad (lat)</label>
                  <input type="number" step="0.000001" className={inputCls} value={form.latitude} onChange={(e) => setForm(f => ({ ...f, latitude: e.target.value }))} placeholder="50.1234" />
                </div>
                <div>
                  <label className={labelCls}>Langengrad (lng)</label>
                  <input type="number" step="0.000001" className={inputCls} value={form.longitude} onChange={(e) => setForm(f => ({ ...f, longitude: e.target.value }))} placeholder="8.5678" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Kontakt-E-Mail</label>
                  <input type="email" className={inputCls} value={form.contact_email} onChange={(e) => setForm(f => ({ ...f, contact_email: e.target.value }))} placeholder="info@hotel.de" />
                </div>
                <div>
                  <label className={labelCls}>Kontakt-Telefon</label>
                  <input className={inputCls} value={form.contact_phone} onChange={(e) => setForm(f => ({ ...f, contact_phone: e.target.value }))} placeholder="+49 69 12345" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Provision % (0-20)</label>
                <input type="number" min="0" max="20" step="0.5" className={inputCls} value={form.commission_pct} onChange={(e) => setForm(f => ({ ...f, commission_pct: e.target.value }))} />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="is_active" checked={form.is_active} onChange={(e) => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 accent-[#1A7D5A]" />
                <label htmlFor="is_active" className={`text-sm ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Aktiv (im Buchungssystem sichtbar)</label>
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

      {/* Provider Assignment Modal */}
      {showProviderModal && selectedHotel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
            <h2 className="text-xl font-bold mb-1">Anbieter verwalten</h2>
            <p className={`text-sm mb-4 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{selectedHotel.name}</p>
            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {hotelProviders.length === 0 ? (
                <p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Noch keine Anbieter verknupft</p>
              ) : hotelProviders.map(hp => (
                <div key={hp.id} className={`flex items-center justify-between px-3 py-2 rounded-lg ${darkMode ? "bg-slate-700" : "bg-slate-100"}`}>
                  <div>
                    <p className="text-sm font-medium">{hp.organizations?.name}</p>
                    {hp.distance_km && <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{hp.distance_km} km</p>}
                  </div>
                  <button onClick={() => handleRemoveProvider(hp.id)} className="text-red-400 hover:text-red-300 text-xs">Entfernen</button>
                </div>
              ))}
            </div>
            <div className={`border-t pt-4 ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
              <p className={`text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>Anbieter hinzufugen</p>
              <div className="flex gap-2 mb-2">
                <select value={selectedProviderToAdd} onChange={(e) => setSelectedProviderToAdd(e.target.value)} className={`flex-1 ${inputCls}`}>
                  <option value="">Anbieter wahlen...</option>
                  {allProviders.filter(p => !hotelProviders.find(hp => hp.organization_id === p.id)).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <input type="number" step="0.1" placeholder="km" value={providerDistance} onChange={(e) => setProviderDistance(e.target.value)} className={`w-20 ${inputCls}`} />
              </div>
              <button onClick={handleAddProvider} disabled={!selectedProviderToAdd} className="w-full bg-[#1A7D5A] hover:bg-[#145E44] disabled:bg-slate-700 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                Hinzufugen
              </button>
            </div>
            <button onClick={() => setShowProviderModal(false)} className={`w-full mt-3 py-2 rounded-lg border text-sm font-medium transition-colors ${darkMode ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}>
              Schliessen
            </button>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQrModal && qrHotel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className={`w-full max-w-sm rounded-2xl border p-6 shadow-2xl ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
            <h2 className="text-xl font-bold mb-1">QR-Code</h2>
            <p className={`text-sm mb-4 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{qrHotel.name}</p>
            <div className="flex justify-center mb-4">
              {qrDataUrl && (
                <div className="bg-white p-4 rounded-xl">
                  <img src={qrDataUrl} alt={`QR-Code für ${qrHotel.name}`} className="w-48 h-48" />
                </div>
              )}
            </div>
            <p className={`text-center text-xs mb-4 font-mono ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
              lociva.de/hotel/{qrHotel.slug}
            </p>
            <div className="flex gap-2 mb-3">
              <button onClick={downloadQrPng} className="flex-1 flex items-center justify-center gap-2 bg-[#1A7D5A] hover:bg-[#145E44] text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
                <Download className="w-4 h-4" /> PNG
              </button>
              <button onClick={downloadQrSvg} className="flex-1 flex items-center justify-center gap-2 bg-[#1A7D5A] hover:bg-[#145E44] text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
                <Download className="w-4 h-4" /> SVG
              </button>
            </div>
            <button onClick={() => setShowQrModal(false)} className={`w-full py-2 rounded-lg border text-sm font-medium transition-colors ${darkMode ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}>
              Schliessen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
