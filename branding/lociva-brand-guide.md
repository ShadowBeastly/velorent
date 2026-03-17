# Lociva Brand Guide

## Logo

**Typ:** Versalien Wortmarke (Uppercase Light)

**Schreibweise:** Immer LOCIVA in Versalien. Nie "Lociva", "lociva" oder "LocIva" im Logo. In Fließtext ist "Lociva" korrekt.

**Typografie:** System font stack (system-ui, -apple-system, Segoe UI, Helvetica, Arial), font-weight 300 (Light), letter-spacing 6-8px.

**Dateien:**
- `lociva-logo-primary.svg` — Vollständig mit Tagline, für helle Hintergründe
- `lociva-logo-wordmark.svg` — Nur Wortmarke ohne Tagline
- `lociva-logo-dark.svg` — Für dunkle Hintergründe
- `lociva-icon.svg` — App-Icon / Favicon (grünes Quadrat mit weißem "L")

**Schutzzone:** Mindestabstand zum Logo = Höhe des Buchstabens "L" auf allen Seiten.

**Mindestgröße:** Wortmarke nicht kleiner als 80px Breite digital, 20mm im Druck.

---

## Tagline

**Primär (EN):** Local experiences, one scan away.
**Sekundär (DE):** Lokale Erlebnisse. Einfach. Hier.

Die englische Tagline ist Standard. Die deutsche Version wird auf deutschsprachigen Print-Materialien verwendet wenn die Zielgruppe primär deutschsprachig ist. Auf der QR-Karte im Hotelzimmer: Englisch (internationale Gäste).

---

## Farbpalette: Waldgrün

| Rolle | Name | HEX | Verwendung |
|-------|------|-----|-----------|
| Primary | Waldgrün | #1A7D5A | Logo, Buttons, Links, Akzente |
| Light | Waldgrün Light | #3BAA82 | Hover-States, Sekundär-Akzente |
| Tint | Waldgrün Tint | #D4EDE2 | Hintergründe, Badges, Highlights |
| Dark | Forest | #1E2D26 | Text, Headlines, dunkle Hintergründe |
| Background | Offwhite | #F5FAF7 | Page-Hintergrund, Cards |

### Zusatzfarben (sparsam)
| Rolle | HEX | Verwendung |
|-------|-----|-----------|
| Error | #DC3545 | Fehlermeldungen, Storno |
| Warning | #F59E0B | Hinweise, Fast-ausgebucht |
| Success | #10B981 | Buchung bestätigt |
| Neutral | #6B7280 | Sekundärtext, Platzhalter |

### Farbregeln
- Primary (#1A7D5A) nur für interaktive Elemente und das Logo. Nie für große Flächen.
- Tint (#D4EDE2) für dezente Hintergründe und Badges.
- Dark (#1E2D26) als Textfarbe statt reinem Schwarz (#000).
- Offwhite (#F5FAF7) als Seitenhintergrund statt reinem Weiß (#FFF).
- Kontrastverhältnis WCAG AA einhalten: Primary auf Weiß = 4.8:1 ✓

---

## Typografie

### Headlines
- Font: System font stack
- Weight: 500 (Medium) oder 300 (Light für große Headlines)
- Farbe: #1E2D26 (Forest)

### Body Text
- Font: System font stack
- Weight: 400 (Regular)
- Size: 16px (Desktop), 15px (Mobile)
- Line-height: 1.6
- Farbe: #1E2D26 mit opacity 0.85

### Labels / Small
- Font: System font stack
- Weight: 400-500
- Size: 12-13px
- Farbe: #6B7280 (Neutral)

### Warum System Fonts?
- Keine Ladezeit für externe Fonts
- Sieht auf jedem Gerät nativ aus
- Perfekt für Mobile-First (95% der Gäste nutzen Handy)
- Kann jederzeit durch eine Custom Font ersetzt werden (z.B. Inter, DM Sans)

---

## Tone of Voice

### Für Hotelgäste (B2C)
- Einfach, direkt, freundlich
- Keine Fachbegriffe, kein Marketing-Sprech
- Aktiv statt passiv ("Buche jetzt" statt "Es kann gebucht werden")
- Sprachen: Deutsch / Englisch, automatisch erkannt
- Beispiel: "E-Bikes ab 35 €/Tag. Scan, book, ride."

### Für Hotels (B2B)
- Professionell, lösungsorientiert, respektvoll
- Zahlen statt Versprechen ("0 € Kosten" statt "supergünstig")
- Beispiel: "Kostenloser digitaler Concierge für Ihre Gäste."

### Für Anbieter (B2B)
- Auf Augenhöhe, konkret, ehrlich
- Immer mit Rechenbeispiel
- Beispiel: "30 zusätzliche Buchungen × 45 € = 1.350 € Umsatz. 5% = 67,50 €."

### Verboten
- Ausrufezeichen im Logo oder auf der QR-Karte
- Superlative ("Das beste...", "Die Nr. 1...")
- Emojis in professioneller Kommunikation (außer in internen Slack-Nachrichten)
- "Wir revolutionieren..." oder "Disruption"

---

## Anwendungen

### QR-Karte (Hotelzimmer)
- Format: DIN A6 (148 × 105 mm) oder Postkarte
- Material: 350g/m² Recycling-Karton (matt)
- Vorderseite: Logo oben, QR-Code mittig, konkretes Angebot + Preis unten
- Rückseite: Partnerliste oder Leer
- Immer mit Hotel-Logo: "Empfohlen von [Hotelname]"

### Website (lociva.de)
- Logo links oben, 24px Höhe
- Primary Button: #1A7D5A mit weißem Text, border-radius 8px
- Max-width Content: 1200px
- Mobile breakpoint: 768px

### E-Mail
- Logo zentriert oben, 120px Breite
- Bestätigungs-Badge: Tint-Hintergrund (#D4EDE2) mit Checkmark
- Footer: Logo + "Local experiences, one scan away." + lociva.de

### Visitenkarte
- Vorderseite: LOCIVA Logo zentriert, Offwhite Hintergrund
- Rückseite: Name, E-Mail, lociva.de, Forest Hintergrund mit hellem Text

---

## CSS Variables (für Entwicklung)

```css
:root {
  --lociva-primary: #1A7D5A;
  --lociva-primary-light: #3BAA82;
  --lociva-tint: #D4EDE2;
  --lociva-dark: #1E2D26;
  --lociva-bg: #F5FAF7;
  --lociva-white: #FFFFFF;
  --lociva-neutral: #6B7280;
  --lociva-error: #DC3545;
  --lociva-warning: #F59E0B;
  --lociva-success: #10B981;
  --lociva-radius-sm: 6px;
  --lociva-radius-md: 8px;
  --lociva-radius-lg: 12px;
}
```

---

## Do's and Don'ts

### Do
- ✅ Logo mit genug Weißraum
- ✅ System fonts verwenden
- ✅ Offwhite statt reinem Weiß
- ✅ Forest statt reinem Schwarz
- ✅ Konkreter Preis auf QR-Karte
- ✅ Hotel-Logo auf QR-Karte

### Don't
- ❌ Logo in Bold oder Regular setzen (immer Light/300)
- ❌ Logo in Lowercase ("lociva") im visuellen Kontext
- ❌ Primary-Farbe für große Flächen
- ❌ Mehr als 2 Farben auf einer QR-Karte
- ❌ QR-Karte ohne konkretes Angebot/Preis
- ❌ Generische Stockfotos
