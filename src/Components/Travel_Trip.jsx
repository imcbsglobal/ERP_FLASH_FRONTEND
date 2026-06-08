import { useState, useEffect } from "react";
import RemoveRedEyeOutlinedIcon from '@mui/icons-material/RemoveRedEyeOutlined';
import AddToPhotosOutlinedIcon from '@mui/icons-material/AddToPhotosOutlined';
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
  authService,
  ENDPOINTS,
  authHeaders,
  apiFetch,
} from "../service/Api";

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
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 50 }}>
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
            width: 40,
            height: 30,
            borderRadius: 6,
            overflow: "hidden",
            border: `2px solid ${accentColor}`,
            boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
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
          width: 40, height: 30,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          borderRadius: 6,
          border: "1.5px dashed #d0d0d0",
          background: "#fafafa",
          color: "#bdbdbd",
          fontSize: 11,
          fontFamily: "'Google Sans', sans-serif",
          gap: 2,
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
  // Role-based filtering is handled entirely by the backend.
  // The backend reads the JWT, looks up the user's CURRENT role from the DB,
  // and returns only the trips that user is allowed to see:
  //   • Admin / Manager → all trips from all users
  //   • User            → only their own trips
  // The frontend uses the role ONLY for UI display (page title, column visibility).
  // No client-side ownership filtering is applied here.
  const getStoredUser = () => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  };
  // Converts "HH:MM" or "HH:MM:SS" to "hh:MM AM/PM"
  const formatTime = (time) => {
    if (!time) return "—";
    const [hStr, mStr] = time.split(":");
    const h = parseInt(hStr, 10);
    const m = mStr || "00";
    const ampm = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${m} ${ampm}`;
  };

  const storedUser     = getStoredUser();
  const loggedInUser   = storedUser.username || storedUser.name || '—';
  const loggedInRole   = (storedUser.role || 'User').trim();

  // ── 3-tier role flags ────────────────────────────────────────────────────
  // Super Admin → sees all trips across all branches
  // Admin / Manager → sees trips in their own branch
  // User → sees only their own trips
  const isSuperAdmin     = /^super\s*admin$/i.test(loggedInRole);
  const isAdmin          = /^admin$/i.test(loggedInRole);
  const isManager        = /^manager$/i.test(loggedInRole);
  // UI convenience: any elevated role that should see the "Traveled By" column
  const isAdminOrManager = isSuperAdmin || isAdmin || isManager;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [showStartTrip, setShowStartTrip] = useState(false);
  const [vehicleRefreshKey, setVehicleRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [filterBranch, setFilterBranch] = useState("all");
  const [branchList, setBranchList] = useState([]);
  const [userBranchName, setUserBranchName] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [showEndTripModal, setShowEndTripModal] = useState(null);
  const [endTripError, setEndTripError] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const [purposePopup, setPurposePopup] = useState(null);
  const [odoPhotoPopup, setOdoPhotoPopup] = useState(null); // { startImg, endImg, odoStart, odoEnd }
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    loadTrips();
  }, []);

  // ── Fetch branches + set default branch filter from logged-in user ──────
  useEffect(() => {
    const initBranches = async () => {
      // 1. Fetch departments from FlashERP for the branch dropdown
      try {
        const data = await apiFetch(ENDPOINTS.departments, { headers: authHeaders() });
        const raw = Array.isArray(data) ? data : (data?.data ?? data?.results ?? []);
        setBranchList(raw.map(d => d.department).filter(Boolean).sort());
      } catch { /* ignore */ }

      // 2. Get live branch_id for the logged-in user from /auth/me/
      try {
        const me = await authService.getMe();
        if (me) localStorage.setItem('user', JSON.stringify(me));
        if (me?.branch_id) {
          const branchData = await apiFetch(ENDPOINTS.branches, { headers: authHeaders() });
          const allBranches = Array.isArray(branchData) ? branchData : (branchData?.results ?? []);
          const match = allBranches.find(b => String(b.id) === String(me.branch_id));
          if (match?.name) {
            setUserBranchName(match.name);
            setFilterBranch(match.name);
          }
        }
      } catch { /* fallback: stay on 'all' */ }
    };
    initBranches();
  }, []);

  const loadTrips = async () => {
    setLoading(true);
    setError("");
    try {
      const trips = await fetchTrips();
      setData(trips);
      setCurrentPage(1); // Reset to first page when data loads
    } catch (err) {
      const msg = err.message || "Failed to load trips.";
      // Provide a user-friendly message for common auth/network errors
      if (err._status === 401 || err._status === 403) {
        setError("Session expired or access denied. Please sign in again.");
      } else if (msg.toLowerCase().includes("network") || msg.toLowerCase().includes("fetch")) {
        setError("Cannot reach the server. Check your connection and try again.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // The backend is the single source of truth for role-based visibility:
  //   • Admin / Manager  → backend returns ALL trips
  //   • User (driver)    → backend returns only that user's trips (filtered by traveled_by)
  // No client-side ownership filter is needed or applied here — a redundant
  // frontend filter caused admins to see only their own trips when the role
  // string had a case mismatch or localStorage wasn't fully populated yet.
  const filtered = data.filter((r) => {
    const matchSearch =
      !search ||
      r.vehicle_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.vehicle?.toLowerCase().includes(search.toLowerCase()) ||
      r.traveled_by?.toLowerCase().includes(search.toLowerCase()) ||
      r.traveledBy?.toLowerCase().includes(search.toLowerCase()) ||
      r.purpose_of_trip?.toLowerCase().includes(search.toLowerCase()) ||
      r.purpose?.toLowerCase().includes(search.toLowerCase());

    const matchBranch =
      filterBranch === "all" ||
      (r.branch_name || "").trim().toLowerCase() === filterBranch.trim().toLowerCase();

    const tripDate = r.date ? new Date(r.date) : null;
    const matchFrom = !dateFrom || (tripDate && tripDate >= new Date(dateFrom));
    const matchTo   = !dateTo   || (tripDate && tripDate <= new Date(dateTo + "T23:59:59"));

    return matchSearch && matchBranch && matchFrom && matchTo;
  });

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
        traveledBy:          newTrip.traveledBy           || newTrip.traveled_by         || loggedInUser,
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
    setEndTripError("");
    try {
      const updated = await endTrip(tripId, endData);
      setData((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setShowEndTripModal(null);
      setEndTripError("");
      setVehicleRefreshKey(k => k + 1); // vehicle is now Active again — refresh dropdown
    } catch (err) {
      setEndTripError(err.message || "Failed to end trip.");
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
    padding: "8px 12px",
    textAlign: "left",
    fontSize: 12,
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
    padding: "5px 12px",
    textAlign: "left",
    fontSize: 11,
    color: "#000000",
    fontFamily: "'Google Sans', sans-serif",
    borderBottom: "1px solid #f0f0f0",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
    lineHeight: 1,
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
          .tt-title { font-size: 22px !important; }
          .tt-search { width: 100% !important; }
        }
        @media (max-width: 600px) {
          .page-header-bar h1 {
            font-size: 20px !important;
          }
        }
        /* ── Travel Log Header ── */
        .tt-header-wrap {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 14px;
        }
        .tt-controls {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }
        .tt-search {
          padding: 0 14px;
          border-radius: 8px;
          border: 1.5px solid #c8d8e8;
          font-size: 13px;
          font-family: 'Google Sans', sans-serif;
          flex: 1;
          min-width: 120px;
          height: 34px;
          background: #fff;
          color: #000;
          outline: none;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .tt-search:focus { border-color: #1a73e8; }
        .tt-start-btn {
          padding: 0 20px;
          height: 34px;
          border-radius: 8px;
          border: none;
          background: linear-gradient(135deg, #1a6fdb, #0d4fa8);
          color: #fff;
          font-weight: 700;
          cursor: pointer;
          font-size: 13px;
          font-family: 'Google Sans', sans-serif;
          box-shadow: 0 4px 14px rgba(26,111,219,0.3);
          display: flex;
          align-items: center;
          gap: 7px;
          white-space: nowrap;
        }
        @media (max-width: 600px) {
          .tt-title { font-size: 22px !important;text-align: left;  }
          .tt-header-wrap {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }
          .tt-controls {
            flex-direction: row;
            gap: 8px;
            flex-wrap: nowrap;
          }
          .tt-search {
            flex: 1;
            min-width: 0;
            width: auto !important;
            box-sizing: border-box;
          }
          .tt-start-btn {
            width: auto;
            flex-shrink: 0;
            justify-content: center;
            padding: 9px 14px;
          }
          .pagination-container {
            flex-wrap: wrap;
            justify-content: center;
            padding: 12px;
            gap: 6px;
          }
          .pagination-info {
            width: 100%;
            text-align: center;
            margin-right: 0;
          }
        }
        .img-card-wrap:hover .img-overlay { opacity: 1 !important; }

        /* ── Mobile Card View ── */
        .desktop-table { display: block; }
        .mobile-cards-wrapper { display: none; }

        @media (max-width: 768px) {
          .desktop-table { display: none !important; }
          .mobile-cards-wrapper {
            display: flex !important;
            flex-direction: column;
            flex: 1;
            min-height: 0;
            overflow-y: auto;
            overflow-x: hidden;
            -webkit-overflow-scrolling: touch;
            scroll-behavior: smooth;
          }
          .mobile-cards {
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding: 12px;
            padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 80px);
          }

          .trip-card {
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
            padding: 10px 12px 10px 16px;
            border: 1px solid #e8eaed;
            position: relative;
            overflow: hidden;
          }
          .trip-card::before {
            content: '';
            position: absolute;
            left: 0; top: 0; bottom: 0;
            width: 4px;
            background: linear-gradient(180deg, #1a6fdb, #0d4fa8);
            border-radius: 4px 0 0 4px;
          }

          .trip-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
            gap: 8px;
          }
          .trip-card-index {
            width: 24px; height: 24px;
            background: linear-gradient(135deg,#1a6fdb,#0d4fa8);
            color: #fff;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 10px; font-weight: 700;
            flex-shrink: 0;
          }
          .trip-card-vehicle { flex: 1; }
          .trip-card-vehicle-name { font-size: 13px; font-weight: 700; color: #202124; }
          .trip-card-vehicle-reg { font-size: 12px; font-weight: 600; color: #1a6fdb; letter-spacing: 0.5px; }
          .trip-status-badge {
            font-size: 9px; font-weight: 700; padding: 2px 8px;
            border-radius: 20px; white-space: nowrap; flex-shrink: 0;
          }
          .trip-status-ongoing  { background: #fff8e1; color: #e65100; }
          .trip-status-completed{ background: #e8f5e9; color: #2e7d32; }

          .trip-card-row {
            display: flex;
            gap: 6px;
            margin-bottom: 6px;
            flex-wrap: nowrap;
          }
          .trip-card-field {
            flex: 1;
            min-width: 0;
            background: #f8fafc;
            border-radius: 8px;
            padding: 6px 8px;
          }
          .trip-card-field-label {
            font-size: 9px; font-weight: 600; color: #9aa0a6;
            text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;
          }
          .trip-card-field-value { font-size: 12px; font-weight: 600; color: #202124; }
          .trip-card-field-sub { font-size: 10px; color: #5f6368; margin-top: 1px; }

          /* Fuel + Photos — single horizontal row */
          .trip-card-fuel-photos-row {
            display: flex;
            flex-direction: row;
            gap: 6px;
            margin-bottom: 6px;
            align-items: stretch;
          }
          /* Fuel box: fixed width on left */
          .trip-card-fuel-box {
            background: #f8fafc;
            border-radius: 8px;
            padding: 8px 10px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 4px;
            flex-shrink: 0;
            width: 90px;
          }
          /* Photos box: takes remaining space */
          .trip-card-photos-box {
            flex: 1;
            background: #f8fafc;
            border-radius: 8px;
            padding: 8px 8px;
            min-width: 0;
          }
          .trip-card-photos {
            display: flex;
            gap: 0;
            align-items: stretch;
          }
          .trip-card-photos-label {
            font-size: 9px; font-weight: 600; color: #9aa0a6;
            text-transform: uppercase; letter-spacing: 0.5px;
            margin-bottom: 5px;
          }
          .trip-photo-divider {
            width: 1px;
            background: #e8eaed;
            flex-shrink: 0;
            margin: 0 6px;
            align-self: stretch;
          }
          .trip-photo-col {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 3px;
            min-width: 0;
          }
          .trip-photo-col-label {
            font-size: 9px; font-weight: 700;
            display: flex; align-items: center; gap: 2px;
            align-self: flex-start;
          }
          .trip-photo-thumb {
            width: 100%;
            height: 60px;
            border-radius: 6px;
            overflow: hidden;
            cursor: zoom-in;
            border: 2px solid;
            box-shadow: 0 1px 4px rgba(0,0,0,0.10);
          }
          .trip-photo-thumb img {
            width: 100%; height: 100%; object-fit: cover; display: block;
          }
          .trip-photo-thumb-empty {
            width: 100%; height: 60px;
            border-radius: 6px;
            border: 1.5px dashed #d0d0d0;
            background: #fafafa;
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            color: #bdbdbd; gap: 2px;
          }
          .trip-photo-odo-val {
            font-size: 10px; font-weight: 700; color: #202124;
          }

          .trip-card-actions {
            display: flex;
            gap: 8px;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid #f0f0f0;
          }
          .trip-card-actions button {
            flex: 1;
            min-height: 40px;
            padding: 8px 10px;
            border-radius: 8px;
            border: none;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
            font-family: 'Google Sans', sans-serif;
            transition: opacity 0.15s;
            white-space: nowrap;
          }
          .trip-card-actions button:disabled { opacity: 0.6; cursor: not-allowed; }

          .trip-card-purpose-btn {
            display: inline-flex; align-items: center; gap: 4px;
            background: none; border: none; cursor: pointer;
            color: #1a73e8; font-size: 11px; font-weight: 600;
            padding: 0; font-family: 'Google Sans', sans-serif;
            margin-bottom: 5px;
          }
        }
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
      
        /* ── Unified Toolbar ── */
        .tt-toolbar {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          background: #fff;
          border: 1px solid #e8eaed;
          border-radius: 10px;
          padding: 10px 14px;
          flex-wrap: nowrap;
          width: 100%;
          box-sizing: border-box;
        }
        .tt-toolbar-field {
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex-shrink: 0;
        }
        .tt-toolbar-label {
          font-size: 10px;
          font-weight: 600;
          color: #5f6368;
          letter-spacing: 0.4px;
          text-transform: uppercase;
        }
        .tt-toolbar-select,
        .tt-toolbar-input {
          padding: 7px 10px;
          border: 1.5px solid #e5e7eb;
          border-radius: 8px;
          font-size: 13px;
          font-family: 'Google Sans', sans-serif;
          background: #fff;
          color: #202124;
          outline: none;
          cursor: pointer;
          height: 34px;
          box-sizing: border-box;
        }
        .tt-toolbar-select { min-width: 140px; }
        .tt-toolbar-select--disabled { background: #f8f9fa; cursor: not-allowed; }
        .tt-toolbar-input { cursor: default; }
        .tt-toolbar-clear {
          padding: 0 12px;
          height: 34px;
          border: 1px solid #d1d9e0;
          border-radius: 8px;
          background: #fff;
          color: #5f6368;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'Google Sans', sans-serif;
          white-space: nowrap;
          flex-shrink: 0;
        }
        @media (max-width: 900px) {
          .tt-toolbar { flex-wrap: wrap; }
          .tt-search { width: 100% !important; }
        }
        @media (max-width: 600px) {
          .tt-toolbar {
            flex-direction: column;
            align-items: stretch;
            padding: 10px 12px;
            gap: 8px;
          }
          .tt-toolbar-field { flex-direction: row; align-items: center; gap: 8px; }
          .tt-toolbar-label { width: 50px; flex-shrink: 0; }
          .tt-toolbar-select, .tt-toolbar-input { flex: 1; min-width: 0; }
          .tt-toolbar-clear { width: 100%; }
          .tt-search { width: 100% !important; }
          .tt-start-btn { width: 100%; justify-content: center; }
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

      {showStartTrip && (
        <StartTrip
          onClose={() => setShowStartTrip(false)}
          onStart={handleStart}
          refreshKey={vehicleRefreshKey}
        />
      )}

      {showEndTripModal && currentTrip && (
        <EndTrip
          onClose={() => { setShowEndTripModal(null); setEndTripError(""); }}
          onComplete={(endData) => handleEndTrip(currentTrip.id, endData)}
          errorMessage={endTripError}
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
        <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "transparent", padding: "20px 0 0 0", fontFamily: "'Google Sans', sans-serif" }}>

          {error && (
            <div style={{
              margin: "0 0 14px 0",
              background: "#fff0f0", border: "1.5px solid #f5c2c7",
              borderRadius: 10, padding: "10px 18px",
              color: "#b02a37", fontSize: 13, fontFamily: "'Google Sans', sans-serif",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span>⚠️ {error}</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  onClick={loadTrips}
                  style={{ background: "#b02a37", color: "#fff", border: "none", borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Google Sans', sans-serif" }}
                >
                  Retry
                </button>
                <button
                  onClick={() => setError("")}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#b02a37" }}
                >×</button>
              </div>
            </div>
          )}

          <div style={{ margin: "0 0 16px 0", width: "100%", flexShrink: 0 }}>
            {/* Title row */}
            <h1 className="tt-title" style={{ margin: "0 0 12px 0", fontSize: 25, fontWeight: "600", color: "black", letterSpacing: -0.5 }}>
              {isSuperAdmin
                ? "All Travel Logs"
                : (isAdmin || isManager)
                  ? "Branch Travel Logs"
                  : "My Travel Logs"}
              {isAdminOrManager && (
                <span style={{
                  marginLeft: 10,
                  fontSize: 12,
                  fontWeight: 600,
                  background: isSuperAdmin ? "#fce8e6" : "#e8f0fe",
                  color:      isSuperAdmin ? "#c5221f"  : "#1a6fdb",
                  borderRadius: 20,
                  padding: "2px 10px",
                  verticalAlign: "middle",
                  letterSpacing: 0.3,
                }}>
                  {loggedInRole}
                </span>
              )}
            </h1>

            {/* ── Single unified toolbar: Filter + Search + Start Trip ── */}
            <div className="tt-toolbar">
              {/* Branch */}
              <div className="tt-toolbar-field">
                <label className="tt-toolbar-label">Branch</label>
                {isAdminOrManager ? (
                  <select
                    value={filterBranch}
                    onChange={(e) => { setFilterBranch(e.target.value); setCurrentPage(1); }}
                    className="tt-toolbar-select"
                  >
                    <option value="all">All Branches</option>
                    {branchList.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                ) : (
                  <select disabled className="tt-toolbar-select tt-toolbar-select--disabled">
                    <option>{filterBranch || "My Branch"}</option>
                  </select>
                )}
              </div>

              {/* From Date */}
              <div className="tt-toolbar-field">
                <label className="tt-toolbar-label">From</label>
                <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                  className="tt-toolbar-input"
                />
              </div>

              {/* To Date */}
              <div className="tt-toolbar-field">
                <label className="tt-toolbar-label">To</label>
                <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                  className="tt-toolbar-input"
                />
              </div>

              {/* Clear button */}
              {(filterBranch !== (userBranchName || "all") || dateFrom || dateTo) && (
                <button
                  onClick={() => { setFilterBranch(userBranchName || "all"); setDateFrom(""); setDateTo(""); setCurrentPage(1); }}
                  className="tt-toolbar-clear"
                >
                  Clear
                </button>
              )}

              {/* Search */}
              <input
                className="tt-search"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                placeholder="Search vehicle, driver, purpose…"
              />

              {/* Start Trip */}
              <button
                className="tt-start-btn"
                onClick={() => setShowStartTrip(true)}
                disabled={actionLoading}
                style={{ opacity: actionLoading ? 0.7 : 1 }}
              >
                Start Trip
              </button>
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: "16px 16px 0 0", overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", flex: 1, minHeight: 0, width: "100%" }}>

            {/* ── Mobile Card View ── */}
            <div className="mobile-cards-wrapper">
            <div className="mobile-cards">
              {loading ? (
                <div style={{ textAlign: "center", padding: "48px 16px", color: "#000" }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}></div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>Loading trips…</div>
                </div>
              ) : currentData.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 16px", color: "#000" }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}></div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>No travel records found</div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>Add your first entry to get started</div>
                </div>
              ) : (
                currentData.map((row, i) => (
                  <div key={row.id} className="trip-card">
                    {/* Card Header */}
                    <div className="trip-card-header">
                      <div className="trip-card-index">{startIndex + i + 1}</div>
                      <div className="trip-card-vehicle">
                        <div className="trip-card-vehicle-name">{row.vehicle || row.vehicle_name || "—"}</div>
                        {(row.vehicleReg || row.registration_number) && (
                          <div className="trip-card-vehicle-reg">{row.vehicleReg || row.registration_number}</div>
                        )}
                      </div>
                      <span className={`trip-status-badge ${row.status === "completed" ? "trip-status-completed" : "trip-status-ongoing"}`}>
                        {row.status === "completed" ? "✓ Completed" : "● Ongoing"}
                      </span>
                    </div>

                    {/* Dates Row */}
                    <div className="trip-card-row">
                      <div className="trip-card-field">
                        <div className="trip-card-field-label">🟢 Start</div>
                        <div className="trip-card-field-value">
                          {row.date ? new Date(row.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                        </div>
                        <div className="trip-card-field-sub">{formatTime(row.startTime)}</div>
                      </div>
                      <div className="trip-card-field">
                        <div className="trip-card-field-label">🔴 End</div>
                        <div className="trip-card-field-value">
                          {(row.endDate || row.end_date) ? new Date(row.endDate || row.end_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                        </div>
                        <div className="trip-card-field-sub">{formatTime(row.endTime)}</div>
                      </div>
                    </div>

                    {/* Driver + Distance Row */}
                    <div className="trip-card-row">
                      {isAdminOrManager && (
                        <div className="trip-card-field">
                          <div className="trip-card-field-label">👤 Driver</div>
                          <div className="trip-card-field-value" style={{ fontSize: 11 }}>{row.traveledBy || row.traveled_by || "—"}</div>
                        </div>
                      )}
                      <div className="trip-card-field">
                        <div className="trip-card-field-label">📍 Distance</div>
                        <div className="trip-card-field-value">{row.distance || 0} km</div>
                      </div>
                    </div>

                    {/* Purpose */}
                    {(row.purpose || row.purpose_of_trip) && (
                      <button className="trip-card-purpose-btn" onClick={() => setPurposePopup(row.purpose || row.purpose_of_trip)}>
                        <PreviewOutlinedIcon style={{ fontSize: 13 }} /> View Purpose
                      </button>
                    )}

                    {/* Fuel / Cost + Odometer Photos — single row */}
                    <div className="trip-card-fuel-photos-row">

                      {/* LEFT: Fuel / Cost */}
                      <div className="trip-card-fuel-box">
                        <div className="trip-card-field-label">⛽ Fuel Cost</div>
                        <div className="trip-card-field-value" style={{ fontSize: 12 }}>
                          ₹{(row.cost || row.fuel_cost || 0).toLocaleString('en-IN')}
                        </div>
                        <div style={{ width: "100%", height: 1, background: "#e8eaed", margin: "2px 0" }} />
                        <div className="trip-card-field-label">🔧 Maintenance</div>
                        <div className="trip-card-field-value" style={{ fontSize: 12 }}>
                          ₹{(row.maintenanceCost || row.maintenance_cost || 0).toLocaleString('en-IN')}
                        </div>
                      </div>

                      {/* RIGHT: Odometer Photos */}
                      <div className="trip-card-photos-box">
                        <div className="trip-card-photos-label">📷 Odometer Photos</div>
                        <div className="trip-card-photos">
                          {/* Start */}
                          <div className="trip-photo-col">
                            <div className="trip-photo-col-label" style={{ color: "#2e7d32" }}>
                              <AccessTimeIcon style={{ fontSize: 10 }} /> Start
                            </div>
                            {row.startImg ? (
                              <div className="trip-photo-thumb" style={{ borderColor: "#2e7d32" }}
                                onClick={() => setLightbox({ src: row.startImg, label: "Start" })}>
                                <img src={row.startImg} alt="Start odometer" />
                              </div>
                            ) : (
                              <div className="trip-photo-thumb-empty">
                                <span style={{ fontSize: 16 }}>📷</span>
                                <span style={{ fontSize: 9 }}>No img</span>
                              </div>
                            )}
                            <span className="trip-photo-odo-val">
                              {row.odoStart ? `${Number(row.odoStart).toLocaleString('en-IN')} km` : "—"}
                            </span>
                          </div>

                          <div className="trip-photo-divider" />

                          {/* End */}
                          <div className="trip-photo-col">
                            <div className="trip-photo-col-label" style={{ color: "#b71c1c" }}>
                              <HistoryIcon style={{ fontSize: 10 }} /> End
                            </div>
                            {row.endImg ? (
                              <div className="trip-photo-thumb" style={{ borderColor: "#b71c1c" }}
                                onClick={() => setLightbox({ src: row.endImg, label: "End" })}>
                                <img src={row.endImg} alt="End odometer" />
                              </div>
                            ) : (
                              <div className="trip-photo-thumb-empty">
                                <span style={{ fontSize: 16 }}>📷</span>
                                <span style={{ fontSize: 9 }}>No img</span>
                              </div>
                            )}
                            <span className="trip-photo-odo-val">
                              {row.odoEnd ? `${Number(row.odoEnd).toLocaleString('en-IN')} km` : "—"}
                            </span>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Actions */}
                    <div className="trip-card-actions">
                      <button
                        onClick={() => setShowEndTripModal(row.id)}
                        disabled={actionLoading || row.status === "completed"}
                        style={{
                          background: row.status === "completed" ? "#06771f" : "#f4b400",
                          color: "#fff",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                        }}
                      >
                        <StopCircleIcon style={{ fontSize: 16 }} />
                        {row.status === "completed" ? "Completed" : "End Trip"}
                      </button>
                      {isSuperAdmin && (
                        <button
                          onClick={() => setDeleteId(row.id)}
                          disabled={actionLoading}
                          style={{
                            background: "#d93025",
                            color: "#fff",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                          }}
                        >
                          <DeleteOutlineOutlinedIcon style={{ fontSize: 16 }} /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>{/* end mobile-cards */}

              {/* Mobile pagination */}
              {!loading && totalPages > 1 && (
                <div className="pagination-container" style={{ flexShrink: 0 }}>
                  <button className="pagination-button" onClick={goToPreviousPage} disabled={currentPage === 1}>‹ Prev</button>
                  {getVisiblePages().map(page => (
                    <button key={page} className={`pagination-button ${currentPage === page ? 'active' : ''}`} onClick={() => goToPage(page)}>{page}</button>
                  ))}
                  <button className="pagination-button" onClick={goToNextPage} disabled={currentPage === totalPages}>Next ›</button>
                </div>
              )}
              {/* Footer */}
              <div style={{ textAlign: "center", padding: "10px 16px 14px", borderTop: "1px solid #e8eaed", fontSize: 11, color: "#9aa0a6", fontFamily: "'Google Sans', sans-serif", letterSpacing: "0.01em", flexShrink: 0, marginTop: 8 }}>
                Powered by <span style={{ fontWeight: 600, color: "#1a73e8" }}>IMCB Solutions LLP</span>
              </div>
            </div>{/* end mobile-cards-wrapper */}

            {/* ── Desktop Table View ── */}
            <div className="desktop-table scrollable-table-body" style={{ flex: 1, overflowY: "auto", overflowX: "auto", minHeight: 0 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1400 }}>
                <thead>
                  <tr>
                    {["Sl.No.", "Start Date", "Vehicle", ...(isAdminOrManager ? ["Traveled By"] : []), "Purpose", "Odometer Photos", "Distance", "Fuel & Cost", "End Date", "Action"].map((h) => (
                      <th key={h} style={{ ...thStyle, textAlign: ["Action", "Purpose", "Odometer Photos"].includes(h) ? "center" : "left" }}>
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
                          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                              <AccessTimeIcon style={{ fontSize: 9, color: "#494949", flexShrink: 0 }} />
                              <span style={{ fontSize: 11, fontWeight: 500, color: "#000", whiteSpace: "nowrap", lineHeight: 1 }}>
                                {row.date ? new Date(row.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                              </span>
                            </div>
                            <span style={{ fontSize: 9, color: "#707070", paddingLeft: 16, lineHeight: 1, marginTop: 2 }}>{formatTime(row.startTime)}</span>
                          </div>
                        </td>

                        {/* Vehicle */}
                        <td style={tdStyle}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                            <span style={{
                              color: "#050505", fontSize: 11, fontWeight: 700,
                              fontFamily: "'Google Sans', sans-serif", letterSpacing: 0.4, lineHeight: 1,
                            }}>
                              {row.vehicle || row.vehicle_name || "—"}
                            </span>
                            {(row.vehicleReg || row.registration_number) && (
                              <span style={{
                                color: "#6b6d6e", fontSize: 9, fontWeight: 600,
                                fontFamily: "'Google Sans', sans-serif", letterSpacing: 0.6, lineHeight: 1, marginTop: 2,
                              }}>
                                {row.vehicleReg || row.registration_number}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Traveled By — Admin/Manager only */}
                        {isAdminOrManager && (
                          <td style={{ ...tdStyle, fontWeight: 600, fontSize: 11 }}>
                            {row.traveledBy || row.traveled_by || "—"}
                          </td>
                        )}

                        {/* Purpose */}
                        <td style={{ ...tdStyle, textAlign: "center", verticalAlign: "middle" }}>
                          {(row.purpose || row.purpose_of_trip) ? (
                            <button
                              onClick={() => setPurposePopup(row.purpose || row.purpose_of_trip)}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#1a73e8", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, margin: "0 auto" }}
                            >
                              <RemoveRedEyeOutlinedIcon style={{ fontSize: 22 }} />
                            </button>
                          ) : (
                            <span style={{ color: "#cbd5e1", fontSize: 11 }}>—</span>
                          )}
                        </td>

                        {/* Photos */}
                        <td style={{ ...tdStyle, textAlign: "center", verticalAlign: "middle" }}>
                          <button
                            onClick={() => setOdoPhotoPopup({ startImg: row.startImg, endImg: row.endImg, odoStart: row.odoStart, odoEnd: row.odoEnd })}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#1a73e8", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, margin: "0 auto" }}
                            title="View Odometer Photos"
                          >
                            <AddToPhotosOutlinedIcon style={{ fontSize: 22 }} />
                          </button>
                        </td>

                        {/* Distance */}
                        <td style={tdStyle}>
                          <span style={{ fontWeight: 700, fontSize: 11, color: "#030303" }}>
                            {row.distance || 0} km
                          </span>
                        </td>

                        {/* Fuel & Cost */}
                        <td style={{ ...tdStyle, textAlign: "left" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                            <div style={{ fontSize: 11, textAlign: "left", color: "#000000", lineHeight: 1 }}>
                              ₹{(row.cost || row.fuel_cost || 0).toLocaleString('en-IN')}
                            </div>
                            {(row.maintenanceCost || row.maintenance_cost) > 0 && (
                              <div style={{ fontSize: 9, textAlign: "left", color: "#5f6368", lineHeight: 1, marginTop: 2 }}>
                                Maint: ₹{(row.maintenanceCost || row.maintenance_cost || 0).toLocaleString('en-IN')}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* End Date */}
                        <td style={tdStyle}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                              <HistoryIcon style={{ fontSize: 12, color: "#b71c1c", flexShrink: 0 }} />
                              <span style={{ fontSize: 11, fontWeight: 500, color: "#000", whiteSpace: "nowrap", lineHeight: 1 }}>
                                {(row.endDate || row.end_date) ? new Date(row.endDate || row.end_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                              </span>
                            </div>
                            <span style={{ fontSize: 9, color: "#b71c1c", paddingLeft: 16, lineHeight: 1, marginTop: 2 }}>{formatTime(row.endTime)}</span>
                          </div>
                        </td>
                        <td style={{ ...tdStyle, textAlign: "center", whiteSpace: "nowrap" }}>
                          <div style={{ display: "inline-flex", gap: 6, justifyContent: "center" }}>
                            <button
                              onClick={() => setShowEndTripModal(row.id)}
                              disabled={actionLoading || row.status === "completed"}
                              style={{
                                padding: "5px 10px",
                                borderRadius: 6,
                                border: "none",
                                background: row.status === "completed" ? "#06771f" : "#f4b400",
                                color: "#fdfbfb",
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: row.status === "completed" ? "not-allowed" : "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                fontFamily: "'Google Sans', sans-serif",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <StopCircleIcon style={{ fontSize: 12 }} />
                              {row.status === "completed" ? "Completed" : "End Trip"}
                            </button>
                            {isSuperAdmin && (
                              <button
                                onClick={() => setDeleteId(row.id)}
                                disabled={actionLoading}
                                style={{
                                  padding: "5px 10px",
                                  borderRadius: 6,
                                  border: "none",
                                  background: "#d93025",
                                  color: "#fff",
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  fontFamily: "'Google Sans', sans-serif",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                <DeleteOutlineOutlinedIcon style={{ fontSize: 12 }} /> Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>{/* end desktop-table */}

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
            {/* Footer - desktop */}
            <div style={{ textAlign: "center", padding: "10px 16px", borderTop: "1px solid #e8eaed", fontSize: 11, color: "#9aa0a6", fontFamily: "'Google Sans', sans-serif", letterSpacing: "0.01em", flexShrink: 0 }}>
              Powered by <span style={{ fontWeight: 600, color: "#1a73e8" }}>IMCB Solutions LLP</span>
            </div>
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
      {odoPhotoPopup && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(5px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={() => setOdoPhotoPopup(null)}
        >
          <div
            style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", maxWidth: 520, width: "92vw", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", fontFamily: "'Google Sans', sans-serif" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <AddToPhotosOutlinedIcon style={{ fontSize: 22, color: "#1a73e8" }} />
                <span style={{ fontWeight: 700, fontSize: 15, color: "#202124" }}>Odometer Photos</span>
              </div>
              <button
                onClick={() => setOdoPhotoPopup(null)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#5f6368", lineHeight: 1 }}
              >×</button>
            </div>

            {/* Photos side by side */}
            <div style={{ display: "flex", gap: 16 }}>
              {/* Start */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#2e7d32", letterSpacing: 0.5, textTransform: "uppercase" }}>🟢 Start</span>
                {odoPhotoPopup.startImg ? (
                  <img
                    src={odoPhotoPopup.startImg}
                    alt="Start Odometer"
                    onClick={() => setLightbox({ src: odoPhotoPopup.startImg, label: "Start" })}
                    style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 10, border: "2px solid #2e7d32", cursor: "zoom-in", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                  />
                ) : (
                  <div style={{ width: "100%", height: 140, borderRadius: 10, border: "1.5px dashed #d0d0d0", background: "#fafafa", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#bdbdbd", gap: 6 }}>
                    <span style={{ fontSize: 28 }}>📷</span>
                    <span style={{ fontSize: 12 }}>No image</span>
                  </div>
                )}
                {odoPhotoPopup.odoStart != null && odoPhotoPopup.odoStart !== 0 ? (
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#202124" }}>{Number(odoPhotoPopup.odoStart).toLocaleString('en-IN')} km</span>
                ) : (
                  <span style={{ fontSize: 12, color: "#bdbdbd" }}>—</span>
                )}
              </div>

              {/* Divider */}
              <div style={{ width: 1, background: "#e8eaed", flexShrink: 0, borderRadius: 2 }} />

              {/* End */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#b71c1c", letterSpacing: 0.5, textTransform: "uppercase" }}>🔴 End</span>
                {odoPhotoPopup.endImg ? (
                  <img
                    src={odoPhotoPopup.endImg}
                    alt="End Odometer"
                    onClick={() => setLightbox({ src: odoPhotoPopup.endImg, label: "End" })}
                    style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 10, border: "2px solid #b71c1c", cursor: "zoom-in", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                  />
                ) : (
                  <div style={{ width: "100%", height: 140, borderRadius: 10, border: "1.5px dashed #d0d0d0", background: "#fafafa", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#bdbdbd", gap: 6 }}>
                    <span style={{ fontSize: 28 }}>📷</span>
                    <span style={{ fontSize: 12 }}>No image</span>
                  </div>
                )}
                {odoPhotoPopup.odoEnd != null && odoPhotoPopup.odoEnd !== 0 ? (
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#202124" }}>{Number(odoPhotoPopup.odoEnd).toLocaleString('en-IN')} km</span>
                ) : (
                  <span style={{ fontSize: 12, color: "#bdbdbd" }}>—</span>
                )}
              </div>
            </div>

            {/* Close button */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
              <button
                onClick={() => setOdoPhotoPopup(null)}
                style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#1a73e8", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "'Google Sans', sans-serif" }}
              >Close</button>
            </div>
          </div>
        </div>
      )}


    </>
  );
}