"use client";
import { useState, useEffect, useRef } from "react";

const T = {
  de: {
    title: "Buchung stornieren",
    loading: "Buchung wird geladen...",
    notFound: "Buchung nicht gefunden",
    notFoundDesc: "Der Storno-Link ist ungültig oder abgelaufen.",
    bookingNumber: "Buchungsnummer",
    bike: "Artikel",
    period: "Zeitraum",
    total: "Gesamtbetrag",
    provider: "Anbieter",
    status: "Status",
    cancelFree: "Kostenlos stornieren",
    cancelFreeDesc: "Sie erhalten eine vollständige Rückerstattung.",
    cancelPartial: "Stornierung mit 50% Gebühr",
    cancelPartialDesc: "Da die Buchung in weniger als 24 Stunden beginnt, wird eine Stornogebühr von 50% berechnet.",
    alreadyCancelled: "Diese Buchung wurde bereits storniert.",
    confirmCancel: "Stornierung bestätigen",
    cancelSuccess: "Buchung erfolgreich storniert",
    fullRefund: "Eine vollständige Rückerstattung wird in 5-10 Werktagen auf Ihr Konto überwiesen.",
    partialRefund: "50% des Buchungsbetrags wird in 5-10 Werktagen auf Ihr Konto zurückerstattet.",
    back: "Zurück zum Hotel",
    processing: "Wird verarbeitet...",
    error: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
    days: "Tage",
    deposit: "Kaution",
    confirmed: "Bestätigt",
    cancelled: "Storniert",
    poweredBy: "Powered by Lociva",
  },
  en: {
    title: "Cancel Booking",
    loading: "Loading booking...",
    notFound: "Booking not found",
    notFoundDesc: "The cancellation link is invalid or expired.",
    bookingNumber: "Booking number",
    bike: "Item",
    period: "Period",
    total: "Total",
    provider: "Provider",
    status: "Status",
    cancelFree: "Cancel for free",
    cancelFreeDesc: "You will receive a full refund.",
    cancelPartial: "Cancel with 50% fee",
    cancelPartialDesc: "Since the booking starts in less than 24 hours, a 50% cancellation fee applies.",
    alreadyCancelled: "This booking has already been cancelled.",
    confirmCancel: "Confirm cancellation",
    cancelSuccess: "Booking cancelled successfully",
    fullRefund: "A full refund will be credited to your account within 5-10 business days.",
    partialRefund: "50% of the booking amount will be refunded to your account within 5-10 business days.",
    back: "Back to hotel",
    processing: "Processing...",
    error: "An error occurred. Please try again.",
    days: "days",
    deposit: "Deposit",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    poweredBy: "Powered by Lociva",
  },
};

const C = {
  primary: "#1A7D5A",
  light: "#3BAA82",
  tint: "#D4EDE2",
  dark: "#1E2D26",
  bg: "#F5FAF7",
  neutral: "#6B7280",
  danger: "#DC2626",
  dangerLight: "#FEE2E2",
  success: "#10B981",
};

function formatEur(n) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
}

export default function GuestCancelPage({ slug, token }) {
  const [lang, setLang] = useState("de");
  const t = T[lang];

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [cancelResult, setCancelResult] = useState(null);
  const cancellingRef = useRef(false);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch(`/api/booking/public?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setBooking(data);
      })
      .catch(() => setError("fetch_failed"))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleCancel() {
    if (cancellingRef.current) return;
    cancellingRef.current = true;
    setCancelling(true);
    setError(null);
    try {
      const res = await fetch("/api/booking/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setCancelled(true);
        setCancelResult(data);
      }
    } catch {
      setError("cancel_failed");
    } finally {
      cancellingRef.current = false;
      setCancelling(false);
    }
  }

  const alreadyCancelled = booking?.status === "cancelled" || (booking?.cancellation_status != null && booking?.cancellation_status !== "none");

  return (
    <div className="min-h-screen" style={{ background: C.bg, color: C.dark }}>
      {/* Header */}
      <header className="sticky top-0 z-10" style={{ background: "white", borderBottom: `1px solid ${C.tint}` }}>
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-bold text-base" style={{ color: C.dark }}>{t.title}</h1>
          <div className="flex rounded-lg p-0.5" style={{ background: C.tint }}>
            {["de", "en"].map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className="px-2 py-1 rounded-md text-xs font-medium transition-colors"
                style={{ background: lang === l ? C.primary : "transparent", color: lang === l ? "white" : C.neutral }}>
                {l === "de" ? "DE" : "EN"}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-8">
        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <div className="w-10 h-10 border-4 rounded-full animate-spin mx-auto mb-4"
              style={{ borderColor: C.tint, borderTopColor: C.primary }} />
            <p style={{ color: C.neutral }}>{t.loading}</p>
          </div>
        )}

        {/* Not found */}
        {!loading && (!token || error === "Booking not found" || error === "booking_not_found") && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🔍</div>
            <h2 className="text-xl font-bold mb-2" style={{ color: C.dark }}>{t.notFound}</h2>
            <p style={{ color: C.neutral }}>{t.notFoundDesc}</p>
          </div>
        )}

        {/* Cancellation success */}
        {cancelled && cancelResult && (
          <div className="text-center py-8">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: C.dangerLight }}>
              <svg className="w-10 h-10" style={{ color: C.danger }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: C.dark }}>{t.cancelSuccess}</h2>
            <p className="mb-2 font-mono font-bold" style={{ color: C.primary }}>#{cancelResult.booking_number}</p>
            <p className="mb-8" style={{ color: C.neutral }}>
              {cancelResult.cancellation_type === "free" ? t.fullRefund : t.partialRefund}
            </p>
            <a href={`/hotel/${slug}`}
              className="inline-block px-6 py-3 rounded-xl font-medium text-white transition-colors"
              style={{ background: C.primary }}>
              {t.back}
            </a>
          </div>
        )}

        {/* Booking details + cancel form */}
        {!loading && booking && !cancelled && (
          <div>
            {/* Booking summary card */}
            <div className="rounded-xl p-5 border mb-6" style={{ background: "white", borderColor: C.tint }}>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: C.neutral }}>{t.bookingNumber}</span>
                  <span className="font-mono font-bold" style={{ color: C.primary }}>{booking.booking_number}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: C.neutral }}>{t.bike}</span>
                  <span className="font-medium" style={{ color: C.dark }}>{booking.bike_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: C.neutral }}>{t.period}</span>
                  <span className="text-sm" style={{ color: C.dark }}>
                    {booking.start_date} - {booking.end_date} ({booking.total_days} {t.days})
                  </span>
                </div>
                {booking.provider_name && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm" style={{ color: C.neutral }}>{t.provider}</span>
                    <span className="text-sm" style={{ color: C.dark }}>{booking.provider_name}</span>
                  </div>
                )}
                <div className="pt-3 flex justify-between items-center" style={{ borderTop: `1px solid ${C.tint}` }}>
                  <span className="font-semibold" style={{ color: C.dark }}>{t.total}</span>
                  <span className="font-bold text-xl" style={{ color: C.primary }}>{formatEur(booking.total_price)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: C.neutral }}>{t.status}</span>
                  <span className="text-xs px-2 py-1 rounded-full font-medium"
                    style={{
                      background: alreadyCancelled ? C.dangerLight : C.tint,
                      color: alreadyCancelled ? C.danger : C.primary,
                    }}>
                    {alreadyCancelled ? t.cancelled : t.confirmed}
                  </span>
                </div>
              </div>
            </div>

            {/* Already cancelled */}
            {alreadyCancelled && (
              <div className="rounded-xl p-4 mb-6 text-center" style={{ background: C.dangerLight, border: `1px solid ${C.danger}20` }}>
                <p className="font-medium" style={{ color: C.danger }}>{t.alreadyCancelled}</p>
              </div>
            )}

            {/* Cancel action */}
            {!alreadyCancelled && (
              <div className="rounded-xl p-5 border" style={{ background: "white", borderColor: C.tint }}>
                {booking.can_cancel_free ? (
                  <>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: C.tint }}>
                        <span className="text-lg">✓</span>
                      </div>
                      <div>
                        <p className="font-semibold" style={{ color: C.dark }}>{t.cancelFree}</p>
                        <p className="text-sm" style={{ color: C.neutral }}>{t.cancelFreeDesc}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: "#FEF3C7" }}>
                        <span className="text-lg">⚠</span>
                      </div>
                      <div>
                        <p className="font-semibold" style={{ color: C.dark }}>{t.cancelPartial}</p>
                        <p className="text-sm" style={{ color: C.neutral }}>{t.cancelPartialDesc}</p>
                      </div>
                    </div>
                  </>
                )}

                {error && error !== "Booking not found" && error !== "booking_not_found" && (
                  <div className="rounded-lg p-3 text-sm mb-4" style={{ background: C.dangerLight, color: C.danger }}>
                    {t.error}
                  </div>
                )}

                <button onClick={handleCancel} disabled={cancelling}
                  className="w-full py-3 rounded-xl font-semibold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: C.danger }}>
                  {cancelling
                    ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{t.processing}</>
                    : t.confirmCancel}
                </button>
              </div>
            )}

            <div className="mt-6 text-center">
              <a href={`/hotel/${slug}`} className="text-sm font-medium" style={{ color: C.primary }}>
                ← {t.back}
              </a>
            </div>
          </div>
        )}

        <div className="mt-12 text-center">
          <p className="text-xs" style={{ color: C.neutral }}>{t.poweredBy}</p>
        </div>
      </div>
    </div>
  );
}
