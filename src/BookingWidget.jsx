import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Bike, Calendar, ChevronLeft, ChevronRight, Check, X, Loader2,
  User, Mail, Phone, MapPin, FileText, Euro, Clock, AlertCircle,
  CheckCircle, ChevronDown, Info
} from "lucide-react";

// ============ CONFIG ============
// Diese Werte werden beim Einbetten überschrieben
const DEFAULT_SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
const DEFAULT_SUPABASE_KEY = "YOUR_ANON_KEY";

// ============ WIDGET COMPONENT ============
export default function VeloRentBookingWidget({
  supabaseUrl = DEFAULT_SUPABASE_URL,
  supabaseKey = DEFAULT_SUPABASE_KEY,
  apiKey,
  locale = "de",
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

  // ============ LOAD INITIAL DATA ============
  useEffect(() => {
    if (!apiKey) {
      setError("API Key fehlt");
      setLoading(false);
      return;
    }
    loadData();
  }, [apiKey]);

  const loadData = async () => {
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
  };

  // ============ LOAD BLOCKED DATES WHEN BIKE SELECTED ============
  useEffect(() => {
    if (selectedBike && apiKey) {
      loadBlockedDates(selectedBike.id);
    }
  }, [selectedBike, apiKey]);

  const loadBlockedDates = async (bikeId) => {
    const { data } = await supabase.rpc("get_blocked_dates", {
      p_api_key: apiKey,
      p_bike_id: bikeId
    });
    setBlockedDates(data?.blocked_dates || []);
  };

  // ============ CHECK AVAILABILITY ============
  useEffect(() => {
    if (selectedBike && startDate && endDate) {
      checkAvailability();
    }
  }, [selectedBike, startDate, endDate]);

  const checkAvailability = async () => {
    const { data } = await supabase.rpc("check_availability", {
      p_api_key: apiKey,
      p_bike_id: selectedBike.id,
      p_start_date: formatDateISO(startDate),
      p_end_date: formatDateISO(endDate)
    });
    setAvailability(data);
  };

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

  // ============ HELPERS ============
  const formatDateISO = (d) => d?.toISOString().slice(0, 10);
  const formatDate = (d) => d?.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const formatCurrency = (n) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n || 0);

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
            <React.Fragment key={s}>
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
            </React.Fragment>
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
                onClick={() => availability?.available && setStep(3)}
                disabled={!availability?.available}
                style={{
                  ...styles.primaryBtn,
                  opacity: availability?.available ? 1 : 0.5,
                  cursor: availability?.available ? "pointer" : "not-allowed"
                }}
              >
                Weiter zu Ihren Daten
                <ChevronRight style={{ width: 20, height: 20 }} />
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
                onClick={() => form.name.length >= 2 && setStep(4)}
                disabled={form.name.length < 2}
                style={{
                  ...styles.primaryBtn,
                  opacity: form.name.length >= 2 ? 1 : 0.5
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
          Powered by VeloRent Pro
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, textarea:focus { border-color: ${settings?.primary_color || "#f97316"}; }
      `}</style>
    </div>
  );
}

// ============ DATE RANGE PICKER COMPONENT ============
function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  blockedDates = [],
  minDays = 1,
  maxDays = 30,
  maxAdvanceDays = 90,
  primaryColor = "#f97316",
  borderRadius = 12
}) {
  const [viewMonth, setViewMonth] = useState(new Date());
  const [selecting, setSelecting] = useState("start"); // "start" or "end"

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + maxAdvanceDays);

  const blockedSet = useMemo(() => new Set(blockedDates), [blockedDates]);

  const calendar = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startPad = (firstDay.getDay() + 6) % 7;
    const days = [];

    for (let i = -startPad; i <= lastDay.getDate() + (6 - (lastDay.getDay() + 6) % 7); i++) {
      const d = new Date(year, month, i + 1);
      days.push(d);
    }

    return { days, monthLabel: viewMonth.toLocaleDateString("de-DE", { month: "long", year: "numeric" }) };
  }, [viewMonth]);

  const isBlocked = (d) => {
    const iso = d.toISOString().slice(0, 10);
    return blockedSet.has(iso);
  };

  const isDisabled = (d) => {
    return d < today || d > maxDate || isBlocked(d);
  };

  const isInRange = (d) => {
    if (!startDate || !endDate) return false;
    return d >= startDate && d <= endDate;
  };

  const handleDayClick = (d) => {
    if (isDisabled(d)) return;

    if (selecting === "start" || !startDate || d < startDate) {
      onStartDateChange(d);
      onEndDateChange(null);
      setSelecting("end");
    } else {
      // Check if range is valid
      const days = Math.ceil((d - startDate) / (1000 * 60 * 60 * 24)) + 1;
      if (days > maxDays) {
        alert(`Maximal ${maxDays} Tage buchbar`);
        return;
      }

      // Check if any blocked date in range
      for (let check = new Date(startDate); check <= d; check.setDate(check.getDate() + 1)) {
        if (isBlocked(check)) {
          alert("Im gewählten Zeitraum ist ein Tag bereits belegt");
          return;
        }
      }

      onEndDateChange(d);
      setSelecting("start");
    }
  };

  return (
    <div>
      {/* Selected Dates Display */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
        <div style={{
          padding: "12px",
          border: selecting === "start" ? `2px solid ${primaryColor}` : "1px solid #e2e8f0",
          borderRadius: `${borderRadius}px`,
          cursor: "pointer"
        }} onClick={() => setSelecting("start")}>
          <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#64748b" }}>Von</p>
          <p style={{ margin: 0, fontWeight: "600" }}>
            {startDate ? startDate.toLocaleDateString("de-DE") : "Datum wählen"}
          </p>
        </div>
        <div style={{
          padding: "12px",
          border: selecting === "end" ? `2px solid ${primaryColor}` : "1px solid #e2e8f0",
          borderRadius: `${borderRadius}px`,
          cursor: "pointer"
        }} onClick={() => startDate && setSelecting("end")}>
          <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#64748b" }}>Bis</p>
          <p style={{ margin: 0, fontWeight: "600" }}>
            {endDate ? endDate.toLocaleDateString("de-DE") : "Datum wählen"}
          </p>
        </div>
      </div>

      {/* Calendar */}
      <div style={{ border: "1px solid #e2e8f0", borderRadius: `${borderRadius}px`, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", backgroundColor: "#f8fafc" }}>
          <button
            onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1))}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "8px" }}
          >
            <ChevronLeft style={{ width: 20, height: 20 }} />
          </button>
          <span style={{ fontWeight: "600" }}>{calendar.monthLabel}</span>
          <button
            onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1))}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "8px" }}
          >
            <ChevronRight style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* Weekdays */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid #e2e8f0" }}>
          {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map(d => (
            <div key={d} style={{ padding: "8px", textAlign: "center", fontSize: "12px", fontWeight: "500", color: "#64748b" }}>
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {calendar.days.map((d, i) => {
            const isCurrentMonth = d.getMonth() === viewMonth.getMonth();
            const disabled = isDisabled(d);
            const blocked = isBlocked(d);
            const isStart = startDate && d.getTime() === startDate.getTime();
            const isEnd = endDate && d.getTime() === endDate.getTime();
            const inRange = isInRange(d);
            const isToday = d.getTime() === today.getTime();

            return (
              <button
                key={i}
                onClick={() => handleDayClick(d)}
                disabled={disabled}
                style={{
                  padding: "10px",
                  border: "none",
                  background: isStart || isEnd
                    ? primaryColor
                    : inRange
                      ? `${primaryColor}20`
                      : blocked
                        ? "#fee2e2"
                        : "transparent",
                  color: isStart || isEnd
                    ? "white"
                    : disabled
                      ? "#cbd5e1"
                      : !isCurrentMonth
                        ? "#94a3b8"
                        : "#1e293b",
                  fontWeight: isToday || isStart || isEnd ? "600" : "400",
                  cursor: disabled ? "not-allowed" : "pointer",
                  borderRadius: isStart ? `${borderRadius}px 0 0 ${borderRadius}px` : isEnd ? `0 ${borderRadius}px ${borderRadius}px 0` : 0,
                  position: "relative"
                }}
              >
                {d.getDate()}
                {isToday && !isStart && !isEnd && (
                  <div style={{
                    position: "absolute",
                    bottom: "4px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "4px",
                    height: "4px",
                    borderRadius: "50%",
                    backgroundColor: primaryColor
                  }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "16px", marginTop: "12px", fontSize: "12px", color: "#64748b" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{ width: "12px", height: "12px", borderRadius: "2px", backgroundColor: "#fee2e2" }} />
          Belegt
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{ width: "12px", height: "12px", borderRadius: "2px", backgroundColor: `${primaryColor}20` }} />
          Ihre Auswahl
        </div>
      </div>
    </div>
  );
}

// ============ STANDALONE EMBED SCRIPT ============
// Für Hotels die nur ein Script einbinden wollen
export function initVeloRentWidget(containerId, options) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error("VeloRent: Container not found:", containerId);
    return;
  }

  // React dynamisch laden falls nicht vorhanden
  if (typeof React === "undefined") {
    const script = document.createElement("script");
    script.src = "https://unpkg.com/react@18/umd/react.production.min.js";
    script.onload = () => {
      const script2 = document.createElement("script");
      script2.src = "https://unpkg.com/react-dom@18/umd/react-dom.production.min.js";
      script2.onload = () => renderWidget(container, options);
      document.head.appendChild(script2);
    };
    document.head.appendChild(script);
  } else {
    renderWidget(container, options);
  }
}

function renderWidget(container, options) {
  const root = ReactDOM.createRoot(container);
  root.render(React.createElement(VeloRentBookingWidget, options));
}
