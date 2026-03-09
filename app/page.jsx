"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../src/context/AuthContext";
import LandingPage from "../src/views/LandingPage";

export default function HomePage() {
    const router = useRouter();
    const { user } = useAuth();

    useEffect(() => {
        if (user) router.push("/app");
    }, [user, router]);

    return (
        <LandingPage
            onGetStarted={() => router.push("/signup")}
            onLogin={() => router.push("/login")}
        />
    );
}
