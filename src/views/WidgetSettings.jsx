"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Globe, Copy, Check, Code, Link, AlertCircle, CheckCircle, Loader2,
} from "lucide-react";

export default function WidgetSettings({ supabase, orgId, darkMode }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  const cardStyle = darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
  const inputStyle = `w-full px-3 py-2 rounded-lg border outline-none transition-colors ${
    darkMode ? "bg-slate-800 border-slate-700 text-white focus:border-[#1A7D5A]" : "bg-white border-slate-300 focus:border-[#1A7D5A]"
  }`;

  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      if (!orgId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("organizations")
        .select("id, widget_enabled, widget_allowed_domains")
        .eq("id", orgId)
        .single();

      if (mounted) {
        setSettings(error ? null : {
          id: data.id,
          widget_enabled: data.widget_enabled ?? false,
          widget_allowed_domains: Array.isArray(data.widget_allowed_domains) ? data.widget_allowed_domains : [],
        });
        setLoading(false);
      }
    };

    loadSettings();
    return () => { mounted = false; };
  }, [orgId, supabase]);

  const domainText = useMemo(
    () => (settings?.widget_allowed_domains || []).join("\n"),
    [settings]
  );

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setSaveStatus(null);

    const domains = domainText
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean);

    const { error } = await supabase
      .from("organizations")
      .update({
        widget_enabled: settings.widget_enabled,
        widget_allowed_domains: domains,
      })
      .eq("id", settings.id);

    setSaving(false);
    setSaveStatus(error ? "error" : "success");
    if (!error) {
      setSettings((prev) => ({ ...prev, widget_allowed_domains: domains }));
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const embedCode = `<!-- Lociva Buchungs-Widget -->
<div id="lociva-booking-widget"></div>
<script type="module">
  const tenantId = "${orgId || "YOUR_TENANT_ID"}";
  const apiBase = "${process.env.NEXT_PUBLIC_SITE_URL || "https://lociva.de"}";

  async function createCheckout(payload) {
    const response = await fetch(\`\${apiBase}/api/public/\${tenantId}/checkout\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await response.json();
  }

  // Die konkrete Widget-UI kann lokal gerendert werden.
  // Der kanonische Serververtrag läuft über /api/public/[tenant]/*.
</script>`;

  if (loading) {
    return (
      <div className={`rounded-2xl border p-6 ${cardStyle}`}>
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-[#1A7D5A]" />
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className={`rounded-2xl border p-6 ${cardStyle}`}>
        <p className={`text-sm text-center ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
          Widget-Einstellungen konnten nicht geladen werden.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={`rounded-2xl border p-6 ${cardStyle}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Öffentliches Buchungswidget</h3>
              <p className={`text-sm ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                Tenant-basierter Public-API-Zugang
              </p>
            </div>
          </div>

          <button
            onClick={() => setSettings((prev) => ({ ...prev, widget_enabled: !prev.widget_enabled }))}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              settings.widget_enabled ? "bg-emerald-500" : darkMode ? "bg-slate-700" : "bg-slate-300"
            }`}
          >
            <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
              settings.widget_enabled ? "translate-x-7" : ""
            }`} />
          </button>
        </div>

        <div className={`p-4 rounded-lg border flex items-center gap-3 ${
          settings.widget_enabled
            ? darkMode ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-200"
            : darkMode ? "bg-amber-500/10 border-amber-500/20" : "bg-amber-50 border-amber-200"
        }`}>
          {settings.widget_enabled ? (
            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          )}
          <p className={`text-sm ${
            settings.widget_enabled
              ? darkMode ? "text-emerald-400" : "text-emerald-700"
              : darkMode ? "text-amber-400" : "text-amber-700"
          }`}>
            {settings.widget_enabled
              ? "Widget ist aktiv. Freigabe erfolgt ausschließlich über die erlaubten Domains unten."
              : "Widget ist deaktiviert. Öffentliche Aufrufe werden serverseitig blockiert."}
          </p>
        </div>
      </div>

      <div className={`rounded-2xl border p-6 ${cardStyle}`}>
        <div className="flex items-center gap-3 mb-4">
          <Link className="w-5 h-5 text-[#1A7D5A]" />
          <h3 className="font-semibold">Erlaubte Domains</h3>
        </div>

        <p className={`text-sm mb-4 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
          Jede Zeile muss eine vollständige Origin sein, zum Beispiel <code>https://hotel.example</code>.
          Leere Listen blockieren das Widget.
        </p>

        <textarea
          value={domainText}
          onChange={(e) => setSettings((prev) => ({ ...prev, widget_allowed_domains: e.target.value.split("\n") }))}
          rows={6}
          className={inputStyle}
          placeholder={"https://hotel.example\nhttps://www.hotel.example"}
        />
      </div>

      <div className={`rounded-2xl border p-6 ${cardStyle}`}>
        <div className="flex items-center gap-3 mb-4">
          <Code className="w-5 h-5 text-[#1A7D5A]" />
          <h3 className="font-semibold">Einbettungscode</h3>
        </div>

        <p className={`text-sm mb-4 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
          Der kanonische Serververtrag läuft über <code>/api/public/[tenant]</code>. API-Keys aus dem Legacy-Modell werden nicht mehr verwendet.
        </p>

        <div className={`relative rounded-lg overflow-hidden ${darkMode ? "bg-slate-800" : "bg-slate-100"}`}>
          <pre className="p-4 text-sm overflow-x-auto">
            <code className={darkMode ? "text-slate-300" : "text-slate-700"}>
              {embedCode}
            </code>
          </pre>
          <button
            onClick={() => copyToClipboard(embedCode)}
            className="absolute top-2 right-2 p-2 rounded bg-[#1A7D5A] text-white hover:bg-[#176c4e]"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex justify-end items-center gap-3">
        {saveStatus === "success" && <span className="text-emerald-500 text-sm font-medium flex items-center gap-1"><CheckCircle className="w-4 h-4" />Gespeichert</span>}
        {saveStatus === "error" && <span className="text-rose-500 text-sm font-medium flex items-center gap-1"><AlertCircle className="w-4 h-4" />Fehler beim Speichern</span>}
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-gradient-to-r from-[#1A7D5A] to-[#3BAA82] text-white rounded-xl font-semibold shadow-lg shadow-[#1A7D5A]/25 flex items-center gap-2"
        >
          {saving && <Loader2 className="w-5 h-5 animate-spin" />}
          Einstellungen speichern
        </button>
      </div>
    </div>
  );
}
