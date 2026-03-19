// =====================================================
// LOCIVA - E-MAIL SERVICE (Brevo)
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

function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "noreply@lociva.de";
const FROM_NAME = Deno.env.get("FROM_NAME") || "Lociva";

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
  lociva_guest_confirmation: (data) => {
    const de = data.lang !== "en";
    const guestName = escapeHtml(data.guest_name);
    const providerName = escapeHtml(data.provider_name);
    const providerAddress = escapeHtml(data.provider_address);
    const providerPhone = escapeHtml(data.provider_phone);
    const bookingNumber = escapeHtml(String(data.booking_number ?? ""));
    const bikeName = escapeHtml(data.bike_name);
    const totalPrice = escapeHtml(String(data.total_price ?? ""));
    const totalDays = escapeHtml(String(data.total_days ?? ""));
    const startDate = escapeHtml(data.start_date);
    const endDate = escapeHtml(data.end_date);
    // URLs are not escaped but validated to start with https://
    const cancelUrl = (data.cancellation_url && data.cancellation_url.startsWith("https://")) ? data.cancellation_url : "";
    const subject = de
      ? `Buchungsbestätigung #${bookingNumber} – ${providerName}`
      : `Booking Confirmation #${bookingNumber} – ${providerName}`;
    const cancelSection = cancelUrl ? `
      <div style="margin:0 0 24px;padding:20px;background:#FFFBEB;border-radius:12px;border:1px solid #F59E0B30;">
        <p style="margin:0 0 8px;color:#92400E;font-weight:600;font-size:14px;">${de ? "Stornierung" : "Cancellation"}</p>
        <p style="margin:0 0 12px;color:#78350F;font-size:13px;line-height:1.5;">${de
          ? "Kostenlose Stornierung bis 24 Stunden vor Beginn. Danach fällt eine Gebühr von 50% an."
          : "Free cancellation up to 24 hours before start. After that, a 50% fee applies."}</p>
        <a href="${cancelUrl}" style="display:inline-block;background:#DC2626;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:500;font-size:13px;">${de ? "Buchung stornieren" : "Cancel booking"}</a>
      </div>` : "";
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F5FAF7;margin:0;padding:40px 20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.06);">
    <div style="background:#1A7D5A;padding:32px;text-align:center;">
      <p style="color:rgba(255,255,255,.6);margin:0 0 10px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:300;">LOCIVA</p>
      <h1 style="color:white;margin:0;font-size:22px;font-weight:500;">${de ? "Buchungsbestätigung" : "Booking Confirmation"}</h1>
    </div>
    <div style="padding:32px;">
      <p style="font-size:17px;color:#1E2D26;margin:0 0 8px;">${de ? "Hallo" : "Hello"} ${guestName},</p>
      <p style="color:#6B7280;line-height:1.6;margin:0 0 24px;">${de ? `vielen Dank für Ihre Buchung bei <strong style="color:#1E2D26;">${providerName}</strong>! Ihre Zahlung wurde erfolgreich verarbeitet.` : `thank you for booking with <strong style="color:#1E2D26;">${providerName}</strong>! Your payment was processed successfully.`}</p>
      <div style="background:#F5FAF7;border-radius:12px;padding:24px;margin:0 0 24px;border:1px solid #D4EDE2;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#6B7280;font-size:14px;">${de ? "Buchungsnummer" : "Booking #"}</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#1A7D5A;font-size:20px;">${bookingNumber}</td></tr>
          <tr style="border-top:1px solid #D4EDE2;"><td style="padding:12px 0 8px;color:#6B7280;font-size:14px;">${de ? "Artikel" : "Item"}</td><td style="padding:12px 0 8px;text-align:right;font-weight:500;color:#1E2D26;">${bikeName}</td></tr>
          <tr><td style="padding:8px 0;color:#6B7280;font-size:14px;">${de ? "Zeitraum" : "Period"}</td><td style="padding:8px 0;text-align:right;color:#1E2D26;">${startDate} – ${endDate}</td></tr>
          <tr><td style="padding:8px 0;color:#6B7280;font-size:14px;">${de ? "Dauer" : "Duration"}</td><td style="padding:8px 0;text-align:right;color:#1E2D26;">${totalDays} ${de ? (Number(data.total_days) === 1 ? "Tag" : "Tage") : (Number(data.total_days) === 1 ? "day" : "days")}</td></tr>
          <tr style="border-top:1px solid #D4EDE2;"><td style="padding:16px 0 8px;color:#1E2D26;font-weight:600;font-size:15px;">${de ? "Gesamtbetrag" : "Total"}</td><td style="padding:16px 0 8px;text-align:right;font-weight:700;color:#1E2D26;font-size:20px;">${totalPrice}</td></tr>
        </table>
      </div>
      <div style="text-align:center;margin:0 0 24px;">
        <span style="display:inline-block;background:#D4EDE2;color:#1A7D5A;padding:8px 20px;border-radius:20px;font-weight:600;font-size:14px;">✓ ${de ? "Zahlung bestätigt" : "Payment confirmed"}</span>
      </div>
      ${providerAddress ? `<div style="background:#D4EDE2;border-radius:12px;padding:16px;margin:0 0 24px;"><p style="margin:0;color:#1E2D26;font-weight:600;font-size:14px;">📍 ${de ? "Abholung" : "Pickup"}</p><p style="margin:6px 0 0;color:#1A7D5A;font-size:14px;">${providerName}<br>${providerAddress}${providerPhone ? `<br>${providerPhone}` : ""}</p></div>` : ""}
      ${cancelSection}
      <p style="color:#6B7280;font-size:13px;margin:0;">${de ? "Bei Fragen wenden Sie sich direkt an den Anbieter oder an info@lociva.de." : "For questions, contact the provider directly or email info@lociva.de."}</p>
    </div>
    <div style="background:#F5FAF7;padding:24px;text-align:center;border-top:1px solid #D4EDE2;">
      <p style="color:#1A7D5A;font-size:12px;letter-spacing:.06em;font-weight:300;margin:0 0 4px;">LOCIVA</p>
      <p style="color:#6B7280;font-size:11px;margin:0;">${de ? "Lokale Erlebnisse. Einfach. Hier." : "Local experiences, one scan away."} · lociva.de</p>
    </div>
  </div>
</body></html>`;
    return { subject, html };
  },

  booking_confirmation: (data) => {
    const customerName = escapeHtml(data.customer_name);
    const organizationName = escapeHtml(data.organization_name);
    const bookingNumber = escapeHtml(String(data.booking_number ?? ""));
    const bikeName = escapeHtml(data.bike_name);
    const startDate = escapeHtml(data.start_date);
    const endDate = escapeHtml(data.end_date);
    const totalDays = escapeHtml(String(data.total_days ?? ""));
    const totalPrice = escapeHtml(String(data.total_price ?? ""));
    const deposit = data.deposit ? escapeHtml(String(data.deposit)) : "";
    const pickupLocation = escapeHtml(data.pickup_location ?? "");
    const organizationPhone = escapeHtml(data.organization_phone ?? "");
    const organizationEmail = escapeHtml(data.organization_email ?? "");
    const organizationAddress = escapeHtml(data.organization_address ?? "");
    return {
      subject: `Buchungsbestätigung #${bookingNumber}`,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;margin:0;padding:40px 20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.05);">
    <div style="background:linear-gradient(135deg,#f97316,#fbbf24);padding:32px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:24px;">🚴 Buchungsbestätigung</h1>
    </div>
    <div style="padding:32px;">
      <p style="font-size:18px;color:#1e293b;margin:0 0 24px;">Hallo ${customerName},</p>
      <p style="color:#475569;line-height:1.6;margin:0 0 24px;">vielen Dank für Ihre Buchung bei <strong>${organizationName}</strong>!</p>
      <div style="background:#f8fafc;border-radius:12px;padding:24px;margin:0 0 24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#64748b;">Buchungsnummer</td><td style="padding:8px 0;text-align:right;font-weight:600;color:#f97316;font-size:18px;">${bookingNumber}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;">Fahrrad</td><td style="padding:8px 0;text-align:right;font-weight:500;color:#1e293b;">${bikeName}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;">Zeitraum</td><td style="padding:8px 0;text-align:right;color:#1e293b;">${startDate} – ${endDate}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;">Dauer</td><td style="padding:8px 0;text-align:right;color:#1e293b;">${totalDays} Tage</td></tr>
          <tr style="border-top:1px solid #e2e8f0;"><td style="padding:16px 0 8px;color:#1e293b;font-weight:600;">Gesamtpreis</td><td style="padding:16px 0 8px;text-align:right;font-weight:700;color:#1e293b;font-size:20px;">${totalPrice}</td></tr>
          ${deposit ? `<tr><td style="padding:8px 0;color:#64748b;">Kaution</td><td style="padding:8px 0;text-align:right;color:#64748b;">${deposit}</td></tr>` : ""}
        </table>
      </div>
      <div style="text-align:center;margin:0 0 24px;">
        <span style="display:inline-block;background:${data.status==="confirmed"?"#dcfce7":"#fef3c7"};color:${data.status==="confirmed"?"#16a34a":"#d97706"};padding:8px 16px;border-radius:20px;font-weight:500;">
          ${data.status==="confirmed"?"✓ Bestätigt":"⏳ Reserviert – Bestätigung folgt"}
        </span>
      </div>
      ${pickupLocation ? `<div style="background:#eff6ff;border-radius:12px;padding:16px;margin:0 0 24px;"><p style="margin:0;color:#1e40af;font-weight:500;">📍 Abholung</p><p style="margin:8px 0 0;color:#3b82f6;">${pickupLocation}</p></div>` : ""}
      <div style="border-top:1px solid #e2e8f0;padding-top:24px;">
        <p style="color:#64748b;margin:0 0 8px;font-size:14px;">Bei Fragen erreichen Sie uns unter:</p>
        <p style="color:#1e293b;margin:0;">${organizationPhone?`📞 ${organizationPhone}<br>`:""}${organizationEmail?`✉️ ${organizationEmail}`:""}</p>
      </div>
    </div>
    <div style="background:#f8fafc;padding:24px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">${organizationName} • ${organizationAddress}<br>Diese E-Mail wurde automatisch versendet via Lociva</p>
    </div>
  </div>
</body></html>`
    };
  },

  new_booking_notification: (data) => {
    const customerName = escapeHtml(data.customer_name);
    const customerEmail = escapeHtml(data.customer_email ?? "");
    const customerPhone = escapeHtml(data.customer_phone ?? "");
    const bookingNumber = escapeHtml(String(data.booking_number ?? ""));
    const bikeName = escapeHtml(data.bike_name);
    const startDate = escapeHtml(data.start_date);
    const endDate = escapeHtml(data.end_date);
    const totalDays = escapeHtml(String(data.total_days ?? ""));
    const totalPrice = escapeHtml(String(data.total_price ?? ""));
    const notes = escapeHtml(data.notes ?? "");
    // dashboard_url is an internal URL — validate it starts with https://
    const dashboardUrl = (data.dashboard_url && data.dashboard_url.startsWith("https://")) ? data.dashboard_url : "#";
    return {
      subject: `🚴 Neue Buchung #${bookingNumber} – ${customerName}`,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,sans-serif;background:#f8fafc;margin:0;padding:40px 20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#3b82f6,#06b6d4);padding:32px;text-align:center;"><h1 style="color:white;margin:0;">Neue Buchung eingegangen!</h1></div>
    <div style="padding:32px;">
      <div style="background:#f8fafc;border-radius:12px;padding:24px;margin:0 0 24px;">
        <h2 style="margin:0 0 16px;color:#1e293b;">#${bookingNumber}</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#64748b;width:120px;">Kunde</td><td style="padding:8px 0;font-weight:500;color:#1e293b;">${customerName}</td></tr>
          ${customerEmail?`<tr><td style="padding:8px 0;color:#64748b;">E-Mail</td><td><a href="mailto:${customerEmail}" style="color:#3b82f6;">${customerEmail}</a></td></tr>`:""}
          ${customerPhone?`<tr><td style="padding:8px 0;color:#64748b;">Telefon</td><td><a href="tel:${customerPhone}" style="color:#3b82f6;">${customerPhone}</a></td></tr>`:""}
          <tr style="border-top:1px solid #e2e8f0;"><td style="padding:16px 0 8px;color:#64748b;">Fahrrad</td><td style="padding:16px 0 8px;font-weight:500;color:#1e293b;">${bikeName}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;">Zeitraum</td><td style="padding:8px 0;color:#1e293b;">${startDate} – ${endDate} (${totalDays} Tage)</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;">Preis</td><td style="padding:8px 0;font-weight:600;color:#16a34a;font-size:18px;">${totalPrice}</td></tr>
        </table>
      </div>
      ${notes?`<div style="background:#fffbeb;border-radius:8px;padding:16px;margin:0 0 24px;"><p style="margin:0;color:#92400e;font-weight:500;">📝 Notiz:</p><p style="margin:8px 0 0;color:#78350f;">${notes}</p></div>`:""}
      <a href="${dashboardUrl}" style="display:block;text-align:center;background:linear-gradient(135deg,#f97316,#fbbf24);color:white;padding:16px 32px;border-radius:12px;text-decoration:none;font-weight:600;">Im Dashboard öffnen →</a>
    </div>
  </div>
</body></html>`
    };
  },

  pickup_reminder: (data) => {
    const customerName = escapeHtml(data.customer_name);
    const bikeName = escapeHtml(data.bike_name);
    const customerPhone = escapeHtml(data.customer_phone ?? "");
    const bookingNumber = escapeHtml(String(data.booking_number ?? ""));
    const dashboardUrl = (data.dashboard_url && data.dashboard_url.startsWith("https://")) ? data.dashboard_url : "#";
    return {
      subject: `⏰ Erinnerung: Abholung heute – ${customerName}`,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,sans-serif;background:#f8fafc;margin:0;padding:40px 20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;">
    <div style="background:#fbbf24;padding:24px;text-align:center;"><h1 style="color:white;margin:0;">⏰ Abholung heute</h1></div>
    <div style="padding:32px;">
      <div style="background:#f8fafc;border-radius:12px;padding:20px;">
        <p style="margin:0 0 8px;"><strong>Kunde:</strong> ${customerName}</p>
        <p style="margin:0 0 8px;"><strong>Fahrrad:</strong> ${bikeName}</p>
        <p style="margin:0 0 8px;"><strong>Telefon:</strong> ${customerPhone||"–"}</p>
        <p style="margin:0;"><strong>Buchung:</strong> #${bookingNumber}</p>
      </div>
      <a href="${dashboardUrl}" style="display:block;margin-top:24px;text-align:center;background:#f97316;color:white;padding:14px;border-radius:8px;text-decoration:none;font-weight:600;">Buchung öffnen</a>
    </div>
  </div>
</body></html>`
    };
  },

  return_reminder: (data) => {
    const customerName = escapeHtml(data.customer_name);
    const bikeName = escapeHtml(data.bike_name);
    const startDate = escapeHtml(data.start_date);
    const bookingNumber = escapeHtml(String(data.booking_number ?? ""));
    const dashboardUrl = (data.dashboard_url && data.dashboard_url.startsWith("https://")) ? data.dashboard_url : "#";
    return {
      subject: `🔄 Erinnerung: Rückgabe heute – ${customerName}`,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,sans-serif;background:#f8fafc;margin:0;padding:40px 20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;">
    <div style="background:#3b82f6;padding:24px;text-align:center;"><h1 style="color:white;margin:0;">🔄 Rückgabe heute</h1></div>
    <div style="padding:32px;">
      <div style="background:#f8fafc;border-radius:12px;padding:20px;">
        <p style="margin:0 0 8px;"><strong>Kunde:</strong> ${customerName}</p>
        <p style="margin:0 0 8px;"><strong>Fahrrad:</strong> ${bikeName}</p>
        <p style="margin:0 0 8px;"><strong>Seit:</strong> ${startDate}</p>
        <p style="margin:0;"><strong>Buchung:</strong> #${bookingNumber}</p>
      </div>
      <a href="${dashboardUrl}" style="display:block;margin-top:24px;text-align:center;background:#f97316;color:white;padding:14px;border-radius:8px;text-decoration:none;font-weight:600;">Rückgabe bestätigen</a>
    </div>
  </div>
</body></html>`
    };
  },

  welcome: (data) => {
    const name = escapeHtml(data.name);
    const dashboardUrl = (data.dashboard_url && data.dashboard_url.startsWith("https://")) ? data.dashboard_url : "#";
    return {
      subject: `Willkommen bei Lociva!`,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F5FAF7;margin:0;padding:40px 20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.06);">
    <div style="background:#1A7D5A;padding:40px;text-align:center;">
      <p style="color:rgba(255,255,255,.6);margin:0 0 10px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:300;">LOCIVA</p>
      <h1 style="color:white;margin:0;font-size:28px;font-weight:500;">Willkommen!</h1>
      <p style="color:rgba(255,255,255,.8);margin:16px 0 0;">Ihr Verleih, digital verwaltet.</p>
    </div>
    <div style="padding:32px;">
      <p style="font-size:18px;color:#1E2D26;margin:0 0 16px;">Hallo ${name},</p>
      <p style="color:#6B7280;line-height:1.6;margin:0 0 24px;">schön, dass Sie dabei sind!</p>
      <a href="${dashboardUrl}" style="display:block;text-align:center;background:#1A7D5A;color:white;padding:16px 32px;border-radius:12px;text-decoration:none;font-weight:600;font-size:16px;">Zum Dashboard →</a>
    </div>
    <div style="background:#F5FAF7;padding:24px;text-align:center;border-top:1px solid #D4EDE2;">
      <p style="color:#1A7D5A;font-size:12px;letter-spacing:.06em;font-weight:300;margin:0;">LOCIVA · lociva.de</p>
    </div>
  </div>
</body></html>`
    };
  }
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

  // Auth check: require service-role JWT or internal secret
  const authHeader = req.headers.get("authorization") || "";
  const internalSecret = req.headers.get("x-internal-secret") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const functionSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET") || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const isAuthorized =
    (bearerToken && bearerToken === serviceRoleKey) ||
    (functionSecret && internalSecret === functionSecret);
  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
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
