import React, { useRef } from "react";
import { X, Printer, Bike } from "lucide-react";
import { fmtDate, fmtCurrency } from "../../utils/formatUtils";

export default function ContractModal({ booking, onClose, darkMode }) {
    const printRef = useRef();

    const handlePrint = () => {
        const content = printRef.current.innerHTML;
        const printWindow = window.open("", "", "height=600,width=800");
        printWindow.document.write("<html><head><title>Mietvertrag</title>");
        printWindow.document.write("<style>body{font-family:sans-serif;padding:20px;} .header{display:flex;justify-content:space-between;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:20px;} .section{margin-bottom:20px;} h1{font-size:24px;} h2{font-size:18px;margin-bottom:10px;border-bottom:1px solid #ccc;} table{width:100%;border-collapse:collapse;} td,th{padding:8px;text-align:left;border-bottom:1px solid #eee;} .footer{margin-top:50px;display:flex;justify-content:space-between;} .sig-line{border-top:1px solid #000;width:200px;padding-top:5px;text-align:center;}</style>");
        printWindow.document.write("</head><body>");
        printWindow.document.write(content);
        printWindow.document.write("</body></html>");
        printWindow.document.close();
        printWindow.print();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className={`w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>

                {/* Header */}
                <div className={`p-4 border-b flex items-center justify-between ${darkMode ? "border-slate-800" : "border-slate-100"}`}>
                    <h2 className={`font-semibold text-lg ${darkMode ? "text-white" : "text-slate-900"}`}>Mietvertrag Vorschau</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={handlePrint}
                            className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 flex items-center gap-2"
                        >
                            <Printer className="w-4 h-4" />
                            Drucken
                        </button>
                        <button onClick={onClose} className={`p-2 rounded-full transition-colors ${darkMode ? "hover:bg-slate-800 text-white" : "hover:bg-slate-100 text-slate-900"}`}>
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Preview Area */}
                <div className="p-8 overflow-y-auto bg-white text-black">
                    <div ref={printRef}>
                        <div className="header">
                            <div>
                                <h1>Mietvertrag</h1>
                                <p>Nr. {booking.booking_number || "PENDING"}</p>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <strong>VeloRent Pro</strong><br />
                                Musterstraße 1<br />
                                12345 Musterstadt
                            </div>
                        </div>

                        <div className="section">
                            <h2>1. Mieter</h2>
                            <table>
                                <tbody>
                                    <tr>
                                        <td width="30%"><strong>Name:</strong></td>
                                        <td>{booking.customer_name}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>E-Mail:</strong></td>
                                        <td>{booking.customer_email}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Telefon:</strong></td>
                                        <td>{booking.customer_phone}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="section">
                            <h2>2. Mietobjekt</h2>
                            <table>
                                <tbody>
                                    <tr>
                                        <td width="30%"><strong>Fahrrad:</strong></td>
                                        <td>{booking.bike?.name} ({booking.bike?.category})</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Größe:</strong></td>
                                        <td>{booking.bike?.size}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="section">
                            <h2>3. Mietzeitraum & Kosten</h2>
                            <table>
                                <tbody>
                                    <tr>
                                        <td width="30%"><strong>Von:</strong></td>
                                        <td>{fmtDate(booking.start_date)}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Bis:</strong></td>
                                        <td>{fmtDate(booking.end_date)}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Gesamtpreis:</strong></td>
                                        <td><strong>{fmtCurrency(booking.total_price)}</strong></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="section">
                            <h2>4. Bedingungen</h2>
                            <p style={{ fontSize: "12px", color: "#666" }}>
                                Das Fahrrad ist in einwandfreiem Zustand zurückzugeben. Schäden sind sofort zu melden.
                                Es gelten die Allgemeinen Geschäftsbedingungen von VeloRent Pro.
                            </p>
                        </div>

                        <div className="footer">
                            <div className="sig-line">
                                Unterschrift Vermieter
                            </div>
                            <div className="sig-line">
                                Unterschrift Mieter
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
