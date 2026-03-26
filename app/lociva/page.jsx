"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../src/context/AuthContext";
import LandingPage from "../../src/views/LandingPage";

export default function LocivaHomePage() {
    const router = useRouter();
    const { user, profile } = useAuth();

    useEffect(() => {
        if (!user) return;
        const role = profile?.role;
        if (role === "superadmin") router.push("/app/admin");
        else if (role === "hotel") router.push("/hotel");
        else router.push("/app");
    }, [user, profile, router]);

    return (
        <LandingPage
            onGetStarted={() => router.push("/signup")}
            onLogin={() => router.push("/login")}
        />
    );
}
