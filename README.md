# VeloRent Pro - Cloud SaaS für Fahrradvermietung

## 🚀 Überblick

VeloRent Pro ist ein vollständiges, cloud-basiertes SaaS für Fahrradverleiher, Hotels, und Tourismusbetriebe. Multi-Tenant-fähig – jeder Kunde hat seine eigene isolierte Datenbank.

### Features
- ✅ **Multi-Tenant Architektur** - Verkaufe an beliebig viele Kunden
- ✅ **Benutzerauthentifizierung** - Login, Registrierung, Team-Einladungen
- ✅ **Buchungskalender** - Monats- und Wochenansicht
- ✅ **Flottenmanagement** - E-Bikes, Lastenräder, Kinderräder, etc.
- ✅ **Kundenverwaltung** - CRM mit Umsatztracking
- ✅ **Statistiken** - Umsatz, Auslastung, Status-Verteilung
- ✅ **Row Level Security** - Kunden sehen nur ihre eigenen Daten
- ✅ **Responsive Design** - Desktop & Mobile
- ✅ **Dark Mode** - Hell/Dunkel-Umschaltung

---

## 🌐 NEU: Öffentliches Buchungswidget

Hotels können ein Buchungswidget auf ihrer Website einbetten. Kunden buchen selbst – ohne fremde Kundendaten zu sehen!

### Sicherheitskonzept
- ✅ **Keine Kundendaten sichtbar** - Widget zeigt nur verfügbare Räder und Zeiträume
- ✅ **Eigener API-Key pro Hotel** - Isolierte Zugriffskontrolle
- ✅ **CORS-geschützt** - Nur erlaubte Domains
- ✅ **Supabase RLS** - Row Level Security auf Datenbankebene

### So funktioniert's
1. Hotel aktiviert Widget im Dashboard → Einstellungen → Widget
2. Hotel kopiert den Einbettungscode
3. Code wird auf Hotel-Website eingefügt
4. Kunden können sofort buchen!

### Dateien
- `supabase-public-booking.sql` - Datenbank-Erweiterung
- `src/BookingWidget.jsx` - React Widget-Komponente
- `src/WidgetSettings.jsx` - Admin-Einstellungen
- `widget-embed-example.html` - Komplettes Beispiel

---

## 📋 Setup-Anleitung (30 Minuten)

### 1. Supabase Projekt erstellen (kostenlos)

1. Gehe zu [supabase.com](https://supabase.com) und erstelle einen Account
2. Klicke auf "New Project"
3. Wähle einen Namen (z.B. "velorent-prod")
4. Wähle ein starkes Passwort und eine Region (eu-central-1 für Deutschland)
5. Warte ~2 Minuten bis das Projekt erstellt ist

### 2. Datenbank-Schema importieren

1. In Supabase: Gehe zu **SQL Editor** (linke Sidebar)
2. Klicke auf "+ New Query"
3. Kopiere den Inhalt von `supabase-schema.sql` → Run
4. Dann `supabase-public-booking.sql` → Run
5. ✅ Du solltest "Success" sehen

### 3. Authentication einrichten

1. Gehe zu **Authentication** → **Providers**
2. Stelle sicher, dass "Email" aktiviert ist
3. Optional: Aktiviere weitere Provider (Google, GitHub, etc.)
4. Gehe zu **Authentication** → **URL Configuration**
5. Füge deine Domain hinzu (z.B. `https://velorent.de`)

### 4. API Keys holen

1. Gehe zu **Settings** → **API**
2. Kopiere:
   - **Project URL** (z.B. `https://xxxxx.supabase.co`)
   - **anon public** Key (unter "Project API keys")

### 5. React App konfigurieren

Öffne `VeloRentApp.jsx` und ersetze die Platzhalter:

```javascript
// Zeile 15-16
const SUPABASE_URL = "https://DEIN_PROJEKT.supabase.co";
const SUPABASE_ANON_KEY = "DEIN_ANON_KEY_HIER";
```

### 6. Deployment

#### Option A: Vercel (empfohlen, kostenlos)

1. Pushe dein Projekt zu GitHub
2. Gehe zu [vercel.com](https://vercel.com)
3. Importiere dein GitHub Repository
4. Framework: "Vite" oder "Create React App"
5. Environment Variables hinzufügen:
   ```
   VITE_SUPABASE_URL=https://xxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJxxx...
   ```
6. Deploy! 🚀

#### Option B: Netlify

1. Ähnlich wie Vercel
2. Build Command: `npm run build`
3. Publish Directory: `dist` oder `build`

#### Option C: Eigener Server

```bash
npm install
npm run build
# Upload dist/ folder to your server
```

---

## 💰 Monetarisierung / Verkauf an Hotels

### Preismodelle (Beispiel)

| Plan | Preis/Monat | Features |
|------|------------|----------|
| **Free** | 0€ | 5 Räder, 1 User, Basis-Features |
| **Starter** | 29€ | 20 Räder, 3 User, Reports |
| **Pro** | 79€ | Unlimited Räder, 10 User, API |
| **Enterprise** | 199€+ | White-Label, Support, Custom |

### Stripe Integration

1. Erstelle einen Stripe Account
2. Nutze Supabase Functions für Webhooks
3. Oder integriere Stripe Checkout direkt

### White-Label Option

Für Enterprise-Kunden:
- Custom Domain (hotel-name.velorent.app)
- Logo-Upload
- Angepasste Farben
- Eigene E-Mail-Templates

---

## 🔧 Technische Details

### Stack
- **Frontend**: React 18 + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Charts**: Recharts
- **Icons**: Lucide React

### Datenbank-Tabellen

| Tabelle | Beschreibung |
|---------|-------------|
| `organizations` | Tenants (Hotels, Verleiher) |
| `profiles` | User-Profile |
| `organization_members` | User ↔ Org Verknüpfung |
| `bikes` | Fahrräder/Mietobjekte |
| `customers` | Endkunden |
| `bookings` | Buchungen |
| `invoices` | Rechnungen |
| `maintenance_logs` | Wartungshistorie |
| `locations` | Standorte (Multi-Location) |
| `pricing_rules` | Dynamische Preise |

### Row Level Security

Jede Tabelle hat RLS-Policies, die sicherstellen:
- User sehen nur Daten ihrer Organisation(en)
- Admins können Daten verwalten
- Viewer haben nur Lesezugriff

---

## 📱 Mobile App (Optional)

Die Web-App ist vollständig responsive. Für native Apps:

1. **React Native**: Gleiche Codebase nutzen
2. **Capacitor**: Web-App als native App wrappen
3. **PWA**: Manifest.json hinzufügen für "Add to Homescreen"

---

## 🔐 Sicherheit

- [x] Row Level Security auf allen Tabellen
- [x] Verschlüsselte Passwörter (Supabase Auth)
- [x] HTTPS erzwungen
- [x] SQL Injection Prevention (Prepared Statements)
- [x] XSS Protection (React Default)

### Empfehlungen für Produktion
1. Aktiviere 2FA in Supabase Dashboard
2. Setze API Rate Limits
3. Konfiguriere Backup-Retention
4. Monitoring einrichten (z.B. Sentry)

---

## 📈 Nächste Schritte

### Phase 1 (MVP) ✅
- [x] Auth & Multi-Tenancy
- [x] Buchungskalender
- [x] Flottenverwaltung
- [x] Dashboard

### Phase 2 (Growth) 🔄
- [x] **Öffentliches Buchungswidget** ← NEU!
- [ ] E-Mail-Benachrichtigungen (Buchungsbestätigung)
- [ ] PDF-Mietverträge
- [ ] Stripe Payments

### Phase 3 (Enterprise)
- [ ] API für Drittanbieter
- [ ] Booking.com Integration
- [ ] White-Label
- [ ] Mobile App

---

## 🆘 Support

Bei Fragen oder Problemen:
1. Supabase Docs: https://supabase.com/docs
2. React Docs: https://react.dev
3. Tailwind Docs: https://tailwindcss.com/docs

---

## 📄 Lizenz

Dieses Projekt ist für kommerzielle Nutzung freigegeben. Du darfst es verkaufen, modifizieren und unter deinem eigenen Branding vertreiben.

---

**Viel Erfolg beim Verkauf an Hotels! 🏨🚴‍♂️**
