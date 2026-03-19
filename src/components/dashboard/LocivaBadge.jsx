"use client";

import { Globe, CheckCircle2, AlertCircle } from "lucide-react";

/**
 * Shows whether the provider is listed on the Lociva marketplace.
 * "Listed" = organization has stripe_account_id AND stripe_verified AND
 * appears in at least one hotel_providers mapping.
 *
 * For now we derive status from org fields only (hotel_providers check
 * would require an extra query. Can be added later).
 */
export default function LocivaBadge({ org, darkMode }) {
    const stripeReady = !!org?.stripe_account_id && !!org?.stripe_verified;

    // Three states: fully listed, partially set up, not connected
    if (stripeReady) {
        return (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                darkMode
                    ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
                    : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
            }`}>
                <Globe className="w-3.5 h-3.5" />
                <span>Auf Lociva gelistet</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
        );
    }

    if (org?.stripe_account_id && !org?.stripe_verified) {
        return (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                darkMode
                    ? "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20"
                    : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
            }`}>
                <Globe className="w-3.5 h-3.5" />
                <span>Lociva. Verifizierung ausstehend.</span>
            </div>
        );
    }

    return (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
            darkMode
                ? "bg-slate-800 text-slate-500 ring-1 ring-slate-700"
                : "bg-slate-100 text-slate-400 ring-1 ring-slate-200"
        }`}>
            <Globe className="w-3.5 h-3.5" />
            <span>Nicht auf Lociva</span>
            <AlertCircle className="w-3.5 h-3.5" />
        </div>
    );
}
