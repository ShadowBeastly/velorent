/**
 * RentCoreWidget. 5-step embeddable booking flow
 *
 * Steps:
 *  1. bikes   - Grid of available bikes
 *  2. dates   - Date range + quantity + price preview
 *  3. customer - Name, email, phone, optional coupon code
 *  4. payment - Summary + Stripe Checkout redirect
 *  5. done    - Booking confirmation
 */

import React, { useState, useEffect, useCallback } from "react";
// Import CSS as a string and self-inject into the host page <head>
// This keeps embed.js fully self-contained (no separate style.css needed)
import cssText from "./widget.css?inline";

let _styleInjected = false;
function injectStyles() {
  if (_styleInjected || typeof document === "undefined") return;
  _styleInjected = true;
  const el = document.createElement("style");
  el.id = "rc-widget-styles";
  el.textContent = cssText;
  document.head.appendChild(el);
}
injectStyles();

const STEPS = [
  { key: "bikes",    label: { de: "Fahrrad", en: "Bike" } },
  { key: "dates",    label: { de: "Datum",   en: "Dates" } },
  { key: "customer", label: { de: "Daten",   en: "Details" } },
  { key: "payment",  label: { de: "Zahlung", en: "Payment" } },
  { key: "done",     label: { de: "Fertig",  en: "Done" } },
];

const T = {
  de: {
    title:           "Jetzt buchen",
    subtitle:        "Wählen Sie Ihr Fahrrad und buchen Sie online.",
    selectBike:      "Fahrrad wählen",
    perDay:          "/ Tag",
    available:       "Verfügbar",
    unavailable:     "Nicht verfügbar",
    from:            "Von",
    until:           "Bis",
    quantity:        "Anzahl",
    priceFor:        "Preis für",
    days:            "Tage",
    totalPrice:      "Gesamtpreis",
    deposit:         "Kaution",
    next:            "Weiter",
    back:            "Zurück",
    name:            "Name",
    email:           "E-Mail",
    phone:           "Telefon (optional)",
    coupon:          "Gutscheincode",
    applyCode:       "Einlösen",
    couponOk:        "Gutschein angewendet",
    couponErr:       "Ungültiger Code",
    summary:         "Buchungsübersicht",
    bike:            "Fahrrad",
    period:          "Zeitraum",
    toPayment:       "Zur Zahlung",
    loading:         "Lädt …",
    noBikes:         "Keine Fahrräder verfügbar.",
    errorLoad:       "Fehler beim Laden. Bitte erneut versuchen.",
    errorCheckout:   "Fehler beim Checkout. Bitte erneut versuchen.",
    successTitle:    "Buchung bestätigt!",
    successSub:      "Bestätigung wurde per E-Mail gesendet.",
    bookingCode:     "Buchungscode",
    poweredBy:       "Powered by",
    checkingAvail:   "Verfügbarkeit wird geprüft …",
    notAvailable:    "Dieses Fahrrad ist im gewählten Zeitraum leider nicht verfügbar.",
  },
  en: {
    title:           "Book now",
    subtitle:        "Choose your bike and book online.",
    selectBike:      "Select bike",
    perDay:          "/ day",
    available:       "Available",
    unavailable:     "Not available",
    from:            "From",
    until:           "Until",
    quantity:        "Quantity",
    priceFor:        "Price for",
    days:            "days",
    totalPrice:      "Total price",
    deposit:         "Deposit",
    next:            "Next",
    back:            "Back",
    name:            "Name",
    email:           "Email",
    phone:           "Phone (optional)",
    coupon:          "Coupon code",
    applyCode:       "Apply",
    couponOk:        "Coupon applied",
    couponErr:       "Invalid code",
    summary:         "Booking summary",
    bike:            "Bike",
    period:          "Period",
    toPayment:       "Proceed to payment",
    loading:         "Loading …",
    noBikes:         "No bikes available.",
    errorLoad:       "Failed to load. Please try again.",
    errorCheckout:   "Checkout failed. Please try again.",
    successTitle:    "Booking confirmed!",
    successSub:      "A confirmation was sent to your email.",
    bookingCode:     "Booking code",
    poweredBy:       "Powered by",
    checkingAvail:   "Checking availability …",
    notAvailable:    "This bike is not available for the selected dates.",
  },
};

function fmt(amount, lang) {
  return new Intl.NumberFormat(lang === "de" ? "de-DE" : "en-US", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function daysBetween(start, end) {
  if (!start || !end) return 0;
  const ms = new Date(end) - new Date(start);
  if (ms <= 0) return 0;
  return Math.ceil(ms / 86400000) + 1; // inclusive, matches daysDiff() in formatters.js
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

// ─────────────────────────────────────────────────────────────────────────────

export default function RentCoreWidget({ tenant, theme, lang, primaryColor, apiBase }) {
  const t = T[lang] ?? T.de;
  const dark = theme === "dark";

  const [step, setStep]           = useState(0); // index into STEPS
  const [bikes, setBikes]         = useState([]);
  const [loadingBikes, setLoadingBikes] = useState(true);
  const [errorBikes, setErrorBikes]     = useState(null);

  const [selectedBike, setSelectedBike] = useState(null);
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate]     = useState(addDays(today(), 2));
  const [quantity, setQuantity]   = useState(1);
  const [availability, setAvailability] = useState(null); // { available, conflict_count }
  const [checkingAvail, setCheckingAvail] = useState(false);

  const [customer, setCustomer] = useState({ name: "", email: "", phone: "" });
  const [couponCode, setCouponCode]   = useState("");
  const [couponStatus, setCouponStatus] = useState(null); // null | 'ok' | 'err'
  const [couponDiscount, setCouponDiscount] = useState(0);

  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);
  const [bookingCode, setBookingCode] = useState(null);

  const api = (path) => `${apiBase}/api/public/${tenant}/${path}`;

  // Load bikes
  useEffect(() => {
    setLoadingBikes(true);
    fetch(api("bikes"))
      .then((r) => r.json())
      .then((d) => {
        setBikes(d.bikes ?? []);
        setLoadingBikes(false);
      })
      .catch(() => {
        setErrorBikes(t.errorLoad);
        setLoadingBikes(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant, apiBase]);

  // Check availability whenever bike / dates change (step >= 1)
  useEffect(() => {
    if (!selectedBike || !startDate || !endDate || step < 1) return;
    if (new Date(endDate) < new Date(startDate)) return;

    setCheckingAvail(true);
    setAvailability(null);

    fetch(api(`availability?bikeId=${selectedBike.id}&start=${startDate}&end=${endDate}`))
      .then((r) => r.json())
      .then((d) => {
        setAvailability(d);
        setCheckingAvail(false);
      })
      .catch(() => {
        setAvailability({ available: false });
        setCheckingAvail(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBike, startDate, endDate, step]);

  const days = daysBetween(startDate, endDate);
  const basePrice = selectedBike ? (selectedBike.price_per_day ?? 0) * days * quantity : 0;
  const totalPrice = Math.max(0, basePrice - couponDiscount);

  // Apply coupon (basic client-side placeholder. Real validation happens server-side)
  const applyCoupon = useCallback(() => {
    if (!couponCode.trim()) return;
    // Optimistically accept. Server validates at checkout time
    setCouponStatus("ok");
    setCouponDiscount(0); // actual discount returned by checkout API
  }, [couponCode]);

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  // Stripe Checkout
  const handleCheckout = async () => {
    setCheckingOut(true);
    setCheckoutError(null);

    try {
      const res = await fetch(api("checkout"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bikeId:     selectedBike.id,
          startDate,
          endDate,
          quantity,
          customer,
          couponCode: couponCode || undefined,
          successUrl: window.location.href + (window.location.href.includes("?") ? "&" : "?") + "widget_success=1",
          cancelUrl:  window.location.href + (window.location.href.includes("?") ? "&" : "?") + "widget_cancel=1",
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) throw new Error(data.error ?? "Checkout failed");

      // If the Edge Function returns a checkout URL → redirect
      if (data.checkoutUrl || data.url) {
        window.location.href = data.checkoutUrl ?? data.url;
        return;
      }

      // If it returns a booking code directly (pay-at-counter flow)
      if (data.bookingCode || data.confirmation_code) {
        setBookingCode(data.bookingCode ?? data.confirmation_code);
        setStep(4); // done
        return;
      }

      throw new Error("No checkout URL received");
    } catch (err) {
      setCheckoutError(err.message ?? t.errorCheckout);
    } finally {
      setCheckingOut(false);
    }
  };

  // Handle success return from Stripe
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("widget_success") === "1") {
      setStep(4);
    }
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  const stepKey = STEPS[step].key;

  return (
    <div
      className={`rc-widget${dark ? " rc-dark" : ""}`}
      style={{ "--rc-primary": primaryColor }}
    >
      {/* Header */}
      <div className="rc-header">
        <h2>{t.title}</h2>
        <p>{t.subtitle}</p>
      </div>

      {/* Step indicator */}
      <div className="rc-steps">
        {STEPS.map((s, i) => (
          <div
            key={s.key}
            className={`rc-step${i === step ? " rc-active" : ""}${i < step ? " rc-done" : ""}`}
          >
            {s.label[lang] ?? s.label.de}
          </div>
        ))}
      </div>

      {/* Body */}
      <div className="rc-body">

        {/* ── Step 0: Bike selection ──────────────────────────────────────── */}
        {stepKey === "bikes" && (
          <>
            {loadingBikes && (
              <div className="rc-loading">
                <div className="rc-spinner" />
                {t.loading}
              </div>
            )}
            {errorBikes && <div className="rc-error">{errorBikes}</div>}
            {!loadingBikes && !errorBikes && bikes.length === 0 && (
              <div className="rc-empty">{t.noBikes}</div>
            )}
            {!loadingBikes && bikes.length > 0 && (
              <div className="rc-bikes">
                {bikes.map((bike) => (
                  <div
                    key={bike.id}
                    className={`rc-bike-card${selectedBike?.id === bike.id ? " rc-selected" : ""}`}
                    onClick={() => setSelectedBike(bike)}
                  >
                    {bike.image_url ? (
                      <img
                        className="rc-bike-img"
                        src={bike.image_url}
                        alt={bike.name}
                        loading="lazy"
                      />
                    ) : (
                      <div className="rc-bike-img">🚲</div>
                    )}
                    <div className="rc-bike-info">
                      <div className="rc-bike-name">{bike.name}</div>
                      {bike.category_name && (
                        <div className="rc-bike-cat">{bike.category_name}</div>
                      )}
                      <div className="rc-bike-price">
                        {fmt(bike.price_per_day, lang)} {t.perDay}
                      </div>
                      <div className={`rc-badge rc-badge-available`}>{t.available}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="rc-actions">
              <button
                className="rc-btn rc-btn-primary"
                disabled={!selectedBike}
                onClick={goNext}
              >
                {t.next}
              </button>
            </div>
          </>
        )}

        {/* ── Step 1: Dates + quantity ────────────────────────────────────── */}
        {stepKey === "dates" && (
          <div className="rc-dates">
            <div className="rc-date-row">
              <div className="rc-field">
                <label className="rc-label">{t.from}</label>
                <input
                  type="date"
                  className="rc-input"
                  value={startDate}
                  min={today()}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (e.target.value >= endDate) {
                      setEndDate(addDays(e.target.value, 1));
                    }
                  }}
                />
              </div>
              <div className="rc-field">
                <label className="rc-label">{t.until}</label>
                <input
                  type="date"
                  className="rc-input"
                  value={endDate}
                  min={addDays(startDate, 1)}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="rc-field">
              <label className="rc-label">{t.quantity}</label>
              <div className="rc-quantity">
                <button
                  className="rc-qty-btn"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >−</button>
                <span className="rc-qty-num">{quantity}</span>
                <button
                  className="rc-qty-btn"
                  onClick={() => setQuantity((q) => q + 1)}
                >+</button>
              </div>
            </div>

            {/* Availability indicator */}
            {checkingAvail && (
              <div className="rc-loading" style={{ padding: "8px 0" }}>
                <div className="rc-spinner" style={{ width: 20, height: 20 }} />
                {t.checkingAvail}
              </div>
            )}
            {!checkingAvail && availability && !availability.available && (
              <div className="rc-error">{t.notAvailable}</div>
            )}

            {/* Price preview */}
            {days > 0 && selectedBike && (
              <div className="rc-price-preview">
                <div className="rc-price-row">
                  <span>{fmt(selectedBike.price_per_day, lang)} × {days} {t.days} × {quantity}</span>
                  <span>{fmt(basePrice, lang)}</span>
                </div>
                {selectedBike.deposit_amount > 0 && (
                  <div className="rc-price-row">
                    <span>{t.deposit}</span>
                    <span>{fmt(selectedBike.deposit_amount * quantity, lang)}</span>
                  </div>
                )}
                <div className="rc-price-total">
                  <span>{t.totalPrice}</span>
                  <span>{fmt(basePrice, lang)}</span>
                </div>
              </div>
            )}

            <div className="rc-actions">
              <button className="rc-btn rc-btn-secondary" onClick={goBack}>{t.back}</button>
              <button
                className="rc-btn rc-btn-primary"
                disabled={!availability?.available || checkingAvail || days <= 0}
                onClick={goNext}
              >
                {t.next}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Customer data ───────────────────────────────────────── */}
        {stepKey === "customer" && (
          <div className="rc-customer">
            <div className="rc-field">
              <label className="rc-label">{t.name} *</label>
              <input
                type="text"
                className="rc-input"
                value={customer.name}
                onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
                placeholder="Max Mustermann"
                autoComplete="name"
              />
            </div>
            <div className="rc-field">
              <label className="rc-label">{t.email} *</label>
              <input
                type="email"
                className="rc-input"
                value={customer.email}
                onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))}
                placeholder="max@example.de"
                autoComplete="email"
              />
            </div>
            <div className="rc-field">
              <label className="rc-label">{t.phone}</label>
              <input
                type="tel"
                className="rc-input"
                value={customer.phone}
                onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))}
                placeholder="+49 …"
                autoComplete="tel"
              />
            </div>

            {/* Coupon */}
            <div className="rc-field">
              <label className="rc-label">{t.coupon}</label>
              <div className="rc-coupon-row">
                <input
                  type="text"
                  className="rc-input"
                  value={couponCode}
                  onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponStatus(null); }}
                  placeholder="SOMMER25"
                />
                <button className="rc-btn rc-btn-secondary" onClick={applyCoupon}>
                  {t.applyCode}
                </button>
              </div>
              {couponStatus === "ok"  && <div className="rc-coupon-status rc-coupon-ok">✓ {t.couponOk}</div>}
              {couponStatus === "err" && <div className="rc-coupon-status rc-coupon-err">✗ {t.couponErr}</div>}
            </div>

            <div className="rc-actions">
              <button className="rc-btn rc-btn-secondary" onClick={goBack}>{t.back}</button>
              <button
                className="rc-btn rc-btn-primary"
                disabled={!customer.name.trim() || !customer.email.trim()}
                onClick={goNext}
              >
                {t.next}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Summary + Checkout ─────────────────────────────────── */}
        {stepKey === "payment" && (
          <>
            <div className="rc-summary">
              <div className="rc-summary-row">
                <span>{t.bike}</span>
                <span>{selectedBike?.name}</span>
              </div>
              <div className="rc-summary-row">
                <span>{t.period}</span>
                <span>{startDate} - {endDate} ({days} {t.days})</span>
              </div>
              {quantity > 1 && (
                <div className="rc-summary-row">
                  <span>{t.quantity}</span>
                  <span>{quantity}</span>
                </div>
              )}
              <div className="rc-summary-row">
                <span>{t.name}</span>
                <span>{customer.name}</span>
              </div>
              <div className="rc-summary-row">
                <span>{t.email}</span>
                <span>{customer.email}</span>
              </div>
              {couponStatus === "ok" && couponCode && (
                <div className="rc-summary-row">
                  <span>{t.coupon}</span>
                  <span>{couponCode}</span>
                </div>
              )}
              <div className="rc-summary-row">
                <span>{t.totalPrice}</span>
                <span>{fmt(totalPrice, lang)}</span>
              </div>
            </div>

            {checkoutError && <div className="rc-error" style={{ marginBottom: 12 }}>{checkoutError}</div>}

            <div className="rc-actions">
              <button className="rc-btn rc-btn-secondary" onClick={goBack} disabled={checkingOut}>
                {t.back}
              </button>
              <button
                className="rc-btn rc-btn-primary"
                disabled={checkingOut}
                onClick={handleCheckout}
              >
                {checkingOut ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="rc-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                    {t.loading}
                  </span>
                ) : t.toPayment}
              </button>
            </div>
          </>
        )}

        {/* ── Step 4: Done ────────────────────────────────────────────────── */}
        {stepKey === "done" && (
          <div className="rc-confirmation">
            <div className="rc-check-circle">✓</div>
            <h3>{t.successTitle}</h3>
            <p>{t.successSub}</p>
            {bookingCode && (
              <div>
                <div style={{ fontSize: 12, marginTop: 16, color: "#6b7280" }}>{t.bookingCode}</div>
                <div className="rc-booking-code">{bookingCode}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="rc-footer">
        {t.poweredBy} <a href="https://rentcore.de" target="_blank" rel="noopener noreferrer">RentCore</a>
      </div>
    </div>
  );
}
