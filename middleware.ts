import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    // If env vars are missing, skip auth check gracefully
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        return NextResponse.next({ request });
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
    const isAuth = ["/login", "/signup"].includes(request.nextUrl.pathname);

    if (isApp && !user) {
        return NextResponse.redirect(new URL("/login", request.url));
    }
    if (isAuth && user) {
        return NextResponse.redirect(new URL("/app", request.url));
    }

    return response;
}

export const config = {
    matcher: ["/app/:path*", "/login", "/signup"]
};
