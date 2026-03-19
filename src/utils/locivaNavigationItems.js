import { LayoutDashboard, Sparkles, DoorOpen, Users, QrCode, BarChart3, Settings } from "lucide-react";

export const LOCIVA_NAVIGATION_ITEMS = [
    { id: "dashboard", labelKey: "Dashboard", icon: LayoutDashboard, path: "/hotel" },
    { id: "activities", labelKey: "Aktivitaeten", icon: Sparkles, path: "/hotel/activities" },
    { id: "rooms", labelKey: "Zimmer & QR", icon: DoorOpen, path: "/hotel/rooms" },
    { id: "providers", labelKey: "Anbieter", icon: Users, path: "/hotel/providers" },
    { id: "qr-codes", labelKey: "QR-Codes", icon: QrCode, path: "/hotel/qr-codes" },
    { id: "analytics", labelKey: "Statistiken", icon: BarChart3, path: "/hotel/analytics" },
    { id: "settings", labelKey: "Einstellungen", icon: Settings, path: "/hotel/settings" },
];
