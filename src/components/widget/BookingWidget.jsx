"use client";
import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Bike, ChevronLeft, ChevronRight, Check, Loader2,
  User, Mail, Phone, MapPin, FileText, AlertCircle,
  CheckCircle, Info
} from "lucide-react";
import DateRangePicker from "../bookings/DateRangePicker";

// ============ HELPERS ============
const formatDateISO = (d) => d?.toISOString().slice(0, 10);
const formatDate = (d) => d?.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
const formatCurrency = (n) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n || 0);

// ============ CONFIG ============
// Diese Werte werden beim Einbetten überschrieben
const DEFAULT_SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
const DEFAULT_SUPABASE_KEY = "YOUR_ANON_KEY";

// ============ WIDGET COMPONENT ============
export default function RentCoreBookingWidget({
  supabaseUrl = DEFAULT_SUPABASE_URL,
  supabaseKey = DEFAULT_SUPABASE_KEY,
  apiKey,
  onBookingComplete,
  className = ""
}) {
  const supabase = useMemo(() => createClient(supabaseUrl, supabaseKey), [supabaseUrl, supabaseKey]);

  // State
  const [step, setStep] = useState(1); // 1: Bike, 2: Dates, 3: Details, 4: Confirm, 5: Success
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Data
  const [settings, setSettings] = useState(null);
  const [bikes, setBikes] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);

  // Selection
  const [selectedBike, setSelectedBike] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [availability, setAvailability] = useState(null);

  // Form
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
    acceptTerms: false
  });

  // Booking Result
  const [bookingResult, setBookingResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Validation / UX state
  const [showFieldErrors, setShowFieldErrors] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // ============ LOAD INITIAL DATA ============
  useEffect(() => {
    if (!apiKey) {
      setError("API Key fehlt");
      setLoading(false);
      return;
    }
    loadData();
  }, [loadData, apiKey]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Settings laden
      const { data: settingsData, error: settingsError } = await supabase
        .rpc("get_widget_settings", { p_api_key: apiKey });

      if (settingsError || settingsData?.error) {
        throw new Error(settingsData?.error || settingsError?.message || "Fehler beim Laden");
      }
      setSettings(settingsData);

      // Bikes laden
      const { data: bikesData, error: bikesError } = await supabase
        .rpc("get_public_bikes", { p_api_key: apiKey });

      if (bikesError) throw new Error(bikesError.message);
      setBikes(bikesData || []);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiKey, supabase]);

  // ============ LOAD BLOCKED DATES WHEN BIKE SELECTED ============
  useEffect(() => {
    if (selectedBike && apiKey) {
      loadBlockedDates(selectedBike.id);
    }
  }, [selectedBike, apiKey, loadBlockedDates]);

  const loadBlockedDates = useCallback(async (bikeId) => {
    const { data } = await supabase.rpc("get_blocked_dates", {
      p_api_key: apiKey,
      p_bike_id: bikeId
    });
    setBlockedDates(data?.blocked_dates || []);
  }, [apiKey, supabase]);

  // ============ CHECK AVAILABILITY ============
  useEffect(() => {
    if (selectedBike && startDate && endDate) {
      checkAvailability();
    }
  }, [selectedBike, startDate, endDate, apiKey, checkAvailability]);

  const checkAvailability = useCallback(async () => {
    setCheckingAvailability(true);
    try {
      const { data } = await supabase.rpc("check_availability", {
        p_api_key: apiKey,
        p_bike_id: selectedBike.id,
        p_start_date: formatDateISO(startDate),
        p_end_date: formatDateISO(endDate)
      });
      setAvailability(data);
    } finally {
      setCheckingAvailability(false);
    }
  }, [apiKey, supabase, selectedBike, startDate, endDate]);

  // ============ SUBMIT BOOKING ============
  const handleSubmit = async () => {
    if (!form.acceptTerms) {
      setError("Bitte akzeptieren Sie die AGB");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { data, error: bookingError } = await supabase.rpc("create_public_booking", {
        p_api_key: apiKey,
        p_bike_id: selectedBike.id,
        p_start_date: formatDateISO(startDate),
        p_end_date: formatDateISO(endDate),
        p_customer_name: form.name,
        p_customer_email: form.email || null,
        p_customer_phone: form.phone || null,
        p_customer_address: form.address || null,
        p_notes: form.notes || null
      });

      if (bookingError || !data?.success) {
        throw new Error(data?.error || bookingError?.message || "Buchung fehlgeschlagen");
      }

      setBookingResult(data);
      setStep(5);

      if (onBookingComplete) {
        onBookingComplete(data);
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };



  // ============ STYLES (CSS-in-JS mit Settings) ============
  const styles = useMemo(() => {
    const primary = settings?.primary_color || "#f97316";
    const secondary = settings?.secondary_color || "#fbbf24";
    const radius = settings?.border_radius || 12;

    return {
      container: {
        fontFamily: settings?.font_family || "Inter, system-ui, sans-serif",
        maxWidth: "600px",
        margin: "0 auto",
        backgroundColor: "#ffffff",
        borderRadius: `${radius}px`,
        boxShadow: "0 4px 24px rgba(0,0,0,0.1)",
        overflow: "hidden"
      },
      header: {
        background: `linear-gradient(135deg, ${primary}, ${secondary})`,
        padding: "24px",
        color: "white"
      },
      primaryBtn: {
        background: `linear-gradient(135deg, ${primary}, ${secondary})`,
        color: "white",
        border: "none",
        borderRadius: `${radius}px`,
        padding: "12px 24px",
        fontWeight: "600",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        width: "100%",
        fontSize: "16px",
        transition: "transform 0.2s, box-shadow 0.2s"
      },
      secondaryBtn: {
        backgroundColor: "#f1f5f9",
        color: "#475569",
        border: "none",
        borderRadius: `${radius}px`,
        padding: "12px 24px",
        fontWeight: "500",
        cursor: "pointer"
      },
      input: {
        width: "100%",
        padding: "12px 16px",
        border: "1px solid #e2e8f0",
        borderRadius: `${radius}px`,
        fontSize: "16px",
        outline: "none",
        transition: "border-color 0.2s"
      },
      bikeCard: {
        border: "2px solid #e2e8f0",
        borderRadius: `${radius}px`,
        padding: "16px",
        cursor: "pointer",
        transition: "all 0.2s"
      },
      bikeCardSelected: {
        border: `2px solid ${primary}`,
        backgroundColor: `${primary}10`
      },
      stepIndicator: {
        display: "flex",
        gap: "8px",
        marginBottom: "24px"
      },
      stepDot: (active, completed) => ({
        width: "32px",
        height: "32px",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "14px",
        fontWeight: "600",
        backgroundColor: completed ? primary : active ? primary : "#e2e8f0",
        color: completed || active ? "white" : "#94a3b8"
      })
    };
  }, [settings]);

  // ============ RENDER ============
  if (loading) {
    return (
      <div style={styles.container} className={className}>
        <div style={{ padding: "48px", textAlign: "center" }}>
          <Loader2 style={{ width: 48, height: 48, margin: "0 auto", animation: "spin 1s linear infinite" }} />
          <p style={{ marginTop: "16px", color: "#64748b" }}>Laden...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error && step !== 4) {
    return (
      <div style={styles.container} className={className}>
        <div style={{ padding: "48px", textAlign: "center" }}>
          <AlertCircle style={{ width: 48, height: 48, color: "#ef4444", margin: "0 auto" }} />
          <p style={{ marginTop: "16px", color: "#ef4444" }}>{error}</p>
          <button onClick={loadData} style={{ ...styles.secondaryBtn, marginTop: "16px" }}>
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container} className={className}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <Bike style={{ width: 28, height: 28 }} />
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700" }}>
            {settings?.organization_name || "Fahrradverleih"}
          </h2>
        </div>
        <p style={{ margin: 0, opacity: 0.9, fontSize: "14px" }}>
          {settings?.welcome_text}
        </p>
      </div>

      {/* Progress Steps */}
      <div style={{ padding: "24px 24px 0" }}>
        <div style={styles.stepIndicator}>
          {[1, 2, 3, 4].map((s) => (
            <Fragment key={s}>
              <div style={styles.stepDot(step === s, step > s)}>
                {step > s ? <Check style={{ width: 16, height: 16 }} /> : s}
              </div>
              {s < 4 && (
                <div style={{
                  flex: 1,
                  height: "2px",
                  backgroundColor: step > s ? settings?.primary_color || "#f97316" : "#e2e8f0",
                  alignSelf: "center"
                }} />
              )}
            </Fragment>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
          {["Rad", "Datum", "Daten", "Bestätigen"].map((label, i) => (
            <span key={i} style={{
              fontSize: "10px",
              color: step > i + 1 ? (settings?.primary_color || "#f97316") : step === i + 1 ? "#1e293b" : "#94a3b8",
              fontWeight: step === i + 1 ? "600" : "400",
              width: "25%",
              textAlign: i === 0 ? "left" : i === 3 ? "right" : "center"
            }}>{label}</span>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "0 24px 24px" }}>

        {/* Step 1: Select Bike */}
        {step === 1 && (
          <div>
            <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: "600" }}>
              Fahrrad wählen
            </h3>

            {bikes.length === 0 ? (
              <p style={{ color: "#64748b", textAlign: "center", padding: "32px" }}>
                Derzeit keine Räder verfügbar
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {bikes.map((bike) => (
                  <div
                    key={bike.id}
                    onClick={() => setSelectedBike(bike)}
                    style={{
                      ...styles.bikeCard,
                      ...(selectedBike?.id === bike.id ? styles.bikeCardSelected : {})
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                      <div>
                        <h4 style={{ margin: "0 0 4px", fontWeight: "600" }}>{bike.name}</h4>
                        <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>
                          {bike.category} • {bike.size} • {bike.color}
                        </p>
                        {bike.description && (
                          <p style={{ margin: "8px 0 0", fontSize: "13px", color: "#94a3b8" }}>
                            {bike.description}
                          </p>
                        )}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ margin: 0, fontWeight: "700", color: settings?.primary_color || "#f97316" }}>
                          {formatCurrency(bike.price_per_day)}
                        </p>
                        <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8" }}>pro Tag</p>
                      </div>
                    </div>

                    {selectedBike?.id === bike.id && (
                      <div style={{
                        marginTop: "12px",
                        paddingTop: "12px",
                        borderTop: "1px solid #e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        color: settings?.primary_color || "#f97316",
                        fontSize: "14px",
                        fontWeight: "500"
                      }}>
                        <Check style={{ width: 16, height: 16 }} />
                        Ausgewählt
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => selectedBike && setStep(2)}
              disabled={!selectedBike}
              style={{
                ...styles.primaryBtn,
                marginTop: "24px",
                opacity: selectedBike ? 1 : 0.5,
                cursor: selectedBike ? "pointer" : "not-allowed"
              }}
            >
              Weiter zur Datumsauswahl
              <ChevronRight style={{ width: 20, height: 20 }} />
            </button>
          </div>
        )}

        {/* Step 2: Select Dates */}
        {step === 2 && (
          <div>
            <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: "600" }}>
              Zeitraum wählen
            </h3>

            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              blockedDates={blockedDates}
              minDays={settings?.min_days || 1}
              maxDays={settings?.max_days || 30}
              maxAdvanceDays={settings?.max_advance_days || 90}
              primaryColor={settings?.primary_color || "#f97316"}
              borderRadius={settings?.border_radius || 12}
            />

            {/* Availability Result */}
            {availability && (
              <div style={{
                marginTop: "16px",
                padding: "16px",
                borderRadius: `${settings?.border_radius || 12}px`,
                backgroundColor: availability.available ? "#f0fdf4" : "#fef2f2",
                border: `1px solid ${availability.available ? "#bbf7d0" : "#fecaca"}`
              }}>
                {availability.available ? (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#16a34a", marginBottom: "8px" }}>
                      <CheckCircle style={{ width: 20, height: 20 }} />
                      <span style={{ fontWeight: "600" }}>Verfügbar!</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "14px" }}>
                      <div>
                        <span style={{ color: "#64748b" }}>Dauer:</span>
                        <span style={{ marginLeft: "8px", fontWeight: "500" }}>{availability.total_days} Tage</span>
                      </div>
                      <div>
                        <span style={{ color: "#64748b" }}>Kaution:</span>
                        <span style={{ marginLeft: "8px", fontWeight: "500" }}>{formatCurrency(availability.deposit)}</span>
                      </div>
                    </div>
                    <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #bbf7d0" }}>
                      <span style={{ color: "#64748b" }}>Gesamtpreis:</span>
                      <span style={{ marginLeft: "8px", fontSize: "20px", fontWeight: "700", color: settings?.primary_color || "#f97316" }}>
                        {formatCurrency(availability.total_price)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#dc2626" }}>
                    <AlertCircle style={{ width: 20, height: 20 }} />
                    <span>{availability.error || "Nicht verfügbar"}</span>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
              <button onClick={() => setStep(1)} style={styles.secondaryBtn}>
                <ChevronLeft style={{ width: 16, height: 16, marginRight: "4px" }} />
                Zurück
              </button>
              <button
                onClick={() => availability?.available && !checkingAvailability && setStep(3)}
                disabled={!availability?.available || checkingAvailability}
                style={{
                  ...styles.primaryBtn,
                  opacity: checkingAvailability ? 0.7 : availability?.available ? 1 : 0.5,
                  cursor: checkingAvailability ? "wait" : availability?.available ? "pointer" : "not-allowed"
                }}
              >
                {checkingAvailability ? (
                  <>
                    <Loader2 style={{ width: 20, height: 20, animation: "spin 1s linear infinite" }} />
                    Verfügbarkeit wird geprüft...
                  </>
                ) : (
                  <>
                    Weiter zu Ihren Daten
                    <ChevronRight style={{ width: 20, height: 20 }} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Customer Details */}
        {step === 3 && (
          <div>
            <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: "600" }}>
              Ihre Daten
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", fontSize: "14px", fontWeight: "500" }}>
                  <User style={{ width: 16, height: 16, color: "#64748b" }} />
                  Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Max Mustermann"
                  style={styles.input}
                  required
                />
                {showFieldErrors && form.name.trim().length < 2 && <div style={{color:"#ef4444",fontSize:"12px",marginTop:"2px"}}>Name muss mindestens 2 Zeichen haben</div>}
              </div>

              {settings?.require_email !== false && (
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", fontSize: "14px", fontWeight: "500" }}>
                    <Mail style={{ width: 16, height: 16, color: "#64748b" }} />
                    E-Mail {settings?.require_email && "*"}
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="max@example.com"
                    style={styles.input}
                    required={settings?.require_email}
                  />
                  {showFieldErrors && settings?.require_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) && <div style={{color:"#ef4444",fontSize:"12px",marginTop:"2px"}}>Bitte geben Sie eine gültige E-Mail-Adresse ein</div>}
                </div>
              )}

              {settings?.require_phone !== false && (
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", fontSize: "14px", fontWeight: "500" }}>
                    <Phone style={{ width: 16, height: 16, color: "#64748b" }} />
                    Telefon {settings?.require_phone && "*"}
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+49 123 456789"
                    style={styles.input}
                    required={settings?.require_phone}
                  />
                  {showFieldErrors && settings?.require_phone && form.phone.trim().length < 6 && <div style={{color:"#ef4444",fontSize:"12px",marginTop:"2px"}}>Bitte geben Sie eine gültige Telefonnummer ein</div>}
                </div>
              )}

              {settings?.require_address && (
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", fontSize: "14px", fontWeight: "500" }}>
                    <MapPin style={{ width: 16, height: 16, color: "#64748b" }} />
                    Adresse *
                  </label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Musterstraße 123, 12345 Berlin"
                    style={styles.input}
                    required
                  />
                </div>
              )}

              <div>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", fontSize: "14px", fontWeight: "500" }}>
                  <FileText style={{ width: 16, height: 16, color: "#64748b" }} />
                  Anmerkungen
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Besondere Wünsche oder Anmerkungen..."
                  style={{ ...styles.input, minHeight: "80px", resize: "vertical" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
              <button onClick={() => setStep(2)} style={styles.secondaryBtn}>
                <ChevronLeft style={{ width: 16, height: 16, marginRight: "4px" }} />
                Zurück
              </button>
              <button
                onClick={() => {
                  const canProceedStep3 =
                    form.name.trim().length >= 2 &&
                    (!settings?.require_email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) &&
                    (!settings?.require_phone || form.phone.trim().length >= 6);
                  if (canProceedStep3) {
                    setShowFieldErrors(false);
                    setStep(4);
                  } else {
                    setShowFieldErrors(true);
                  }
                }}
                style={{
                  ...styles.primaryBtn,
                  opacity: 1
                }}
              >
                Zur Zusammenfassung
                <ChevronRight style={{ width: 20, height: 20 }} />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && (
          <div>
            <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: "600" }}>
              Buchung bestätigen
            </h3>

            {/* Summary */}
            <div style={{
              backgroundColor: "#f8fafc",
              borderRadius: `${settings?.border_radius || 12}px`,
              padding: "16px",
              marginBottom: "16px"
            }}>
              <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Ihre Buchung
              </h4>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Fahrrad</span>
                  <span style={{ fontWeight: "500" }}>{selectedBike?.name}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Zeitraum</span>
                  <span style={{ fontWeight: "500" }}>{formatDate(startDate)} – {formatDate(endDate)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Dauer</span>
                  <span style={{ fontWeight: "500" }}>{availability?.total_days} Tage</span>
                </div>
                {settings?.deposit_required && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>Kaution</span>
                    <span style={{ fontWeight: "500" }}>{formatCurrency(availability?.deposit)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px solid #e2e8f0", marginTop: "4px" }}>
                  <span style={{ fontWeight: "600" }}>Gesamtpreis</span>
                  <span style={{ fontWeight: "700", color: settings?.primary_color || "#f97316", fontSize: "18px" }}>
                    {formatCurrency(availability?.total_price)}
                  </span>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div style={{
              backgroundColor: "#f8fafc",
              borderRadius: `${settings?.border_radius || 12}px`,
              padding: "16px",
              marginBottom: "16px"
            }}>
              <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Ihre Daten
              </h4>
              <p style={{ margin: "0 0 4px", fontWeight: "500" }}>{form.name}</p>
              {form.email && <p style={{ margin: "0 0 4px", color: "#64748b", fontSize: "14px" }}>{form.email}</p>}
              {form.phone && <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>{form.phone}</p>}
            </div>

            {/* Terms */}
            <label style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              cursor: "pointer",
              marginBottom: "16px"
            }}>
              <input
                type="checkbox"
                checked={form.acceptTerms}
                onChange={(e) => setForm({ ...form, acceptTerms: e.target.checked })}
                style={{
                  width: "20px",
                  height: "20px",
                  accentColor: settings?.primary_color || "#f97316",
                  marginTop: "2px"
                }}
              />
              <span style={{ fontSize: "14px", color: "#475569" }}>
                Ich akzeptiere die{" "}
                {settings?.terms_url ? (
                  <a href={settings.terms_url} target="_blank" rel="noopener" style={{ color: settings?.primary_color || "#f97316" }}>AGB</a>
                ) : "AGB"}{" "}
                und{" "}
                {settings?.privacy_url ? (
                  <a href={settings.privacy_url} target="_blank" rel="noopener" style={{ color: settings?.primary_color || "#f97316" }}>Datenschutzerklärung</a>
                ) : "Datenschutzerklärung"}.
              </span>
            </label>

            {error && (
              <div style={{
                padding: "12px",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                color: "#dc2626",
                fontSize: "14px",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <AlertCircle style={{ width: 16, height: 16 }} />
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setStep(3)} style={styles.secondaryBtn} disabled={submitting}>
                <ChevronLeft style={{ width: 16, height: 16, marginRight: "4px" }} />
                Zurück
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.acceptTerms || submitting}
                style={{
                  ...styles.primaryBtn,
                  opacity: form.acceptTerms && !submitting ? 1 : 0.5
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 style={{ width: 20, height: 20, animation: "spin 1s linear infinite" }} />
                    Wird gebucht...
                  </>
                ) : (
                  <>
                    <Check style={{ width: 20, height: 20 }} />
                    Jetzt verbindlich buchen
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Success */}
        {step === 5 && bookingResult && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              backgroundColor: "#f0fdf4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px"
            }}>
              <CheckCircle style={{ width: 48, height: 48, color: "#16a34a" }} />
            </div>

            <h3 style={{ margin: "0 0 8px", fontSize: "24px", fontWeight: "700", color: "#16a34a" }}>
              Buchung erfolgreich!
            </h3>

            <p style={{ margin: "0 0 24px", color: "#64748b" }}>
              {bookingResult.message || settings?.success_text}
            </p>

            <div style={{
              backgroundColor: "#f8fafc",
              borderRadius: `${settings?.border_radius || 12}px`,
              padding: "20px",
              marginBottom: "24px"
            }}>
              <p style={{ margin: "0 0 8px", color: "#64748b", fontSize: "14px" }}>Buchungsnummer</p>
              <p style={{
                margin: 0,
                fontSize: "28px",
                fontWeight: "700",
                letterSpacing: "2px",
                color: settings?.primary_color || "#f97316"
              }}>
                {bookingResult.booking_number}
              </p>
              <p style={{ margin: "16px 0 0", fontSize: "14px", color: "#64748b" }}>
                Status: <span style={{ fontWeight: "500", color: bookingResult.status === "confirmed" ? "#16a34a" : "#f59e0b" }}>
                  {bookingResult.status === "confirmed" ? "Bestätigt" : "Reserviert – Bestätigung folgt"}
                </span>
              </p>
            </div>

            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              justifyContent: "center",
              padding: "12px",
              backgroundColor: "#eff6ff",
              borderRadius: "8px",
              color: "#3b82f6",
              fontSize: "14px"
            }}>
              <Info style={{ width: 16, height: 16 }} />
              Bitte notieren Sie sich Ihre Buchungsnummer
            </div>

            <button
              onClick={() => {
                setStep(1);
                setSelectedBike(null);
                setStartDate(null);
                setEndDate(null);
                setAvailability(null);
                setForm({ name: "", email: "", phone: "", address: "", notes: "", acceptTerms: false });
                setBookingResult(null);
              }}
              style={{ ...styles.secondaryBtn, marginTop: "24px" }}
            >
              Neue Buchung
            </button>
          </div>
        )}

      </div>

      {/* Footer */}
      {(!settings?.subscription_tier || (settings.subscription_tier !== 'pro' && settings.subscription_tier !== 'unlimited')) && (
        <div style={{
          padding: "16px 24px",
          borderTop: "1px solid #e2e8f0",
          textAlign: "center",
          fontSize: "12px",
          color: "#94a3b8"
        }}>
          Powered by RentCore
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, textarea:focus { border-color: ${settings?.primary_color || "#f97316"}; }
      `}</style>
    </div>
  );
}




