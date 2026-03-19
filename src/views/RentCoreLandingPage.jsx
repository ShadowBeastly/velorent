"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Calendar, BarChart2, Bike, FileText, Settings, Users,
  ArrowRight, ChevronRight, Menu, X, Check, CheckCircle,
  CreditCard, Bell, Tag, Zap, Star, MapPin,
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

export default function RentCoreLandingPage({ onLogin, onGetStarted, onDemo }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top, behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen font-sans" style={{ background: C.bg }}>

      {/* ── Navigation ─────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b" style={{ borderColor: C.tint }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between" style={{ height: "72px" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: C.primary }}>
                <Bike className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-light tracking-[5px] text-sm uppercase" style={{ color: C.dark }}>RENTCORE</span>
                <span className="hidden sm:inline text-xs ml-3" style={{ color: C.neutral }}>by funk-e.solutions</span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-8">
              {[["features", "Features"], ["preise", "Preise"], ["lociva", "Lociva Add-on"], ["faq", "FAQ"]].map(([id, label]) => (
                <button key={id} onClick={() => scrollTo(id)}
                  className="text-sm font-medium transition-colors"
                  style={{ color: C.neutral }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = C.primary; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = C.neutral; }}>
                  {label}
                </button>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3">
              <button onClick={onLogin}
                className="text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                style={{ color: C.dark }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.tint; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                Anmelden
              </button>
              <button onClick={onDemo}
                className="text-sm font-medium px-4 py-2.5 rounded-lg border transition-colors"
                style={{ color: C.primary, borderColor: C.primary }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.tint; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                Demo ansehen
              </button>
              <button onClick={onGetStarted}
                className="text-sm font-medium px-5 py-2.5 rounded-lg text-white transition-colors"
                style={{ background: C.primary }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.light; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = C.primary; }}>
                Kostenlos testen
              </button>
            </div>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg" style={{ color: C.neutral }}>
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t py-4 px-4" style={{ borderColor: C.tint }}>
            <div className="flex flex-col gap-1">
              {[["features", "Features"], ["preise", "Preise"], ["lociva", "Lociva Add-on"], ["faq", "FAQ"]].map(([id, label]) => (
                <button key={id} onClick={() => scrollTo(id)}
                  className="text-sm font-medium py-2.5 px-3 text-left rounded-lg" style={{ color: C.dark }}>
                  {label}
                </button>
              ))}
              <div className="mt-3 pt-3 flex flex-col gap-2" style={{ borderTop: `1px solid ${C.tint}` }}>
                <button onClick={onLogin} className="text-sm font-medium py-2.5 px-3 rounded-lg text-left" style={{ color: C.dark }}>Anmelden</button>
                <button onClick={onDemo}
                  className="text-sm font-medium py-2.5 px-3 rounded-lg border text-center"
                  style={{ color: C.primary, borderColor: C.primary }}>
                  Live-Demo starten
                </button>
                <button onClick={onGetStarted}
                  className="text-sm font-medium py-2.5 px-3 rounded-lg text-white text-center"
                  style={{ background: C.primary }}>
                  Kostenlos testen
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-20 lg:pt-48 lg:pb-28 px-4 overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none opacity-30"
          style={{ background: `radial-gradient(circle, ${C.tint} 0%, transparent 70%)`, transform: "translate(20%, -20%)" }} />

        <div className="max-w-7xl mx-auto relative">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8 text-xs font-medium border"
              style={{ borderColor: C.tint, background: C.white, color: C.primary }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.primary }} />
              Buchungssystem für Fahrrad- und E-Bike-Verleiher
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-medium leading-tight mb-6"
              style={{ color: C.dark, letterSpacing: "-0.02em" }}>
              Mehr Buchungen.<br />
              <span style={{ color: C.primary }}>Weniger Aufwand.</span>
            </h1>

            <p className="text-lg leading-relaxed mb-10" style={{ color: C.neutral }}>
              RentCore ist das Buchungssystem speziell für Fahrrad- und E-Bike-Verleiher. Flotte verwalten, Buchungen annehmen, Rechnungen erstellen. Alles in einem. Ab 49 € pro Monat.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button onClick={onGetStarted}
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-white font-medium text-sm transition-colors"
                style={{ background: C.primary }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.light; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = C.primary; }}>
                14 Tage kostenlos testen <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={onDemo}
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-medium border transition-colors"
                style={{ color: C.primary, borderColor: C.primary, background: C.white }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.tint; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = C.white; }}>
                Live-Demo starten
              </button>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm" style={{ color: C.neutral }}>
              {["Keine Einrichtungsgebühr", "Kündigung jederzeit", "Entwickelt in Deutschland"].map((t) => (
                <div key={t} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" style={{ color: C.primary }} />
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Key stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { value: "49 €", label: "pro Monat" },
              { value: "5%", label: "Provision pro Buchung" },
              { value: "14 Tage", label: "kostenlos testen" },
              { value: "24/7", label: "Online-Buchungen" },
            ].map(({ value, label }) => (
              <div key={label} className="bg-white rounded-2xl p-5 border text-center" style={{ borderColor: C.tint }}>
                <div className="text-2xl font-medium mb-1" style={{ color: C.primary }}>{value}</div>
                <div className="text-xs" style={{ color: C.neutral }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust bar ───────────────────────────────────────────── */}
      <div className="py-6 border-y" style={{ borderColor: C.tint, background: C.white }}>
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs font-medium tracking-widest uppercase flex items-center justify-center gap-2" style={{ color: C.neutral }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.primary }} />
            DSGVO-konform · Stripe-Zahlungen · Supabase Cloud · Entwickelt in Deutschland
          </p>
        </div>
      </div>

      {/* ── Features ────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-4" style={{ background: C.bg }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-medium mb-4" style={{ color: C.dark, letterSpacing: "-0.02em" }}>
              Alles was du brauchst.
            </h2>
            <p className="text-base leading-relaxed" style={{ color: C.neutral }}>
              Von der Flottenverwaltung bis zur automatischen Abrechnung. RentCore deckt deinen kompletten Betrieb ab.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: Bike,
                title: "Flottenverwaltung",
                desc: "Alle Fahrräder und E-Bikes im Blick. Verfügbarkeit, Wartungsstatus und Kategorien auf einen Blick.",
              },
              {
                icon: Calendar,
                title: "Buchungskalender",
                desc: "Übersichtlicher Kalender mit allen Buchungen. Neue Reservierungen direkt eintragen oder online entgegennehmen.",
              },
              {
                icon: CreditCard,
                title: "Online-Zahlung",
                desc: "Kunden zahlen direkt bei der Buchung per Karte. Automatische Auszahlung auf dein Konto via Stripe.",
              },
              {
                icon: FileText,
                title: "Rechnungen & Belege",
                desc: "Automatische Rechnungserstellung nach jeder Buchung. PDF-Export für Steuerberater und Buchhaltung.",
              },
              {
                icon: Tag,
                title: "Gutscheine & Rabatte",
                desc: "Erstelle Rabattcodes und Gutscheine für Stammkunden, Kooperationen oder saisonale Aktionen.",
              },
              {
                icon: Bell,
                title: "Benachrichtigungen",
                desc: "Automatische Buchungsbestätigung per E-Mail an dich und den Kunden. Erinnerungen vor dem Mietbeginn.",
              },
              {
                icon: BarChart2,
                title: "Auswertungen",
                desc: "Umsatz, beliebteste Fahrräder, Auslastung. Alle Kennzahlen auf einen Blick.",
              },
              {
                icon: Users,
                title: "Kundenverwaltung",
                desc: "Stammkunden erkennen, Buchungshistorie einsehen, Kontaktdaten verwalten.",
              },
              {
                icon: Settings,
                title: "Flexibel anpassbar",
                desc: "Öffnungszeiten, Preiskategorien, Zusatzleistungen. Alles auf deinen Betrieb zugeschnitten.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-7 border transition-all duration-200"
                style={{ borderColor: C.tint }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.boxShadow = "0 8px 30px rgba(26,125,90,0.08)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.tint; e.currentTarget.style.boxShadow = "none"; }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5" style={{ background: C.tint }}>
                  <Icon className="w-5 h-5" style={{ color: C.primary }} />
                </div>
                <h3 className="text-base font-medium mb-2" style={{ color: C.dark }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: C.neutral }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────── */}
      <section id="preise" className="py-24 px-4" style={{ background: C.white }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-medium mb-4" style={{ color: C.dark, letterSpacing: "-0.02em" }}>
              Ein Plan. Transparent.
            </h2>
            <p className="text-base leading-relaxed" style={{ color: C.neutral }}>
              Keine versteckten Kosten. Kein Kleingedrucktes.
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <div className="rounded-2xl border-2 overflow-hidden" style={{ borderColor: C.primary }}>
              <div className="p-8 text-center" style={{ background: C.tint }}>
                <div className="text-xs font-medium tracking-widest uppercase mb-3" style={{ color: C.primary }}>RentCore</div>
                <div className="flex items-end justify-center gap-1 mb-1">
                  <span className="text-5xl font-medium" style={{ color: C.dark }}>49</span>
                  <span className="text-2xl font-medium mb-1" style={{ color: C.dark }}>€</span>
                  <span className="text-base mb-2" style={{ color: C.neutral }}>/Monat</span>
                </div>
                <p className="text-sm" style={{ color: C.neutral }}>+ 5% Provision auf jede Buchung</p>
              </div>

              <div className="p-8 bg-white">
                <ul className="space-y-3 mb-8">
                  {[
                    "Unbegrenzte Fahrräder & E-Bikes",
                    "Online-Buchungssystem",
                    "Automatische Zahlungsabwicklung (Stripe)",
                    "Buchungskalender",
                    "Rechnungserstellung & PDF-Export",
                    "Kundenverwaltung",
                    "Gutscheine & Rabattcodes",
                    "Auswertungen & Statistiken",
                    "E-Mail-Benachrichtigungen",
                    "14 Tage kostenlos testen",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm" style={{ color: C.neutral }}>
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: C.primary }} />
                      {f}
                    </li>
                  ))}
                </ul>

                <button onClick={onGetStarted}
                  className="w-full py-3.5 rounded-xl text-white font-medium text-sm transition-colors"
                  style={{ background: C.primary }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = C.light; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = C.primary; }}>
                  14 Tage kostenlos testen
                </button>
                <p className="text-center text-xs mt-3" style={{ color: C.neutral }}>Keine Kreditkarte nötig · Jederzeit kündbar</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Lociva Upsell ───────────────────────────────────────── */}
      <section id="lociva" className="py-24 px-4" style={{ background: C.bg }}>
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl overflow-hidden border" style={{ borderColor: C.tint }}>
            <div className="p-8 sm:p-12" style={{ background: `linear-gradient(135deg, ${C.dark} 0%, #2D4A3A 100%)` }}>
              <div className="flex items-center gap-2 mb-6">
                <div className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: C.primary, color: C.white }}>
                  Add-on
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: C.primary }}>
                    <span className="text-white font-light text-xs tracking-widest">L</span>
                  </div>
                  <span className="font-light tracking-[5px] text-xs uppercase text-white">LOCIVA</span>
                </div>
              </div>

              <h2 className="text-2xl sm:text-3xl font-medium text-white mb-4" style={{ letterSpacing: "-0.02em" }}>
                Noch mehr Buchungen?<br />Aktiviere Lociva.
              </h2>
              <p className="text-base mb-8 leading-relaxed" style={{ color: "#9CA3AF" }}>
                Lociva ist der Marketplace für Hotelgäste, direkt integriert in RentCore. Hotels platzieren einen QR-Code im Zimmer, Gäste buchen deine Fahrräder. Du bekommst neue Kunden ohne Marketingaufwand.
              </p>

              <div className="grid sm:grid-cols-3 gap-4 mb-8">
                {[
                  { icon: MapPin, text: "Hotelgäste in deiner Region buchen direkt bei dir" },
                  { icon: Zap, text: "Automatisch, kein Extra-Aufwand für dich" },
                  { icon: Star, text: "5% Provision auf Lociva-Buchungen (wie RentCore)" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-start gap-3 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: C.light }} />
                    <p className="text-sm leading-relaxed" style={{ color: "#D1D5DB" }}>{text}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/"
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-colors"
                  style={{ background: C.primary, color: C.white }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = C.light; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = C.primary; }}>
                  Mehr über Lociva <ArrowRight className="w-4 h-4" />
                </Link>
                <a href="mailto:info@lociva.de?subject=Lociva%20Add-on%20Interesse"
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-sm border transition-colors"
                  style={{ color: C.white, borderColor: "rgba(255,255,255,0.2)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}>
                  Fragen zum Add-on
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 px-4" style={{ background: C.white }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-medium text-center mb-14" style={{ color: C.dark, letterSpacing: "-0.02em" }}>
            Häufige Fragen
          </h2>

          <div className="space-y-3">
            {[
              { q: "Was kostet RentCore?", a: "49 € pro Monat, plus 5% Provision auf jede online abgewickelte Buchung. Keine Einrichtungsgebühr, keine versteckten Kosten. Die ersten 14 Tage sind kostenlos." },
              { q: "Wie funktioniert die Provision?", a: "Bei jeder Buchung die über RentCore bezahlt wird, gehen automatisch 5% an die Plattform. Buchungen die du direkt bar abrechnest, sind davon nicht betroffen." },
              { q: "Kann ich RentCore ohne Lociva nutzen?", a: "Ja, absolut. RentCore ist ein eigenständiges Buchungssystem. Lociva ist ein optionales Add-on um Hotelgäste als neue Kundengruppe zu erschließen." },
              { q: "Wie lange dauert die Einrichtung?", a: "Ca. 30 Minuten. Du legst dein Konto an, trägst deine Fahrräder ein und verbindest dein Stripe-Konto. Dann kannst du sofort Buchungen entgegennehmen." },
              { q: "Was passiert nach dem Testzeitraum?", a: "Nach 14 Tagen beginnt automatisch dein Abo für 49 € pro Monat, aber nur wenn du aktiv bestätigst. Du wirst vorher per E-Mail informiert." },
              { q: "Für wen ist RentCore geeignet?", a: "Für Fahrrad- und E-Bike-Verleiher jeder Größe. Vom Einzelunternehmer mit 10 Rädern bis zum Betrieb mit 100+ Bikes. Derzeit optimiert für Fahrräder und E-Bikes." },
            ].map((faq, i) => (
              <details key={i} className="group rounded-xl border overflow-hidden" style={{ borderColor: C.tint, background: C.bg }}>
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
            <Bike className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-medium text-white mb-5" style={{ letterSpacing: "-0.02em" }}>
            Bereit loszulegen?
          </h2>
          <p className="text-base mb-10" style={{ color: "#9CA3AF" }}>
            14 Tage kostenlos testen. Keine Kreditkarte nötig. Einfach anmelden und direkt starten.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={onGetStarted}
              className="px-8 py-3.5 rounded-xl font-medium text-sm transition-colors"
              style={{ background: C.primary, color: C.white }}
              onMouseEnter={(e) => { e.currentTarget.style.background = C.light; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = C.primary; }}>
              Kostenlos starten
            </button>
            <a href="mailto:info@rentcore.de?subject=Frage%20zu%20RentCore"
              className="px-8 py-3.5 rounded-xl font-medium text-sm border transition-colors"
              style={{ color: C.white, borderColor: "rgba(255,255,255,0.2)" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}>
              Frage stellen
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
                  <Bike className="w-4 h-4 text-white" />
                </div>
                <span className="font-light tracking-[5px] text-xs uppercase text-white">RENTCORE</span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "#6B7280" }}>
                Buchungssystem für Fahrrad- und E-Bike-Verleiher. Ein Produkt von funk-e.solutions.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-white mb-4">Produkt</h4>
              <ul className="space-y-2 text-sm" style={{ color: "#6B7280" }}>
                <li><button onClick={() => scrollTo("features")} className="hover:text-white transition-colors">Features</button></li>
                <li><button onClick={() => scrollTo("preise")} className="hover:text-white transition-colors">Preise</button></li>
                <li><button onClick={() => scrollTo("lociva")} className="hover:text-white transition-colors">Lociva Add-on</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium text-white mb-4">Kontakt</h4>
              <ul className="space-y-2 text-sm" style={{ color: "#6B7280" }}>
                <li><a href="mailto:info@rentcore.de" className="hover:text-white transition-colors">info@rentcore.de</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium text-white mb-4">Rechtliches</h4>
              <ul className="space-y-2 text-sm" style={{ color: "#6B7280" }}>
                <li><Link href="/impressum" className="hover:text-white transition-colors">Impressum</Link></li>
                <li><Link href="/datenschutz" className="hover:text-white transition-colors">Datenschutz</Link></li>
                <li><Link href="/agb" className="hover:text-white transition-colors">AGB</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs border-t" style={{ borderColor: "rgba(255,255,255,0.06)", color: "#4B5563" }}>
            <p>© {new Date().getFullYear()} RentCore · funk-e.solutions · Alle Rechte vorbehalten.</p>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#10B981" }} />
              <span>All Systems Operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
