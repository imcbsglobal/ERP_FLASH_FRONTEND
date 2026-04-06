import { useState, useEffect } from "react";
import HighlightOffOutlinedIcon from '@mui/icons-material/HighlightOffOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import HistoryIcon from '@mui/icons-material/History';
import StartTrip from "../Components/Start_trip.jsx";
import EndTrip from "../Components/End_trip.jsx";
import {
  fetchTrips,
  startTrip,
  endTrip,
  deleteTrip,
} from "../service/vehiclemanagement";

const statusColors = {
  "Client Visit": { bg: "#e8f5e9", color: "#2e7d32" },
  "Office Supply Run": { bg: "#e3f2fd", color: "#1565c0" },
  "Field Inspection": { bg: "#fff3e0", color: "#e65100" },
  Other: { bg: "#f3e5f5", color: "#6a1b9a" },
};

function ImageCard({ src, label, onExpand }) {
  const isStart = label === "Start";
  const accentColor = isStart ? "#2e7d32" : "#b71c1c";
  const Icon = isStart ? AccessTimeIcon : HistoryIcon;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 90 }}>
      {src ? (
        <div
          onClick={() => onExpand(src, label)}
          title="Click to enlarge"
          style={{
            width: 80,
            height: 60,
            borderRadius: 10,
            overflow: "hidden",
            border: `2px solid ${accentColor}`,
            boxShadow: "0 3px 10px rgba(0,0,0,0.15)",
            cursor: "zoom-in",
            position: "relative",
            flexShrink: 0,
          }}
        >
          <img
            src={src}
            alt={label}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          {/* Hover overlay */}
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(0,0,0,0.28)",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: 0,
            transition: "opacity 0.18s",
          }}
            className="img-overlay"
          >
            <span style={{ color: "#fff", fontSize: 18 }}>🔍</span>
          </div>
        </div>
      ) : (
        <div style={{
          width: 80, height: 60,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          borderRadius: 10,
          border: "1.5px dashed #d0d0d0",
          background: "#fafafa",
          color: "#bdbdbd",
          fontSize: 11,
          fontFamily: "'Nohemi', sans-serif",
          gap: 3,
        }}>
          <span style={{ fontSize: 18 }}>📷</span>
          <span>No image</span>
        </div>
      )}
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
        color: accentColor,
        borderRadius: 20,
        padding: "2px 8px",
        fontFamily: "'Nohemi', sans-serif",
        display: "flex", alignItems: "center", gap: 3,
      }}>
        <Icon style={{ fontSize: 11 }} /> {label}
      </span>
    </div>
  );
}

function ImageLightbox({ src, label, onClose }) {
  if (!src) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.82)",
        backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 2000,
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ position: "relative" }}>
        <img
          src={src}
          alt={label}
          style={{
            maxWidth: "90vw",
            maxHeight: "80vh",
            borderRadius: 14,
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            objectFit: "contain",
            display: "block",
          }}
        />
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: -14, right: -14,
            width: 32, height: 32, borderRadius: "50%",
            background: "#fff", border: "none",
            cursor: "pointer", fontSize: 18,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            color: "#333",
          }}
        >×</button>
      </div>
      <span style={{
        color: "#fff", fontSize: 13, fontFamily: "'Nohemi', sans-serif",
        background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "4px 14px",
      }}>
        {label === "Start" ? "🟢" : "🔴"} {label} Odometer Photo
      </span>
    </div>
  );
}

export default function TravelList() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [showStartTrip, setShowStartTrip] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [showEndTripModal, setShowEndTripModal] = useState(null);
  const [lightbox, setLightbox] = useState(null); // { src, label }

  // ── Load trips from backend on mount ──────────────────────────
  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    setLoading(true);
    setError("");
    try {
      const trips = await fetchTrips();
      setData(trips);
    } catch (err) {
      setError(err.message || "Failed to load trips.");
    } finally {
      setLoading(false);
    }
  };

  // ── Filtered data for search ───────────────────────────────────
  const filtered = data.filter(
    (r) =>
      r.vehicle.toLowerCase().includes(search.toLowerCase()) ||
      r.traveledBy.toLowerCase().includes(search.toLowerCase()) ||
      r.purpose.toLowerCase().includes(search.toLowerCase())
  );

  // ── Start Trip ─────────────────────────────────────────────────
  const handleStart = async (tripData) => {
    setActionLoading(true);
    setError("");
    try {
      const newTrip = await startTrip(tripData);
      // Merge sent fields as fallback so vehicle name + reg show immediately
      const merged = {
        vehicle:             newTrip.vehicle             || newTrip.vehicle_name        || tripData.vehicle_name,
        vehicle_name:        newTrip.vehicle_name        || tripData.vehicle_name,
        vehicleReg:          newTrip.vehicleReg          || newTrip.registration_number  || tripData.registration_number,
        registration_number: newTrip.registration_number || tripData.registration_number,
        ...newTrip,
      };
      setData((prev) => [merged, ...prev]);
      setShowStartTrip(false);
    } catch (err) {
      setError(err.message || "Failed to start trip.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── End Trip ───────────────────────────────────────────────────
  const handleEndTrip = async (tripId, endData) => {
    setActionLoading(true);
    setError("");
    try {
      const updated = await endTrip(tripId, endData);
      setData((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setShowEndTripModal(null);
    } catch (err) {
      setError(err.message || "Failed to end trip.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Delete Trip ────────────────────────────────────────────────
  const handleDelete = async (id) => {
    setActionLoading(true);
    setError("");
    try {
      await deleteTrip(id);
      setData((prev) => prev.filter((r) => r.id !== id));
      setDeleteId(null);
    } catch (err) {
      setError(err.message || "Failed to delete trip.");
    } finally {
      setActionLoading(false);
    }
  };

  const totalDistance = filtered.reduce((s, r) => s + r.distance, 0);
  const totalCost     = filtered.reduce((s, r) => s + r.cost, 0);
  const totalFuel     = filtered.reduce((s, r) => s + r.fuel, 0);

  const purposeTag = (p) => (
    <span style={{
      background: "transparent", color: "#000000",
      fontSize: 13, fontWeight: 500,
      fontFamily: "'Nohemi', sans-serif", whiteSpace: "nowrap",
    }}>
      {p || "—"}
    </span>
  );

  const thStyle = {
    padding: "12px 16px",
    textAlign: "left",
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: "0.6px",
    color: "#000000",
    fontFamily: "'Nohemi', sans-serif",
    textTransform: "capitalize",
    borderBottom: "1.5px solid #e8eaed",
    whiteSpace: "nowrap",
    background: "#f8f9fa",
  };

  const tdStyle = {
    padding: "12px 16px",
    textAlign: "left",
    fontSize: 13,
    color: "#000000",
    fontFamily: "'Nohemi', sans-serif",
    borderBottom: "1px solid #f0f0f0",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.cdnfonts.com/css/nohemi');
        *, *::before, *::after { box-sizing: border-box; font-family: 'Nohemi', sans-serif !important; }
        ::-webkit-scrollbar { height: 6px; width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #0790f8; border-radius: 4px; }
        tr:hover td { background: #f0f8ff !important; }
        .action-btn { opacity: 0.7; transition: opacity 0.15s, transform 0.15s; }
        .action-btn:hover { opacity: 1; transform: scale(1.12); }
        @media (max-width: 768px) {
          .tt-title { font-size: 20px !important; }
          .tt-search { width: 100% !important; }
        }
        .img-card-wrap:hover .img-overlay { opacity: 1 !important; }
      `}</style>

      {/* ── Full-page StartTrip view ── */}
      {showStartTrip && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "#f8f9fa" }}>
          <StartTrip
            onClose={() => setShowStartTrip(false)}
            onStart={handleStart}
          />
        </div>
      )}

      <div style={{ minHeight: "100vh", background: "transparent", padding: "16px", fontFamily: "'Nohemi', sans-serif" }}>

        {/* Global error banner */}
        {error && (
          <div style={{
            maxWidth: 1400, margin: "0 auto 14px",
            background: "#fff0f0", border: "1.5px solid #f5c2c7",
            borderRadius: 10, padding: "10px 18px",
            color: "#b02a37", fontSize: 13, fontFamily: "'Nohemi', sans-serif",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span>⚠️ {error}</span>
            <button
              onClick={() => setError("")}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#b02a37" }}
            >×</button>
          </div>
        )}

        {/* Header */}
        <div style={{ maxWidth: 1400, margin: "0 auto 22px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
            <div>
              <h1 className="tt-title" style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "#000000", letterSpacing: -0.5 }}>
                Travel Log
              </h1>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search vehicle, driver, purpose…"
                style={{
                  padding: "9px 16px", borderRadius: 10, border: "1.5px solid #c8d8e8",
                  fontSize: 13, fontFamily: "'Nohemi', sans-serif", width: 260,
                  background: "#fff", color: "#000000", outline: "none",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                }}
              />
              <button
                onClick={() => setShowStartTrip(true)}
                disabled={actionLoading}
                style={{
                  padding: "9px 22px", borderRadius: 10, border: "none",
                  background: "linear-gradient(135deg, #1a6fdb, #0d4fa8)",
                  color: "#fff", fontWeight: 700, cursor: "pointer",
                  fontSize: 13, fontFamily: "'Nohemi', sans-serif",
                  boxShadow: "0 4px 14px rgba(26,111,219,0.3)",
                  display: "flex", alignItems: "center", gap: 7,
                  opacity: actionLoading ? 0.7 : 1,
                }}
              >
                Start Trip
              </button>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 14, marginTop: 18, flexWrap: "wrap" }}>
            {[
            ].map(({ label, value, icon }) => (
              <div key={label} style={{
                background: "#fff", borderRadius: 12, padding: "12px 20px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.06)", display: "flex",
                alignItems: "center", gap: 12, flex: "1 1 160px",
              }}>
                <span style={{ fontSize: 22 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: 10, color: "#000000", fontFamily: "'Nohemi', sans-serif", textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#000000" }}>{value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ maxWidth: 1400, margin: "0 auto", background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1200 }}>
              <thead>
                <tr>
                  {["Sl.No.", "Vehicle", "Traveled By", "Purpose", "Date & Time", "Odometer", "Distance", "Fuel & Cost", "Photos", "Action"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Loading state */}
                {loading ? (
                  <tr>
                    <td colSpan={10} style={{ ...tdStyle, textAlign: "center", padding: "48px", color: "#000000" }}>
                      <div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>Loading trips…</div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ ...tdStyle, textAlign: "center", padding: "48px", color: "#000000" }}>
                      <div style={{ fontSize: 36, marginBottom: 10 }}>🚗</div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>No travel records found</div>
                      <div style={{ fontSize: 13, marginTop: 4 }}>Add your first entry to get started</div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((row, i) => (
                    <tr key={row.id} style={{ transition: "background 0.15s" }}>
                      <td style={tdStyle}>{i + 1}</td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{
                            color: "#050505", fontSize: 13, fontWeight: 700,
                            fontFamily: "'Nohemi', sans-serif", letterSpacing: 0.4,
                          }}>
                            {row.vehicle || row.vehicle_name || "—"}
                          </span>
                          {(row.vehicleReg || row.registration_number) && (
                            <span style={{
                              color: "#1a6fdb", fontSize: 11, fontWeight: 600,
                              fontFamily: "'Nohemi', sans-serif", letterSpacing: 0.6,
                            }}>
                              {row.vehicleReg || row.registration_number}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{row.traveledBy}</td>
                      <td style={tdStyle}>{purposeTag(row.purpose)}</td>

                      {/* Combined Date & Time column */}
                      <td style={tdStyle}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <div style={{ fontSize: 12, fontWeight: 500 }}>
                            {new Date(row.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            <span style={{ color: "#2e7d32", display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                              <AccessTimeIcon style={{ fontSize: 13 }} /> {row.startTime}
                            </span>
                            <span style={{ color: "#b71c1c", display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                              <HistoryIcon style={{ fontSize: 13 }} /> {row.endTime || "—"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Combined ODO Start & End column */}
                      <td style={tdStyle}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <div style={{ fontSize: 12 }}>Start: {row.odoStart.toLocaleString()} km</div>
                          <div style={{ fontSize: 12 }}>End: {row.odoEnd.toLocaleString()} km</div>
                        </div>
                      </td>

                      <td style={tdStyle}>
                        <span style={{ fontWeight: 700, fontFamily: "'Nohemi', sans-serif", fontSize: 13, color: "#030303" }}>
                          {row.distance} km
                        </span>
                      </td>

                      {/* Combined Fuel & Cost column */}
                      <td style={tdStyle}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <div style={{ fontSize: 12 }}>{row.fuel.toFixed(1)} L</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#080808" }}>₹{row.cost.toLocaleString()}</div>
                        </div>
                      </td>

                      <td style={{ ...tdStyle, padding: "10px 16px" }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <div className="img-card-wrap" style={{ position: "relative" }}>
                            <ImageCard src={row.startImg} label="Start" onExpand={(src, lbl) => setLightbox({ src, label: lbl })} />
                          </div>
                          <div style={{ width: 1, height: 50, background: "#e8eaed", flexShrink: 0 }} />
                          <div className="img-card-wrap" style={{ position: "relative" }}>
                            <ImageCard src={row.endImg} label="End" onExpand={(src, lbl) => setLightbox({ src, label: lbl })} />
                          </div>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {/* End Trip Button */}
                          <button
                            onClick={() => setShowEndTripModal(row.id)}
                            disabled={actionLoading || row.status === "completed"}
                            style={{
                              padding: "5px 12px",
                              borderRadius: 6,
                              border: "none",
                              background: row.status === "completed" ? "#06771f" : "#f4b400",
                              color: "#fdfbfb",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: row.status === "completed" ? "not-allowed" : "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6,
                              fontFamily: "'Nohemi', sans-serif",
                              width: "100%",
                            }}
                          >
                            <StopCircleIcon style={{ fontSize: 14 }} />
                            {row.status === "completed" ? "Completed" : "End Trip"}
                          </button>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              disabled={actionLoading}
                              style={{
                                padding: "5px 12px",
                                borderRadius: 6,
                                border: "none",
                                background: "#1a73e8",
                                color: "#fff",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                fontFamily: "'Nohemi', sans-serif",
                                flex: 1,
                              }}
                            >
                              <EditOutlinedIcon style={{ fontSize: 13 }} /> Edit
                            </button>
                            <button
                              onClick={() => setDeleteId(row.id)}
                              disabled={actionLoading}
                              style={{
                                padding: "5px 12px",
                                borderRadius: 6,
                                border: "none",
                                background: "#d93025",
                                color: "#fff",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                fontFamily: "'Nohemi', sans-serif",
                                flex: 1,
                              }}
                            >
                              <DeleteOutlineOutlinedIcon style={{ fontSize: 13 }} /> Delete
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div style={{
            padding: "12px 20px",
            background: "white",
            borderTop: "1px solid white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 12,
            color: "#000000",
            fontFamily: "'Nohemi', sans-serif",
          }}>
          </div>
        </div>
      </div>

      {/* Delete Confirm */}
      {deleteId && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(10,25,40,0.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={() => setDeleteId(null)}
        >
          <div
            style={{ background: "#fff", borderRadius: 16, padding: "28px 32px", maxWidth: 360, width: "90vw", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
            <h3 style={{ margin: "0 0 8px", fontSize: 18, color: "#000000" }}>Delete Entry?</h3>
            <p style={{ margin: "0 0 22px", fontSize: 13, color: "#000000" }}>This action cannot be undone.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                onClick={() => setDeleteId(null)}
                disabled={actionLoading}
                style={{ padding: "9px 22px", borderRadius: 9, border: "1.5px solid #c8d8e8", background: "#fff", color: "#000000", fontWeight: 600, cursor: "pointer", fontFamily: "'Nohemi', sans-serif", fontSize: 14 }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={actionLoading}
                style={{ padding: "9px 22px", borderRadius: 9, border: "none", background: "#d32f2f", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "'Nohemi', sans-serif", fontSize: 14, opacity: actionLoading ? 0.7 : 1 }}
              >
                {actionLoading ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Trip – Full Page Overlay */}
      {showEndTripModal && (() => {
        const trip = data.find((t) => t.id === showEndTripModal);
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "#f8f9fa" }}>
            <EndTrip
              onClose={() => setShowEndTripModal(null)}
              onComplete={(endData) => handleEndTrip(trip.id, endData)}
              tripData={{
                vehicle_name:    trip?.vehicle    ?? '',
                date:            trip?.date        ?? '',
                time:            trip?.startTime   ?? '',
                purpose_of_trip: trip?.purpose     ?? '',
                odometer_start:  trip?.odoStart    ?? null,
              }}
            />
          </div>
        );
      })()}
      {/* Image Lightbox */}
      {lightbox && (
        <ImageLightbox
          src={lightbox.src}
          label={lightbox.label}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}