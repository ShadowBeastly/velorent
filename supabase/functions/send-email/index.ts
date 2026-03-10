// =====================================================
// RENTCORE - E-MAIL SERVICE (Brevo)
// Supabase Edge Function
// =====================================================
//
// SETUP (einmalig):
// 1. Brevo API Key aus deinem Brevo-Account: Einstellungen → API Keys
// 2. In Supabase Dashboard: Edge Functions → Secrets:
//    BREVO_API_KEY = "xkeysib-xxxxx"
//    FROM_EMAIL    = "noreply@deinedomain.de"
//    FROM_NAME     = "Dein Firmenname"
//
// DEPLOY:
//   SUPABASE_ACCESS_TOKEN=xxx npx supabase functions deploy send-email --project-ref fqycoldheyxzxbxqmayf
//
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "noreply@rentcore.de";
const FROM_NAME = Deno.env.get("FROM_NAME") || "RentCore";

// The Supabase project URL is used to validate allowed CORS origins.
// Example: https://fqycoldheyxzxbxqmayf.supabase.co
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";

/**
 * Determine whether the incoming `Origin` header is permitted.
 * Allowed origins:
 *   - The Supabase project URL itself (edge-to-edge calls)
 *   - localhost:3000 for local development
 * Server-side calls (no Origin header) are allowed through without
 * CORS headers — they don't need them.
 */
function getAllowedOrigin(origin: string | null): string | null {
  if (!origin) return null; // server-side call — no CORS headers needed
  if (origin === "http://localhost:3000" || origin === "https://localhost:3000") {
    return origin;
  }
  if (SUPABASE_URL && origin === SUPABASE_URL) {
    return origin;
  }
  return null; // origin not in allowlist — deny CORS but still process
}

const templates = {
  booking_confirmation: (data) => ({
    subject: `Buchungsbestätigung #${data.booking_number}`,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;margin:0;padding:40px 20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.05);">
    <div style="background:linear-gradient(135deg,#f97316,#fbbf24);padding:32px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:24px;">🚴 Buchungsbestätigung</h1>
    </div>
    <div style="padding:32px;">
      <p style="font-size:18px;color:#1e293b;margin:0 0 24px;">Hallo ${data.customer_name},</p>
      <p style="color:#475569;line-height:1.6;margin:0 0 24px;">vielen Dank für Ihre Buchung bei <strong>${data.organization_name}</strong>!</p>
      <div style="background:#f8fafc;border-radius:12px;padding:24px;margin:0 0 24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#64748b;">Buchungsnummer</td><td style="padding:8px 0;text-align:right;font-weight:600;color:#f97316;font-size:18px;">${data.booking_number}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;">Fahrrad</td><td style="padding:8px 0;text-align:right;font-weight:500;color:#1e293b;">${data.bike_name}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;">Zeitraum</td><td style="padding:8px 0;text-align:right;color:#1e293b;">${data.start_date} – ${data.end_date}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;">Dauer</td><td style="padding:8px 0;text-align:right;color:#1e293b;">${data.total_days} Tage</td></tr>
          <tr style="border-top:1px solid #e2e8f0;"><td style="padding:16px 0 8px;color:#1e293b;font-weight:600;">Gesamtpreis</td><td style="padding:16px 0 8px;text-align:right;font-weight:700;color:#1e293b;font-size:20px;">${data.total_price}</td></tr>
          ${data.deposit ? `<tr><td style="padding:8px 0;color:#64748b;">Kaution</td><td style="padding:8px 0;text-align:right;color:#64748b;">${data.deposit}</td></tr>` : ""}
        </table>
      </div>
      <div style="text-align:center;margin:0 0 24px;">
        <span style="display:inline-block;background:${data.status==="confirmed"?"#dcfce7":"#fef3c7"};color:${data.status==="confirmed"?"#16a34a":"#d97706"};padding:8px 16px;border-radius:20px;font-weight:500;">
          ${data.status==="confirmed"?"✓ Bestätigt":"⏳ Reserviert – Bestätigung folgt"}
        </span>
      </div>
      ${data.pickup_location ? `<div style="background:#eff6ff;border-radius:12px;padding:16px;margin:0 0 24px;"><p style="margin:0;color:#1e40af;font-weight:500;">📍 Abholung</p><p style="margin:8px 0 0;color:#3b82f6;">${data.pickup_location}</p></div>` : ""}
      <div style="border-top:1px solid #e2e8f0;padding-top:24px;">
        <p style="color:#64748b;margin:0 0 8px;font-size:14px;">Bei Fragen erreichen Sie uns unter:</p>
        <p style="color:#1e293b;margin:0;">${data.organization_phone?`📞 ${data.organization_phone}<br>`:""}${data.organization_email?`✉️ ${data.organization_email}`:""}</p>
      </div>
    </div>
    <div style="background:#f8fafc;padding:24px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">${data.organization_name} • ${data.organization_address||""}<br>Diese E-Mail wurde automatisch versendet via RentCore</p>
    </div>
  </div>
</body></html>`
  }),

  new_booking_notification: (data) => ({
    subject: `🚴 Neue Buchung #${data.booking_number} – ${data.customer_name}`,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,sans-serif;background:#f8fafc;margin:0;padding:40px 20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#3b82f6,#06b6d4);padding:32px;text-align:center;"><h1 style="color:white;margin:0;">Neue Buchung eingegangen!</h1></div>
    <div style="padding:32px;">
      <div style="background:#f8fafc;border-radius:12px;padding:24px;margin:0 0 24px;">
        <h2 style="margin:0 0 16px;color:#1e293b;">#${data.booking_number}</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#64748b;width:120px;">Kunde</td><td style="padding:8px 0;font-weight:500;color:#1e293b;">${data.customer_name}</td></tr>
          ${data.customer_email?`<tr><td style="padding:8px 0;color:#64748b;">E-Mail</td><td><a href="mailto:${data.customer_email}" style="color:#3b82f6;">${data.customer_email}</a></td></tr>`:""}
          ${data.customer_phone?`<tr><td style="padding:8px 0;color:#64748b;">Telefon</td><td><a href="tel:${data.customer_phone}" style="color:#3b82f6;">${data.customer_phone}</a></td></tr>`:""}
          <tr style="border-top:1px solid #e2e8f0;"><td style="padding:16px 0 8px;color:#64748b;">Fahrrad</td><td style="padding:16px 0 8px;font-weight:500;color:#1e293b;">${data.bike_name}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;">Zeitraum</td><td style="padding:8px 0;color:#1e293b;">${data.start_date} – ${data.end_date} (${data.total_days} Tage)</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;">Preis</td><td style="padding:8px 0;font-weight:600;color:#16a34a;font-size:18px;">${data.total_price}</td></tr>
        </table>
      </div>
      ${data.notes?`<div style="background:#fffbeb;border-radius:8px;padding:16px;margin:0 0 24px;"><p style="margin:0;color:#92400e;font-weight:500;">📝 Notiz:</p><p style="margin:8px 0 0;color:#78350f;">${data.notes}</p></div>`:""}
      <a href="${data.dashboard_url}" style="display:block;text-align:center;background:linear-gradient(135deg,#f97316,#fbbf24);color:white;padding:16px 32px;border-radius:12px;text-decoration:none;font-weight:600;">Im Dashboard öffnen →</a>
    </div>
  </div>
</body></html>`
  }),

  pickup_reminder: (data) => ({
    subject: `⏰ Erinnerung: Abholung heute – ${data.customer_name}`,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,sans-serif;background:#f8fafc;margin:0;padding:40px 20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;">
    <div style="background:#fbbf24;padding:24px;text-align:center;"><h1 style="color:white;margin:0;">⏰ Abholung heute</h1></div>
    <div style="padding:32px;">
      <div style="background:#f8fafc;border-radius:12px;padding:20px;">
        <p style="margin:0 0 8px;"><strong>Kunde:</strong> ${data.customer_name}</p>
        <p style="margin:0 0 8px;"><strong>Fahrrad:</strong> ${data.bike_name}</p>
        <p style="margin:0 0 8px;"><strong>Telefon:</strong> ${data.customer_phone||"–"}</p>
        <p style="margin:0;"><strong>Buchung:</strong> #${data.booking_number}</p>
      </div>
      <a href="${data.dashboard_url}" style="display:block;margin-top:24px;text-align:center;background:#f97316;color:white;padding:14px;border-radius:8px;text-decoration:none;font-weight:600;">Buchung öffnen</a>
    </div>
  </div>
</body></html>`
  }),

  return_reminder: (data) => ({
    subject: `🔄 Erinnerung: Rückgabe heute – ${data.customer_name}`,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,sans-serif;background:#f8fafc;margin:0;padding:40px 20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;">
    <div style="background:#3b82f6;padding:24px;text-align:center;"><h1 style="color:white;margin:0;">🔄 Rückgabe heute</h1></div>
    <div style="padding:32px;">
      <div style="background:#f8fafc;border-radius:12px;padding:20px;">
        <p style="margin:0 0 8px;"><strong>Kunde:</strong> ${data.customer_name}</p>
        <p style="margin:0 0 8px;"><strong>Fahrrad:</strong> ${data.bike_name}</p>
        <p style="margin:0 0 8px;"><strong>Seit:</strong> ${data.start_date}</p>
        <p style="margin:0;"><strong>Buchung:</strong> #${data.booking_number}</p>
      </div>
      <a href="${data.dashboard_url}" style="display:block;margin-top:24px;text-align:center;background:#f97316;color:white;padding:14px;border-radius:8px;text-decoration:none;font-weight:600;">Rückgabe bestätigen</a>
    </div>
  </div>
</body></html>`
  }),

  welcome: (data) => ({
    subject: `Willkommen bei RentCore! 🚴`,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,sans-serif;background:#f8fafc;margin:0;padding:40px 20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#f97316,#fbbf24);padding:40px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:28px;">Willkommen bei RentCore!</h1>
      <p style="color:rgba(255,255,255,.9);margin:16px 0 0;">Ihr Fahrradverleih, digital.</p>
    </div>
    <div style="padding:32px;">
      <p style="font-size:18px;color:#1e293b;margin:0 0 16px;">Hallo ${data.name},</p>
      <p style="color:#475569;line-height:1.6;margin:0 0 24px;">schön, dass Sie dabei sind!</p>
      <a href="${data.dashboard_url}" style="display:block;text-align:center;background:linear-gradient(135deg,#f97316,#fbbf24);color:white;padding:16px 32px;border-radius:12px;text-decoration:none;font-weight:600;font-size:16px;">Zum Dashboard →</a>
    </div>
  </div>
</body></html>`
  })
};

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const allowedOrigin = getAllowedOrigin(origin);

  // Build CORS headers — only include Allow-Origin when the origin is permitted.
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
  if (allowedOrigin) {
    corsHeaders["Access-Control-Allow-Origin"] = allowedOrigin;
    corsHeaders["Vary"] = "Origin";
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, to, data } = await req.json();
    const template = templates[type];
    if (!template) throw new Error(`Unknown email type: ${type}`);

    const { subject, html } = template(data);

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": BREVO_API_KEY || ""
      },
      body: JSON.stringify({
        sender: { name: FROM_NAME, email: FROM_EMAIL },
        to: [{ email: to }],
        subject,
        htmlContent: html
      })
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || JSON.stringify(result));

    return new Response(JSON.stringify({ success: true, messageId: result.messageId }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
});
