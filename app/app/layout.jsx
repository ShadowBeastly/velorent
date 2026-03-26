"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { OrgProvider, useOrganization } from "../../src/context/OrgContext";
import { AppProvider, useApp } from "../../src/context/AppContext";
import { DataProvider, useData } from "../../src/context/DataContext";
import { useAuth } from "../../src/context/AuthContext";
import Sidebar from "../../src/components/layout/Sidebar";
import Header from "../../src/components/layout/Header";
import LoadingScreen from "../../src/components/ui/LoadingScreen";
import OnboardingPage from "../../src/views/OnboardingPage";
import OnboardingWizard from "../../src/components/onboarding/OnboardingWizard";
import { ToastProvider } from "../../src/components/ui/Toast";
import DemoBanner from "../../src/components/ui/DemoBanner";

function AppShell({ children }) {
    const router = useRouter();
    const org = useOrganization();
    const auth = useAuth();
    const { darkMode, sidebarOpen, setSidebarOpen, setSearchQuery } = useApp();
    const { bikes, bookings } = useData();

    useEffect(() => {
        if (!auth.loading && !auth.user) {
            router.push("/login");
        }
        if (!auth.loading && auth.profile?.role === "hotel") {
            router.push("/hotel");
        }
    }, [auth.loading, auth.user, auth.profile, router]);

    if (auth.loading || org.loading) return <LoadingScreen />;
    if (!org.currentOrg) return <OnboardingPage />;

    const isDemo = auth.user?.email === process.env.NEXT_PUBLIC_DEMO_EMAIL;

    return (
        <div className={`min-h-screen transition-colors duration-300 ${isDemo ? "pt-10" : ""} ${darkMode ? "dark bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
            <DemoBanner userEmail={auth.user?.email} onExit={auth.signOut} />
            {/* Skip to main content. Visible on focus for keyboard users. */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-orange-500 focus:text-white focus:rounded-lg"
            >
                Zum Hauptinhalt springen
            </a>
            {/* Mobile backdrop. Shown only on small screens when sidebar is open. */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}
            <Sidebar org={org} auth={auth} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} darkMode={darkMode} bannerOffset={isDemo} />
            <main id="main-content" className={`transition-all duration-300 ${sidebarOpen ? "md:ml-64" : "md:ml-20"}`}>
                <Header bannerOffset={isDemo} />
                <div className="p-6">
                    {children}
                </div>
                <OnboardingWizard
                    bikes={bikes.bikes}
                    bookings={bookings.bookings}
                    darkMode={darkMode}
                    hasOrgData={!!(org.currentOrg?.address && org.currentOrg?.city)}
                    hasWidgetKey={!!org.currentOrg?.settings?.widget_api_key}
                    onCreateBike={() => { setSearchQuery(""); router.push("/app/fleet"); }}
                    onCreateBooking={() => { setSearchQuery(""); router.push("/app/bookings"); }}
                    onGoToSettings={() => { setSearchQuery(""); router.push("/app/settings"); }}
                    onGoToWidget={() => { setSearchQuery(""); router.push("/app/settings"); }}
                />
            </main>
        </div>
    );
}

export default function AppLayout({ children }) {
    return (
        <OrgProvider>
            <AppProvider>
                <DataProvider>
                    <ToastProvider>
                        <AppShell>{children}</AppShell>
                    </ToastProvider>
                </DataProvider>
            </AppProvider>
        </OrgProvider>
    );
}
