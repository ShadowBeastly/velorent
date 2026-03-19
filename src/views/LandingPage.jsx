"use client";
import { useState } from "react";
import Link from "next/link";
import {
  QrCode, Building2, Bike, Euro, ArrowRight,
  ChevronRight, Menu, X, Check, CheckCircle,
  Scan, CreditCard, TrendingUp, Shield
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

// eslint-disable-next-line no-unused-vars
export default function LandingPage({ onGetStarted, onLogin }) {
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

      {/* ── Navigation ──────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b" style={{ borderColor: C.tint }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between" style={{ height: "72px" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: C.primary }}>
                <span className="text-white font-light text-base tracking-widest">L</span>
              </div>
              <span className="font-light tracking-[6px] text-sm uppercase" style={{ color: C.dark }}>LOCIVA</span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              {[["so-funktionierts", "So funktioniert's"], ["vorteile", "Vorteile"], ["faq", "FAQ"]].map(([id, label]) => (
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
              <a href="mailto:info@lociva.de?subject=Pilotphase%20Interesse"
                className="text-sm font-medium px-5 py-2.5 rounded-lg text-white transition-colors inline-block"
                style={{ background: C.primary }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.light; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = C.primary; }}>
                Kontakt aufnehmen
              </a>
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
              {[["so-funktionierts", "So funktioniert's"], ["vorteile", "Vorteile"], ["faq", "FAQ"]].map(([id, label]) => (
                <button key={id} onClick={() => scrollTo(id)}
                  className="text-sm font-medium py-2.5 px-3 text-left rounded-lg" style={{ color: C.dark }}>
                  {label}
                </button>
              ))}
              <div className="mt-3 pt-3 flex flex-col gap-2" style={{ borderTop: `1px solid ${C.tint}` }}>
                <button onClick={onLogin} className="text-sm font-medium py-2.5 px-3 rounded-lg text-left" style={{ color: C.dark }}>Anmelden</button>
                <a href="mailto:info@lociva.de?subject=Pilotphase%20Interesse"
                  className="text-sm font-medium py-2.5 px-3 rounded-lg text-white text-center"
                  style={{ background: C.primary }}>
                  Kontakt aufnehmen
                </a>
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
              Pilotphase — Rhein-Main · Sommer 2026
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-medium leading-tight mb-6"
              style={{ color: C.dark, letterSpacing: "-0.02em" }}>
              Lokale Erlebnisse.<br />
              <span style={{ color: C.primary }}>Einfach. Hier.</span>
            </h1>

            <p className="text-lg leading-relaxed mb-10" style={{ color: C.neutral }}>
              Lociva bringt lokale Aktivitäten direkt ins Hotelzimmer — per QR-Code. Gäste scannen, buchen und bezahlen in 60 Sekunden. Hotels und Anbieter profitieren automatisch.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a href="mailto:info@lociva.de?subject=Pilotphase%20Interesse"
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-white font-medium text-sm transition-colors"
                style={{ background: C.primary }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.light; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = C.primary; }}>
                Partner werden <ArrowRight className="w-4 h-4" />
              </a>
              <button onClick={() => scrollTo("so-funktionierts")}
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-medium border transition-colors"
                style={{ color: C.dark, borderColor: C.tint, background: C.white }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.primary; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.tint; }}>
                So funktioniert&apos;s
              </button>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm" style={{ color: C.neutral }}>
              {["Kostenlos für Hotels", "Keine App nötig", "Automatische Auszahlung"].map((t) => (
                <div key={t} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" style={{ color: C.primary }} />
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Flow Visualization */}
          <div className="relative mx-auto max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: QrCode, step: "1", title: "QR-Code scannen", desc: "Gast scannt den Code im Hotelzimmer oder an der Rezeption", color: C.primary },
                { icon: Scan, step: "2", title: "Aktivität buchen", desc: "E-Bikes, Kanus, Stadtführungen — alles direkt verfügbar", color: C.light },
                { icon: CreditCard, step: "3", title: "Online bezahlen", desc: "Sichere Zahlung via Stripe. Anbieter erhält automatische Auszahlung", color: C.dark },
              ].map(({ icon: Icon, step, title, desc, color }) => (
                <div key={step} className="relative bg-white rounded-2xl p-7 border text-center transition-all duration-200"
                  style={{ borderColor: C.tint }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.boxShadow = "0 8px 30px rgba(26,125,90,0.08)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.tint; e.currentTarget.style.boxShadow = "none"; }}>
                  <div className="w-12 h-12 rounded-2xl mx-auto mb-5 flex items-center justify-center" style={{ background: C.tint }}>
                    <Icon className="w-6 h-6" style={{ color }} />
                  </div>
                  <div className="text-xs font-medium mb-2 px-2.5 py-0.5 rounded-full inline-block" style={{ background: C.tint, color: C.primary }}>
                    Schritt {step}
                  </div>
                  <h3 className="text-base font-medium mb-2" style={{ color: C.dark }}>{title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: C.neutral }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust bar ───────────────────────────────────────────── */}
      <div className="py-6 border-y" style={{ borderColor: C.tint, background: C.white }}>
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs font-medium tracking-widest uppercase flex items-center justify-center gap-2" style={{ color: C.neutral }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.primary }} />
            DSGVO-konform · Stripe-Zahlungen · Entwickelt in Deutschland
          </p>
        </div>
      </div>

      {/* ── Three Sides ────────────────────────────────────────── */}
      <section id="so-funktionierts" className="py-24 px-4" style={{ background: C.bg }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-medium mb-4" style={{ color: C.dark, letterSpacing: "-0.02em" }}>
              Drei Partner. Ein System.
            </h2>
            <p className="text-base leading-relaxed" style={{ color: C.neutral }}>
              Lociva verbindet Hotels, Gäste und lokale Anbieter — jeder profitiert.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Building2,
                title: "Für Hotels",
                subtitle: "Kostenlos",
                points: ["QR-Code im Zimmer platzieren", "Gäste begeistern ohne Aufwand", "Optionale Provision pro Buchung", "Echtzeit-Dashboard mit Statistiken"],
                highlight: false,
              },
              {
                icon: QrCode,
                title: "Für Gäste",
                subtitle: "Kein Login nötig",
                points: ["QR-Code scannen, sofort buchen", "Lokale Aktivitäten entdecken", "Sichere Online-Bezahlung", "Bestätigung per E-Mail"],
                highlight: true,
              },
              {
                icon: Bike,
                title: "Für Anbieter",
                subtitle: "Nur bei Buchung",
                points: ["Neue Kunden über Hotels", "Automatische Auszahlung via Stripe", "Eigenes Dashboard zur Verwaltung", "Keine Fixkosten — nur Provision"],
                highlight: false,
              },
            ].map(({ icon: Icon, title, subtitle, points, highlight }) => (
              <div key={title}
                className="rounded-2xl p-8 border transition-all duration-200"
                style={highlight
                  ? { borderColor: C.primary, background: C.white, boxShadow: `0 0 0 4px ${C.tint}` }
                  : { borderColor: C.tint, background: C.white }}
                onMouseEnter={(e) => { if (!highlight) { e.currentTarget.style.borderColor = C.primary; } }}
                onMouseLeave={(e) => { if (!highlight) { e.currentTarget.style.borderColor = C.tint; } }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5" style={{ background: C.tint }}>
                  <Icon className="w-5 h-5" style={{ color: C.primary }} />
                </div>
                <h3 className="text-lg font-medium mb-1" style={{ color: C.dark }}>{title}</h3>
                <p className="text-xs font-medium mb-5 px-2.5 py-0.5 rounded-full inline-block" style={{ background: C.tint, color: C.primary }}>{subtitle}</p>
                <ul className="space-y-3">
                  {points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm" style={{ color: C.neutral }}>
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: C.primary }} />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Vorteile / Why Lociva ──────────────────────────────── */}
      <section id="vorteile" className="py-24 px-4" style={{ background: C.white }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-medium mb-4" style={{ color: C.dark, letterSpacing: "-0.02em" }}>
              Warum Lociva?
            </h2>
            <p className="text-base leading-relaxed" style={{ color: C.neutral }}>
              Keine App. Kein Login. Keine Komplexität. Nur ein QR-Code und zufriedene Gäste.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Euro, title: "Keine Fixkosten", desc: "Hotels nutzen Lociva kostenlos. Anbieter zahlen nur bei erfolgreicher Buchung — 5-15% Provision." },
              { icon: Shield, title: "Sicher & DSGVO", desc: "Zahlungen über Stripe. Kein Login für Gäste. Alle Daten DSGVO-konform in der EU gehostet." },
              { icon: TrendingUp, title: "Mehr Umsatz", desc: "Hotels bieten echten Mehrwert. Anbieter gewinnen Kunden, die sie sonst nie erreicht hätten." },
              { icon: QrCode, title: "60-Sekunden-Buchung", desc: "Vom Scan bis zur Buchung. Keine App, kein Login, keine Wartezeit. Funktioniert auf jedem Smartphone." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl p-7 border transition-all duration-200"
                style={{ borderColor: C.tint, background: C.bg }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.boxShadow = "0 4px 20px rgba(26,125,90,0.08)"; }}
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

      {/* ── Pricing Summary ───────────────────────────────────── */}
      <section className="py-24 px-4" style={{ background: C.bg }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-medium mb-4" style={{ color: C.dark, letterSpacing: "-0.02em" }}>
              Einfaches Provisionsmodell
            </h2>
            <p className="text-base leading-relaxed" style={{ color: C.neutral }}>
              Keine monatlichen Gebühren. Lociva verdient nur, wenn Anbieter verdienen.
            </p>
          </div>

          <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: C.tint }}>
            <div className="grid grid-cols-3 text-center border-b" style={{ borderColor: C.tint, background: C.tint }}>
              <div className="p-4 text-sm font-medium" style={{ color: C.dark }}>Kategorie</div>
              <div className="p-4 text-sm font-medium" style={{ color: C.dark }}>Provision</div>
              <div className="p-4 text-sm font-medium" style={{ color: C.dark }}>Beispiel</div>
            </div>
            {[
              ["Fahrräder / E-Bikes", "5%", "50 € Buchung → 2,50 € Provision"],
              ["Kanu, SUP, Go-Kart", "10%", "40 € Buchung → 4,00 € Provision"],
              ["Führungen, Wellness", "12%", "65 € Buchung → 7,80 € Provision"],
              ["Premium (Segeln, Ballon)", "15%", "150 € Buchung → 22,50 € Provision"],
            ].map(([cat, pct, example]) => (
              <div key={cat} className="grid grid-cols-3 text-center border-b last:border-0 transition-colors"
                style={{ borderColor: C.tint }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.bg; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = C.white; }}>
                <div className="p-4 text-sm font-medium" style={{ color: C.dark }}>{cat}</div>
                <div className="p-4">
                  <span className="text-sm font-bold px-3 py-1 rounded-full" style={{ background: C.tint, color: C.primary }}>{pct}</span>
                </div>
                <div className="p-4 text-sm" style={{ color: C.neutral }}>{example}</div>
              </div>
            ))}
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
              { q: "Was kostet Lociva für Hotels?", a: "Nichts. Hotels nutzen Lociva komplett kostenlos. Wir verdienen ausschließlich über Provisionen auf Buchungen bei den Anbietern." },
              { q: "Brauchen Gäste eine App oder ein Konto?", a: "Nein. Gäste scannen einfach den QR-Code mit der Smartphone-Kamera und können sofort buchen. Kein Download, kein Login." },
              { q: "Wie werden Anbieter bezahlt?", a: "Automatisch über Stripe Connect. Nach jeder Buchung wird der Anbieteranteil direkt ausgezahlt — abzüglich der vereinbarten Provision." },
              { q: "Welche Aktivitäten können angeboten werden?", a: "Zum Start: E-Bikes und Fahrräder. Danach: Kanu, SUP, Kletterparks, Stadtführungen, Weinproben, Wellness — alle lokalen Erlebnisse." },
              { q: "Wie funktioniert die Stornierung?", a: "Gäste erhalten per E-Mail einen Stornierungslink. Bis 24 Stunden vor Beginn ist die Stornierung kostenlos, danach fällt eine Gebühr von 50% an." },
              { q: "In welcher Region startet Lociva?", a: "Rhein-Main (Frankfurt, Bad Homburg, Rheingau) im Sommer 2026. Danach Expansion in den gesamten DACH-Raum." },
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
            <span className="text-white font-light text-xl tracking-widest">L</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-medium text-white mb-5" style={{ letterSpacing: "-0.02em" }}>
            Dabei sein von Anfang an?
          </h2>
          <p className="text-base mb-10" style={{ color: "#9CA3AF" }}>
            Wir suchen Hotels und Anbieter für unsere Pilotphase in Rhein-Main. Melden Sie sich — wir melden uns innerhalb von 24 Stunden.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="mailto:info@lociva.de?subject=Pilotphase%20Interesse"
              className="px-8 py-3.5 rounded-xl font-medium text-sm transition-colors inline-block"
              style={{ background: C.primary, color: C.white }}
              onMouseEnter={(e) => { e.currentTarget.style.background = C.light; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = C.primary; }}>
              Partner werden
            </a>
            <a href="mailto:info@lociva.de?subject=Frage%20zu%20Lociva"
              className="px-8 py-3.5 rounded-xl font-medium text-sm border transition-colors inline-block"
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
                  <span className="text-white font-light text-sm tracking-widest">L</span>
                </div>
                <span className="font-light tracking-[5px] text-xs uppercase text-white">LOCIVA</span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "#6B7280" }}>
                Lokale Erlebnisse für Hotelgäste. Ein Produkt von funk-e.solutions.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-white mb-4">Plattform</h4>
              <ul className="space-y-2 text-sm" style={{ color: "#6B7280" }}>
                <li><button onClick={() => scrollTo("so-funktionierts")} className="hover:text-white transition-colors">So funktioniert&apos;s</button></li>
                <li><button onClick={() => scrollTo("vorteile")} className="hover:text-white transition-colors">Vorteile</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium text-white mb-4">Kontakt</h4>
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
                  <button onClick={() => { localStorage.removeItem("cookie_consent"); window.location.reload(); }}
                    className="hover:text-white transition-colors">
                    Cookie Einstellungen
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs border-t" style={{ borderColor: "rgba(255,255,255,0.06)", color: "#4B5563" }}>
            <p>© {new Date().getFullYear()} Lociva · funk-e.solutions · Alle Rechte vorbehalten.</p>
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
