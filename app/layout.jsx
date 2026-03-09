export const dynamic = "force-dynamic";

import "./globals.css";
import { AuthProvider } from "../src/context/AuthContext";
import CookieBanner from "../src/components/ui/CookieBanner";

export const metadata = {
    title: "VeloRent Pro",
    description: "Cloud-basierte Fahrradvermietung"
};

export default function RootLayout({ children }) {
    return (
        <html lang="de">
            <body>
                <AuthProvider>{children}</AuthProvider>
                <CookieBanner />
            </body>
        </html>
    );
}
