const fs = require('fs');
const filepath = 'C:/Users/funie/Desktop/Lociva/src/components/bookings/BookingModal.jsx';
let c = fs.readFileSync(filepath, 'utf8');

// 1. Add PenLine to lucide imports
c = c.replace(
  ', AlertTriangle } from "lucide-react";',
  ', AlertTriangle, PenLine } from "lucide-react";'
);

// 2. Add new imports after pricingEngine (or calculatePrice)
const pricingLine = c.includes('pricingEngine')
  ? 'import { calculatePriceSync } from "../../utils/pricingEngine";'
  : 'import { calculateDynamicPrice } from "../../utils/calculatePrice";';
c = c.replace(
  pricingLine,
  pricingLine +
  '\r\nimport { useOrganization } from "../../context/OrgContext";' +
  '\r\nimport { supabase } from "../../utils/supabase";' +
  '\r\nimport { generateContract } from "../../utils/ContractGenerator";' +
  '\r\nimport SignaturePad from "../SignaturePad";'
);

// 3. Add step 5 to STEPS array
c = c.replace(
  '    { id: 4, label: "Abschluss", icon: CheckCircle }\r\n];',
  '    { id: 4, label: "Abschluss", icon: CheckCircle },\r\n    { id: 5, label: "Unterschrift", icon: PenLine }\r\n];'
);

// 4. Add signature state after showCancelBreakdown
c = c.replace(
  '    const [showCancelBreakdown, setShowCancelBreakdown] = useState(false);\r\n',
  '    const [showCancelBreakdown, setShowCancelBreakdown] = useState(false);\r\n    const [signatureData, setSignatureData] = useState(null);\r\n    const [agbAccepted, setAgbAccepted] = useState(false);\r\n'
);

// 5. Add useOrganization after isGroupBooking
const groupLine = '    const [isGroupBooking, setIsGroupBooking] = useState(Boolean(booking?.is_group_booking));\r\n';
const idx = c.indexOf(groupLine);
if (idx >= 0) {
  c = c.slice(0, idx + groupLine.length) + '    const { currentOrg } = useOrganization();\r\n' + c.slice(idx + groupLine.length);
  console.log('currentOrg added OK');
} else {
  console.log('isGroupBooking line not found');
}

// 6. Update step counter
c = c.replace('Schritt {step} von 4', 'Schritt {step} von {STEPS.length}');

// 7. Replace the setSaving(true) block inside handleSave
// Find and replace from setSaving(true) to end of await onSave(...)
// Strategy: find the handleSave function body and replace the try block
const handleSaveStart = c.indexOf('    const handleSave = async () => {');
if (handleSaveStart >= 0) {
  // Find the end of the function (the closing brace at the right indent)
  // Look for the pattern "    };\n\n    const handleCustomerSelect"
  const handleSaveEnd = c.indexOf('    };\n\n    const handleCustomerSelect', handleSaveStart);
  const handleSaveEndAlt = c.indexOf('    };\r\n\r\n    const handleCustomerSelect', handleSaveStart);
  const endIdx = handleSaveEndAlt >= 0 ? handleSaveEndAlt : handleSaveEnd;

  if (endIdx >= 0) {
    const before = c.slice(0, handleSaveStart);
    const after = c.slice(endIdx + '    };'.length);
    const newHandleSave = `    const handleSave = async () => {
        if (!isGroupBooking && conflictingBooking) {
            console.error("Speichern blockiert: Buchungskonflikt erkannt");
            return;
        }
        if (isGroupBooking && groupConflicts.length > 0) {
            console.error("Speichern blockiert: Gruppenkonflikt erkannt");
            return;
        }
        setSaving(true);
        try {
            const discountAmount = appliedCoupon?.discountAmount || 0;
            const finalPrice = Math.max(0, form.total_price - discountAmount);

            // ── M4: Upload signature + signed PDF before saving ──────────────
            let signatureUrl = null;
            let signedContractUrl = null;
            const orgId = currentOrg?.id || '';

            if (signatureData && orgId) {
                const fileId = crypto.randomUUID();
                try {
                    const base64 = signatureData.split(',')[1];
                    const byteChars = atob(base64);
                    const bytes = new Uint8Array(byteChars.length);
                    for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
                    const sigBlob = new Blob([bytes], { type: 'image/png' });
                    const sigPath = \`signatures/\${orgId}/\${fileId}.png\`;
                    const { error: sigErr } = await supabase.storage.from('signatures').upload(sigPath, sigBlob, { contentType: 'image/png', upsert: true });
                    if (!sigErr) {
                        const { data: sigUrl } = supabase.storage.from('signatures').getPublicUrl(sigPath);
                        signatureUrl = sigUrl.publicUrl;
                    }
                    const bikeForPdf = bikes.find(b => b.id === form.bike_id);
                    const pdfBooking = { ...form, bike: bikeForPdf, signed_at: new Date().toISOString(), customer_id_number: form.id_number };
                    const doc = generateContract(pdfBooking, currentOrg, signatureData);
                    const pdfBytes = doc.output('arraybuffer');
                    const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
                    const pdfPath = \`contracts/\${orgId}/\${fileId}-signed.pdf\`;
                    const { error: pdfErr } = await supabase.storage.from('contracts').upload(pdfPath, pdfBlob, { contentType: 'application/pdf', upsert: true });
                    if (!pdfErr) {
                        const { data: pdfUrl } = supabase.storage.from('contracts').getPublicUrl(pdfPath);
                        signedContractUrl = pdfUrl.publicUrl;
                    }
                } catch (storageErr) {
                    console.warn('Storage upload failed, saving booking without signature URLs:', storageErr);
                }
            }
            // ─────────────────────────────────────────────────────────────────

            // Pass selectedBikes for group bookings; hook handles booking_items insert
            await onSave({
                ...form,
                total_price: finalPrice,
                selectedBikes: isGroupBooking ? form.selectedBikes : [],
                _couponId: appliedCoupon?.coupon?.id || null,
                _couponDiscountAmount: discountAmount || null,
                ...(signatureUrl ? { signature_url: signatureUrl, signed_at: new Date().toISOString() } : {}),
                ...(signedContractUrl ? { signed_contract_url: signedContractUrl } : {}),
            });
        } catch (err) {
            console.error("Fehler beim Speichern:", err);
        } finally {
            setSaving(false);
        }
    }`;
    // Normalize to CRLF
    c = before + newHandleSave.replace(/\n/g, '\r\n') + after;
    console.log('handleSave replaced OK');
  } else {
    console.log('handleSave end not found');
  }
} else {
  console.log('handleSave not found');
}

// 8. Insert step 5 JSX before content div's closing </div>
const step5JSX = '\r\n                    {/* STEP 5: UNTERSCHRIFT */}\r\n' +
  '                    {step === 5 && (\r\n' +
  '                        <div className="space-y-6">\r\n' +
  '                            {booking?.signature_url && (\r\n' +
  '                                <div className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${darkMode ? "border-emerald-700/40 bg-emerald-900/20 text-emerald-400" : "border-emerald-500/30 bg-emerald-50 text-emerald-700"}`}>\r\n' +
  '                                    <CheckCircle className="w-4 h-4 flex-shrink-0" />\r\n' +
  '                                    Bereits unterschrieben am {new Date(booking.signed_at).toLocaleString("de-DE")}\r\n' +
  '                                </div>\r\n' +
  '                            )}\r\n' +
  '                            <div className={`p-4 rounded-xl border text-sm space-y-2 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}>\r\n' +
  '                                <h4 className="font-semibold mb-3">Vertrags\u00FCbersicht</h4>\r\n' +
  '                                <div className="flex justify-between">\r\n' +
  '                                    <span className={darkMode ? "text-slate-400" : "text-slate-500"}>Mieter</span>\r\n' +
  '                                    <span className="font-medium">{form.customer_name}</span>\r\n' +
  '                                </div>\r\n' +
  '                                <div className="flex justify-between">\r\n' +
  '                                    <span className={darkMode ? "text-slate-400" : "text-slate-500"}>Fahrrad</span>\r\n' +
  '                                    <span className="font-medium">{bikes.find(b => b.id === form.bike_id)?.name || "\u2014"}</span>\r\n' +
  '                                </div>\r\n' +
  '                                <div className="flex justify-between">\r\n' +
  '                                    <span className={darkMode ? "text-slate-400" : "text-slate-500"}>Zeitraum</span>\r\n' +
  '                                    <span className="font-medium">{new Date(form.start_date).toLocaleDateString("de-DE")} \u2013 {new Date(form.end_date).toLocaleDateString("de-DE")} ({days} Tage)</span>\r\n' +
  '                                </div>\r\n' +
  '                                <div className="flex justify-between border-t pt-2 mt-1">\r\n' +
  '                                    <span className={darkMode ? "text-slate-400" : "text-slate-500"}>Gesamtpreis</span>\r\n' +
  '                                    <span className="font-bold text-[#1A7D5A]">{fmtCurrency(form.total_price)}</span>\r\n' +
  '                                </div>\r\n' +
  '                            </div>\r\n' +
  '                            <label className="flex items-start gap-3 cursor-pointer select-none">\r\n' +
  '                                <input\r\n' +
  '                                    type="checkbox"\r\n' +
  '                                    checked={agbAccepted}\r\n' +
  '                                    onChange={(e) => setAgbAccepted(e.target.checked)}\r\n' +
  '                                    className="mt-0.5 w-4 h-4 accent-[#1A7D5A]"\r\n' +
  '                                />\r\n' +
  '                                <span className={`text-sm ${darkMode ? "text-slate-300" : "text-slate-700"}`}>\r\n' +
  '                                    Ich best\u00E4tige die Richtigkeit der Angaben und akzeptiere die{" "}\r\n' +
  '                                    <span className="text-[#1A7D5A] font-medium">Allgemeinen Mietbedingungen</span>.\r\n' +
  '                                </span>\r\n' +
  '                            </label>\r\n' +
  '                            <div>\r\n' +
  '                                <label className={`${labelStyle} mb-2 flex items-center justify-between`}>\r\n' +
  '                                    <span>Unterschrift des Mieters</span>\r\n' +
  '                                    {signatureData && (\r\n' +
  '                                        <span className="text-emerald-500 text-xs font-normal">\u2713 Unterschrift erfasst</span>\r\n' +
  '                                    )}\r\n' +
  '                                </label>\r\n' +
  '                                <SignaturePad\r\n' +
  '                                    key={step}\r\n' +
  '                                    onSave={(data) => setSignatureData(data)}\r\n' +
  '                                    onClear={() => setSignatureData(null)}\r\n' +
  '                                    darkMode={darkMode}\r\n' +
  '                                />\r\n' +
  '                            </div>\r\n' +
  '                        </div>\r\n' +
  '                    )}\r\n';

const footerPattern = '                </div>\r\n\r\n                {/* Footer */}';
if (c.includes(footerPattern)) {
  c = c.replace(footerPattern, step5JSX + '                </div>\r\n\r\n                {/* Footer */}');
  console.log('Step 5 JSX inserted OK');
} else {
  console.log('Footer pattern not found');
  const fi = c.indexOf('{/* Footer */}');
  console.log('Footer found at:', fi, JSON.stringify(c.substring(fi - 80, fi + 30)));
}

// 9. Update save button
c = c.replace('onClick={step === 4 ? handleSave : handleNext}', 'onClick={step === 5 ? handleSave : handleNext}');
c = c.replace('disabled={saving}', 'disabled={saving || (step === 5 && (!agbAccepted || !signatureData))}');
c = c.replace('{step === 4 ? "Buchung speichern" : "Weiter"}', '{step === 5 ? "Buchung speichern" : "Weiter"}');
c = c.replace('{step < 4 && <ChevronRight className="w-4 h-4" />}', '{step < 5 && <ChevronRight className="w-4 h-4" />}');

// Final check
console.log('\n=== FINAL CHECK ===');
console.log('PenLine:', c.includes('PenLine'));
console.log('Step 5 in STEPS:', c.includes('"Unterschrift"'));
console.log('signatureData state:', c.includes('const [signatureData'));
console.log('M4 handleSave:', c.includes('M4: Upload signature'));
console.log('Step 5 JSX:', c.includes('STEP 5: UNTERSCHRIFT'));
console.log('SignaturePad JSX:', c.includes('<SignaturePad'));
console.log('onClick step 5:', c.includes('step === 5 ? handleSave'));
console.log('Total lines:', c.split('\n').length);

fs.writeFileSync(filepath, c, 'utf8');
console.log('Written OK');
