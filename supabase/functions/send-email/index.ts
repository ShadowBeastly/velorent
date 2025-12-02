// =====================================================
// VELORENT PRO - E-MAIL SERVICE
// Supabase Edge Function mit Resend
// =====================================================
// 
// SETUP:
// 1. Resend.com Account erstellen (kostenlos bis 3000 E-Mails/Monat)
// 2. API Key erstellen: https://resend.com/api-keys
// 3. Domain verifizieren: https://resend.com/domains
// 4. In Supabase: Settings → Edge Functions → Secrets
//    → RESEND_API_KEY = "re_xxxxx"
// 5. Deploy: supabase functions deploy send-email
//
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "VeloRent Pro <noreply@velorent.de>"; // Anpassen!

// E-Mail Templates
const templates = {
  // Buchungsbestätigung an Kunden
  booking_confirmation: (data) => ({
    subject: `Buchungsbestätigung #${data.booking_number}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #f97316, #fbbf24); padding: 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🚴 Buchungsbestätigung</h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 32px;">
            <p style="font-size: 18px; color: #1e293b; margin: 0 0 24px;">
              Hallo ${data.customer_name},
            </p>
            
            <p style="color: #475569; line-height: 1.6; margin: 0 0 24px;">
              vielen Dank für Ihre Buchung bei <strong>${data.organization_name}</strong>! 
              Hier sind Ihre Buchungsdetails:
            </p>
            
            <!-- Booking Details Box -->
            <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin: 0 0 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Buchungsnummer</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #f97316; font-size: 18px;">${data.booking_number}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Fahrrad</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: 500; color: #1e293b;">${data.bike_name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Zeitraum</td>
                  <td style="padding: 8px 0; text-align: right; color: #1e293b;">${data.start_date} – ${data.end_date}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Dauer</td>
                  <td style="padding: 8px 0; text-align: right; color: #1e293b;">${data.total_days} Tage</td>
                </tr>
                <tr style="border-top: 1px solid #e2e8f0;">
                  <td style="padding: 16px 0 8px; color: #1e293b; font-weight: 600;">Gesamtpreis</td>
                  <td style="padding: 16px 0 8px; text-align: right; font-weight: 700; color: #1e293b; font-size: 20px;">${data.total_price}</td>
                </tr>
                ${data.deposit ? `
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Kaution</td>
                  <td style="padding: 8px 0; text-align: right; color: #64748b;">${data.deposit}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            <!-- Status Badge -->
            <div style="text-align: center; margin: 0 0 24px;">
              <span style="display: inline-block; background: ${data.status === 'confirmed' ? '#dcfce7' : '#fef3c7'}; color: ${data.status === 'confirmed' ? '#16a34a' : '#d97706'}; padding: 8px 16px; border-radius: 20px; font-weight: 500;">
                ${data.status === 'confirmed' ? '✓ Bestätigt' : '⏳ Reserviert – Bestätigung folgt'}
              </span>
            </div>
            
            <!-- Pickup Info -->
            ${data.pickup_location ? `
            <div style="background: #eff6ff; border-radius: 12px; padding: 16px; margin: 0 0 24px;">
              <p style="margin: 0; color: #1e40af; font-weight: 500;">📍 Abholung</p>
              <p style="margin: 8px 0 0; color: #3b82f6;">${data.pickup_location}</p>
            </div>
            ` : ''}
            
            <!-- Contact -->
            <div style="border-top: 1px solid #e2e8f0; padding-top: 24px;">
              <p style="color: #64748b; margin: 0 0 8px; font-size: 14px;">Bei Fragen erreichen Sie uns unter:</p>
              <p style="color: #1e293b; margin: 0;">
                ${data.organization_phone ? `📞 ${data.organization_phone}<br>` : ''}
                ${data.organization_email ? `✉️ ${data.organization_email}` : ''}
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              ${data.organization_name} • ${data.organization_address || ''}<br>
              Diese E-Mail wurde automatisch versendet via VeloRent Pro
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  // Neue Buchung an Hotel
  new_booking_notification: (data) => ({
    subject: `🚴 Neue Buchung #${data.booking_number} – ${data.customer_name}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <div style="background: linear-gradient(135deg, #3b82f6, #06b6d4); padding: 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Neue Buchung eingegangen!</h1>
          </div>
          
          <div style="padding: 32px;">
            <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin: 0 0 24px;">
              <h2 style="margin: 0 0 16px; color: #1e293b;">#${data.booking_number}</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b; width: 120px;">Kunde</td>
                  <td style="padding: 8px 0; font-weight: 500; color: #1e293b;">${data.customer_name}</td>
                </tr>
                ${data.customer_phone ? `
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Telefon</td>
                  <td style="padding: 8px 0; color: #1e293b;"><a href="tel:${data.customer_phone}" style="color: #3b82f6;">${data.customer_phone}</a></td>
                </tr>
                ` : ''}
                ${data.customer_email ? `
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">E-Mail</td>
                  <td style="padding: 8px 0; color: #1e293b;"><a href="mailto:${data.customer_email}" style="color: #3b82f6;">${data.customer_email}</a></td>
                </tr>
                ` : ''}
                <tr style="border-top: 1px solid #e2e8f0;">
                  <td style="padding: 16px 0 8px; color: #64748b;">Fahrrad</td>
                  <td style="padding: 16px 0 8px; font-weight: 500; color: #1e293b;">${data.bike_name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Zeitraum</td>
                  <td style="padding: 8px 0; color: #1e293b;">${data.start_date} – ${data.end_date} (${data.total_days} Tage)</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Preis</td>
                  <td style="padding: 8px 0; font-weight: 600; color: #16a34a; font-size: 18px;">${data.total_price}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Quelle</td>
                  <td style="padding: 8px 0; color: #1e293b;">
                    <span style="background: ${data.source === 'website' ? '#dbeafe' : '#f3f4f6'}; color: ${data.source === 'website' ? '#2563eb' : '#4b5563'}; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">
                      ${data.source === 'website' ? '🌐 Website' : '📝 Manuell'}
                    </span>
                  </td>
                </tr>
              </table>
            </div>
            
            ${data.notes ? `
            <div style="background: #fffbeb; border-radius: 8px; padding: 16px; margin: 0 0 24px;">
              <p style="margin: 0; color: #92400e; font-weight: 500;">📝 Kundennotiz:</p>
              <p style="margin: 8px 0 0; color: #78350f;">${data.notes}</p>
            </div>
            ` : ''}
            
            <a href="${data.dashboard_url}" style="display: block; text-align: center; background: linear-gradient(135deg, #f97316, #fbbf24); color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 600;">
              Im Dashboard öffnen →
            </a>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  // Erinnerung: Abholung heute
  pickup_reminder: (data) => ({
    subject: `⏰ Erinnerung: Abholung heute – ${data.customer_name}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden;">
          <div style="background: #fbbf24; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0;">⏰ Abholung heute</h1>
          </div>
          <div style="padding: 32px;">
            <p style="font-size: 16px; color: #475569; margin: 0 0 24px;">
              Heute steht eine Abholung an:
            </p>
            <div style="background: #f8fafc; border-radius: 12px; padding: 20px;">
              <p style="margin: 0 0 8px;"><strong>Kunde:</strong> ${data.customer_name}</p>
              <p style="margin: 0 0 8px;"><strong>Fahrrad:</strong> ${data.bike_name}</p>
              <p style="margin: 0 0 8px;"><strong>Telefon:</strong> ${data.customer_phone || '–'}</p>
              <p style="margin: 0;"><strong>Buchung:</strong> #${data.booking_number}</p>
            </div>
            <a href="${data.dashboard_url}" style="display: block; margin-top: 24px; text-align: center; background: #f97316; color: white; padding: 14px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Buchung öffnen
            </a>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  // Erinnerung: Rückgabe heute
  return_reminder: (data) => ({
    subject: `🔄 Erinnerung: Rückgabe heute – ${data.customer_name}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden;">
          <div style="background: #3b82f6; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0;">🔄 Rückgabe heute</h1>
          </div>
          <div style="padding: 32px;">
            <p style="font-size: 16px; color: #475569; margin: 0 0 24px;">
              Heute wird ein Fahrrad zurückgegeben:
            </p>
            <div style="background: #f8fafc; border-radius: 12px; padding: 20px;">
              <p style="margin: 0 0 8px;"><strong>Kunde:</strong> ${data.customer_name}</p>
              <p style="margin: 0 0 8px;"><strong>Fahrrad:</strong> ${data.bike_name}</p>
              <p style="margin: 0 0 8px;"><strong>Seit:</strong> ${data.start_date}</p>
              <p style="margin: 0;"><strong>Buchung:</strong> #${data.booking_number}</p>
            </div>
            <a href="${data.dashboard_url}" style="display: block; margin-top: 24px; text-align: center; background: #f97316; color: white; padding: 14px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Rückgabe bestätigen
            </a>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  // Willkommens-E-Mail nach Signup
  welcome: (data) => ({
    subject: `Willkommen bei VeloRent Pro! 🚴`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #f97316, #fbbf24); padding: 40px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Willkommen bei VeloRent Pro!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 16px 0 0;">Ihr Fahrradverleih, digital.</p>
          </div>
          
          <div style="padding: 32px;">
            <p style="font-size: 18px; color: #1e293b; margin: 0 0 16px;">
              Hallo ${data.name},
            </p>
            
            <p style="color: #475569; line-height: 1.6; margin: 0 0 24px;">
              schön, dass Sie dabei sind! In wenigen Schritten können Sie Ihren Fahrradverleih vollständig digitalisieren.
            </p>
            
            <h3 style="color: #1e293b; margin: 0 0 16px;">🚀 Erste Schritte:</h3>
            
            <div style="margin: 0 0 24px;">
              ${[
                { icon: "1️⃣", title: "Räder hinzufügen", desc: "Tragen Sie Ihre Fahrräder mit Preis und Details ein" },
                { icon: "2️⃣", title: "Erste Buchung erstellen", desc: "Erfassen Sie eine Test-Buchung im Kalender" },
                { icon: "3️⃣", title: "Widget aktivieren", desc: "Lassen Sie Kunden online auf Ihrer Website buchen" }
              ].map(step => `
                <div style="display: flex; gap: 16px; margin: 0 0 16px; padding: 16px; background: #f8fafc; border-radius: 12px;">
                  <div style="font-size: 24px;">${step.icon}</div>
                  <div>
                    <p style="margin: 0 0 4px; font-weight: 600; color: #1e293b;">${step.title}</p>
                    <p style="margin: 0; color: #64748b; font-size: 14px;">${step.desc}</p>
                  </div>
                </div>
              `).join('')}
            </div>
            
            <a href="${data.dashboard_url}" style="display: block; text-align: center; background: linear-gradient(135deg, #f97316, #fbbf24); color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px;">
              Zum Dashboard →
            </a>
            
            <p style="color: #64748b; font-size: 14px; margin: 24px 0 0; text-align: center;">
              Fragen? Antworten Sie einfach auf diese E-Mail.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  })
};

// Main Handler
serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }

  try {
    const { type, to, data } = await req.json();

    // Template holen
    const template = templates[type];
    if (!template) {
      throw new Error(`Unknown email type: ${type}`);
    }

    const { subject, html } = template(data);

    // An Resend senden
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to send email");
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
});
