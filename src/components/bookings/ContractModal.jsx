"use client";
import { useEffect } from "react";
import { X, Printer, Download } from "lucide-react";
import { fmtDate, fmtCurrency } from "../../utils/formatters";
import { useOrganization } from "../../context/OrgContext";
import { generateContractPDF, printContract } from "../../utils/ContractGenerator";

export default function ContractModal({ booking, onClose, darkMode }) {
    const { currentOrg } = useOrganization();

    const handlePrint = () => {
        printContract(booking, currentOrg);
    };

    const handleDownload = () => {
        generateContractPDF(booking, currentOrg);
    };

    // Escape key closes the modal
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="contract-modal-title"
                className={`w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}
            >

                {/* Header */}
                <div className={`p-4 border-b flex items-center justify-between ${darkMode ? "border-slate-800" : "border-slate-100"}`}>
                    <h2 id="contract-modal-title" className={`font-semibold text-lg ${darkMode ? "text-white" : "text-slate-900"}`}>Mietvertrag Vorschau</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={handlePrint}
                            className="px-3 py-2 bg-slate-600 text-white rounded-lg text-sm font-medium hover:bg-slate-700 flex items-center gap-2 transition-colors"
                        >
                            <Printer className="w-4 h-4" />
                            <span className="hidden sm:inline">Drucken</span>
                        </button>
                        <button
                            onClick={handleDownload}
                            className="px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 flex items-center gap-2 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">PDF herunterladen</span>
                        </button>
                        <button onClick={onClose} aria-label="Schließen" className={`p-2 rounded-full transition-colors ${darkMode ? "hover:bg-slate-800 text-white" : "hover:bg-slate-100 text-slate-900"}`}>
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Preview Area */}
                <div className="p-4 sm:p-8 overflow-y-auto bg-white text-black">

                    {/* Contract header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-black pb-4 mb-6 gap-4">
                        <div>
                            <h1 className="text-2xl font-bold">Mietvertrag</h1>
                            <p className="text-sm text-gray-500 mt-1">
                                Nr. {booking?.booking_number
                                    ? `MV-${booking.booking_number}`
                                    : booking?.id
                                        ? `MV-${booking.id.slice(0, 8).toUpperCase()}`
                                        : 'MV-ENTWURF'}
                            </p>
                            <p className="text-sm text-gray-500">Datum: {new Date().toLocaleDateString('de-DE')}</p>
                        </div>
                        <div className="text-right text-sm">
                            <strong className="text-base">{currentOrg?.name || 'RentCore'}</strong>
                            {currentOrg?.address && <><br />{currentOrg.address}</>}
                            {(currentOrg?.postal_code || currentOrg?.city) && (
                                <><br />{[currentOrg.postal_code, currentOrg.city].filter(Boolean).join(' ')}</>
                            )}
                            {currentOrg?.phone && <><br />Tel: {currentOrg.phone}</>}
                            {currentOrg?.email && <><br />{currentOrg.email}</>}
                        </div>
                    </div>

                    {/* Section 1: Vertragsparteien */}
                    <div className="mb-6">
                        <h2 className="text-base font-bold border-b border-gray-300 pb-1 mb-3">1. Vertragsparteien</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                            <div>
                                <p className="font-semibold text-gray-500 mb-1">Vermieter</p>
                                <p className="font-medium">{currentOrg?.name || '—'}</p>
                                {currentOrg?.address && <p>{currentOrg.address}</p>}
                                {(currentOrg?.postal_code || currentOrg?.city) && (
                                    <p>{[currentOrg.postal_code, currentOrg.city].filter(Boolean).join(' ')}</p>
                                )}
                                {currentOrg?.phone && <p>{currentOrg.phone}</p>}
                                {currentOrg?.email && <p>{currentOrg.email}</p>}
                            </div>
                            <div>
                                <p className="font-semibold text-gray-500 mb-1">Mieter</p>
                                <p className="font-medium">{booking?.customer_name || '—'}</p>
                                {booking?.customer_address && <p>{booking.customer_address}</p>}
                                {(booking?.customer_id_number || booking?.id_number) && <p>Ausweis-Nr.: {booking?.customer_id_number || booking?.id_number}</p>}
                                {booking?.customer_phone && <p>{booking.customer_phone}</p>}
                                {booking?.customer_email && <p>{booking.customer_email}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Mietgegenstand */}
                    <div className="mb-6">
                        <h2 className="text-base font-bold border-b border-gray-300 pb-1 mb-3">2. Mietgegenstand</h2>
                        <table className="w-full text-sm">
                            <tbody>
                                <tr className="border-b border-gray-100">
                                    <td className="py-2 w-1/3 font-semibold text-gray-500">Fahrrad</td>
                                    <td className="py-2">{booking?.bike?.name || '—'}</td>
                                </tr>
                                <tr className="border-b border-gray-100">
                                    <td className="py-2 font-semibold text-gray-500">Kategorie</td>
                                    <td className="py-2">{booking?.bike?.category || '—'}</td>
                                </tr>
                                <tr className="border-b border-gray-100">
                                    <td className="py-2 font-semibold text-gray-500">Größe</td>
                                    <td className="py-2">{booking?.bike?.size || '—'}</td>
                                </tr>
                                <tr className="border-b border-gray-100">
                                    <td className="py-2 font-semibold text-gray-500">Rahmennummer</td>
                                    <td className="py-2">{booking?.bike?.frame_number || '(siehe Rad)'}</td>
                                </tr>
                                <tr>
                                    <td className="py-2 font-semibold text-gray-500">Zustand bei Übergabe</td>
                                    <td className="py-2 text-gray-400">___________________________</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Section 3: Mietdauer */}
                    <div className="mb-6">
                        <h2 className="text-base font-bold border-b border-gray-300 pb-1 mb-3">3. Mietdauer</h2>
                        <table className="w-full text-sm">
                            <tbody>
                                <tr className="border-b border-gray-100">
                                    <td className="py-2 w-1/3 font-semibold text-gray-500">Mietbeginn</td>
                                    <td className="py-2">{fmtDate(booking?.start_date)}</td>
                                </tr>
                                <tr className="border-b border-gray-100">
                                    <td className="py-2 font-semibold text-gray-500">Mietende</td>
                                    <td className="py-2">{fmtDate(booking?.end_date)}</td>
                                </tr>
                                <tr className="border-b border-gray-100">
                                    <td className="py-2 font-semibold text-gray-500">Mietdauer</td>
                                    <td className="py-2">
                                        {(() => {
                                            const days = booking?.total_days || (() => {
                                                if (booking?.start_date && booking?.end_date) {
                                                    const ms = new Date(booking.end_date) - new Date(booking.start_date);
                                                    return Math.max(1, Math.round(ms / 86400000) + 1);
                                                }
                                                return 1;
                                            })();
                                            return `${days} Tag${days !== 1 ? 'e' : ''}`;
                                        })()}
                                    </td>
                                </tr>
                                <tr className="border-b border-gray-100">
                                    <td className="py-2 font-semibold text-gray-500">Übergabeort</td>
                                    <td className="py-2">{booking?.pickup_location || 'Laden'}</td>
                                </tr>
                                <tr>
                                    <td className="py-2 font-semibold text-gray-500">Rückgabeort</td>
                                    <td className="py-2">{booking?.return_location || 'Laden'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Section 4: Mietpreis */}
                    <div className="mb-6">
                        <h2 className="text-base font-bold border-b border-gray-300 pb-1 mb-3">4. Mietpreis</h2>
                        <table className="w-full text-sm">
                            <tbody>
                                {booking?.price_per_day && (
                                    <tr className="border-b border-gray-100">
                                        <td className="py-2 w-1/3 font-semibold text-gray-500">Preis pro Tag</td>
                                        <td className="py-2">{fmtCurrency(booking.price_per_day)}</td>
                                    </tr>
                                )}
                                <tr className="border-b border-gray-100">
                                    <td className="py-2 font-semibold text-gray-500">Gesamtmietpreis</td>
                                    <td className="py-2 font-bold">{fmtCurrency(booking?.total_price)}</td>
                                </tr>
                                <tr className="border-b border-gray-100">
                                    <td className="py-2 font-semibold text-gray-500">Kaution</td>
                                    <td className="py-2">{fmtCurrency(booking?.deposit_amount)}</td>
                                </tr>
                                <tr>
                                    <td className="py-2 font-semibold text-gray-500">Zahlungsart</td>
                                    <td className="py-2">{booking?.payment_method || 'Bar / EC-Karte'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Section 5: Bedingungen */}
                    <div className="mb-8">
                        <h2 className="text-base font-bold border-b border-gray-300 pb-1 mb-3">5. Allgemeine Mietbedingungen</h2>
                        <ol className="text-xs text-gray-600 space-y-2 list-decimal list-inside leading-relaxed">
                            <li>Das Fahrrad ist in einwandfreiem Zustand zurückzugeben. Schäden am Mietgegenstand, die über normale Abnutzung hinausgehen, sind sofort zu melden und werden dem Mieter in Rechnung gestellt.</li>
                            <li>Der Mieter haftet für den Verlust oder die Beschädigung des Fahrrads während der Mietdauer. Bei Diebstahl ist unverzüglich Anzeige zu erstatten und der Vermieter zu informieren.</li>
                            <li>Das Fahrrad darf nur von der im Vertrag genannten Person genutzt werden und ist nicht zur Weitervermietung bestimmt.</li>
                            <li>Bei verspäteter Rückgabe ohne vorherige Absprache wird eine zusätzliche Miete in Höhe des Tagespreises berechnet.</li>
                            <li>Die Kaution wird nach vollständiger und unbeschädigter Rückgabe des Fahrrads erstattet. Der Vermieter behält sich das Recht vor, etwaige Schadenskosten von der Kaution abzuziehen.</li>
                            <li>Reparaturen dürfen ohne ausdrückliche Genehmigung des Vermieters nicht selbst durchgeführt werden. Im Pannenfall ist der Vermieter umgehend zu kontaktieren.</li>
                        </ol>
                    </div>

                    {/* Section 6: Unterschriften */}
                    <div>
                        <h2 className="text-base font-bold border-b border-gray-300 pb-1 mb-4">6. Unterschriften</h2>
                        <p className="text-sm text-gray-500 mb-6">Ort, Datum: _________________________</p>
                        <div className="flex flex-col sm:flex-row justify-between gap-8">
                            <div className="flex-1">
                                <div className="border-t border-black pt-2 text-sm text-center">
                                    {currentOrg?.name || 'Vermieter'} (Unterschrift)
                                </div>
                            </div>
                            <div className="flex-1">
                                <div className="border-t border-black pt-2 text-sm text-center">
                                    {booking?.customer_name || 'Mieter'} (Unterschrift)
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer note */}
                    {(currentOrg?.iban || currentOrg?.tax_id) && (
                        <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-400 text-center">
                            {[
                                currentOrg?.name,
                                currentOrg?.address && currentOrg?.city ? `${currentOrg.address}, ${currentOrg.city}` : '',
                                currentOrg?.iban ? `IBAN: ${currentOrg.iban}${currentOrg.bic ? ` | BIC: ${currentOrg.bic}` : ''}` : '',
                                currentOrg?.tax_id ? `USt-IdNr.: ${currentOrg.tax_id}` : '',
                            ].filter(Boolean).join(' • ')}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
