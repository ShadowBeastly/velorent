"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../src/context/AuthContext";
import LandingPage from "../../src/views/LandingPage";

export default function LocivaHomePage() {
    const router = useRouter();
    const { user, profile, loading } = useAuth();

    useEffect(() => {
        if (!user || loading) return;
        const role = profile?.role;
        // Only redirect platform staff and hotel users.
        // Providers visiting lociva.de see the guest landing page — that's fine.
        if (role === "superadmin") router.push("/app/admin");
        else if (role === "hotel") router.push("/hotel");
    }, [user, profile, loading, router]);

    return (
        <LandingPage
            onGetStarted={() => router.push("/signup")}
            onLogin={() => router.push("/login")}
        />
    );
}
