import React, { useState, useMemo, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { OrgProvider, useOrganization } from "./context/OrgContext";
import { useBikes } from "./hooks/useBikes";
import { useBookings } from "./hooks/useBookings";
import { useCustomers } from "./hooks/useCustomers";
import { fmtISO } from "./utils/dateUtils";

import LoadingScreen from "./components/ui/LoadingScreen";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";

import AuthPage from "./pages/AuthPage";
import OnboardingPage from "./pages/OnboardingPage";
import DashboardPage from "./pages/DashboardPage";
import CalendarPage from "./pages/CalendarPage";
import BookingsPage from "./pages/BookingsPage";
import FleetPage from "./pages/FleetPage";
import CustomersPage from "./pages/CustomersPage";
import SettingsPage from "./pages/SettingsPage";

import LandingPage from "./LandingPage";
import * as LegalPages from "./LegalPages";

import InvoicesPage from "./pages/InvoicesPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingWrapper />} />
          <Route path="/login" element={<AuthPage initialMode="login" />} />
          <Route path="/signup" element={<AuthPage initialMode="register" />} />

          <Route path="/app/*" element={<ProtectedApp />} />

          <Route path="/impressum" element={<LegalWrapper Component={LegalPages.Impressum} />} />
          <Route path="/datenschutz" element={<LegalWrapper Component={LegalPages.Datenschutz} />} />
          <Route path="/agb" element={<LegalWrapper Component={LegalPages.AGB} />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

function LandingWrapper() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate("/app");
  }, [user, navigate]);

  return (
    <LandingPage
      onGetStarted={() => navigate("/signup")}
      onLogin={() => navigate("/login")}
    />
  );
}

function LegalWrapper({ Component }) {
  const navigate = useNavigate();
  return <Component onBack={() => navigate("/")} />;
}

function ProtectedApp() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" />;

  return (
    <OrgProvider>
      <MainLayout />
    </OrgProvider>
  );
}

function MainLayout() {
  const org = useOrganization();
  const auth = useAuth();
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Data hooks
  const bikes = useBikes(org.currentOrg?.id);
  const bookings = useBookings(org.currentOrg?.id);
  const customers = useCustomers(org.currentOrg?.id);

  const todayStr = fmtISO(new Date());
  const notifications = useMemo(() => {
    const n = [];
    bookings.bookings.forEach(b => {
      if (b.status === "picked_up" && b.end_date < todayStr) {
        n.push({ type: "warning", msg: `Überfällig: ${b.customer_name}`, id: b.id });
      }
      if (b.start_date === todayStr && ["reserved", "confirmed"].includes(b.status)) {
        n.push({ type: "info", msg: `Heute Abholung: ${b.customer_name}`, id: b.id });
      }
    });
    return n;
  }, [bookings.bookings, todayStr]);

  if (org.loading) return <LoadingScreen />;
  if (!org.currentOrg) return <OnboardingPage />;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? "dark bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      <Sidebar org={org} auth={auth} sidebarOpen={sidebarOpen} darkMode={darkMode} />

      <main className={`transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-20"}`}>
        <Header
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          notifications={notifications}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />

        <div className="p-6">
          <Routes>
            <Route path="/" element={<DashboardPage bikes={bikes} bookings={bookings} customers={customers} darkMode={darkMode} setCurrentPage={() => { }} />} />
            <Route path="/calendar" element={<CalendarPage bikes={bikes} bookings={bookings} customers={customers} darkMode={darkMode} />} />
            <Route path="/bookings" element={<BookingsPage bikes={bikes} bookings={bookings} customers={customers} darkMode={darkMode} searchQuery={searchQuery} />} />
            <Route path="/invoices" element={<InvoicesPage customers={customers} bookings={bookings} darkMode={darkMode} />} />
            <Route path="/fleet" element={<FleetPage bikes={bikes} bookings={bookings} darkMode={darkMode} searchQuery={searchQuery} />} />
            <Route path="/customers" element={<CustomersPage customers={customers} bookings={bookings} darkMode={darkMode} searchQuery={searchQuery} />} />
            <Route path="/settings" element={<SettingsPage org={org} auth={auth} darkMode={darkMode} />} />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

