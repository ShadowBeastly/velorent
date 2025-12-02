# 🚀 VELORENT PRO - LAUNCH GUIDE

## DIE ERSTEN EUROS KASSIEREN - SCHRITT FÜR SCHRITT

---

## ⏱️ ZEITPLAN

| Phase | Dauer | Was |
|-------|-------|-----|
| Setup | 1 Stunde | Supabase + Vercel + Domain |
| Config | 30 Min | E-Mail + Legal anpassen |
| Test | 15 Min | Alles durchklicken |
| **LIVE** | - | 🎉 |
| Sales | Rest des Tages | Anrufe machen |

---

## 🔧 PHASE 1: TECHNISCHES SETUP (1 Stunde)

### 1.1 Supabase Projekt erstellen (10 Min)

1. Gehe zu [supabase.com](https://supabase.com) → "Start your project"
2. GitHub Login oder neuen Account
3. "New Project" erstellen:
   - Name: `velorent-prod`
   - Database Password: SICHER NOTIEREN!
   - Region: `eu-central-1` (Frankfurt) ← WICHTIG für DSGVO
4. Warten bis Projekt ready ist (~2 Min)

### 1.2 Datenbank einrichten (15 Min)

1. In Supabase: **SQL Editor** (linke Sidebar)
2. "New Query" → Inhalt einfügen → "Run"

**In dieser Reihenfolge ausführen:**

```
1. supabase-schema.sql          (Basis-Tabellen)
2. supabase-public-booking.sql  (Widget-Funktionen)
3. supabase/stripe-integration.sql (Stripe-Felder)
4. supabase/demo-seed-data.sql  (Demo-Daten) ← OPTIONAL
```

### 1.3 Supabase Auth aktivieren (5 Min)

1. **Authentication** → **Providers**
2. **Email** aktivieren (sollte default sein)
3. **Settings** → **Email Templates** → Optional: Deutsche Texte
4. **URL Configuration**:
   - Site URL: `https://deine-domain.de` (später anpassen)

### 1.4 API Keys kopieren (2 Min)

1. **Settings** → **API**
2. Kopiere:
   - `Project URL` → z.B. `https://abcdefgh.supabase.co`
   - `anon public` Key → langer String

### 1.5 Code konfigurieren (5 Min)

Öffne `src/main.jsx` und ersetze Zeile 11-12:

```javascript
const SUPABASE_URL = 'https://DEIN_PROJEKT.supabase.co';
const SUPABASE_ANON_KEY = 'DEIN_ANON_KEY_HIER';
```

### 1.6 Vercel Deployment (15 Min)

1. Code auf GitHub pushen:
```bash
cd velorent-saas
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/DEIN_USER/velorent.git
git push -u origin main
```

2. Gehe zu [vercel.com](https://vercel.com) → GitHub Login
3. "Import Project" → Dein Repo wählen
4. **Environment Variables** hinzufügen:
   - `VITE_SUPABASE_URL` = deine Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = dein Anon Key
5. "Deploy" klicken → Warten (~2 Min)

### 1.7 Custom Domain (Optional, 5 Min)

1. In Vercel: **Settings** → **Domains**
2. Domain hinzufügen: `app.velorent.de` oder ähnlich
3. DNS Einstellungen bei deinem Provider anpassen

---

## 📧 PHASE 2: E-MAIL SETUP (15 Min)

### 2.1 Resend Account

1. Gehe zu [resend.com](https://resend.com) → Sign up (kostenlos)
2. **API Keys** → Create API Key → Kopieren
3. **Domains** → Add Domain → DNS Records hinzufügen
   - Oder: Mit `@resend.dev` testen (Limits beachten)

### 2.2 Supabase Edge Function

1. Installiere Supabase CLI:
```bash
npm install -g supabase
```

2. Login & Link:
```bash
supabase login
supabase link --project-ref DEIN_PROJECT_REF
```

3. Secrets setzen:
```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxx
```

4. Function deployen:
```bash
supabase functions deploy send-email
```

---

## 💳 PHASE 3: STRIPE SETUP (30 Min) - KANN SPÄTER!

> ⚠️ Stripe kann warten! Erstmal mit Free-Tier starten und manuell abrechnen.

### Wenn du bereit bist:

1. [stripe.com](https://stripe.com) → Account erstellen
2. **Produkte** anlegen:
   - Starter: 29€/Monat (Price ID kopieren)
   - Pro: 79€/Monat (Price ID kopieren)
3. **Webhooks** einrichten:
   - Endpoint: `https://DEIN_PROJEKT.supabase.co/functions/v1/stripe-webhook`
   - Events: `checkout.session.completed`, `customer.subscription.*`
4. Secrets in Supabase:
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
supabase secrets set STRIPE_STARTER_MONTHLY_PRICE_ID=price_xxx
supabase secrets set STRIPE_PRO_MONTHLY_PRICE_ID=price_xxx
```
5. Functions deployen:
```bash
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook
```

---

## ⚖️ PHASE 4: LEGAL ANPASSEN (15 Min)

### PFLICHT vor Go-Live!

Öffne `src/LegalPages.jsx` und ersetze alle Platzhalter:

1. **Impressum** (Zeile 50-79):
   - `[DEIN NAME / FIRMA]` → Dein echter Name/Firma
   - `[Straße und Hausnummer]` → Deine Adresse
   - `[PLZ Ort]` → Deine PLZ + Stadt
   - `[+49 XXX XXXXXXX]` → Deine Telefonnummer
   - `[kontakt@velorent.de]` → Deine E-Mail
   - `[DE XXXXXXXXX]` → Deine USt-ID (falls vorhanden)

2. **Datenschutz** (Zeile 176-185):
   - Gleiche Kontaktdaten wie Impressum

3. **AGB** (Zeile 262):
   - `[DEIN NAME/FIRMA]` → Dein Name/Firma
   - `[ORT]` → Dein Gerichtsstand

> 💡 **Tipp**: Falls du noch keine Firma hast, nutze deinen Klarnamen.
> Für UG/GmbH später rechtliche Beratung holen.

---

## ✅ PHASE 5: FINAL CHECK (10 Min)

### Checkliste vor Go-Live:

```
□ Landing Page lädt
□ Signup funktioniert (Test-Account)
□ Login funktioniert
□ Dashboard zeigt Demo-Daten (wenn seed-data ausgeführt)
□ Neues Rad anlegen funktioniert
□ Buchung erstellen funktioniert
□ Impressum erreichbar & korrekt
□ Datenschutz erreichbar & korrekt
□ AGB erreichbar & korrekt
□ Mobile Ansicht ok
```

---

## 🎯 PHASE 6: ERSTE KUNDEN GEWINNEN

### HEUTE NOCH:

#### Option A: Kaltakquise (empfohlen)

1. **Google Maps öffnen**
2. Suche: "Hotel [deine Stadt]" oder "Fahrradverleih [deine Stadt]"
3. **10 Nummern rausschreiben**
4. **Anrufen** mit diesem Script:

```
"Guten Tag, [Name] hier. Ich hab eine kurze Frage:
Verleihen Sie auch Fahrräder an Ihre Gäste?

[Wenn ja:]
Super! Ich hab eine Software entwickelt für genau sowas –
Buchungskalender, Kundenverwaltung, Online-Buchung für Ihre Website.
Darf ich Ihnen das mal in 10 Minuten zeigen? Kostenlos natürlich."
```

#### Option B: LinkedIn Outreach

1. Suche: "Hotelmanager" / "Hoteldirektor" / "Rezeptionsleitung"
2. Verbindungsanfrage mit Nachricht:

```
Hallo [Name],

ich habe eine Software für Fahrradverleih entwickelt –
speziell für Hotels. Buchungskalender, Online-Widget, etc.

Haben Sie 10 Min für eine kurze Demo? Erste 3 Monate kostenlos.

Beste Grüße
[Dein Name]
```

#### Option C: Lokale Facebook-Gruppen

1. Suche Gruppen: "Hoteliers [Region]", "Tourismus [Region]"
2. Poste:

```
🚴 Fahrradverleih-Software für Hotels

Wir haben eine einfache Software entwickelt für Hotels,
die Räder an Gäste verleihen:

✅ Buchungskalender
✅ Kundenverwaltung  
✅ Online-Buchung auf eurer Website
✅ Deutsche Server (DSGVO)

Wer Interesse hat: PN oder Kommentar!
Erste 50 Kunden: 50% Rabatt lebenslang 🎁
```

---

## 💰 PRICING EMPFEHLUNG

### Launch-Pricing (aggressiv):

| Plan | Preis | Für wen |
|------|-------|---------|
| Free | 0€ | Lead Gen, 3 Räder |
| Starter | 29€/Monat | Kleine Verleiher |
| Pro | 79€/Monat | Hotels |

### Sales-Taktik:

1. **Erste 10 Kunden**: 50% Rabatt LEBENSLANG
   - "Wenn Sie heute starten: 14,50€ statt 29€ – für immer"
2. **Demo anbieten**: Immer kostenlos zeigen
3. **Trial**: 14 Tage kostenlos, keine Kreditkarte
4. **Urgency**: "Nur noch 3 Plätze mit Rabatt"

---

## 📊 ERSTE WOCHE - ZIELE

| Tag | Ziel |
|-----|------|
| Tag 1 | 10 Anrufe, 3 Demos |
| Tag 2 | 10 Anrufe, 3 Demos |
| Tag 3 | Follow-ups, 5 neue Anrufe |
| Tag 4 | **Erster zahlender Kunde!** |
| Tag 5 | 2. Kunde, Testimonial holen |
| Tag 6-7 | LinkedIn Content, Feedback einarbeiten |

---

## 🛠️ SUPPORT-FRAGEN BEANTWORTEN

### "Ist das DSGVO-konform?"
> "Ja, alle Daten liegen auf deutschen Servern in Frankfurt.
> Wir nutzen Supabase mit EU-Hosting."

### "Kann ich meine Daten exportieren?"
> "Ja, jederzeit als CSV. Und bei Kündigung haben Sie 30 Tage Zeit."

### "Was wenn's nicht funktioniert?"
> "14 Tage kostenlos testen, keine Kreditkarte nötig.
> Und ich helfe persönlich beim Setup."

### "Haben Sie Referenzen?"
> "Wir sind neu am Markt, daher der Einführungspreis.
> Nach 3 Monaten machen wir gerne eine Case Study zusammen."

---

## 🆘 TROUBLESHOOTING

### "Supabase SQL Error"
→ SQL Dateien in richtiger Reihenfolge ausführen

### "Auth funktioniert nicht"
→ Email Provider in Supabase aktiviert?
→ Site URL korrekt gesetzt?

### "Vercel Build failed"
→ `npm run build` lokal testen
→ Environment Variables in Vercel gesetzt?

### "E-Mails kommen nicht an"
→ Resend Domain verifiziert?
→ Edge Function deployed?
→ Spam-Ordner checken

---

## 📁 DATEI-ÜBERSICHT

```
velorent-saas/
├── src/
│   ├── main.jsx          ← Entry Point + Router
│   ├── App.jsx           ← Haupt-Dashboard
│   ├── LandingPage.jsx   ← Marketing-Seite
│   ├── LegalPages.jsx    ← Impressum, Datenschutz, AGB
│   ├── BookingWidget.jsx ← Öffentliches Widget
│   ├── WidgetSettings.jsx← Widget-Konfiguration
│   └── index.css         ← Tailwind Styles
├── supabase/
│   ├── functions/
│   │   ├── send-email/   ← E-Mail Versand
│   │   ├── create-checkout/ ← Stripe Checkout
│   │   └── stripe-webhook/  ← Stripe Events
│   ├── demo-seed-data.sql   ← Demo-Daten
│   └── stripe-integration.sql ← Stripe-Felder
├── supabase-schema.sql      ← Haupt-Datenbank
├── supabase-public-booking.sql ← Widget-Backend
├── package.json
├── vite.config.js
└── README.md               ← Diese Datei
```

---

## 🎉 LOS GEHT'S!

1. ✅ Supabase aufsetzen
2. ✅ Vercel deployen
3. ✅ Legal anpassen
4. ✅ Testen
5. 📞 **ANRUFEN UND VERKAUFEN!**

**Der beste Zeitpunkt war gestern. Der zweitbeste ist JETZT.**

---

*Bei Fragen: Support-System einrichten oder direkt auf Feedback reagieren.*
