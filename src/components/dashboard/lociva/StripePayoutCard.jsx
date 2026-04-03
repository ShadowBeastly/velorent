"use client";

import { useMemo } from "react";
import { Wallet, ExternalLink, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { fmtCurrency } from "../../../utils/formatters";

export default function StripePayoutCard({ bookings = [], org, darkMode }) {
    const stripeConnected = !!org?.stripe_account_id;
    const stripeVerified = !!org?.stripe_verified;

    // Calculate payout summary from bookings with Stripe data
    const stats = useMemo(() => {
        const paidBookings = bookings.filter(
            b => b.stripe_payment_intent_id && b.status !== "cancelled"
        );

        const totalVolume = paidBookings.reduce(
            (sum, b) => sum + (Number(b.total_price) || 0), 0
        );
        const totalCommission = paidBookings.reduce(
            (sum, b) => sum + (Number(b.platform_commission) || 0), 0
        );
        const totalHotelCommission = paidBookings.reduce(
            (sum, b) => sum + (Number(b.hotel_commission) || 0), 0
        );
        const netPayout = totalVolume - totalCommission - totalHotelCommission;

        const pendingBookings = paidBookings.filter(
            b => !b.stripe_transfer_id
        );
        const pendingAmount = pendingBookings.reduce(
            (sum, b) => sum + (Number(b.total_price) || 0) - (Number(b.platform_commission) || 0) - (Number(b.hotel_commission) || 0), 0
        );

        return {
            count: paidBookings.length,
            totalVolume,
            totalCommission,
            netPayout,
            pendingCount: pendingBookings.length,
            pendingAmount,
        };
    }, [bookings]);

    return (
        <div className="premium-card p-6 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                            Stripe Auszahlungen
                        </h3>
                        <p className={`text-xs font-medium ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                            {stats.count} Online-Zahlungen
                        </p>
                    </div>
                </div>
            </div>

            {/* Connection status */}
            {!stripeConnected ? (
                <div className={`rounded-xl border-2 border-dashed p-6 text-center ${darkMode ? "border-slate-700" : "border-slate-200"}`}>
                    <AlertCircle className={`w-8 h-8 mx-auto mb-2 ${darkMode ? "text-slate-500" : "text-slate-400"}`} />
                    <p className={`text-sm font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                        Stripe Connect nicht verbunden
                    </p>
                    <p className={`text-xs mt-1 ${darkMode ? "text-slate-600" : "text-slate-400"}`}>
                        Verbinden Sie Stripe unter Einstellungen, um Online-Zahlungen zu empfangen.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Stripe account status */}
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                        stripeVerified
                            ? darkMode ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-700"
                            : darkMode ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-700"
                    }`}>
                        {stripeVerified
                            ? <><CheckCircle2 className="w-4 h-4" /> Stripe verifiziert. Auszahlungen aktiv.</>

                            : <><Clock className="w-4 h-4" /> Stripe-Verifizierung ausstehend</>
                        }
                    </div>

                    {/* Payout stats grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className={`rounded-xl p-4 ${darkMode ? "bg-slate-800" : "bg-slate-50"}`}>
                            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                Gesamtumsatz
                            </p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                                {fmtCurrency(stats.totalVolume)}
                            </p>
                        </div>
                        <div className={`rounded-xl p-4 ${darkMode ? "bg-slate-800" : "bg-slate-50"}`}>
                            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                Netto-Auszahlung
                            </p>
                            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                {fmtCurrency(stats.netPayout)}
                            </p>
                        </div>
                        <div className={`rounded-xl p-4 ${darkMode ? "bg-slate-800" : "bg-slate-50"}`}>
                            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                Plattform-Provision
                            </p>
                            <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                                {fmtCurrency(stats.totalCommission)}
                            </p>
                        </div>
                        <div className={`rounded-xl p-4 ${darkMode ? "bg-slate-800" : "bg-slate-50"}`}>
                            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                                Ausstehend
                            </p>
                            <p className="text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                                {stats.pendingCount > 0
                                    ? `${fmtCurrency(stats.pendingAmount)} (${stats.pendingCount})`
                                    : fmtCurrency(0)
                                }
                            </p>
                        </div>
                    </div>

                    {/* Stripe Dashboard link */}
                    <a
                        href="https://dashboard.stripe.com/connect/transfers"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                            darkMode
                                ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                    >
                        <ExternalLink className="w-4 h-4" />
                        Stripe Dashboard öffnen
                    </a>
                </div>
            )}
        </div>
    );
}
