import { LayoutDashboard, Sparkles, DoorOpen, Users, QrCode, BarChart3, Settings } from "lucide-react";

export const LOCIVA_NAVIGATION_ITEMS = [
    { id: "dashboard", labelKey: "Dashboard", icon: LayoutDashboard, path: "/app/lociva" },
    { id: "activities", labelKey: "Aktivitaeten", icon: Sparkles, path: "/app/lociva/activities" },
    { id: "rooms", labelKey: "Zimmer & QR", icon: DoorOpen, path: "/app/lociva/rooms" },
    { id: "providers", labelKey: "Anbieter", icon: Users, path: "/app/lociva/providers" },
    { id: "qr-codes", labelKey: "QR-Codes", icon: QrCode, path: "/app/lociva/qr-codes" },
    { id: "analytics", labelKey: "Statistiken", icon: BarChart3, path: "/app/lociva/analytics" },
    { id: "settings", labelKey: "Einstellungen", icon: Settings, path: "/app/lociva/settings" },
];
