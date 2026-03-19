"use client";
import { useAuth } from "@/src/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ShieldAlert } from "lucide-react";
import { useApp } from "@/src/context/AppContext";

export default function AdminLayout({ children }) {
    const auth = useAuth();
    const router = useRouter();
    const { darkMode } = useApp();
    const isAdmin = auth.profile?.role === "superadmin";

    useEffect(() => {
        if (!auth.loading && !isAdmin) {
            router.replace("/app");
        }
    }, [auth.loading, isAdmin, router]);

    if (auth.loading) return null;

    if (!isAdmin) {
        return (
            <div className={`flex flex-col items-center justify-center min-h-[60vh] gap-4 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                <ShieldAlert className="w-12 h-12" />
                <p className="text-lg font-medium">Kein Zugriff. Nur für Plattform-Admins.</p>
            </div>
        );
    }

    return children;
}
