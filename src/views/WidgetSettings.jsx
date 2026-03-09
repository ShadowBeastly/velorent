"use client";
import { useState, useEffect } from "react";
import {
  Globe, Copy, Check, Eye, EyeOff, RefreshCw,
  Palette, Settings, Code, Link, AlertCircle, CheckCircle, Loader2
} from "lucide-react";

// ============ WIDGET SETTINGS COMPONENT ============
// Diese Komponente in die Settings-Page integrieren
export default function WidgetSettings({ supabase, orgId, darkMode }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const cardStyle = darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
  const inputStyle = `w-full px-3 py-2 rounded-lg border outline-none transition-colors ${darkMode ? "bg-slate-800 border-slate-700 text-white focus:border-orange-500" : "bg-white border-slate-300 focus:border-orange-500"
    }`;

  // Load settings
  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      // Try to get existing settings
      let { data, error } = await supabase
        .from("public_booking_settings")
        .select("*")
        .eq("organization_id", orgId)
        .single();

      // Create if not exists
      if (error?.code === "PGRST116") {
        const { data: newData } = await supabase
          .from("public_booking_settings")
          .insert({ organization_id: orgId })
          .select()
          .single();
        data = newData;
      }

      if (mounted) {
        setSettings(data);
        setLoading(false);
      }
    };

    loadSettings();

    return () => { mounted = false; };
  }, [orgId, supabase]);

  const handleSave = async () => {
    setSaving(true);

    const { error } = await supabase
      .from("public_booking_settings")
      .update({
        is_enabled: settings.is_enabled,
        primary_color: settings.primary_color,
        secondary_color: settings.secondary_color,
        border_radius: settings.border_radius,
        min_days: settings.min_days,
        max_days: settings.max_days,
        max_advance_days: settings.max_advance_days,
        require_phone: settings.require_phone,
        require_email: settings.require_email,
        require_address: settings.require_address,
        auto_confirm: settings.auto_confirm,
        deposit_required: settings.deposit_required,
        welcome_text: settings.welcome_text,
        success_text: settings.success_text,
        terms_url: settings.terms_url,
        privacy_url: settings.privacy_url
      })
      .eq("id", settings.id);

    setSaving(false);

    if (!error) {
      // Show success feedback
    }
  };

  const regenerateApiKey = async () => {
    if (!confirm("Achtung: Der alte API-Key wird ungültig. Alle eingebetteten Widgets müssen aktualisiert werden. Fortfahren?")) {
      return;
    }

    const bytes = new Uint8Array(32);
    window.crypto.getRandomValues(bytes);
    const newKey = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');

    await supabase
      .from("public_booking_settings")
      .update({ public_api_key: newKey })
      .eq("id", settings.id);

    setSettings({ ...settings, public_api_key: newKey });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateEmbedCode = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "YOUR_SUPABASE_URL";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY";
    return `<!-- VeloRent Buchungs-Widget -->
<div id="velorent-booking"></div>
<script type="module">
  import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

  const SUPABASE_URL = "${supabaseUrl}";
  const SUPABASE_KEY = "${supabaseKey}";
  const API_KEY = "${settings?.public_api_key || 'YOUR_API_KEY'}";

  // Widget initialisieren...
  // Vollständigen Code unter widget-embed-example.html
</script>`;
  };

  if (loading) {
    return (
      <div className={`rounded-2xl border p-6 ${cardStyle}`}>
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Widget Status */}
      <div className={`rounded-2xl border p-6 ${cardStyle}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Öffentliches Buchungswidget</h3>
              <p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                Für Ihre Hotel-Website
              </p>
            </div>
          </div>

          {/* Toggle */}
          <button
            onClick={() => setSettings({ ...settings, is_enabled: !settings.is_enabled })}
            className={`relative w-14 h-7 rounded-full transition-colors ${settings.is_enabled ? "bg-emerald-500" : darkMode ? "bg-slate-700" : "bg-slate-300"
              }`}
          >
            <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${settings.is_enabled ? "translate-x-7" : ""
              }`} />
          </button>
        </div>

        {settings.is_enabled && (
          <div className={`p-4 rounded-lg ${darkMode ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-200"} border flex items-center gap-3`}>
            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <p className={`text-sm ${darkMode ? "text-emerald-400" : "text-emerald-700"}`}>
              Widget ist aktiv. Kunden können über Ihre Website buchen.
            </p>
          </div>
        )}

        {!settings.is_enabled && (
          <div className={`p-4 rounded-lg ${darkMode ? "bg-amber-500/10 border-amber-500/20" : "bg-amber-50 border-amber-200"} border flex items-center gap-3`}>
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <p className={`text-sm ${darkMode ? "text-amber-400" : "text-amber-700"}`}>
              Widget ist deaktiviert. Aktivieren Sie es, um Online-Buchungen zu ermöglichen.
            </p>
          </div>
        )}
      </div>

      {/* API Key */}
      <div className={`rounded-2xl border p-6 ${cardStyle}`}>
        <div className="flex items-center gap-3 mb-4">
          <Code className="w-5 h-5 text-orange-500" />
          <h3 className="font-semibold">API-Schlüssel</h3>
        </div>

        <p className={`text-sm mb-4 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
          Dieser Schlüssel wird benötigt, um das Widget auf Ihrer Website einzubetten.
          Halten Sie ihn geheim – er identifiziert Ihren Account.
        </p>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type={showApiKey ? "text" : "password"}
              value={settings.public_api_key || ""}
              readOnly
              className={inputStyle}
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded ${darkMode ? "hover:bg-slate-700" : "hover:bg-slate-100"}`}
            >
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button
            onClick={() => copyToClipboard(settings.public_api_key)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${darkMode ? "bg-slate-800 hover:bg-slate-700" : "bg-slate-100 hover:bg-slate-200"}`}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={regenerateApiKey}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 text-amber-500 ${darkMode ? "bg-amber-500/10 hover:bg-amber-500/20" : "bg-amber-50 hover:bg-amber-100"}`}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Embed Code */}
      <div className={`rounded-2xl border p-6 ${cardStyle}`}>
        <div className="flex items-center gap-3 mb-4">
          <Link className="w-5 h-5 text-orange-500" />
          <h3 className="font-semibold">Einbettungscode</h3>
        </div>

        <p className={`text-sm mb-4 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
          Kopieren Sie diesen Code und fügen Sie ihn in Ihre Website ein.
        </p>

        <div className={`relative rounded-lg overflow-hidden ${darkMode ? "bg-slate-800" : "bg-slate-100"}`}>
          <pre className="p-4 text-sm overflow-x-auto">
            <code className={darkMode ? "text-slate-300" : "text-slate-700"}>
              {generateEmbedCode()}
            </code>
          </pre>
          <button
            onClick={() => copyToClipboard(generateEmbedCode())}
            className="absolute top-2 right-2 p-2 rounded bg-orange-500 text-white hover:bg-orange-600"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>

        <p className={`text-xs mt-3 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
          💡 Tipp: Laden Sie die vollständige <code>widget-embed-example.html</code> herunter für ein komplettes Beispiel.
        </p>
      </div>

      {/* Styling */}
      <div className={`rounded-2xl border p-6 ${cardStyle}`}>
        <div className="flex items-center gap-3 mb-6">
          <Palette className="w-5 h-5 text-orange-500" />
          <h3 className="font-semibold">Design anpassen</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
              Primärfarbe
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={settings.primary_color || "#f97316"}
                onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                className="w-12 h-10 rounded-lg border-0 cursor-pointer"
              />
              <input
                type="text"
                value={settings.primary_color || "#f97316"}
                onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                className={`${inputStyle} flex-1`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
              Sekundärfarbe
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={settings.secondary_color || "#fbbf24"}
                onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                className="w-12 h-10 rounded-lg border-0 cursor-pointer"
              />
              <input
                type="text"
                value={settings.secondary_color || "#fbbf24"}
                onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                className={`${inputStyle} flex-1`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
              Eckenradius
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="24"
                value={settings.border_radius || 12}
                onChange={(e) => setSettings({ ...settings, border_radius: parseInt(e.target.value) })}
                className="flex-1"
              />
              <span className={`text-sm w-8 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                {settings.border_radius || 12}px
              </span>
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
              Vorschau
            </label>
            <div
              className="h-10 flex items-center justify-center text-white text-sm font-medium"
              style={{
                background: `linear-gradient(135deg, ${settings.primary_color || "#f97316"}, ${settings.secondary_color || "#fbbf24"})`,
                borderRadius: `${settings.border_radius || 12}px`
              }}
            >
              Jetzt buchen
            </div>
          </div>
        </div>
      </div>

      {/* Buchungsregeln */}
      <div className={`rounded-2xl border p-6 ${cardStyle}`}>
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-5 h-5 text-orange-500" />
          <h3 className="font-semibold">Buchungsregeln</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
              Min. Tage
            </label>
            <input
              type="number"
              min="1"
              value={settings.min_days || 1}
              onChange={(e) => setSettings({ ...settings, min_days: parseInt(e.target.value) })}
              className={inputStyle}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
              Max. Tage
            </label>
            <input
              type="number"
              min="1"
              value={settings.max_days || 30}
              onChange={(e) => setSettings({ ...settings, max_days: parseInt(e.target.value) })}
              className={inputStyle}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
              Max. Vorlauf (Tage)
            </label>
            <input
              type="number"
              min="1"
              value={settings.max_advance_days || 90}
              onChange={(e) => setSettings({ ...settings, max_advance_days: parseInt(e.target.value) })}
              className={inputStyle}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { key: "require_email", label: "E-Mail Pflicht" },
            { key: "require_phone", label: "Telefon Pflicht" },
            { key: "require_address", label: "Adresse Pflicht" },
            { key: "auto_confirm", label: "Auto-Bestätigung" }
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings[key] || false}
                onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })}
                className="w-5 h-5 rounded accent-orange-500"
              />
              <span className={`text-sm ${darkMode ? "text-slate-300" : "text-slate-700"}`}>{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Texte */}
      <div className={`rounded-2xl border p-6 ${cardStyle}`}>
        <h3 className="font-semibold mb-4">Texte & Links</h3>

        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
              Willkommenstext
            </label>
            <input
              type="text"
              value={settings.welcome_text || ""}
              onChange={(e) => setSettings({ ...settings, welcome_text: e.target.value })}
              className={inputStyle}
              placeholder="Buchen Sie Ihr Fahrrad in wenigen Schritten"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
              Erfolgstext
            </label>
            <input
              type="text"
              value={settings.success_text || ""}
              onChange={(e) => setSettings({ ...settings, success_text: e.target.value })}
              className={inputStyle}
              placeholder="Vielen Dank! Ihre Buchung wurde erfolgreich erstellt."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                AGB-Link
              </label>
              <input
                type="url"
                value={settings.terms_url || ""}
                onChange={(e) => setSettings({ ...settings, terms_url: e.target.value })}
                className={inputStyle}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                Datenschutz-Link
              </label>
              <input
                type="url"
                value={settings.privacy_url || ""}
                onChange={(e) => setSettings({ ...settings, privacy_url: e.target.value })}
                className={inputStyle}
                placeholder="https://..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-semibold shadow-lg shadow-orange-500/25 flex items-center gap-2"
        >
          {saving && <Loader2 className="w-5 h-5 animate-spin" />}
          Einstellungen speichern
        </button>
      </div>
    </div>
  );
}
