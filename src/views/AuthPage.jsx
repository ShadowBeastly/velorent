"use client";
import { useState, useEffect } from "react";
import { Loader2, XCircle, CheckCircle, Shield, Globe, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "../utils/i18n";

export default function AuthPage({ initialMode = "login" }) {
    const auth = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useI18n();
    const isRentCore = typeof window !== "undefined" && window.location.hostname.includes("rentcore");

    const urlMode = searchParams.get("mode");
    const [mode, setMode] = useState(urlMode === "update-password" ? "update-password" : initialMode);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        if (auth.loading) return;
        if (auth.user && mode !== "update-password") {
            const role = auth.profile?.role;
            if (role === "superadmin") router.push("/app/admin");
            else if (role === "hotel") router.push("/hotel");
            else router.push("/app");
        }
    }, [auth.user, auth.profile, auth.loading, router, mode]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");

        try {
            if (mode === "login") {
                await auth.signIn(email, password);
            } else if (mode === "forgot") {
                await auth.resetPassword(email);
                setSuccess(t("auth.resetSent"));
            } else if (mode === "update-password") {
                await auth.updatePassword(newPassword);
                setSuccess("Passwort erfolgreich geändert. Du wirst weitergeleitet...");
                setTimeout(() => {
                    const role = auth.profile?.role;
                    if (role === "superadmin") router.push("/app/admin");
                    else if (role === "hotel") router.push("/hotel");
                    else router.push("/app");
                }, 2000);
            } else {
                await auth.signUp(email, password, fullName);
                setSuccess(t("auth.registerSuccess"));
            }
        } catch (err) {
            setError(err.message || "Ein Fehler ist aufgetreten.");
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full px-4 py-3 bg-white border border-[#D4EDE2] rounded-xl text-[#1E2D26] placeholder-[#6B7280] focus:border-[#1A7D5A] focus:ring-1 focus:ring-[#1A7D5A] outline-none transition-colors text-sm";

    return (
        <div className="min-h-screen flex" style={{ background: "#F5FAF7" }}>
            {/* Left panel. Brand identity */}
            <div
                className="hidden lg:flex lg:w-[420px] flex-col justify-between p-12 relative overflow-hidden"
                style={{ background: "#1E2D26" }}
            >
                {/* Subtle texture overlay */}
                <div className="absolute inset-0 opacity-5" style={{
                    backgroundImage: "radial-gradient(circle at 2px 2px, #D4EDE2 1px, transparent 0)",
                    backgroundSize: "28px 28px"
                }} />
                {/* Glow */}
                <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-20"
                    style={{ background: "radial-gradient(circle, #1A7D5A 0%, transparent 70%)" }} />

                <div className="relative">
                    {/* Logo mark */}
                    <div className="flex items-center gap-3 mb-16">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#1A7D5A" }}>
                            <span className="text-white font-light text-lg tracking-widest">{isRentCore ? "R" : "L"}</span>
                        </div>
                        <span className="text-white font-light tracking-[6px] text-sm uppercase">{isRentCore ? "RENTCORE" : "LOCIVA"}</span>
                    </div>

                    {isRentCore ? (
                        <>
                            <h2 className="text-3xl font-light text-white leading-relaxed mb-4">
                                Dein Buchungssystem.<br />
                                <span style={{ color: "#3BAA82" }}>Einfach. Digital.</span>
                            </h2>
                            <p className="text-sm leading-relaxed" style={{ color: "#6B7280" }}>
                                Fahrrad- und E-Bike-Verleih. Online buchbar, automatisch abgerechnet.
                            </p>
                        </>
                    ) : (
                        <>
                            <h2 className="text-3xl font-light text-white leading-relaxed mb-4">
                                Lokale Erlebnisse.<br />
                                <span style={{ color: "#3BAA82" }}>Einfach. Hier.</span>
                            </h2>
                            <p className="text-sm leading-relaxed" style={{ color: "#6B7280" }}>
                                Die Plattform für Hotels, Anbieter und Gäste. Automatisierte Buchungen, transparente Abrechnungen.
                            </p>
                        </>
                    )}
                </div>

                <div className="relative space-y-4">
                    {[
                        { icon: Shield, label: "Sicher & DSGVO-konform" },
                        { icon: Globe, label: "Mehrsprachig DE / EN" },
                        { icon: Users, label: "Multi-Mandanten-fähig" },
                    ].map(({ icon: Icon, label }) => (
                        <div key={label} className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: "rgba(26,125,90,0.2)" }}>
                                <Icon className="w-4 h-4" style={{ color: "#3BAA82" }} />
                            </div>
                            <span className="text-sm" style={{ color: "#9CA3AF" }}>{label}</span>
                        </div>
                    ))}
                    <p className="text-xs pt-4" style={{ color: "#4B5563" }}>
                        {isRentCore ? "© 2026 RentCore · funk-e.solutions" : "© 2026 Lociva · funk-e.solutions"}
                    </p>
                </div>
            </div>

            {/* Right panel. Form */}
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-sm">
                    {/* Mobile logo */}
                    <div className="lg:hidden text-center mb-8">
                        <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: "#1A7D5A" }}>
                            <span className="text-white font-light text-xl tracking-widest">{isRentCore ? "R" : "L"}</span>
                        </div>
                        <span className="font-light tracking-[6px] text-sm uppercase" style={{ color: "#1E2D26" }}>{isRentCore ? "RENTCORE" : "LOCIVA"}</span>
                    </div>

                    <div className="bg-white rounded-2xl p-8 shadow-sm border" style={{ borderColor: "#D4EDE2" }}>
                        <h2 className="text-xl font-medium mb-1" style={{ color: "#1E2D26" }}>
                            {mode === "login" ? t("auth.login")
                                : mode === "forgot" ? t("auth.resetTitle")
                                : mode === "update-password" ? "Neues Passwort setzen"
                                : t("auth.register")}
                        </h2>
                        <p className="text-sm mb-6" style={{ color: "#6B7280" }}>
                            {mode === "login" ? "Willkommen zurück." : mode === "register" ? "Konto erstellen und loslegen." : ""}
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {mode === "update-password" ? (
                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: "#1E2D26" }}>Neues Passwort</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className={inputClass}
                                        placeholder="Mindestens 6 Zeichen"
                                        required
                                        minLength={6}
                                    />
                                </div>
                            ) : (
                                <>
                                    {mode === "register" && (
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5" style={{ color: "#1E2D26" }}>{t("auth.name")}</label>
                                            <input
                                                type="text"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                className={inputClass}
                                                placeholder="Max Mustermann"
                                                required
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium mb-1.5" style={{ color: "#1E2D26" }}>{t("auth.email")}</label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className={inputClass}
                                            placeholder="max@example.com"
                                            required
                                        />
                                    </div>

                                    {mode !== "forgot" && (
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="block text-sm font-medium" style={{ color: "#1E2D26" }}>{t("auth.password")}</label>
                                                {mode === "login" && (
                                                    <button
                                                        type="button"
                                                        onClick={() => { setMode("forgot"); setError(""); setSuccess(""); }}
                                                        className="text-xs font-medium transition-colors"
                                                        style={{ color: "#1A7D5A" }}
                                                    >
                                                        {t("auth.forgotPassword")}
                                                    </button>
                                                )}
                                            </div>
                                            <input
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className={inputClass}
                                                placeholder="••••••••"
                                                required
                                                minLength={6}
                                            />
                                        </div>
                                    )}
                                </>
                            )}

                            {error && (
                                <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC3545" }}>
                                    <XCircle className="w-4 h-4 flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ background: "#D4EDE2", border: "1px solid #A7D9C3", color: "#1A7D5A" }}>
                                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                    {success}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                                style={{ background: loading ? "#3BAA82" : "#1A7D5A" }}
                                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#3BAA82"; }}
                                onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = "#1A7D5A"; }}
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {mode === "login" ? t("auth.login")
                                    : mode === "forgot" ? t("auth.sendLink")
                                    : mode === "update-password" ? "Passwort speichern"
                                    : t("auth.register")}
                            </button>
                        </form>

                        {mode !== "update-password" && (
                            <div className="mt-5 text-center">
                                {mode === "forgot" ? (
                                    <button
                                        type="button"
                                        onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
                                        className="text-sm font-medium transition-colors"
                                        style={{ color: "#1A7D5A" }}
                                    >
                                        {t("auth.backToLogin")}
                                    </button>
                                ) : (
                                    <p className="text-sm" style={{ color: "#6B7280" }}>
                                        {mode === "login" ? t("auth.noAccount") : t("auth.hasAccount")}
                                        <button
                                            type="button"
                                            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setSuccess(""); }}
                                            className="ml-1.5 font-medium transition-colors"
                                            style={{ color: "#1A7D5A" }}
                                        >
                                            {mode === "login" ? t("auth.registerNow") : t("auth.login")}
                                        </button>
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
