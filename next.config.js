/** @type {import('next').NextConfig} */
const nextConfig = {
    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    { key: "X-Content-Type-Options", value: "nosniff" },
                    // SAMEORIGIN not DENY — the booking widget uses iframes
                    { key: "X-Frame-Options", value: "SAMEORIGIN" },
                    { key: "X-XSS-Protection", value: "1; mode=block" },
                    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
                    {
                        key: "Content-Security-Policy",
                        value: [
                            "default-src 'self'",
                            // Next.js requires unsafe-inline + unsafe-eval for its runtime
                            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://esm.sh",
                            "style-src 'self' 'unsafe-inline'",
                            // blob: for jspdf-generated PDFs; https: for org logos / bike images
                            "img-src 'self' data: blob: https:",
                            // Supabase REST + realtime WebSocket
                            "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
                            "font-src 'self' data:",
                            // Disallow embedding this app in foreign frames
                            "frame-ancestors 'none'"
                        ].join("; ")
                    }
                ]
            }
        ];
    }
};

export default nextConfig;
