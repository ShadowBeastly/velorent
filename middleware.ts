import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
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

    const isApp = request.nextUrl.pathname.startsWith("/app");
    const isAdmin = request.nextUrl.pathname.startsWith("/app/admin");
    const isAuth = ["/login", "/signup"].includes(request.nextUrl.pathname);

    if (isApp && !user) {
        return NextResponse.redirect(new URL("/login", request.url));
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
            return NextResponse.redirect(new URL("/app/lociva", request.url));
        }
        return NextResponse.redirect(new URL("/app", request.url));
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
    matcher: ["/", "/app/:path*", "/login", "/signup"]
};
