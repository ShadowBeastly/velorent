// app/api/dashboard/route.js
// Aggregated dashboard data endpoint — all widgets in one call.
// GET /api/dashboard?orgId=<uuid>
// Returns: revenue30d, prevRevenue30d, dailyRevenue30d[], activeRentals, overdueCount,
//          utilization, todayPickups[], todayReturns[], maintenanceOverdue,
//          maintenanceDueSoon, upcomingBookings[], monthlyRevenue[], topBikes[]
// Cache: 5 minutes (Cache-Control: private, max-age=300)

import { createClient } from "../../../src/utils/supabase/server";

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");

    if (!orgId) {
        return Response.json({ error: "orgId required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    const d30 = new Date(today);
    d30.setDate(d30.getDate() - 29);
    const start30 = d30.toISOString().slice(0, 10);

    const d60 = new Date(today);
    d60.setDate(d60.getDate() - 59);
    const start60 = d60.toISOString().slice(0, 10);

    const d31 = new Date(today);
    d31.setDate(d31.getDate() - 30);
    const end60 = d31.toISOString().slice(0, 10);

    const in7 = new Date(today);
    in7.setDate(in7.getDate() + 7);
    const in7Str = in7.toISOString();

    // ── 1. All bookings (last 12 months + active) ───────────────────────
    const d365 = new Date(today);
    d365.setFullYear(d365.getFullYear() - 1);
    const start365 = d365.toISOString().slice(0, 10);

    const [bookingsRes, bikesRes, maintenanceRes] = await Promise.all([
        supabase
            .from("bookings")
            .select("id, start_date, end_date, total_price, status, customer_name, bike_id, pickup_time, return_time, booking_number")
            .eq("organization_id", orgId)
            .gte("start_date", start365)
            .order("start_date", { ascending: true }),

        supabase
            .from("bikes")
            .select("id, name")
            .eq("organization_id", orgId)
            .eq("status", "available"),

        supabase
            .from("maintenance_schedules")
            .select("id, bike_id, type, next_due_at")
            .eq("organization_id", orgId)
            .not("next_due_at", "is", null),
    ]);

    const bookings = bookingsRes.data || [];
    const bikes = bikesRes.data || [];
    const maintenanceSchedules = maintenanceRes.data || [];

    const totalBikes = bikes.length;

    // ── 2. Revenue 30d vs prev 30d ───────────────────────────────────────
    const REVENUE_STATUSES = ["picked_up", "returned"];

    const revenue30 = bookings
        .filter(b => REVENUE_STATUSES.includes(b.status) && b.end_date >= start30 && b.end_date <= todayStr)
        .reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);

    const prevRevenue30 = bookings
        .filter(b => REVENUE_STATUSES.includes(b.status) && b.end_date >= start60 && b.end_date <= end60)
        .reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);

    // ── 3. Daily revenue (30 data points for sparkline) ─────────────────
    const dailyRevenue30 = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const ds = d.toISOString().slice(0, 10);
        const val = bookings
            .filter(b => REVENUE_STATUSES.includes(b.status) && b.end_date === ds)
            .reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);
        dailyRevenue30.push({ date: ds, value: val });
    }

    // ── 4. Active rentals + overdue ──────────────────────────────────────
    const activeRentals = bookings.filter(b => b.status === "picked_up");
    const overdueCount = activeRentals.filter(b => b.end_date < todayStr).length;
    const utilization = totalBikes > 0 ? Math.round((activeRentals.length / totalBikes) * 100) : 0;

    // ── 5. Today's pickups + returns ─────────────────────────────────────
    const todayPickups = bookings
        .filter(b => b.start_date === todayStr && ["reserved", "confirmed"].includes(b.status))
        .sort((a, b) => (a.pickup_time || "09:00").localeCompare(b.pickup_time || "09:00"))
        .slice(0, 5)
        .map(b => ({ id: b.id, customer_name: b.customer_name, bike_id: b.bike_id, pickup_time: b.pickup_time, booking_number: b.booking_number }));

    const todayReturns = bookings
        .filter(b => b.status === "picked_up" && (b.end_date === todayStr || b.end_date < todayStr))
        .sort((a, b) => (a.return_time || "14:00").localeCompare(b.return_time || "14:00"))
        .slice(0, 5)
        .map(b => ({ id: b.id, customer_name: b.customer_name, bike_id: b.bike_id, return_time: b.return_time, end_date: b.end_date, isOverdue: b.end_date < todayStr }));

    // ── 6. Maintenance due ───────────────────────────────────────────────
    const nowISO = today.toISOString();
    const maintenanceOverdue = maintenanceSchedules.filter(m => m.next_due_at < nowISO).length;
    const maintenanceDueSoon = maintenanceSchedules.filter(m => m.next_due_at >= nowISO && m.next_due_at <= in7Str).length;

    // ── 7. Upcoming 5 bookings ───────────────────────────────────────────
    const upcomingBookings = bookings
        .filter(b => ["reserved", "confirmed"].includes(b.status) && b.start_date >= todayStr)
        .sort((a, b) => a.start_date.localeCompare(b.start_date))
        .slice(0, 5)
        .map(b => ({
            id: b.id,
            customer_name: b.customer_name,
            bike_id: b.bike_id,
            start_date: b.start_date,
            end_date: b.end_date,
            status: b.status,
            booking_number: b.booking_number,
            isToday: b.start_date === todayStr,
        }));

    // ── 8. Monthly revenue (last 12 months) ──────────────────────────────
    const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
    const monthlyRevenue = [];
    for (let i = 11; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const val = bookings
            .filter(b => REVENUE_STATUSES.includes(b.status) && b.end_date && b.end_date.startsWith(monthStr))
            .reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);
        monthlyRevenue.push({ month: MONTHS[d.getMonth()], year: d.getFullYear(), value: val });
    }

    // ── 9. Top 5 bikes by revenue (last 30d) ─────────────────────────────
    const bikeRevMap = {};
    const bikeRentalMap = {};
    bookings
        .filter(b => REVENUE_STATUSES.includes(b.status) && b.end_date >= start30 && b.end_date <= todayStr && b.bike_id)
        .forEach(b => {
            bikeRevMap[b.bike_id] = (bikeRevMap[b.bike_id] || 0) + (Number(b.total_price) || 0);
            bikeRentalMap[b.bike_id] = (bikeRentalMap[b.bike_id] || 0) + 1;
        });

    // Build a name map from bikes + also fetch any missing names
    const bikeNameMap = {};
    bikes.forEach(b => { bikeNameMap[b.id] = b.name; });

    // If some bike_ids in revenue map aren't in the bikes (available) list, fetch them
    const missingIds = Object.keys(bikeRevMap).filter(id => !bikeNameMap[id]);
    if (missingIds.length > 0) {
        const { data: extraBikes } = await supabase
            .from("bikes")
            .select("id, name")
            .eq("organization_id", orgId)
            .in("id", missingIds);
        (extraBikes || []).forEach(b => { bikeNameMap[b.id] = b.name; });
    }

    const maxRevenue = Math.max(...Object.values(bikeRevMap), 1);
    const topBikes = Object.entries(bikeRevMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([bikeId, rev]) => ({
            bike_id: bikeId,
            name: bikeNameMap[bikeId] || "Bike",
            revenue: rev,
            rentals: bikeRentalMap[bikeId] || 0,
            pct: Math.round((rev / maxRevenue) * 100),
        }));

    const payload = {
        revenue30,
        prevRevenue30,
        dailyRevenue30,
        activeRentals: activeRentals.length,
        overdueCount,
        utilization,
        totalBikes,
        todayPickups,
        todayReturns,
        maintenanceOverdue,
        maintenanceDueSoon,
        upcomingBookings,
        monthlyRevenue,
        topBikes,
    };

    return Response.json(payload, {
        headers: { "Cache-Control": "private, max-age=300" },
    });
}
