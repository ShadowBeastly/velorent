"use client";
import { useState, useEffect } from "react";
import { useApp } from "@/src/context/AppContext";
import { useOrganization } from "@/src/context/OrgContext";
import { supabase } from "@/src/utils/supabase";
import { Store, CheckCircle, XCircle, Clock, Building2, Save, Loader2, ExternalLink, Ban } from "lucide-react";
import CancellationPolicyVisualizer from "@/src/components/marketplace/CancellationPolicyVisualizer";
import { STRIPE_TRUSTED_PREFIXES } from "@/src/utils/constants";

function formatEur(n) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n || 0);
}

const STATUS_BADGE = {
  reserved:  "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  picked_up: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
  returned:  "bg-emerald-100 text-emerald-700 dark:bg-green-900/40 dark:text-green-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
};

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
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState("");
  const [agbModalOpen, setAgbModalOpen] = useState(false);
  const [agbAccepting, setAgbAccepting] = useState(false);
  const [cancelModal, setCancelModal] = useState(null); // { booking_id, guest_name, start_date, total_price }
  const [cancelType, setCancelType] = useState("free");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [commissionRates, setCommissionRates] = useState([]);

  const card = darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const inputCls = `w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#1A7D5A] ${darkMode ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-white border-slate-300 text-slate-900"}`;
  const labelCls = `block text-sm font-medium mb-1 ${darkMode ? "text-slate-300" : "text-slate-700"}`;

  // Handle return from Stripe Express Onboarding
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe_return") || params.get("stripe_refresh")) {
      window.history.replaceState({}, "", window.location.pathname);
      // Reload org data to pick up charges_enabled status
    }
  }, []);

  useEffect(() => {
    if (!currentOrg?.id) return;
    async function load() {
      setLoading(true);
      const [{ data: orgData }, { data: hotelsData }, { data: bookingsData }, { data: ratesData }] = await Promise.all([
        supabase.from("organizations").select("id, name, is_platform_provider, stripe_account_id, stripe_onboarding_complete, stripe_charges_enabled, provider_description, provider_address, provider_phone, agb_accepted_at").eq("id", currentOrg.id).single(),
        supabase.from("venue_providers").select("distance_km, is_active, venues(id, name, address, slug)").eq("organization_id", currentOrg.id).eq("is_active", true),
        supabase.from("bookings").select("id, booking_number, total_price, platform_commission, status, cancellation_status, created_at, guest_name, start_date, end_date, booking_source, venues(name), item:items(name)").eq("organization_id", currentOrg.id).eq("booking_source", "hotel_qr").order("created_at", { ascending: false }).limit(20),
        supabase.from("commission_rates").select("item_type, rate").eq("is_active", true),
      ]);
      setOrg(orgData);
      setHotels(hotelsData || []);
      setBookings(bookingsData || []);
      setCommissionRates(ratesData || []);
      if (orgData) {
        setProfile({ provider_description: orgData.provider_description || "", provider_address: orgData.provider_address || "", provider_phone: orgData.provider_phone || "" });
      }
      setLoading(false);
    }
    load();
  }, [currentOrg?.id]);

  async function handleStripeOnboarding() {
    setStripeLoading(true);
    setStripeError("");
    try {
      const res = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: org.id, org_email: currentOrg.email }),
      });
      const json = await res.json();
      if (json.error || !json.url) throw new Error(json.error || "Fehler beim Stripe-Onboarding");
      if (!STRIPE_TRUSTED_PREFIXES.some(prefix => json.url.startsWith(prefix))) {
        throw new Error("Ungültige Stripe-URL");
      }
      window.location.href = json.url;
    } catch (err) {
      setStripeError(err.message);
      setStripeLoading(false);
    }
  }

  async function acceptAgb() {
    setAgbAccepting(true);
    const now = new Date().toISOString();
    await supabase.from("organizations").update({ agb_accepted_at: now }).eq("id", currentOrg.id);
    setOrg(o => ({ ...o, agb_accepted_at: now }));
    setAgbAccepting(false);
    setAgbModalOpen(false);
  }

  function openCancelModal(b) {
    const hoursUntilStart = (new Date(b.start_date).getTime() - Date.now()) / 3600000;
    const defaultType = hoursUntilStart > 24 ? "free" : hoursUntilStart > 0 ? "partial" : "no_show";
    setCancelType(defaultType);
    setCancelError("");
    setCancelModal({ booking_id: b.id, guest_name: b.guest_name, start_date: b.start_date, total_price: b.total_price });
  }

  async function handleCancel() {
    setCancelling(true);
    setCancelError("");
    try {
      const res = await fetch("/api/stripe/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: cancelModal.booking_id, cancellation_type: cancelType }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setBookings(bs => bs.map(b => b.id === cancelModal.booking_id ? { ...b, status: "cancelled", cancellation_status: cancelType } : b));
      setCancelModal(null);
    } catch (err) {
      setCancelError(err.message);
    }
    setCancelling(false);
  }

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
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-[#1A7D5A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${darkMode ? "bg-[#1A7D5A]/20" : "bg-[#D4EDE2]"}`}>
            <Store className="w-5 h-5 text-[#1A7D5A]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Marktplatz</h2>
            <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Lociva Buchungsplattform für Hotelgäste</p>
          </div>
        </div>

        {/* Section 1: Platform Status */}
        <div className={`rounded-xl border p-5 ${card}`}>
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
              <p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Kontakt: <span className="text-[#1A7D5A]">info@lociva.de</span></p>
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
              {stripeError && (
                <p className="text-sm text-red-400 mb-2 flex items-center gap-1"><XCircle className="w-4 h-4" />{stripeError}</p>
              )}
              <button
                onClick={handleStripeOnboarding}
                disabled={stripeLoading}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 disabled:bg-yellow-700/50 text-slate-900 disabled:text-yellow-300 rounded-lg text-sm font-semibold transition-colors"
              >
                {stripeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                {stripeLoading ? "Wird gestartet..." : org?.stripe_account_id ? "Onboarding fortsetzen →" : "Mit Stripe verbinden →"}
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

        {/* AGB Banner */}
        {org?.is_platform_provider && !org?.agb_accepted_at && (
          <div className="rounded-xl p-4 border border-orange-700/50 bg-orange-900/20 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-orange-400 mb-1">Allgemeine Geschäftsbedingungen ausstehend</p>
                <p className="text-sm text-orange-300/80">Um auf der Lociva Plattform sichtbar zu sein und Buchungen zu empfangen, müssen Sie unsere AGB akzeptieren.</p>
              </div>
              <button
                onClick={() => setAgbModalOpen(true)}
                className="flex-shrink-0 px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                AGB ansehen & akzeptieren
              </button>
            </div>
          </div>
        )}

        {/* Section 2: Linked Hotels */}
        <div className={`rounded-xl border p-5 ${card}`}>
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
                      <p className="font-medium text-sm">{hp.venues?.name}</p>
                      {hp.venues?.address && <p className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{hp.venues.address}</p>}
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
          <div className={`rounded-xl border overflow-hidden ${card}`}>
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
                  {["Datum", "Hotel", "Gast", "Angebot", "Zeitraum", "Betrag", "Provision", "Status", ""].map(h => (
                    <th key={h} className={`text-left px-4 py-3 text-xs font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b.booking_number} className={`border-b last:border-0 ${darkMode ? "border-slate-700 hover:bg-slate-700/30" : "border-slate-100 hover:bg-slate-50"}`}>
                    <td className="px-4 py-3 text-xs text-slate-400">{new Date(b.created_at).toLocaleDateString("de-DE")}</td>
                    <td className="px-4 py-3 text-sm">{b.venues?.name || ""}</td>
                    <td className="px-4 py-3 text-sm">{b.guest_name || ""}</td>
                    <td className="px-4 py-3 text-sm">{b.item?.name || ""}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{b.start_date} - {b.end_date}</td>
                    <td className="px-4 py-3 font-semibold">{formatEur(b.total_price)}</td>
                    <td className="px-4 py-3 text-sm text-red-400">−{formatEur(b.platform_commission)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[b.status] || "bg-slate-700 text-slate-400"}`}>{b.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      {b.status !== "cancelled" && (
                        <button
                          onClick={() => openCancelModal(b)}
                          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
                          title="Stornieren"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Section 4: Cancellation Policy */}
        <CancellationPolicyVisualizer darkMode={darkMode} />

        {/* Section 5: Public Profile */}
        <div className={`rounded-xl border p-5 ${card}`}>
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
            <button onClick={saveProfile} disabled={savingProfile} className="flex items-center gap-2 bg-[#1A7D5A] hover:bg-[#3BAA82] disabled:bg-[#1E2D26]/40 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              {profileSaved ? <CheckCircle className="w-4 h-4 text-green-300" /> : <Save className="w-4 h-4" />}
              {savingProfile ? "Speichern..." : profileSaved ? "Gespeichert!" : "Profil speichern"}
            </button>
          </div>
        </div>
    </div>

    {/* Cancellation Modal */}
    {cancelModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className={`w-full max-w-md rounded-2xl shadow-2xl ${darkMode ? "bg-slate-800 text-white" : "bg-white text-slate-900"}`}>
          <div className={`px-6 py-4 border-b ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
            <h2 className="text-lg font-bold">Buchung stornieren</h2>
            <p className={`text-sm mt-0.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{cancelModal.guest_name} · {cancelModal.start_date}</p>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div className={`p-4 rounded-lg border ${cancelType === "free" ? "border-green-500/30 bg-green-500/10" : cancelType === "partial" ? "border-amber-500/30 bg-amber-500/10" : "border-red-500/30 bg-red-500/10"}`}>
              <p className="font-medium text-sm mb-1">
                {cancelType === "free" ? "Kostenlose Stornierung" : cancelType === "partial" ? "Teilstorno (< 24h vor Start)" : "No-Show"}
              </p>
              <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                {cancelType === "free" ? "100 % Rückerstattung, keine Provision. Start liegt mehr als 24h in der Zukunft." : cancelType === "partial" ? "50 % Rückerstattung, Provision auf den einbehaltenen Betrag. Start liegt weniger als 24h in der Zukunft." : "Kein Refund, volle Provision. Start liegt in der Vergangenheit."}
              </p>
            </div>
            <p className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
              Die Stornierungsstufe wird automatisch anhand des Buchungszeitraums ermittelt.
            </p>
            {cancelError && <p className="text-sm text-red-400 flex items-center gap-1"><XCircle className="w-4 h-4" />{cancelError}</p>}
          </div>
          <div className={`px-6 py-4 border-t flex justify-end gap-3 ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
            <button onClick={() => setCancelModal(null)} className={`px-4 py-2 rounded-lg text-sm font-medium ${darkMode ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900"}`}>Abbrechen</button>
            <button onClick={handleCancel} disabled={cancelling} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white rounded-lg text-sm font-semibold transition-colors">
              {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
              {cancelling ? "Wird storniert..." : "Stornierung bestätigen"}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* AGB Modal */}
    {agbModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className={`w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl shadow-2xl ${darkMode ? "bg-slate-800 text-white" : "bg-white text-slate-900"}`}>
          <div className={`flex items-center justify-between px-6 py-4 border-b ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
            <h2 className="text-lg font-bold">Allgemeine Geschäftsbedingungen für Anbieter</h2>
            <button onClick={() => setAgbModalOpen(false)} className={`text-xl leading-none ${darkMode ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-slate-800"}`}>✕</button>
          </div>
          <div className={`overflow-y-auto px-6 py-4 flex-1 text-sm space-y-4 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
            <p><strong>Stand: März 2026 · Lociva (funk-e.solutions, Christopher Funke)</strong></p>
            <div>
              <p className="font-semibold mb-1">1. Vermittlerrolle</p>
              <p>Lociva ist ein Buchungsvermittler und schließt keine eigenen Miet- oder Leistungsverträge ab. Der Vertrag kommt ausschließlich zwischen dem Gast und dem Anbieter zustande. Lociva haftet nicht für die erbrachten Leistungen der Anbieter.</p>
            </div>
            <div>
              <p className="font-semibold mb-1">2. Provisionsstruktur</p>
              <p>Für jede über die Lociva-Plattform vermittelte Buchung wird eine Provision fällig, die automatisch über Stripe abgerechnet wird:</p>
              {commissionRates.length > 0 ? (
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  {commissionRates.map((r) => (
                    <li key={r.item_type}>{r.item_type}: {(r.rate * 100).toFixed(0)} %</li>
                  ))}
                </ul>
              ) : (
                <p className={`text-xs mt-1 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Provisionssätze werden geladen…</p>
              )}
            </div>
            <div>
              <p className="font-semibold mb-1">3. Stripe Connect & Auszahlungen</p>
              <p>Anbieter müssen ein Stripe Express-Konto einrichten und das KYC-Verfahren von Stripe abschließen. Auszahlungen erfolgen automatisch nach dem von Stripe festgelegten Auszahlungsplan (wöchentlich, montags). Lociva hat keinen Zugriff auf die Kontodaten der Anbieter.</p>
            </div>
            <div>
              <p className="font-semibold mb-1">4. Stornierungsbedingungen</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li><strong>Mehr als 24h vor Beginn:</strong> Volle Rückerstattung an den Gast, keine Provision.</li>
                <li><strong>Weniger als 24h vor Beginn:</strong> 50 % werden einbehalten, Provision auf den einbehaltenen Betrag.</li>
                <li><strong>No-Show:</strong> Voller Betrag wird einbehalten, normale Provision.</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-1">5. Haftpflichtversicherung</p>
              <p>Der Anbieter verpflichtet sich, eine gültige Betriebshaftpflichtversicherung zu unterhalten, die alle über Lociva vermittelten Leistungen abdeckt.</p>
            </div>
            <div>
              <p className="font-semibold mb-1">6. Verfügbarkeit & Eigenverantwortung</p>
              <p>Der Anbieter ist selbst verantwortlich für die korrekte Pflege seiner Verfügbarkeiten. Doppelbuchungen oder nicht erfüllte Buchungen gehen zu Lasten des Anbieters.</p>
            </div>
            <div>
              <p className="font-semibold mb-1">7. Datenschutz</p>
              <p>Gastdaten (Name, E-Mail, Telefon) werden dem Anbieter ausschließlich zur Erfüllung der Buchung zur Verfügung gestellt und dürfen nicht für andere Zwecke genutzt werden.</p>
            </div>
          </div>
          <div className={`px-6 py-4 border-t flex items-center justify-between gap-4 ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
            <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Mit dem Klick auf &quot;AGB akzeptieren&quot; bestätigen Sie, diese Bedingungen gelesen und akzeptiert zu haben.</p>
            <button
              onClick={acceptAgb}
              disabled={agbAccepting}
              className="flex-shrink-0 px-5 py-2.5 bg-[#1A7D5A] hover:bg-[#3BAA82] disabled:bg-[#1E2D26]/40 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              {agbAccepting ? "Wird gespeichert..." : "AGB akzeptieren"}
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  );
}
