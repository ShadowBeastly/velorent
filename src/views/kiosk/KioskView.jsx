"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronRight, ChevronLeft, Check, Bike, Calendar, User, ClipboardList, PenLine, QrCode, X, RotateCcw } from "lucide-react";
import { calculateDynamicPrice } from "../../utils/calculatePrice";
import { fmtDate, daysDiff } from "../../utils/formatters";

// ─── Constants ────────────────────────────────────────────────────────────────

const PIN_TAP_WINDOW_MS = 2_000;       // 3 taps within 2 seconds
const PIN_TAP_REQUIRED = 3;

const STEPS = [
  { id: 1, label: "Willkommen",    icon: QrCode },
  { id: 2, label: "Rad wählen",   icon: Bike },
  { id: 3, label: "Zeitraum",     icon: Calendar },
  { id: 4, label: "Ihre Daten",   icon: User },
  { id: 5, label: "Übersicht",    icon: ClipboardList },
  { id: 6, label: "Unterschrift", icon: PenLine },
  { id: 7, label: "Fertig",       icon: Check },
];

const today = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10);
};

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

function fmtEur(n) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n || 0);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KioskButton({ onClick, disabled, variant = "primary", className = "", children }) {
  const base =
    "inline-flex items-center justify-center gap-3 rounded-2xl font-semibold transition-all duration-150 select-none cursor-pointer";
  const sizes = "min-h-[64px] px-10 text-[20px]";
  const variants = {
    primary: "bg-[#1A7D5A] text-white hover:bg-[#15694C] active:scale-95 shadow-lg",
    secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95",
    danger: "bg-red-500 text-white hover:bg-red-600 active:scale-95",
    ghost: "text-slate-500 hover:bg-slate-100 active:scale-95",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes} ${variants[variant]} ${disabled ? "opacity-40 cursor-not-allowed" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

function KioskInput({ label, type = "text", value, onChange, placeholder, required }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[18px] font-semibold text-slate-700">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border-2 border-slate-200 px-6 py-4 text-[20px] outline-none focus:border-[#1A7D5A] transition-colors"
        autoComplete="off"
        autoCorrect="off"
      />
    </div>
  );
}

// ─── Steps ────────────────────────────────────────────────────────────────────

function StepWelcome({ orgName, onStart, onLogoTap }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-10 text-center px-8">
      {/* Logo — tapping 3x triggers admin escape */}
      <button
        onClick={onLogoTap}
        className="focus:outline-none select-none"
        aria-label="Logo"
      >
        <div className="w-24 h-24 rounded-3xl bg-[#1A7D5A] flex items-center justify-center shadow-xl">
          <Bike className="w-12 h-12 text-white" />
        </div>
      </button>

      <div className="space-y-4">
        <h1 className="text-[52px] font-bold text-slate-900 leading-tight">
          Fahrrad mieten
        </h1>
        {orgName && (
          <p className="text-[24px] text-slate-500">{orgName}</p>
        )}
        <p className="text-[20px] text-slate-400 max-w-md mx-auto">
          Wählen Sie Ihr Fahrrad und starten Sie Ihre Tour.
        </p>
      </div>

      <KioskButton onClick={onStart} className="px-16 text-[24px] min-h-[80px]">
        Jetzt buchen <ChevronRight className="w-7 h-7" />
      </KioskButton>
    </div>
  );
}

function StepBikeSelect({ bikes, loading, selected, onSelect, onNext }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[24px] text-slate-400 animate-pulse">Lade Fahrräder…</div>
      </div>
    );
  }

  const available = bikes.filter((b) => b.status === "available");

  if (available.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-8">
        <Bike className="w-16 h-16 text-slate-300" />
        <p className="text-[24px] text-slate-500">Aktuell keine Fahrräder verfügbar.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-[32px] font-bold text-slate-900 px-8 pt-8 pb-4">
        Fahrrad wählen
      </h2>
      <div className="flex-1 overflow-y-auto px-8 pb-4">
        <div className="grid grid-cols-2 gap-5">
          {available.map((bike) => (
            <button
              key={bike.id}
              onClick={() => onSelect(bike)}
              className={`rounded-3xl border-3 p-6 text-left transition-all duration-150 active:scale-95 min-h-[180px] flex flex-col gap-3
                ${selected?.id === bike.id
                  ? "border-[#1A7D5A] bg-[#1A7D5A]/5 shadow-lg"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
                }`}
              style={{ border: selected?.id === bike.id ? "3px solid #1A7D5A" : "2px solid #e2e8f0" }}
            >
              {bike.image_url ? (
                <div
                  role="img"
                  aria-label={bike.name}
                  className="w-full h-28 rounded-2xl bg-cover bg-center"
                  style={{ backgroundImage: `url(${bike.image_url})` }}
                />
              ) : (
                <div className="w-full h-28 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                  <Bike className="w-12 h-12 text-slate-400" />
                </div>
              )}
              <div>
                <p className="text-[20px] font-bold text-slate-900">{bike.name}</p>
                {bike.category && (
                  <p className="text-[16px] text-slate-500">{bike.category}</p>
                )}
              </div>
              <div className="flex items-center justify-between mt-auto">
                <span className="text-[22px] font-bold text-[#1A7D5A]">
                  {fmtEur(bike.price_per_day)}/Tag
                </span>
                {selected?.id === bike.id && (
                  <span className="rounded-full bg-[#1A7D5A] text-white px-3 py-1 text-[14px] font-semibold">
                    Gewählt
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="px-8 pb-8 pt-4 border-t border-slate-100">
        <KioskButton onClick={onNext} disabled={!selected} className="w-full">
          Weiter <ChevronRight className="w-6 h-6" />
        </KioskButton>
      </div>
    </div>
  );
}

function StepDates({ bike, startDate, endDate, onStartDate, onEndDate, onNext, onBack }) {
  const priceResult = bike && startDate && endDate
    ? calculateDynamicPrice(bike, startDate, endDate, [])
    : null;
  const totalDays = startDate && endDate ? daysDiff(startDate, endDate) : 0;
  const isValid = startDate && endDate && endDate >= startDate;

  return (
    <div className="flex flex-col h-full px-8 py-8 gap-6">
      <h2 className="text-[32px] font-bold text-slate-900">
        Zeitraum wählen
      </h2>

      {bike && (
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
          <div className="w-12 h-12 rounded-xl bg-[#1A7D5A]/10 flex items-center justify-center">
            <Bike className="w-6 h-6 text-[#1A7D5A]" />
          </div>
          <div>
            <p className="text-[18px] font-semibold text-slate-900">{bike.name}</p>
            <p className="text-[16px] text-slate-500">{fmtEur(bike.price_per_day)}/Tag</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6 flex-1">
        <div className="flex flex-col gap-3">
          <label className="text-[20px] font-semibold text-slate-700">Abholdatum</label>
          <input
            type="date"
            value={startDate}
            min={today()}
            onChange={(e) => onStartDate(e.target.value)}
            className="rounded-2xl border-2 border-slate-200 px-6 py-5 text-[22px] outline-none focus:border-[#1A7D5A] transition-colors w-full"
          />
        </div>
        <div className="flex flex-col gap-3">
          <label className="text-[20px] font-semibold text-slate-700">Rückgabedatum</label>
          <input
            type="date"
            value={endDate}
            min={startDate || today()}
            onChange={(e) => onEndDate(e.target.value)}
            className="rounded-2xl border-2 border-slate-200 px-6 py-5 text-[22px] outline-none focus:border-[#1A7D5A] transition-colors w-full"
          />
        </div>
      </div>

      {isValid && priceResult && (
        <div className="rounded-2xl bg-[#1A7D5A]/5 border border-[#1A7D5A]/20 p-6 space-y-2">
          <div className="flex justify-between text-[18px] text-slate-600">
            <span>{totalDays} {totalDays === 1 ? "Tag" : "Tage"}</span>
            <span>{fmtEur(bike.price_per_day)}/Tag</span>
          </div>
          <div className="flex justify-between text-[24px] font-bold text-slate-900">
            <span>Gesamtpreis</span>
            <span className="text-[#1A7D5A]">{fmtEur(priceResult.totalPrice)}</span>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <KioskButton onClick={onBack} variant="secondary" className="flex-1">
          <ChevronLeft className="w-6 h-6" /> Zurück
        </KioskButton>
        <KioskButton onClick={onNext} disabled={!isValid} className="flex-1">
          Weiter <ChevronRight className="w-6 h-6" />
        </KioskButton>
      </div>
    </div>
  );
}

function StepContact({ form, onChange, onNext, onBack }) {
  const isValid = form.firstName.trim() && form.lastName.trim();

  return (
    <div className="flex flex-col h-full px-8 py-8 gap-6">
      <h2 className="text-[32px] font-bold text-slate-900">Ihre Daten</h2>

      <div className="flex-1 overflow-y-auto space-y-5">
        <div className="grid grid-cols-2 gap-5">
          <KioskInput
            label="Vorname"
            value={form.firstName}
            onChange={(v) => onChange("firstName", v)}
            placeholder="Max"
            required
          />
          <KioskInput
            label="Nachname"
            value={form.lastName}
            onChange={(v) => onChange("lastName", v)}
            placeholder="Mustermann"
            required
          />
        </div>
        <KioskInput
          label="E-Mail"
          type="email"
          value={form.email}
          onChange={(v) => onChange("email", v)}
          placeholder="max@beispiel.de"
        />
        <KioskInput
          label="Telefon"
          type="tel"
          value={form.phone}
          onChange={(v) => onChange("phone", v)}
          placeholder="+49 171 1234567"
        />
        <KioskInput
          label="Ausweis-Nr. (optional)"
          value={form.idNumber}
          onChange={(v) => onChange("idNumber", v)}
          placeholder="Personalausweis- oder Reisepassnummer"
        />
      </div>

      <div className="flex gap-4">
        <KioskButton onClick={onBack} variant="secondary" className="flex-1">
          <ChevronLeft className="w-6 h-6" /> Zurück
        </KioskButton>
        <KioskButton onClick={onNext} disabled={!isValid} className="flex-1">
          Weiter <ChevronRight className="w-6 h-6" />
        </KioskButton>
      </div>
    </div>
  );
}

function StepSummary({ bike, startDate, endDate, contact, totalPrice, totalDays, onNext, onBack, submitting }) {
  return (
    <div className="flex flex-col h-full px-8 py-8 gap-6">
      <h2 className="text-[32px] font-bold text-slate-900">Übersicht</h2>

      <div className="flex-1 space-y-4">
        {/* Bike */}
        <div className="rounded-2xl border-2 border-slate-100 p-6 space-y-3">
          <p className="text-[16px] font-semibold text-slate-400 uppercase tracking-wider">Fahrrad</p>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#1A7D5A]/10 flex items-center justify-center">
              <Bike className="w-7 h-7 text-[#1A7D5A]" />
            </div>
            <div>
              <p className="text-[22px] font-bold text-slate-900">{bike?.name}</p>
              <p className="text-[16px] text-slate-500">{bike?.category}</p>
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="rounded-2xl border-2 border-slate-100 p-6 space-y-3">
          <p className="text-[16px] font-semibold text-slate-400 uppercase tracking-wider">Zeitraum</p>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[14px] text-slate-500">Abholung</p>
              <p className="text-[20px] font-semibold">{fmtDate(startDate)}</p>
            </div>
            <ChevronRight className="w-6 h-6 text-slate-300" />
            <div className="text-right">
              <p className="text-[14px] text-slate-500">Rückgabe</p>
              <p className="text-[20px] font-semibold">{fmtDate(endDate)}</p>
            </div>
            <div className="text-right">
              <p className="text-[14px] text-slate-500">Dauer</p>
              <p className="text-[20px] font-semibold">{totalDays} {totalDays === 1 ? "Tag" : "Tage"}</p>
            </div>
          </div>
        </div>

        {/* Customer */}
        <div className="rounded-2xl border-2 border-slate-100 p-6 space-y-3">
          <p className="text-[16px] font-semibold text-slate-400 uppercase tracking-wider">Mieter</p>
          <p className="text-[22px] font-bold text-slate-900">{contact.firstName} {contact.lastName}</p>
          {contact.email && <p className="text-[18px] text-slate-500">{contact.email}</p>}
          {contact.phone && <p className="text-[18px] text-slate-500">{contact.phone}</p>}
        </div>

        {/* Price */}
        <div className="rounded-2xl bg-[#1A7D5A] text-white p-6 flex justify-between items-center">
          <div>
            <p className="text-[16px] opacity-75">Gesamtpreis</p>
            {bike?.deposit_amount > 0 && (
              <p className="text-[14px] opacity-60">+ {fmtEur(bike.deposit_amount)} Kaution (wird zurückgegeben)</p>
            )}
          </div>
          <p className="text-[36px] font-bold">{fmtEur(totalPrice)}</p>
        </div>
      </div>

      <div className="flex gap-4">
        <KioskButton onClick={onBack} variant="secondary" className="flex-1" disabled={submitting}>
          <ChevronLeft className="w-6 h-6" /> Zurück
        </KioskButton>
        <KioskButton onClick={onNext} className="flex-1" disabled={submitting}>
          {submitting ? "Bitte warten…" : <>Jetzt buchen <ChevronRight className="w-6 h-6" /></>}
        </KioskButton>
      </div>
    </div>
  );
}

function StepSignature({ onNext, onBack }) {
  // TODO: Integrate signature_pad once M4 (Digital Signature) is complete.
  // Placeholder: confirms acceptance without a drawn signature.
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="flex flex-col h-full px-8 py-8 gap-6">
      <h2 className="text-[32px] font-bold text-slate-900">Unterschrift</h2>

      <div className="flex-1 flex flex-col gap-6">
        {/* Placeholder canvas */}
        <div className="flex-1 rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center gap-4 min-h-[240px]">
          <PenLine className="w-12 h-12 text-slate-300" />
          <p className="text-[18px] text-slate-400 text-center max-w-xs">
            Unterschrift-Pad wird hier angezeigt
          </p>
          <p className="text-[13px] text-slate-300 text-center">
            {/* TODO: Replace with SignaturePad component once M4 is merged */}
            (M4 Digital Signature — noch nicht implementiert)
          </p>
        </div>

        <label className="flex items-start gap-4 cursor-pointer">
          <button
            onClick={() => setAccepted((v) => !v)}
            className={`mt-1 w-8 h-8 rounded-lg border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
              accepted ? "bg-[#1A7D5A] border-[#1A7D5A]" : "border-slate-300"
            }`}
          >
            {accepted && <Check className="w-5 h-5 text-white" />}
          </button>
          <span className="text-[18px] text-slate-700 leading-snug">
            Ich bestätige, das Fahrrad in ordnungsgemäßem Zustand zu übernehmen und die
            Mietbedingungen akzeptiert zu haben.
          </span>
        </label>
      </div>

      <div className="flex gap-4">
        <KioskButton onClick={onBack} variant="secondary" className="flex-1">
          <ChevronLeft className="w-6 h-6" /> Zurück
        </KioskButton>
        <KioskButton onClick={onNext} disabled={!accepted} className="flex-1">
          Abschließen <Check className="w-6 h-6" />
        </KioskButton>
      </div>
    </div>
  );
}

function StepConfirmation({ bookingNumber, contact, onReset }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 text-center px-8">
      <div className="w-24 h-24 rounded-full bg-[#1A7D5A] flex items-center justify-center shadow-xl">
        <Check className="w-12 h-12 text-white" />
      </div>

      <div className="space-y-3">
        <h2 className="text-[44px] font-bold text-slate-900">Buchung bestätigt!</h2>
        {contact.firstName && (
          <p className="text-[22px] text-slate-500">
            Vielen Dank, {contact.firstName}!
          </p>
        )}
      </div>

      <div className="rounded-3xl border-2 border-slate-100 bg-slate-50 px-12 py-8 space-y-4">
        <p className="text-[18px] text-slate-500 font-medium">Ihre Buchungsnummer</p>
        <p className="text-[48px] font-bold tracking-widest text-[#1A7D5A]">{bookingNumber}</p>

        {/* QR code placeholder — needs booking confirmation URL */}
        <div className="w-36 h-36 mx-auto rounded-2xl border-2 border-slate-200 bg-white flex items-center justify-center">
          <QrCode className="w-20 h-20 text-slate-300" />
        </div>
      </div>

      {contact.email && (
        <p className="text-[18px] text-slate-500">
          Eine Bestätigung wurde an <strong>{contact.email}</strong> gesendet.
        </p>
      )}

      <KioskButton onClick={onReset} variant="secondary" className="mt-4">
        <RotateCcw className="w-5 h-5" /> Neue Buchung
      </KioskButton>
    </div>
  );
}

// ─── PIN Modal ────────────────────────────────────────────────────────────────

function PinModal({ onClose, onSuccess, orgId }) {
  const [entered, setEntered] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleDigit = async (d) => {
    if (entered.length >= 6 || checking) return;
    const next = entered + d;
    setEntered(next);
    setError(false);

    // Try validation once we have at least 4 digits and user hasn't typed more
    if (next.length >= 4) {
      setChecking(true);
      try {
        const res = await fetch("/api/kiosk/pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ org_id: orgId, pin: next }),
        });
        const data = await res.json();
        if (data.valid) {
          onSuccess();
          return;
        }
        // Not valid yet — might need more digits (up to 6)
        if (next.length >= 6) {
          setError(true);
          setTimeout(() => { setEntered(""); setError(false); }, 800);
        }
      } catch {
        setError(true);
        setTimeout(() => { setEntered(""); setError(false); }, 800);
      } finally {
        setChecking(false);
      }
    }
  };

  const digits = [
    ["1","2","3"],
    ["4","5","6"],
    ["7","8","9"],
    ["","0","⌫"],
  ];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-[24px] font-bold text-slate-900">Admin-Zugang</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100">
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        {/* PIN dots */}
        <div className="flex gap-3 justify-center">
          {Array.from({ length: Math.max(4, entered.length || 4) }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full transition-colors ${
                i < entered.length
                  ? error ? "bg-red-500" : "bg-[#1A7D5A]"
                  : "bg-slate-200"
              }`}
            />
          ))}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3">
          {digits.flat().map((d, i) => (
            <button
              key={i}
              onClick={() => {
                if (d === "⌫") { setEntered((v) => v.slice(0, -1)); setError(false); }
                else if (d) handleDigit(d);
              }}
              disabled={!d || checking}
              className={`h-16 rounded-2xl text-[24px] font-semibold transition-all active:scale-95
                ${d ? "bg-slate-100 hover:bg-slate-200 text-slate-900" : "invisible"}
                ${checking ? "opacity-50" : ""}`}
            >
              {d}
            </button>
          ))}
        </div>

        {error && (
          <p className="text-center text-red-500 text-[16px] font-medium">Falscher PIN</p>
        )}
      </div>
    </div>
  );
}

// ─── Inactivity Timer Bar ─────────────────────────────────────────────────────

function InactivityBar({ secondsLeft, show }) {
  if (!show || secondsLeft > 50) return null;
  return (
    <div className="absolute top-0 left-0 right-0 bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-between z-10">
      <p className="text-[16px] text-amber-700 font-medium">
        Sitzung endet in {secondsLeft}s — Tippen um fortzufahren
      </p>
      <div className="w-48 h-2 rounded-full bg-amber-200 overflow-hidden">
        <div
          className="h-full bg-amber-500 rounded-full transition-all duration-1000"
          style={{ width: `${(secondsLeft / 60) * 100}%` }}
        />
      </div>
    </div>
  );
}

// ─── Step Progress Bar ────────────────────────────────────────────────────────

function StepProgress({ step }) {
  if (step <= 1 || step >= 7) return null;
  const activeSteps = STEPS.slice(1, 6); // steps 2–6
  const currentIdx = step - 2;
  return (
    <div className="flex items-center gap-2 px-8 py-4 border-b border-slate-100 bg-white">
      {activeSteps.map((s, idx) => {
        const Icon = s.icon;
        const isActive = idx === currentIdx;
        const isDone = idx < currentIdx;
        return (
          <div key={s.id} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 rounded-full px-4 py-2 transition-colors ${
                isActive
                  ? "bg-[#1A7D5A] text-white"
                  : isDone
                    ? "bg-[#1A7D5A]/10 text-[#1A7D5A]"
                    : "bg-slate-100 text-slate-400"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[14px] font-semibold">{s.label}</span>
            </div>
            {idx < activeSteps.length - 1 && (
              <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isDone || isActive ? "text-[#1A7D5A]" : "text-slate-300"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main KioskView ───────────────────────────────────────────────────────────

const INITIAL_CONTACT = { firstName: "", lastName: "", email: "", phone: "", idNumber: "" };

export default function KioskView({ orgId }) {
  const [step, setStep] = useState(1);
  const [orgName, setOrgName] = useState("");
  const [bikes, setBikes] = useState([]);
  const [loadingBikes, setLoadingBikes] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [selectedBike, setSelectedBike] = useState(null);
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(tomorrow());
  const [contact, setContact] = useState(INITIAL_CONTACT);
  const [submitting, setSubmitting] = useState(false);
  const [bookingNumber, setBookingNumber] = useState(null);

  // PIN modal
  const [showPin, setShowPin] = useState(false);

  // Inactivity timer
  const [secondsLeft, setSecondsLeft] = useState(60);
  const timerRef = useRef(null);

  // Logo tap counter for admin escape
  const logoTapCount = useRef(0);
  const logoTapTimer = useRef(null);

  // ── Load bikes on mount ───────────────────────────────────────────────────
  useEffect(() => {
    if (!orgId) return;
    setLoadingBikes(true);
    fetch(`/api/kiosk/bikes?org=${encodeURIComponent(orgId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setLoadError(data.error); return; }
        setBikes(data.bikes || []);
        setOrgName(data.org?.name || "");
        // PIN is stored server-side and NOT exposed in this response for security.
        // The PIN will be validated via a separate endpoint or embedded per org settings.
      })
      .catch(() => setLoadError("Verbindungsfehler"))
      .finally(() => setLoadingBikes(false));
  }, [orgId]);

  // ── Inactivity timer ──────────────────────────────────────────────────────
  const resetTimer = useCallback(() => {
    setSecondsLeft(60);
    if (timerRef.current) clearInterval(timerRef.current);
    if (step === 1 || step === 7) return; // no timeout on welcome / confirmation
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          setStep(1);
          setSelectedBike(null);
          setStartDate(today());
          setEndDate(tomorrow());
          setContact(INITIAL_CONTACT);
          setBookingNumber(null);
          return 60;
        }
        return s - 1;
      });
    }, 1000);
  }, [step]);

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [resetTimer]);

  const handleInteraction = () => {
    if (step !== 1 && step !== 7) resetTimer();
  };

  // ── Logo tap handler for admin escape ─────────────────────────────────────
  const handleLogoTap = () => {
    logoTapCount.current += 1;
    if (logoTapTimer.current) clearTimeout(logoTapTimer.current);
    logoTapTimer.current = setTimeout(() => {
      logoTapCount.current = 0;
    }, PIN_TAP_WINDOW_MS);

    if (logoTapCount.current >= PIN_TAP_REQUIRED) {
      logoTapCount.current = 0;
      clearTimeout(logoTapTimer.current);
      setShowPin(true);
    }
  };

  // ── Price calculation ──────────────────────────────────────────────────────
  const priceResult = selectedBike && startDate && endDate
    ? calculateDynamicPrice(selectedBike, startDate, endDate, [])
    : null;
  const totalPrice = priceResult?.totalPrice ?? 0;
  const totalDays = startDate && endDate ? daysDiff(startDate, endDate) : 0;

  // ── Contact field updater ─────────────────────────────────────────────────
  const updateContact = (key, value) => setContact((c) => ({ ...c, [key]: value }));

  // ── Submit booking ─────────────────────────────────────────────────────────
  const handleSubmitBooking = async () => {
    if (!orgId || !selectedBike) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/kiosk/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: orgId,
          bike_id: selectedBike.id,
          start_date: startDate,
          end_date: endDate,
          total_days: totalDays,
          total_price: totalPrice,
          first_name: contact.firstName,
          last_name: contact.lastName,
          email: contact.email || null,
          phone: contact.phone || null,
          id_number: contact.idNumber || null,
          notes: "Kiosk-Buchung",
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Buchung fehlgeschlagen");
      setBookingNumber(data.booking_number);
      setStep(6); // → signature step
    } catch (err) {
      console.error(err);
      alert(`Fehler: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Reset ──────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setStep(1);
    setSelectedBike(null);
    setStartDate(today());
    setEndDate(tomorrow());
    setContact(INITIAL_CONTACT);
    setBookingNumber(null);
  };

  // ── Admin PIN success ─────────────────────────────────────────────────────
  const handlePinSuccess = () => {
    setShowPin(false);
    // Redirect to the provider dashboard
    window.location.href = "/app";
  };

  // ── No org ID ─────────────────────────────────────────────────────────────
  if (!orgId) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-8">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
          <X className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-[28px] font-bold text-slate-900">Kein Betreiber angegeben</h2>
        <p className="text-[18px] text-slate-500 max-w-md">
          Bitte rufen Sie den Kiosk mit dem Parameter{" "}
          <code className="bg-slate-100 px-2 py-0.5 rounded text-[16px]">?org=ORG_ID</code> auf.
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-8">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
          <X className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-[28px] font-bold text-slate-900">Fehler</h2>
        <p className="text-[18px] text-slate-500">{loadError}</p>
      </div>
    );
  }

  return (
    <div
      className="relative h-full flex flex-col bg-white overflow-hidden"
      onTouchStart={handleInteraction}
      onMouseMove={handleInteraction}
      onClick={handleInteraction}
    >
      {/* Inactivity warning bar */}
      <InactivityBar secondsLeft={secondsLeft} show={step > 1 && step < 7} />

      {/* Progress bar */}
      <div className={step > 1 && step < 7 && secondsLeft <= 50 ? "mt-[52px]" : ""}>
        <StepProgress step={step} />
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-hidden">
        {step === 1 && (
          <StepWelcome
            orgName={orgName}
            onStart={() => setStep(2)}
            onLogoTap={handleLogoTap}
          />
        )}
        {step === 2 && (
          <StepBikeSelect
            bikes={bikes}
            loading={loadingBikes}
            selected={selectedBike}
            onSelect={setSelectedBike}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <StepDates
            bike={selectedBike}
            startDate={startDate}
            endDate={endDate}
            onStartDate={setStartDate}
            onEndDate={setEndDate}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && (
          <StepContact
            form={contact}
            onChange={updateContact}
            onNext={() => setStep(5)}
            onBack={() => setStep(3)}
          />
        )}
        {step === 5 && (
          <StepSummary
            bike={selectedBike}
            startDate={startDate}
            endDate={endDate}
            contact={contact}
            totalPrice={totalPrice}
            totalDays={totalDays}
            submitting={submitting}
            onNext={handleSubmitBooking}
            onBack={() => setStep(4)}
          />
        )}
        {step === 6 && (
          <StepSignature
            onNext={() => setStep(7)}
            onBack={() => setStep(5)}
          />
        )}
        {step === 7 && (
          <StepConfirmation
            bookingNumber={bookingNumber}
            contact={contact}
            onReset={handleReset}
          />
        )}
      </div>

      {/* Admin PIN Modal */}
      {showPin && (
        <PinModal
          onClose={() => setShowPin(false)}
          onSuccess={handlePinSuccess}
          orgId={orgId}
        />
      )}
    </div>
  );
}
