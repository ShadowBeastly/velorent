"use client";
import { useState } from "react";
import {
  Bike, Building, Plus, Check, ChevronRight, ChevronLeft,
  Loader2, Sparkles, Calendar, Globe
} from "lucide-react";

// ============ ONBOARDING WIZARD ============
export default function SetupWizard({ supabase, user, onComplete }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Organization
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");

  // Step 2: First Items
  const [itemType, setItemType] = useState("rental");
  const [items, setItems] = useState([
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

      // Add items
      const validItems = items.filter(i => i.name.trim());
      if (validItems.length > 0) {
        await supabase.from("items").insert(
          validItems.map(i => ({
            organization_id: org.id,
            name: i.name,
            category: i.category || null,
            price_per_day: i.price || null,
            item_type: itemType,
            status: "available",
            ...(itemType === "experience" && i.capacity ? { capacity: parseInt(i.capacity) } : {})
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
          // Silently ignore. Email failure must not block onboarding
        }
      }

      onComplete(org);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    if (items.length < 5) {
      setItems([...items, { name: "", category: itemType === "rental" ? "E-Bike" : "", price: itemType === "rental" ? 35 : 0 }]);
    }
  };

  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemTypeChange = (newType) => {
    setItemType(newType);
    setItems([{ name: "", category: newType === "rental" ? "E-Bike" : "", price: newType === "rental" ? 35 : 0 }]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#1A7D5A] to-[#3BAA82] flex items-center justify-center shadow-lg shadow-[#1A7D5A]/30">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Willkommen bei Lociva!</h1>
          <p className="text-slate-400">Richten Sie Ihr Angebot in wenigen Schritten ein</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${step >= s
                    ? "bg-gradient-to-br from-[#1A7D5A] to-[#3BAA82] text-white"
                    : "bg-slate-800 text-slate-500"
                  }`}>
                  {step > s ? <Check className="w-5 h-5" /> : s}
                </div>
                {s < 3 && (
                  <div className={`w-24 h-1 mx-2 rounded-full transition-all ${step > s ? "bg-gradient-to-r from-[#1A7D5A] to-[#3BAA82]" : "bg-slate-800"
                    }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-slate-500 px-2">
            <span>Unternehmen</span>
            <span>Angebote</span>
            <span>Fertig</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden">

          {/* Step 1: Organization */}
          {step === 1 && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[#1A7D5A]/20 rounded-xl flex items-center justify-center">
                  <Building className="w-6 h-6 text-[#3BAA82]" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Ihr Unternehmen</h2>
                  <p className="text-sm text-slate-400">Wie heißt Ihr Unternehmen?</p>
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
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-[#1A7D5A] outline-none"
                    placeholder="z.B. Alpenblick Aktivitäten"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    URL-Kürzel (für Online-Buchung)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-sm">rentcore.de/</span>
                    <input
                      type="text"
                      value={orgSlug}
                      onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-[#1A7D5A] outline-none"
                      placeholder="hotel-alpenblick"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Items */}
          {step === 2 && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[#1A7D5A]/20 rounded-xl flex items-center justify-center">
                  <Bike className="w-6 h-6 text-[#3BAA82]" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Erstes Angebot</h2>
                  <p className="text-sm text-slate-400">Fügen Sie Ihre ersten Angebote hinzu (optional)</p>
                </div>
              </div>

              {/* Item type selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-3">Angebotstyp</label>
                <div className="flex gap-3">
                  {[
                    { value: "rental", label: "Verleih" },
                    { value: "experience", label: "Erlebnis" },
                    { value: "food_beverage", label: "Gastronomie" }
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleItemTypeChange(value)}
                      className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium border transition-all ${
                        itemType === value
                          ? "bg-[#1A7D5A]/20 border-[#1A7D5A] text-[#3BAA82]"
                          : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex gap-3 items-start">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateItem(index, "name", e.target.value)}
                          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-[#1A7D5A] outline-none"
                          placeholder={
                            itemType === "rental" ? "z.B. City E-Bike"
                            : itemType === "experience" ? "z.B. Stadtführung Deluxe"
                            : "z.B. Frühstückskorb"
                          }
                        />
                      </div>

                      {/* Rental: fixed category dropdown */}
                      {itemType === "rental" && (
                        <select
                          value={item.category}
                          onChange={(e) => updateItem(index, "category", e.target.value)}
                          className="px-3 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-[#1A7D5A] outline-none"
                        >
                          <option>E-Bike</option>
                          <option>E-MTB</option>
                          <option>Lastenrad</option>
                          <option>Kinder</option>
                          <option>Bio</option>
                        </select>
                      )}

                      {/* Experience / Food: free text category */}
                      {(itemType === "experience" || itemType === "food_beverage") && (
                        <input
                          type="text"
                          value={item.category}
                          onChange={(e) => updateItem(index, "category", e.target.value)}
                          className="w-32 px-3 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-[#1A7D5A] outline-none"
                          placeholder="Kategorie"
                        />
                      )}

                      <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-xl px-3">
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => updateItem(index, "price", parseInt(e.target.value) || 0)}
                          className="w-16 py-3 bg-transparent text-white outline-none text-center"
                        />
                        <span className="text-slate-500">€</span>
                      </div>

                      {items.length > 1 && (
                        <button
                          onClick={() => removeItem(index)}
                          className="p-3 text-slate-500 hover:text-red-400"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {/* Experience: capacity field */}
                    {itemType === "experience" && (
                      <div className="flex items-center gap-2 pl-1">
                        <label className="text-xs text-slate-500 w-24">Kapazität</label>
                        <input
                          type="number"
                          value={item.capacity || ""}
                          onChange={(e) => updateItem(index, "capacity", e.target.value)}
                          className="w-24 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-[#1A7D5A] outline-none text-sm"
                          placeholder="Personen"
                          min={1}
                        />
                      </div>
                    )}
                  </div>
                ))}

                {items.length < 5 && (
                  <button
                    onClick={addItem}
                    className="flex items-center gap-2 text-[#3BAA82] hover:text-[#3BAA82] text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Weiteres Angebot hinzufügen
                  </button>
                )}

                <p className="text-xs text-slate-500 mt-4">
                  Sie können später beliebig viele Angebote hinzufügen
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Final Settings */}
          {step === 3 && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[#1A7D5A]/20 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-[#3BAA82]" />
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
                    className="w-5 h-5 rounded accent-[#1A7D5A]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-white font-medium">
                      <Globe className="w-4 h-4 text-[#3BAA82]" />
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
                    className="w-5 h-5 rounded accent-[#1A7D5A]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-white font-medium">
                      <Calendar className="w-4 h-4 text-[#3BAA82]" />
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
                  <li>• Unternehmen: <strong>{orgName || ""}</strong></li>
                  <li>• Angebote: <strong>{items.filter(i => i.name.trim()).length || "Keine"}</strong></li>
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
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#1A7D5A] to-[#3BAA82] text-white font-semibold rounded-xl shadow-lg shadow-[#1A7D5A]/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Weiter
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleCreateOrg}
                disabled={loading || !orgName || !orgSlug}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#1A7D5A] to-[#3BAA82] text-white font-semibold rounded-xl shadow-lg shadow-[#1A7D5A]/25 disabled:opacity-50"
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
