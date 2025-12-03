import { useState } from "react";
import {
  Bike, Calendar, Users, BarChart3, Globe, Check,
  ChevronRight, Star, Play, ArrowRight, Menu, X, Mail,
  Smartphone, Building, TrendingUp, CheckCircle, Sparkles
} from "lucide-react";
import Button from "./components/ui/Button";
import Card from "./components/ui/Card";

// ============ LANDING PAGE ============
export default function LandingPage({ onGetStarted, onLogin }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState("monthly"); // monthly | yearly

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
      name: "Starter",
      price: { monthly: 0, yearly: 0 },
      description: "Perfekt für den Einstieg",
      features: [
        "Bis zu 5 Fahrräder",
        "1 Benutzer",
        "Basis-Kalender",
        "Kundenverwaltung",
        "Community Support"
      ],
      cta: "Kostenlos starten",
      variant: "outline",
      highlighted: false
    },
    {
      name: "Growth",
      price: { monthly: 49, yearly: 470 },
      description: "Für wachsende Verleihe",
      features: [
        "Bis zu 25 Fahrräder",
        "3 Benutzer",
        "Online-Booking Widget",
        "Erweiterte Statistiken",
        "Rechnungs-Export",
        "E-Mail Support"
      ],
      cta: "14 Tage testen",
      variant: "primary",
      highlighted: true,
      badge: "BELIEBT"
    },
    {
      name: "Pro",
      price: { monthly: 99, yearly: 990 },
      description: "Für professionelle Anbieter",
      features: [
        "Unbegrenzte Fahrräder",
        "Unbegrenzte Benutzer",
        "White-Label Widget",
        "Multi-Standort Support",
        "API Zugang",
        "Priority Support"
      ],
      cta: "14 Tage testen",
      variant: "outline",
      highlighted: false
    },
    {
      name: "Enterprise",
      price: { monthly: 199, yearly: 1990 },
      description: "Für große Flotten & Ketten",
      features: [
        "Alles aus Pro",
        "Dedizierter Account Manager",
        "Onboarding & Schulung",
        "Custom Integrationen",
        "SLA Garantie",
        "24/7 Telefon-Support"
      ],
      cta: "Kontakt aufnehmen",
      variant: "ghost",
      highlighted: false
    }
  ];

  const testimonials = [
    {
      quote: "VeloRent hat unseren Verwaltungsaufwand halbiert. Das Design ist wunderschön und die Bedienung kinderleicht.",
      author: "Sarah Weber",
      role: "Alpenrad Verleih, Garmisch",
      avatar: "SW"
    },
    {
      quote: "Endlich ein System, das modern aussieht und funktioniert. Unsere Kunden lieben das Online-Widget.",
      author: "Markus Lang",
      role: "E-Bike Center, Bodensee",
      avatar: "ML"
    },
    {
      quote: "Der Support ist erstklassig und neue Features kommen regelmäßig. Eine echte Partnerschaft.",
      author: "Julia Meyer",
      role: "CityBikes, Hamburg",
      avatar: "JM"
    }
  ];

  const faqs = [
    {
      q: "Ist VeloRent wirklich kostenlos?",
      a: "Ja, der Starter-Plan ist dauerhaft kostenlos für bis zu 5 Räder. Perfekt, um das System kennenzulernen."
    },
    {
      q: "Kann ich das Widget an mein Design anpassen?",
      a: "Absolut. Im Pro-Plan können Sie Farben, Schriften und Logos komplett an Ihre Brand anpassen (White-Label)."
    },
    {
      q: "Wie sicher sind meine Daten?",
      a: "Wir nutzen Server in Deutschland (ISO 27001 zertifiziert), tägliche Backups und modernste Verschlüsselung."
    },
    {
      q: "Gibt es eine Mindestvertragslaufzeit?",
      a: "Nein. Sie können monatlich kündigen oder upgraden/downgraden. Bei jährlicher Zahlung sparen Sie ca. 20%."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-brand-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b-0 border-b-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-violet-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
                <Bike className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-heading font-bold text-slate-900 dark:text-white leading-none">VeloRent</span>
                <span className="text-[10px] font-bold tracking-wider text-brand-600 uppercase">v2.0 Cosmic</span>
              </div>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-white transition-colors">Preise</a>
              <a href="#testimonials" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-white transition-colors">Kunden</a>
              <a href="#faq" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-white transition-colors">FAQ</a>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-4">
              <Button variant="ghost" onClick={onLogin} className="font-medium">
                Anmelden
              </Button>
              <Button variant="primary" onClick={onGetStarted} className="shadow-glow">
                Kostenlos starten
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 dark:text-slate-300"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 py-4 px-4 absolute w-full shadow-xl">
            <div className="flex flex-col gap-4">
              <a href="#features" className="text-slate-600 dark:text-slate-300 font-medium py-2">Features</a>
              <a href="#pricing" className="text-slate-600 dark:text-slate-300 font-medium py-2">Preise</a>
              <a href="#testimonials" className="text-slate-600 dark:text-slate-300 font-medium py-2">Kunden</a>
              <a href="#faq" className="text-slate-600 dark:text-slate-300 font-medium py-2">FAQ</a>
              <hr className="border-slate-200 dark:border-slate-700" />
              <Button variant="ghost" onClick={onLogin} className="w-full justify-start">Anmelden</Button>
              <Button variant="primary" onClick={onGetStarted} className="w-full">Kostenlos starten</Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-4 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none z-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-brand-500/20 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-pulse-slow"></div>
          <div className="absolute top-40 right-20 w-96 h-96 bg-violet-500/20 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-pulse-slow delay-1000"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 dark:bg-brand-900/30 border border-brand-100 dark:border-brand-500/20 text-brand-600 dark:text-brand-300 text-sm font-medium mb-8 animate-fade-in-up">
              <Sparkles className="w-4 h-4" />
              <span>Neu: KI-gestützte Preisoptimierung</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-heading font-bold text-slate-900 dark:text-white leading-[1.1] mb-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              Die Zukunft Ihres <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-violet-600">Fahrradverleihs</span>
            </h1>

            <p className="text-xl text-slate-600 dark:text-slate-400 mb-10 leading-relaxed animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              Verwalten Sie Flotte, Kunden und Buchungen in einer eleganten Plattform.
              Steigern Sie Ihren Umsatz mit unserem modernen Online-Booking Widget.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
              <Button size="xl" onClick={onGetStarted} className="w-full sm:w-auto shadow-glow">
                Jetzt kostenlos starten
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button size="xl" variant="outline" className="w-full sm:w-auto">
                <Play className="w-5 h-5 mr-2" />
                Demo ansehen
              </Button>
            </div>

            <div className="mt-12 flex items-center justify-center gap-8 text-sm text-slate-500 dark:text-slate-400 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-brand-500" />
                <span>Keine Kreditkarte</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-brand-500" />
                <span>14 Tage testen</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-brand-500" />
                <span>Jederzeit kündbar</span>
              </div>
            </div>
          </div>

          {/* Dashboard Preview / Hero Image */}
          <div className="relative mx-auto max-w-5xl animate-fade-in-up" style={{ animationDelay: '500ms' }}>
            <div className="absolute -inset-1 bg-gradient-to-r from-brand-500 to-violet-600 rounded-2xl blur opacity-20 dark:opacity-40"></div>
            <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
              {/* Browser Chrome */}
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400/80"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-400/80"></div>
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-white dark:bg-slate-950 rounded-md px-3 py-1.5 text-xs text-slate-400 text-center font-mono border border-slate-200 dark:border-slate-800">
                    app.velorent.pro/dashboard
                  </div>
                </div>
              </div>

              {/* Mockup Content */}
              <div className="p-6 bg-slate-50 dark:bg-slate-950/50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                      </div>
                      <span className="text-xs font-medium text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">+12.5%</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">2.845 €</div>
                    <div className="text-xs text-slate-500">Umsatz diesen Monat</div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                        <Bike className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                      </div>
                      <span className="text-xs font-medium text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">85%</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">42 / 50</div>
                    <div className="text-xs text-slate-500">Räder vermietet</div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                        <Users className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <span className="text-xs font-medium text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">+8</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">128</div>
                    <div className="text-xs text-slate-500">Aktive Kunden</div>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="md:col-span-2 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-semibold text-slate-900 dark:text-white">Buchungsübersicht</h3>
                      <Button size="sm" variant="outline">Details</Button>
                    </div>
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-400">
                              {['JD', 'MK', 'AS'][i - 1]}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-slate-900 dark:text-white">
                                {['John Doe', 'Maria Kurz', 'Alex Schmidt'][i - 1]}
                              </div>
                              <div className="text-xs text-slate-500">E-Bike Premium • 2 Tage</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-slate-900 dark:text-white">
                              {['89 €', '120 €', '45 €'][i - 1]}
                            </div>
                            <div className="text-xs text-emerald-500">Bezahlt</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card className="p-6 bg-brand-600 text-white relative overflow-hidden border-none">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <h3 className="font-semibold mb-2 relative z-10">Quick Actions</h3>
                    <div className="space-y-3 relative z-10">
                      <button className="w-full py-2 px-3 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-left transition-colors flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> Neue Buchung
                      </button>
                      <button className="w-full py-2 px-3 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-left transition-colors flex items-center gap-2">
                        <Bike className="w-4 h-4" /> Rad hinzufügen
                      </button>
                      <button className="w-full py-2 px-3 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-left transition-colors flex items-center gap-2">
                        <Mail className="w-4 h-4" /> Newsletter
                      </button>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 border-y border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-8 uppercase tracking-wider">
            Vertraut von über 500+ Verleihern in Europa
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            {["AlpenRad", "CityCruiser", "BeachBikes", "MountainPro", "UrbanMobility"].map((name, i) => (
              <div key={i} className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-bold text-xl">
                <Building className="w-6 h-6" />
                <span>{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-4 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-slate-900 dark:text-white mb-4">
              Alles was Sie brauchen. <br />
              <span className="text-brand-600">Nichts was Sie nicht brauchen.</span>
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              VeloRent wurde speziell für die Bedürfnisse moderner Fahrradverleihe entwickelt.
              Kein unnötiger Ballast, nur leistungsstarke Tools.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <Card key={i} className="p-8 hover:-translate-y-1 transition-transform duration-300" hover>
                <div className="w-14 h-14 bg-brand-50 dark:bg-brand-900/20 rounded-2xl flex items-center justify-center mb-6 text-brand-600 dark:text-brand-400">
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{feature.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-slate-900 dark:bg-black skew-y-3 transform origin-top-left -z-10 translate-y-24"></div>

        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-slate-900 dark:text-white mb-6">
              Transparente Preise für jede Größe
            </h2>

            {/* Billing Toggle */}
            <div className="inline-flex items-center p-1.5 bg-slate-200 dark:bg-slate-800 rounded-full">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${billingCycle === "monthly"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
              >
                Monatlich
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${billingCycle === "yearly"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
              >
                Jährlich
                <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-wide">
                  -20%
                </span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pricing.map((plan, i) => (
              <Card
                key={i}
                className={`p-8 relative flex flex-col ${plan.highlighted
                  ? "border-brand-500 ring-4 ring-brand-500/10 shadow-2xl scale-105 z-10"
                  : "hover:border-brand-200 dark:hover:border-brand-800"
                  }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-brand-600 to-violet-600 text-white text-xs font-bold rounded-full shadow-lg">
                    {plan.badge}
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{plan.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 h-10">{plan.description}</p>
                </div>

                <div className="mb-8">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-slate-900 dark:text-white">
                      {plan.price[billingCycle]}€
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      /{billingCycle === "monthly" ? "Monat" : "Jahr"}
                    </span>
                  </div>
                </div>

                <ul className="space-y-4 mb-8 flex-1">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                      <Check className="w-5 h-5 text-brand-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.highlighted ? "primary" : "outline"}
                  className="w-full"
                  onClick={onGetStarted}
                >
                  {plan.cta}
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-4 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold text-center text-slate-900 dark:text-white mb-16">
            Von Verleihern geliebt
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <Card key={i} className="p-8 bg-white dark:bg-slate-900">
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-5 h-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-lg text-slate-700 dark:text-slate-300 mb-8 italic leading-relaxed">
                  &quot;{t.quote}&quot;
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{t.author}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">{t.role}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-4 bg-white dark:bg-slate-900">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold text-center text-slate-900 dark:text-white mb-16">
            Häufig gestellte Fragen
          </h2>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <details key={i} className="group bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-300 open:bg-white open:dark:bg-slate-800 open:shadow-lg">
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                  <span className="font-bold text-slate-900 dark:text-white text-lg">{faq.q}</span>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-open:rotate-90 transition-transform duration-300" />
                </summary>
                <div className="px-6 pb-6 text-slate-600 dark:text-slate-300 leading-relaxed">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-brand-900">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-600 to-violet-900 opacity-90"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl sm:text-5xl font-heading font-bold text-white mb-8">
            Bereit für das nächste Level?
          </h2>
          <p className="text-xl text-brand-100 mb-12 max-w-2xl mx-auto">
            Starten Sie noch heute mit VeloRent und digitalisieren Sie Ihren Verleih in weniger als 5 Minuten.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="xl" className="bg-white text-brand-600 hover:bg-brand-50 shadow-xl border-none" onClick={onGetStarted}>
              Kostenlos starten
            </Button>
            <Button size="xl" variant="outline" className="border-white text-white hover:bg-white/10">
              Kontakt aufnehmen
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-16 px-4 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600 to-violet-600 flex items-center justify-center">
                  <Bike className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">VeloRent</span>
              </div>
              <p className="text-sm leading-relaxed mb-6">
                Die All-in-One Lösung für moderne Fahrradverleihe.
                Entwickelt mit ❤️ in Deutschland.
              </p>
              <div className="flex gap-4">
                {/* Social Icons would go here */}
              </div>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6">Produkt</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-brand-400 transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-brand-400 transition-colors">Preise</a></li>
                <li><a href="#" className="hover:text-brand-400 transition-colors">Showcase</a></li>
                <li><a href="#" className="hover:text-brand-400 transition-colors">Changelog</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6">Ressourcen</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-brand-400 transition-colors">Dokumentation</a></li>
                <li><a href="#" className="hover:text-brand-400 transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-brand-400 transition-colors">Community</a></li>
                <li><a href="#" className="hover:text-brand-400 transition-colors">Help Center</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6">Rechtliches</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-brand-400 transition-colors">Impressum</a></li>
                <li><a href="#" className="hover:text-brand-400 transition-colors">Datenschutz</a></li>
                <li><a href="#" className="hover:text-brand-400 transition-colors">AGB</a></li>
                <li><a href="#" className="hover:text-brand-400 transition-colors">Cookie Einstellungen</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
            <p>© 2024 VeloRent Pro. Alle Rechte vorbehalten.</p>
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                All Systems Operational
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
