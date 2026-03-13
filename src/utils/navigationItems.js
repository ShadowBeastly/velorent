import { Bike, Home, Calendar, FileText, Receipt, Users, Settings, Layers, Wrench, Tag, Package, Euro, Store, Building2, BarChart3 } from "lucide-react";

export const NAVIGATION_ITEMS = [
    { id: "dashboard", labelKey: "nav.dashboard", icon: Home, path: "/app" },
    { id: "calendar", labelKey: "nav.calendar", icon: Calendar, path: "/app/calendar" },
    { id: "bookings", labelKey: "nav.bookings", icon: FileText, path: "/app/bookings" },
    { id: "invoices", labelKey: "nav.invoices", icon: Receipt, path: "/app/invoices" },
    { id: "fleet", labelKey: "nav.fleet", icon: Bike, path: "/app/fleet" },
    { id: "pricing", labelKey: "nav.pricing", icon: Euro, path: "/app/pricing" },
    { id: "categories", labelKey: "nav.categories", icon: Layers, path: "/app/categories" },
    { id: "maintenance", labelKey: "nav.maintenance", icon: Wrench, path: "/app/maintenance" },
    { id: "addons", labelKey: "nav.addons", icon: Package, path: "/app/addons" },
    { id: "vouchers", labelKey: "nav.vouchers", icon: Tag, path: "/app/vouchers" },
    { id: "customers", labelKey: "nav.customers", icon: Users, path: "/app/customers" },
    { id: "settings", labelKey: "nav.settings", icon: Settings, path: "/app/settings" },
    { id: "marketplace", labelKey: "nav.marketplace", icon: Store, path: "/app/marketplace" },
    { id: "hotel-stats", labelKey: "nav.hotelStats", icon: Building2, path: "/app/hotel-stats" },
    { id: "admin-hotels", labelKey: "nav.adminHotels", icon: Building2, path: "/app/admin/hotels" },
    { id: "admin-providers", labelKey: "nav.adminProviders", icon: Store, path: "/app/admin/providers" },
    { id: "admin-analytics", labelKey: "nav.adminAnalytics", icon: BarChart3, path: "/app/admin/analytics" },
];
