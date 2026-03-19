// src/utils/email.js
// Resend-based email helpers for RentCore booking flows.
// SERVER-SIDE ONLY — never import this from a "use client" component.
//
// Existing Brevo flows (booking confirmation via Supabase Edge Function) remain
// for the classic provider-dashboard flows; this module is the new channel that
// adds QR codes and is used by the /api/emails/* routes.

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder");

const FROM = process.env.RESEND_FROM_EMAIL || "buchung@rentcore.de";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Write one row to email_log.  Non-fatal — errors are only logged. */
export async function logEmail(supabase, bookingId, template, status, resendId = null) {
    try {
        await supabase.from("email_log").insert({
            booking_id: bookingId,
            template,
            status,
            resend_id: resendId,
        });
    } catch (err) {
        console.error("[email] logEmail failed:", err);
    }
}

function fmtDate(dateStr) {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

function fmtCurrency(cents) {
    if (cents == null) return "";
    // total_price is stored as decimal euros, not cents
    return Number(cents).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

// ---------------------------------------------------------------------------
// HTML e-mail templates
// ---------------------------------------------------------------------------

function baseLayout(title, body) {
    return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <style>
    body { margin:0; padding:0; background:#f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrapper { max-width:600px; margin:32px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,.08); }
    .header { background:#1A7D5A; padding:28px 32px; text-align:center; }
    .header h1 { color:#fff; margin:0; font-size:26px; font-weight:300; letter-spacing:7px; text-transform:uppercase; }
    .header p { color:rgba(255,255,255,.75); margin:4px 0 0; font-size:13px; }
    .body { padding:32px; }
    .section { margin-bottom:24px; }
    .label { font-size:11px; font-weight:600; color:#888; text-transform:uppercase; letter-spacing:.5px; margin-bottom:4px; }
    .value { font-size:16px; color:#1a1a1a; }
    .highlight-box { background:#f0faf5; border-left:4px solid #1A7D5A; border-radius:6px; padding:16px 20px; margin:20px 0; }
    .highlight-box .code { font-size:28px; font-weight:700; color:#1A7D5A; letter-spacing:4px; font-family:monospace; }
    .qr-section { text-align:center; margin:24px 0; }
    .qr-section img { width:180px; height:180px; border:1px solid #e5e5e5; border-radius:8px; padding:8px; background:#fff; }
    .table { width:100%; border-collapse:collapse; font-size:14px; }
    .table td { padding:8px 0; border-bottom:1px solid #f0f0f0; color:#444; }
    .table td:last-child { text-align:right; font-weight:500; color:#1a1a1a; }
    .total-row td { font-weight:700; font-size:16px; color:#1a1a1a; border-bottom:none; padding-top:12px; }
    .cancel-box { background:#fff8f0; border:1px solid #ffd199; border-radius:8px; padding:16px 20px; font-size:13px; color:#7a5000; }
    .cancel-box strong { display:block; margin-bottom:8px; color:#b36200; }
    .footer { background:#f9f9f9; padding:20px 32px; text-align:center; font-size:12px; color:#aaa; border-top:1px solid #eee; }
    .btn { display:inline-block; background:#1A7D5A; color:#fff !important; text-decoration:none; padding:12px 28px; border-radius:8px; font-size:14px; font-weight:600; margin:16px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>RENTCORE</h1>
      <p>Ihre Buchungsbestätigung</p>
    </div>
    <div class="body">${body}</div>
    <div class="footer">
      RentCore · Powered by funk-e.solutions<br>
      Bei Fragen kontaktieren Sie bitte Ihren Verleiher direkt.
    </div>
  </div>
</body>
</html>`;
}

function confirmationBody(booking, org, qrUrl) {
    const customerName = booking.customer
        ? `${booking.customer.first_name} ${booking.customer.last_name}`
        : (booking.customer_name || "Gast");
    const bikeName = booking.bike?.name || "Fahrrad";
    const days = booking.total_days || 1;
    const checkinUrl = `https://rentcore.de/checkin/${booking.confirmation_code}`;

    return `
    <div class="section">
      <p style="font-size:16px;color:#333">Hallo ${customerName},<br><br>
      vielen Dank für Ihre Buchung! Hier sind Ihre Buchungsdetails auf einen Blick.</p>
    </div>

    <div class="highlight-box">
      <div class="label">Buchungsnummer</div>
      <div class="code">${booking.booking_number || booking.id?.slice(0, 8).toUpperCase()}</div>
    </div>

    ${qrUrl ? `
    <div class="qr-section">
      <div class="label" style="margin-bottom:12px">QR-Code für die Übergabe</div>
      <img src="${qrUrl}" alt="Buchungs-QR-Code">
      <p style="font-size:12px;color:#888;margin-top:8px">Diesen QR-Code bei der Abholung vorzeigen</p>
    </div>` : ""}

    <table class="table">
      <tr><td>Fahrzeug</td><td>${bikeName}</td></tr>
      <tr><td>Abholung</td><td>${fmtDate(booking.start_date)}</td></tr>
      <tr><td>Rückgabe</td><td>${fmtDate(booking.end_date)}</td></tr>
      <tr><td>Dauer</td><td>${days} ${days === 1 ? "Tag" : "Tage"}</td></tr>
      ${org?.address ? `<tr><td>Standort</td><td>${org.address}</td></tr>` : ""}
      <tr class="total-row"><td>Gesamtpreis</td><td>${fmtCurrency(booking.total_price)}</td></tr>
    </table>

    <div class="cancel-box" style="margin-top:24px">
      <strong>Stornierungsbedingungen</strong>
      Kostenlose Stornierung bis 24 Stunden vor Abholung.<br>
      Danach wird eine Bearbeitungsgebühr von 50% des Buchungspreises erhoben.
    </div>

    ${booking.confirmation_code ? `
    <div style="text-align:center;margin-top:24px">
      <a class="btn" href="${checkinUrl}">Buchung einsehen</a>
    </div>` : ""}
  `;
}

function reminderBody(booking, type) {
    const customerName = booking.customer
        ? `${booking.customer.first_name} ${booking.customer.last_name}`
        : (booking.customer_name || "Gast");
    const bikeName = booking.bike?.name || "Fahrrad";
    const dateLabel = type === "pickup" ? "Abholung" : "Rückgabe";
    const date = type === "pickup" ? booking.start_date : booking.end_date;

    return `
    <div class="section">
      <p style="font-size:16px;color:#333">
        Hallo ${customerName},<br><br>
        dies ist eine freundliche Erinnerung: Ihre ${dateLabel} für <strong>${bikeName}</strong> ist
        <strong>morgen, dem ${fmtDate(date)}</strong>.
      </p>
    </div>
    <div class="highlight-box">
      <div class="label">Buchungsnummer</div>
      <div class="code">${booking.booking_number || booking.id?.slice(0, 8).toUpperCase()}</div>
    </div>
    <p style="font-size:13px;color:#888">Bei Fragen wenden Sie sich bitte direkt an Ihren Verleiher.</p>
  `;
}

function receiptBody(booking, org) {
    const customerName = booking.customer
        ? `${booking.customer.first_name} ${booking.customer.last_name}`
        : (booking.customer_name || "Gast");
    const bikeName = booking.bike?.name || "Fahrrad";
    const days = booking.total_days || 1;

    return `
    <div class="section">
      <p style="font-size:16px;color:#333">
        Hallo ${customerName},<br><br>
        Ihre Buchung wurde erfolgreich abgeschlossen. Hier ist Ihre Quittung.
      </p>
    </div>
    <div class="highlight-box">
      <div class="label">Buchungsnummer</div>
      <div class="code">${booking.booking_number || booking.id?.slice(0, 8).toUpperCase()}</div>
    </div>
    <table class="table">
      <tr><td>Fahrzeug</td><td>${bikeName}</td></tr>
      <tr><td>Abholung</td><td>${fmtDate(booking.start_date)}</td></tr>
      <tr><td>Rückgabe</td><td>${fmtDate(booking.end_date)}</td></tr>
      <tr><td>Dauer</td><td>${days} ${days === 1 ? "Tag" : "Tage"}</td></tr>
      ${org?.name ? `<tr><td>Verleiher</td><td>${org.name}</td></tr>` : ""}
      <tr class="total-row"><td>Gesamtbetrag</td><td>${fmtCurrency(booking.total_price)}</td></tr>
    </table>
    <p style="font-size:13px;color:#888;margin-top:24px">
      Wir hoffen, Sie hatten eine angenehme Fahrt und freuen uns auf Ihren nächsten Besuch!
    </p>
  `;
}

// ---------------------------------------------------------------------------
// Public send functions
// ---------------------------------------------------------------------------

/**
 * Send booking confirmation email with embedded QR code.
 * @param {object} booking  - Full booking row (with .customer, .bike populated)
 * @param {object} org      - Organization row (name, email, phone, address)
 * @param {string|null} qrUrl - Public URL of the QR PNG (from Supabase Storage)
 * @returns {{ resend_id: string|null, error: string|null }}
 */
export async function sendBookingConfirmation(booking, org, qrUrl = null) {
    const to = booking.customer?.email;
    if (!to) return { resend_id: null, error: "no_email" };

    const subject = `Buchungsbestätigung ${booking.booking_number || booking.id?.slice(0, 8).toUpperCase()} – ${org?.name || "RentCore"}`;

    try {
        const { data, error } = await resend.emails.send({
            from: FROM,
            to,
            subject,
            html: baseLayout(subject, confirmationBody(booking, org, qrUrl)),
        });
        if (error) throw error;
        return { resend_id: data?.id ?? null, error: null };
    } catch (err) {
        console.error("[email] sendBookingConfirmation failed:", err);
        return { resend_id: null, error: String(err?.message ?? err) };
    }
}

/**
 * Pickup reminder — sent 24 h before start_date via cron.
 */
export async function sendPickupReminder(booking) {
    const to = booking.customer?.email;
    if (!to) return { resend_id: null, error: "no_email" };

    const bikeName = booking.bike?.name || "Ihrem Fahrrad";
    const subject = `Erinnerung: Abholung morgen – ${bikeName}`;

    try {
        const { data, error } = await resend.emails.send({
            from: FROM,
            to,
            subject,
            html: baseLayout(subject, reminderBody(booking, "pickup")),
        });
        if (error) throw error;
        return { resend_id: data?.id ?? null, error: null };
    } catch (err) {
        console.error("[email] sendPickupReminder failed:", err);
        return { resend_id: null, error: String(err?.message ?? err) };
    }
}

/**
 * Return reminder — sent 24 h before end_date via cron.
 */
export async function sendReturnReminder(booking) {
    const to = booking.customer?.email;
    if (!to) return { resend_id: null, error: "no_email" };

    const bikeName = booking.bike?.name || "Ihrem Fahrrad";
    const subject = `Erinnerung: Rückgabe morgen – ${bikeName}`;

    try {
        const { data, error } = await resend.emails.send({
            from: FROM,
            to,
            subject,
            html: baseLayout(subject, reminderBody(booking, "return")),
        });
        if (error) throw error;
        return { resend_id: data?.id ?? null, error: null };
    } catch (err) {
        console.error("[email] sendReturnReminder failed:", err);
        return { resend_id: null, error: String(err?.message ?? err) };
    }
}

/**
 * Receipt after return is completed.
 */
export async function sendReceipt(booking, org) {
    const to = booking.customer?.email;
    if (!to) return { resend_id: null, error: "no_email" };

    const subject = `Quittung ${booking.booking_number || booking.id?.slice(0, 8).toUpperCase()} – ${org?.name || "RentCore"}`;

    try {
        const { data, error } = await resend.emails.send({
            from: FROM,
            to,
            subject,
            html: baseLayout(subject, receiptBody(booking, org)),
        });
        if (error) throw error;
        return { resend_id: data?.id ?? null, error: null };
    } catch (err) {
        console.error("[email] sendReceipt failed:", err);
        return { resend_id: null, error: String(err?.message ?? err) };
    }
}
