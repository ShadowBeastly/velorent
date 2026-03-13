"use client";
import { useState, useEffect } from "react";
import { useApp } from "@/src/context/AppContext";
import { useOrganization } from "@/src/context/OrgContext";
import { supabase } from "@/src/utils/supabase";
import { Store, CheckCircle, XCircle, Clock, Building2, Save } from "lucide-react";
import CancellationPolicyVisualizer from "@/src/components/marketplace/CancellationPolicyVisualizer";

function formatEur(n) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n || 0);
}

const STATUS_BADGE = { reserved: "bg-slate-700 text-slate-300", confirmed: "bg-blue-900/40 text-blue-400", picked_up: "bg-yellow-900/40 text-yellow-400", returned: "bg-green-900/40 text-green-400", cancelled: "bg-red-900/40 text-red-400" };

export default function MarketplacePage() {
  const { darkMode } = useApp();
  const { currentOrg } = useOrganization();
  const [org, setOrg] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profile, setProfile] = useState({ provider_description: "", provider_address: "", provider_phone: "" });

  const card = darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const inputCls = `w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${darkMode ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-white border-slate-300 text-slate-900"}`;
  const labelCls = `block text-sm font-medium mb-1 ${darkMode ? "text-slate-300" : "text-slate-700"}`;

  useEffect(() => {
    if (!currentOrg?.id) return;
    async function load() {
      setLoading(true);
      const [{ data: orgData }, { data: hotelsData }, { data: bookingsData }] = await Promise.all([
        supabase.from("organizations").select("id, name, is_platform_provider, stripe_account_id, stripe_onboarding_complete, stripe_charges_enabled, provider_description, provider_address, provider_phone").eq("id", currentOrg.id).single(),
        supabase.from("hotel_providers").select("distance_km, is_active, hotels(id, name, address, slug)").eq("organization_id", currentOrg.id).eq("is_active", true),
        supabase.from("bookings").select("booking_number, total_price, platform_commission, status, created_at, guest_name, start_date, end_date, booking_source, hotels(name), bike:bikes(name)").eq("organization_id", currentOrg.id).eq("booking_source", "hotel_qr").order("created_at", { ascending: false }).limit(20),
      ]);
      setOrg(orgData);
      setHotels(hotelsData || []);
      setBookings(bookingsData || []);
      if (orgData) {
        setProfile({ provider_description: orgData.provider_description || "", provider_address: orgData.provider_address || "", provider_phone: orgData.provider_phone || "" });
      }
      setLoading(false);
    }
    load();
  }, [currentOrg?.id]);

  async function saveProfile() {
    setSavingProfile(true);
    await supabase.from("organizations").update({ provider_description: profile.provider_description || null, provider_address: profile.provider_address || null, provider_phone: profile.provider_phone || null }).eq("id", currentOrg.id);
    setSavingProfile(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  }

  const totalRevenue = bookings.reduce((s, b) => s + (b.total_price || 0), 0);
  const totalCommission = bookings.reduce((s, b) => s + (b.platform_commission || 0), 0);
  const netRevenue = totalRevenue - totalCommission;

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? "bg-slate-900" : "bg-slate-50"}`}>
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 ${darkMode ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-900"}`}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Store className={`w-7 h-7 ${darkMode ? "text-indigo-400" : "text-indigo-600"}`} />
          <div>
            <h1 className="text-2xl font-bold">Marktplatz</h1>
            <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Lociva Buchungsplattform für Hotelgäste</p>
          </div>
        </div>

        {/* Section 1: Platform Status */}
        <div className={`border rounded-xl p-5 mb-6 ${card}`}>
          <h2 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Plattform-Status</h2>
          {!org?.is_platform_provider ? (
            <div className={`rounded-xl p-4 border ${darkMode ? "bg-slate-700/50 border-slate-600" : "bg-slate-50 border-slate-200"}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                <span className="font-semibold text-slate-400">Nicht registriert</span>
              </div>
              <p className={`text-sm mb-3 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                Ihr Betrieb ist noch nicht auf der Lociva Buchungsplattform registriert. Kontaktieren Sie uns, um Hotelgäste in Ihrer Region zu erreichen.
              </p>
              <p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Kontakt: <span className="text-indigo-400">info@lociva.de</span></p>
            </div>
          ) : !org?.stripe_charges_enabled ? (
            <div className="rounded-xl p-4 border border-yellow-700/50 bg-yellow-900/20">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-yellow-400" />
                <span className="font-semibold text-yellow-400">Stripe-Onboarding ausstehend</span>
              </div>
              <p className="text-sm text-yellow-300/80 mb-3">
                Um Buchungen empfangen und automatische Auszahlungen erhalten zu können, schließen Sie bitte das Stripe-Onboarding ab.
              </p>
              <button disabled className="px-4 py-2 bg-yellow-600/50 text-yellow-200 rounded-lg text-sm cursor-not-allowed">
                Stripe-Onboarding starten (demnächst verfügbar)
              </button>
            </div>
          ) : (
            <div className="rounded-xl p-4 border border-green-700/50 bg-green-900/20">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                <span className="font-semibold text-green-400">Aktiv auf der Plattform</span>
              </div>
              <div className="flex gap-4 flex-wrap">
                <span className="flex items-center gap-1.5 text-sm text-green-300"><CheckCircle className="w-4 h-4" /> Stripe aktiv</span>
                <span className="flex items-center gap-1.5 text-sm text-green-300"><CheckCircle className="w-4 h-4" /> Auszahlungen aktiviert</span>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Linked Hotels */}
        <div className={`border rounded-xl p-5 mb-6 ${card}`}>
          <h2 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Verknüpfte Hotels</h2>
          {hotels.length === 0 ? (
            <p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Noch keine Hotels verknüpft. Der Plattform-Admin ordnet Hotels zu.</p>
          ) : (
            <div className="space-y-2">
              {hotels.map((hp, i) => (
                <div key={i} className={`flex items-center justify-between p-3 rounded-lg ${darkMode ? "bg-slate-700/50" : "bg-slate-50"}`}>
                  <div className="flex items-center gap-3">
                    <Building2 className={`w-4 h-4 flex-shrink-0 ${darkMode ? "text-slate-400" : "text-slate-500"}`} />
                    <div>
                      <p className="font-medium text-sm">{hp.hotels?.name}</p>
                      {hp.hotels?.address && <p className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{hp.hotels.address}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {hp.distance_km && <span className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{hp.distance_km} km</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 3: Platform Bookings */}
        {bookings.length > 0 && (
          <div className={`border rounded-xl overflow-hidden mb-6 ${card}`}>
            <div className={`px-5 py-4 border-b ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
              <div className="flex items-center justify-between">
                <h2 className={`text-xs font-semibold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Plattform-Buchungen</h2>
                <div className="flex gap-4 text-xs">
                  <span className={darkMode ? "text-slate-400" : "text-slate-500"}>Brutto: <strong className={darkMode ? "text-white" : "text-slate-800"}>{formatEur(totalRevenue)}</strong></span>
                  <span className={darkMode ? "text-slate-400" : "text-slate-500"}>Provision: <strong className="text-red-400">−{formatEur(totalCommission)}</strong></span>
                  <span className={darkMode ? "text-slate-400" : "text-slate-500"}>Netto: <strong className="text-green-400">{formatEur(netRevenue)}</strong></span>
                </div>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead className={`border-b ${darkMode ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-slate-50"}`}>
                <tr>
                  {["Datum", "Hotel", "Gast", "Fahrrad", "Zeitraum", "Betrag", "Provision", "Status"].map(h => (
                    <th key={h} className={`text-left px-4 py-3 text-xs font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b.booking_number} className={`border-b last:border-0 ${darkMode ? "border-slate-700 hover:bg-slate-700/30" : "border-slate-100 hover:bg-slate-50"}`}>
                    <td className="px-4 py-3 text-xs text-slate-400">{new Date(b.created_at).toLocaleDateString("de-DE")}</td>
                    <td className="px-4 py-3 text-sm">{b.hotels?.name || "–"}</td>
                    <td className="px-4 py-3 text-sm">{b.guest_name || "–"}</td>
                    <td className="px-4 py-3 text-sm">{b.bike?.name || "–"}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{b.start_date} – {b.end_date}</td>
                    <td className="px-4 py-3 font-semibold">{formatEur(b.total_price)}</td>
                    <td className="px-4 py-3 text-sm text-red-400">−{formatEur(b.platform_commission)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[b.status] || "bg-slate-700 text-slate-400"}`}>{b.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Section 4: Cancellation Policy */}
        <div className="mb-6">
          <CancellationPolicyVisualizer darkMode={darkMode} />
        </div>

        {/* Section 5: Public Profile */}
        <div className={`border rounded-xl p-5 ${card}`}>
          <h2 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Mein Profil (für Hotelgäste)</h2>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Beschreibung</label>
              <textarea rows={3} className={inputCls} value={profile.provider_description} onChange={(e) => setProfile(p => ({ ...p, provider_description: e.target.value }))} placeholder="Beschreiben Sie Ihr Angebot für Hotelgäste..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Adresse</label>
                <input className={inputCls} value={profile.provider_address} onChange={(e) => setProfile(p => ({ ...p, provider_address: e.target.value }))} placeholder="Hauptstr. 1, 65779 Kelkheim" />
              </div>
              <div>
                <label className={labelCls}>Telefon</label>
                <input className={inputCls} value={profile.provider_phone} onChange={(e) => setProfile(p => ({ ...p, provider_phone: e.target.value }))} placeholder="+49 6195 123456" />
              </div>
            </div>
            <button onClick={saveProfile} disabled={savingProfile} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              {profileSaved ? <CheckCircle className="w-4 h-4 text-green-300" /> : <Save className="w-4 h-4" />}
              {savingProfile ? "Speichern..." : profileSaved ? "Gespeichert!" : "Profil speichern"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
