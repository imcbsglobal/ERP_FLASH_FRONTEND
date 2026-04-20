import { useState, useEffect } from "react";
import HighlightOffOutlinedIcon from '@mui/icons-material/HighlightOffOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import HistoryIcon from '@mui/icons-material/History';
import PreviewOutlinedIcon from '@mui/icons-material/PreviewOutlined';
import StartTrip from "../Components/Start_trip.jsx";
import EndTrip from "../Components/End_trip.jsx";
import {
  fetchTrips,
  startTrip,
  endTrip,
  deleteTrip,
} from "../service/vehiclemanagement";
import { Bold } from "lucide-react";

const statusColors = {
  "Client Visit": { bg: "#e8f5e9", color: "#2e7d32" },
  "Office Supply Run": { bg: "#e3f2fd", color: "#1565c0" },
  "Field Inspection": { bg: "#fff3e0", color: "#e65100" },
  Other: { bg: "#f3e5f5", color: "#6a1b9a" },
};

function ImageCard({ src, label, onExpand, odoValue }) {
  const isStart = label === "Start";
  const accentColor = isStart ? "#2e7d32" : "#b71c1c";
  const Icon = isStart ? AccessTimeIcon : HistoryIcon;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 90 }}>
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
        color: accentColor,
        borderRadius: 20,
        padding: "2px 8px",
        fontFamily: "'Google Sans', sans-serif",
        display: "flex", alignItems: "center", gap: 3,
      }}>
        <Icon style={{ fontSize: 11 }} /> {label}
      </span>
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
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(0,0,0,0.28)",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: 0,
            transition: "opacity 0.18s",
          }}
            className="img-overlay"
          >
            <span style={{ color: "#fff", fontSize: 14 }}>🔍</span>
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
          fontFamily: "'Google Sans', sans-serif",
          gap: 3,
        }}>
          <span style={{ fontSize: 14 }}>📷</span>
          <span>No image</span>
        </div>
      )}
      {odoValue != null && odoValue !== 0 ? (
        <span style={{
          fontSize: 10, fontWeight: 700,
          color: "#202124",
          fontFamily: "'Google Sans', sans-serif",
          letterSpacing: 0.2,
          whiteSpace: "nowrap",
        }}>
          {Number(odoValue).toLocaleString('en-IN')} km
        </span>
      ) : (
        <span style={{
          fontSize: 10, color: "#bdbdbd",
          fontFamily: "'Google Sans', sans-serif",
        }}>—</span>
      )}
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
            cursor: "pointer", fontSize: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            color: "#333",
          }}
        >×</button>
      </div>
      <span style={{
        color: "#fff", fontSize: 13, fontFamily: "'Google Sans', sans-serif",
        background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "4px 14px",
      }}>
        {label === "Start" ? "🟢" : "🔴"} {label} Odometer Photo
      </span>
    </div>
  );
}

export default function TravelList() {
  const getLoggedInUserName = () => {
    try {
      const userJson = localStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        return user.name || user.full_name || user.username || user.email || '—';
      }
      return (
        localStorage.getItem('user_name') ||
        localStorage.getItem('full_name') ||
        localStorage.getItem('username') ||
        localStorage.getItem('name') ||
        '—'
      );
    } catch {
      return '—';
    }
  };
  const loggedInUser = getLoggedInUserName();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [showStartTrip, setShowStartTrip] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [showEndTripModal, setShowEndTripModal] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [purposePopup, setPurposePopup] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    setLoading(true);
    setError("");
    try {
      const trips = await fetchTrips();
      setData(trips);
      setCurrentPage(1); // Reset to first page when data loads
    } catch (err) {
      setError(err.message || "Failed to load trips.");
    } finally {
      setLoading(false);
    }
  };

  const filtered = data.filter(
    (r) =>
      r.vehicle?.toLowerCase().includes(search.toLowerCase()) ||
      r.traveledBy?.toLowerCase().includes(search.toLowerCase()) ||
      r.purpose?.toLowerCase().includes(search.toLowerCase())
  );

  // Pagination calculations
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filtered.slice(startIndex, endIndex);

  // Pagination handlers
  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Get visible page numbers for pagination
  const getVisiblePages = () => {
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  const handleStart = async (tripData) => {
    setActionLoading(true);
    setError("");
    try {
      const newTrip = await startTrip(tripData);
      const merged = {
        vehicle:             newTrip.vehicle             || newTrip.vehicle_name        || tripData.vehicle_name,
        vehicle_name:        newTrip.vehicle_name        || tripData.vehicle_name,
        vehicleReg:          newTrip.vehicleReg          || newTrip.registration_number  || tripData.registration_number,
        registration_number: newTrip.registration_number || tripData.registration_number,
        traveledBy:          newTrip.traveled_by         || newTrip.traveledBy           || loggedInUser,
        odoStart:            newTrip.odometer_start      || newTrip.odoStart             || null,
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

  const thStyle = {
    padding: "12px 16px",
    textAlign: "left",
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: "0.6px",
    color: "#fdfbfb",
    fontFamily: "'Google Sans', sans-serif",
    textTransform: "capitalize",
    borderBottom: "1.5px solid #e8eaed",
    whiteSpace: "nowrap",
    background: "#0f83f7",
    position: "sticky",
    top: 0,
    zIndex: 10,
  };

  const tdStyle = {
    padding: "8px 12px",
    textAlign: "left",
    fontSize: 10,
    color: "#000000",
    fontFamily: "'Google Sans', sans-serif",
    borderBottom: "1px solid #f0f0f0",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  };

  const currentTrip = showEndTripModal ? data.find((t) => t.id === showEndTripModal) : null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; font-family: 'Google Sans', sans-serif !important; }
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
        .scrollable-table-body {
          flex: 1;
          overflow-y: auto;
          overflow-x: auto;
          min-height: 0;
        }
        .scrollable-table-body table {
          width: 100%;
          border-collapse: collapse;
        }
        html, body, #root {
          height: 100%;
          margin: 0;
          padding: 0;
        }
        
        /* Pagination Styles */
        .pagination-container {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 8px;
          padding: 16px 20px;
          background: #fff;
          border-top: 1px solid #e8eaed;
          flex-shrink: 0;
        }
        
        .pagination-button {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 36px;
          height: 36px;
          padding: 0 12px;
          border: 1px solid #e8eaed;
          background: #fff;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #5f6368;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Google Sans', sans-serif;
        }
        
        .pagination-button:hover:not(:disabled) {
          background: #f8f9fa;
          border-color: #1a73e8;
          color: #1a73e8;
        }
        
        .pagination-button.active {
          background: #1a73e8;
          border-color: #1a73e8;
          color: #fff;
        }
        
        .pagination-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .pagination-ellipsis {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 36px;
          height: 36px;
          font-size: 14px;
          color: #5f6368;
        }
        
        .pagination-info {
          font-size: 13px;
          color: #5f6368;
          margin-right: auto;
          font-family: 'Google Sans', sans-serif;
        }
      `}</style>

      {showStartTrip && (
        <StartTrip
          onClose={() => setShowStartTrip(false)}
          onStart={handleStart}
        />
      )}

      {showEndTripModal && currentTrip && (
        <EndTrip
          onClose={() => setShowEndTripModal(null)}
          onComplete={(endData) => handleEndTrip(currentTrip.id, endData)}
          tripData={{
            vehicle_name:    currentTrip?.vehicle    ?? '',
            date:            currentTrip?.date        ?? '',
            time:            currentTrip?.startTime   ?? '',
            purpose_of_trip: currentTrip?.purpose     ?? '',
            odometer_start:  currentTrip?.odoStart    ?? null,
            end_date:        new Date().toISOString().split("T")[0],
            end_time:        new Date().toTimeString().slice(0, 5),
          }}
        />
      )}

      {!showStartTrip && !showEndTripModal && (
        <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "transparent", padding: "0", fontFamily: "'Google Sans', sans-serif" }}>

          {error && (
            <div style={{
              margin: "0 0 14px 0",
              background: "#fff0f0", border: "1.5px solid #f5c2c7",
              borderRadius: 10, padding: "10px 18px",
              color: "#b02a37", fontSize: 13, fontFamily: "'Google Sans', sans-serif",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span>⚠️ {error}</span>
              <button
                onClick={() => setError("")}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#b02a37" }}
              >×</button>
            </div>
          )}

          <div style={{ margin: "0 0 22px 0", width: "100%", flexShrink: 0, padding: "0 16px" }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
              <div>
                <h1 className="tt-title" style={{ margin: 0, fontSize: 25, fontWeight: "600", color: "black", letterSpacing: -0.5 }}>
                  Travel Log
                </h1>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1); // Reset to first page on search
                  }}
                  placeholder="Search vehicle, driver, purpose…"
                  style={{
                    padding: "9px 16px", borderRadius: 10, border: "1.5px solid #c8d8e8",
                    fontSize: 13, fontFamily: "'Google Sans', sans-serif", width: 260,
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
                    fontSize: 13, fontFamily: "'Google Sans', sans-serif",
                    boxShadow: "0 4px 14px rgba(26,111,219,0.3)",
                    display: "flex", alignItems: "center", gap: 7,
                    opacity: actionLoading ? 0.7 : 1,
                  }}
                >
                  Start Trip
                </button>
              </div>
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: "16px 16px 0 0", overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", flex: 1, minHeight: 0, width: "100%" }}>
            <div className="scrollable-table-body" style={{ flex: 1, overflowY: "auto", overflowX: "auto", minHeight: 0 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1200 }}>
                <thead>
                  <tr>
                    {["Sl.No.", "Start Date", "Vehicle", "Traveled By", "Purpose", "Odometer Photos", "Distance", "Fuel & Cost", "End Date", "Action"].map((h) => (
                      <th key={h} style={{ ...thStyle, textAlign: h === "Photos" ? "center" : "left" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={10} style={{ ...tdStyle, textAlign: "center", padding: "48px", color: "#000000" }}>
                        <div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>Loading trips…</div>
                      </td>
                    </tr>
                  ) : currentData.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ ...tdStyle, textAlign: "center", padding: "48px", color: "#000000" }}>
                        <div style={{ fontSize: 36, marginBottom: 10 }}>🚗</div>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>No travel records found</div>
                        <div style={{ fontSize: 13, marginTop: 4 }}>Add your first entry to get started</div>
                      </td>
                    </tr>
                  ) : (
                    currentData.map((row, i) => (
                      <tr key={row.id} style={{ transition: "background 0.15s" }}>
                        {/* Sl.No. */}
                        <td style={tdStyle}>{startIndex + i + 1}</td>

                        {/* Start Date */}
                        <td style={tdStyle}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
                              <AccessTimeIcon style={{ fontSize: 13, color: "#2e7d32", flexShrink: 0 }} />
                              <span style={{ fontSize: 12, fontWeight: 500, color: "#000", whiteSpace: "nowrap" }}>
                                {row.date ? new Date(row.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                              </span>
                            </div>
                            <span style={{ fontSize: 11, color: "#2e7d32", paddingLeft: 18 }}>{row.startTime || "—"}</span>
                          </div>
                        </td>

                        {/* Vehicle */}
                        <td style={tdStyle}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <span style={{
                              color: "#050505", fontSize: 14, fontWeight: 700,
                              fontFamily: "'Google Sans', sans-serif", letterSpacing: 0.4,
                            }}>
                              {row.vehicle || row.vehicle_name || "—"}
                            </span>
                            {(row.vehicleReg || row.registration_number) && (
                              <span style={{
                                color: "#1a6fdb", fontSize: 14, fontWeight: 600,
                                fontFamily: "'Google Sans', sans-serif", letterSpacing: 0.6,
                              }}>
                                {row.vehicleReg || row.registration_number}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Traveled By */}
                        <td style={{ ...tdStyle, fontWeight: 600, fontSize: 14 }}>
                          {row.traveledBy || loggedInUser}
                        </td>

                        {/* Purpose */}
                        <td style={{ ...tdStyle, textAlign: "center" }}>
                          {row.purpose ? (
                            <button
                              onClick={() => setPurposePopup(row.purpose)}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#1a73e8", display: "inline-flex", alignItems: "center", padding: 0 }}
                            >
                              <PreviewOutlinedIcon style={{ fontSize: 22 }} />
                            </button>
                          ) : (
                            <span style={{ color: "#cbd5e1", fontSize: 12 }}>—</span>
                          )}
                        </td>

                        {/* Photos */}
                        <td style={{ ...tdStyle, padding: "10px 16px" }}>
                          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <div className="img-card-wrap" style={{ position: "relative" }}>
                              <ImageCard src={row.startImg} label="Start" onExpand={(src, lbl) => setLightbox({ src, label: lbl })} odoValue={row.odoStart} />
                            </div>
                            <div style={{ width: 1, height: 60, background: "#e8eaed", flexShrink: 0 }} />
                            <div className="img-card-wrap" style={{ position: "relative" }}>
                              <ImageCard src={row.endImg} label="End" onExpand={(src, lbl) => setLightbox({ src, label: lbl })} odoValue={row.odoEnd} />
                            </div>
                          </div>
                        </td>

                        {/* Distance */}
                        <td style={tdStyle}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: "#030303" }}>
                            {row.distance || 0} km
                          </span>
                        </td>

                        {/* Fuel & Cost */}
                        <td style={{ ...tdStyle, textAlign: "left" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <div style={{ fontSize: 14, textAlign: "left", color: "#000000" }}>{row.fuel?.toFixed(1) || 0} L</div>
                            <div style={{ fontSize: 14, textAlign: "center", fontWeight: 700, color: "#080808" }}>₹{(row.cost || 0).toLocaleString()}</div>
                          </div>
                        </td>

                        {/* End Date */}
                        <td style={tdStyle}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
                              <HistoryIcon style={{ fontSize: 13, color: "#b71c1c", flexShrink: 0 }} />
                              <span style={{ fontSize: 12, fontWeight: 500, color: "#000", whiteSpace: "nowrap" }}>
                                {(row.endDate || row.end_date) ? new Date(row.endDate || row.end_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                              </span>
                            </div>
                            <span style={{ fontSize: 11, color: "#b71c1c", paddingLeft: 18 }}>{row.endTime || "—"}</span>
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <button
                              onClick={() => setShowEndTripModal(row.id)}
                              disabled={actionLoading || row.status === "completed"}
                              style={{
                                padding: "5px 12px",
                                borderRadius: 6,
                                border: "none",
                                background: row.status === "completed" ? "#06771f" : "#f4b400",
                                color: "#fdfbfb",
                                fontSize: 14,
                                fontWeight: 600,
                                cursor: row.status === "completed" ? "not-allowed" : "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 6,
                                fontFamily: "'Google Sans', sans-serif",
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
                                  fontSize: 14,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                  fontFamily: "'Google Sans', sans-serif",
                                  flex: 1,
                                }}
                              >
                                <EditOutlinedIcon style={{ fontSize: 14 }} /> Edit
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
                                  fontSize: 14,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                  fontFamily: "'Google Sans', sans-serif",
                                  flex: 1,
                                }}
                              >
                                <DeleteOutlineOutlinedIcon style={{ fontSize: 14 }} /> Delete
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
            
            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <div className="pagination-container">
                <div className="pagination-info">
                  Showing {filtered.length > 0 ? startIndex + 1 : 0} to {Math.min(endIndex, filtered.length)} of {filtered.length} entries
                </div>
                <button
                  className="pagination-button"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                >
                  ‹ Previous
                </button>
                
                {getVisiblePages()[0] > 1 && (
                  <>
                    <button
                      className="pagination-button"
                      onClick={() => goToPage(1)}
                    >
                      1
                    </button>
                    {getVisiblePages()[0] > 2 && <span className="pagination-ellipsis">...</span>}
                  </>
                )}
                
                {getVisiblePages().map(page => (
                  <button
                    key={page}
                    className={`pagination-button ${currentPage === page ? 'active' : ''}`}
                    onClick={() => goToPage(page)}
                  >
                    {page}
                  </button>
                ))}
                
                {getVisiblePages()[getVisiblePages().length - 1] < totalPages && (
                  <>
                    {getVisiblePages()[getVisiblePages().length - 1] < totalPages - 1 && <span className="pagination-ellipsis">...</span>}
                    <button
                      className="pagination-button"
                      onClick={() => goToPage(totalPages)}
                    >
                      {totalPages}
                    </button>
                  </>
                )}
                
                <button
                  className="pagination-button"
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                >
                  Next ›
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {purposePopup && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setPurposePopup(null)}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "24px 28px", maxWidth: 400, width: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", fontFamily: "'Google Sans', sans-serif" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <PreviewOutlinedIcon style={{ fontSize: 20, color: "#1a73e8" }} />
              <span style={{ fontWeight: 700, fontSize: 15, color: "#202124" }}>Purpose</span>
            </div>
            <p style={{ margin: 0, fontSize: 14, color: "#3c3c3c", lineHeight: 1.8, whiteSpace: "pre-wrap", wordBreak: "break-word", overflowWrap: "break-word", maxHeight: 300, overflowY: "auto" }}>{purposePopup}</p>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setPurposePopup(null)} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#1a73e8", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "'Google Sans', sans-serif" }}>Close</button>
            </div>
          </div>
        </div>
      )}

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
            <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#000000" }}>Delete Entry?</h3>
            <p style={{ margin: "0 0 22px", fontSize: 13, color: "#000000" }}>This action cannot be undone.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                onClick={() => setDeleteId(null)}
                disabled={actionLoading}
                style={{ padding: "9px 22px", borderRadius: 9, border: "1.5px solid #c8d8e8", background: "#fff", color: "#000000", fontWeight: 600, cursor: "pointer", fontFamily: "'Google Sans', sans-serif", fontSize: 14 }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={actionLoading}
                style={{ padding: "9px 22px", borderRadius: 9, border: "none", background: "#d32f2f", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "'Google Sans', sans-serif", fontSize: 14, opacity: actionLoading ? 0.7 : 1 }}
              >
                {actionLoading ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
      
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