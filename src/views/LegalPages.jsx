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
            <div className="w-10 h-10 bg-gradient-to-br from-[#1A7D5A] to-[#3BAA82] rounded-xl flex items-center justify-center">
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
        © {new Date().getFullYear()} Lociva · funk-e.solutions. Alle Rechte vorbehalten.
      </footer>
    </div>
  );
}

// ============ IMPRESSUM ============
export function Impressum({ onBack }) {
  return (
    <LegalPage title="Impressum" icon={FileText} onBack={onBack}>
      <h1>Impressum</h1>

      <h2>Angaben gemäß § 5 TMG</h2>
      <p>
        <strong>Lociva</strong><br />
        ein Produkt von funk-e.solutions<br />
        Christopher Funke<br />
        {process.env.NEXT_PUBLIC_COMPANY_STREET || "Adresse wird ergänzt"}<br />
        {process.env.NEXT_PUBLIC_COMPANY_CITY || "PLZ Ort"}<br />
        Deutschland
      </p>

      <h2>Kontakt</h2>
      <p>
        E-Mail: info@lociva.de
      </p>

      <h2>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
      <p>
        Christopher Funke<br />
        {process.env.NEXT_PUBLIC_COMPANY_STREET || "Adresse wird ergänzt"},{" "}
        {process.env.NEXT_PUBLIC_COMPANY_CITY || "PLZ Ort"}
      </p>

      {process.env.NEXT_PUBLIC_COMPANY_VAT_ID && (
        <>
          <h2>Umsatzsteuer-ID</h2>
          <p>
            Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br />
            {process.env.NEXT_PUBLIC_COMPANY_VAT_ID}
          </p>
        </>
      )}

      {process.env.NEXT_PUBLIC_COMPANY_REG_NO && (
        <>
          <h2>Handelsregister</h2>
          <p>
            Registergericht: {process.env.NEXT_PUBLIC_COMPANY_COURT || ""}<br />
            Registernummer: {process.env.NEXT_PUBLIC_COMPANY_REG_NO}
          </p>
        </>
      )}

      <h2>EU-Streitschlichtung</h2>
      <p>
        Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
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
        Stand: März 2026
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
        Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber:
        Lociva (funk-e.solutions, Christopher Funke). Kontaktdaten finden Sie im Impressum.
      </p>

      <p><strong>Wie erfassen wir Ihre Daten?</strong></p>
      <p>
        Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen, z.B. bei einer Buchung
        (Name, E-Mail, Telefonnummer). Andere Daten werden automatisch beim Besuch der Website durch unsere
        IT-Systeme erfasst (z.B. Browsertyp, IP-Adresse, Uhrzeit des Zugriffs).
      </p>

      <p><strong>Wofür nutzen wir Ihre Daten?</strong></p>
      <p>
        Ihre Daten werden verwendet, um: (a) Buchungen zwischen Ihnen und dem Aktivitätsanbieter abzuwickeln,
        (b) Buchungsbestätigungen und Stornierungslinks per E-Mail zu senden,
        (c) Zahlungen über Stripe abzuwickeln,
        (d) die fehlerfreie Bereitstellung der Website zu gewährleisten.
      </p>

      <h2>2. Hosting und Auftragsverarbeiter</h2>

      <h3>Vercel (Hosting)</h3>
      <p>
        Anbieter ist die Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA.
        Die Übermittlung in die USA erfolgt auf Grundlage der EU-Standardvertragsklauseln (SCC) gemäß Art. 46 Abs. 2 lit. c DSGVO.
        Details:{" "}
        <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener">
          https://vercel.com/legal/privacy-policy
        </a>
      </p>

      <h3>Supabase (Datenbank und Authentifizierung)</h3>
      <p>
        Für Datenbank, Authentifizierung und serverseitige Funktionen nutzen wir Supabase Inc.,
        970 Toa Payoh North #07-04, Singapore 318992. Unser Supabase-Projekt ist in der EU-Region
        (Frankfurt, eu-central-1) gehostet. Die Datenverarbeitung erfolgt auf Grundlage eines
        Auftragsverarbeitungsvertrags (DPA).
        Details:{" "}
        <a href="https://supabase.com/privacy" target="_blank" rel="noopener">
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
        Lociva (funk-e.solutions)<br />
        Christopher Funke<br />
        E-Mail: info@lociva.de
      </p>

      <h3>Rechtsgrundlagen der Verarbeitung</h3>
      <p>Wir verarbeiten personenbezogene Daten auf folgenden Rechtsgrundlagen gemäß Art. 6 DSGVO:</p>
      <ul>
        <li><strong>Art. 6 Abs. 1 lit. b DSGVO</strong>. Vertragserfüllung: Buchungsabwicklung, Zahlungsverarbeitung, E-Mail-Bestätigungen</li>
        <li><strong>Art. 6 Abs. 1 lit. c DSGVO</strong>. Rechtliche Verpflichtung: Aufbewahrung von Buchungsbelegen (§ 147 AO)</li>
        <li><strong>Art. 6 Abs. 1 lit. f DSGVO</strong>. Berechtigtes Interesse: Betrieb und Sicherheit der Plattform, Missbrauchsprävention, Analyse der Buchungskonversion</li>
      </ul>

      <h3>Speicherdauer</h3>
      <p>
        Buchungsdaten werden für die Dauer der gesetzlichen Aufbewahrungspflichten (in der Regel 10 Jahre
        für steuerrelevante Belege) gespeichert. Analysedaten (QR-Scans, Seitenaufrufe) werden anonymisiert
        und enthalten keine personenbezogenen Daten.
      </p>

      <h3>Ihre Rechte</h3>
      <p>Sie haben jederzeit das Recht:</p>
      <ul>
        <li>Auskunft über Ihre bei uns gespeicherten Daten zu erhalten (Art. 15 DSGVO)</li>
        <li>Berichtigung unrichtiger Daten zu verlangen (Art. 16 DSGVO)</li>
        <li>Löschung Ihrer Daten zu verlangen (Art. 17 DSGVO)</li>
        <li>Einschränkung der Verarbeitung zu verlangen (Art. 18 DSGVO)</li>
        <li>Datenübertragbarkeit zu verlangen (Art. 20 DSGVO)</li>
        <li>Widerspruch gegen die Verarbeitung einzulegen (Art. 21 DSGVO)</li>
        <li>Sich bei einer Aufsichtsbehörde zu beschweren (Art. 77 DSGVO)</li>
      </ul>
      <p>
        Wenden Sie sich dazu an: info@lociva.de
      </p>

      <h2>4. Datenerfassung auf dieser Website</h2>

      <h3>Cookies</h3>
      <p>
        Unsere Website verwendet ausschließlich technisch notwendige Cookies für die Authentifizierung
        (Supabase Auth Session). Es werden keine Tracking- oder Marketing-Cookies eingesetzt.
      </p>

      <h3>Gastbuchungen (ohne Registrierung)</h3>
      <p>
        Hotelgäste können Buchungen ohne Erstellung eines Benutzerkontos vornehmen. Dabei werden
        folgende Daten erhoben: Name, E-Mail-Adresse, optional Telefonnummer. Diese Daten werden
        ausschließlich zur Buchungsabwicklung und zum Versand der Bestätigung verwendet und an den
        jeweiligen Aktivitätsanbieter weitergegeben.
      </p>

      <h3>Analytik</h3>
      <p>
        Wir erfassen anonymisierte Analysedaten (QR-Scans, Seitenaufrufe, Buchungsstarts) pro Hotel,
        um den Hotels Konversionsstatistiken zur Verfügung zu stellen. Diese Daten enthalten keine
        personenbezogenen Informationen und werden nicht an Dritte weitergegeben.
      </p>

      <h2>5. Zahlungsanbieter</h2>

      <h3>Stripe</h3>
      <p>
        Für die Zahlungsabwicklung nutzen wir Stripe Connect. Anbieter ist die Stripe Payments Europe,
        Ltd., 1 Grand Canal Street Lower, Grand Canal Dock, Dublin, Irland. Zahlungsdaten (Kreditkartennummer,
        Bankdaten) werden ausschließlich von Stripe verarbeitet und erreichen zu keinem Zeitpunkt unsere Server.
      </p>
      <p>
        Details:{" "}
        <a href="https://stripe.com/de/privacy" target="_blank" rel="noopener">
          https://stripe.com/de/privacy
        </a>
      </p>

      <h2>6. E-Mail-Versand</h2>

      <h3>Brevo (ehemals Sendinblue)</h3>
      <p>
        Für den Versand von Transaktions-E-Mails (Buchungsbestätigungen, Stornierungslinks) nutzen wir Brevo.
        Anbieter ist die Sendinblue SAS, 7 rue de Madrid, 75008 Paris, Frankreich.
        Die Datenverarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
        Details:{" "}
        <a href="https://www.brevo.com/de/legal/privacypolicy/" target="_blank" rel="noopener">
          https://www.brevo.com/de/legal/privacypolicy/
        </a>
      </p>

      <h2>7. Übersicht der Auftragsverarbeiter</h2>
      <table>
        <thead>
          <tr><th>Dienst</th><th>Anbieter</th><th>Zweck</th><th>Serverstandort</th></tr>
        </thead>
        <tbody>
          <tr><td>Vercel</td><td>Vercel Inc., USA</td><td>Hosting, CDN</td><td>EU (Frankfurt)</td></tr>
          <tr><td>Supabase</td><td>Supabase Inc., SG</td><td>Datenbank, Auth, Edge Functions</td><td>EU (Frankfurt)</td></tr>
          <tr><td>Stripe</td><td>Stripe Payments Europe, IE</td><td>Zahlungsabwicklung</td><td>EU</td></tr>
          <tr><td>Brevo</td><td>Sendinblue SAS, FR</td><td>Transaktions-E-Mails</td><td>EU</td></tr>
        </tbody>
      </table>

      <hr />
      <p className="text-sm text-slate-500">
        Stand: März 2026
      </p>
    </LegalPage>
  );
}

// ============ AGB ============
export function AGB({ onBack }) {
  return (
    <LegalPage title="Allgemeine Geschäftsbedingungen" icon={Scale} onBack={onBack}>
      <h1>Allgemeine Geschäftsbedingungen (AGB)</h1>
      <p><strong>Lociva. Plattform für lokale Erlebnisse</strong></p>
      <p>Betreiber: funk-e.solutions, Christopher Funke</p>

      <h2>§ 1 Geltungsbereich und Begriffsbestimmungen</h2>
      <p>
        (1) Diese Allgemeinen Geschäftsbedingungen gelten für die Nutzung der Plattform
        &quot;Lociva&quot; (nachfolgend &quot;Plattform&quot;), erreichbar unter lociva.de,
        betrieben von funk-e.solutions, Christopher Funke (nachfolgend &quot;Lociva&quot;).
      </p>
      <p>
        (2) Die Plattform richtet sich an drei Nutzergruppen:
      </p>
      <ul>
        <li><strong>Gäste:</strong> Hotelgäste, die über die Plattform lokale Aktivitäten buchen.</li>
        <li><strong>Anbieter:</strong> Unternehmen, die ihre Aktivitäten (z.B. Fahrradverleih, Kanu, Stadtführungen) über die Plattform anbieten.</li>
        <li><strong>Hotels:</strong> Beherbergungsbetriebe, die ihren Gästen den Zugang zur Plattform per QR-Code ermöglichen.</li>
      </ul>
      <p>
        (3) Für Anbieter gelten zusätzlich die Anbieter-AGB, die im Rahmen des Stripe-Connect-Onboardings akzeptiert werden.
      </p>

      <h2>§ 2 Rolle von Lociva. Vermittler, nicht Vertragspartei</h2>
      <p>
        (1) Lociva ist ausschließlich <strong>Vermittler</strong> (Intermediär). Lociva ist weder
        Vermieter, Veranstalter noch Dienstleister der angebotenen Aktivitäten.
      </p>
      <p>
        (2) Der Vertrag über die gebuchte Aktivität kommt ausschließlich zwischen dem Gast und dem
        jeweiligen Anbieter zustande. Lociva ist an diesem Vertrag nicht beteiligt.
      </p>
      <p>
        (3) Hotels empfehlen lediglich die Plattform und übernehmen keine Haftung für die
        vermittelten Leistungen.
      </p>

      <h2>§ 3 Buchung und Vertragsschluss</h2>
      <p>
        (1) Gäste können über die Plattform Aktivitäten lokaler Anbieter buchen. Eine Registrierung
        oder ein Benutzerkonto ist dafür nicht erforderlich.
      </p>
      <p>
        (2) Durch das Absenden einer Buchung und die erfolgreiche Zahlung kommt ein Vertrag zwischen
        dem Gast und dem Anbieter zustande.
      </p>
      <p>
        (3) Der Gast erhält eine Buchungsbestätigung per E-Mail mit allen relevanten Details
        (Buchungsnummer, Zeitraum, Abholadresse, Stornierungslink).
      </p>

      <h2>§ 4 Preise und Zahlung</h2>
      <p>
        (1) Die auf der Plattform angezeigten Preise sind Endpreise inklusive gesetzlicher Mehrwertsteuer.
      </p>
      <p>
        (2) Die Zahlung erfolgt ausschließlich online über den Zahlungsdienstleister Stripe.
        Akzeptierte Zahlungsmittel sind Kredit- und Debitkarten.
      </p>
      <p>
        (3) Lociva erhält vom Anbieter eine Vermittlungsprovision. Der Gast zahlt den auf der
        Plattform angezeigten Preis. Es entstehen keine zusätzlichen Gebühren.
      </p>

      <h2>§ 5 Stornierung und Rückerstattung</h2>
      <p>
        (1) Gäste können Buchungen über den in der Bestätigungs-E-Mail enthaltenen Stornierungslink stornieren.
      </p>
      <p>
        (2) Es gelten folgende Stornierungsbedingungen:
      </p>
      <table>
        <thead>
          <tr><th>Zeitpunkt</th><th>Rückerstattung</th></tr>
        </thead>
        <tbody>
          <tr><td>Mehr als 24 Stunden vor Beginn</td><td>100 % Rückerstattung</td></tr>
          <tr><td>Weniger als 24 Stunden vor Beginn</td><td>50 % Stornogebühr, 50 % Rückerstattung</td></tr>
          <tr><td>Nichterscheinen (No-Show)</td><td>Keine Rückerstattung</td></tr>
        </tbody>
      </table>
      <p>
        (3) Die Rückerstattung erfolgt über den ursprünglichen Zahlungsweg (Stripe) und kann
        je nach Kreditinstitut 5-10 Werktage in Anspruch nehmen.
      </p>

      <h2>§ 6 Pflichten des Gastes</h2>
      <p>
        (1) Der Gast ist verpflichtet, bei der Buchung wahrheitsgemäße Angaben zu machen
        (insbesondere Name und E-Mail-Adresse).
      </p>
      <p>
        (2) Der Gast erscheint pünktlich am vereinbarten Abholort und befolgt die Anweisungen
        des Anbieters (insbesondere Sicherheitshinweise bei Sportgeräten).
      </p>
      <p>
        (3) Bei Beschädigung oder Verlust gemieteter Gegenstände haftet der Gast gegenüber dem
        Anbieter nach den Bestimmungen des jeweiligen Mietvertrags.
      </p>

      <h2>§ 7 Pflichten der Anbieter</h2>
      <p>
        (1) Der Anbieter verpflichtet sich, eine gültige Betriebshaftpflichtversicherung zu unterhalten.
      </p>
      <p>
        (2) Der Anbieter ist für die korrekte Angabe von Preisen, Verfügbarkeiten und
        Leistungsbeschreibungen auf der Plattform verantwortlich.
      </p>
      <p>
        (3) Weitere Pflichten sind in den Anbieter-AGB geregelt.
      </p>

      <h2>§ 8 Haftung von Lociva</h2>
      <p>
        (1) Lociva haftet nicht für die Qualität, Sicherheit oder Verfügbarkeit der von Anbietern
        angebotenen Leistungen.
      </p>
      <p>
        (2) Lociva haftet nicht für Schäden, die aus dem Vertragsverhältnis zwischen Gast und
        Anbieter entstehen.
      </p>
      <p>
        (3) Lociva haftet unbeschränkt bei Vorsatz und grober Fahrlässigkeit. Bei leichter
        Fahrlässigkeit haftet Lociva nur bei Verletzung wesentlicher Vertragspflichten
        (Kardinalpflichten), begrenzt auf den vorhersehbaren, vertragstypischen Schaden.
      </p>
      <p>
        (4) Lociva bemüht sich um eine Verfügbarkeit der Plattform von 99,5 % im Jahresmittel,
        übernimmt jedoch keine Garantie für die ununterbrochene Erreichbarkeit.
      </p>

      <h2>§ 9 Datenschutz</h2>
      <p>
        Die Verarbeitung personenbezogener Daten erfolgt gemäß unserer{" "}
        <a href="/datenschutz">Datenschutzerklärung</a>. Gastdaten werden ausschließlich zur
        Buchungsabwicklung verwendet und an den jeweiligen Anbieter weitergegeben. Zahlungsdaten
        werden ausschließlich von Stripe verarbeitet.
      </p>

      <h2>§ 10 Änderungen der AGB</h2>
      <p>
        (1) Lociva kann diese AGB mit angemessener Frist ändern.
      </p>
      <p>
        (2) Änderungen werden auf der Plattform veröffentlicht. Für Anbieter und Hotels gelten
        geänderte AGB ab dem Zeitpunkt der Veröffentlichung, sofern nicht innerhalb von 30 Tagen
        widersprochen wird.
      </p>

      <h2>§ 11 Schlussbestimmungen</h2>
      <p>
        (1) Es gilt das Recht der Bundesrepublik Deutschland.
      </p>
      <p>
        (2) Die EU-Plattform zur Online-Streitbeilegung finden Sie unter:{" "}
        <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener">
          https://ec.europa.eu/consumers/odr/
        </a>
      </p>
      <p>
        (3) Sollten einzelne Bestimmungen dieser AGB unwirksam sein, bleibt die Wirksamkeit der
        übrigen Bestimmungen davon unberührt.
      </p>

      <hr />
      <p className="text-sm text-slate-500">
        Stand: März 2026. Lociva (funk-e.solutions)
      </p>
    </LegalPage>
  );
}

// Default export as object for lazy loading
const LegalPages = { Impressum, Datenschutz, AGB };
export default LegalPages;
