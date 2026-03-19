"use client";
import { X, Calendar, User, Bike, CreditCard, Clock, AlertTriangle, Edit, Trash2 } from "lucide-react";
import { fmtDate, fmtCurrency } from "../../utils/formatters";
import { getBookingColor, getStatusLabel } from "./bookingColors";

export default function BookingDetailModal({ booking, onClose, onEdit, onCancel, darkMode }) {
    if (!booking) return null;

    const color = getBookingColor(booking);
    const customerName = booking.customer
        ? `${booking.customer.first_name} ${booking.customer.last_name}`.trim()
        : booking.customer_name || "Unbekannt";

    const email = booking.customer?.email || booking.customer_email || null;
    const phone = booking.customer?.phone || booking.customer_phone || null;
    const bikeName = booking.bike?.name || "—";

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(booking.end_date + "T00:00:00");
    const isOverdue = booking.status === "picked_up" && end < today;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${darkMode ? "bg-slate-900 border border-slate-700" : "bg-white border border-slate-200"}`}>
                {/* Header */}
                <div className={`${color.bg} px-6 py-5`}>
                    <div className="flex items-start justify-between">
                        <div>
                            <span className="text-white/80 text-xs font-semibold uppercase tracking-wider">
                                {getStatusLabel(booking)}
                            </span>
                            <h2 className="text-white text-xl font-bold mt-0.5">{customerName}</h2>
                        </div>
                        <button onClick={onClose} className="text-white/80 hover:text-white transition-colors mt-0.5">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    {isOverdue && (
                        <div className="mt-3 flex items-center gap-2 bg-white/20 rounded-lg px-3 py-2">
                            <AlertTriangle className="w-4 h-4 text-white flex-shrink-0" />
                            <span className="text-white text-xs font-semibold">Buchung ist überfällig!</span>
                        </div>
                    )}
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <InfoRow icon={<Calendar className="w-4 h-4" />} label="Zeitraum" darkMode={darkMode}>
                            <span className="font-semibold">{fmtDate(booking.start_date)}</span>
                            <span className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>bis {fmtDate(booking.end_date)}</span>
                        </InfoRow>
                        <InfoRow icon={<Bike className="w-4 h-4" />} label="Fahrrad" darkMode={darkMode}>
                            <span className="font-semibold">{bikeName}</span>
                        </InfoRow>
                        {email && (
                            <InfoRow icon={<User className="w-4 h-4" />} label="E-Mail" darkMode={darkMode}>
                                <span className="font-semibold text-xs break-all">{email}</span>
                            </InfoRow>
                        )}
                        {phone && (
                            <InfoRow icon={<User className="w-4 h-4" />} label="Telefon" darkMode={darkMode}>
                                <span className="font-semibold">{phone}</span>
                            </InfoRow>
                        )}
                        {booking.total_price != null && (
                            <InfoRow icon={<CreditCard className="w-4 h-4" />} label="Betrag" darkMode={darkMode}>
                                <span className="font-semibold">{fmtCurrency(booking.total_price)}</span>
                            </InfoRow>
                        )}
                        {booking.total_days != null && (
                            <InfoRow icon={<Clock className="w-4 h-4" />} label="Tage" darkMode={darkMode}>
                                <span className="font-semibold">{booking.total_days} {booking.total_days === 1 ? "Tag" : "Tage"}</span>
                            </InfoRow>
                        )}
                    </div>

                    {booking.notes && (
                        <div className={`rounded-xl p-3 ${darkMode ? "bg-slate-800" : "bg-slate-50"}`}>
                            <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Notizen</p>
                            <p className={`text-sm ${darkMode ? "text-slate-200" : "text-slate-700"}`}>{booking.notes}</p>
                        </div>
                    )}

                    {/* Actions */}
                    {booking.status !== "cancelled" && booking.status !== "returned" && booking.status !== "completed" && (
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => { onEdit?.(booking); onClose(); }}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-colors"
                            >
                                <Edit className="w-4 h-4" />
                                Bearbeiten
                            </button>
                            <button
                                onClick={() => { onCancel?.(booking); onClose(); }}
                                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${darkMode ? "bg-slate-700 hover:bg-red-900/50 text-red-400 hover:text-red-300" : "bg-slate-100 hover:bg-red-50 text-red-600 hover:text-red-700"}`}
                            >
                                <Trash2 className="w-4 h-4" />
                                Stornieren
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function InfoRow({ icon, label, children, darkMode }) {
    return (
        <div>
            <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                {icon}
                {label}
            </div>
            <div className={`flex flex-col gap-0.5 ${darkMode ? "text-slate-100" : "text-slate-800"}`}>
                {children}
            </div>
        </div>
    );
}
