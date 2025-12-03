import { useState } from "react";
import { Building, Loader2 } from "lucide-react";
import { useOrganization } from "../context/OrgContext";
import { useAuth } from "../context/AuthContext";

export default function OnboardingPage() {
    const org = useOrganization();
    const auth = useAuth();

    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleCreate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const { error } = await org.createOrganization(name, slug);
        if (error) {
            setError(error.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                        <Building className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Willkommen bei VeloRent Pro!</h1>
                    <p className="text-slate-400 mt-2">Erstelle dein Unternehmen, um loszulegen</p>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8">
                    <form onSubmit={handleCreate} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Unternehmensname
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-"));
                                }}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-orange-500 outline-none"
                                placeholder="z.B. Hotel zur Post Fahrradverleih"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                URL-Kürzel (slug)
                            </label>
                            <div className="flex items-center">
                                <span className="text-slate-500 text-sm mr-2">velorent.app/</span>
                                <input
                                    type="text"
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                                    className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-orange-500 outline-none"
                                    placeholder="hotel-zur-post"
                                    required
                                    pattern="[a-z0-9-]+"
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Nur Kleinbuchstaben, Zahlen und Bindestriche</p>
                        </div>

                        {error && (
                            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !name || !slug}
                            className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                            Unternehmen erstellen
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-slate-800">
                        <button
                            type="button"
                            onClick={() => auth.signOut()}
                            className="w-full text-center text-slate-400 hover:text-white text-sm"
                        >
                            Mit anderem Account anmelden
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
