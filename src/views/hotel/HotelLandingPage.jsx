"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/utils/supabase";

// ============================================================
// TRANSLATIONS
// ============================================================
const T = {
  de: {
    title: "Fahrräder & E-Bikes",
    subtitle: "Für Gäste des",
    selectBike: "Auswählen",
    perDay: "/ Tag",
    from: "Von",
    to: "Bis",
    totalPrice: "Gesamtpreis",
    yourDetails: "Ihre Kontaktdaten",
    name: "Vollständiger Name",
    email: "E-Mail",
    phone: "Telefon (optional)",
    toPayment: "Verbindlich buchen",
    back: "Zurück",
    loading: "Lädt...",
    notFound: "Hotel nicht gefunden",
    bookingConfirmed: "Buchung bestätigt!",
    bookingNumber: "Buchungsnummer",
    confirmationSent: "Bestätigung wurde an Ihre E-Mail gesendet.",
    deposit: "Kaution",
    depositInfo: "Die Kaution wird vor Ort beim Abholen bezahlt.",
    pickupAt: "Abholung bei",
    bookAnother: "Weitere Buchung",
    noProviders: "Keine Anbieter verfügbar",
    selectDates: "Zeitraum wählen",
    days: "Tage",
    processing: "Wird verarbeitet...",
    errorOccurred: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
    availableBikes: "verfügbare Fahrräder",
    km: "km entfernt",
    step1: "Fahrrad",
    step2: "Zeitraum",
    step3: "Kontakt",
    poweredBy: "Powered by Lociva",
    bookNow: "Weiter",
    totalDays: "Tage",
  },
  en: {
    title: "Bikes & E-Bikes",
    subtitle: "For guests of",
    selectBike: "Select",
    perDay: "/ day",
    from: "From",
    to: "To",
    totalPrice: "Total price",
    yourDetails: "Your contact details",
    name: "Full name",
    email: "Email",
    phone: "Phone (optional)",
    toPayment: "Confirm booking",
    back: "Back",
    loading: "Loading...",
    notFound: "Hotel not found",
    bookingConfirmed: "Booking confirmed!",
    bookingNumber: "Booking number",
    confirmationSent: "Confirmation was sent to your email.",
    deposit: "Deposit",
    depositInfo: "The deposit is paid in person at pickup.",
    pickupAt: "Pick up at",
    bookAnother: "Book another",
    noProviders: "No providers available",
    selectDates: "Select dates",
    days: "days",
    processing: "Processing...",
    errorOccurred: "An error occurred. Please try again.",
    availableBikes: "available bikes",
    km: "km away",
    step1: "Bike",
    step2: "Dates",
    step3: "Contact",
    poweredBy: "Powered by Lociva",
    bookNow: "Continue",
    totalDays: "days",
  },
};

// ============================================================
// MOCK DATA (fallback for /hotel/demo or development)
// ============================================================
const MOCK_DATA = {
  hotel: { id: "mock-hotel-1", name: "Hotel Zum Taunus", address: "Taunusstr. 1, 65779 Kelkheim", slug: "demo" },
  providers: [
    {
      id: "mock-prov-1",
      name: "Rhein-Main Bikes",
      provider_description: "Ihr E-Bike Spezialist im Taunus. Qualitätsräder für jeden Anspruch.",
      provider_address: "Hauptstr. 42, 65779 Kelkheim",
      provider_phone: "+49 6195 123456",
      distance_km: 0.8,
      bikes: [
        { id: "mock-bike-1", name: "Trek Marlin 7", category: "Mountainbike", price_per_day: 35, deposit: 100, image_url: null },
        { id: "mock-bike-2", name: "Haibike Trekking 6", category: "E-Bike", price_per_day: 55, deposit: 200, image_url: null },
        { id: "mock-bike-3", name: "Ghost Kato", category: "City-Bike", price_per_day: 25, deposit: 80, image_url: null },
      ],
    },
    {
      id: "mock-prov-2",
      name: "Taunus Radwelt",
      provider_description: "Familienfreundlicher Fahrradverleih seit 2010.",
      provider_address: "Bahnhofstr. 7, 65830 Kriftel",
      provider_phone: "+49 6192 987654",
      distance_km: 2.4,
      bikes: [
        { id: "mock-bike-4", name: "Cube Touring", category: "Trekking", price_per_day: 30, deposit: 100, image_url: null },
        { id: "mock-bike-5", name: "Giant Quick E+", category: "E-Bike", price_per_day: 60, deposit: 250, image_url: null },
      ],
    },
  ],
};

// ============================================================
// HELPERS
// ============================================================
function formatEur(n) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

const CATEGORY_EMOJI = { "E-Bike": "⚡", Mountainbike: "🏔️", "City-Bike": "🏙️", Trekking: "🌿" };

// ============================================================
// STEP INDICATOR
// ============================================================
function StepIndicator({ current, t }) {
  const steps = [t.step1, t.step2, t.step3];
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {steps.map((label, i) => {
        const idx = i + 1;
        const done = idx < current;
        const active = idx === current;
        return (
          <div key={idx} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${done ? "bg-green-500 text-white" : active ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-400"}`}>
                {done ? "✓" : idx}
              </div>
              <span className={`text-xs ${active ? "text-indigo-400" : "text-slate-500"}`}>{label}</span>
            </div>
            {i < steps.length - 1 && <div className={`w-8 h-px mb-4 ${done ? "bg-green-500" : "bg-slate-700"}`} />}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// BIKE CARD
// ============================================================
function BikeCard({ bike, onSelect, t }) {
  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden flex-shrink-0 w-52 border border-slate-700 hover:border-indigo-500 transition-colors">
      {bike.image_url ? (
        <img src={bike.image_url} alt={bike.name} className="w-full h-40 object-cover" />
      ) : (
        <div className="w-full h-40 bg-slate-700 rounded-t-xl flex flex-col items-center justify-center gap-2">
          <span className="text-5xl">{CATEGORY_EMOJI[bike.category] || "🚲"}</span>
          <span className="text-xs text-slate-400 font-medium">{bike.category}</span>
        </div>
      )}
      <div className="p-3">
        <div className="flex items-start justify-between gap-1 mb-1">
          <h4 className="font-semibold text-white text-sm leading-tight">{bike.name}</h4>
          <span className="text-xs bg-indigo-900/60 text-indigo-300 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">{bike.category}</span>
        </div>
        <p className="text-indigo-400 font-bold text-base mb-3">
          {formatEur(bike.price_per_day)} <span className="text-slate-400 font-normal text-xs">{t.perDay}</span>
        </p>
        <button
          onClick={() => onSelect(bike)}
          className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium py-2 rounded-lg transition-colors"
        >
          {t.selectBike}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// PROVIDER CARD
// ============================================================
function ProviderCard({ provider, onSelectBike, t }) {
  return (
    <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 mb-4">
      <div className="mb-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-bold text-white text-base">{provider.name}</h3>
          {provider.distance_km && (
            <span className="text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded-full whitespace-nowrap">
              {provider.distance_km} {t.km}
            </span>
          )}
        </div>
        {provider.provider_description && (
          <p className="text-slate-400 text-sm mb-1">{provider.provider_description}</p>
        )}
        {provider.provider_address && (
          <p className="text-slate-500 text-xs">📍 {provider.provider_address}</p>
        )}
        {provider.provider_phone && (
          <p className="text-slate-500 text-xs">📞 {provider.provider_phone}</p>
        )}
      </div>
      {provider.bikes && provider.bikes.length > 0 ? (
        <>
          <p className="text-xs text-slate-400 mb-2">{provider.bikes.length} {t.availableBikes}</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {provider.bikes.map((bike) => (
              <BikeCard key={bike.id} bike={bike} onSelect={onSelectBike} t={t} />
            ))}
          </div>
        </>
      ) : (
        <p className="text-slate-500 text-sm italic">Keine Fahrräder verfügbar</p>
      )}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function HotelLandingPage({ slug }) {
  const [lang, setLang] = useState("de");
  const t = T[lang];

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [hotelData, setHotelData] = useState(null);

  // Booking flow state
  const [step, setStep] = useState(1);
  const [selectedBike, setSelectedBike] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  const [sessionId] = useState(() =>
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36)
  );

  // ---- Stripe return: ?session_id= in URL → show confirmation ----
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("session_id")) {
      setConfirmedBooking({ booking_number: null, total_price: null, deposit_amount: null });
      setStep(4);
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (params.get("cancelled")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // ---- Fetch hotel data ----
  useEffect(() => {
    async function fetchHotel() {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc("get_hotel_with_providers", { p_hotel_slug: slug });
        if (error || !data) {
          if (slug === "demo") { setHotelData(MOCK_DATA); }
          else { setNotFound(true); }
        } else {
          setHotelData(data);
        }
      } catch {
        if (slug === "demo") { setHotelData(MOCK_DATA); }
        else { setNotFound(true); }
      } finally {
        setLoading(false);
      }
    }
    fetchHotel();
  }, [slug]);

  // ---- Analytics ----
  const trackEvent = useCallback(async (eventType, metadata = {}) => {
    if (!hotelData?.hotel?.id) return;
    try {
      await supabase.rpc("track_analytics_event", {
        p_hotel_id: hotelData.hotel.id,
        p_event_type: eventType,
        p_session_id: sessionId,
        p_metadata: metadata,
      });
    } catch { /* silently fail */ }
  }, [hotelData, sessionId]);

  useEffect(() => { if (hotelData) trackEvent("qr_scan"); }, [hotelData, trackEvent]);

  // ---- Derived ----
  const totalDays = startDate && endDate
    ? Math.max(0, Math.floor((new Date(endDate) - new Date(startDate)) / 86400000) + 1)
    : 0;
  const totalPrice = totalDays > 0 && selectedBike ? totalDays * selectedBike.price_per_day : 0;

  // ---- Handlers ----
  function handleSelectBike(bike, provider) {
    setSelectedBike(bike);
    setSelectedProvider(provider);
    setStep(2);
    trackEvent("booking_start", { bike_id: bike.id });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!guestName.trim() || !guestEmail.trim()) return;
    setSubmitting(true);
    setSubmitError("");

    // Demo / dev: direct RPC (no Stripe)
    if (slug === "demo" || process.env.NODE_ENV === "development") {
      try {
        const { data, error } = await supabase.rpc("create_guest_booking", {
          p_organization_id: selectedProvider.id,
          p_bike_id: selectedBike.id,
          p_hotel_id: hotelData.hotel.id,
          p_start_date: startDate,
          p_end_date: endDate,
          p_guest_name: guestName.trim(),
          p_guest_email: guestEmail.trim(),
          p_guest_phone: guestPhone.trim() || null,
          p_language: lang,
        });
        const booking = data ?? { booking_number: "DEMO-" + Math.floor(1000 + Math.random() * 9000), total_price: totalPrice, deposit_amount: selectedBike.deposit };
        setConfirmedBooking(booking);
        trackEvent("booking_complete");
        setStep(4);
      } catch {
        setSubmitError(t.errorOccurred);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Production: Stripe Checkout
    try {
      trackEvent("booking_start", { bike_id: selectedBike.id });
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bike_id:    selectedBike.id,
          hotel_id:   hotelData.hotel.id,
          org_id:     selectedProvider.id,
          start_date: startDate,
          end_date:   endDate,
          guest_name:  guestName.trim(),
          guest_email: guestEmail.trim(),
          guest_phone: guestPhone.trim() || null,
          lang,
          hotel_slug: slug,
        }),
      });
      const json = await res.json();
      if (json.error || !json.url) {
        setSubmitError(json.error || t.errorOccurred);
        setSubmitting(false);
        return;
      }
      window.location.href = json.url; // Redirect to Stripe Checkout
    } catch {
      setSubmitError(t.errorOccurred);
      setSubmitting(false);
    }
  }

  function handleReset() {
    setStep(1); setSelectedBike(null); setSelectedProvider(null);
    setStartDate(""); setEndDate(""); setGuestName(""); setGuestEmail("");
    setGuestPhone(""); setConfirmedBooking(null); setSubmitError("");
  }

  // ---- Render ----
  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400">{t.loading}</p>
      </div>
    </div>
  );

  if (notFound || !hotelData) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold text-white mb-2">{t.notFound}</h1>
        <p className="text-slate-400">Bitte überprüfen Sie den QR-Code und versuchen Sie es erneut.</p>
      </div>
    </div>
  );

  const { hotel, providers } = hotelData;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">{t.subtitle}</p>
            <h1 className="font-bold text-white text-base leading-tight">{hotel.name}</h1>
          </div>
          <div className="flex bg-slate-700 rounded-lg p-0.5">
            {["de", "en"].map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${lang === l ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}>
                {l === "de" ? "🇩🇪 DE" : "🇬🇧 EN"}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pb-12">
        {step > 1 && step < 4 && <StepIndicator current={step - 1} t={t} />}

        {/* STEP 1 — Bike Listing */}
        {step === 1 && (
          <div className="pt-6">
            <h2 className="text-xl font-bold text-white mb-1">{t.title}</h2>
            {hotel.address && <p className="text-slate-400 text-sm mb-6">📍 {hotel.address}</p>}
            {!providers || providers.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🚲</div>
                <p className="text-slate-400">{t.noProviders}</p>
              </div>
            ) : providers.map((provider) => (
              <ProviderCard key={provider.id} provider={provider}
                onSelectBike={(bike) => handleSelectBike(bike, provider)} t={t} />
            ))}
          </div>
        )}

        {/* STEP 2 — Date Picker */}
        {step === 2 && selectedBike && (
          <div className="pt-4">
            <div className="bg-slate-800 rounded-xl p-4 mb-6 border border-slate-700 flex gap-3 items-center">
              <div className="w-16 h-16 bg-slate-700 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
                {selectedBike.image_url
                  ? <img src={selectedBike.image_url} alt={selectedBike.name} className="w-full h-full rounded-lg object-cover" />
                  : CATEGORY_EMOJI[selectedBike.category] || "🚲"}
              </div>
              <div>
                <p className="font-bold text-white">{selectedBike.name}</p>
                <p className="text-slate-400 text-sm">{selectedBike.category}</p>
                <p className="text-indigo-400 font-semibold">{formatEur(selectedBike.price_per_day)} {t.perDay}</p>
              </div>
            </div>

            <h2 className="text-lg font-bold text-white mb-4">{t.selectDates}</h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">{t.from}</label>
                <input type="date" min={todayISO()} value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); if (endDate && e.target.value > endDate) setEndDate(""); }}
                  className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">{t.to}</label>
                <input type="date" min={startDate || todayISO()} value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none" />
              </div>
            </div>

            {totalDays > 0 && (
              <div className="bg-slate-800 rounded-xl p-4 mb-6 border border-slate-700 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">{totalDays} {t.days} × {formatEur(selectedBike.price_per_day)}</span>
                  <span className="text-white font-semibold">{formatEur(totalPrice)}</span>
                </div>
                {selectedBike.deposit > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">{t.deposit}</span>
                      <span className="text-yellow-400">{formatEur(selectedBike.deposit)}</span>
                    </div>
                    <p className="text-xs text-slate-500">{t.depositInfo}</p>
                  </>
                )}
                <div className="border-t border-slate-700 pt-2 flex justify-between">
                  <span className="font-semibold text-white">{t.totalPrice}</span>
                  <span className="font-bold text-indigo-400 text-lg">{formatEur(totalPrice)}</span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 py-3 rounded-xl font-medium transition-colors">{t.back}</button>
              <button onClick={() => setStep(3)} disabled={totalDays < 1} className="flex-grow bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:text-slate-500 text-white py-3 rounded-xl font-semibold transition-colors">{t.bookNow}</button>
            </div>
          </div>
        )}

        {/* STEP 3 — Contact */}
        {step === 3 && (
          <div className="pt-4">
            <h2 className="text-lg font-bold text-white mb-2">{t.yourDetails}</h2>
            <div className="bg-slate-800 rounded-xl p-3 mb-5 border border-slate-700 text-sm">
              <p className="text-slate-300"><span className="text-slate-500">Fahrrad:</span> {selectedBike?.name}</p>
              <p className="text-slate-300"><span className="text-slate-500">Zeitraum:</span> {startDate} – {endDate} ({totalDays} {t.days})</p>
              <p className="text-indigo-400 font-semibold">{t.totalPrice}: {formatEur(totalPrice)}</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { label: t.name, key: "guestName", type: "text", required: true, value: guestName, setter: setGuestName, placeholder: "Max Mustermann" },
                { label: t.email, key: "guestEmail", type: "email", required: true, value: guestEmail, setter: setGuestEmail, placeholder: "max@beispiel.de" },
                { label: t.phone, key: "guestPhone", type: "tel", required: false, value: guestPhone, setter: setGuestPhone, placeholder: "+49 170 1234567" },
              ].map(({ label, key, type, required, value, setter, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm text-slate-400 mb-1">{label}{required ? " *" : ""}</label>
                  <input type={type} required={required} value={value} onChange={(e) => setter(e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none placeholder-slate-600" />
                </div>
              ))}
              {submitError && (
                <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg p-3 text-sm">{submitError}</div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep(2)} className="flex-1 border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 py-3 rounded-xl font-medium transition-colors">{t.back}</button>
                <button type="submit" disabled={submitting} className="flex-grow bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 text-white py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2">
                  {submitting
                    ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{t.processing}</>
                    : t.toPayment}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 4 — Confirmed */}
        {step === 4 && confirmedBooking && (
          <div className="pt-8 text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{t.bookingConfirmed}</h2>
            <p className="text-slate-400 mb-6">{t.confirmationSent}</p>
            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 text-left space-y-3 mb-6">
              {confirmedBooking.booking_number && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">{t.bookingNumber}</span>
                  <span className="font-mono font-bold text-indigo-400">{confirmedBooking.booking_number}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Fahrrad</span>
                <span className="text-white font-medium">{selectedBike?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Zeitraum</span>
                <span className="text-white text-sm">{startDate} – {endDate}</span>
              </div>
              <div className="border-t border-slate-700 pt-3 flex justify-between items-center">
                <span className="text-white font-semibold">{t.totalPrice}</span>
                <span className="text-indigo-400 font-bold text-xl">{formatEur(confirmedBooking.total_price)}</span>
              </div>
              {confirmedBooking.deposit_amount > 0 && (
                <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-3">
                  <p className="text-yellow-300 text-sm font-bold">{t.deposit}: {formatEur(confirmedBooking.deposit_amount)}</p>
                  <p className="text-yellow-400/70 text-xs mt-1">{t.depositInfo}</p>
                </div>
              )}
            </div>
            {selectedProvider && (
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 text-left mb-6">
                <p className="text-slate-400 text-xs mb-1">{t.pickupAt}</p>
                <p className="font-bold text-white">{selectedProvider.name}</p>
                {selectedProvider.provider_address && (
                  <>
                    <p className="text-slate-400 text-sm mt-1">📍 {selectedProvider.provider_address}</p>
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedProvider.provider_address)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-indigo-400 text-sm hover:text-indigo-300 mt-2 inline-block">
                      In Google Maps öffnen →
                    </a>
                  </>
                )}
              </div>
            )}
            <button onClick={handleReset} className="w-full border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 py-3 rounded-xl font-medium transition-colors">
              {t.bookAnother}
            </button>
          </div>
        )}

        <div className="mt-12 text-center">
          <p className="text-slate-600 text-xs">{t.poweredBy}</p>
        </div>
      </div>
    </div>
  );
}
