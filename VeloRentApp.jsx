import React, { useState, useEffect, useMemo, createContext, useContext, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Bike, Calendar, Users, Settings, BarChart3, FileText, Download, Upload,
  Plus, Search, Bell, Moon, Sun, ChevronLeft, ChevronRight, X, Check,
  Clock, MapPin, Phone, Mail, CreditCard, AlertCircle, TrendingUp,
  Package, Euro, Filter, MoreHorizontal, Edit, Trash2, Eye, Printer,
  Home, Menu, LogOut, User, Building, ChevronDown, RefreshCw, Shield,
  Globe, Key, UserPlus, Loader2, CheckCircle, XCircle, Copy, ExternalLink
} from "lucide-react";
import Button from "./components/ui/Button";
import Card from "./components/ui/Card";
import Input from "./components/ui/Input";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

// ============ SUPABASE CONFIG ============
// ⚠️ Diese Werte mit deinen eigenen Supabase Credentials ersetzen!
const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============ CONTEXT ============
const AuthContext = createContext(null);
const OrgContext = createContext(null);

// ============ UTILITY FUNCTIONS ============
const fmtISO = (d) => new Date(d).toISOString().slice(0, 10);
const parseDate = (s) => new Date(s + "T00:00:00");
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const daysDiff = (a, b) => Math.ceil((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24)) + 1;
const fmtCurrency = (n) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n || 0);
const fmtDate = (s) => s ? new Date(s).toLocaleDateString("de-DE") : "—";
const fmtDateShort = (s) => new Date(s).toLocaleDateString("de-DE", { day: "2-digit", month: "short" });

const STATUS = {
  reserved: { label: "Reserviert", color: "bg-amber-100 text-amber-800 border-amber-300", dot: "bg-amber-500" },
  confirmed: { label: "Bestätigt", color: "bg-emerald-100 text-emerald-800 border-emerald-300", dot: "bg-emerald-500" },
  picked_up: { label: "Abgeholt", color: "bg-blue-100 text-blue-800 border-blue-300", dot: "bg-blue-500" },
  returned: { label: "Zurück", color: "bg-slate-100 text-slate-800 border-slate-300", dot: "bg-slate-500" },
  cancelled: { label: "Storniert", color: "bg-rose-100 text-rose-800 border-rose-300", dot: "bg-rose-500" },
  no_show: { label: "No-Show", color: "bg-purple-100 text-purple-800 border-purple-300", dot: "bg-purple-500" }
};

const BIKE_COLORS = [
  "bg-rose-500", "bg-orange-500", "bg-amber-500", "bg-lime-500", "bg-emerald-500",
  "bg-teal-500", "bg-cyan-500", "bg-sky-500", "bg-indigo-500", "bg-violet-500", "bg-fuchsia-500"
];

// ============ HOOKS ============
function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile(data);
    setLoading(false);
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  const signUp = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    });
    return { data, error };
  };

  const signOut = () => supabase.auth.signOut();

  return { user, profile, loading, signIn, signUp, signOut };
}

function useOrganization(userId) {
  const [organizations, setOrganizations] = useState([]);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    loadOrganizations();
  }, [userId]);

  const loadOrganizations = async () => {
    const { data } = await supabase
      .from("organization_members")
      .select(`
        role,
        organization:organizations(*)
      `)
      .eq("user_id", userId)
      .eq("status", "active");

    const orgs = data?.map(d => ({ ...d.organization, userRole: d.role })) || [];
    setOrganizations(orgs);

    // Auto-select first org or from localStorage
    const savedOrgId = localStorage.getItem("currentOrgId");
    const savedOrg = orgs.find(o => o.id === savedOrgId);
    setCurrentOrg(savedOrg || orgs[0] || null);
    setLoading(false);
  };

  const switchOrg = (orgId) => {
    const org = organizations.find(o => o.id === orgId);
    if (org) {
      setCurrentOrg(org);
      localStorage.setItem("currentOrgId", orgId);
    }
  };

  const createOrganization = async (name, slug) => {
    const { data: org, error } = await supabase
      .from("organizations")
      .insert({ name, slug })
      .select()
      .single();

    if (error) return { error };

    // Add creator as owner
    await supabase.from("organization_members").insert({
      organization_id: org.id,
      user_id: userId,
      role: "owner",
      status: "active",
      joined_at: new Date().toISOString()
    });

    await loadOrganizations();
    return { data: org };
  };

  return { organizations, currentOrg, loading, switchOrg, createOrganization, reload: loadOrganizations };
}

// ============ DATA HOOKS ============
function useBikes(orgId) {
  const [bikes, setBikes] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const { data } = await supabase
      .from("bikes")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: true });
    setBikes(data || []);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const create = async (bike) => {
    const { data, error } = await supabase
      .from("bikes")
      .insert({ ...bike, organization_id: orgId })
      .select()
      .single();
    if (!error) setBikes(prev => [...prev, data]);
    return { data, error };
  };

  const update = async (id, updates) => {
    const { data, error } = await supabase
      .from("bikes")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (!error) setBikes(prev => prev.map(b => b.id === id ? data : b));
    return { data, error };
  };

  const remove = async (id) => {
    const { error } = await supabase.from("bikes").delete().eq("id", id);
    if (!error) setBikes(prev => prev.filter(b => b.id !== id));
    return { error };
  };

  return { bikes, loading, reload: load, create, update, remove };
}

function useBookings(orgId) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const { data } = await supabase
      .from("bookings")
      .select("*, bike:bikes(*), customer:customers(*)")
      .eq("organization_id", orgId)
      .order("start_date", { ascending: false });
    setBookings(data || []);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const create = async (booking) => {
    const { data, error } = await supabase
      .from("bookings")
      .insert({ ...booking, organization_id: orgId })
      .select("*, bike:bikes(*), customer:customers(*)")
      .single();
    if (!error) setBookings(prev => [data, ...prev]);
    return { data, error };
  };

  const update = async (id, updates) => {
    const { data, error } = await supabase
      .from("bookings")
      .update(updates)
      .eq("id", id)
      .select("*, bike:bikes(*), customer:customers(*)")
      .single();
    if (!error) setBookings(prev => prev.map(b => b.id === id ? data : b));
    return { data, error };
  };

  const remove = async (id) => {
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (!error) setBookings(prev => prev.filter(b => b.id !== id));
    return { error };
  };

  return { bookings, loading, reload: load, create, update, remove };
}

function useCustomers(orgId) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const { data } = await supabase
      .from("customers")
      .select("*")
      .eq("organization_id", orgId)
      .order("last_name", { ascending: true });
    setCustomers(data || []);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const create = async (customer) => {
    const { data, error } = await supabase
      .from("customers")
      .insert({ ...customer, organization_id: orgId })
      .select()
      .single();
    if (!error) setCustomers(prev => [...prev, data]);
    return { data, error };
  };

  const update = async (id, updates) => {
    const { data, error } = await supabase
      .from("customers")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (!error) setCustomers(prev => prev.map(c => c.id === id ? data : c));
    return { data, error };
  };

  const remove = async (id) => {
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (!error) setCustomers(prev => prev.filter(c => c.id !== id));
    return { error };
  };

  return { customers, loading, reload: load, create, update, remove };
}

// ============ MAIN APP ============
export default function VeloRentSaaS() {
  const auth = useAuth();

  if (auth.loading) {
    return <LoadingScreen />;
  }

  if (!auth.user) {
    return <AuthPage auth={auth} />;
  }

  return (
    <AuthContext.Provider value={auth}>
      <AppWithOrg />
    </AuthContext.Provider>
  );
}

function AppWithOrg() {
  const auth = useContext(AuthContext);
  const org = useOrganization(auth.user?.id);

  if (org.loading) {
    return <LoadingScreen />;
  }

  if (!org.currentOrg) {
    return <OnboardingPage org={org} auth={auth} />;
  }

  return (
    <OrgContext.Provider value={org}>
      <MainApp />
    </OrgContext.Provider>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30 animate-pulse">
          <Bike className="w-8 h-8 text-white" />
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Laden...</span>
        </div>
      </div>
    </div>
  );
}

// ============ AUTH PAGE ============
function AuthPage({ auth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (mode === "login") {
      const { error } = await auth.signIn(email, password);
      if (error) setError(error.message);
    } else {
      const { error } = await auth.signUp(email, password, fullName);
      if (error) setError(error.message);
      else setSuccess("Registrierung erfolgreich! Bitte bestätige deine E-Mail.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Bike className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">VeloRent Pro</h1>
          <p className="text-slate-400 mt-2">Cloud-basierte Fahrradvermietung</p>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8">
          <h2 className="text-xl font-semibold text-white mb-6">
            {mode === "login" ? "Anmelden" : "Registrieren"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-colors"
                  placeholder="Max Mustermann"
                  required
                />
              </div>
            )}

            <div>
              <Input
                label="E-Mail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="max@example.com"
                required
              />
            </div>

            <div>
              <Input
                label="Passwort"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm">
                <XCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                {success}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
              isLoading={loading}
            >
              {mode === "login" ? "Anmelden" : "Registrieren"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setSuccess(""); }}
              className="text-orange-400 hover:text-orange-300 text-sm"
            >
              {mode === "login" ? "Noch kein Account? Jetzt registrieren" : "Bereits registriert? Anmelden"}
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          {[
            { icon: Shield, label: "Sicher" },
            { icon: Globe, label: "Cloud" },
            { icon: Users, label: "Multi-User" }
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl">
              <Icon className="w-5 h-5 text-orange-400 mx-auto mb-1" />
              <span className="text-xs text-slate-400">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ ONBOARDING PAGE ============
function OnboardingPage({ org, auth }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await org.createOrganization(name, slug);
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Building className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Willkommen bei VeloRent Pro!</h1>
          <p className="text-slate-400 mt-2">Erstelle dein Unternehmen, um loszulegen</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8">
          <form onSubmit={handleCreate} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Unternehmensname
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-"));
                }}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-orange-500 outline-none"
                placeholder="z.B. Hotel zur Post Fahrradverleih"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                URL-Kürzel (slug)
              </label>
              <div className="flex items-center">
                <span className="text-slate-500 text-sm mr-2">velorent.app/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-orange-500 outline-none"
                  placeholder="hotel-zur-post"
                  required
                  pattern="[a-z0-9-]+"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">Nur Kleinbuchstaben, Zahlen und Bindestriche</p>
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !name || !slug}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              Unternehmen erstellen
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800">
            <button
              onClick={() => auth.signOut()}
              className="w-full text-center text-slate-400 hover:text-white text-sm"
            >
              Mit anderem Account anmelden
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ MAIN APP ============
function MainApp() {
  const auth = useContext(AuthContext);
  const org = useContext(OrgContext);
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");

  // Data hooks
  const bikes = useBikes(org.currentOrg?.id);
  const bookings = useBookings(org.currentOrg?.id);
  const customers = useCustomers(org.currentOrg?.id);

  const navigation = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "calendar", label: "Kalender", icon: Calendar },
    { id: "bookings", label: "Buchungen", icon: FileText },
    { id: "fleet", label: "Flotte", icon: Bike },
    { id: "customers", label: "Kunden", icon: Users },
    { id: "analytics", label: "Statistiken", icon: BarChart3 },
    { id: "settings", label: "Einstellungen", icon: Settings }
  ];

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

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 ${sidebarOpen ? "w-64" : "w-20"} ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"} border-r`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className={`flex items-center gap-3 p-4 border-b ${darkMode ? "border-slate-800" : "border-slate-200"}`}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Bike className="w-6 h-6 text-white" />
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <h1 className="font-bold text-lg tracking-tight truncate">{org.currentOrg?.name || "VeloRent"}</h1>
                <p className={`text-xs truncate ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Pro Cloud</p>
              </div>
            )}
          </div>

          {/* Org Switcher */}
          {sidebarOpen && org.organizations.length > 1 && (
            <div className={`p-3 border-b ${darkMode ? "border-slate-800" : "border-slate-200"}`}>
              <select
                value={org.currentOrg?.id || ""}
                onChange={(e) => org.switchOrg(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg text-sm ${darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200"} border outline-none`}
              >
                {org.organizations.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navigation.map(item => (
              <Button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                variant="ghost"
                className={`w-full justify-start gap-3 ${currentPage === item.id
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25 hover:from-orange-600 hover:to-amber-600"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="font-medium">{item.label}</span>}
              </Button>
            ))}
          </nav>

          {/* User */}
          <div className={`p-3 border-t ${darkMode ? "border-slate-800" : "border-slate-200"}`}>
            {sidebarOpen ? (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-medium">
                  {auth.profile?.full_name?.charAt(0) || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{auth.profile?.full_name}</p>
                  <p className={`text-xs truncate ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                    {org.currentOrg?.userRole || "Member"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => auth.signOut()}
                  className="p-2"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => auth.signOut()}
                className="w-full justify-center p-2"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-20"}`}>
        {/* Header */}
        <header className={`sticky top-0 z-30 ${darkMode ? "bg-slate-900/80 border-slate-800" : "bg-white/80 border-slate-200"} backdrop-blur-xl border-b`}>
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={`p-2 rounded-lg ${darkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}
              >
                <Menu className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-semibold">
                {navigation.find(n => n.id === currentPage)?.label}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? "text-slate-500" : "text-slate-400"}`} />
                <input
                  type="text"
                  placeholder="Suchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-64 pl-10 pr-4 py-2 rounded-lg border outline-none transition-colors ${darkMode
                    ? "bg-slate-800 border-slate-700 text-white focus:border-orange-500"
                    : "bg-slate-50 border-slate-200 focus:border-orange-500"
                    }`}
                />
              </div>

              {/* Notifications */}
              <button className={`relative p-2 rounded-lg ${darkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}>
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>

              {/* Dark Mode */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg ${darkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {currentPage === "dashboard" && (
            <DashboardPage
              bikes={bikes}
              bookings={bookings}
              customers={customers}
              darkMode={darkMode}
              setCurrentPage={setCurrentPage}
            />
          )}
          {currentPage === "calendar" && (
            <CalendarPage
              bikes={bikes}
              bookings={bookings}
              customers={customers}
              darkMode={darkMode}
            />
          )}
          {currentPage === "bookings" && (
            <BookingsPage
              bikes={bikes}
              bookings={bookings}
              customers={customers}
              darkMode={darkMode}
              searchQuery={searchQuery}
            />
          )}
          {currentPage === "fleet" && (
            <FleetPage
              bikes={bikes}
              bookings={bookings}
              darkMode={darkMode}
              searchQuery={searchQuery}
            />
          )}
          {currentPage === "customers" && (
            <CustomersPage
              customers={customers}
              bookings={bookings}
              darkMode={darkMode}
              searchQuery={searchQuery}
            />
          )}
          {currentPage === "analytics" && (
            <AnalyticsPage
              bikes={bikes}
              bookings={bookings}
              customers={customers}
              darkMode={darkMode}
            />
          )}
          {currentPage === "settings" && (
            <SettingsPage
              org={org}
              auth={auth}
              darkMode={darkMode}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// ============ DASHBOARD PAGE ============
function DashboardPage({ bikes, bookings, customers, darkMode, setCurrentPage }) {
  const todayStr = fmtISO(new Date());

  const stats = useMemo(() => {
    const active = bookings.bookings.filter(b => ["reserved", "confirmed", "picked_up"].includes(b.status));
    const out = bookings.bookings.filter(b => b.status === "picked_up").length;
    const available = bikes.bikes.filter(b => b.status === "available").length - out;
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthRev = bookings.bookings
      .filter(b => new Date(b.start_date) >= monthStart && b.status !== "cancelled")
      .reduce((s, b) => s + (b.total_price || 0), 0);
    const todayPickups = bookings.bookings.filter(b => b.start_date === todayStr && ["reserved", "confirmed"].includes(b.status)).length;
    const todayReturns = bookings.bookings.filter(b => b.end_date === todayStr && b.status === "picked_up").length;

    return { active: active.length, out, available, monthRev, todayPickups, todayReturns };
  }, [bikes.bikes, bookings.bookings, todayStr]);

  const chartData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = addDays(new Date(), -i);
      const dateStr = fmtISO(d);
      const dayBookings = bookings.bookings.filter(b =>
        b.start_date <= dateStr && b.end_date >= dateStr && b.status !== "cancelled"
      );
      const revenue = dayBookings.reduce((s, b) => {
        const days = daysDiff(b.start_date, b.end_date);
        return s + (b.total_price || 0) / days;
      }, 0);
      days.push({ name: fmtDateShort(d), value: Math.round(revenue) });
    }
    return days;
  }, [bookings.bookings]);

  const cardStyle = darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";

  if (bookings.loading || bikes.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Aktive Buchungen" value={stats.active} icon={FileText} color="orange" darkMode={darkMode} />
        <StatCard title="Räder unterwegs" value={stats.out} subtitle={`${stats.available} verfügbar`} icon={Bike} color="blue" darkMode={darkMode} />
        <StatCard title="Umsatz (Monat)" value={fmtCurrency(stats.monthRev)} icon={Euro} color="emerald" darkMode={darkMode} />
        <StatCard title="Heute" value={`${stats.todayPickups} / ${stats.todayReturns}`} subtitle="Abholungen / Rückgaben" icon={Clock} color="violet" darkMode={darkMode} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className={`lg:col-span-2 rounded-2xl border p-6 ${cardStyle}`}>
          <h3 className="font-semibold text-lg mb-6">Umsatz (7 Tage)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#334155" : "#e2e8f0"} />
                <XAxis dataKey="name" stroke={darkMode ? "#64748b" : "#94a3b8"} fontSize={12} />
                <YAxis stroke={darkMode ? "#64748b" : "#94a3b8"} fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: darkMode ? "#1e293b" : "#fff",
                    border: `1px solid ${darkMode ? "#334155" : "#e2e8f0"}`,
                    borderRadius: "8px"
                  }}
                  formatter={(v) => [fmtCurrency(v), "Umsatz"]}
                />
                <Area type="monotone" dataKey="value" stroke="#f97316" strokeWidth={2} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fleet Status */}
        <div className={`rounded-2xl border p-6 ${cardStyle}`}>
          <h3 className="font-semibold text-lg mb-6">Flotte</h3>
          <div className="space-y-3">
            {bikes.bikes.slice(0, 5).map((bike, i) => {
              const isOut = bookings.bookings.some(b => b.bike_id === bike.id && b.status === "picked_up");
              return (
                <div key={bike.id} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${BIKE_COLORS[i % BIKE_COLORS.length]} flex items-center justify-center text-white text-sm font-bold`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{bike.name}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${isOut ? "bg-blue-100 text-blue-700" :
                    bike.status === "maintenance" ? "bg-amber-100 text-amber-700" :
                      "bg-emerald-100 text-emerald-700"
                    }`}>
                    {isOut ? "Unterwegs" : bike.status === "maintenance" ? "Wartung" : "Frei"}
                  </span>
                </div>
              );
            })}
          </div>
          <button onClick={() => setCurrentPage("fleet")} className="w-full mt-4 text-sm text-orange-500 hover:text-orange-400">
            Alle anzeigen →
          </button>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className={`rounded-2xl border p-6 ${cardStyle}`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-lg">Aktuelle Buchungen</h3>
          <button onClick={() => setCurrentPage("bookings")} className="text-sm text-orange-500 hover:text-orange-400">
            Alle anzeigen →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`text-left text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                <th className="pb-3">Kunde</th>
                <th className="pb-3">Rad</th>
                <th className="pb-3">Zeitraum</th>
                <th className="pb-3">Preis</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? "divide-slate-800" : "divide-slate-100"}`}>
              {bookings.bookings.slice(0, 5).map(b => {
                const bikeIdx = bikes.bikes.findIndex(x => x.id === b.bike_id);
                return (
                  <tr key={b.id} className={darkMode ? "hover:bg-slate-800/50" : "hover:bg-slate-50"}>
                    <td className="py-3">
                      <div className="font-medium">{b.customer_name}</div>
                      <div className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{b.customer_phone}</div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded ${BIKE_COLORS[bikeIdx % BIKE_COLORS.length]} flex items-center justify-center text-white text-xs font-bold`}>
                          {bikeIdx + 1}
                        </div>
                        <span className="text-sm">{b.bike?.name || "—"}</span>
                      </div>
                    </td>
                    <td className="py-3 text-sm">{fmtDate(b.start_date)} → {fmtDate(b.end_date)}</td>
                    <td className="py-3 font-medium">{fmtCurrency(b.total_price)}</td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-1 rounded-full border ${STATUS[b.status]?.color}`}>
                        {STATUS[b.status]?.label || b.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, color, darkMode }) {
  const colors = {
    orange: "from-orange-500 to-amber-500 shadow-orange-500/25",
    blue: "from-blue-500 to-cyan-500 shadow-blue-500/25",
    emerald: "from-emerald-500 to-teal-500 shadow-emerald-500/25",
    violet: "from-violet-500 to-purple-500 shadow-violet-500/25"
  };

  return (
    <Card className="p-5" hover>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && <p className={`text-xs mt-1 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color]} shadow-lg flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </Card>
  );
}

// ============ CALENDAR PAGE (Simplified) ============
function CalendarPage({ bikes, bookings, customers, darkMode }) {
  const [cursor, setCursor] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editBooking, setEditBooking] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  const matrix = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = addDays(first, -((first.getDay() + 6) % 7));
    const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
    const title = cursor.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
    return { days, title, midMonth: first.getMonth() };
  }, [cursor]);

  const bookingsByDay = useMemo(() => {
    const map = {};
    bookings.bookings.filter(b => b.status !== "cancelled").forEach(b => {
      const from = new Date(b.start_date), to = new Date(b.end_date);
      for (let d = new Date(from); d <= to; d = addDays(d, 1)) {
        const k = fmtISO(d);
        (map[k] || (map[k] = [])).push(b);
      }
    });
    return map;
  }, [bookings.bookings]);

  const cardStyle = darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
  const todayStr = fmtISO(new Date());

  const handleSave = async (data) => {
    if (editBooking) {
      await bookings.update(editBooking.id, data);
    } else {
      await bookings.create(data);
    }
    setShowModal(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
              <Button variant="ghost" size="sm" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-semibold min-w-[140px] text-center">{matrix.title}</span>
              <Button variant="ghost" size="sm" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
              Heute
            </Button>
          </div>
          <Button
            onClick={() => { setEditBooking(null); setSelectedDate(new Date()); setShowModal(true); }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Neue Buchung
          </Button>
        </div>
      </Card>

      {/* Calendar Grid */}
      <Card className="overflow-hidden p-0">
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map(d => (
            <div key={d} className="py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {matrix.days.map((day, i) => {
            const dateStr = fmtISO(day);
            const isToday = dateStr === todayStr;
            const isOther = day.getMonth() !== matrix.midMonth;
            const dayBookings = bookingsByDay[dateStr] || [];

            return (
              <div
                key={i}
                className={`min-h-[120px] p-2 border-b border-r border-slate-100 dark:border-slate-800/50 ${isOther ? "bg-slate-50/50 dark:bg-slate-900/30" : ""}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday ? "bg-brand-600 text-white shadow-glow" : isOther ? "text-slate-400 dark:text-slate-600" : "text-slate-700 dark:text-slate-300"}`}>
                    {day.getDate()}
                  </span>
                  <button
                    onClick={() => { setEditBooking(null); setSelectedDate(day); setShowModal(true); }}
                    className="opacity-0 hover:opacity-100 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-brand-500 transition-all"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <div className="space-y-1.5">
                  {dayBookings.slice(0, 3).map(b => {
                    const idx = bikes.bikes.findIndex(x => x.id === b.bike_id);
                    return (
                      <button
                        key={b.id}
                        onClick={() => { setEditBooking(b); setShowModal(true); }}
                        className={`w-full text-left px-1.5 py-0.5 rounded text-xs truncate ${BIKE_COLORS[idx % BIKE_COLORS.length]} text-white font-medium`}
                      >
                        {b.customer_name}
                      </button>
                    );
                  })}
                  {dayBookings.length > 2 && (
                    <span className="text-xs text-slate-500">+{dayBookings.length - 2}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Booking Modal */}
      {
        showModal && (
          <BookingModal
            booking={editBooking}
            initialDate={selectedDate}
            bikes={bikes.bikes}
            customers={customers.customers}
            existingBookings={bookings.bookings}
            onSave={handleSave}
            onDelete={async (id) => { await bookings.remove(id); setShowModal(false); }}
            onClose={() => setShowModal(false)}
            darkMode={darkMode}
          />
        )
      }
    </div >
  );
}

// ============ BOOKING MODAL ============
function BookingModal({ booking, initialDate, bikes, customers, existingBookings, onSave, onDelete, onClose, darkMode }) {
  const [form, setForm] = useState(() => {
    if (booking) return {
      bike_id: booking.bike_id,
      customer_id: booking.customer_id,
      customer_name: booking.customer_name,
      customer_phone: booking.customer_phone || "",
      customer_email: booking.customer_email || "",
      start_date: booking.start_date,
      end_date: booking.end_date,
      total_price: booking.total_price || 0,
      deposit_amount: booking.deposit_amount || 50,
      status: booking.status,
      notes: booking.notes || "",
      pickup_location: booking.pickup_location || "Laden",
      return_location: booking.return_location || "Laden"
    };
    return {
      bike_id: bikes[0]?.id || "",
      customer_id: "",
      customer_name: "",
      customer_phone: "",
      customer_email: "",
      start_date: initialDate ? fmtISO(initialDate) : fmtISO(new Date()),
      end_date: initialDate ? fmtISO(addDays(initialDate, 2)) : fmtISO(addDays(new Date(), 2)),
      total_price: 0,
      deposit_amount: 50,
      status: "reserved",
      notes: "",
      pickup_location: "Laden",
      return_location: "Laden"
    };
  });
  const [saving, setSaving] = useState(false);

  const selectedBike = bikes.find(b => b.id === form.bike_id);
  const days = form.start_date && form.end_date ? daysDiff(form.start_date, form.end_date) : 1;
  const calcPrice = selectedBike ? selectedBike.price_per_day * days : 0;

  useEffect(() => {
    setForm(f => ({ ...f, total_price: calcPrice }));
  }, [calcPrice]);

  const handleCustomerSelect = (id) => {
    const c = customers.find(x => x.id === id);
    if (c) {
      setForm(f => ({
        ...f,
        customer_id: id,
        customer_name: `${c.first_name || ""} ${c.last_name || ""}`.trim(),
        customer_phone: c.phone || "",
        customer_email: c.email || ""
      }));
    }
  };

  const handleSave = async () => {
    if (!form.customer_name || !form.start_date || !form.end_date) {
      alert("Bitte alle Pflichtfelder ausfüllen");
      return;
    }
    // Check conflicts
    const conflict = existingBookings.find(b =>
      b.id !== booking?.id &&
      b.bike_id === form.bike_id &&
      b.status !== "cancelled" &&
      new Date(b.start_date) <= new Date(form.end_date) &&
      new Date(b.end_date) >= new Date(form.start_date)
    );
    if (conflict) {
      alert("Dieses Rad ist im gewählten Zeitraum bereits gebucht!");
      return;
    }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const modalBg = darkMode ? "bg-slate-950" : "bg-white";
  const inputBaseStyle = "w-full px-3 py-2 rounded-lg border outline-none transition-all duration-200";
  const inputStyle = `${inputBaseStyle} ${darkMode ? "bg-slate-900 border-slate-800 focus:border-brand-500 text-white" : "bg-white border-slate-200 focus:border-brand-500"}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl ${modalBg} shadow-2xl border border-slate-200 dark:border-slate-800`}>
        <div className={`sticky top-0 flex items-center justify-between p-4 border-b ${darkMode ? "border-slate-800 bg-slate-950/95" : "border-slate-100 bg-white/95"} backdrop-blur`}>
          <h3 className="text-lg font-heading font-semibold">{booking ? "Buchung bearbeiten" : "Neue Buchung"}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-5">
          {/* Bike & Customer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Rad</label>
              <select value={form.bike_id} onChange={(e) => setForm(f => ({ ...f, bike_id: e.target.value }))} className={inputStyle}>
                {bikes.map((b, i) => (
                  <option key={b.id} value={b.id}>Rad {i + 1}: {b.name} - {fmtCurrency(b.price_per_day)}/Tag</option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Bestandskunde</label>
              <select value={form.customer_id} onChange={(e) => handleCustomerSelect(e.target.value)} className={inputStyle}>
                <option value="">— Neuer Kunde —</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Customer Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              label="Kundenname *"
              value={form.customer_name}
              onChange={(e) => setForm(f => ({ ...f, customer_name: e.target.value }))}
              placeholder="Max Mustermann"
            />
            <Input
              label="Telefon"
              type="tel"
              value={form.customer_phone}
              onChange={(e) => setForm(f => ({ ...f, customer_phone: e.target.value }))}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              label="Von *"
              type="date"
              value={form.start_date}
              onChange={(e) => setForm(f => ({ ...f, start_date: e.target.value }))}
            />
            <Input
              label="Bis *"
              type="date"
              value={form.end_date}
              onChange={(e) => setForm(f => ({ ...f, end_date: e.target.value }))}
            />
          </div>

          {/* Price & Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Tage: {days}</label>
              <div className={`px-3 py-2.5 rounded-lg border ${darkMode ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
                {selectedBike ? fmtCurrency(selectedBike.price_per_day) : "—"}/Tag
              </div>
            </div>
            <Input
              label="Gesamtpreis"
              type="number"
              value={form.total_price}
              onChange={(e) => setForm(f => ({ ...f, total_price: Number(e.target.value) }))}
            />
            <Input
              label="Kaution"
              type="number"
              value={form.deposit_amount}
              onChange={(e) => setForm(f => ({ ...f, deposit_amount: Number(e.target.value) }))}
            />
          </div>

          {/* Status */}
          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Status</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(STATUS).map(([key, { label, color }]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, status: key }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border transition-all ${form.status === key
                    ? `${color} ring-2 ring-brand-500 ring-offset-2 ${darkMode ? "ring-offset-slate-950" : "ring-offset-white"}`
                    : darkMode ? "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Notizen</label>
            <textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={inputStyle} />
          </div>
        </div>

        {/* Footer */}
        <div className={`sticky bottom-0 flex items-center justify-between p-4 border-t ${darkMode ? "border-slate-800 bg-slate-950/95" : "border-slate-100 bg-white/95"} backdrop-blur`}>
          <div>
            {booking && (
              <Button
                variant="danger"
                onClick={() => { if (confirm("Wirklich löschen?")) onDelete(booking.id); }}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Löschen
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onClose}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} isLoading={saving} className="gap-2">
              Speichern
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ BOOKINGS PAGE ============
function BookingsPage({ bikes, bookings, customers, darkMode, searchQuery }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editBooking, setEditBooking] = useState(null);

  const filtered = useMemo(() => {
    return bookings.bookings
      .filter(b => statusFilter === "all" || b.status === statusFilter)
      .filter(b => searchQuery === "" || b.customer_name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [bookings.bookings, statusFilter, searchQuery]);

  const handleSave = async (data) => {
    if (editBooking) await bookings.update(editBooking.id, data);
    else await bookings.create(data);
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            {["all", ...Object.keys(STATUS)].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${statusFilter === s
                  ? "bg-brand-600 text-white shadow-lg shadow-brand-500/25"
                  : darkMode ? "text-slate-400 hover:bg-slate-800 hover:text-slate-200" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
              >
                {s === "all" ? "Alle" : STATUS[s]?.label}
              </button>
            ))}
          </div>
          <Button
            onClick={() => { setEditBooking(null); setShowModal(true); }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Neue Buchung
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden p-0">
        {bookings.loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`border-b ${darkMode ? "bg-slate-900/50 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                <tr className={`text-left text-xs font-bold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                  <th className="px-6 py-4">Nr.</th>
                  <th className="px-6 py-4">Kunde</th>
                  <th className="px-6 py-4">Rad</th>
                  <th className="px-6 py-4">Zeitraum</th>
                  <th className="px-6 py-4">Preis</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Aktionen</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? "divide-slate-800" : "divide-slate-100"}`}>
                {filtered.map(b => {
                  const bikeIdx = bikes.bikes.findIndex(x => x.id === b.bike_id);
                  return (
                    <tr key={b.id} className={`transition-colors ${darkMode ? "hover:bg-slate-800/30" : "hover:bg-slate-50"}`}>
                      <td className="px-6 py-4 font-mono text-sm opacity-60">{b.booking_number}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium">{b.customer_name}</div>
                        <div className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{b.customer_phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg ${BIKE_COLORS[bikeIdx % BIKE_COLORS.length]} flex items-center justify-center text-white text-xs font-bold shadow-md`}>
                            {bikeIdx + 1}
                          </div>
                          <span className="text-sm font-medium">{b.bike?.name || "—"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{fmtDate(b.start_date)} → {fmtDate(b.end_date)}</td>
                      <td className="px-6 py-4 font-medium text-brand-500">{fmtCurrency(b.total_price)}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS[b.status]?.color}`}>
                          {STATUS[b.status]?.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setEditBooking(b); setShowModal(true); }}
                        >
                          Bearbeiten
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                Keine Buchungen gefunden
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Booking Modal */}
      {showModal && (
        <BookingModal
          booking={editBooking}
          bikes={bikes.bikes}
          customers={customers.customers}
          existingBookings={bookings.bookings}
          onSave={handleSave}
          onDelete={async (id) => { await bookings.remove(id); setShowModal(false); }}
          onClose={() => setShowModal(false)}
          darkMode={darkMode}
        />
      )}
    </div>
  );


  // ============ FLEET PAGE ============
  // ============ FLEET PAGE ============
  function FleetPage({ bikes, bookings, darkMode, searchQuery }) {
    const [showModal, setShowModal] = useState(false);
    const [editBike, setEditBike] = useState(null);

    const filtered = useMemo(() => {
      return bikes.bikes.filter(b =>
        searchQuery === "" ||
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.frame_number?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }, [bikes.bikes, searchQuery]);

    const handleSave = async (data) => {
      if (editBike) await bikes.update(editBike.id, data);
      else await bikes.create(data);
      setShowModal(false);
    };

    return (
      <div className="space-y-6">
        {/* Header */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
              {filtered.length} Räder
            </span>
            <Button
              onClick={() => { setEditBike(null); setShowModal(true); }}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Neues Rad
            </Button>
          </div>
        </Card>

        {/* Grid */}
        {bikes.loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(bike => {
              const isOut = bookings.bookings.some(b => b.bike_id === bike.id && b.status === "picked_up");
              const isMaint = bike.status === "maintenance";
              const statusColor = isMaint ? "bg-rose-500" : isOut ? "bg-blue-500" : "bg-emerald-500";
              const statusText = isMaint ? "Wartung" : isOut ? "Vermietet" : "Verfügbar";

              return (
                <Card key={bike.id} className="p-0 overflow-hidden group hover:border-brand-500/50 transition-all duration-300">
                  <div className={`h-32 ${darkMode ? "bg-slate-900" : "bg-slate-100"} relative p-4 flex items-start justify-between`}>
                    <div className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider text-white ${statusColor} shadow-lg shadow-black/10`}>
                      {statusText}
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditBike(bike); setShowModal(true); }}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
                      <h3 className="text-white font-bold text-lg truncate">{bike.name}</h3>
                      <p className="text-white/80 text-xs font-mono">{bike.frame_number}</p>
                    </div>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Kategorie</div>
                        <div className="font-medium">{bike.category}</div>
                      </div>
                      <div>
                        <div className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Größe</div>
                        <div className="font-medium">{bike.size}</div>
                      </div>
                      <div>
                        <div className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Akku</div>
                        <div className="font-medium">{bike.battery}</div>
                      </div>
                      <div>
                        <div className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Motor</div>
                        <div className="font-medium">{bike.motor}</div>
                      </div>
                    </div>
                    <div className={`pt-4 border-t ${darkMode ? "border-slate-800" : "border-slate-100"} flex items-center justify-between`}>
                      <div className="font-bold text-lg text-brand-500">
                        {fmtCurrency(bike.price_per_day)}<span className="text-xs text-slate-500 font-normal">/Tag</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          const newStatus = bike.status === "maintenance" ? "available" : "maintenance";
                          await bikes.update(bike.id, { status: newStatus });
                        }}
                        className={bike.status === "maintenance" ? "text-emerald-500 hover:text-emerald-400" : "text-rose-500 hover:text-rose-400"}
                      >
                        {bike.status === "maintenance" ? "Freigeben" : "Wartung"}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Bike Modal */}
        {showModal && (
          <BikeModal
            bike={editBike}
            onSave={handleSave}
            onDelete={async (id) => { await bikes.remove(id); setShowModal(false); }}
            onClose={() => setShowModal(false)}
            darkMode={darkMode}
          />
        )}
      </div>
    );
  }

  function BikeModal({ bike, onSave, onDelete, onClose, darkMode }) {
    const [form, setForm] = useState(() => bike || {
      name: "",
      category: "E-Bike",
      size: "M",
      price_per_day: 35,
      deposit: 50,
      battery: "500Wh",
      motor: "Mittelmotor",
      color: "Schwarz",
      frame_number: `FR${Date.now().toString().slice(-6)}`,
      status: "available"
    });
    const [saving, setSaving] = useState(false);

    const modalBg = darkMode ? "bg-slate-900" : "bg-white";

    const handleSave = async () => {
      setSaving(true);
      await onSave(form);
      setSaving(false);
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className={`w-full max-w-lg rounded-2xl ${modalBg} shadow-2xl border ${darkMode ? "border-slate-800" : "border-slate-200"}`}>
          <div className={`flex items-center justify-between p-4 border-b ${darkMode ? "border-slate-800" : "border-slate-200"}`}>
            <h3 className="text-lg font-semibold">{bike ? "Rad bearbeiten" : "Neues Rad"}</h3>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Input
                  label="Name"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="City E-Bike Premium"
                  darkMode={darkMode}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Kategorie</label>
                <div className="relative">
                  <select
                    value={form.category}
                    onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                    className={`w-full px-3 py-2 rounded-lg border outline-none appearance-none transition-all ${darkMode
                      ? "bg-slate-950 border-slate-800 text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                      : "bg-white border-slate-200 text-slate-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                      }`}
                  >
                    <option>E-Bike</option>
                    <option>E-MTB</option>
                    <option>Lastenrad</option>
                    <option>Kinder</option>
                    <option>Bio</option>
                    <option>E-Scooter</option>
                  </select>
                  <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${darkMode ? "text-slate-500" : "text-slate-400"}`} />
                </div>
              </div>
              <div>
                <Input
                  label="Größe"
                  value={form.size}
                  onChange={(e) => setForm(f => ({ ...f, size: e.target.value }))}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <Input
                  label="Preis/Tag (€)"
                  type="number"
                  value={form.price_per_day}
                  onChange={(e) => setForm(f => ({ ...f, price_per_day: Number(e.target.value) }))}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <Input
                  label="Farbe"
                  value={form.color}
                  onChange={(e) => setForm(f => ({ ...f, color: e.target.value }))}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <Input
                  label="Akku"
                  value={form.battery}
                  onChange={(e) => setForm(f => ({ ...f, battery: e.target.value }))}
                  placeholder="625Wh"
                  darkMode={darkMode}
                />
              </div>
              <div>
                <Input
                  label="Motor"
                  value={form.motor}
                  onChange={(e) => setForm(f => ({ ...f, motor: e.target.value }))}
                  darkMode={darkMode}
                />
              </div>
              <div className="col-span-2">
                <Input
                  label="Rahmennummer"
                  value={form.frame_number}
                  onChange={(e) => setForm(f => ({ ...f, frame_number: e.target.value }))}
                  darkMode={darkMode}
                />
              </div>
            </div>
          </div>

          <div className={`flex items-center justify-between p-4 border-t ${darkMode ? "border-slate-800" : "border-slate-200"}`}>
            <div>
              {bike && (
                <Button variant="danger" variantType="ghost" onClick={() => { if (confirm("Rad löschen?")) onDelete(bike.id); }}>
                  Löschen
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
              <Button onClick={handleSave} isLoading={saving}>
                Speichern
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============ CUSTOMERS PAGE ============
  function CustomersPage({ customers, bookings, darkMode, searchQuery }) {
    const [showModal, setShowModal] = useState(false);
    const [editCustomer, setEditCustomer] = useState(null);

    const filtered = useMemo(() => {
      return customers.customers
        .filter(c =>
          searchQuery === "" ||
          `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.email?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0));
    }, [customers.customers, searchQuery]);

    const handleSave = async (data) => {
      if (editCustomer) await customers.update(editCustomer.id, data);
      else await customers.create(data);
      setShowModal(false);
    };

    return (
      <div className="space-y-6">
        {/* Header */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
              {filtered.length} Kunden
            </span>
            <Button
              onClick={() => { setEditCustomer(null); setShowModal(true); }}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Neuer Kunde
            </Button>
          </div>
        </Card>

        {/* Grid */}
        {customers.loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(c => (
              <Card key={c.id} className="p-5 hover:border-brand-500/50 transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-brand-500/25">
                      {(c.first_name || c.last_name || "?").charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold">{c.first_name} {c.last_name}</h3>
                      <p className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                        {c.total_bookings || 0} Buchungen
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setEditCustomer(c); setShowModal(true); }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>

                <div className={`space-y-3 text-sm ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                  {c.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 opacity-50" />
                      <span className="truncate">{c.email}</span>
                    </div>
                  )}
                  {c.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 opacity-50" />
                      <span>{c.phone}</span>
                    </div>
                  )}
                </div>

                <div className={`flex items-center justify-between mt-4 pt-4 border-t ${darkMode ? "border-slate-800" : "border-slate-100"}`}>
                  <span className={`text-xs font-medium ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Gesamtumsatz</span>
                  <span className="font-bold text-brand-500">{fmtCurrency(c.total_revenue || 0)}</span>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Customer Modal */}
        {showModal && (
          <CustomerModal
            customer={editCustomer}
            onSave={handleSave}
            onDelete={async (id) => { await customers.remove(id); setShowModal(false); }}
            onClose={() => setShowModal(false)}
            darkMode={darkMode}
          />
        )}
      </div>
    );
  }


  function CustomerModal({ customer, onSave, onDelete, onClose, darkMode }) {
    const [form, setForm] = useState(() => customer || {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      postal_code: "",
      id_number: "",
      notes: ""
    });
    const [saving, setSaving] = useState(false);

    const modalBg = darkMode ? "bg-slate-900" : "bg-white";

    const handleSave = async () => {
      setSaving(true);
      await onSave(form);
      setSaving(false);
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className={`w-full max-w-lg rounded-2xl ${modalBg} shadow-2xl border ${darkMode ? "border-slate-800" : "border-slate-200"}`}>
          <div className={`flex items-center justify-between p-4 border-b ${darkMode ? "border-slate-800" : "border-slate-200"}`}>
            <h3 className="text-lg font-semibold">{customer ? "Kunde bearbeiten" : "Neuer Kunde"}</h3>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  label="Vorname"
                  value={form.first_name}
                  onChange={(e) => setForm(f => ({ ...f, first_name: e.target.value }))}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <Input
                  label="Nachname"
                  value={form.last_name}
                  onChange={(e) => setForm(f => ({ ...f, last_name: e.target.value }))}
                  darkMode={darkMode}
                />
              </div>
              <div className="col-span-2">
                <Input
                  label="E-Mail"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  icon={Mail}
                  darkMode={darkMode}
                />
              </div>
              <div className="col-span-2">
                <Input
                  label="Telefon"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                  icon={Phone}
                  darkMode={darkMode}
                />
              </div>
              <div className="col-span-2">
                <Input
                  label="Adresse"
                  value={form.address}
                  onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <Input
                  label="PLZ"
                  value={form.postal_code}
                  onChange={(e) => setForm(f => ({ ...f, postal_code: e.target.value }))}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <Input
                  label="Stadt"
                  value={form.city}
                  onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))}
                  darkMode={darkMode}
                />
              </div>
              <div className="col-span-2">
                <Input
                  label="Ausweis-Nr."
                  value={form.id_number}
                  onChange={(e) => setForm(f => ({ ...f, id_number: e.target.value }))}
                  darkMode={darkMode}
                />
              </div>
              <div className="col-span-2">
                <label className={`block text-xs font-medium mb-1.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Notizen</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className={`w-full px-3 py-2 rounded-lg border outline-none transition-all ${darkMode
                    ? "bg-slate-950 border-slate-800 text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    : "bg-white border-slate-200 text-slate-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    }`}
                />
              </div>
            </div>
          </div>

          <div className={`flex items-center justify-between p-4 border-t ${darkMode ? "border-slate-800" : "border-slate-200"}`}>
            <div>
              {customer && (
                <Button variant="danger" variantType="ghost" onClick={() => { if (confirm("Kunde löschen?")) onDelete(customer.id); }}>
                  Löschen
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
              <Button onClick={handleSave} isLoading={saving}>
                Speichern
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }



  // ============ ANALYTICS PAGE ============
  function AnalyticsPage({ bikes, bookings, customers, darkMode }) {
    const monthlyData = useMemo(() => {
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const monthBookings = bookings.bookings.filter(b =>
          b.status !== "cancelled" &&
          new Date(b.start_date) >= monthStart &&
          new Date(b.start_date) <= monthEnd
        );
        months.push({
          name: d.toLocaleDateString("de-DE", { month: "short" }),
          revenue: monthBookings.reduce((s, b) => s + (b.total_price || 0), 0),
          bookings: monthBookings.length
        });
      }
      return months;
    }, [bookings.bookings]);

    const bikeStats = useMemo(() => {
      return bikes.bikes.map((bike, i) => {
        const bikeBookings = bookings.bookings.filter(b => b.bike_id === bike.id && b.status !== "cancelled");
        const totalDays = bikeBookings.reduce((s, b) => s + daysDiff(b.start_date, b.end_date), 0);
        const revenue = bikeBookings.reduce((s, b) => s + (b.total_price || 0), 0);
        return { name: `Rad ${i + 1}`, fullName: bike.name, days: totalDays, revenue, bookings: bikeBookings.length };
      }).sort((a, b) => b.revenue - a.revenue);
    }, [bikes.bikes, bookings.bookings]);

    const statusDist = useMemo(() => {
      const dist = {};
      Object.keys(STATUS).forEach(s => { dist[s] = 0; });
      bookings.bookings.forEach(b => { dist[b.status] = (dist[b.status] || 0) + 1; });
      return Object.entries(dist).map(([k, v]) => ({
        name: STATUS[k]?.label || k,
        value: v,
        color: k === "reserved" ? "#f59e0b" : k === "confirmed" ? "#10b981" : k === "picked_up" ? "#3b82f6" : k === "returned" ? "#64748b" : "#e11d48"
      }));
    }, [bookings.bookings]);

    return (
      <div className="space-y-6">
        {/* Revenue Chart */}
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-6">Umsatz & Buchungen (6 Monate)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#334155" : "#e2e8f0"} />
                <XAxis dataKey="name" stroke={darkMode ? "#64748b" : "#94a3b8"} />
                <YAxis yAxisId="left" stroke={darkMode ? "#64748b" : "#94a3b8"} />
                <YAxis yAxisId="right" orientation="right" stroke={darkMode ? "#64748b" : "#94a3b8"} />
                <Tooltip contentStyle={{ backgroundColor: darkMode ? "#1e293b" : "#fff", border: "1px solid #334155", borderRadius: "8px" }} />
                <Bar yAxisId="left" dataKey="revenue" name="Umsatz (€)" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="bookings" name="Buchungen" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bike Stats */}
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-6">Rad-Auslastung (Top 5)</h3>
            <div className="space-y-4">
              {bikeStats.slice(0, 5).map((b, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1 text-sm">
                    <span>{b.name}</span>
                    <span className="text-orange-500 font-medium">{fmtCurrency(b.revenue)}</span>
                  </div>
                  <div className={`h-2 rounded-full ${darkMode ? "bg-slate-800" : "bg-slate-200"}`}>
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500"
                      style={{ width: `${Math.min(100, (b.revenue / (bikeStats[0]?.revenue || 1)) * 100)}%` }}
                    />
                  </div>
                  <p className={`text-xs mt-1 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                    {b.bookings} Buchungen • {b.days} Tage
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* Status Distribution */}
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-6">Status-Verteilung</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusDist} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                    {statusDist.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {statusDist.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-600"}`}>{s.name} ({s.value})</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ============ SETTINGS PAGE ============
  function SettingsPage({ org, auth, darkMode }) {
    const [form, setForm] = useState(org.currentOrg || {});
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = async () => {
      setSaving(true);
      await supabase.from("organizations").update({
        name: form.name,
        address: form.address,
        city: form.city,
        postal_code: form.postal_code,
        phone: form.phone,
        email: form.email,
        tax_id: form.tax_id
      }).eq("id", org.currentOrg.id);
      org.reload();
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    };

    return (
      <div className="max-w-3xl space-y-6">
        {/* Company Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <Building className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Firmendaten</h3>
              <p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Diese Daten erscheinen auf Verträgen & Rechnungen</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Input
                label="Firmenname"
                value={form.name || ""}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                darkMode={darkMode}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  label="Adresse"
                  value={form.address || ""}
                  onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <Input
                  label="Stadt"
                  value={form.city || ""}
                  onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))}
                  darkMode={darkMode}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  label="Telefon"
                  type="tel"
                  value={form.phone || ""}
                  onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                  darkMode={darkMode}
                />
              </div>
              <div>
                <Input
                  label="E-Mail"
                  type="email"
                  value={form.email || ""}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  darkMode={darkMode}
                />
              </div>
            </div>
            <div>
              <Input
                label="USt-IdNr."
                value={form.tax_id || ""}
                onChange={(e) => setForm(f => ({ ...f, tax_id: e.target.value }))}
                darkMode={darkMode}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <Button onClick={handleSave} isLoading={saving} className="gap-2">
              Speichern
            </Button>
            {saved && <span className="text-emerald-500 flex items-center gap-1"><Check className="w-4 h-4" /> Gespeichert!</span>}
          </div>
        </Card>

        {/* API Key Info */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Key className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">API & Integrationen</h3>
              <p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Für externe Buchungssysteme</p>
            </div>
          </div>
          <div className={`p-4 rounded-lg ${darkMode ? "bg-slate-800" : "bg-slate-100"}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Organisation ID</p>
                <p className={`text-xs font-mono ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{org.currentOrg?.id}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigator.clipboard.writeText(org.currentOrg?.id || "")}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <p className={`text-xs mt-3 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
            Nutze diese ID für API-Integrationen mit Booking.com, deiner Website oder anderen Systemen.
          </p>
        </Card>

        {/* Subscription Info */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Abo & Abrechnung</h3>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium capitalize">{org.currentOrg?.subscription_tier || "Free"} Plan</p>
              <p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                Status: {org.currentOrg?.subscription_status === "active" ? "Aktiv" : "Inaktiv"}
              </p>
            </div>
            <Button className="bg-gradient-to-r from-violet-500 to-purple-500 border-none">
              Upgrade
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  function StatCard({ title, value, subtitle, icon: Icon, color, darkMode }) {
    const colors = {
      orange: "from-orange-500 to-amber-500 shadow-orange-500/25",
      blue: "from-blue-500 to-cyan-500 shadow-blue-500/25",
      emerald: "from-emerald-500 to-teal-500 shadow-emerald-500/25",
      violet: "from-violet-500 to-purple-500 shadow-violet-500/25",
    };

    return (
      <Card className="p-6 hover:border-brand-500/50 transition-all duration-300">
        <div className="flex items-start justify-between">
          <div>
            <p className={`text-sm font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{title}</p>
            <h3 className="text-2xl font-bold mt-2">{value}</h3>
            {subtitle && (
              <p className={`text-xs mt-1 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-xl bg-gradient-to-br ${colors[color] || colors.orange} shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </Card>
    );
  }
