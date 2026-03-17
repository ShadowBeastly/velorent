"use client";
import { useState } from "react";

const PLATFORM_PCT = 0.05;
const PROVIDER_PCT = 0.95;

function formatEur(n) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
}

const SCENARIOS = [
  {
    key: "free",
    label: "Kostenlos",
    sublabel: "> 24h vorher",
    activeColor: "bg-green-600",
    activeBorder: "border-green-600",
    activeText: "text-green-400",
    dotDone: "bg-green-500",
    dotPending: "bg-blue-500",
    guestCard: "bg-green-900/40 border-green-700/50",
    guestLabel: "text-green-400",
    guestValue: "text-green-300",
    stripeCall: "Refund (full)",
    stripeNote: "application_fee_amount wird ebenfalls erstattet. Stripe-Transaktionsgebühren (ca. 1,4% + 0,25€) werden NICHT erstattet — das ist dein einziger Kostenpunkt bei Stornierungen.",
    steps: [
      { label: "Gast bucht und zahlt online", sub: "Stripe hält den vollen Betrag", dot: "blue" },
      { label: "Gast storniert > 24h vor Mietbeginn", sub: "Innerhalb der kostenlosen Frist", dot: "blue" },
      { label: "Stripe: Voller Refund", sub: "Gesamter Betrag wird zurückerstattet", dot: "green" },
      { label: "Ergebnis: Gast zufrieden, Anbieter kann Slot neu vergeben", sub: null, dot: "green" },
    ],
    calc: (total) => ({
      guestBack: total,
      guestPct: "100%",
      providerGets: 0,
      providerPct: "0%",
      platformGets: 0,
      platformPct: "0%",
      retained: 0,
    }),
    providerLabel: "Anbieter",
    platformLabel: "Plattform",
    showProviderCard: false,
  },
  {
    key: "partial",
    label: "50% Gebühr",
    sublabel: "< 24h vorher",
    activeColor: "bg-amber-600",
    activeBorder: "border-amber-600",
    activeText: "text-amber-400",
    dotDone: "bg-amber-500",
    dotPending: "bg-blue-500",
    guestCard: "bg-amber-900/40 border-amber-700/50",
    guestLabel: "text-amber-400",
    guestValue: "text-amber-300",
    stripeCall: "Refund (partial, 50%)",
    stripeNote: "Stripe Partial Refund über die API. Die application_fee wird anteilig auf den einbehaltenen Betrag angepasst (5% von 50%).",
    steps: [
      { label: "Gast bucht und zahlt online", sub: "Stripe hält den vollen Betrag", dot: "blue" },
      { label: "Gast storniert < 24h vor Mietbeginn", sub: "Zu spät für kostenlose Stornierung", dot: "amber" },
      { label: "Stripe: Partial Refund (50%)", sub: "Halber Betrag zurück an den Gast", dot: "amber" },
      { label: "Restbetrag wird gesplittet", sub: "Anbieter + Plattform teilen die Stornierungsgebühr", dot: "blue" },
    ],
    calc: (total) => {
      const retained = total * 0.5;
      const platformGets = Math.round(retained * PLATFORM_PCT * 100) / 100;
      const providerGets = Math.round(retained * PROVIDER_PCT * 100) / 100;
      return {
        guestBack: total * 0.5,
        guestPct: "50%",
        providerGets,
        providerPct: `95% von ${formatEur(retained)}`,
        platformGets,
        platformPct: `5% von ${formatEur(retained)}`,
        retained,
      };
    },
    providerLabel: "Anbieter erhält",
    platformLabel: "Plattform erhält",
    showProviderCard: true,
  },
  {
    key: "no_show",
    label: "No-Show",
    sublabel: "Gast erscheint nicht",
    activeColor: "bg-red-700",
    activeBorder: "border-red-700",
    activeText: "text-red-400",
    dotDone: "bg-red-500",
    dotPending: "bg-blue-500",
    guestCard: "bg-red-900/40 border-red-700/50",
    guestLabel: "text-red-400",
    guestValue: "text-red-300",
    stripeCall: "Kein Refund",
    stripeNote: "Kein API-Call nötig. Der Payment Intent bleibt bestehen, Stripe führt den normalen Transfer zum Connected Account aus. Der Anbieter wird vollständig entschädigt.",
    steps: [
      { label: "Gast bucht und zahlt online", sub: "Stripe hält den vollen Betrag", dot: "blue" },
      { label: "Mietbeginn: Gast erscheint nicht", sub: "Anbieter meldet No-Show über Dashboard", dot: "red" },
      { label: "Kein Refund", sub: "Voller Betrag bleibt eingezogen", dot: "red" },
      { label: "Normaler Split wird ausgeführt", sub: "Anbieter, Plattform (und Hotel) erhalten ihren Anteil", dot: "blue" },
    ],
    calc: (total) => {
      const platformGets = Math.round(total * PLATFORM_PCT * 100) / 100;
      const providerGets = Math.round(total * PROVIDER_PCT * 100) / 100;
      return {
        guestBack: 0,
        guestPct: "0%",
        providerGets,
        providerPct: `95% von ${formatEur(total)}`,
        platformGets,
        platformPct: `5% von ${formatEur(total)}`,
        retained: total,
      };
    },
    providerLabel: "Anbieter erhält",
    platformLabel: "Plattform erhält",
    showProviderCard: true,
  },
];

const DOT_COLORS = {
  blue: "bg-blue-500 border-blue-400",
  green: "bg-green-500 border-green-400",
  amber: "bg-amber-500 border-amber-400",
  red: "bg-red-500 border-red-400",
};

export default function CancellationPolicyVisualizer({ darkMode }) {
  const [scenarioKey, setScenarioKey] = useState("free");
  const [bookingValue, setBookingValue] = useState(50);

  const scenario = SCENARIOS.find((s) => s.key === scenarioKey);
  const result = scenario.calc(bookingValue);

  const card = darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";

  return (
    <div className={`border rounded-xl p-5 ${card}`}>
      <h2 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
        Stornierungsrichtlinie
      </h2>

      {/* Slider */}
      <div className="flex items-center gap-4 mb-5">
        <span className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Buchungswert</span>
        <input
          type="range"
          min={10}
          max={500}
          step={5}
          value={bookingValue}
          onChange={(e) => setBookingValue(Number(e.target.value))}
          className="flex-1 accent-[#1A7D5A]"
        />
        <span className="font-bold text-base w-16 text-right">{bookingValue} €</span>
      </div>

      {/* Scenario Tabs */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {SCENARIOS.map((s) => (
          <button
            key={s.key}
            onClick={() => setScenarioKey(s.key)}
            className={`py-3 px-2 rounded-xl border text-sm font-semibold transition-all ${
              scenarioKey === s.key
                ? `${s.activeColor} ${s.activeBorder} text-white`
                : darkMode
                ? "bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-500"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            <div>{s.label}</div>
            <div className={`text-xs font-normal mt-0.5 ${scenarioKey === s.key ? "text-white/70" : darkMode ? "text-slate-400" : "text-slate-400"}`}>
              {s.sublabel}
            </div>
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="mb-5 relative pl-6">
        {/* vertical line */}
        <div className={`absolute left-2.5 top-2 bottom-2 w-0.5 ${darkMode ? "bg-slate-700" : "bg-slate-200"}`} />
        <div className="space-y-4">
          {scenario.steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3 relative">
              <div className={`absolute -left-3.5 w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 mt-0.5 ${DOT_COLORS[step.dot]}`} />
              <div className="pl-1">
                <p className={`text-sm font-semibold ${darkMode ? "text-white" : "text-slate-800"}`}>{step.label}</p>
                {step.sub && <p className={`text-xs mt-0.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{step.sub}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Split Cards */}
      <div className={`grid gap-3 mb-5 ${scenario.showProviderCard ? "grid-cols-3" : "grid-cols-3"}`}>
        {/* Guest */}
        <div className={`rounded-xl border p-4 ${scenario.guestCard}`}>
          <div className={`text-xs font-medium mb-1 ${scenario.guestLabel}`}>Gast erhält zurück</div>
          <div className={`text-2xl font-bold ${scenario.guestValue}`}>{formatEur(result.guestBack)}</div>
          <div className={`text-xs mt-0.5 ${scenario.guestLabel}`}>{result.guestPct}</div>
        </div>

        {/* Provider */}
        <div className={`rounded-xl border p-4 ${darkMode ? "bg-slate-700/50 border-slate-600" : "bg-slate-50 border-slate-200"} ${scenario.showProviderCard ? "bg-green-900/30 border-green-700/40" : ""}`}>
          <div className={`text-xs font-medium mb-1 ${scenario.showProviderCard ? "text-green-400" : darkMode ? "text-slate-400" : "text-slate-500"}`}>
            {scenario.providerLabel}
          </div>
          <div className={`text-2xl font-bold ${scenario.showProviderCard ? "text-green-300" : darkMode ? "text-slate-300" : "text-slate-700"}`}>
            {formatEur(result.providerGets)}
          </div>
          <div className={`text-xs mt-0.5 ${scenario.showProviderCard ? "text-green-500" : darkMode ? "text-slate-500" : "text-slate-400"}`}>
            {result.providerPct}
          </div>
        </div>

        {/* Platform */}
        <div className={`rounded-xl border p-4 ${darkMode ? "bg-blue-900/20 border-blue-800/40" : "bg-blue-50 border-blue-200"}`}>
          <div className={`text-xs font-medium mb-1 ${darkMode ? "text-blue-400" : "text-blue-600"}`}>{scenario.platformLabel}</div>
          <div className={`text-2xl font-bold ${darkMode ? "text-blue-300" : "text-blue-700"}`}>{formatEur(result.platformGets)}</div>
          <div className={`text-xs mt-0.5 ${darkMode ? "text-blue-500" : "text-blue-400"}`}>{result.platformPct}</div>
        </div>
      </div>

      {/* Stripe API note */}
      <div className={`rounded-lg p-4 mb-4 ${darkMode ? "bg-slate-700/40 border border-slate-600" : "bg-slate-50 border border-slate-200"}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-sm font-semibold ${darkMode ? "text-slate-200" : "text-slate-700"}`}>Stripe API:</span>
          <span className={`px-2 py-0.5 rounded text-xs font-mono font-medium ${darkMode ? "bg-slate-600 text-slate-200" : "bg-slate-200 text-slate-700"}`}>
            {scenario.stripeCall}
          </span>
        </div>
        <p className={`text-xs leading-relaxed ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{scenario.stripeNote}</p>
      </div>

      {/* Rechenbeispiel */}
      <div className={`rounded-lg p-4 ${darkMode ? "bg-slate-700/30" : "bg-slate-50"}`}>
        <p className={`text-sm font-semibold mb-3 ${darkMode ? "text-slate-200" : "text-slate-700"}`}>
          Rechenbeispiel bei {formatEur(bookingValue)} Buchung
        </p>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className={darkMode ? "text-slate-400" : "text-slate-500"}>Buchungswert</span>
            <span className={darkMode ? "text-slate-200" : "text-slate-700"}>{formatEur(bookingValue)}</span>
          </div>
          <div className="flex justify-between">
            <span className={darkMode ? "text-slate-400" : "text-slate-500"}>Gast erhält zurück</span>
            <span className={darkMode ? "text-slate-200" : "text-slate-700"}>{formatEur(result.guestBack)}</span>
          </div>
          <div className="flex justify-between">
            <span className={darkMode ? "text-slate-400" : "text-slate-500"}>Einbehalten</span>
            <span className={darkMode ? "text-slate-200" : "text-slate-700"}>{formatEur(result.retained)}</span>
          </div>
          <div className={`border-t pt-1.5 mt-1 ${darkMode ? "border-slate-600" : "border-slate-200"}`}>
            <div className="flex justify-between">
              <span className={darkMode ? "text-slate-400" : "text-slate-500"}>→ Anbieter (95%)</span>
              <span className={darkMode ? "text-slate-200" : "text-slate-700"}>{formatEur(result.providerGets)}</span>
            </div>
            <div className="flex justify-between">
              <span className={darkMode ? "text-slate-400" : "text-slate-500"}>→ Plattform (5%)</span>
              <span className="text-blue-400">{formatEur(result.platformGets)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
