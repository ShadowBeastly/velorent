import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
    // If env vars are missing, return 500. Do NOT pass through unauthenticated.
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        return new NextResponse("Server configuration error", { status: 500 });
    }

    // Hostname-based routing: lociva.de/ → /lociva, rentcore.de/ → / (no rewrite needed)
    const hostname = (request.headers.get("host") ?? "").toLowerCase().replace(/:\d+$/, "");
    // SEC-11: Exact hostname match instead of substring to prevent spoofing
    const LOCIVA_HOSTS = ["lociva.de", "www.lociva.de"];
    const isLociva = LOCIVA_HOSTS.includes(hostname) || hostname.endsWith(".lociva.de");
    const isRootPath = request.nextUrl.pathname === "/";
    if (isLociva && isRootPath) {
        const url = request.nextUrl.clone();
        url.pathname = "/lociva";
        return NextResponse.rewrite(url);
    }

    let response = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll: () => request.cookies.getAll(),
                setAll: (cookiesToSet) =>
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
            }
        }
    );

    const { data: { user } } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;
    const isApp = pathname.startsWith("/app");
    const isAdmin = pathname.startsWith("/app/admin");
    const isAuth = ["/login", "/signup"].includes(pathname);
    // SEC-10: Protected hotel dashboard routes. /hotel/[slug] is public (guest pages).
    // A slug is always a lowercase alphanumeric string with hyphens — dashboard routes use fixed names.
    const HOTEL_DASHBOARD_PATHS = ["/hotel/activities", "/hotel/rooms", "/hotel/providers", "/hotel/analytics", "/hotel/dashboard", "/hotel/settings"];
    const isHotelDashboard = pathname === "/hotel" || HOTEL_DASHBOARD_PATHS.some(p => pathname.startsWith(p));

    if ((isApp || isHotelDashboard) && !user) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // Load profile once for all role-based routing decisions
    let role: string | null = null;
    if (user) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();
        role = profile?.role ?? null;
    }

    // Lociva.de domain routing: /app → redirect non-admins away from RentCore dashboard
    // RentCore is for providers (rentcore.de). Lociva is for venues + admins.
    if (isLociva && isApp && !isAdmin && user) {
        if (role === "superadmin") {
            return NextResponse.redirect(new URL("/app/admin", request.url));
        }
        // Hotel users and providers on lociva.de → venue dashboard
        return NextResponse.redirect(new URL("/hotel", request.url));
    }

    if (isAuth && user) {
        if (role === "superadmin") {
            return NextResponse.redirect(new URL("/app/admin", request.url));
        }
        if (role === "hotel") {
            return NextResponse.redirect(new URL("/hotel", request.url));
        }
        // On lociva.de, providers go to venue dashboard; on rentcore.de, to RentCore dashboard
        if (isLociva) {
            return NextResponse.redirect(new URL("/hotel", request.url));
        }
        return NextResponse.redirect(new URL("/app", request.url));
    }

    // Hotel users must not access /app — redirect them to their dashboard.
    if (isApp && !isAdmin && user && role === "hotel") {
        return NextResponse.redirect(new URL("/hotel", request.url));
    }

    // Server-side admin role check. Client-side check alone is not sufficient.
    if (isAdmin && user && role !== "superadmin") {
        return NextResponse.redirect(new URL("/app", request.url));
    }

    return response;
}

export const config = {
    matcher: ["/", "/app/:path*", "/hotel", "/hotel/:path*", "/login", "/signup"]
};
