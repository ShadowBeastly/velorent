import { LayoutDashboard, Sparkles, DoorOpen, Users, BarChart3 } from "lucide-react";

export const LOCIVA_NAVIGATION_ITEMS = [
    { id: "dashboard", labelKey: "Dashboard", icon: LayoutDashboard, path: "/hotel" },
    { id: "activities", labelKey: "Aktivitäten", icon: Sparkles, path: "/hotel/activities" },
    { id: "rooms", labelKey: "Zimmer & QR", icon: DoorOpen, path: "/hotel/rooms" },
    { id: "providers", labelKey: "Anbieter", icon: Users, path: "/hotel/providers" },
    { id: "analytics", labelKey: "Statistiken", icon: BarChart3, path: "/hotel/analytics" },
];
