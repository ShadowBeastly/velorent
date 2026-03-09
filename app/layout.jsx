export const dynamic = "force-dynamic";

import "./globals.css";
import { AuthProvider } from "../src/context/AuthContext";

export const metadata = {
    title: "VeloRent Pro",
    description: "Cloud-basierte Fahrradvermietung"
};

export default function RootLayout({ children }) {
    return (
        <html lang="de">
            <body>
                <AuthProvider>{children}</AuthProvider>
            </body>
        </html>
    );
}
