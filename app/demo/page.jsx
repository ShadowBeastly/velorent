"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../src/context/AuthContext";
import { Loader2, Bike, AlertCircle } from "lucide-react";

const C = { primary: "#1A7D5A", dark: "#1E2D26", bg: "#F5FAF7", neutral: "#6B7280" };

export default function DemoPage() {
    const { signIn, signOut, user, loading, profile } = useAuth();
    const router = useRouter();
    const demoEmail = process.env.NEXT_PUBLIC_DEMO_EMAIL;
    const demoPassword = process.env.NEXT_PUBLIC_DEMO_PASSWORD;
    const started = useRef(false);
    const [demoSignedIn, setDemoSignedIn] = useState(false);
    const [error, setError] = useState(
        !demoEmail || !demoPassword
            ? "Demo-Account ist nicht konfiguriert. Bitte wende dich an info@rentcore.de."
            : ""
    );

    // Navigate only after the auth context has updated user + profile — avoids a race
    // where router.push fires before onAuthStateChange propagates to React state.
    useEffect(() => {
        if (!demoSignedIn || !user || user.email !== demoEmail || loading || !profile) return;
        if (profile.role === "hotel") {
            router.push("/hotel");
        } else {
            router.push("/app");
        }
    }, [demoSignedIn, user, demoEmail, loading, profile, router]);

    useEffect(() => {
        if (loading || error || started.current) return;

        async function run() {
            started.current = true;
            try {
                // Sign out first if anyone is logged in (even demo user, to get clean state)
                if (user) {
                    await signOut();
                }

                // Sign in as demo
                await signIn(demoEmail, demoPassword);

                // Set demo org; navigation is handled by the effect above once
                // the auth context reflects the new user.
                localStorage.setItem("currentOrgId", "d0000000-0000-0000-0000-000000000001");
                setDemoSignedIn(true);
            } catch (err) {
                started.current = false;
                setError(
                    err.message?.includes("Invalid login")
                        ? "Demo-Account nicht gefunden. Bitte Demo zuerst in Supabase einrichten."
                        : "Demo-Login fehlgeschlagen: " + (err.message || "Unbekannter Fehler.")
                );
            }
        }

        run();
    }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4" style={{ background: C.bg }}>
                <div className="text-center max-w-sm">
                    <div className="w-12 h-12 rounded-2xl mx-auto mb-5 flex items-center justify-center"
                        style={{ background: "#FEF2F2" }}>
                        <AlertCircle className="w-6 h-6" style={{ color: "#DC3545" }} />
                    </div>
                    <h2 className="text-base font-medium mb-2" style={{ color: C.dark }}>Demo nicht verfügbar</h2>
                    <p className="text-sm mb-6" style={{ color: C.neutral }}>{error}</p>
                    <button
                        onClick={() => router.push("/")}
                        className="text-sm font-medium transition-colors"
                        style={{ color: C.primary }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.7"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                    >
                        ← Zurück zur Startseite
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-5" style={{ background: C.bg }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm"
                style={{ background: C.primary }}>
                <Bike className="w-7 h-7 text-white" />
            </div>
            <div>
                <div className="flex items-center justify-center gap-2 mb-2">
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: C.primary }} />
                    <span className="text-sm font-medium" style={{ color: C.dark }}>Demo wird geladen…</span>
                </div>
                <p className="text-xs text-center" style={{ color: C.neutral }}>Du wirst automatisch weitergeleitet.</p>
            </div>
        </div>
    );
}
