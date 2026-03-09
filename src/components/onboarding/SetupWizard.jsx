"use client";
import { useState } from "react";
import {
  Bike, Building, Plus, Check, ChevronRight, ChevronLeft,
  Loader2, Sparkles, Calendar, Globe
} from "lucide-react";

// ============ ONBOARDING WIZARD ============
export default function OnboardingWizard({ supabase, user, onComplete }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Organization
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");

  // Step 2: First Bikes
  const [bikes, setBikes] = useState([
    { name: "", category: "E-Bike", price: 35 }
  ]);

  // Step 3: Settings
  const [settings, setSettings] = useState({
    enableWidget: false,
    enableEmails: true
  });



  const handleCreateOrg = async () => {
    if (!orgName || !orgSlug) return;

    setLoading(true);
    setError("");

    try {
      // Create organization
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: orgName,
          slug: orgSlug.toLowerCase().replace(/[^a-z0-9-]/g, "")
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Add user as owner
      await supabase.from("organization_members").insert({
        organization_id: org.id,
        user_id: user.id,
        role: "owner",
        status: "active",
        joined_at: new Date().toISOString()
      });

      // Create public booking settings
      await supabase.from("public_booking_settings").insert({
        organization_id: org.id,
        is_enabled: settings.enableWidget
      });

      // Add bikes
      const validBikes = bikes.filter(b => b.name.trim());
      if (validBikes.length > 0) {
        await supabase.from("bikes").insert(
          validBikes.map(b => ({
            organization_id: org.id,
            name: b.name,
            category: b.category,
            price_per_day: b.price,
            status: "available"
          }))
        );
      }

      // Send welcome email
      if (settings.enableEmails) {
        try {
          await supabase.functions.invoke("send-email", {
            body: {
              type: "welcome",
              to: user.email,
              data: {
                name: user.user_metadata?.full_name || user.email.split("@")[0],
                dashboard_url: window.location.origin
              }
            }
          });
        } catch {
          console.log("Email sending failed, but continuing...");
        }
      }

      onComplete(org);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addBike = () => {
    if (bikes.length < 5) {
      setBikes([...bikes, { name: "", category: "E-Bike", price: 35 }]);
    }
  };

  const updateBike = (index, field, value) => {
    const updated = [...bikes];
    updated[index][field] = value;
    setBikes(updated);
  };

  const removeBike = (index) => {
    if (bikes.length > 1) {
      setBikes(bikes.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Willkommen bei VeloRent Pro!</h1>
          <p className="text-slate-400">Richten Sie Ihren Fahrradverleih in wenigen Schritten ein</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${step >= s
                    ? "bg-gradient-to-br from-orange-500 to-amber-500 text-white"
                    : "bg-slate-800 text-slate-500"
                  }`}>
                  {step > s ? <Check className="w-5 h-5" /> : s}
                </div>
                {s < 3 && (
                  <div className={`w-24 h-1 mx-2 rounded-full transition-all ${step > s ? "bg-gradient-to-r from-orange-500 to-amber-500" : "bg-slate-800"
                    }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-slate-500 px-2">
            <span>Unternehmen</span>
            <span>Fahrräder</span>
            <span>Fertig</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden">

          {/* Step 1: Organization */}
          {step === 1 && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                  <Building className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Ihr Unternehmen</h2>
                  <p className="text-sm text-slate-400">Wie heißt Ihr Fahrradverleih?</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Unternehmensname *
                  </label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => {
                      setOrgName(e.target.value);
                      setOrgSlug(e.target.value.toLowerCase()
                        .replace(/[äöüß]/g, c => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' }[c]))
                        .replace(/[^a-z0-9]/g, "-")
                        .replace(/-+/g, "-")
                        .replace(/^-|-$/g, "")
                      );
                    }}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-orange-500 outline-none"
                    placeholder="z.B. Hotel Alpenblick Fahrradverleih"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    URL-Kürzel (für Online-Buchung)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-sm">velorent.de/</span>
                    <input
                      type="text"
                      value={orgSlug}
                      onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-orange-500 outline-none"
                      placeholder="hotel-alpenblick"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Bikes */}
          {step === 2 && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                  <Bike className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Ihre Fahrräder</h2>
                  <p className="text-sm text-slate-400">Fügen Sie Ihre ersten Räder hinzu (optional)</p>
                </div>
              </div>

              <div className="space-y-4">
                {bikes.map((bike, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={bike.name}
                        onChange={(e) => updateBike(index, "name", e.target.value)}
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-orange-500 outline-none"
                        placeholder="z.B. City E-Bike"
                      />
                    </div>
                    <select
                      value={bike.category}
                      onChange={(e) => updateBike(index, "category", e.target.value)}
                      className="px-3 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-orange-500 outline-none"
                    >
                      <option>E-Bike</option>
                      <option>E-MTB</option>
                      <option>Lastenrad</option>
                      <option>Kinder</option>
                      <option>Bio</option>
                    </select>
                    <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-xl px-3">
                      <input
                        type="number"
                        value={bike.price}
                        onChange={(e) => updateBike(index, "price", parseInt(e.target.value) || 0)}
                        className="w-16 py-3 bg-transparent text-white outline-none text-center"
                      />
                      <span className="text-slate-500">€</span>
                    </div>
                    {bikes.length > 1 && (
                      <button
                        onClick={() => removeBike(index)}
                        className="p-3 text-slate-500 hover:text-red-400"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}

                {bikes.length < 5 && (
                  <button
                    onClick={addBike}
                    className="flex items-center gap-2 text-orange-400 hover:text-orange-300 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Weiteres Rad hinzufügen
                  </button>
                )}

                <p className="text-xs text-slate-500 mt-4">
                  💡 Sie können später beliebig viele Räder hinzufügen
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Final Settings */}
          {step === 3 && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Fast geschafft!</h2>
                  <p className="text-sm text-slate-400">Noch ein paar Einstellungen</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl cursor-pointer hover:bg-slate-800 transition-colors">
                  <input
                    type="checkbox"
                    checked={settings.enableWidget}
                    onChange={(e) => setSettings({ ...settings, enableWidget: e.target.checked })}
                    className="w-5 h-5 rounded accent-orange-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-white font-medium">
                      <Globe className="w-4 h-4 text-orange-400" />
                      Online-Buchungswidget aktivieren
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      Kunden können direkt auf Ihrer Website buchen
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl cursor-pointer hover:bg-slate-800 transition-colors">
                  <input
                    type="checkbox"
                    checked={settings.enableEmails}
                    onChange={(e) => setSettings({ ...settings, enableEmails: e.target.checked })}
                    className="w-5 h-5 rounded accent-orange-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-white font-medium">
                      <Calendar className="w-4 h-4 text-orange-400" />
                      E-Mail-Benachrichtigungen
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      Erhalten Sie E-Mails bei neuen Buchungen
                    </p>
                  </div>
                </label>
              </div>

              {/* Summary */}
              <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <h3 className="text-emerald-400 font-semibold mb-2">✓ Zusammenfassung</h3>
                <ul className="text-sm text-emerald-300/80 space-y-1">
                  <li>• Unternehmen: <strong>{orgName || "—"}</strong></li>
                  <li>• Fahrräder: <strong>{bikes.filter(b => b.name.trim()).length || "Keine"}</strong></li>
                  <li>• Online-Widget: <strong>{settings.enableWidget ? "Aktiv" : "Deaktiviert"}</strong></li>
                </ul>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mx-8 mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between p-6 border-t border-slate-800">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white"
              >
                <ChevronLeft className="w-4 h-4" />
                Zurück
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && (!orgName || !orgSlug)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Weiter
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleCreateOrg}
                disabled={loading || !orgName || !orgSlug}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Wird erstellt...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Los geht&apos;s!
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Skip Option */}
        <p className="text-center mt-6 text-slate-500 text-sm">
          Sie können alle Einstellungen später ändern
        </p>
      </div>
    </div>
  );
}
