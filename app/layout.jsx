export const dynamic = "force-dynamic";

import "./globals.css";
import { Inter, Outfit } from "next/font/google";
import { headers } from "next/headers";
import { AuthProvider } from "../src/context/AuthContext";
import { I18nProvider } from "../src/utils/i18n";
import CookieBanner from "../src/components/ui/CookieBanner";
import ServiceWorkerRegistration from "../src/components/ServiceWorkerRegistration";

// Fonts sind jetzt self-hosted via next/font. Kein externer Google-Request beim Seitenaufruf.
const inter = Inter({
    subsets: ["latin"],
    weight: ["300", "400", "500", "600", "700"],
    variable: "--font-inter",
    display: "swap",
});

const outfit = Outfit({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700", "800"],
    variable: "--font-outfit",
    display: "swap",
});

export async function generateMetadata() {
    const headersList = await headers();
    const host = (headersList.get("host") ?? "").toLowerCase();
    const isRentCore = host.includes("rentcore");

    return isRentCore ? {
        title: "RentCore. Buchungssystem für Fahrrad-Verleiher",
        description: "Das digitale Buchungssystem für Fahrrad- und E-Bike-Verleiher. Online buchen, automatisch abrechnen. Ab 49 € / Monat.",
        manifest: "/manifest.json",
        openGraph: {
            title: "RentCore. Buchungssystem für Fahrrad-Verleiher",
            description: "Das digitale Buchungssystem für Fahrrad- und E-Bike-Verleiher.",
            type: "website",
            locale: "de_DE",
        },
    } : {
        title: "Lociva. Lokale Aktivitäten für Hotelgäste",
        description: "Der digitale Concierge für Hotels. Gäste buchen lokale Aktivitäten direkt via QR-Code. Fahrräder, Touren, Erlebnisse und mehr.",
        manifest: "/manifest.json",
        appleWebApp: {
            capable: true,
            statusBarStyle: "black-translucent",
            title: "Lociva",
        },
        openGraph: {
            title: "Lociva. Lokale Aktivitäten für Hotelgäste",
            description: "Der digitale Concierge für Hotels. Gäste buchen lokale Aktivitäten direkt via QR-Code.",
            type: "website",
            locale: "de_DE",
        },
    };
}

export default function RootLayout({ children }) {
    return (
        <html lang="de" className={`${inter.variable} ${outfit.variable}`}>
            <body>
                <I18nProvider>
                    <AuthProvider>{children}</AuthProvider>
                </I18nProvider>
                <CookieBanner />
                <ServiceWorkerRegistration />
            </body>
        </html>
    );
}
