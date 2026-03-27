"use client";
import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/src/context/AppContext";
import { supabase } from "@/src/utils/supabase";
import { Plus, Pencil, Trash2, Copy, Check, Building2, Link, QrCode, Download } from "lucide-react";
import QRCode from "qrcode";

const VENUE_TYPES = [
  { value: "hotel", label: "Hotel" },
  { value: "airbnb", label: "Airbnb" },
  { value: "ferienwohnung", label: "Ferienwohnung" },
  { value: "campingplatz", label: "Campingplatz" },
  { value: "hostel", label: "Hostel" },
  { value: "sonstige", label: "Sonstige" },
];

function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export default function AdminVenuesPage() {
  const { darkMode } = useApp();
  const [activeTab, setActiveTab] = useState("venues");
  const [venues, setVenues] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVenue, setEditingVenue] = useState(null);
  const [search, setSearch] = useState("");
  const [copiedSlug, setCopiedSlug] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [registrations, setRegistrations] = useState([]);
  const [regsLoading, setRegsLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [showProviderModal, setShowProviderModal] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [venueProviders, setVenueProviders] = useState([]);
  const [allProviders, setAllProviders] = useState([]);
  const [providerDistance, setProviderDistance] = useState("");
  const [selectedProviderToAdd, setSelectedProviderToAdd] = useState("");

  const [showQrModal, setShowQrModal] = useState(false);
  const [qrVenue, setQrVenue] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrSvg, setQrSvg] = useState("");
  const [form, setForm] = useState({
    name: "", slug: "", address: "", latitude: "", longitude: "",
    contact_email: "", contact_phone: "", commission_pct: 0, region_id: "",
    is_active: true, venue_type: "hotel", is_self_managed: false,
  });

  const card = darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const inputCls = `w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#1A7D5A] ${darkMode ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-white border-slate-300 text-slate-900 placeholder-slate-400"}`;
  const labelCls = `block text-sm font-medium mb-1 ${darkMode ? "text-slate-300" : "text-slate-700"}`;

  async function loadVenues() {
    setLoading(true);
    const { data } = await supabase.from("venues").select("*, regions(name), hotel_providers(count)").order("name");
    setVenues(data || []);
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

  async function loadRegistrations() {
    setRegsLoading(true);
    const { data } = await supabase
      .from("venue_registrations")
      .select("*, venue:venues(name, slug, address, venue_type, contact_email)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setRegistrations(data || []);
    setRegsLoading(false);
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleApprove(reg) {
    await supabase.from("venues").update({ is_active: true }).eq("id", reg.venue_id);
    await supabase.from("venue_registrations").update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", reg.id);
    showToast(`${reg.venue?.name || "Unterkunft"} genehmigt.`);
    loadRegistrations();
  }

  async function handleReject(reg) {
    await supabase.from("venue_registrations").update({ status: "rejected", reviewed_at: new Date().toISOString() }).eq("id", reg.id);
    showToast(`${reg.venue?.name || "Unterkunft"} abgelehnt.`, "error");
    loadRegistrations();
  }

  useEffect(() => {
    async function init() { await Promise.all([loadVenues(), loadRegions(), loadAllProviders()]); }
    init();
  }, []);

  useEffect(() => {
    if (activeTab === "registrations") loadRegistrations();
  }, [activeTab]);

  function openAddModal() {
    setEditingVenue(null);
    setForm({ name: "", slug: "", address: "", latitude: "", longitude: "", contact_email: "", contact_phone: "", commission_pct: 0, region_id: "", is_active: true, venue_type: "hotel", is_self_managed: false });
    setError("");
    setShowModal(true);
  }

  function openEditModal(venue) {
    setEditingVenue(venue);
    setForm({
      name: venue.name || "", slug: venue.slug || "", address: venue.address || "",
      latitude: venue.latitude || "", longitude: venue.longitude || "",
      contact_email: venue.contact_email || "", contact_phone: venue.contact_phone || "",
      commission_pct: venue.commission_pct || 0, region_id: venue.region_id || "",
      is_active: venue.is_active !== false,
      venue_type: venue.venue_type || "hotel",
      is_self_managed: venue.is_self_managed || false,
    });
    setError("");
    setShowModal(true);
  }

  async function openProviderModal(venue) {
    setSelectedVenue(venue);
    const { data } = await supabase.from("hotel_providers").select("id, distance_km, organization_id, organizations(name)").eq("hotel_id", venue.id);
    setVenueProviders(data || []);
    setSelectedProviderToAdd("");
    setProviderDistance("");
    setShowProviderModal(true);
  }

  const openQrModal = useCallback(async (venue) => {
    setQrVenue(venue);
    const url = `${window.location.origin}/hotel/${venue.slug}`;
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
    if (!qrDataUrl || !qrVenue) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `lociva-qr-${qrVenue.slug}.png`;
    a.click();
  }

  function downloadQrSvg() {
    if (!qrSvg || !qrVenue) return;
    const blob = new Blob([qrSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lociva-qr-${qrVenue.slug}.svg`;
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
      venue_type: form.venue_type || "hotel",
      is_self_managed: form.is_self_managed,
    };
    let err;
    if (editingVenue) {
      ({ error: err } = await supabase.from("venues").update(payload).eq("id", editingVenue.id));
    } else {
      ({ error: err } = await supabase.from("venues").insert(payload));
    }
    if (err) { setError(err.message); setSaving(false); return; }
    setShowModal(false);
    setSaving(false);
    loadVenues();
  }

  async function handleDelete(venue) {
    // TODO: Move to server-side API route with superadmin role verification
    if (!confirm(`Unterkunft "${venue.name}" deaktivieren?`)) return;
    const { error } = await supabase.from("venues").update({ is_active: false }).eq("id", venue.id);
    if (error) { alert("Fehler: " + error.message); return; }
    loadVenues();
  }

  async function handleAddProvider() {
    // TODO: Move to server-side API route with superadmin role verification
    if (!selectedProviderToAdd) return;
    const { error } = await supabase.from("hotel_providers").upsert({ hotel_id: selectedVenue.id, organization_id: selectedProviderToAdd, distance_km: providerDistance ? parseFloat(providerDistance) : null, is_active: true }, { onConflict: "hotel_id,organization_id" });
    if (error) { alert("Fehler: " + error.message); return; }
    const { data } = await supabase.from("hotel_providers").select("id, distance_km, organization_id, organizations(name)").eq("hotel_id", selectedVenue.id);
    setVenueProviders(data || []);
    setSelectedProviderToAdd("");
    setProviderDistance("");
    loadVenues();
  }

  async function handleRemoveProvider(linkId) {
    // TODO: Move to server-side API route with superadmin role verification
    const { error } = await supabase.from("hotel_providers").delete().eq("id", linkId);
    if (error) { alert("Fehler: " + error.message); return; }
    const { data } = await supabase.from("hotel_providers").select("id, distance_km, organization_id, organizations(name)").eq("hotel_id", selectedVenue.id);
    setVenueProviders(data || []);
    loadVenues();
  }

  function copyLink(slug) {
    const url = `${window.location.origin}/hotel/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  }

  const filtered = venues.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) || v.slug.includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${toast.type === "error" ? "bg-red-600 text-white" : "bg-[#1A7D5A] text-white"}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${darkMode ? "bg-[#1A7D5A]/20" : "bg-[#D4EDE2]"}`}>
            <Building2 className="w-5 h-5 text-[#1A7D5A]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Unterkünfte verwalten</h2>
            <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{venues.length} Unterkünfte insgesamt</p>
          </div>
        </div>
        {activeTab === "venues" && (
          <button onClick={openAddModal} className="flex items-center gap-2 bg-[#1A7D5A] hover:bg-[#145E44] text-white px-4 py-2 rounded-lg font-medium transition-colors">
            <Plus className="w-4 h-4" /> Unterkunft hinzufügen
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className={`flex border-b ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
        {[
          { key: "venues", label: "Unterkünfte" },
          { key: "registrations", label: "Registrierungen" },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? "border-[#1A7D5A] text-[#1A7D5A]"
                : `border-transparent ${darkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-700"}`
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Venues tab */}
      {activeTab === "venues" && (<>
        <div>
          <input type="text" placeholder="Unterkunft suchen..." value={search} onChange={(e) => setSearch(e.target.value)} className={inputCls} />
        </div>

        <div className={`border rounded-xl overflow-hidden ${card}`}>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-8 h-8 border-4 border-[#1A7D5A] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className={`w-12 h-12 mx-auto mb-3 ${darkMode ? "text-slate-600" : "text-slate-300"}`} />
              <p className={darkMode ? "text-slate-400" : "text-slate-500"}>Keine Unterkünfte gefunden</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={`border-b ${darkMode ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-slate-50"}`}>
                  <tr>
                    {["Name", "Typ", "Region", "Slug / Link", "Anbieter", "Provision", "Status", "Aktionen"].map(h => (
                      <th key={h} className={`text-left px-4 py-3 font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((venue) => (
                    <tr key={venue.id} className={`border-b last:border-0 ${darkMode ? "border-slate-700 hover:bg-slate-700/30" : "border-slate-100 hover:bg-slate-50"}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{venue.name}</p>
                        {venue.address && <p className={`text-xs mt-0.5 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{venue.address}</p>}
                        {venue.is_self_managed && <span className={`text-xs ${darkMode ? "text-blue-400" : "text-blue-600"}`}>Self-managed</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs capitalize ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                          {VENUE_TYPES.find(t => t.value === venue.venue_type)?.label || venue.venue_type || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{venue.regions?.name || ""}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{venue.slug}</span>
                          <button onClick={() => copyLink(venue.slug)} className={`p-1 rounded transition-colors ${darkMode ? "hover:bg-slate-600" : "hover:bg-slate-200"}`} title="Link kopieren">
                            {copiedSlug === venue.slug ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => openProviderModal(venue)} className="text-[#3BAA82] hover:text-[#1A7D5A] font-medium text-xs flex items-center gap-1">
                          <Link className="w-3 h-3" />
                          {venue.hotel_providers?.[0]?.count ?? 0} Anbieter
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className={darkMode ? "text-slate-300" : "text-slate-600"}>{venue.commission_pct || 0}%</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${venue.is_active ? "bg-green-900/40 text-green-400" : "bg-slate-700 text-slate-400"}`}>
                          {venue.is_active ? "Aktiv" : "Inaktiv"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openQrModal(venue)} className={`p-1.5 rounded transition-colors ${darkMode ? "hover:bg-slate-600" : "hover:bg-slate-100"}`} title="QR-Code">
                            <QrCode className="w-4 h-4 text-[#3BAA82]" />
                          </button>
                          <button onClick={() => openEditModal(venue)} className={`p-1.5 rounded transition-colors ${darkMode ? "hover:bg-slate-600" : "hover:bg-slate-100"}`} title="Bearbeiten">
                            <Pencil className="w-4 h-4 text-slate-400" />
                          </button>
                          <button onClick={() => handleDelete(venue)} className={`p-1.5 rounded transition-colors ${darkMode ? "hover:bg-red-900/40" : "hover:bg-red-50"}`} title="Deaktivieren">
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
      </>)}

      {/* Registrations tab */}
      {activeTab === "registrations" && (
        <div className="space-y-4">
          {regsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-8 h-8 border-4 border-[#1A7D5A] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : registrations.length === 0 ? (
            <div className={`border rounded-xl text-center py-16 ${card}`}>
              <Building2 className={`w-12 h-12 mx-auto mb-3 ${darkMode ? "text-slate-600" : "text-slate-300"}`} />
              <p className={darkMode ? "text-slate-400" : "text-slate-500"}>Keine ausstehenden Registrierungen</p>
            </div>
          ) : (
            registrations.map(reg => (
              <div key={reg.id} className={`border rounded-xl p-5 ${card}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <p className="font-semibold text-base">{reg.venue?.name || "—"}</p>
                    {reg.venue?.address && (
                      <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{reg.venue.address}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      {reg.venue?.venue_type && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${darkMode ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                          {VENUE_TYPES.find(t => t.value === reg.venue.venue_type)?.label || reg.venue.venue_type}
                        </span>
                      )}
                      {reg.venue?.contact_email && (
                        <span className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{reg.venue.contact_email}</span>
                      )}
                      <span className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                        Eingereicht: {new Date(reg.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleApprove(reg)}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 text-white transition-colors"
                    >
                      Genehmigen
                    </button>
                    <button
                      onClick={() => handleReject(reg)}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-colors"
                    >
                      Ablehnen
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl max-h-[90vh] overflow-y-auto ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
            <h2 className="text-xl font-bold mb-5">{editingVenue ? "Unterkunft bearbeiten" : "Unterkunft hinzufügen"}</h2>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Name *</label>
                <input className={inputCls} value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value, ...(!editingVenue ? { slug: slugify(e.target.value) } : {}) }))} placeholder="Hotel Zum Taunus" />
              </div>
              <div>
                <label className={labelCls}>Slug * (URL-Identifier)</label>
                <input className={inputCls} value={form.slug} onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="hotel-zum-taunus" />
                <p className={`text-xs mt-1 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>URL: /hotel/{form.slug || "..."}</p>
              </div>
              <div>
                <label className={labelCls}>Unterkunftstyp</label>
                <select className={inputCls} value={form.venue_type} onChange={(e) => setForm(f => ({ ...f, venue_type: e.target.value }))}>
                  {VENUE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="is_self_managed" checked={form.is_self_managed} onChange={(e) => setForm(f => ({ ...f, is_self_managed: e.target.checked }))} className="w-4 h-4 accent-[#1A7D5A]" />
                <label htmlFor="is_self_managed" className={`text-sm ${darkMode ? "text-slate-300" : "text-slate-700"}`}>Self-managed (Unterkunft verwaltet sich selbst)</label>
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
      {showProviderModal && selectedVenue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
            <h2 className="text-xl font-bold mb-1">Anbieter verwalten</h2>
            <p className={`text-sm mb-4 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{selectedVenue.name}</p>
            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {venueProviders.length === 0 ? (
                <p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Noch keine Anbieter verknupft</p>
              ) : venueProviders.map(hp => (
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
                  {allProviders.filter(p => !venueProviders.find(hp => hp.organization_id === p.id)).map(p => (
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
      {showQrModal && qrVenue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className={`w-full max-w-sm rounded-2xl border p-6 shadow-2xl ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
            <h2 className="text-xl font-bold mb-1">QR-Code</h2>
            <p className={`text-sm mb-4 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{qrVenue.name}</p>
            <div className="flex justify-center mb-4">
              {qrDataUrl && (
                <div className="bg-white p-4 rounded-xl">
                  <img src={qrDataUrl} alt={`QR-Code für ${qrVenue.name}`} className="w-48 h-48" />
                </div>
              )}
            </div>
            <p className={`text-center text-xs mb-4 font-mono ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
              lociva.de/hotel/{qrVenue.slug}
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
