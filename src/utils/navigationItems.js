import { Bike, Home, Calendar, FileText, Users, Settings, Layers, Wrench, Tag, Package } from "lucide-react";

export const NAVIGATION_ITEMS = [
    { id: "dashboard", label: "Dashboard", icon: Home, path: "/app" },
    { id: "calendar", label: "Kalender", icon: Calendar, path: "/app/calendar" },
    { id: "bookings", label: "Buchungen", icon: FileText, path: "/app/bookings" },
    { id: "invoices", label: "Rechnungen", icon: FileText, path: "/app/invoices" },
    { id: "fleet", label: "Flotte", icon: Bike, path: "/app/fleet" },
    { id: "categories", label: "Kategorien", icon: Layers, path: "/app/categories" },
    { id: "maintenance", label: "Wartung", icon: Wrench, path: "/app/maintenance" },
    { id: "addons", label: "Zubehör", icon: Package, path: "/app/addons" },
    { id: "vouchers", label: "Gutscheine", icon: Tag, path: "/app/vouchers" },
    { id: "customers", label: "Kunden", icon: Users, path: "/app/customers" },
    { id: "settings", label: "Einstellungen", icon: Settings, path: "/app/settings" }
];
