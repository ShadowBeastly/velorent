"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Calendar, Users, BarChart3, Globe, Check,
  ChevronRight, ArrowRight, Menu, X, Mail,
  Smartphone, CheckCircle, Bike
} from "lucide-react";

const C = {
  primary: "#1A7D5A",
  light: "#3BAA82",
  tint: "#D4EDE2",
  dark: "#1E2D26",
  bg: "#F5FAF7",
  neutral: "#6B7280",
  white: "#FFFFFF",
};

export default function LandingPage({ onGetStarted, onLogin }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState("monthly");

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top, behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  const features = [
    {
      icon: Calendar,
      title: "Smart Calendar",
      description: "Drag & Drop Buchungskalender. Sehen Sie Verfügbarkeiten in Echtzeit und optimieren Sie Ihre Auslastung."
    },
    {
      icon: Bike,
      title: "Flotten-Management",
      description: "Verwalten Sie E-Bikes, MTBs und City-Bikes. Wartungsintervalle, Status und Historie pro Rad."
    },
    {
      icon: Users,
      title: "CRM Integration",
      description: "Automatisierte Kundenprofile. Speichern Sie Vorlieben, Größen und Dokumente sicher ab."
    },
    {
      icon: Globe,
      title: "24/7 Online-Booking",
      description: "Modernes Widget für Ihre Website. Lassen Sie Kunden buchen, während Sie schlafen."
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "Detaillierte Umsatz- und Auslastungsberichte. Treffen Sie Entscheidungen basierend auf Daten."
    },
    {
      icon: Smartphone,
      title: "Mobile First",
      description: "Verwalten Sie Ihren Verleih von überall. Perfekt optimiert für Tablets und Smartphones."
    }
  ];

  const pricing = [
    {
      name: "Basic",
      price: { monthly: 29, yearly: 24 },
      description: "Perfekt für den Einstieg",
      features: ["Bis zu 20 Fahrräder", "Buchungskalender", "Rechnungen & Verträge", "E-Mail Support"],
      cta: "14 Tage testen",
      highlighted: false
    },
    {
      name: "Pro",
      price: { monthly: 59, yearly: 49 },
      description: "Für wachsende Verleihe",
      features: ["Bis zu 100 Fahrräder", "Alle Basic-Features", "Buchungs-Widget (Website)", "Voucher & Rabattcodes", "Branding & White-Label", "Priorität-Support"],
      cta: "14 Tage testen",
      highlighted: true,
      badge: "BELIEBT"
    },
    {
      name: "Unlimited",
      price: { monthly: 99, yearly: 82 },
      description: "Für professionelle Anbieter",
      features: ["Unbegrenzte Fahrräder", "Alle Pro-Features", "Multi-Standort", "API-Zugang", "Dedizierter Account Manager"],
      cta: "14 Tage testen",
      highlighted: false
    }
  ];

  const faqs = [
    { q: "Gibt es eine kostenlose Testphase?", a: "Ja, Sie können alle Pläne 14 Tage lang kostenlos testen. Keine Kreditkarte erforderlich." },
    { q: "Kann ich das Widget an mein Design anpassen?", a: "Absolut. Im Pro-Plan können Sie Farben, Schriften und Logos komplett an Ihre Brand anpassen (White-Label)." },
    { q: "Wie sicher sind meine Daten?", a: "Wir nutzen Server in Deutschland (ISO 27001 zertifiziert), tägliche Backups und modernste Verschlüsselung." },
    { q: "Gibt es eine Mindestvertragslaufzeit?", a: "Nein. Sie können monatlich kündigen oder upgraden/downgraden." }
  ];

  return (
    <div className="min-h-screen font-sans" style={{ background: C.bg }}>

      {/* ── Navigation ──────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b" style={{ borderColor: C.tint }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-18" style={{ height: "72px" }}>

            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: C.primary }}>
                <span className="text-white font-light text-base tracking-widest">L</span>
              </div>
              <span className="font-light tracking-[6px] text-sm uppercase" style={{ color: C.dark }}>LOCIVA</span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              {["features", "pricing", "faq"].map((id) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className="text-sm font-medium transition-colors"
                  style={{ color: C.neutral }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = C.primary; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = C.neutral; }}
                >
                  {id === "features" ? "Features" : id === "pricing" ? "Preise" : "FAQ"}
                </button>
              ))}
            </div>

            {/* CTA */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={onLogin}
                className="text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                style={{ color: C.dark }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.tint; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                Anmelden
              </button>
              <button
                onClick={onGetStarted}
                className="text-sm font-medium px-5 py-2.5 rounded-lg text-white transition-colors"
                style={{ background: C.primary }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.light; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = C.primary; }}
              >
                Jetzt starten
              </button>
            </div>

            {/* Mobile toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg transition-colors"
              style={{ color: C.neutral }}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t py-4 px-4" style={{ borderColor: C.tint }}>
            <div className="flex flex-col gap-1">
              {["features", "pricing", "faq"].map((id) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className="text-sm font-medium py-2.5 px-3 text-left rounded-lg transition-colors"
                  style={{ color: C.dark }}
                >
                  {id === "features" ? "Features" : id === "pricing" ? "Preise" : "FAQ"}
                </button>
              ))}
              <div className="mt-3 pt-3 flex flex-col gap-2" style={{ borderTop: `1px solid ${C.tint}` }}>
                <button onClick={onLogin} className="text-sm font-medium py-2.5 px-3 rounded-lg text-left transition-colors" style={{ color: C.dark }}>
                  Anmelden
                </button>
                <button
                  onClick={onGetStarted}
                  className="text-sm font-medium py-2.5 px-3 rounded-lg text-white text-center"
                  style={{ background: C.primary }}
                >
                  Jetzt starten
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-20 lg:pt-52 lg:pb-32 px-4 overflow-hidden">
        {/* Subtle background accent */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none opacity-30"
          style={{ background: `radial-gradient(circle, ${C.tint} 0%, transparent 70%)`, transform: "translate(20%, -20%)" }} />

        <div className="max-w-7xl mx-auto relative">
          <div className="text-center max-w-3xl mx-auto mb-16">

            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8 text-xs font-medium border"
              style={{ borderColor: C.tint, background: C.white, color: C.primary }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.primary }}></span>
              Jetzt in der Pilotphase — Rhein-Main
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-medium leading-tight mb-6"
              style={{ color: C.dark, letterSpacing: "-0.02em" }}>
              Lokale Erlebnisse.<br />
              <span style={{ color: C.primary }}>Automatisch gebucht.</span>
            </h1>

            <p className="text-lg leading-relaxed mb-10" style={{ color: C.neutral }}>
              Lociva verbindet Hotels, Gäste und lokale Anbieter — QR-Code im Zimmer, buchen in 60 Sekunden, Bezahlung automatisch per Stripe.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={onGetStarted}
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-white font-medium text-sm transition-colors"
                style={{ background: C.primary }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.light; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = C.primary; }}
              >
                Jetzt starten <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollTo("features")}
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-medium border transition-colors"
                style={{ color: C.dark, borderColor: C.tint, background: C.white }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.primary; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.tint; }}
              >
                Features ansehen
              </button>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm" style={{ color: C.neutral }}>
              {["Keine Kreditkarte", "14 Tage kostenlos", "Jederzeit kündbar"].map((t) => (
                <div key={t} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" style={{ color: C.primary }} />
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Dashboard preview */}
          <div className="relative mx-auto max-w-5xl">
            <div className="absolute -inset-px rounded-2xl" style={{ background: `linear-gradient(135deg, ${C.tint}, ${C.primary}22)` }} />
            <div className="relative rounded-2xl border bg-white shadow-xl overflow-hidden" style={{ borderColor: C.tint }}>
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ background: C.bg, borderColor: C.tint }}>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-300"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-300"></div>
                  <div className="w-3 h-3 rounded-full" style={{ background: C.light }}></div>
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-white rounded-md px-3 py-1.5 text-xs text-center border font-mono" style={{ color: C.neutral, borderColor: C.tint }}>
                    lociva.de/app
                  </div>
                </div>
              </div>

              {/* Mock dashboard content */}
              <div className="p-5" style={{ background: C.bg }}>
                <div className="grid grid-cols-3 gap-4 mb-5">
                  {[
                    { label: "Umsatz Monat", value: "2.845 €", delta: "+12.5%" },
                    { label: "Räder vermietet", value: "42 / 50", delta: "85%" },
                    { label: "Aktive Kunden", value: "128", delta: "+8" },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-white rounded-xl p-4 border" style={{ borderColor: C.tint }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-8 h-8 rounded-lg" style={{ background: C.tint }}></div>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "#D1FAE5", color: "#065F46" }}>
                          {stat.delta}
                        </span>
                      </div>
                      <div className="text-xl font-medium" style={{ color: C.dark }}>{stat.value}</div>
                      <div className="text-xs mt-0.5" style={{ color: C.neutral }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 bg-white rounded-xl p-5 border" style={{ borderColor: C.tint }}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium" style={{ color: C.dark }}>Buchungsübersicht</span>
                      <span className="text-xs px-2.5 py-1 rounded-lg border" style={{ color: C.primary, borderColor: C.tint }}>Details</span>
                    </div>
                    <div className="space-y-3">
                      {[["JD", "John Doe", "E-Bike Premium · 2 Tage", "89 €"], ["MK", "Maria Kurz", "City-Bike · 1 Tag", "35 €"]].map(([initials, name, detail, price]) => (
                        <div key={name} className="flex items-center justify-between p-3 rounded-xl" style={{ background: C.bg }}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white" style={{ background: C.primary }}>
                              {initials}
                            </div>
                            <div>
                              <div className="text-sm font-medium" style={{ color: C.dark }}>{name}</div>
                              <div className="text-xs" style={{ color: C.neutral }}>{detail}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium" style={{ color: C.dark }}>{price}</div>
                            <div className="text-xs" style={{ color: "#10B981" }}>Bezahlt</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl p-5 text-white" style={{ background: C.dark }}>
                    <div className="text-sm font-medium mb-4 opacity-90">Quick Actions</div>
                    <div className="space-y-2">
                      {[["Neue Buchung", Calendar], ["Rad hinzufügen", Bike], ["Newsletter", Mail]].map(([label, Icon]) => (
                        <button key={label} className="w-full py-2 px-3 rounded-lg text-xs text-left flex items-center gap-2 transition-colors"
                          style={{ background: "rgba(212,237,226,0.12)" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(212,237,226,0.2)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(212,237,226,0.12)"; }}>
                          <Icon className="w-3.5 h-3.5 opacity-80" /> {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust bar ───────────────────────────────────────────── */}
      <div className="py-6 border-y" style={{ borderColor: C.tint, background: C.white }}>
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs font-medium tracking-widest uppercase flex items-center justify-center gap-2" style={{ color: C.neutral }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.primary }}></span>
            Entwickelt für den deutschen Markt · DSGVO-konform · Server in Deutschland
          </p>
        </div>
      </div>

      {/* ── Features ────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-4" style={{ background: C.bg }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-medium mb-4" style={{ color: C.dark, letterSpacing: "-0.02em" }}>
              Alles was Sie brauchen.
            </h2>
            <p className="text-base leading-relaxed" style={{ color: C.neutral }}>
              Lociva wurde speziell für moderne Fahrradverleihe entwickelt. Kein Ballast — nur leistungsstarke Tools.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-7 border transition-all duration-200"
                style={{ borderColor: C.tint }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.boxShadow = `0 4px 20px rgba(26,125,90,0.08)`; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.tint; e.currentTarget.style.boxShadow = "none"; }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5" style={{ background: C.tint }}>
                  <feature.icon className="w-5 h-5" style={{ color: C.primary }} />
                </div>
                <h3 className="text-base font-medium mb-2" style={{ color: C.dark }}>{feature.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: C.neutral }}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-4" style={{ background: C.white }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-medium mb-6" style={{ color: C.dark, letterSpacing: "-0.02em" }}>
              Transparente Preise für jede Größe
            </h2>

            {/* Billing toggle */}
            <div className="inline-flex items-center p-1 rounded-full border" style={{ borderColor: C.tint, background: C.bg }}>
              {["monthly", "yearly"].map((cycle) => (
                <button
                  key={cycle}
                  onClick={() => setBillingCycle(cycle)}
                  className="px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2"
                  style={billingCycle === cycle
                    ? { background: C.white, color: C.dark, boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }
                    : { color: C.neutral }}
                >
                  {cycle === "monthly" ? "Monatlich" : "Jährlich"}
                  {cycle === "yearly" && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white leading-none" style={{ background: C.primary }}>−17%</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricing.map((plan, i) => (
              <div
                key={i}
                className="relative rounded-2xl p-8 flex flex-col border transition-all"
                style={plan.highlighted
                  ? { borderColor: C.primary, background: C.white, boxShadow: `0 0 0 4px ${C.tint}` }
                  : { borderColor: C.tint, background: C.white }}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white"
                    style={{ background: C.primary }}>
                    {plan.badge}
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-base font-medium mb-1" style={{ color: C.dark }}>{plan.name}</h3>
                  <p className="text-sm" style={{ color: C.neutral }}>{plan.description}</p>
                </div>

                <div className="mb-7">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-medium" style={{ color: C.dark }}>{plan.price[billingCycle]}€</span>
                    <span className="text-sm" style={{ color: C.neutral }}>/Monat</span>
                  </div>
                  {billingCycle === "yearly" && (
                    <p className="text-xs mt-1 font-medium" style={{ color: C.primary }}>
                      {plan.price.yearly * 12}€/Jahr · 2 Monate gratis
                    </p>
                  )}
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm" style={{ color: C.neutral }}>
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: C.primary }} />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={onGetStarted}
                  className="w-full py-3 rounded-xl text-sm font-medium transition-colors"
                  style={plan.highlighted
                    ? { background: C.primary, color: C.white }
                    : { background: C.tint, color: C.dark }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = plan.highlighted ? C.light : C.primary; if (!plan.highlighted) e.currentTarget.style.color = C.white; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = plan.highlighted ? C.primary : C.tint; if (!plan.highlighted) e.currentTarget.style.color = C.dark; }}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 px-4" style={{ background: C.bg }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-medium text-center mb-14" style={{ color: C.dark, letterSpacing: "-0.02em" }}>
            Häufige Fragen
          </h2>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <details key={i} className="group bg-white rounded-xl border overflow-hidden" style={{ borderColor: C.tint }}>
                <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                  <span className="text-sm font-medium" style={{ color: C.dark }}>{faq.q}</span>
                  <ChevronRight className="w-4 h-4 flex-shrink-0 group-open:rotate-90 transition-transform duration-200" style={{ color: C.neutral }} />
                </summary>
                <div className="px-5 pb-5 text-sm leading-relaxed" style={{ color: C.neutral }}>
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Footer ──────────────────────────────────────────── */}
      <section className="py-24 px-4" style={{ background: C.dark }}>
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-12 h-12 rounded-2xl mx-auto mb-8 flex items-center justify-center" style={{ background: C.primary }}>
            <span className="text-white font-light text-xl tracking-widest">L</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-medium text-white mb-5" style={{ letterSpacing: "-0.02em" }}>
            Bereit für das nächste Level?
          </h2>
          <p className="text-base mb-10" style={{ color: "#9CA3AF" }}>
            Starten Sie noch heute und digitalisieren Sie Ihren Verleih in weniger als 5 Minuten.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={onGetStarted}
              className="px-8 py-3.5 rounded-xl font-medium text-sm transition-colors"
              style={{ background: C.primary, color: C.white }}
              onMouseEnter={(e) => { e.currentTarget.style.background = C.light; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = C.primary; }}
            >
              Jetzt starten
            </button>
            <a
              href="mailto:info@lociva.de?subject=Anfrage"
              className="px-8 py-3.5 rounded-xl font-medium text-sm border transition-colors"
              style={{ color: C.white, borderColor: "rgba(255,255,255,0.2)" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
            >
              Kontakt aufnehmen
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="py-12 px-4 border-t" style={{ background: C.dark, borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: C.primary }}>
                  <span className="text-white font-light text-sm tracking-widest">L</span>
                </div>
                <span className="font-light tracking-[5px] text-xs uppercase text-white">LOCIVA</span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "#6B7280" }}>
                Die All-in-One Lösung für moderne Fahrradverleihe. Entwickelt in Deutschland.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-white mb-4">Produkt</h4>
              <ul className="space-y-2 text-sm" style={{ color: "#6B7280" }}>
                <li><button onClick={() => scrollTo("features")} className="hover:text-white transition-colors">Features</button></li>
                <li><button onClick={() => scrollTo("pricing")} className="hover:text-white transition-colors">Preise</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium text-white mb-4">Support</h4>
              <ul className="space-y-2 text-sm" style={{ color: "#6B7280" }}>
                <li><a href="mailto:info@lociva.de" className="hover:text-white transition-colors">info@lociva.de</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium text-white mb-4">Rechtliches</h4>
              <ul className="space-y-2 text-sm" style={{ color: "#6B7280" }}>
                <li><Link href="/impressum" className="hover:text-white transition-colors">Impressum</Link></li>
                <li><Link href="/datenschutz" className="hover:text-white transition-colors">Datenschutz</Link></li>
                <li><Link href="/agb" className="hover:text-white transition-colors">AGB</Link></li>
                <li>
                  <button
                    onClick={() => { localStorage.removeItem("cookie_consent"); window.location.reload(); }}
                    className="hover:text-white transition-colors"
                  >
                    Cookie Einstellungen
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs border-t" style={{ borderColor: "rgba(255,255,255,0.06)", color: "#4B5563" }}>
            <p>© {new Date().getFullYear()} Lociva · funk-e.solutions · Alle Rechte vorbehalten.</p>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#10B981" }}></div>
              <span>All Systems Operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
