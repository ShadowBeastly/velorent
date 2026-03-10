export const dynamic = "force-dynamic";

import "./globals.css";
import { Inter, Outfit } from "next/font/google";
import { AuthProvider } from "../src/context/AuthContext";
import { I18nProvider } from "../src/utils/i18n";
import CookieBanner from "../src/components/ui/CookieBanner";
import ServiceWorkerRegistration from "../src/components/ServiceWorkerRegistration";

// Fonts sind jetzt self-hosted via next/font — kein externer Google-Request beim Seitenaufruf
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

export const metadata = {
    title: "RentCore — Cloud-basierte Fahrradvermietung",
    description: "Die All-in-One SaaS-Lösung für Fahrradvermietungen. Flottenmanagement, Online-Buchungen, Rechnungen und mehr.",
    manifest: "/manifest.json",
    themeColor: "#f97316",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "RentCore",
    },
    openGraph: {
        title: "RentCore — Cloud-basierte Fahrradvermietung",
        description: "Die All-in-One SaaS-Lösung für Fahrradvermietungen.",
        type: "website",
        locale: "de_DE",
    },
};

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
