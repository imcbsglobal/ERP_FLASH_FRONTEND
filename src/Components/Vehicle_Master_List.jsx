import { useState, useEffect, useCallback } from "react";
import DirectionsCarOutlinedIcon from "@mui/icons-material/DirectionsCarOutlined";
import TwoWheelerOutlinedIcon from "@mui/icons-material/TwoWheelerOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import TableRowsOutlinedIcon from "@mui/icons-material/TableRowsOutlined";
import GridViewOutlinedIcon from "@mui/icons-material/GridViewOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import FilterListOutlinedIcon from "@mui/icons-material/FilterListOutlined";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import NavigateBeforeOutlinedIcon from "@mui/icons-material/NavigateBeforeOutlined";
import NavigateNextOutlinedIcon from "@mui/icons-material/NavigateNextOutlined";
import FirstPageOutlinedIcon from "@mui/icons-material/FirstPageOutlined";
import LastPageOutlinedIcon from "@mui/icons-material/LastPageOutlined";
import VehicleForm from "./Vehicle_Master_Add";
import { getVehicles, deleteVehicle, ENDPOINTS } from "../service/Api";

const VEHICLE_TYPES  = ["All Types", "Car", "Bike", "Truck", "Van", "Bus", "Other"];
const STATUS_OPTIONS = ["All", "Active", "Inactive"];
const PAGE_SIZE = 10; // Items per page

/* ─── Resolve image URL (handles relative /media/... paths) ── */
function resolveImageUrl(raw) {
  return ENDPOINTS.mediaUrl(raw);
}

/* ─── Normalise API response → UI shape ──────────────────── */
function normalise(v) {
  // Django can return the photo as vehicle_photo (FileField) or vehicle_photo_url (SerializerMethodField)
  const rawPhoto = v.vehicle_photo_url || v.vehicle_photo || null;
  return {
    id:               v.id,
    name:             v.vehicle_name,
    reg:              v.registration_number,
    company:          v.company_brand       || "—",
    ownership:        v.ownership           || "—",
    type:             v.vehicle_type        || "—",
    fuel:             v.fuel_type           || "—",
    insurance_expiry: v.insurance_expired_date || null,
    pollution_expiry: v.pollution_expired_date || null,
    odometer:         v.current_odometer    ?? 0,
    total_trips:      v.total_trips         ?? 0,
    status:           v.status || "Active",
    image:            resolveImageUrl(rawPhoto),
    // keep raw for edit pre-fill
    _raw: v,
  };
}

/* ─── Vehicle icon placeholder ───────────────────────────── */
function VehicleIcon({ type }) {
  const Icon = (type || "").toLowerCase() === "bike" ? TwoWheelerOutlinedIcon : DirectionsCarOutlinedIcon;
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      height: 200, background: "linear-gradient(135deg, #f8f9fa 0%, #eef1f5 100%)",
      borderBottom: "1px solid #e8eaed", gap: 10,
    }}>
      <Icon style={{ fontSize: 64, color: "#c5cad3" }} />
      <span style={{ fontSize: 11, color: "#9aa0a6", fontFamily: "'Google Sans', sans-serif", fontWeight: 600, letterSpacing: 0.5 }}>
        No Photo
      </span>
    </div>
  );
}

/* ─── Image Lightbox ──────────────────────────────────────── */
function ImageLightbox({ src, alt, onClose }) {
  if (!src) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 3000, flexDirection: "column", gap: 16,
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{ position: "relative" }}>
        <img
          src={src}
          alt={alt}
          style={{
            maxWidth: "88vw", maxHeight: "82vh",
            borderRadius: 16,
            boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
            objectFit: "contain", display: "block",
          }}
        />
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: -14, right: -14,
            width: 34, height: 34, borderRadius: "50%",
            background: "#fff", border: "none",
            cursor: "pointer", fontSize: 20, lineHeight: 1,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
            color: "#202124", fontWeight: 700,
          }}
        >×</button>
      </div>
      <span style={{
        color: "rgba(255,255,255,0.75)", fontSize: 12,
        fontFamily: "'Google Sans', sans-serif", letterSpacing: 0.4,
      }}>
        {alt} · Click anywhere to close
      </span>
    </div>
  );
}

/* ─── Card image with fallback + hover + lightbox ─────────── */
function CardImage({ src, alt, type, onExpand }) {
  const [failed, setFailed] = useState(false);
  const [hovered, setHovered] = useState(false);

  if (!src || failed) return <VehicleIcon type={type} />;

  return (
    <div
      style={{ position: "relative", height: 200, overflow: "hidden", cursor: "zoom-in" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onExpand && onExpand(src, alt)}
    >
      <img
        src={src}
        alt={alt}
        style={{
          width: "100%", height: "100%", objectFit: "cover", display: "block",
          transition: "transform 0.35s ease",
          transform: hovered ? "scale(1.06)" : "scale(1)",
        }}
        onError={() => setFailed(true)}
      />
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 55%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", inset: 0,
        background: "rgba(0,0,0,0.28)",
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: hovered ? 1 : 0,
        transition: "opacity 0.22s",
        pointerEvents: "none",
      }}>
        <div style={{
          background: "rgba(255,255,255,0.92)",
          borderRadius: "50%", width: 44, height: 44,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
          fontSize: 20,
        }}>🔍</div>
      </div>
    </div>
  );
}

/* ─── Status pill ─────────────────────────────────────────── */
function StatusPill({ status }) {
  const isActive = status === "Active";
  return (
    <span style={{
      position: "absolute", top: 12, right: 12,
      padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
      background: isActive ? "#188038" : "#d93025",
      color:      isActive ? "#fbfdfc" : "#fffcfc",
      fontFamily: "'Google Sans', sans-serif",
      border: `1px solid ${isActive ? "#a8d5b5" : "#f5c2be"}`,
    }}>
      {status}
    </span>
  );
}

/* ─── Days Left helper ────────────────────────────────────── */
function daysLeft(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(dateStr);
  expiry.setHours(0, 0, 0, 0);
  return Math.round((expiry - today) / (1000 * 60 * 60 * 24));
}

function DaysLeftBadge({ days }) {
  if (days === null) return <span style={{ color: "#9aa0a6", fontSize: 12 }}>—</span>;
  let bg, color;
  if (days < 0)       { bg = "#fce8e6"; color = "#d93025"; }
  else if (days <= 30){ bg = "#fef7e0"; color = "#b06000"; }
  else                { bg = "#e6f4ea"; color = "#188038"; }
  return (
    <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: bg, color, fontFamily: "'Google Sans', sans-serif", whiteSpace: "nowrap" }}>
      {days < 0 ? `Expired ${Math.abs(days)}d ago` : `${days}d left`}
    </span>
  );
}

/* ─── Table View with fixed header and scrollable body ── */
function TableView({ vehicles, onEdit, onDelete }) {
  const thStyle = {
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: "0.4px",
    color: "#fdfafa",
    textAlign: "left",
    padding: "11px 14px",
    background: "#0982fc",
    borderBottom: "1px solid #e8eaed",
    fontFamily: "'Google Sans', sans-serif",
    whiteSpace: "nowrap",
    textTransform: "capitalize",
    position: "sticky",
    top: 0,
    zIndex: 10,
  };
  
  const tdStyle = {
    padding: "12px 14px",
    fontSize: 14,
    borderBottom: "1px solid #e8eaed",
    fontFamily: "'Google Sans', sans-serif",
    color: "#202124",
    textAlign: "left",
    verticalAlign: "middle",
  };

  const headers = ["Sl. no.", "Photo", "Reg. no.", "Vehicle", "Ownership", "Type", "Insurance Expiry", "Days Left", "Pollution Expiry", "Status", "Action"];

  return (
    <>
      {/* ── Mobile Card View (shown only on mobile) ── */}
      <div className="vm-mobile-cards" style={{ display: "none" }}>
        {vehicles.map((v, index) => {
          const insDays = daysLeft(v.insurance_expiry);
          return (
            <div key={v.id} className="vm-card">
              {/* Top: photo + name + status */}
              <div className="vm-card-top">
                {v.image ? (
                  <img
                    src={v.image}
                    alt={v.name}
                    className="vm-card-img"
                    onError={e => { e.currentTarget.style.display = "none"; }}
                  />
                ) : (
                  <div className="vm-card-img-placeholder">🚗</div>
                )}
                <div className="vm-card-title">
                  <div className="vm-card-name">{v.name}</div>
                  <div className="vm-card-reg">{v.reg}</div>
                </div>
                <span className={`vm-card-status ${v.status === "Active" ? "vm-card-status-active" : "vm-card-status-inactive"}`}>
                  {v.status}
                </span>
              </div>

              {/* Fields grid */}
              <div className="vm-card-fields">
                <div className="vm-card-field">
                  <div className="vm-card-field-label">🏢 Ownership</div>
                  <div className="vm-card-field-value">{v.ownership}</div>
                </div>
                <div className="vm-card-field">
                  <div className="vm-card-field-label">🚘 Type</div>
                  <div className="vm-card-field-value">{v.type}</div>
                </div>
                <div className="vm-card-field">
                  <div className="vm-card-field-label">⛽ Fuel</div>
                  <div className="vm-card-field-value">{v.fuel}</div>
                </div>
                <div className="vm-card-field">
                  <div className="vm-card-field-label">🏭 Company</div>
                  <div className="vm-card-field-value">{v.company}</div>
                </div>
                <div className="vm-card-field">
                  <div className="vm-card-field-label">🛡 Insurance</div>
                  <div className="vm-card-field-value" style={{ fontSize: 11 }}>{v.insurance_expiry || "N/A"}</div>
                </div>
                <div className="vm-card-field">
                  <div className="vm-card-field-label">⏱ Days Left</div>
                  <div className="vm-card-field-value"><DaysLeftBadge days={insDays} /></div>
                </div>
                <div className="vm-card-field">
                  <div className="vm-card-field-label">🌿 Pollution</div>
                  <div className="vm-card-field-value" style={{ fontSize: 11 }}>{v.pollution_expiry || "N/A"}</div>
                </div>
                <div className="vm-card-field">
                  <div className="vm-card-field-label">📍 Odometer</div>
                  <div className="vm-card-field-value">{Number(v.odometer).toLocaleString()} KM</div>
                </div>
              </div>

              {/* Actions */}
              <div className="vm-card-actions">
                <button onClick={() => onEdit(v)} style={{ background: "#1a73e8", color: "#fff" }}>
                  <EditOutlinedIcon style={{ fontSize: 14 }} /> Edit
                </button>
                <button onClick={() => onDelete(v.id)} style={{ background: "#d93025", color: "#fff" }}>
                  <DeleteOutlineOutlinedIcon style={{ fontSize: 14 }} /> Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Desktop Table View (hidden on mobile) ── */}
      <div className="vm-desktop-table" style={{ background: "#fff", borderRadius: 10, border: "1px solid #e8eaed", overflow: "hidden" }}>
        <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 280px)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
              <tr>
                {headers.map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v, index) => {
                const insDays = daysLeft(v.insurance_expiry);
                return (
                  <tr key={v.id}
                    onMouseEnter={e => e.currentTarget.style.background = "#f8f9fa"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ ...tdStyle, color: "#9aa0a6", fontWeight: 600, width: 56 }}>{index + 1}</td>
                    <td style={{ ...tdStyle, width: 64, padding: "8px 14px" }}>
                      {v.image ? (
                        <img src={v.image} alt={v.name} onClick={() => window.open(v.image, "_blank")} title="Click to enlarge"
                          style={{ width: 48, height: 36, objectFit: "cover", borderRadius: 6, border: "1.5px solid #e8eaed", cursor: "zoom-in", display: "block", boxShadow: "0 1px 4px rgba(0,0,0,0.10)" }}
                          onError={e => { e.currentTarget.style.display = "none"; }} />
                      ) : (
                        <div style={{ width: 48, height: 36, borderRadius: 6, border: "1.5px dashed #d0d0d0", background: "#f8f9fa", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#c5cad3" }}>🚗</div>
                      )}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700, letterSpacing: "0.5px" }}>{v.reg}</td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{v.name}</td>
                    <td style={tdStyle}>{v.ownership}</td>
                    <td style={tdStyle}>{v.type}</td>
                    <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{v.insurance_expiry || "—"}</td>
                    <td style={tdStyle}><DaysLeftBadge days={insDays} /></td>
                    <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{v.pollution_expiry || "—"}</td>
                    <td style={tdStyle}>
                      <span style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: v.status === "Active" ? "#188038" : "#d93025", color: v.status === "Active" ? "#fbfdfc" : "#fffcfc", fontFamily: "'Google Sans', sans-serif" }}>
                        {v.status}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => onEdit(v)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: "#1a73e8", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "'Google Sans', sans-serif" }}>
                          <EditOutlinedIcon style={{ fontSize: 13 }} /> Edit
                        </button>
                        <button onClick={() => onDelete(v.id)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: "#d93025", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "'Google Sans', sans-serif" }}>
                          <DeleteOutlineOutlinedIcon style={{ fontSize: 13 }} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ─── Card View ───────────────────────────────────────────── */
function CardView({ vehicles, onEdit, onDelete }) {
  const [lightbox, setLightbox] = useState(null);

  return (
    <>
      {lightbox && (
        <ImageLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 20 }}>
        {vehicles.map(v => (
          <div key={v.id} style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: 12, overflow: "hidden", transition: "box-shadow 0.2s, transform 0.2s", position: "relative" }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,0.12)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}>
            {/* Image / Icon */}
            <div style={{ position: "relative" }}>
              <CardImage src={v.image} alt={v.name} type={v.type} onExpand={(src, alt) => setLightbox({ src, alt })} />
              <StatusPill status={v.status} />
            </div>

            {/* Vehicle name + reg overlay on image bottom */}
            <div style={{ padding: "14px 16px" }}>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#202124" }}>{v.name}</div>
                <div style={{ fontSize: 12, color: "#5f6368", fontFamily: "'Google Sans', sans-serif", fontWeight: 600, letterSpacing: 0.4 }}>{v.reg}</div>
              </div>
              {[
                ["Company",          v.company],
                ["Ownership",        v.ownership],
                ["Type",             v.type],
                ["Fuel",             v.fuel],
                ["Insurance Expiry", v.insurance_expiry || "N/A"],
                ["Pollution Expiry", v.pollution_expiry || "N/A"],
                ["Odometer",         `${Number(v.odometer).toLocaleString()} KM`],
                ["Total Trips",      v.total_trips],
              ].map(([label, val]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: "1px solid #f1f3f4" }}>
                  <span style={{ fontSize: 12, color: "#5f6368", fontFamily: "'Google Sans', sans-serif" }}>{label}:</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#202124", fontFamily: "'Google Sans', sans-serif" }}>{val}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 8, padding: "12px 16px", borderTop: "1px solid #e8eaed" }}>
              <button onClick={() => onEdit(v)} style={{ flex: 1, padding: "8px 0", borderRadius: 7, border: "none", background: "#1a73e8", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontFamily: "'Google Sans', sans-serif" }}>
                <EditOutlinedIcon style={{ fontSize: 15 }} /> Edit
              </button>
              <button onClick={() => onDelete(v.id)} style={{ flex: 1, padding: "8px 0", borderRadius: 7, border: "none", background: "#d93025", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontFamily: "'Google Sans', sans-serif" }}>
                <DeleteOutlineOutlinedIcon style={{ fontSize: 15 }} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ─── Pagination Component ─────────────────────────────────── */
function Pagination({ currentPage, totalPages, totalItems, pageSize, onPageChange }) {
  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  
  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  const pageNumbers = [];
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 24,
      padding: "16px 20px",
      background: "#fff",
      border: "1px solid #e8eaed",
      borderRadius: 10,
      flexWrap: "wrap",
      gap: 12,
    }}>
      {/* Items info */}
      <div style={{ fontSize: 13, color: "#5f6368", fontFamily: "'Google Sans', sans-serif" }}>
        Showing {startItem} to {endItem} of {totalItems} vehicles
      </div>

      {/* Pagination buttons */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        {/* First Page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          style={{
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid #e8eaed",
            background: currentPage === 1 ? "#f8f9fa" : "#fff",
            color: currentPage === 1 ? "#9aa0a6" : "#1a73e8",
            cursor: currentPage === 1 ? "not-allowed" : "pointer",
            fontSize: 13,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontFamily: "'Google Sans', sans-serif",
            transition: "all 0.2s",
          }}
        >
          <FirstPageOutlinedIcon style={{ fontSize: 16 }} /> First
        </button>

        {/* Previous */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid #e8eaed",
            background: currentPage === 1 ? "#f8f9fa" : "#fff",
            color: currentPage === 1 ? "#9aa0a6" : "#1a73e8",
            cursor: currentPage === 1 ? "not-allowed" : "pointer",
            fontSize: 13,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontFamily: "'Google Sans', sans-serif",
          }}
        >
          <NavigateBeforeOutlinedIcon style={{ fontSize: 16 }} /> Prev
        </button>

        {/* Page numbers */}
        {pageNumbers.map(pageNum => (
          <button
            key={pageNum}
            onClick={() => onPageChange(pageNum)}
            style={{
              minWidth: 36,
              padding: "6px 12px",
              borderRadius: 6,
              border: currentPage === pageNum ? "none" : "1px solid #e8eaed",
              background: currentPage === pageNum ? "#1a73e8" : "#fff",
              color: currentPage === pageNum ? "#fff" : "#5f6368",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: currentPage === pageNum ? 700 : 500,
              fontFamily: "'Google Sans', sans-serif",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => {
              if (currentPage !== pageNum) {
                e.currentTarget.style.background = "#f8f9fa";
                e.currentTarget.style.borderColor = "#dadce0";
              }
            }}
            onMouseLeave={e => {
              if (currentPage !== pageNum) {
                e.currentTarget.style.background = "#fff";
                e.currentTarget.style.borderColor = "#e8eaed";
              }
            }}
          >
            {pageNum}
          </button>
        ))}

        {/* Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid #e8eaed",
            background: currentPage === totalPages ? "#f8f9fa" : "#fff",
            color: currentPage === totalPages ? "#9aa0a6" : "#1a73e8",
            cursor: currentPage === totalPages ? "not-allowed" : "pointer",
            fontSize: 13,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontFamily: "'Google Sans', sans-serif",
          }}
        >
          Next <NavigateNextOutlinedIcon style={{ fontSize: 16 }} />
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          style={{
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid #e8eaed",
            background: currentPage === totalPages ? "#f8f9fa" : "#fff",
            color: currentPage === totalPages ? "#9aa0a6" : "#1a73e8",
            cursor: currentPage === totalPages ? "not-allowed" : "pointer",
            fontSize: 13,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontFamily: "'Google Sans', sans-serif",
          }}
        >
          Last <LastPageOutlinedIcon style={{ fontSize: 16 }} />
        </button>
      </div>

      {/* Page size selector (optional) */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, color: "#5f6368" }}>Show:</span>
        <select
          value={pageSize}
          onChange={(e) => onPageChange(1, parseInt(e.target.value))}
          style={{
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid #e8eaed",
            background: "#fff",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "'Google Sans', sans-serif",
          }}
        >
          <option value={10}>10 per page</option>
          <option value={20}>20 per page</option>
          <option value={50}>50 per page</option>
        </select>
      </div>
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────── */
// ✅ Accept onVehicleSaved prop — called after add/edit so the parent
//    (which passes vehicles[] to StartTrip) can re-fetch and stay in sync.
export default function VehicleMasterList({ onVehicleSaved }) {
  const [vehicles,     setVehicles]     = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [fetchError,   setFetchError]   = useState('');
  const [totalItems,   setTotalItems]   = useState(0);
  const [totalPages,   setTotalPages]   = useState(1);
  const [currentPage,  setCurrentPage]  = useState(1);
  const [pageSize,     setPageSize]     = useState(PAGE_SIZE);

  // Filter state
  const [search,       setSearch]       = useState("");
  const [typeFilter,   setTypeFilter]   = useState("All Types");
  const [statusFilter, setStatusFilter] = useState("All");
  // Applied filters (used for actual API call)
  const [appliedSearch,  setAppliedSearch]  = useState("");
  const [appliedType,    setAppliedType]    = useState("All Types");
  const [appliedStatus,  setAppliedStatus]  = useState("All");

  const [viewMode,     setViewMode]     = useState("card");
  const [editVehicle,  setEditVehicle]  = useState(null);
  const [showAddForm,  setShowAddForm]  = useState(false);

  // ── Fetch vehicles from backend (with pagination) ─────────────────────────────
  const fetchVehicles = useCallback(async (page = currentPage, size = pageSize) => {
    setLoading(true);
    setFetchError('');
    try {
      const data = await getVehicles({
        search:       appliedSearch,
        status:       appliedStatus,
        vehicle_type: appliedType,
        page:         page,
        page_size:    size,
      });
      
      // Handle paginated response
      const list = data.results || (Array.isArray(data) ? data : []);
      const count = data.count || list.length;
      
      setVehicles(list.map(normalise));
      setTotalItems(count);
      setTotalPages(Math.ceil(count / size));
      setCurrentPage(page);
      setPageSize(size);
    } catch (err) {
      setFetchError(err.message || 'Failed to load vehicles.');
      setVehicles([]);
      setTotalItems(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, appliedType, appliedStatus, currentPage, pageSize]);

  // Fetch when filters or page changes
  useEffect(() => {
    fetchVehicles(currentPage, pageSize);
  }, [fetchVehicles, currentPage, pageSize]);

  // Handle page change
  const handlePageChange = (newPage, newPageSize = pageSize) => {
    if (newPageSize !== pageSize) {
      setPageSize(newPageSize);
      setCurrentPage(1);
      fetchVehicles(1, newPageSize);
    } else {
      setCurrentPage(newPage);
      fetchVehicles(newPage, pageSize);
    }
  };

  // ── Filter handlers ─────────────────────────────────────────
  const handleApply = () => {
    setAppliedSearch(search);
    setAppliedType(typeFilter);
    setAppliedStatus(statusFilter);
    setCurrentPage(1); // Reset to first page when applying filters
  };

  const handleReset = () => {
    setSearch(""); 
    setTypeFilter("All Types"); 
    setStatusFilter("All");
    setAppliedSearch(""); 
    setAppliedType("All Types"); 
    setAppliedStatus("All");
    setCurrentPage(1);
  };

  // ── Save callback (Add / Edit) ──────────────────────────────
  const handleSaved = (_savedVehicle) => {
    setShowAddForm(false);
    setEditVehicle(null);
    setCurrentPage(1); // Reset to first page to show newly added vehicle
    fetchVehicles(1, pageSize);
    // ✅ Notify parent to re-fetch vehicles so StartTrip dropdown stays in sync
    onVehicleSaved?.();
  };

  // ── Delete ──────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this vehicle?")) return;
    try {
      await deleteVehicle(id);
      // If current page has only one item and it's not the first page, go to previous page
      if (vehicles.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
        fetchVehicles(currentPage - 1, pageSize);
      } else {
        fetchVehicles(currentPage, pageSize);
      }
      // ✅ Notify parent on delete too so StartTrip dropdown removes deleted vehicle
      onVehicleSaved?.();
    } catch (err) {
      alert(err.message || "Failed to delete vehicle.");
    }
  };

  // ── Edit: open form with pre-filled data ────────────────────
  const handleEdit = (v) => {
    setEditVehicle(v._raw);
    setShowAddForm(true);
  };

  // ── Show Add/Edit form ──────────────────────────────────────
  if (showAddForm) {
    return (
      <VehicleForm
        editData={editVehicle}
        onClose={() => { setShowAddForm(false); setEditVehicle(null); }}
        onSaved={handleSaved}
      />
    );
  }

  const selectStyle = { padding: "9px 12px", border: "1px solid #e8eaed", borderRadius: 7, fontSize: 13, background: "#fff", color: "#202124", cursor: "pointer", fontFamily: "'Google Sans', sans-serif", outline: "none", minWidth: 160 };

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&display=swap');
        * { font-family: 'Google Sans', sans-serif; }
        .vm-search-input::placeholder { color: #9aa0a6; }
        .vm-search-input:focus { border-color: #1a73e8 !important; box-shadow: 0 0 0 2px rgba(26,115,232,0.12); }
        .vm-view-btn { transition: all 0.15s; }
        .vm-view-btn:hover { background: rgba(26,115,232,0.08) !important; }
        @media (max-width: 600px) {
          .vml-header { height: auto !important; padding: 10px 16px !important; }
          .vml-view-label { display: none; }

          /* ── Filters: 2×2 grid ── */
          .vml-filters {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 10px 8px !important;
            align-items: end !important;
          }
          /* All children fill their cell */
          .vml-filters > div { width: 100% !important; min-width: 0 !important; box-sizing: border-box !important; flex: unset !important; }
          .vml-filters select { width: 100% !important; min-width: 0 !important; box-sizing: border-box !important; }
          .vml-filters input  { width: 100% !important; min-width: 0 !important; box-sizing: border-box !important; }
          /* Row 2: Status (3rd child) + Buttons (4th child) */
          .vml-filters > div:nth-child(3) { grid-column: 1 !important; }
          .vml-filters > div:nth-child(4) { grid-column: 2 !important; display: flex !important; flex-direction: column !important; gap: 6px !important; }
          .vml-filters > div:nth-child(4) button { width: 100% !important; justify-content: center !important; padding: 9px 4px !important; font-size: 12px !important; white-space: nowrap !important; }

          /* ── Table → Cards on mobile ── */
          .vm-desktop-table { display: none !important; }
          .vm-mobile-cards  { display: flex !important; flex-direction: column !important; gap: 12px !important; }

          .vm-card {
            background: #fff;
            border-radius: 14px;
            border: 1px solid #e8eaed;
            box-shadow: 0 2px 10px rgba(0,0,0,0.07);
            overflow: hidden;
            position: relative;
          }
          .vm-card::before {
            content: '';
            position: absolute;
            left: 0; top: 0; bottom: 0;
            width: 4px;
            background: linear-gradient(180deg, #0982fc, #1557b0);
            border-radius: 4px 0 0 4px;
          }
          .vm-card-top {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 14px 10px 18px;
          }
          .vm-card-img {
            width: 56px; height: 42px;
            object-fit: cover;
            border-radius: 8px;
            border: 1.5px solid #e8eaed;
            flex-shrink: 0;
          }
          .vm-card-img-placeholder {
            width: 56px; height: 42px;
            border-radius: 8px;
            border: 1.5px dashed #d0d0d0;
            background: #f8f9fa;
            display: flex; align-items: center; justify-content: center;
            font-size: 18px; flex-shrink: 0;
          }
          .vm-card-title { flex: 1; min-width: 0; }
          .vm-card-name {
            font-size: 15px; font-weight: 700; color: #202124;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          }
          .vm-card-reg {
            font-size: 12px; font-weight: 600; color: #1a73e8;
            letter-spacing: 0.4px; margin-top: 2px;
          }
          .vm-card-status {
            padding: 3px 10px; border-radius: 6px;
            font-size: 11px; font-weight: 700;
            flex-shrink: 0;
          }
          .vm-card-status-active   { background: #188038; color: #fff; }
          .vm-card-status-inactive { background: #d93025; color: #fff; }

          .vm-card-fields {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px 10px;
            padding: 0 14px 12px 18px;
          }
          .vm-card-field {
            background: #f8fafc;
            border-radius: 8px;
            padding: 7px 10px;
          }
          .vm-card-field-label {
            font-size: 10px; font-weight: 600; color: #9aa0a6;
            text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;
          }
          .vm-card-field-value {
            font-size: 12px; font-weight: 600; color: #202124;
          }
          .vm-card-actions {
            display: flex; gap: 8px;
            padding: 10px 14px 12px 18px;
            border-top: 1px solid #f1f3f4;
          }
          .vm-card-actions button {
            flex: 1; padding: 8px 0;
            border-radius: 8px; border: none;
            font-size: 13px; font-weight: 600;
            cursor: pointer; display: flex;
            align-items: center; justify-content: center; gap: 5px;
            font-family: 'Google Sans', sans-serif;
          }
        }
        @media (max-width: 600px) {
          .vml-header h1 { font-size: 20px !important; }
        }
        @media (min-width: 601px) {
          .vm-desktop-table { display: block !important; }
          .vm-mobile-cards  { display: none !important; }
        }
      
        /* ── IMCB Footer ── */
        .imcb-footer {
          text-align: center;
          padding: 12px 16px;
          margin-top: 8px;
          border-top: 1px solid #e8eaed;
          font-size: 12px;
          color: #9aa0a6;
          font-family: 'Google Sans', sans-serif;
          letter-spacing: 0.01em;
          flex-shrink: 0;
          background: #fff;
          width: 100%;
          box-sizing: border-box;
        }
        @media (max-width: 600px) {
          .imcb-footer {
            padding: 10px 12px;
            font-size: 11px;
            margin-top: 4px;
          }
        }
      `}</style>

      {/* ── Sticky Page Header Bar ── */}
      <div className="vml-header" style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", height: 56, background: "#fff", borderBottom: "1px solid #e8eaed", gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h1 style={{ fontSize: 25, fontWeight: 600, color: "#202124", margin: 0, letterSpacing: "0.10px", lineHeight: 1.2 }}>
            Vehicle Master
          </h1>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
          {/* View Toggle */}
          <div style={{ display: "flex", border: "1px solid #e8eaed", borderRadius: 8, overflow: "hidden", background: "#f8f9fa" }}>
            {[
              { mode: "card",  Icon: GridViewOutlinedIcon,   label: "Card View"  },
              { mode: "table", Icon: TableRowsOutlinedIcon,  label: "Table View" },
            ].map(({ mode, Icon, label }) => (
              <button key={mode} className="vm-view-btn" onClick={() => setViewMode(mode)} style={{ padding: "7px 13px", border: "none", cursor: "pointer", background: viewMode === mode ? "#fff" : "transparent", color: viewMode === mode ? "#1a73e8" : "#5f6368", fontWeight: viewMode === mode ? 700 : 500, fontSize: 13, display: "flex", alignItems: "center", gap: 5, fontFamily: "'Google Sans', sans-serif", boxShadow: viewMode === mode ? "0 1px 4px rgba(0,0,0,0.1)" : "none", borderRadius: 6, margin: 2 }}>
                <Icon style={{ fontSize: 16 }} /><span className="vml-view-label">{label}</span>
              </button>
            ))}
          </div>

          {/* Add Button */}
          <button onClick={() => { setEditVehicle(null); setShowAddForm(true); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 8, border: "none", background: "#1a73e8", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Google Sans', sans-serif", boxShadow: "0 2px 8px rgba(26,115,232,0.3)", transition: "all 0.2s", whiteSpace: "nowrap" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#1557b0"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#1a73e8"; e.currentTarget.style.transform = "translateY(0)"; }}>
            <AddOutlinedIcon style={{ fontSize: 17 }} /> Add New
          </button>
        </div>
      </div>

      {/* ── Scrollable Body ── */}
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "12px 16px" }}>

        {/* ── Fetch error banner ── */}
        {fetchError && (
          <div style={{ background: "#fce8e6", border: "1px solid #f5c2be", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#d93025", fontSize: 13, fontFamily: "'Google Sans', sans-serif" }}>
            ⚠️ {fetchError}
          </div>
        )}

        {/* ── Filters ── */}
        <div style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: 10, padding: "18px 20px", marginBottom: 20 }}>
          <div className="vml-filters" style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
            {/* Search */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#0d0d0e", display: "block", marginBottom: 6, textTransform: "capitalize",textAlign: "left", letterSpacing: "0.8px", fontFamily: "'Google Sans', sans-serif" }}>Search</label>
              <div style={{ position: "relative" }}>
                <SearchOutlinedIcon style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "#9aa0a6" }} />
                <input className="vm-search-input" type="text" value={search} placeholder="Registration, name, company..."
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleApply()}
                  style={{ width: "100%", padding: "9px 12px 9px 32px", border: "1px solid #e8eaed", borderRadius: 7, fontSize: 13, fontFamily: "'Google Sans', sans-serif", outline: "none", transition: "border 0.2s, box-shadow 0.2s", boxSizing: "border-box" }} />
              </div>
            </div>

            {/* Vehicle Type */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#0f0f0f", display: "block", marginBottom: 6, textTransform: "capitalize",textAlign: "left", letterSpacing: "0.8px", fontFamily: "'Google Sans', sans-serif" }}>Vehicle Type</label>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={selectStyle}>
                {VEHICLE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>

            {/* Status */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#0f0f0f", display: "block", marginBottom: 6, textTransform: "capitalize",textAlign: "left", letterSpacing: "0.8px", fontFamily: "'Google Sans', sans-serif" }}>Status</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
                {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <button onClick={handleApply} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 22px", borderRadius: 7, border: "none", background: "#1a73e8", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Google Sans', sans-serif" }}>
                <FilterListOutlinedIcon style={{ fontSize: 16 }} /> Apply Filters
              </button>
              <button onClick={handleReset} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 22px", borderRadius: 7, border: "1px solid #e8eaed", background: "#fff", color: "#5f6368", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "'Google Sans', sans-serif" }}>
                <RestartAltOutlinedIcon style={{ fontSize: 16 }} /> Reset
              </button>
            </div>
          </div>
        </div>

        {/* ── Count ── */}
        <div style={{ marginBottom: 16, fontSize: 13, color: "#5f6368", fontFamily: "'Google Sans', sans-serif", fontWeight: 600 }}>
          {loading ? "Loading…" : `${totalItems} vehicle${totalItems !== 1 ? "s" : ""} found`}
        </div>

        {/* ── Loading skeleton ── */}
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", border: "1px solid #e8eaed", borderRadius: 10, color: "#5f6368", fontSize: 14, fontFamily: "'Google Sans', sans-serif" }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#202124", marginBottom: 6 }}>Loading vehicles…</div>
          </div>
        )}

        {/* ── Content ── */}
        {!loading && vehicles.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", border: "1px solid #e8eaed", borderRadius: 10, color: "#5f6368", fontSize: 14, fontFamily: "'Google Sans', sans-serif" }}>
            <DirectionsCarOutlinedIcon style={{ fontSize: 48, color: "#dadce0", marginBottom: 12 }} />
            <div style={{ fontWeight: 700, fontSize: 16, color: "#202124", marginBottom: 6 }}>No vehicles found</div>
            <div>Try adjusting your filters or add a new vehicle.</div>
          </div>
        )}

        {!loading && vehicles.length > 0 && (
          <>
            {viewMode === "card"
              ? <CardView  vehicles={vehicles} onEdit={handleEdit} onDelete={handleDelete} />
              : <TableView vehicles={vehicles} onEdit={handleEdit} onDelete={handleDelete} />
            }
            
            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </div>
      {/* Footer */}
      <div className="imcb-footer">
        Powered by <span style={{ fontWeight: 600, color: "#1a73e8" }}>IMCB Solutions LLP</span>
      </div>
    </div>
  );
}