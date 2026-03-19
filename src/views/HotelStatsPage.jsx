"use client";
import { useState, useEffect } from "react";
import { useApp } from "@/src/context/AppContext";
import { useAuth } from "@/src/context/AuthContext";
import { supabase } from "@/src/utils/supabase";
import { Building2, Copy, Check, QrCode, TrendingUp, Euro, BarChart2, MousePointerClick } from "lucide-react";

const PERIODS = [
  { label: "Heute", days: 0 },
  { label: "7 Tage", days: 7 },
  { label: "30 Tage", days: 30 },
  { label: "Gesamt", days: null },
];

function formatEur(n) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n || 0);
}

const STATUS_BADGE = { reserved: "bg-slate-700 text-slate-300", confirmed: "bg-blue-900/40 text-blue-400", picked_up: "bg-yellow-900/40 text-yellow-400", returned: "bg-green-900/40 text-green-400", cancelled: "bg-red-900/40 text-red-400" };

export default function HotelStatsPage() {
  const { darkMode } = useApp();
  const { user } = useAuth();
  const [period, setPeriod] = useState(2);
  const [hotelUser, setHotelUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noHotel, setNoHotel] = useState(false);
  const [copied, setCopied] = useState(false);

  const card = darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const th = `text-left px-4 py-3 text-xs font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`;

  useEffect(() => {
    async function loadHotelUser() {
      if (!user?.id) return;
      const { data } = await supabase.from("hotel_users").select("hotel_id, hotels(id, name, slug, address, commission_pct)").eq("user_id", user.id).single();
      if (!data) { setNoHotel(true); setLoading(false); return; }
      setHotelUser(data);
    }
    loadHotelUser();
  }, [user]);

  useEffect(() => {
    if (!hotelUser?.hotel_id) return;
    async function loadData() {
      setLoading(true);
      const { days } = PERIODS[period];
      let startDate = null;
      if (days === 0) { startDate = new Date(); startDate.setHours(0, 0, 0, 0); }
      else if (days) { startDate = new Date(Date.now() - days * 86400000); }

      const evQ = supabase.from("analytics_events").select("event_type, created_at").eq("hotel_id", hotelUser.hotel_id);
      const bkQ = supabase.from("bookings").select("booking_number, total_price, hotel_commission, status, created_at, guest_name, start_date, end_date, bike:bikes(name)").eq("hotel_id", hotelUser.hotel_id).eq("booking_source", "hotel_qr").order("created_at", { ascending: false }).limit(50);

      if (startDate) { evQ.gte("created_at", startDate.toISOString()); bkQ.gte("created_at", startDate.toISOString()); }

      const [{ data: evData }, { data: bkData }] = await Promise.all([evQ, bkQ]);
      setEvents(evData || []);
      setBookings(bkData || []);
      setLoading(false);
    }
    loadData();
  }, [hotelUser, period]);

  function copyLink() {
    if (!hotelUser?.hotels?.slug) return;
    const url = `${window.location.origin}/hotel/${hotelUser.hotels.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const hotel = hotelUser?.hotels;
  const qrScans = events.filter(e => e.event_type === "qr_scan").length;
  const pageViews = events.filter(e => e.event_type === "page_view").length;
  const bookingStarts = events.filter(e => e.event_type === "booking_start").length;
  const bookingCompletes = events.filter(e => e.event_type === "booking_complete").length;
  const totalRevenue = bookings.reduce((s, b) => s + (b.total_price || 0), 0);
  const totalCommission = bookings.reduce((s, b) => s + (b.hotel_commission || 0), 0);

  if (noHotel) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 ${darkMode ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-900"}`}>
        <div className="text-center max-w-md">
          <Building2 className={`w-16 h-16 mx-auto mb-4 ${darkMode ? "text-slate-600" : "text-slate-300"}`} />
          <h1 className="text-xl font-bold mb-2">Kein Hotel zugeordnet</h1>
          <p className={darkMode ? "text-slate-400" : "text-slate-500"}>Ihr Account ist noch keinem Hotel zugeordnet. Bitte kontaktieren Sie den Support unter <span className="text-[#3BAA82]">info@lociva.de</span>.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 ${darkMode ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-900"}`}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Building2 className={`w-7 h-7 ${darkMode ? "text-[#3BAA82]" : "text-[#1A7D5A]"}`} />
            <div>
              <h1 className="text-2xl font-bold">Hotel Dashboard</h1>
              {hotel && <p className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{hotel.name}</p>}
            </div>
          </div>
          {/* Period selector */}
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
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className={`grid grid-cols-2 ${hotel?.commission_pct > 0 ? "md:grid-cols-4" : "md:grid-cols-3"} gap-4 mb-8`}>
              {[
                { icon: MousePointerClick, label: "QR-Scans", value: qrScans, sub: `${pageViews} Seitenaufrufe` },
                { icon: TrendingUp, label: "Buchungen", value: bookings.length, sub: `${bookingCompletes} abgeschlossen` },
                { icon: Euro, label: "Buchungsvolumen", value: formatEur(totalRevenue), sub: "über Ihren QR-Code" },
                ...(hotel?.commission_pct > 0 ? [{ icon: BarChart2, label: `Ihre Provision (${hotel.commission_pct}%)`, value: formatEur(totalCommission) }] : []),
              ].map(({ icon: Icon, label, value, sub }) => (
                <div key={label} className={`rounded-xl border p-5 ${card}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${darkMode ? "bg-[#1A7D5A]/20" : "bg-[#D4EDE2]"}`}>
                      <Icon className="w-5 h-5 text-[#1A7D5A]" />
                    </div>
                    <span className={`text-sm ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{label}</span>
                  </div>
                  <p className="text-2xl font-bold">{value}</p>
                  {sub && <p className={`text-xs mt-1 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{sub}</p>}
                </div>
              ))}
            </div>

            {/* Funnel */}
            <div className={`border rounded-xl p-5 mb-6 ${card}`}>
              <h2 className={`text-xs font-semibold uppercase tracking-wider mb-4 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Buchungs-Funnel</h2>
              <div className="flex items-center gap-4 flex-wrap">
                {[{ label: "QR Scans", val: qrScans }, { label: "Seitenaufrufe", val: pageViews }, { label: "Buchungen gestartet", val: bookingStarts }, { label: "Buchungen abgeschlossen", val: bookingCompletes }].map((step, i, arr) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="text-center">
                      <p className={`text-2xl font-bold ${i === arr.length - 1 ? "text-green-400" : ""}`}>{step.val}</p>
                      <p className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{step.label}</p>
                    </div>
                    {i < arr.length - 1 && <span className={`text-xl ${darkMode ? "text-slate-600" : "text-slate-300"}`}>→</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* QR Code Section */}
            {hotel && (
              <div className={`border rounded-xl p-5 mb-6 ${card}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${darkMode ? "bg-slate-700" : "bg-slate-100"}`}>
                    <QrCode className={`w-5 h-5 ${darkMode ? "text-slate-300" : "text-slate-600"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold mb-1">Ihr Buchungslink</h2>
                    <p className={`text-sm font-mono truncate mb-2 ${darkMode ? "text-[#3BAA82]" : "text-[#1A7D5A]"}`}>
                      {typeof window !== "undefined" ? window.location.origin : "https://lociva.de"}/hotel/{hotel.slug}
                    </p>
                    <p className={`text-xs mb-3 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                      Erstellen Sie einen QR-Code aus diesem Link und platzieren Sie ihn in Ihren Zimmern und an der Rezeption.
                    </p>
                    <button onClick={copyLink} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${darkMode ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"}`}>
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      {copied ? "Kopiert!" : "Link kopieren"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Bookings Table */}
            <div className={`border rounded-xl overflow-hidden ${card}`}>
              <div className={`px-5 py-4 border-b ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
                <h2 className={`text-xs font-semibold uppercase tracking-wider ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Buchungen über Ihren QR-Code</h2>
              </div>
              {bookings.length === 0 ? (
                <div className="text-center py-12">
                  <p className={darkMode ? "text-slate-500" : "text-slate-400"}>Noch keine Buchungen über Ihren QR-Code</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className={`border-b ${darkMode ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-slate-50"}`}>
                    <tr>
                      {["Datum", "Fahrrad", "Gast", "Zeitraum", "Betrag", "Status"].map(h => <th key={h} className={th}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map(b => (
                      <tr key={b.booking_number} className={`border-b last:border-0 ${darkMode ? "border-slate-700 hover:bg-slate-700/30" : "border-slate-100 hover:bg-slate-50"}`}>
                        <td className="px-4 py-3 text-xs text-slate-400">{new Date(b.created_at).toLocaleDateString("de-DE")}</td>
                        <td className="px-4 py-3">{b.bike?.name || "–"}</td>
                        <td className="px-4 py-3 text-sm">{b.guest_name || "–"}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">{b.start_date} – {b.end_date}</td>
                        <td className="px-4 py-3 font-semibold">{formatEur(b.total_price)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[b.status] || "bg-slate-700 text-slate-400"}`}>{b.status}</span>
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
