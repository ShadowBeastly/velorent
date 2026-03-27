"use client";
import { useState, useEffect, useMemo } from "react";
import { useApp } from "@/src/context/AppContext";
import { supabase } from "@/src/utils/supabase";
import { BarChart3, TrendingUp, Euro, MousePointerClick, Building2, Users } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const PERIODS = [
  { label: "Heute", days: 0 },
  { label: "7 Tage", days: 7 },
  { label: "30 Tage", days: 30 },
  { label: "90 Tage", days: 90 },
  { label: "Gesamt", days: null },
];

function StatCard({ icon: Icon, label, value, sub, darkMode }) {
  return (
    <div className={`rounded-xl border p-5 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${darkMode ? "bg-[#1A7D5A]/20" : "bg-[#D4EDE2]"}`}>
          <Icon className="w-5 h-5 text-[#1A7D5A]" />
        </div>
        <span className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className={`text-xs mt-1 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{sub}</p>}
    </div>
  );
}

function formatEur(n) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n || 0);
}

const CHART_COLORS = ["#1A7D5A", "#3BAA82", "#5BC4A0", "#7DD8B8", "#A0E8D0", "#C4F4E4"];

function ChartTooltip({ active, payload, label, darkMode }) {
  if (!active || !payload?.length) return null;
  return (
    <div className={`rounded-lg border px-3 py-2 shadow-lg text-xs ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === "number" && p.name.includes("msatz") ? formatEur(p.value) : p.value}</p>
      ))}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const { darkMode } = useApp();
  const [period, setPeriod] = useState(2);
  const [events, setEvents] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  const card = darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const axisColor = darkMode ? "#64748b" : "#94a3b8";
  const gridColor = darkMode ? "#1e293b" : "#f1f5f9";

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { days } = PERIODS[period];
      let startDate = null;
      if (days === 0) { startDate = new Date(); startDate.setHours(0, 0, 0, 0); }
      else if (days) { startDate = new Date(Date.now() - days * 86400000); }

      const evQuery = supabase.from("analytics_events").select("event_type, hotel_id, hotels(name), created_at");
      const bkQuery = supabase.from("bookings").select("booking_number, total_price, platform_commission, status, created_at, hotels(name), hotel_id, bike:bikes(name)").not("hotel_id", "is", null).order("created_at", { ascending: false }).limit(50);
      const htQuery = supabase.from("hotels").select("id, name, is_active");
      const pvQuery = supabase.from("organizations").select("id, name, is_platform_provider, stripe_charges_enabled").eq("is_platform_provider", true);

      if (startDate) {
        evQuery.gte("created_at", startDate.toISOString());
        bkQuery.gte("created_at", startDate.toISOString());
      }

      const [{ data: evData }, { data: bkData }, { data: htData }, { data: pvData }] = await Promise.all([evQuery, bkQuery, htQuery, pvQuery]);
      setEvents(evData || []);
      setBookings(bkData || []);
      setHotels(htData || []);
      setProviders(pvData || []);
      setLoading(false);
    }
    load();
  }, [period]);

  const qrScans = events.filter(e => e.event_type === "qr_scan").length;
  const pageViews = events.filter(e => e.event_type === "page_view").length;
  const bookingStarts = events.filter(e => e.event_type === "booking_start").length;
  const bookingCompletes = events.filter(e => e.event_type === "booking_complete").length;
  const totalRevenue = bookings.reduce((s, b) => s + (b.total_price || 0), 0);
  const totalCommission = bookings.reduce((s, b) => s + (b.platform_commission || 0), 0);
  const conversionRate = qrScans > 0 ? ((bookingCompletes / qrScans) * 100).toFixed(1) : "0.0";

  // Bookings over time (area chart)
  const bookingsByDay = useMemo(() => {
    const map = {};
    bookings.forEach(b => {
      const day = new Date(b.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
      if (!map[day]) map[day] = { day, bookings: 0, revenue: 0, commission: 0 };
      map[day].bookings += 1;
      map[day].revenue += b.total_price || 0;
      map[day].commission += b.platform_commission || 0;
    });
    return Object.values(map).reverse();
  }, [bookings]);

  // Events by hotel (bar chart)
  const eventsByHotel = useMemo(() => {
    const map = {};
    events.forEach(e => {
      const name = e.hotels?.name || "Unbekannt";
      if (!map[name]) map[name] = { hotel: name, scans: 0, views: 0, bookings: 0 };
      if (e.event_type === "qr_scan") map[name].scans += 1;
      else if (e.event_type === "page_view") map[name].views += 1;
      else if (e.event_type === "booking_complete") map[name].bookings += 1;
    });
    return Object.values(map).sort((a, b) => (b.scans + b.views + b.bookings) - (a.scans + a.views + a.bookings)).slice(0, 8);
  }, [events]);

  // Revenue by hotel (pie chart)
  const revenueByHotel = useMemo(() => {
    const map = {};
    bookings.forEach(b => {
      const name = b.hotels?.name || "Direkt";
      map[name] = (map[name] || 0) + (b.total_price || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [bookings]);

  // Funnel data
  const funnelSteps = [
    { label: "QR Scans", val: qrScans },
    { label: "Seitenaufrufe", val: pageViews },
    { label: "Buchung gestartet", val: bookingStarts },
    { label: "Abgeschlossen", val: bookingCompletes },
  ];

  const statusBadge = (status) => ({
    reserved: darkMode ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600",
    confirmed: "bg-blue-900/40 text-blue-400",
    picked_up: "bg-yellow-900/40 text-yellow-400",
    returned: "bg-green-900/40 text-green-400",
    cancelled: "bg-red-900/40 text-red-400",
  }[status] || (darkMode ? "bg-slate-700 text-slate-400" : "bg-slate-100 text-slate-500"));

  const renderTooltip = (props) => <ChartTooltip {...props} darkMode={darkMode} />;

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${darkMode ? "bg-[#1A7D5A]/20" : "bg-[#D4EDE2]"}`}>
              <BarChart3 className="w-5 h-5 text-[#1A7D5A]" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Plattform-Analytics</h2>
          </div>
          <div className="flex gap-1">
            {PERIODS.map((p, i) => (
              <button key={i} onClick={() => setPeriod(i)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${period === i ? "bg-[#1A7D5A] text-white" : darkMode ? "text-slate-400 hover:text-white hover:bg-slate-700" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-[#1A7D5A] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <StatCard icon={MousePointerClick} label="QR-Scans" value={qrScans} sub={`${pageViews} Seitenaufrufe`} darkMode={darkMode} />
              <StatCard icon={TrendingUp} label="Buchungen" value={bookings.length} sub={`${conversionRate}% Conversion`} darkMode={darkMode} />
              <StatCard icon={Euro} label="Umsatz (brutto)" value={formatEur(totalRevenue)} darkMode={darkMode} />
              <StatCard icon={BarChart3} label="Provision" value={formatEur(totalCommission)} sub="Plattform-Einnahmen" darkMode={darkMode} />
              <StatCard icon={Building2} label="Hotels" value={hotels.filter(h => h.is_active).length} sub={`${hotels.length} gesamt`} darkMode={darkMode} />
              <StatCard icon={Users} label="Anbieter" value={providers.length} sub={`${providers.filter(p => p.stripe_charges_enabled).length} Stripe aktiv`} darkMode={darkMode} />
            </div>

            {/* Funnel */}
            <div className={`border rounded-xl p-5 mb-6 ${card}`}>
              <h2 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Conversion Funnel</h2>
              <div className="flex items-center gap-4 flex-wrap">
                {funnelSteps.map((step, i, arr) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="text-center min-w-[80px]">
                      <p className={`text-2xl font-bold ${i === arr.length - 1 ? "text-[#3BAA82]" : ""}`}>{step.val}</p>
                      <p className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{step.label}</p>
                      {i > 0 && arr[i - 1].val > 0 && (
                        <p className="text-xs text-[#3BAA82] font-medium">{((step.val / arr[i - 1].val) * 100).toFixed(0)}%</p>
                      )}
                    </div>
                    {i < arr.length - 1 && <span className={`text-xl ${darkMode ? "text-slate-600" : "text-slate-300"}`}>→</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              {/* Bookings over time */}
              <div className={`border rounded-xl p-5 ${card}`}>
                <h2 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Buchungen & Umsatz (Verlauf)</h2>
                {bookingsByDay.length === 0 ? (
                  <p className={`text-sm py-8 text-center ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Keine Daten im Zeitraum</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={bookingsByDay}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1A7D5A" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#1A7D5A" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: axisColor }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11, fill: axisColor }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: axisColor }} tickFormatter={(v) => `${v}`} />
                      <Tooltip content={renderTooltip} />
                      <Area yAxisId="left" type="monotone" dataKey="revenue" name="Umsatz" stroke="#1A7D5A" fill="url(#colorRevenue)" strokeWidth={2} />
                      <Bar yAxisId="right" dataKey="bookings" name="Buchungen" fill="#3BAA82" radius={[4, 4, 0, 0]} barSize={20} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Events by hotel */}
              <div className={`border rounded-xl p-5 ${card}`}>
                <h2 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Events nach Hotel</h2>
                {eventsByHotel.length === 0 ? (
                  <p className={`text-sm py-8 text-center ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Keine Events im Zeitraum</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={eventsByHotel} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: axisColor }} />
                      <YAxis type="category" dataKey="hotel" tick={{ fontSize: 11, fill: axisColor }} width={120} />
                      <Tooltip content={renderTooltip} />
                      <Bar dataKey="scans" name="QR-Scans" fill="#1A7D5A" stackId="a" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="views" name="Seitenaufrufe" fill="#3BAA82" stackId="a" />
                      <Bar dataKey="bookings" name="Buchungen" fill="#5BC4A0" stackId="a" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Revenue pie + summary */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className={`border rounded-xl p-5 ${card}`}>
                <h2 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Umsatz nach Hotel</h2>
                {revenueByHotel.length === 0 ? (
                  <p className={`text-sm py-8 text-center ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Keine Daten</p>
                ) : (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="50%" height={200}>
                      <PieChart>
                        <Pie data={revenueByHotel} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                          {revenueByHotel.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => formatEur(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2">
                      {revenueByHotel.map((entry, i) => (
                        <div key={entry.name} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className={`text-xs flex-1 truncate ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{entry.name}</span>
                          <span className="text-xs font-semibold">{formatEur(entry.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className={`border rounded-xl p-5 ${card}`}>
                <h2 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Finanz-Ubersicht</h2>
                <div className="space-y-3">
                  {[
                    { label: "Buchungen gesamt", val: bookings.length.toString() },
                    { label: "Umsatz brutto", val: formatEur(totalRevenue) },
                    { label: "Plattform-Provision", val: formatEur(totalCommission) },
                    { label: "Netto an Anbieter", val: formatEur(totalRevenue - totalCommission) },
                    { label: "Avg. Buchungswert", val: formatEur(bookings.length > 0 ? totalRevenue / bookings.length : 0) },
                    { label: "Avg. Provision/Buchung", val: formatEur(bookings.length > 0 ? totalCommission / bookings.length : 0) },
                  ].map(({ label, val }) => (
                    <div key={label} className={`flex justify-between border-b pb-2 ${darkMode ? "border-slate-700" : "border-slate-100"}`}>
                      <span className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{label}</span>
                      <span className="text-sm font-semibold">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent bookings table */}
            <div className={`border rounded-xl overflow-hidden ${card}`}>
              <div className={`px-5 py-4 border-b ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
                <h2 className={`text-xs font-semibold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Letzte Plattform-Buchungen</h2>
              </div>
              {bookings.length === 0 ? (
                <div className="text-center py-12"><p className={darkMode ? "text-slate-500" : "text-slate-400"}>Keine Buchungen im Zeitraum</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className={`border-b ${darkMode ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-slate-50"}`}>
                      <tr>
                        {["Buchungs-Nr.", "Hotel", "Angebot", "Betrag", "Provision", "Status"].map(h => (
                          <th key={h} className={`text-left px-4 py-3 text-xs font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map(b => (
                        <tr key={b.booking_number} className={`border-b last:border-0 ${darkMode ? "border-slate-700 hover:bg-slate-700/30" : "border-slate-100 hover:bg-slate-50"}`}>
                          <td className="px-4 py-3 font-mono text-xs text-[#3BAA82]">{b.booking_number}</td>
                          <td className="px-4 py-3 text-sm">{b.hotels?.name || ""}</td>
                          <td className="px-4 py-3 text-sm">{b.bike?.name || ""}</td>
                          <td className="px-4 py-3 text-sm font-semibold">{formatEur(b.total_price)}</td>
                          <td className="px-4 py-3 text-sm text-[#3BAA82]">{formatEur(b.platform_commission)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(b.status)}`}>{b.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
    </div>
  );
}
