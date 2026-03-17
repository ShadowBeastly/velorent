"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/src/utils/supabase";

// ============================================================
// TRANSLATIONS
// ============================================================
const T = {
  de: {
    welcome: "Willkommen",
    welcomeSub: "Entdecke lokale Erlebnisse in deiner Nähe",
    demoBanner: "Demo-Modus — Keine echte Buchung",
    allProviders: "Alle Anbieter",
    selectBike: "Auswählen",
    perDay: "/ Tag",
    perHour: "/ Std",
    from: "Von",
    to: "Bis",
    trustCancel: "Kostenlose Stornierung bis 24h",
    trustSecure: "Sichere Zahlung via Stripe",
    poweredBy: "Powered by LOCIVA",
    // Step 2
    step1Label: "Auswahl",
    step2Label: "Datum",
    step3Label: "Bezahlen",
    rentalTypeDay: "Tagesweise",
    rentalTypeHour: "Stundenweise",
    selectDate: "Datum wählen",
    timeFrom: "Von",
    timeTo: "Bis",
    hours: "Stunden",
    days: "Tage",
    continue: "Weiter",
    back: "Zurück",
    // Step 3
    contactTitle: "Kontakt",
    stepOf: "Schritt {n} von 3",
    bookingSummary: "Buchungsübersicht",
    bike: "Fahrrad",
    period: "Zeitraum",
    totalPrice: "Gesamtpreis",
    cancelPolicy: "Stornierungsbedingungen:",
    cancelPolicyDetail: "> 24h: Kostenlos | < 24h: 50% | No-Show: Keine Erstattung",
    yourData: "Ihre Daten",
    name: "Ihr Name *",
    namePlaceholder: "Vor- und Nachname",
    email: "E-Mail *",
    emailPlaceholder: "beispiel@mail.de",
    phone: "Telefon (optional)",
    phonePlaceholder: "+49 123 456789",
    agbAccept: "Ich akzeptiere die",
    agb: "AGB",
    and: "und die",
    privacy: "Datenschutzerklärung",
    ofLociva: "von Lociva.",
    bookNow: "Jetzt kostenpflichtig buchen",
    sslHint: "Sichere SSL-verschlüsselte Buchung",
    processing: "Wird verarbeitet...",
    errorOccurred: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
    // Step 4
    confirmed: "Buchung bestätigt!",
    confirmedSub: "Vielen Dank für Ihr Vertrauen in Lociva. Wir freuen uns auf Sie!",
    bookingNumber: "Buchungsnummer",
    emailSent: "Eine Bestätigung wurde an Ihre E-Mail gesendet",
    pickupAddress: "Abholadresse",
    addToCalendar: "In Kalender eintragen",
    newBooking: "Neue Buchung",
    deposit: "Kaution",
    depositInfo: "Die Kaution wird vor Ort beim Abholen bezahlt.",
    loading: "Lädt...",
    notFound: "Hotel nicht gefunden",
    notFoundSub: "Bitte überprüfen Sie den QR-Code.",
    openMaps: "Route anzeigen",
    fromPrice: "ab",
  },
  en: {
    welcome: "Welcome",
    welcomeSub: "Discover local experiences nearby",
    demoBanner: "Demo mode — No real booking",
    allProviders: "All providers",
    selectBike: "Select",
    perDay: "/ day",
    perHour: "/ hr",
    from: "From",
    to: "To",
    trustCancel: "Free cancellation up to 24h",
    trustSecure: "Secure payment via Stripe",
    poweredBy: "Powered by LOCIVA",
    step1Label: "Selection",
    step2Label: "Date",
    step3Label: "Payment",
    rentalTypeDay: "By day",
    rentalTypeHour: "By hour",
    selectDate: "Select date",
    timeFrom: "From",
    timeTo: "To",
    hours: "hours",
    days: "days",
    continue: "Continue",
    back: "Back",
    contactTitle: "Contact",
    stepOf: "Step {n} of 3",
    bookingSummary: "Booking summary",
    bike: "Bike",
    period: "Period",
    totalPrice: "Total price",
    cancelPolicy: "Cancellation policy:",
    cancelPolicyDetail: "> 24h: Free | < 24h: 50% | No-show: No refund",
    yourData: "Your details",
    name: "Your name *",
    namePlaceholder: "First and last name",
    email: "Email *",
    emailPlaceholder: "example@mail.com",
    phone: "Phone (optional)",
    phonePlaceholder: "+49 123 456789",
    agbAccept: "I accept the",
    agb: "Terms",
    and: "and the",
    privacy: "Privacy Policy",
    ofLociva: "of Lociva.",
    bookNow: "Book now (binding)",
    sslHint: "Secure SSL-encrypted booking",
    processing: "Processing...",
    errorOccurred: "An error occurred. Please try again.",
    confirmed: "Booking confirmed!",
    confirmedSub: "Thank you for your trust in Lociva. We look forward to seeing you!",
    bookingNumber: "Booking number",
    emailSent: "A confirmation was sent to your email",
    pickupAddress: "Pickup address",
    addToCalendar: "Add to calendar",
    newBooking: "New booking",
    deposit: "Deposit",
    depositInfo: "The deposit is paid in person at pickup.",
    loading: "Loading...",
    notFound: "Hotel not found",
    notFoundSub: "Please check the QR code.",
    openMaps: "Get directions",
    fromPrice: "from",
  },
};

// ============================================================
// MOCK DATA
// ============================================================
const MOCK_DATA = {
  hotel: { id: "mock-hotel-1", name: "Flemings Hotel Frankfurt-Messe", address: "Eschenheimer Anlage 15, 60318 Frankfurt am Main", slug: "demo" },
  providers: [
    {
      id: "mock-prov-1", name: "Radhaus Niederrad",
      provider_description: "Premium E-Bike Verleih in Frankfurt.",
      provider_address: "Brückenstr. 12, 60594 Frankfurt-Niederrad",
      provider_phone: "+49 69 123456", distance_km: 1.2,
      bikes: [
        { id: "mock-bike-1", name: "Trek Rail 7", category: "E-MTB", price_per_day: 59, price_per_hour: 12, deposit: 200, image_url: null },
        { id: "mock-bike-2", name: "Haibike AllMtn 5", category: "E-Bike", price_per_day: 49, price_per_hour: 9, deposit: 150, image_url: null },
        { id: "mock-bike-3", name: "Trek FX 3", category: "City-Bike", price_per_day: 29, price_per_hour: 5, deposit: 80, image_url: null },
      ],
    },
    {
      id: "mock-prov-2", name: "Taunus E-Bike Verleih",
      provider_description: "Geführte Touren & Verleih im Taunus.",
      provider_address: "Louisenstr. 88, 61348 Bad Homburg",
      provider_phone: "+49 6172 987654", distance_km: 18.5,
      bikes: [
        { id: "mock-bike-4", name: "Cube Touring Hybrid", category: "Trekking", price_per_day: 35, price_per_hour: null, deposit: 100, image_url: null },
        { id: "mock-bike-5", name: "Riese & Müller Load", category: "Lastenrad", price_per_day: 65, price_per_hour: 10, deposit: 300, image_url: null },
      ],
    },
  ],
};

// ============================================================
// HELPERS
// ============================================================
function formatEur(n) { return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n); }
function todayISO() { return new Date().toISOString().split("T")[0]; }
function nowHHMM() { const d = new Date(); return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; }
function nextHalfHour(offsetHours = 0) {
  const d = new Date(); d.setMinutes(d.getMinutes() + offsetHours * 60);
  const m = d.getMinutes(); d.setMinutes(m < 30 ? 30 : 0); if (m >= 30) d.setHours(d.getHours() + 1);
  const h = d.getHours(); if (h >= 20) return "20:00"; if (h < 8) return "08:00";
  return `${String(h).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}
function generateTimeSlots() {
  const s = [];
  for (let h = 8; h <= 20; h++) { s.push(`${String(h).padStart(2,"0")}:00`); if (h < 20) s.push(`${String(h).padStart(2,"0")}:30`); }
  return s;
}
const TIME_SLOTS = generateTimeSlots();
function timeToMinutes(t) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }

// ============================================================
// SVG ICONS (compact)
// ============================================================
const I = {
  back: (p={}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m12 19-7-7 7-7M19 12H5"/></svg>,
  forward: (p={}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
  check: (p={}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 13l4 4L19 7"/></svg>,
  shield: (p={}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z"/><path d="m9 12 2 2 4-4"/></svg>,
  lock: (p={}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...p}><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  clock: (p={}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  mapPin: (p={}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>,
  mail: (p={}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...p}><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>,
  info: (p={}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>,
  calendar: (p={}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...p}><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  plus: (p={}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14M12 5v14"/></svg>,
  nav: (p={}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...p}><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>,
  bike: (p={}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm1 5h4l-2 6.5M2 17.5h3.5L8 6h4l2.5 6H15"/></svg>,
  bolt: (p={}) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M11.983 1.907a.75.75 0 0 1 .67.411l5.08 10.08a.75.75 0 0 1-.67 1.089H13.3l1.72 8.59a.75.75 0 0 1-1.345.56l-7.78-9.74a.75.75 0 0 1 .585-1.22h3.98l-1.72-8.59a.75.75 0 0 1 .668-.929h3.275Z"/></svg>,
  leaf: (p={}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 1.2 8.5C19.1 15 13.5 19 11 20Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>,
  mountain: (p={}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m8 3 4 8 5-5 5 15H2L8 3Z"/></svg>,
  city: (p={}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01"/></svg>,
  box: (p={}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/></svg>,
  search: (p={}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
};
const CAT_ICON = { "E-Bike": I.bolt, "Mountainbike": I.mountain, "City-Bike": I.city, "Trekking": I.leaf, "E-MTB": I.bolt, "Lastenrad": I.box };

// ============================================================
// MAIN
// ============================================================
export default function HotelLandingPage({ slug }) {
  const filterRef = useRef(null);
  const dragState = useRef({ active: false, startX: 0, scrollLeft: 0, moved: false });
  const [lang, setLang] = useState("de");
  const t = T[lang];
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [hotelData, setHotelData] = useState(null);
  const [step, setStep] = useState(1);
  const [selectedBike, setSelectedBike] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [rentalType, setRentalType] = useState("daily");
  const [bookingDate, setBookingDate] = useState(todayISO());
  const [startTime, setStartTime] = useState(() => nextHalfHour());
  const [endTime, setEndTime] = useState(() => nextHalfHour(2));
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [agbAccepted, setAgbAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [sessionId] = useState(() => typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36));

  const trackEvent = useCallback(async (eventType, metadata = {}) => {
    if (!hotelData?.hotel?.id) return;
    try { await supabase.rpc("track_analytics_event", { p_hotel_id: hotelData.hotel.id, p_event_type: eventType, p_session_id: sessionId, p_metadata: metadata }); } catch { /* silently fail */ }
  }, [hotelData, sessionId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("session_id");
    if (sid) { setConfirmedBooking({ booking_number: null, total_price: null, deposit_amount: null }); setStep(4); window.history.replaceState({}, "", window.location.pathname); if (hotelData?.hotel?.id) trackEvent("booking_complete", { stripe_session_id: sid }); }
    if (params.get("cancelled")) window.history.replaceState({}, "", window.location.pathname);
  }, [hotelData, trackEvent]);

  useEffect(() => {
    async function f() {
      setLoading(true);
      if (slug === "demo") { setHotelData(MOCK_DATA); setLoading(false); return; }
      try { const { data, error } = await supabase.rpc("get_hotel_with_providers", { p_hotel_slug: slug }); if (error || !data?.hotel) setNotFound(true); else setHotelData(data); }
      catch { setNotFound(true); } finally { setLoading(false); }
    }
    f();
  }, [slug]);

  useEffect(() => { if (hotelData) { trackEvent("qr_scan"); trackEvent("page_view"); } }, [hotelData, trackEvent]);

  const allCategories = useMemo(() => {
    if (!hotelData?.providers) return [];
    const c = new Set(); hotelData.providers.forEach(p => p.bikes?.forEach(b => c.add(b.category))); return [...c].sort();
  }, [hotelData]);

  const filteredProviders = useMemo(() => {
    if (!hotelData?.providers) return [];
    if (!activeCategory) return hotelData.providers;
    return hotelData.providers.map(p => ({ ...p, bikes: p.bikes?.filter(b => b.category === activeCategory) || [] })).filter(p => p.bikes.length > 0);
  }, [hotelData, activeCategory]);

  const totalDays = startDate && endDate ? Math.max(0, Math.floor((new Date(endDate) - new Date(startDate)) / 86400000) + 1) : 0;
  const totalHours = (() => { if (!startTime || !endTime) return 0; const d = (timeToMinutes(endTime) - timeToMinutes(startTime)) / 60; return d >= 1 ? d : 0; })();
  const totalPrice = (() => { if (!selectedBike) return 0; if (rentalType === "hourly") return totalHours > 0 ? totalHours * (selectedBike.price_per_hour || 0) : 0; return totalDays > 0 ? totalDays * selectedBike.price_per_day : 0; })();
  const step2Valid = rentalType === "daily" ? totalDays >= 1 : (bookingDate !== "" && totalHours >= 1);
  const periodLabel = rentalType === "hourly" ? `${bookingDate} · ${startTime}–${endTime} (${totalHours} ${t.hours})` : `${startDate} – ${endDate} (${totalDays} ${t.days})`;
  const priceSummary = rentalType === "hourly" ? `${totalHours} ${t.hours} · ${selectedBike?.name || ""}` : `${totalDays} ${t.days} · ${selectedBike?.name || ""}`;

  function handleSelectBike(bike, provider) { setSelectedBike(bike); setSelectedProvider(provider); setRentalType(bike.price_per_hour ? "hourly" : "daily"); setStep(2); trackEvent("booking_start", { bike_id: bike.id }); }
  function handleRentalTypeChange(type) { setRentalType(type); setStartDate(todayISO()); setEndDate(todayISO()); setBookingDate(todayISO()); setStartTime(nextHalfHour()); setEndTime(nextHalfHour(2)); }

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    if (!guestName.trim() || !guestEmail.trim()) return;
    setSubmitting(true); setSubmitError("");
    const sd = rentalType === "hourly" ? bookingDate : startDate;
    const ed = rentalType === "hourly" ? bookingDate : endDate;
    if (slug === "demo") {
      await new Promise(r => setTimeout(r, 900));
      setConfirmedBooking({ booking_number: "LOC-" + Math.floor(1000 + Math.random() * 9000), total_price: totalPrice, deposit_amount: selectedBike.deposit ?? 0 });
      setSubmitting(false); setStep(4); return;
    }
    try {
      trackEvent("booking_start", { bike_id: selectedBike.id });
      const res = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bike_id: selectedBike.id, hotel_id: hotelData.hotel.id, org_id: selectedProvider.id, start_date: sd, end_date: ed, guest_name: guestName.trim(), guest_email: guestEmail.trim(), guest_phone: guestPhone.trim() || null, lang, hotel_slug: slug, rental_type: rentalType, start_time: rentalType === "hourly" ? startTime : null, end_time: rentalType === "hourly" ? endTime : null, total_hours: rentalType === "hourly" ? totalHours : null }) });
      const json = await res.json();
      if (json.error || !json.url) { setSubmitError(json.error || t.errorOccurred); setSubmitting(false); return; }
      const TRUSTED = ["https://checkout.stripe.com/", "https://connect.stripe.com/"];
      if (!TRUSTED.some(p => json.url.startsWith(p))) { setSubmitError(t.errorOccurred); setSubmitting(false); return; }
      window.location.href = json.url;
    } catch { setSubmitError(t.errorOccurred); setSubmitting(false); }
  }

  function handleReset() {
    setStep(1); setSelectedBike(null); setSelectedProvider(null); setStartDate(""); setEndDate("");
    setRentalType("daily"); setBookingDate(""); setStartTime("09:00"); setEndTime("13:00");
    setGuestName(""); setGuestEmail(""); setGuestPhone(""); setAgbAccepted(false);
    setConfirmedBooking(null); setSubmitError(""); setActiveCategory(null);
  }

  const CatIcon = selectedBike ? (CAT_ICON[selectedBike.category] || I.bike) : I.bike;

  // ============== LOADING ==============
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f6f8f7]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full animate-spin" style={{ border: "3px solid #D4EDE2", borderTopColor: "#1A7D5A" }}/>
        <p className="text-sm text-slate-400">{t.loading}</p>
      </div>
    </div>
  );

  if (notFound || !hotelData) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f6f8f7] p-6">
      <div className="text-center">
        <div className="w-20 h-20 rounded-2xl bg-[#D4EDE2] flex items-center justify-center mx-auto mb-4"><I.search className="w-9 h-9 text-[#1A7D5A]"/></div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">{t.notFound}</h1>
        <p className="text-sm text-slate-500">{t.notFoundSub}</p>
      </div>
    </div>
  );

  const { hotel } = hotelData;

  return (
    <div className="relative mx-auto h-screen max-w-[430px] bg-white shadow-2xl overflow-x-hidden overflow-y-auto antialiased text-slate-900 select-none" style={{ WebkitTapHighlightColor: "transparent", cursor: "default", WebkitOverflowScrolling: "touch" }}>

      {/* ==================== STEP 1 — BROWSE ==================== */}
      {step === 1 && (<>
        {/* Header */}
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[#1A7D5A] text-xl uppercase" style={{ fontWeight: 200, letterSpacing: 8 }}>Lociva</h1>
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">{hotel.name}</span>
            </div>
            <div className="flex rounded-lg p-0.5 bg-slate-100">
              {["de","en"].map(l => (
                <button key={l} onClick={() => setLang(l)} className="px-2 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                  style={{ background: lang === l ? "#1A7D5A" : "transparent", color: lang === l ? "white" : "#6B7280" }}>{l.toUpperCase()}</button>
              ))}
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="relative h-[180px] w-full overflow-hidden bg-slate-900">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1E2D26] via-[#1A7D5A]/60 to-[#1E2D26]"/>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"/>
          <div className="relative flex h-full flex-col items-center justify-center text-center px-6">
            <h2 className="text-white text-2xl font-light mb-1">{t.welcome}</h2>
            <p className="text-white/60 text-sm">{t.welcomeSub}</p>
          </div>
        </section>

        {/* Demo banner */}
        {slug === "demo" && (
          <div className="bg-amber-50 px-4 py-2 flex items-center gap-2 border-b border-amber-200">
            <I.info className="w-4 h-4 text-amber-700"/>
            <span className="text-[12px] font-medium text-amber-800">{t.demoBanner}</span>
          </div>
        )}

        {/* Category filter — drag-to-scroll */}
        <div
          ref={filterRef}
          onMouseDown={e => { dragState.current = { active: true, startX: e.pageX, scrollLeft: filterRef.current.scrollLeft, moved: false }; filterRef.current.style.cursor = "grabbing"; }}
          onMouseMove={e => { const d = dragState.current; if (!d.active) return; e.preventDefault(); const dx = e.pageX - d.startX; filterRef.current.scrollLeft = d.scrollLeft - dx; if (Math.abs(dx) > 4) d.moved = true; }}
          onMouseUp={() => { dragState.current.active = false; if (filterRef.current) filterRef.current.style.cursor = "grab"; }}
          onMouseLeave={() => { dragState.current.active = false; if (filterRef.current) filterRef.current.style.cursor = "grab"; }}
          className="flex gap-2 py-4 pl-4 pr-6 overflow-x-auto select-none touch-pan-x"
          style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch", cursor: "grab" }}>
          {[null, ...allCategories].map(cat => {
            const active = activeCategory === cat;
            const label = cat === null ? t.allProviders : cat;
            return (
              <button key={cat ?? "__all"} type="button"
                onClick={() => { if (!dragState.current.moved) setActiveCategory(cat); }}
                className="shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
                style={{
                  background: active ? "#1A7D5A" : "white",
                  color: active ? "white" : "#1A7D5A",
                  border: `1.5px solid ${active ? "#1A7D5A" : "rgba(26,125,90,0.2)"}`,
                  pointerEvents: "auto",
                }}>
                {label}
              </button>
            );
          })}
        </div>

        {/* Providers + Bikes */}
        <div className="flex flex-col gap-6 px-4 pb-8">
          {filteredProviders.map(provider => (
            <div key={provider.id}>
              {/* Provider header */}
              <div className="flex items-center gap-2 mb-3">
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-slate-900 truncate">{provider.name}</h3>
                  {provider.provider_address && <p className="text-xs text-slate-500 truncate">{provider.provider_address}</p>}
                </div>
                {provider.distance_km != null && (
                  <span className="text-xs font-bold text-[#1A7D5A] bg-[#1A7D5A]/10 px-2 py-0.5 rounded whitespace-nowrap shrink-0">{provider.distance_km} km</span>
                )}
              </div>

              {/* Bike cards */}
              <div className="flex flex-col gap-3">
                {provider.bikes?.map(bike => {
                  const BikeIcon = CAT_ICON[bike.category] || I.bike;
                  return (
                    <div key={bike.id} className="bg-white rounded-xl shadow-sm border border-slate-100 flex p-3 relative">
                      {/* Image / Icon */}
                      {bike.image_url ? (
                        <img src={bike.image_url} alt={bike.name} className="w-[100px] h-[100px] shrink-0 overflow-hidden rounded-lg object-cover"/>
                      ) : (
                        <div className="w-[100px] h-[100px] shrink-0 rounded-lg bg-[#D4EDE2]/50 flex items-center justify-center">
                          <BikeIcon className="w-12 h-12 text-[#1A7D5A]"/>
                        </div>
                      )}
                      {/* Info */}
                      <div className="ml-3 flex flex-col flex-1 min-w-0">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#1A7D5A] bg-[#1A7D5A]/10 px-1.5 py-0.5 rounded">{bike.category}</span>
                          <h4 className="font-bold text-slate-900 truncate">{bike.name}</h4>
                        </div>
                        <div className="mt-auto">
                          <p className="text-[#1A7D5A] font-bold text-sm">{t.fromPrice} {formatEur(bike.price_per_day)} {t.perDay}</p>
                          {bike.price_per_hour && (
                            <p className="text-slate-400 text-[11px] flex items-center gap-1">
                              <I.clock className="w-3 h-3"/> {formatEur(bike.price_per_hour)} {t.perHour}
                            </p>
                          )}
                        </div>
                      </div>
                      {/* Select button */}
                      <button onClick={() => handleSelectBike(bike, provider)}
                        className="absolute right-3 bottom-3 bg-orange-500 hover:bg-orange-600 text-white text-[12px] font-bold px-4 py-1.5 rounded-full shadow-lg shadow-orange-200/50 transition-colors cursor-pointer">
                        {t.selectBike}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Trust badges */}
          <div className="mt-4 space-y-2 border-t border-slate-100 pt-6">
            <div className="flex items-center gap-3">
              <I.shield className="w-5 h-5 text-[#1A7D5A]"/>
              <span className="text-[12px] text-slate-500">{t.trustCancel}</span>
            </div>
            <div className="flex items-center gap-3">
              <I.lock className="w-5 h-5 text-[#1A7D5A]"/>
              <span className="text-[12px] text-slate-500">{t.trustSecure}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mb-8 text-center px-4">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest">{t.poweredBy} · lociva.de</p>
        </footer>
      </>)}

      {/* ==================== STEP 2 — DATE ==================== */}
      {step === 2 && selectedBike && (<>
        <header className="sticky top-0 z-30 bg-white pt-4 px-4 border-b border-[#1A7D5A]/10">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => setStep(1)} className="flex w-10 h-10 items-center justify-center rounded-full hover:bg-slate-100 transition-colors cursor-pointer" aria-label={t.back}>
              <I.back className="w-5 h-5 text-slate-900"/>
            </button>
            <div className="flex flex-col items-center">
              <h1 className="text-lg font-bold tracking-tight text-[#1A7D5A]">LOCIVA</h1>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">{hotel.name}</p>
            </div>
            <div className="w-10"/>
          </div>
          {/* Dot indicator */}
          <div className="flex w-full items-center justify-center gap-2 py-3">
            <div className="h-1.5 w-1.5 rounded-full bg-[#1A7D5A]"/>
            <div className="h-2.5 w-2.5 rounded-full bg-[#1A7D5A] ring-4 ring-[#1A7D5A]/20"/>
            <div className="h-1.5 w-1.5 rounded-full bg-slate-300"/>
          </div>
          {/* Step labels */}
          <nav className="flex justify-between items-center px-2 pb-2">
            <div className="flex flex-col items-center flex-1"><span className="text-[11px] font-bold text-[#1A7D5A]">{t.step1Label}</span><div className="h-1 w-full mt-2 rounded-full bg-[#1A7D5A]/20"/></div>
            <div className="flex flex-col items-center flex-1"><span className="text-[11px] font-bold text-[#1A7D5A]">{t.step2Label}</span><div className="h-1 w-full mt-2 rounded-full bg-[#1A7D5A]"/></div>
            <div className="flex flex-col items-center flex-1"><span className="text-[11px] font-bold text-slate-400">{t.step3Label}</span><div className="h-1 w-full mt-2 rounded-full bg-slate-100"/></div>
          </nav>
        </header>

        <main className="flex-1 p-4 space-y-5 pb-36">
          {/* Bike summary */}
          <div className="flex items-center gap-4 rounded-xl bg-white p-3 shadow-sm border border-[#1A7D5A]/5">
            <div className="h-16 w-16 rounded-lg bg-[#D4EDE2]/50 flex items-center justify-center shrink-0">
              {selectedBike.image_url ? <img src={selectedBike.image_url} alt={selectedBike.name} className="w-full h-full rounded-lg object-cover"/> : <CatIcon className="w-8 h-8 text-[#1A7D5A]"/>}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="flex justify-between items-start"><h3 className="font-bold text-slate-900 truncate">{selectedBike.name}</h3><span className="text-[#1A7D5A] font-bold">{formatEur(selectedBike.price_per_day)}</span></div>
              <p className="text-xs text-slate-500">{selectedProvider?.name}</p>
            </div>
          </div>

          {/* Rental toggle */}
          {selectedBike.price_per_hour && (
            <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
              {[{k:"daily",l:t.rentalTypeDay},{k:"hourly",l:t.rentalTypeHour}].map(({k,l})=>(
                <button key={k} onClick={() => handleRentalTypeChange(k)}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all cursor-pointer"
                  style={{ background: rentalType===k ? "#1A7D5A" : "transparent", color: rentalType===k ? "white" : "#6B7280", boxShadow: rentalType===k ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
                  {l}
                </button>
              ))}
            </div>
          )}

          {/* Date inputs */}
          {rentalType === "daily" ? (
            <div className="grid grid-cols-2 gap-3">
              <div><label htmlFor="sd" className="text-xs font-bold text-slate-500 ml-1 block mb-1.5">{t.from}</label>
                <input id="sd" type="date" min={todayISO()} value={startDate} onChange={e => { setStartDate(e.target.value); if (endDate && e.target.value > endDate) setEndDate(""); }}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold focus:border-[#1A7D5A] focus:ring-1 focus:ring-[#1A7D5A] outline-none transition-all"/></div>
              <div><label htmlFor="ed" className="text-xs font-bold text-slate-500 ml-1 block mb-1.5">{t.to}</label>
                <input id="ed" type="date" min={startDate||todayISO()} value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold focus:border-[#1A7D5A] focus:ring-1 focus:ring-[#1A7D5A] outline-none transition-all"/></div>
            </div>
          ) : (
            <div className="space-y-3">
              <div><label htmlFor="bd" className="text-xs font-bold text-slate-500 ml-1 block mb-1.5">{t.selectDate}</label>
                <input id="bd" type="date" min={todayISO()} value={bookingDate} onChange={e => setBookingDate(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold focus:border-[#1A7D5A] focus:ring-1 focus:ring-[#1A7D5A] outline-none transition-all"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label htmlFor="st" className="text-xs font-bold text-slate-500 ml-1 block mb-1.5">{t.timeFrom}</label>
                  <select id="st" value={startTime} onChange={e => { setStartTime(e.target.value); if (timeToMinutes(endTime)<=timeToMinutes(e.target.value)) { const ni=TIME_SLOTS.indexOf(e.target.value)+2; setEndTime(TIME_SLOTS[Math.min(ni,TIME_SLOTS.length-1)]); }}}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold focus:border-[#1A7D5A] focus:ring-1 focus:ring-[#1A7D5A] outline-none">
                    {TIME_SLOTS.filter(s=>s!=="20:00").map(s=>{
                      const past = bookingDate === todayISO() && s < nowHHMM();
                      return <option key={s} value={s} disabled={past}>{s}{past ? " ✕" : ""}</option>;
                    })}
                  </select></div>
                <div><label htmlFor="et" className="text-xs font-bold text-slate-500 ml-1 block mb-1.5">{t.timeTo}</label>
                  <select id="et" value={endTime} onChange={e => setEndTime(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold focus:border-[#1A7D5A] focus:ring-1 focus:ring-[#1A7D5A] outline-none">
                    {TIME_SLOTS.filter(s=>timeToMinutes(s)>timeToMinutes(startTime)).map(s=>{
                      const past = bookingDate === todayISO() && s < nowHHMM();
                      return <option key={s} value={s} disabled={past}>{s}{past ? " ✕" : ""}</option>;
                    })}
                  </select></div>
              </div>
            </div>
          )}

          {/* Duration pill */}
          {totalPrice > 0 && (
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1A7D5A]/10 border border-[#1A7D5A]/20 text-[#1A7D5A] text-xs font-bold">
                <I.clock className="w-4 h-4"/> {priceSummary} · {formatEur(totalPrice)}
              </div>
            </div>
          )}
        </main>

        {/* Sticky bottom */}
        <footer className="fixed bottom-0 left-0 right-0 mx-auto max-w-[430px] bg-white border-t border-slate-100 p-5 z-40">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-xl font-bold text-[#1A7D5A]">{totalPrice > 0 ? formatEur(totalPrice) : "—"}</span>
              {totalPrice > 0 && <p className="text-[10px] text-slate-500 font-medium">{priceSummary}</p>}
            </div>
            <button onClick={() => setStep(3)} disabled={!step2Valid}
              className="flex items-center gap-2 bg-[#1A7D5A] hover:bg-[#3BAA82] text-white px-8 py-3.5 rounded-full font-bold shadow-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
              style={{ boxShadow: step2Valid ? "0 4px 14px rgba(26,125,90,0.3)" : "none" }}>
              {t.continue} <I.forward className="w-5 h-5"/>
            </button>
          </div>
        </footer>
      </>)}

      {/* ==================== STEP 3 — CONTACT ==================== */}
      {step === 3 && (<>
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setStep(2)} className="flex w-10 h-10 items-center justify-center rounded-full hover:bg-slate-100 cursor-pointer" aria-label={t.back}>
              <I.back className="w-5 h-5 text-slate-900"/>
            </button>
            <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">{t.contactTitle} ({t.stepOf.replace("{n}", "3")})</h2>
          </div>
          <div className="flex w-full items-center justify-center gap-3 py-2">
            <div className="h-2 w-2 rounded-full bg-[#1A7D5A]/20"/><div className="h-2 w-2 rounded-full bg-[#1A7D5A]/20"/><div className="h-2 w-8 rounded-full bg-[#1A7D5A]"/>
          </div>
        </header>

        <main className="flex-1 px-4 space-y-5 pb-36">
          {/* Booking summary */}
          <section className="bg-[#1A7D5A]/5 rounded-xl p-4 border border-[#1A7D5A]/10">
            <h3 className="text-[#1A7D5A] text-sm font-bold uppercase tracking-wider mb-3">{t.bookingSummary}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-start"><span className="text-slate-500">{t.bike}</span><span className="font-medium text-right">{selectedBike?.name}</span></div>
              <div className="flex justify-between items-start"><span className="text-slate-500">{t.period}</span><span className="font-medium text-right">{periodLabel}</span></div>
              <div className="pt-2 mt-2 border-t border-[#1A7D5A]/10 flex justify-between items-center">
                <span className="font-bold">{t.totalPrice}</span><span className="text-[#1A7D5A] text-xl font-bold">{formatEur(totalPrice)}</span>
              </div>
            </div>
          </section>

          {/* Cancel policy */}
          <section className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex gap-2">
              <I.info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"/>
              <div className="text-xs text-amber-800 leading-snug">
                <p className="font-semibold mb-1">{t.cancelPolicy}</p>
                <p>{t.cancelPolicyDetail}</p>
              </div>
            </div>
          </section>

          {/* Form */}
          <section className="space-y-4">
            <h3 className="text-xl font-bold">{t.yourData}</h3>
            <label className="flex flex-col gap-1.5"><span className="text-slate-700 text-sm font-semibold">{t.name}</span>
              <input type="text" required value={guestName} onChange={e => setGuestName(e.target.value)} placeholder={t.namePlaceholder} autoComplete="name"
                className="w-full rounded-lg border border-slate-200 bg-white h-12 px-4 text-[16px] outline-none focus:border-[#1A7D5A] focus:ring-1 focus:ring-[#1A7D5A] transition-all select-text cursor-text"/></label>
            <label className="flex flex-col gap-1.5"><span className="text-slate-700 text-sm font-semibold">{t.email}</span>
              <input type="email" required value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder={t.emailPlaceholder} autoComplete="email"
                className="w-full rounded-lg border border-slate-200 bg-white h-12 px-4 text-[16px] outline-none focus:border-[#1A7D5A] focus:ring-1 focus:ring-[#1A7D5A] transition-all select-text cursor-text"/></label>
            <label className="flex flex-col gap-1.5"><span className="text-slate-700 text-sm font-semibold">{t.phone}</span>
              <input type="tel" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} placeholder={t.phonePlaceholder} autoComplete="tel"
                className="w-full rounded-lg border border-slate-200 bg-white h-12 px-4 text-[16px] outline-none focus:border-[#1A7D5A] focus:ring-1 focus:ring-[#1A7D5A] transition-all select-text cursor-text"/></label>
          </section>

          {/* AGB checkbox */}
          <label className="flex items-start gap-3 cursor-pointer pt-2">
            <input type="checkbox" checked={agbAccepted} onChange={e => setAgbAccepted(e.target.checked)}
              className="rounded border-slate-300 text-[#1A7D5A] focus:ring-[#1A7D5A] h-5 w-5 mt-0.5 cursor-pointer"/>
            <span className="text-xs text-slate-500 leading-normal">
              {t.agbAccept} <a href="/agb" className="text-[#1A7D5A] underline" target="_blank">{t.agb}</a> {t.and} <a href="/datenschutz" className="text-[#1A7D5A] underline" target="_blank">{t.privacy}</a> {t.ofLociva}
            </span>
          </label>

          {submitError && (
            <div className="flex items-start gap-2 rounded-xl p-3 text-sm bg-red-50 border border-red-200 text-red-700">
              <I.info className="w-4 h-4 flex-shrink-0 mt-0.5"/>{submitError}
            </div>
          )}
        </main>

        {/* Sticky bottom */}
        <footer className="fixed bottom-0 left-0 right-0 mx-auto max-w-[430px] bg-white/90 backdrop-blur-lg border-t border-slate-100 p-4 pb-6 z-40">
          <button onClick={handleSubmit} disabled={submitting || !guestName.trim() || !guestEmail.trim() || !agbAccepted}
            className="w-full bg-[#1A7D5A] hover:bg-[#3BAA82] text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
            style={{ boxShadow: "0 4px 14px rgba(26,125,90,0.2)" }}>
            {submitting ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>{t.processing}</>
            ) : (
              <><I.lock className="w-5 h-5"/>{t.bookNow}</>
            )}
          </button>
          <p className="text-center text-[10px] text-slate-400 mt-3">{t.sslHint}</p>
        </footer>
      </>)}

      {/* ==================== STEP 4 — CONFIRMED ==================== */}
      {step === 4 && confirmedBooking && (<>
        <style>{`
          /* ===== GPU LAYER PROMOTION ===== */
          .sc-orb,.sc-core,.sc-halo,.sc-ring1,.sc-ring2,.sc-ripple {
            will-change: transform, opacity;
            backface-visibility: hidden;
            -webkit-backface-visibility: hidden;
          }

          /* ===== ENTRANCE ===== */
          @keyframes orbLand {
            0%   { transform: scale(0); opacity:0; }
            65%  { transform: scale(1.15); opacity:1; }
            82%  { transform: scale(0.96); }
            100% { transform: scale(1); opacity:1; }
          }
          @keyframes checkStroke {
            0%,38% { stroke-dashoffset: 30; opacity:0; }
            42%    { opacity:1; }
            100%   { stroke-dashoffset: 0; opacity:1; }
          }


          @keyframes fadeSlideUp {
            0%   { opacity:0; transform:translateY(16px); }
            100% { opacity:1; transform:translateY(0); }
          }

          /* ===== BREATHING — pure sine-wave ===== */
          @keyframes coreBreathe {
            0%,100% { transform: scale(1);    box-shadow: 0 0 20px 0 rgba(26,125,90,0.18); }
            50%     { transform: scale(1.06); box-shadow: 0 0 36px 10px rgba(26,125,90,0.28); }
          }
          @keyframes haloBreathe {
            0%,100% { transform: scale(1);    opacity:0.08; }
            50%     { transform: scale(1.12); opacity:0.20; }
          }

          /* ===== WIRING ===== */
          .sc-orb {
            animation: orbLand .7s cubic-bezier(.34,1.56,.64,1) forwards;
          }
          .sc-core {
            animation: coreBreathe 4.5s 1.2s ease-in-out infinite;
          }
          .sc-halo {
            animation: haloBreathe 4.5s 1.2s ease-in-out infinite;
          }
          .sc-check {
            stroke-dasharray: 30; stroke-dashoffset: 30;
            animation: checkStroke .9s .3s ease-out forwards;
          }

          .fade-up-1 { animation: fadeSlideUp .5s .55s ease-out forwards; opacity:0; }
          .fade-up-2 { animation: fadeSlideUp .5s .7s ease-out forwards; opacity:0; }
          .fade-up-3 { animation: fadeSlideUp .5s .85s ease-out forwards; opacity:0; }
          .fade-up-4 { animation: fadeSlideUp .5s 1.0s ease-out forwards; opacity:0; }
          .fade-up-5 { animation: fadeSlideUp .5s 1.15s ease-out forwards; opacity:0; }

          @media (prefers-reduced-motion: reduce) {
            .sc-orb,.sc-core,.sc-halo,.sc-check,
            .fade-up-1,.fade-up-2,.fade-up-3,.fade-up-4,.fade-up-5
            { animation:none!important; opacity:1!important; transform:none!important; }
            .sc-check { stroke-dashoffset:0!important; }
          }
        `}</style>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center pt-16 pb-8">
          {/* Animated breathing success mark */}
          <div className="relative mb-10 flex items-center justify-center" style={{ width: 140, height: 140 }}>
            {/* Soft breathing halo */}
            <div className="absolute w-32 h-32 rounded-full bg-[#1A7D5A]/8 sc-halo"/>
            {/* Outer orb (entrance pop) */}
            <div className="sc-orb w-24 h-24 rounded-full flex items-center justify-center"
              style={{ background: "radial-gradient(circle at 40% 35%, rgba(26,125,90,0.14), rgba(26,125,90,0.04))" }}>
              {/* Inner core (breathing glow) */}
              <div className="sc-core w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(145deg, #22936a, #1A7D5A)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 sc-check"><path d="M5 13l4 4L19 7"/></svg>
              </div>
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-2 fade-up-1">{t.confirmed}</h1>
          <p className="text-slate-500 text-sm mb-8 fade-up-2">{t.confirmedSub}</p>

          {/* Booking ref */}
          {confirmedBooking.booking_number && (
            <div className="bg-[#1A7D5A]/5 border border-[#1A7D5A]/20 rounded-xl p-4 w-full mb-8 fade-up-3">
              <p className="text-[10px] uppercase tracking-widest text-[#1A7D5A] font-bold mb-1">{t.bookingNumber}</p>
              <p className="font-mono text-2xl text-[#1A7D5A] font-medium">{confirmedBooking.booking_number}</p>
            </div>
          )}

          {/* Email sent */}
          <div className="flex items-center gap-3 mb-8 text-slate-600 fade-up-3">
            <I.mail className="w-5 h-5 text-[#1A7D5A]"/>
            <p className="text-sm">{t.emailSent}</p>
          </div>

          {/* Pickup address */}
          {selectedProvider && (
            <div className="w-full bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col items-start gap-4 mb-8 text-left fade-up-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#1A7D5A]/10 flex items-center justify-center flex-shrink-0">
                  <I.mapPin className="w-5 h-5 text-[#1A7D5A]"/>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-tight">{t.pickupAddress}</p>
                  <p className="text-slate-800 font-medium">{selectedProvider.name}</p>
                  {selectedProvider.provider_address && <p className="text-sm text-slate-500">{selectedProvider.provider_address}</p>}
                </div>
              </div>
              {selectedProvider.provider_address && (
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedProvider.provider_address)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1A7D5A]/10 text-[#1A7D5A] text-sm font-semibold cursor-pointer hover:bg-[#1A7D5A]/20 transition-colors">
                  <I.nav className="w-4 h-4"/>{t.openMaps}
                </a>
              )}
            </div>
          )}

          {/* Deposit info */}
          {confirmedBooking.deposit_amount > 0 && (
            <div className="w-full bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-left">
              <p className="text-sm font-bold text-amber-800">{t.deposit}: {formatEur(confirmedBooking.deposit_amount)}</p>
              <p className="text-xs text-amber-700 mt-1">{t.depositInfo}</p>
            </div>
          )}

          {/* Actions */}
          <div className="w-full space-y-3 fade-up-5">
            <button onClick={handleReset}
              className="w-full bg-[#1A7D5A] text-white font-semibold py-4 rounded-xl hover:bg-[#3BAA82] transition-colors shadow-lg cursor-pointer flex items-center justify-center gap-2"
              style={{ boxShadow: "0 4px 14px rgba(26,125,90,0.2)" }}>
              <I.plus className="w-5 h-5"/>{t.newBooking}
            </button>
          </div>

          {/* Footer */}
          <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-8 fade-up-5">{t.poweredBy} · lociva.de</p>
        </div>
      </>)}
    </div>
  );
}
