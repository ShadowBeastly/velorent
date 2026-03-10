export const dynamic = "force-dynamic";

import "./globals.css";
import { AuthProvider } from "../src/context/AuthContext";
import { I18nProvider } from "../src/utils/i18n";
import CookieBanner from "../src/components/ui/CookieBanner";
import ServiceWorkerRegistration from "../src/components/ServiceWorkerRegistration";

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
        <html lang="de">
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
