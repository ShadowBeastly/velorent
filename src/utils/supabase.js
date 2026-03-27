import { createBrowserClient } from "@supabase/ssr";

// The "|| placeholder" fallbacks are required: createBrowserClient throws
// synchronously if either argument is falsy, which would crash the Next.js
// build when env vars are not set in the build environment.
export const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key",
    {
        auth: {
            flowType: "pkce",
            // Increase lock timeout to prevent "lock was released because
            // another request stole it" errors during concurrent token refreshes
            lock: { acquireTimeout: 10000 },
        },
    }
);
