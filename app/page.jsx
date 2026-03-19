"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../src/context/AuthContext";
import RentCoreLandingPage from "../src/views/RentCoreLandingPage";

function getHomeRoute(role) {
    if (role === "superadmin") return "/app/admin";
    if (role === "hotel") return "/app/lociva";
    return "/app";
}

export default function HomePage() {
    const router = useRouter();
    const { user, profile, loading } = useAuth();

    useEffect(() => {
        if (loading) return;
        if (user) router.push(getHomeRoute(profile?.role));
    }, [user, profile, loading, router]);

    return (
        <RentCoreLandingPage
            onGetStarted={() => router.push("/signup")}
            onLogin={() => router.push("/login")}
            onDemo={() => router.push("/demo")}
        />
    );
}
