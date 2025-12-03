import { useState, useEffect } from "react";
import { Bike, Loader2, XCircle, CheckCircle, Shield, Globe, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function AuthPage({ initialMode = "login" }) {
    const auth = useAuth();
    const navigate = useNavigate();
    const [mode, setMode] = useState(initialMode);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        if (auth.user) {
            navigate("/app");
        }
    }, [auth.user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");

        if (mode === "login") {
            const { error } = await auth.signIn(email, password);
            if (error) setError(error.message);
        } else {
            const { error } = await auth.signUp(email, password, fullName);
            if (error) setError(error.message);
            else setSuccess("Registrierung erfolgreich! Bitte bestätige deine E-Mail.");
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
            {/* Background Pattern */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                        <Bike className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white">VeloRent Pro</h1>
                    <p className="text-slate-400 mt-2">Cloud-basierte Fahrradvermietung</p>
                </div>

                {/* Auth Card */}
                <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8">
                    <h2 className="text-xl font-semibold text-white mb-6">
                        {mode === "login" ? "Anmelden" : "Registrieren"}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === "register" && (
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-colors"
                                    placeholder="Max Mustermann"
                                    required
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">E-Mail</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-colors"
                                placeholder="max@example.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Passwort</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-colors"
                                placeholder="••••••••"
                                required
                                minLength={6}
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm">
                                <XCircle className="w-4 h-4 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm">
                                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                {success}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                            {mode === "login" ? "Anmelden" : "Registrieren"}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-slate-400">
                            {mode === "login" ? "Noch keinen Account?" : "Bereits registriert?"}
                            <button
                                onClick={() => setMode(mode === "login" ? "register" : "login")}
                                className="ml-2 text-orange-500 hover:text-orange-600 font-medium"
                            >
                                {mode === "login" ? "Jetzt registrieren" : "Anmelden"}
                            </button>
                        </p>
                    </div>
                </div>

                {/* Features */}
                <div className="mt-8 grid grid-cols-3 gap-4 text-center">
                    {[
                        { icon: Shield, label: "Sicher" },
                        { icon: Globe, label: "Cloud" },
                        { icon: Users, label: "Multi-User" }
                    ].map(({ icon: Icon, label }) => (
                        <div key={label} className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl">
                            <Icon className="w-5 h-5 text-orange-400 mx-auto mb-1" />
                            <span className="text-xs text-slate-400">{label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
