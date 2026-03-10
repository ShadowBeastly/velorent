"use client";
import { ArrowLeft, Shield, FileText, Scale } from "lucide-react";

// ============ LEGAL PAGE WRAPPER ============
function LegalPage({ title, icon: Icon, children, onBack }) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 md:p-12 prose prose-slate max-w-none">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} RentCore. Alle Rechte vorbehalten.
      </footer>
    </div>
  );
}

// ============ IMPRESSUM ============
// ⚠️ DIESE DATEN MÜSSEN ANGEPASST WERDEN!
export function Impressum({ onBack }) {
  return (
    <LegalPage title="Impressum" icon={FileText} onBack={onBack}>
      <h1>Impressum</h1>

      <h2>Angaben gemäß § 5 TMG</h2>
      <p>
        <strong>RentCore</strong><br />
        {process.env.NEXT_PUBLIC_COMPANY_STREET || "Musterstraße 1"}<br />
        {process.env.NEXT_PUBLIC_COMPANY_CITY || "10115 Berlin"}<br />
        Deutschland
      </p>

      <h2>Kontakt</h2>
      <p>
        Telefon: {process.env.NEXT_PUBLIC_COMPANY_PHONE || "+49 30 12345678"}<br />
        E-Mail: {process.env.NEXT_PUBLIC_COMPANY_EMAIL || "info@rentcore.de"}
      </p>

      <h2>Umsatzsteuer-ID</h2>
      <p>
        Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br />
        {process.env.NEXT_PUBLIC_COMPANY_VAT_ID || "DE123456789"}
      </p>

      <h2>Handelsregister</h2>
      <p>
        Registergericht: {process.env.NEXT_PUBLIC_COMPANY_COURT || "Amtsgericht Berlin (Charlottenburg)"}<br />
        Registernummer: {process.env.NEXT_PUBLIC_COMPANY_REG_NO || "HRB 123456 B"}
      </p>

      <h2>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
      <p>
        {process.env.NEXT_PUBLIC_COMPANY_RESPONSIBLE || "Geschäftsführung RentCore"}<br />
        {process.env.NEXT_PUBLIC_COMPANY_STREET || "Musterstraße 1"},{" "}
        {process.env.NEXT_PUBLIC_COMPANY_CITY || "10115 Berlin"}
      </p>

      <h2>EU-Streitschlichtung</h2>
      <p>
        Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
        <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener">
          https://ec.europa.eu/consumers/odr/
        </a>
      </p>
      <p>
        Unsere E-Mail-Adresse finden Sie oben im Impressum.
      </p>

      <h2>Verbraucherstreitbeilegung/Universalschlichtungsstelle</h2>
      <p>
        Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
        Verbraucherschlichtungsstelle teilzunehmen.
      </p>

      <hr />
      <p className="text-sm text-slate-500">
        Stand: {new Date().toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
      </p>
    </LegalPage>
  );
}

// ============ DATENSCHUTZERKLÄRUNG ============
export function Datenschutz({ onBack }) {
  return (
    <LegalPage title="Datenschutzerklärung" icon={Shield} onBack={onBack}>
      <h1>Datenschutzerklärung</h1>

      <h2>1. Datenschutz auf einen Blick</h2>

      <h3>Allgemeine Hinweise</h3>
      <p>
        Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen
        Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit
        denen Sie persönlich identifiziert werden können.
      </p>

      <h3>Datenerfassung auf dieser Website</h3>
      <p><strong>Wer ist verantwortlich für die Datenerfassung auf dieser Website?</strong></p>
      <p>
        Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten
        können Sie dem Impressum dieser Website entnehmen.
      </p>

      <p><strong>Wie erfassen wir Ihre Daten?</strong></p>
      <p>
        Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei kann es sich
        z.B. um Daten handeln, die Sie bei der Registrierung oder bei einer Buchung eingeben.
      </p>
      <p>
        Andere Daten werden automatisch oder nach Ihrer Einwilligung beim Besuch der Website durch unsere
        IT-Systeme erfasst. Das sind vor allem technische Daten (z.B. Internetbrowser, Betriebssystem oder
        Uhrzeit des Seitenaufrufs).
      </p>

      <p><strong>Wofür nutzen wir Ihre Daten?</strong></p>
      <p>
        Ein Teil der Daten wird erhoben, um eine fehlerfreie Bereitstellung der Website zu gewährleisten.
        Andere Daten können zur Analyse Ihres Nutzerverhaltens verwendet werden.
      </p>

      <h2>2. Hosting</h2>
      <p>
        Wir hosten die Inhalte unserer Website bei folgenden Anbietern:
      </p>

      <h3>Vercel</h3>
      <p>
        Anbieter ist die Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA.
        Die Übermittlung in die USA erfolgt auf Grundlage der EU-Standardvertragsklauseln (SCC) gemäß Art. 46 Abs. 2 lit. c DSGVO.
        Details entnehmen Sie der Datenschutzerklärung von Vercel:{" "}
        <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener">
          https://vercel.com/legal/privacy-policy
        </a>
      </p>

      <h3>Supabase</h3>
      <p>
        Für die Datenbankdienste nutzen wir Supabase mit Servern in der EU (Frankfurt).
        Details: <a href="https://supabase.com/privacy" target="_blank" rel="noopener">
          https://supabase.com/privacy
        </a>
      </p>

      <h2>3. Allgemeine Hinweise und Pflichtinformationen</h2>

      <h3>Datenschutz</h3>
      <p>
        Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln
        Ihre personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften
        sowie dieser Datenschutzerklärung.
      </p>

      <h3>Hinweis zur verantwortlichen Stelle</h3>
      <p>
        Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:
      </p>
      <p>
        RentCore<br />
        {process.env.NEXT_PUBLIC_COMPANY_STREET || "Musterstraße 1"},{" "}
        {process.env.NEXT_PUBLIC_COMPANY_CITY || "10115 Berlin"}<br />
        Telefon: {process.env.NEXT_PUBLIC_COMPANY_PHONE || "+49 30 12345678"}<br />
        E-Mail: {process.env.NEXT_PUBLIC_COMPANY_EMAIL || "info@rentcore.de"}
      </p>

      <h3>Datenschutzbeauftragter / Datenschutzkontakt</h3>
      <p>
        Bei Fragen zum Datenschutz wenden Sie sich bitte an:{" "}
        <a href={`mailto:${process.env.NEXT_PUBLIC_COMPANY_EMAIL || "datenschutz@rentcore.de"}`}>
          {process.env.NEXT_PUBLIC_COMPANY_EMAIL || "datenschutz@rentcore.de"}
        </a>
      </p>

      <h3>Rechtsgrundlagen der Verarbeitung</h3>
      <p>Wir verarbeiten personenbezogene Daten auf folgenden Rechtsgrundlagen gemäß Art. 6 DSGVO:</p>
      <ul>
        <li><strong>Art. 6 Abs. 1 lit. b DSGVO</strong> — Vertragserfüllung: Registrierung, Nutzerkonto, Buchungsabwicklung, Rechnungsstellung</li>
        <li><strong>Art. 6 Abs. 1 lit. c DSGVO</strong> — Rechtliche Verpflichtung: Aufbewahrung von Rechnungen und Buchungsbelegen (§ 147 AO)</li>
        <li><strong>Art. 6 Abs. 1 lit. f DSGVO</strong> — Berechtigtes Interesse: Betrieb und Sicherheit der Plattform, Missbrauchsprävention</li>
      </ul>

      <h3>Speicherdauer</h3>
      <p>
        Soweit innerhalb dieser Datenschutzerklärung keine speziellere Speicherdauer genannt wurde,
        verbleiben Ihre personenbezogenen Daten bei uns, bis der Zweck für die Datenverarbeitung entfällt.
      </p>

      <h3>Ihre Rechte</h3>
      <p>Sie haben jederzeit das Recht:</p>
      <ul>
        <li>Auskunft über Ihre bei uns gespeicherten Daten zu erhalten</li>
        <li>Berichtigung unrichtiger Daten zu verlangen</li>
        <li>Löschung Ihrer Daten zu verlangen</li>
        <li>Einschränkung der Verarbeitung zu verlangen</li>
        <li>Datenübertragbarkeit zu verlangen</li>
        <li>Widerspruch gegen die Verarbeitung einzulegen</li>
        <li>Eine erteilte Einwilligung zu widerrufen</li>
      </ul>

      <h2>4. Datenerfassung auf dieser Website</h2>

      <h3>Cookies</h3>
      <p>
        Unsere Website verwendet nur technisch notwendige Cookies für die Authentifizierung.
        Diese sind für den Betrieb der Seite unbedingt erforderlich.
      </p>

      <h3>Anfrage per E-Mail oder Telefon</h3>
      <p>
        Wenn Sie uns per E-Mail oder Telefon kontaktieren, wird Ihre Anfrage inklusive aller
        daraus hervorgehenden personenbezogenen Daten zum Zwecke der Bearbeitung bei uns
        gespeichert und verarbeitet.
      </p>

      <h3>Registrierung auf dieser Website</h3>
      <p>
        Sie können sich auf dieser Website registrieren, um zusätzliche Funktionen zu nutzen.
        Die dazu eingegebenen Daten verwenden wir nur zum Zwecke der Nutzung des Angebotes.
      </p>

      <h2>5. Zahlungsanbieter</h2>

      <h3>Stripe</h3>
      <p>
        Für die Zahlungsabwicklung nutzen wir Stripe. Anbieter ist die Stripe Payments Europe,
        Ltd., 1 Grand Canal Street Lower, Grand Canal Dock, Dublin, Irland.
      </p>
      <p>
        Details: <a href="https://stripe.com/de/privacy" target="_blank" rel="noopener">
          https://stripe.com/de/privacy
        </a>
      </p>

      <h2>6. E-Mail-Versand</h2>

      <h3>Brevo (ehemals Sendinblue)</h3>
      <p>
        Für den Versand von Transaktions-E-Mails (z.B. Buchungsbestätigungen) nutzen wir den Dienst Brevo.
        Anbieter ist die Sendinblue SAS, 7 rue de Madrid, 75008 Paris, Frankreich.
        Die Datenverarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
        Details:{" "}
        <a href="https://www.brevo.com/de/legal/privacypolicy/" target="_blank" rel="noopener">
          https://www.brevo.com/de/legal/privacypolicy/
        </a>
      </p>

      <hr />
      <p className="text-sm text-slate-500">
        Stand: {new Date().toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
      </p>
    </LegalPage>
  );
}

// ============ AGB ============
export function AGB({ onBack }) {
  return (
    <LegalPage title="Allgemeine Geschäftsbedingungen" icon={Scale} onBack={onBack}>
      <h1>Allgemeine Geschäftsbedingungen (AGB)</h1>

      <h2>§ 1 Geltungsbereich</h2>
      <p>
        (1) Diese Allgemeinen Geschäftsbedingungen gelten für die Nutzung der Software
        &quot;RentCore&quot; (nachfolgend &quot;Software&quot; oder &quot;Dienst&quot;), die von RentCore
        (nachfolgend &quot;Anbieter&quot;) bereitgestellt wird.
      </p>
      <p>
        (2) Vertragspartner sind der Anbieter und der Nutzer (nachfolgend &quot;Kunde&quot;).
      </p>
      <p>
        (3) Abweichende Geschäftsbedingungen des Kunden werden nicht anerkannt.
      </p>

      <h2>§ 2 Vertragsgegenstand</h2>
      <p>
        (1) Der Anbieter stellt dem Kunden eine webbasierte Software zur Verwaltung von
        Fahrradvermietungen zur Verfügung (Software as a Service, SaaS).
      </p>
      <p>
        (2) Der Funktionsumfang richtet sich nach dem gewählten Tarif (Basic, Pro, Unlimited).
      </p>
      <p>
        (3) Die Software wird über das Internet bereitgestellt und erfordert einen
        aktuellen Webbrowser.
      </p>

      <h2>§ 3 Vertragsschluss</h2>
      <p>
        (1) Der Vertrag kommt durch die Registrierung des Kunden und Bestätigung durch
        den Anbieter zustande.
      </p>
      <p>
        (2) Mit der Registrierung bestätigt der Kunde, diese AGB gelesen und akzeptiert
        zu haben.
      </p>

      <h2>§ 4 Kostenlose Testphase</h2>
      <p>
        (1) Kostenpflichtige Tarife können 14 Tage kostenlos getestet werden.
      </p>
      <p>
        (2) Nach Ablauf der Testphase wird der Tarif automatisch kostenpflichtig,
        sofern nicht vorher gekündigt wurde.
      </p>

      <h2>§ 5 Preise und Zahlung</h2>
      <p>
        (1) Die aktuellen Preise sind auf der Website veröffentlicht.
      </p>
      <p>
        (2) Alle Preise verstehen sich zuzüglich der gesetzlichen Mehrwertsteuer.
      </p>
      <p>
        (3) Die Zahlung erfolgt per Kreditkarte oder SEPA-Lastschrift über den
        Zahlungsdienstleister Stripe.
      </p>
      <p>
        (4) Bei monatlicher Zahlung wird jeweils zum Monatsersten abgebucht.
      </p>

      <h2>§ 6 Laufzeit und Kündigung</h2>
      <p>
        (1) Der Vertrag läuft auf unbestimmte Zeit.
      </p>
      <p>
        (2) Bei monatlicher Zahlung kann jederzeit zum Monatsende gekündigt werden.
      </p>
      <p>
        (3) Bei jährlicher Zahlung kann zum Ende der Laufzeit gekündigt werden.
      </p>
      <p>
        (4) Die Kündigung erfolgt über das Kundenkonto oder per E-Mail.
      </p>
      <p>
        (5) Nach Kündigung werden die Daten für 30 Tage aufbewahrt und können
        exportiert werden. Danach erfolgt die Löschung.
      </p>

      <h2>§ 7 Verfügbarkeit</h2>
      <p>
        (1) Der Anbieter bemüht sich um eine Verfügbarkeit von 99,5% im Jahresmittel.
      </p>
      <p>
        (2) Ausgenommen sind geplante Wartungsarbeiten, die vorab angekündigt werden.
      </p>
      <p>
        (3) Bei Störungen wird der Anbieter umgehend Maßnahmen zur Behebung einleiten.
      </p>

      <h2>§ 8 Datenschutz und Datensicherheit</h2>
      <p>
        (1) Der Anbieter verarbeitet personenbezogene Daten gemäß der Datenschutzerklärung
        und den geltenden Datenschutzgesetzen.
      </p>
      <p>
        (2) Der Kunde bleibt Eigentümer seiner Daten und kann diese jederzeit exportieren.
      </p>
      <p>
        (3) Der Anbieter erstellt regelmäßige Backups der Daten.
      </p>
      <p>
        (4) Ein Auftragsverarbeitungsvertrag (AVV) wird auf Anfrage bereitgestellt.
      </p>

      <h2>§ 9 Pflichten des Kunden</h2>
      <p>
        (1) Der Kunde ist für die Geheimhaltung seiner Zugangsdaten verantwortlich.
      </p>
      <p>
        (2) Der Kunde darf die Software nur für rechtmäßige Zwecke nutzen.
      </p>
      <p>
        (3) Der Kunde ist für die Richtigkeit der eingegebenen Daten verantwortlich.
      </p>

      <h2>§ 10 Haftung</h2>
      <p>
        (1) Der Anbieter haftet unbeschränkt bei Vorsatz und grober Fahrlässigkeit.
      </p>
      <p>
        (2) Bei leichter Fahrlässigkeit haftet der Anbieter nur bei Verletzung
        wesentlicher Vertragspflichten, begrenzt auf den vorhersehbaren,
        vertragstypischen Schaden.
      </p>
      <p>
        (3) Eine Haftung für Datenverlust ist auf den typischen Wiederherstellungsaufwand
        begrenzt, der bei regelmäßiger Datensicherung entstanden wäre.
      </p>

      <h2>§ 11 Änderungen der AGB</h2>
      <p>
        (1) Der Anbieter kann diese AGB mit angemessener Frist ändern.
      </p>
      <p>
        (2) Änderungen werden per E-Mail mitgeteilt. Widerspricht der Kunde nicht
        innerhalb von 30 Tagen, gelten die neuen AGB als akzeptiert.
      </p>

      <h2>§ 12 Schlussbestimmungen</h2>
      <p>
        (1) Es gilt deutsches Recht.
      </p>
      <p>
        (2) Gerichtsstand ist {process.env.NEXT_PUBLIC_COMPANY_JURISDICTION || "Berlin"}, sofern der Kunde Kaufmann ist.
      </p>
      <p>
        (3) Sollten einzelne Bestimmungen unwirksam sein, bleibt der Vertrag im
        Übrigen wirksam.
      </p>

      <hr />
      <p className="text-sm text-slate-500">
        Stand: {new Date().toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
      </p>
    </LegalPage>
  );
}

// Named exports
// Named exports are already defined above

// Default export as object for lazy loading
const LegalPages = { Impressum, Datenschutz, AGB };
export default LegalPages;
