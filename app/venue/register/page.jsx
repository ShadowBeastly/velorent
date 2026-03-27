"use client";

import { useState, useEffect, useRef } from "react";
import {
    Home, Building, Tent, Hotel, HelpCircle,
    ArrowRight, ArrowLeft, CheckCircle, MapPin, Mail, Tag,
    Loader2, AlertCircle, LogIn, Sparkles, Shield, Clock,
} from "lucide-react";
import { supabase } from "@/src/utils/supabase";

/* ─── Google Fonts: DM Serif Display + DM Sans ─── */
const FontLoader = () => (
    // eslint-disable-next-line @next/next/no-page-custom-font
    <link
        href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap"
        rel="stylesheet"
    />
);

/* ─── Constants ─── */
const VENUE_TYPES = [
    { id: "airbnb", label: "Airbnb", description: "Privates Zimmer oder Wohnung", icon: Home, color: "from-rose-500 to-pink-500" },
    { id: "ferienwohnung", label: "Ferienwohnung", description: "Eigenständiges Ferienhaus", icon: Building, color: "from-sky-500 to-blue-500" },
    { id: "campingplatz", label: "Campingplatz", description: "Camping, Glamping & Outdoor", icon: Tent, color: "from-emerald-500 to-green-600" },
    { id: "hostel", label: "Hostel", description: "Gemeinschaftsunterkunft", icon: Hotel, color: "from-amber-500 to-orange-500" },
    { id: "sonstige", label: "Sonstige", description: "Eine andere Art von Unterkunft", icon: HelpCircle, color: "from-slate-400 to-slate-500" },
];

const TRUST_ITEMS = [
    { icon: Shield, text: "100% kostenlos" },
    { icon: Clock, text: "Freischaltung in 1–2 Tagen" },
    { icon: Sparkles, text: "Mehr Gästeservice, null Aufwand" },
];

/* ─── Decorative SVG noise overlay (CSS-only texture) ─── */
function NoiseOverlay() {
    return (
        <div
            className="absolute inset-0 opacity-[0.035] pointer-events-none mix-blend-multiply"
            style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            }}
        />
    );
}

/* ─── Floating organic shapes ─── */
function DecoShapes() {
    return (
        <>
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#1A7D5A]/8 blur-3xl animate-pulse" style={{ animationDuration: "7s" }} />
            <div className="absolute top-1/3 -left-32 w-56 h-56 rounded-full bg-emerald-400/6 blur-3xl animate-pulse" style={{ animationDuration: "11s" }} />
            <div className="absolute bottom-12 right-1/4 w-40 h-40 rounded-full bg-amber-300/6 blur-3xl animate-pulse" style={{ animationDuration: "9s" }} />
        </>
    );
}

/* ─── Venue type card with gradient icon bg ─── */
function VenueTypeCard({ type, selected, onSelect, index }) {
    const Icon = type.icon;
    return (
        <button
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(type.id)}
            className={`w-full text-left p-4 sm:p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer group
                ${selected
                    ? "border-[#1A7D5A] bg-white shadow-lg shadow-[#1A7D5A]/8 scale-[1.02]"
                    : "border-gray-100 bg-white/80 hover:border-gray-200 hover:shadow-md hover:scale-[1.01]"
                }`}
            style={{ animationDelay: `${index * 60}ms` }}
        >
            <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${type.color} text-white shadow-sm transition-transform duration-300 group-hover:scale-110 ${selected ? "scale-110" : ""}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-[15px] transition-colors duration-200 ${selected ? "text-[#1A7D5A]" : "text-gray-900"}`} style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {type.label}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{type.description}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300 ${selected ? "border-[#1A7D5A] bg-[#1A7D5A]" : "border-gray-200 group-hover:border-gray-300"}`}>
                    {selected && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
            </div>
        </button>
    );
}

/* ─── Floating label input ─── */
function FormInput({ label, icon: Icon, id, error, ...props }) {
    return (
        <div className="flex flex-col gap-2">
            <label htmlFor={id} className="text-sm font-medium text-gray-600 flex items-center gap-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {Icon && <Icon className="w-4 h-4 text-gray-300" />}
                {label}
            </label>
            <input
                id={id}
                className={`w-full px-4 py-3.5 rounded-xl border text-sm transition-all duration-200 outline-none min-h-[52px]
                    ${error
                        ? "border-red-300 bg-red-50/50 focus:border-red-400 focus:ring-2 focus:ring-red-400/20"
                        : "border-gray-200 bg-gray-50/50 focus:border-[#1A7D5A] focus:ring-2 focus:ring-[#1A7D5A]/15 focus:bg-white"
                    } placeholder:text-gray-300`}
                style={{ fontFamily: "'DM Sans', sans-serif" }}
                {...props}
            />
            {error && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {error}
                </p>
            )}
        </div>
    );
}

/* ─── Summary row ─── */
function SummaryRow({ icon: Icon, label, value }) {
    return (
        <div className="flex items-center gap-4 py-4 border-b border-gray-100/80 last:border-0">
            <div className="w-9 h-9 rounded-lg bg-[#1A7D5A]/8 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-[#1A7D5A]" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.1em]">{label}</p>
                <p className="text-sm font-medium text-gray-800 mt-0.5 truncate">{value}</p>
            </div>
        </div>
    );
}

/* ─── Progress dots (minimal, not numbered) ─── */
function StepIndicator({ current, total }) {
    return (
        <div className="flex items-center gap-2 mb-8">
            {Array.from({ length: total }, (_, i) => (
                <div
                    key={i}
                    className={`h-1 rounded-full transition-all duration-500 ${
                        i < current ? "bg-[#1A7D5A] w-8" : i === current ? "bg-[#1A7D5A]/40 w-8" : "bg-gray-200 w-4"
                    }`}
                />
            ))}
            <span className="ml-auto text-xs font-medium text-gray-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {current} / {total}
            </span>
        </div>
    );
}

/* ═══════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════ */
export default function VenueRegisterPage() {
    const [currentStep, setCurrentStep] = useState(1);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(null);
    const animationTimerRef = useRef(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [form, setForm] = useState({ venueType: "", name: "", address: "", contactEmail: "" });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setIsLoggedIn(!!session);
            if (session?.user?.email) setForm(prev => ({ ...prev, contactEmail: session.user.email }));
        }).catch(() => setIsLoggedIn(false));
        return () => { if (animationTimerRef.current) clearTimeout(animationTimerRef.current); };
    }, []);

    const updateForm = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
    };

    const validateStep = (step) => {
        const e = {};
        if (step === 1 && !form.venueType) e.venueType = "Bitte wählen Sie einen Typ.";
        if (step === 2) {
            if (!form.name.trim()) e.name = "Name ist erforderlich.";
            if (!form.address.trim()) e.address = "Adresse ist erforderlich.";
            if (!form.contactEmail.trim()) e.contactEmail = "E-Mail ist erforderlich.";
            else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) e.contactEmail = "Ungültige E-Mail.";
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const goToStep = (step) => {
        if (isAnimating) return;
        setIsAnimating(true);
        animationTimerRef.current = setTimeout(() => { setCurrentStep(step); setIsAnimating(false); }, 200);
    };
    const handleNext = () => { if (validateStep(currentStep)) goToStep(currentStep + 1); };
    const handleBack = () => goToStep(currentStep - 1);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setSubmitError(null);
        try {
            const { error } = await supabase.rpc("register_self_managed_venue", {
                p_name: form.name, p_address: form.address, p_venue_type: form.venueType, p_contact_email: form.contactEmail,
            });
            if (error) throw error;
            setIsSuccess(true);
        } catch (err) {
            setSubmitError(err?.message || "Ein Fehler ist aufgetreten.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedVenueType = VENUE_TYPES.find(t => t.id === form.venueType);

    if (isLoggedIn === null) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <FontLoader />
                <Loader2 className="w-7 h-7 text-[#1A7D5A] animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 relative overflow-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <FontLoader />

            {/* ─── Two-column layout ─── */}
            <div className="flex min-h-screen">

                {/* ─── LEFT: Branding panel (hidden on mobile) ─── */}
                <div className="hidden lg:flex lg:w-[42%] xl:w-[38%] bg-[#0f3d2d] relative flex-col justify-between p-10 xl:p-14 overflow-hidden">
                    <NoiseOverlay />
                    <DecoShapes />

                    {/* Logo */}
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-20">
                            <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/10">
                                <MapPin className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-white/90 font-bold text-xl tracking-tight">Lociva</span>
                        </div>

                        {/* Hero text */}
                        <h1 className="text-white text-3xl xl:text-4xl leading-[1.15] font-normal mb-6" style={{ fontFamily: "'DM Serif Display', serif" }}>
                            Lokale Erlebnisse,<br />
                            <span className="text-emerald-300/90">direkt im Zimmer</span><br />
                            Ihrer Gäste.
                        </h1>
                        <p className="text-white/50 text-sm leading-relaxed max-w-sm">
                            Hunderte Unterkünfte bieten ihren Gästen bereits Zugang zu Aktivitäten in der Umgebung — vom E-Bike bis zur Weinverkostung.
                        </p>
                    </div>

                    {/* Trust badges */}
                    <div className="relative z-10 space-y-3">
                        {TRUST_ITEMS.map((item, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white/8 flex items-center justify-center border border-white/5">
                                    <item.icon className="w-4 h-4 text-emerald-400/80" />
                                </div>
                                <span className="text-white/60 text-sm">{item.text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ─── RIGHT: Form panel ─── */}
                <div className="flex-1 flex flex-col min-h-screen">
                    {/* Mobile header */}
                    <header className="lg:hidden sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-100">
                        <div className="flex items-center justify-between px-5 h-14">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-[#1A7D5A] flex items-center justify-center">
                                    <MapPin className="w-3.5 h-3.5 text-white" />
                                </div>
                                <span className="font-bold text-gray-900">Lociva</span>
                            </div>
                            {!isLoggedIn && (
                                <a href="/login" className="flex items-center gap-1.5 text-xs text-[#1A7D5A] font-semibold cursor-pointer">
                                    <LogIn className="w-3.5 h-3.5" /> Anmelden
                                </a>
                            )}
                        </div>
                    </header>

                    {/* Desktop top-right login */}
                    <div className="hidden lg:flex items-center justify-end px-10 pt-8">
                        {!isLoggedIn && (
                            <a href="/login" className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#1A7D5A] font-medium transition-colors cursor-pointer">
                                <LogIn className="w-4 h-4" /> Anmelden
                            </a>
                        )}
                    </div>

                    {/* Form container */}
                    <div className="flex-1 flex items-start lg:items-center justify-center px-5 sm:px-8 lg:px-14 py-8 lg:py-0">
                        <div className="w-full max-w-md">
                            {/* Not logged in banner */}
                            {!isLoggedIn && !isSuccess && (
                                <div className="mb-6 flex items-start gap-3 bg-amber-50/80 border border-amber-200/60 rounded-xl p-3.5">
                                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-700 leading-relaxed">
                                        Sie benötigen ein Lociva-Konto.{" "}
                                        <a href="/login" className="underline font-semibold cursor-pointer">Jetzt anmelden</a>
                                    </p>
                                </div>
                            )}

                            {/* ─── SUCCESS STATE ─── */}
                            {isSuccess ? (
                                <div className="flex flex-col items-center text-center py-6">
                                    <div className="relative mb-8">
                                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#1A7D5A] to-emerald-400 flex items-center justify-center shadow-xl shadow-[#1A7D5A]/25">
                                            <CheckCircle className="w-11 h-11 text-white" strokeWidth={1.5} />
                                        </div>
                                        <div className="absolute inset-0 rounded-full border-[3px] border-[#1A7D5A]/15 scale-[1.3] animate-ping" style={{ animationDuration: "2s" }} />
                                    </div>
                                    <h2 className="text-2xl font-normal text-gray-900 mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
                                        Vielen Dank!
                                    </h2>
                                    <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                                        Ihre Unterkunft wurde eingereicht. Bestätigung kommt an{" "}
                                        <span className="font-semibold text-gray-600">{form.contactEmail}</span>
                                    </p>
                                    <a href="/" className="mt-8 px-8 py-3.5 rounded-xl bg-[#1A7D5A] text-white text-sm font-semibold hover:bg-[#155f44] transition-all active:scale-95 cursor-pointer shadow-lg shadow-[#1A7D5A]/20">
                                        Zur Startseite
                                    </a>
                                </div>
                            ) : (
                                <>
                                    {/* Headline */}
                                    <div className="mb-1">
                                        <h1 className="text-2xl sm:text-[28px] text-gray-900 leading-tight" style={{ fontFamily: "'DM Serif Display', serif" }}>
                                            Unterkunft registrieren
                                        </h1>
                                        <p className="mt-2 text-gray-400 text-sm leading-relaxed">
                                            In 2 Minuten — kostenlos und unverbindlich.
                                        </p>
                                    </div>

                                    {/* Mobile trust badges (horizontal) */}
                                    <div className="flex gap-4 mt-4 mb-8 lg:hidden overflow-x-auto pb-1">
                                        {TRUST_ITEMS.map((item, i) => (
                                            <div key={i} className="flex items-center gap-1.5 flex-shrink-0">
                                                <item.icon className="w-3.5 h-3.5 text-[#1A7D5A]" />
                                                <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap">{item.text}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="hidden lg:block mb-8" />

                                    <StepIndicator current={currentStep} total={3} />

                                    {/* Step content with animation */}
                                    <div className={`transition-all duration-200 ${isAnimating ? "opacity-0 translate-y-3" : "opacity-100 translate-y-0"}`}>

                                        {/* ─── STEP 1: Type ─── */}
                                        {currentStep === 1 && (
                                            <div>
                                                <h2 className="text-lg font-semibold text-gray-900 mb-1">Welcher Typ?</h2>
                                                <p className="text-xs text-gray-400 mb-5">Wählen Sie die passende Kategorie.</p>
                                                <div className="flex flex-col gap-2.5">
                                                    {VENUE_TYPES.map((type, i) => (
                                                        <VenueTypeCard key={type.id} type={type} selected={form.venueType === type.id} onSelect={id => updateForm("venueType", id)} index={i} />
                                                    ))}
                                                </div>
                                                {errors.venueType && (
                                                    <p className="text-xs text-red-500 flex items-center gap-1 mt-3">
                                                        <AlertCircle className="w-3.5 h-3.5" /> {errors.venueType}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* ─── STEP 2: Details ─── */}
                                        {currentStep === 2 && (
                                            <div>
                                                <h2 className="text-lg font-semibold text-gray-900 mb-1">Details</h2>
                                                <p className="text-xs text-gray-400 mb-5">Damit wir Ihre Unterkunft einrichten können.</p>
                                                <div className="flex flex-col gap-5">
                                                    <FormInput id="name" label="Name der Unterkunft" icon={Tag} type="text" placeholder="z. B. Ferienwohnung Meerblick" value={form.name} onChange={e => updateForm("name", e.target.value)} error={errors.name} autoComplete="organization" />
                                                    <FormInput id="address" label="Adresse" icon={MapPin} type="text" placeholder="z. B. Strandweg 12, 18439 Stralsund" value={form.address} onChange={e => updateForm("address", e.target.value)} error={errors.address} autoComplete="street-address" />
                                                    <FormInput id="contactEmail" label="Kontakt-E-Mail" icon={Mail} type="email" placeholder="ihre@email.de" value={form.contactEmail} onChange={e => updateForm("contactEmail", e.target.value)} error={errors.contactEmail} autoComplete="email" />
                                                </div>
                                            </div>
                                        )}

                                        {/* ─── STEP 3: Confirm ─── */}
                                        {currentStep === 3 && (
                                            <div>
                                                <h2 className="text-lg font-semibold text-gray-900 mb-1">Alles korrekt?</h2>
                                                <p className="text-xs text-gray-400 mb-5">Prüfen Sie Ihre Angaben.</p>

                                                <div className="bg-white border border-gray-100 rounded-2xl px-5 py-1 mb-5 shadow-sm">
                                                    <SummaryRow icon={selectedVenueType?.icon || HelpCircle} label="Typ" value={selectedVenueType?.label || "—"} />
                                                    <SummaryRow icon={Tag} label="Name" value={form.name || "—"} />
                                                    <SummaryRow icon={MapPin} label="Adresse" value={form.address || "—"} />
                                                    <SummaryRow icon={Mail} label="E-Mail" value={form.contactEmail || "—"} />
                                                </div>

                                                <div className="bg-emerald-50/60 border border-emerald-200/40 rounded-xl p-4 mb-5">
                                                    <p className="text-xs text-emerald-700 leading-relaxed">
                                                        Nach Prüfung durch unser Team erhalten Sie eine Bestätigung per E-Mail. Die Einrichtung dauert 1–2 Werktage.
                                                    </p>
                                                </div>

                                                {submitError && (
                                                    <div className="flex items-start gap-3 bg-red-50 border border-red-200/60 rounded-xl p-3.5 mb-4">
                                                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                                        <p className="text-xs text-red-600">{submitError}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Navigation */}
                                    <div className="mt-8 flex items-center justify-between gap-3">
                                        {currentStep > 1 ? (
                                            <button type="button" onClick={handleBack} disabled={isAnimating || isSubmitting}
                                                className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all cursor-pointer min-h-[48px] disabled:opacity-50">
                                                <ArrowLeft className="w-4 h-4" /> Zurück
                                            </button>
                                        ) : <div />}

                                        {currentStep < 3 ? (
                                            <button type="button" onClick={handleNext} disabled={isAnimating}
                                                className="flex items-center gap-2 px-7 py-3 rounded-xl bg-[#1A7D5A] text-white text-sm font-semibold hover:bg-[#155f44] active:scale-[0.97] transition-all cursor-pointer min-h-[48px] disabled:opacity-50 ml-auto shadow-lg shadow-[#1A7D5A]/15">
                                                Weiter <ArrowRight className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <button type="button" onClick={handleSubmit} disabled={isSubmitting}
                                                className="flex items-center gap-2 px-7 py-3 rounded-xl bg-[#1A7D5A] text-white text-sm font-semibold hover:bg-[#155f44] active:scale-[0.97] transition-all cursor-pointer min-h-[48px] disabled:opacity-60 ml-auto shadow-lg shadow-[#1A7D5A]/15">
                                                {isSubmitting ? (
                                                    <><Loader2 className="w-4 h-4 animate-spin" /> Wird gesendet...</>
                                                ) : (
                                                    <><CheckCircle className="w-4 h-4" /> Absenden</>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <footer className="px-5 sm:px-8 lg:px-14 pb-6">
                        <p className="text-[11px] text-gray-300 leading-relaxed">
                            Mit der Registrierung stimmen Sie unseren{" "}
                            <a href="/agb" className="underline hover:text-gray-400 cursor-pointer">AGB</a> und der{" "}
                            <a href="/datenschutz" className="underline hover:text-gray-400 cursor-pointer">Datenschutzerklärung</a> zu.
                        </p>
                    </footer>
                </div>
            </div>
        </div>
    );
}
