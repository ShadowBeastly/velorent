import { LayoutDashboard, Sparkles, DoorOpen, Users, BarChart3 } from "lucide-react";

export const LOCIVA_NAVIGATION_ITEMS = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/hotel" },
    { id: "activities", label: "Aktivitäten", icon: Sparkles, path: "/hotel/activities" },
    { id: "rooms", label: "Zimmer & QR", icon: DoorOpen, path: "/hotel/rooms" },
    { id: "providers", label: "Anbieter", icon: Users, path: "/hotel/providers" },
    { id: "analytics", label: "Statistiken", icon: BarChart3, path: "/hotel/analytics" },
];
