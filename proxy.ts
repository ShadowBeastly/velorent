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
    const isLociva = hostname.includes("lociva");
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
    // /hotel (exact) and /hotel/dashboard, /hotel/activities, etc. are protected
    // /hotel/[slug] and /hotel/[slug]/cancel are public guest pages (handled by [slug] route)
    const isHotelDashboard = pathname === "/hotel" || [
        "/hotel/activities", "/hotel/rooms",
        "/hotel/providers", "/hotel/analytics"
    ].some(p => pathname.startsWith(p));

    if ((isApp || isHotelDashboard) && !user) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // Lociva.de domain routing: /app → redirect non-admins away from RentCore dashboard
    // RentCore is for providers (rentcore.de). Lociva is for venues + admins.
    if (isLociva && isApp && !isAdmin && user) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        const role = profile?.role;
        if (role === "superadmin") {
            // Superadmins on lociva.de → admin dashboard
            return NextResponse.redirect(new URL("/app/admin", request.url));
        }
        if (role === "hotel") {
            // Venue users → venue dashboard
            return NextResponse.redirect(new URL("/hotel", request.url));
        }
        // Regular providers on lociva.de → venue dashboard (they shouldn't be on lociva.de)
        return NextResponse.redirect(new URL("/hotel", request.url));
    }

    if (isAuth && user) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        const role = profile?.role;
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
    if (isApp && !isAdmin && user) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profile?.role === "hotel") {
            return NextResponse.redirect(new URL("/hotel", request.url));
        }
    }

    // Server-side admin role check. Client-side check alone is not sufficient.
    if (isAdmin && user) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profile?.role !== "superadmin") {
            return NextResponse.redirect(new URL("/app", request.url));
        }
    }

    return response;
}

export const config = {
    matcher: ["/", "/app/:path*", "/hotel", "/hotel/activities/:path*", "/hotel/rooms/:path*", "/hotel/providers/:path*", "/hotel/analytics/:path*", "/login", "/signup"]
};
