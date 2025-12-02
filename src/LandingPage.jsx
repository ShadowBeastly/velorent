import React, { useState } from "react";
import {
  Bike, Calendar, Users, BarChart3, Globe, Shield, Zap, Check,
  ChevronRight, Star, Play, ArrowRight, Menu, X, Mail, Phone,
  MapPin, Clock, CreditCard, Smartphone, Cloud, Lock, HeadphonesIcon,
  Building, Euro, TrendingUp, Timer, CheckCircle, Sparkles
} from "lucide-react";

// ============ LANDING PAGE ============
export default function LandingPage({ onGetStarted, onLogin }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState("monthly"); // monthly | yearly

  const features = [
    {
      icon: Calendar,
      title: "Buchungskalender",
      description: "Übersichtlicher Kalender mit Drag & Drop. Sehen Sie auf einen Blick, welches Rad wann verfügbar ist."
    },
    {
      icon: Bike,
      title: "Flottenverwaltung",
      description: "Verwalten Sie E-Bikes, Lastenräder, Kinderräder – alle Details an einem Ort."
    },
    {
      icon: Users,
      title: "Kundendatenbank",
      description: "Kontaktdaten, Buchungshistorie, Umsatz pro Kunde – alles automatisch erfasst."
    },
    {
      icon: Globe,
      title: "Online-Buchungswidget",
      description: "Kunden buchen direkt auf Ihrer Website. 24/7, ohne Anruf, ohne Wartezeit."
    },
    {
      icon: BarChart3,
      title: "Statistiken & Reports",
      description: "Umsatz, Auslastung, Top-Kunden – treffen Sie datenbasierte Entscheidungen."
    },
    {
      icon: Smartphone,
      title: "Responsive Design",
      description: "Funktioniert perfekt auf Desktop, Tablet und Smartphone – auch an der Rezeption."
    }
  ];

  const pricing = [
    {
      name: "Free",
      price: { monthly: 0, yearly: 0 },
      description: "Perfekt zum Testen",
      features: [
        "3 Fahrräder",
        "1 Benutzer",
        "Buchungskalender",
        "Kundenverwaltung",
        "E-Mail Support"
      ],
      cta: "Kostenlos starten",
      highlighted: false
    },
    {
      name: "Basic",
      price: { monthly: 39, yearly: 390 },
      description: "Für kleine Verleiher",
      features: [
        "15 Fahrräder",
        "2 Benutzer",
        "Alles aus Free",
        "Online-Buchungswidget",
        "Statistiken & Reports",
        "PDF Mietverträge"
      ],
      cta: "14 Tage kostenlos testen",
      highlighted: false
    },
    {
      name: "Pro",
      price: { monthly: 89, yearly: 890 },
      description: "Für Hotels & Profis",
      features: [
        "50 Fahrräder",
        "5 Benutzer",
        "Alles aus Basic",
        "White-Label Widget",
        "Multi-Standort",
        "Priority Support"
      ],
      cta: "14 Tage kostenlos testen",
      highlighted: true,
      badge: "EMPFEHLUNG"
    },
    {
      name: "Unlimited",
      price: { monthly: 149, yearly: 1490 },
      description: "Maximale Power",
      features: [
        "Unbegrenzte Fahrräder",
        "Unbegrenzte Benutzer",
        "Alles aus Pro",
        "API Zugang",
        "Premium Support",
        "Onboarding Hilfe"
      ],
      cta: "Kontakt aufnehmen",
      highlighted: false
    }
  ];

  const testimonials = [
    {
      quote: "Endlich keine Excel-Listen mehr! Wir sparen jeden Tag mindestens eine Stunde.",
      author: "Thomas M.",
      role: "Hotel Seeblick, Bayern",
      avatar: "TM"
    },
    {
      quote: "Das Online-Buchungswidget ist Gold wert. Gäste buchen jetzt selbst, auch nachts.",
      author: "Sandra K.",
      role: "Fahrradverleih Küste, Nordsee",
      avatar: "SK"
    },
    {
      quote: "Einfach zu bedienen, auch für meine Mitarbeiter ohne IT-Erfahrung.",
      author: "Michael R.",
      role: "BikePoint Alpen, Tirol",
      avatar: "MR"
    }
  ];

  const faqs = [
    {
      q: "Brauche ich technische Kenntnisse?",
      a: "Nein! VeloRent ist so einfach wie eine App auf Ihrem Handy. Wenn Sie E-Mails schreiben können, können Sie auch VeloRent bedienen."
    },
    {
      q: "Kann ich meine bestehenden Daten importieren?",
      a: "Ja, Sie können Räder und Kunden per CSV importieren. Wir helfen Ihnen gerne beim Umzug."
    },
    {
      q: "Was passiert mit meinen Daten?",
      a: "Ihre Daten werden verschlüsselt in deutschen Rechenzentren gespeichert. DSGVO-konform, mit täglichen Backups."
    },
    {
      q: "Kann ich jederzeit kündigen?",
      a: "Ja, monatlich kündbar. Keine Mindestlaufzeit, keine versteckten Kosten."
    },
    {
      q: "Gibt es eine App?",
      a: "VeloRent läuft im Browser – auf jedem Gerät, ohne Installation. Speichern Sie es einfach auf Ihrem Homescreen."
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Bike className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900">VeloRent</span>
              <span className="text-xs font-semibold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">PRO</span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-slate-600 hover:text-slate-900 font-medium">Features</a>
              <a href="#pricing" className="text-slate-600 hover:text-slate-900 font-medium">Preise</a>
              <a href="#testimonials" className="text-slate-600 hover:text-slate-900 font-medium">Kunden</a>
              <a href="#faq" className="text-slate-600 hover:text-slate-900 font-medium">FAQ</a>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={onLogin}
                className="px-4 py-2 text-slate-700 font-medium hover:text-slate-900"
              >
                Anmelden
              </button>
              <button
                onClick={onGetStarted}
                className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-lg shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all"
              >
                Kostenlos starten
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 py-4 px-4">
            <div className="flex flex-col gap-4">
              <a href="#features" className="text-slate-600 font-medium py-2">Features</a>
              <a href="#pricing" className="text-slate-600 font-medium py-2">Preise</a>
              <a href="#testimonials" className="text-slate-600 font-medium py-2">Kunden</a>
              <a href="#faq" className="text-slate-600 font-medium py-2">FAQ</a>
              <hr className="border-slate-200" />
              <button onClick={onLogin} className="text-left text-slate-700 font-medium py-2">Anmelden</button>
              <button
                onClick={onGetStarted}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-lg"
              >
                Kostenlos starten
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-b from-orange-50 to-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                Neu: Online-Buchungswidget für Ihre Website
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight mb-6">
                Fahrradverleih
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500"> einfach </span>
                verwalten
              </h1>

              <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                Die All-in-One Software für Hotels, Pensionen und Fahrradverleiher.
                Buchungen, Kunden, Statistiken – alles in einer Anwendung.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <button
                  onClick={onGetStarted}
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-lg font-semibold rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all"
                >
                  Kostenlos starten
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  Keine Kreditkarte nötig
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  DSGVO-konform
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  In 2 Minuten startklar
                </div>
              </div>
            </div>

            {/* Hero Image / Dashboard Preview */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl blur-3xl opacity-20 scale-95"></div>
              <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                {/* Fake Browser Chrome */}
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 border-b border-slate-200">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-white rounded-md px-3 py-1 text-xs text-slate-400 text-center">
                      app.velorent.de
                    </div>
                  </div>
                </div>
                {/* Dashboard Preview */}
                <div className="p-4 bg-slate-950">
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {[
                      { label: "Aktiv", value: "12", color: "orange" },
                      { label: "Unterwegs", value: "8", color: "blue" },
                      { label: "Umsatz", value: "2.4k", color: "emerald" },
                      { label: "Heute", value: "3/2", color: "violet" }
                    ].map((stat, i) => (
                      <div key={i} className="bg-slate-900 rounded-lg p-3 border border-slate-800">
                        <div className="text-slate-500 text-xs mb-1">{stat.label}</div>
                        <div className={`text-lg font-bold text-${stat.color}-400`}>{stat.value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-4 h-4 text-slate-500" />
                      <span className="text-sm text-slate-400">November 2024</span>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: 35 }, (_, i) => (
                        <div
                          key={i}
                          className={`aspect-square rounded text-xs flex items-center justify-center ${i === 15 ? "bg-orange-500 text-white" :
                            [8, 9, 10, 22, 23].includes(i) ? "bg-blue-500/20 text-blue-400" :
                              "text-slate-600"
                            }`}
                        >
                          {(i % 31) + 1}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Cards */}
              <div className="absolute -right-4 top-1/4 bg-white rounded-xl shadow-xl p-4 border border-slate-100 animate-float">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Check className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Neue Buchung</div>
                    <div className="text-xs text-slate-500">E-Bike Premium • 3 Tage</div>
                  </div>
                </div>
              </div>

              <div className="absolute -left-4 bottom-1/4 bg-white rounded-xl shadow-xl p-4 border border-slate-100 animate-float-delayed">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">+23% Umsatz</div>
                    <div className="text-xs text-slate-500">vs. letzter Monat</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logos / Social Proof */}
      <section className="py-12 border-y border-slate-100 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-slate-500 mb-8">Vertrauen von Verleihern in ganz Deutschland, Österreich und der Schweiz</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60">
            {["Hotels", "Pensionen", "Campingplätze", "Fahrradverleiher", "Tourismusbüros"].map((name, i) => (
              <div key={i} className="flex items-center gap-2 text-slate-400">
                <Building className="w-5 h-5" />
                <span className="font-medium">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Alles was Sie brauchen. Nichts was Sie nicht brauchen.
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              VeloRent wurde speziell für Fahrradverleiher entwickelt – nicht für Autovermietungen oder Hotels. Jede Funktion macht Sinn.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div
                key={i}
                className="group p-6 bg-white rounded-2xl border border-slate-200 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              In 3 Schritten startklar
            </h2>
            <p className="text-xl text-slate-600">
              Keine Installation, keine Schulung, keine IT-Abteilung nötig.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Account erstellen",
                description: "E-Mail eingeben, Passwort wählen – fertig. Dauert keine 2 Minuten.",
                icon: Mail
              },
              {
                step: "2",
                title: "Räder hinzufügen",
                description: "Tragen Sie Ihre Fahrräder ein. Name, Preis, Kategorie – mehr braucht's nicht.",
                icon: Bike
              },
              {
                step: "3",
                title: "Buchungen annehmen",
                description: "Ab sofort können Sie Buchungen erfassen – oder Kunden buchen online selbst.",
                icon: Calendar
              }
            ].map((item, i) => (
              <div key={i} className="relative">
                {i < 2 && (
                  <div className="hidden md:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-orange-300 to-transparent -translate-x-1/2 z-0"></div>
                )}
                <div className="relative bg-white rounded-2xl p-8 border border-slate-200 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-500/20">
                    <span className="text-2xl font-bold text-white">{item.step}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">{item.title}</h3>
                  <p className="text-slate-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Einfache, transparente Preise
            </h2>
            <p className="text-xl text-slate-600 mb-8">
              Keine versteckten Kosten. Monatlich kündbar.
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-3 p-1 bg-slate-100 rounded-full">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${billingCycle === "monthly" ? "bg-white text-slate-900 shadow" : "text-slate-600"
                  }`}
              >
                Monatlich
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${billingCycle === "yearly" ? "bg-white text-slate-900 shadow" : "text-slate-600"
                  }`}
              >
                Jährlich
                <span className="ml-2 text-xs text-emerald-600 font-semibold">-17%</span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {pricing.map((plan, i) => (
              <div
                key={i}
                className={`relative rounded-2xl p-8 ${plan.highlighted
                  ? "bg-gradient-to-b from-orange-500 to-amber-500 text-white shadow-xl shadow-orange-500/25 scale-105"
                  : "bg-white border-2 border-slate-200"
                  }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded-full">
                    {plan.badge}
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className={`text-xl font-bold mb-2 ${plan.highlighted ? "text-white" : "text-slate-900"}`}>
                    {plan.name}
                  </h3>
                  <p className={`text-sm ${plan.highlighted ? "text-orange-100" : "text-slate-500"}`}>
                    {plan.description}
                  </p>
                </div>

                <div className="text-center mb-6">
                  <span className={`text-5xl font-bold ${plan.highlighted ? "text-white" : "text-slate-900"}`}>
                    {plan.price[billingCycle]}€
                  </span>
                  <span className={plan.highlighted ? "text-orange-100" : "text-slate-500"}>
                    /{billingCycle === "monthly" ? "Monat" : "Jahr"}
                  </span>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-3">
                      <Check className={`w-5 h-5 flex-shrink-0 ${plan.highlighted ? "text-orange-200" : "text-emerald-500"}`} />
                      <span className={plan.highlighted ? "text-white" : "text-slate-600"}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={onGetStarted}
                  className={`w-full py-3 rounded-xl font-semibold transition-all ${plan.highlighted
                    ? "bg-white text-orange-600 hover:bg-orange-50"
                    : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>

          {/* Money Back */}
          <div className="text-center mt-12">
            <div className="inline-flex items-center gap-2 text-slate-600">
              <Shield className="w-5 h-5 text-emerald-500" />
              <span>14 Tage Geld-zurück-Garantie • Keine Kreditkarte nötig</span>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Was unsere Kunden sagen
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 border border-slate-200">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-5 h-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-700 mb-6 text-lg leading-relaxed">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center text-white font-bold">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{t.author}</div>
                    <div className="text-sm text-slate-500">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Häufige Fragen
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <details key={i} className="group bg-white rounded-xl border border-slate-200 overflow-hidden">
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                  <span className="font-semibold text-slate-900">{faq.q}</span>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="px-6 pb-6 text-slate-600">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-gradient-to-r from-orange-500 to-amber-500">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Bereit, Ihren Fahrradverleih zu digitalisieren?
          </h2>
          <p className="text-xl text-orange-100 mb-8">
            Starten Sie jetzt kostenlos – keine Kreditkarte, keine Verpflichtung.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onGetStarted}
              className="flex items-center justify-center gap-2 px-8 py-4 bg-white text-orange-600 text-lg font-semibold rounded-xl hover:bg-orange-50 transition-all"
            >
              Kostenlos starten
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                  <Bike className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">VeloRent</span>
              </div>
              <p className="text-sm">
                Die moderne Software für Fahrradverleiher. Made in Germany.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Produkt</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><a href="#pricing" className="hover:text-white">Preise</a></li>
                <li><a href="#" className="hover:text-white">Roadmap</a></li>
                <li><a href="#" className="hover:text-white">Changelog</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#faq" className="hover:text-white">FAQ</a></li>
                <li><a href="#" className="hover:text-white">Hilfe-Center</a></li>
                <li><a href="#" className="hover:text-white">Kontakt</a></li>
                <li><a href="#" className="hover:text-white">Status</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Rechtliches</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/impressum" className="hover:text-white">Impressum</a></li>
                <li><a href="/datenschutz" className="hover:text-white">Datenschutz</a></li>
                <li><a href="/agb" className="hover:text-white">AGB</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm">© 2024 VeloRent Pro. Alle Rechte vorbehalten.</p>
            <div className="flex items-center gap-4">
              <span className="text-sm">🇩🇪 Server in Deutschland</span>
              <span className="text-sm">🔒 DSGVO-konform</span>
            </div>
          </div>
        </div>
      </footer>

      {/* CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float 3s ease-in-out infinite;
          animation-delay: 1.5s;
        }
      `}</style>
    </div>
  );
}
