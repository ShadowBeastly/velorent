"use client";
import { useState, useEffect } from "react";
import { useApp } from "@/src/context/AppContext";
import { supabase } from "@/src/utils/supabase";
import { BarChart3, TrendingUp, Euro, MousePointerClick } from "lucide-react";

const PERIODS = [
  { label: "Heute", days: 0 },
  { label: "7 Tage", days: 7 },
  { label: "30 Tage", days: 30 },
  { label: "Gesamt", days: null },
];

function StatCard({ icon: Icon, label, value, sub, darkMode }) {
  return (
    <div className={`rounded-xl border p-5 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${darkMode ? "bg-indigo-900/40" : "bg-indigo-50"}`}>
          <Icon className="w-5 h-5 text-indigo-500" />
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

export default function AdminAnalyticsPage() {
  const { darkMode } = useApp();
  const [period, setPeriod] = useState(1);
  const [events, setEvents] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const card = darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { days } = PERIODS[period];
      let startDate = null;
      if (days === 0) { startDate = new Date(); startDate.setHours(0, 0, 0, 0); }
      else if (days) { startDate = new Date(Date.now() - days * 86400000); }

      const evQuery = supabase.from("analytics_events").select("event_type, hotel_id, hotels(name), created_at");
      const bkQuery = supabase.from("bookings").select("booking_number, total_price, platform_commission, status, created_at, hotels(name), bike:bikes(name)").eq("booking_source", "hotel_qr").order("created_at", { ascending: false }).limit(30);

      if (startDate) {
        evQuery.gte("created_at", startDate.toISOString());
        bkQuery.gte("created_at", startDate.toISOString());
      }

      const [{ data: evData }, { data: bkData }] = await Promise.all([evQuery, bkQuery]);
      setEvents(evData || []);
      setBookings(bkData || []);
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

  const byHotel = {};
  events.forEach(e => { const name = e.hotels?.name || "Unbekannt"; byHotel[name] = (byHotel[name] || 0) + 1; });
  const topHotels = Object.entries(byHotel).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const statusBadge = (status) => ({ reserved: "bg-slate-700 text-slate-300", confirmed: "bg-blue-900/40 text-blue-400", picked_up: "bg-yellow-900/40 text-yellow-400", returned: "bg-green-900/40 text-green-400", cancelled: "bg-red-900/40 text-red-400" }[status] || "bg-slate-700 text-slate-400");

  return (
    <div className={`min-h-screen p-6 ${darkMode ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-900"}`}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BarChart3 className={`w-7 h-7 ${darkMode ? "text-indigo-400" : "text-indigo-600"}`} />
            <h1 className="text-2xl font-bold">Plattform-Analytics</h1>
          </div>
          <div className="flex gap-1">
            {PERIODS.map((p, i) => (
              <button key={i} onClick={() => setPeriod(i)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${period === i ? "bg-indigo-600 text-white" : darkMode ? "text-slate-400 hover:text-white hover:bg-slate-700" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard icon={MousePointerClick} label="QR-Scans" value={qrScans} sub={`${pageViews} Seitenaufrufe`} darkMode={darkMode} />
              <StatCard icon={TrendingUp} label="Buchungen" value={bookings.length} sub={`${conversionRate}% Conversion`} darkMode={darkMode} />
              <StatCard icon={Euro} label="Umsatz (brutto)" value={formatEur(totalRevenue)} darkMode={darkMode} />
              <StatCard icon={BarChart3} label="Provision (5%)" value={formatEur(totalCommission)} sub="Plattform-Einnahmen" darkMode={darkMode} />
            </div>

            {/* Funnel */}
            <div className={`border rounded-xl p-5 mb-6 ${card}`}>
              <h2 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Conversion Funnel</h2>
              <div className="flex items-center gap-3 flex-wrap">
                {[{ label: "QR Scans", val: qrScans }, { label: "Seitenaufrufe", val: pageViews }, { label: "Buchung gestartet", val: bookingStarts }, { label: "Buchung abgeschlossen", val: bookingCompletes }].map((step, i, arr) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="text-center">
                      <p className={`text-2xl font-bold ${i === arr.length - 1 ? "text-green-400" : ""}`}>{step.val}</p>
                      <p className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{step.label}</p>
                    </div>
                    {i < arr.length - 1 && <span className={`text-xl ${darkMode ? "text-slate-600" : "text-slate-300"}`}>→</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className={`border rounded-xl p-5 ${card}`}>
                <h2 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Top Hotels (Events)</h2>
                {topHotels.length === 0 ? (
                  <p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>Keine Daten</p>
                ) : topHotels.map(([name, count]) => (
                  <div key={name} className="flex justify-between items-center py-2">
                    <span className="text-sm">{name}</span>
                    <span className={`text-sm font-semibold ${darkMode ? "text-indigo-400" : "text-indigo-600"}`}>{count} Events</span>
                  </div>
                ))}
              </div>
              <div className={`border rounded-xl p-5 ${card}`}>
                <h2 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Buchungs-Übersicht</h2>
                <div className="space-y-3">
                  {[{ label: "Buchungen gesamt", val: bookings.length }, { label: "Umsatz brutto", val: formatEur(totalRevenue) }, { label: "Plattform-Provision (5%)", val: formatEur(totalCommission) }, { label: "Netto an Anbieter (95%)", val: formatEur(totalRevenue - totalCommission) }].map(({ label, val }) => (
                    <div key={label} className={`flex justify-between border-b pb-2 ${darkMode ? "border-slate-700" : "border-slate-100"}`}>
                      <span className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{label}</span>
                      <span className="text-sm font-semibold">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={`border rounded-xl overflow-hidden ${card}`}>
              <div className={`px-5 py-4 border-b ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
                <h2 className={`text-xs font-semibold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Letzte Plattform-Buchungen</h2>
              </div>
              {bookings.length === 0 ? (
                <div className="text-center py-12"><p className={darkMode ? "text-slate-500" : "text-slate-400"}>Keine Buchungen im gewählten Zeitraum</p></div>
              ) : (
                <table className="w-full text-sm">
                  <thead className={`border-b ${darkMode ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-slate-50"}`}>
                    <tr>
                      {["Buchungs-Nr.", "Hotel", "Fahrrad", "Betrag", "Provision", "Status"].map(h => (
                        <th key={h} className={`text-left px-4 py-3 text-xs font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map(b => (
                      <tr key={b.booking_number} className={`border-b last:border-0 ${darkMode ? "border-slate-700 hover:bg-slate-700/30" : "border-slate-100 hover:bg-slate-50"}`}>
                        <td className="px-4 py-3 font-mono text-xs text-indigo-400">{b.booking_number}</td>
                        <td className="px-4 py-3 text-sm">{b.hotels?.name || "–"}</td>
                        <td className="px-4 py-3 text-sm">{b.bike?.name || "–"}</td>
                        <td className="px-4 py-3 text-sm font-semibold">{formatEur(b.total_price)}</td>
                        <td className="px-4 py-3 text-sm text-indigo-400">{formatEur(b.platform_commission)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(b.status)}`}>{b.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
