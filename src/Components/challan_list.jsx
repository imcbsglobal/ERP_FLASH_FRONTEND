import { useState, useEffect } from "react";
import { getChallans, deleteChallan, updateChallan } from "../service/Api";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import EditNotificationsOutlinedIcon from "@mui/icons-material/EditNotificationsOutlined";
import ChallanAdd from "./challan_add";

const STATUS_STYLES = {
  Paid:    { background: "#188038", color: "#ffffff" },
  Pending: { background: "rgb(247,170,4) ", color: "#ffffff" },
};

// Table headers matching Vehicle Master style
const HEADERS = [
  "Sl. no.", "Vehicle", "Default Date", "Challan No", "Challan Date",
  "Offence Type", "Location", "Fine Amt (₹)", "Payment Status",
  "Challan Doc", "Payment Receipt", "Remark", "Action"
];

export default function ChallanList({ onAdd, onEdit }) {
  const [data, setData]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [delId, setDelId]             = useState(null);
  const [editRow, setEditRow]         = useState(null);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [remarkPopup, setRemarkPopup] = useState(null);
  const [docViewer, setDocViewer]     = useState(null); // { url, title }

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Read logged-in user from localStorage (set by authService.login)
  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem("user")) || {}; } catch { return {}; }
  })();
  const isAdmin = currentUser?.role === "Admin";

  const fetchChallans = async () => {
    try {
      setLoading(true);
      const response = await getChallans();
      const challanData = Array.isArray(response)
        ? response
        : (response.results || []);
      setData(challanData);
      setCurrentPage(1); // Reset to first page when data loads
    } catch (error) {
      console.error("Failed to fetch challans:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchChallans(); }, []);

  /* ── filter ── */
  // Non-admins only see challans they created (matched by created_by_username)
  const visibleData = isAdmin
    ? data
    : data.filter(
        (r) =>
          (r.created_by_username || "").toLowerCase() ===
          (currentUser?.username || "").toLowerCase()
      );

  const filtered = visibleData.filter(r => {
    const q = search.toLowerCase();
    const matchSearch =
      (r.vehicle_display || "").toLowerCase().includes(q) ||
      (r.challan_no     || "").toLowerCase().includes(q) ||
      (r.offence_type   || "").toLowerCase().includes(q) ||
      (r.location       || "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "All" || r.payment_status === statusFilter;
    return matchSearch && matchStatus;
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

  const confirmDelete = (id) => setDelId(id);

  const handleStatusChange = async (id, newStatus) => {
    setUpdatingStatusId(id);
    try {
      await updateChallan(id, { paymentStatus: newStatus });
      setData(d => d.map(r => r.id === id ? { ...r, payment_status: newStatus } : r));
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Failed to update status. Please try again.");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const doDelete = async () => {
    try {
      await deleteChallan(delId);
      setData(d => d.filter(r => r.id !== delId));
      setDelId(null);
    } catch (error) {
      console.error("Failed to delete challan:", error);
      alert("Failed to delete challan. Please try again.");
    }
  };

  // Helper function to format vehicle display - returns { number, name } parts
  const formatVehicleDisplay = (vehicleData) => {
    if (!vehicleData) return { number: null, name: null };

    if (typeof vehicleData === 'string') {
      const clean = vehicleData.replace(/^Vehicle\s*#\s*/, '');
      const parts = clean.split(/\s*-\s*/);
      if (parts.length >= 2) {
        return { number: parts[0].trim(), name: parts.slice(1).join(' - ').trim() };
      }
      return { number: clean, name: null };
    }

    if (vehicleData.number || vehicleData.name) {
      return { number: vehicleData.number || null, name: vehicleData.name || null };
    }

    return { number: null, name: null };
  };

  const totalFine = filtered.reduce((s, r) => s + parseFloat(r.fine_amount || 0), 0);
  const paidCount = filtered.filter(r => r.payment_status === "Paid").length;
  const pendCount = filtered.filter(r => r.payment_status === "Pending").length;

  // Table styles with sticky header
  const thStyle = { 
    fontSize: 15, 
    fontWeight: 600, 
    letterSpacing: "0.4px", 
    color: "#fdfcfc", 
    textAlign: "left", 
    padding: "11px 14px", 
    background: "#0b81f8", 
    borderBottom: "1px solid #e8eaed", 
    fontFamily: "'Google Sans', sans-serif", 
    whiteSpace: "nowrap", 
    textTransform: "capitalize",
    position: "sticky",
    top: 0,
    zIndex: 10
  };
  
  const tdStyle = { 
    padding: "12px 14px", 
    fontSize: 13, 
    borderBottom: "1px solid #e8eaed", 
    fontFamily: "'Google Sans', sans-serif", 
    color: "#202124", 
    textAlign: "left", 
    verticalAlign: "middle" 
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#5f6368', fontSize: '14px', fontFamily: "'Google Sans', sans-serif" }}>
        Loading challans...
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&display=swap');
        * { font-family: 'Google Sans', sans-serif; }
        
        .cl-search-input::placeholder { color: #9aa0a6; }
        .cl-search-input:focus { border-color: #1a73e8 !important; box-shadow: 0 0 0 2px rgba(26,115,232,0.12); }
        
        .status-select {
          padding: 9px 36px 9px 13px;
          border-radius: 7px;
          font-size: 13px;
          font-weight: 500;
          border: 1px solid #e8eaed;
          cursor: pointer;
          text-align: left;
          outline: none;
          font-family: "'Google Sans', sans-serif";
          background: #fff;
          color: #202124;
          appearance: none;
          -webkit-appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24'%3E%3Cpath fill='%235f6368' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 11px center;
        }
        .status-select:focus { border-color: #1a73e8; box-shadow: 0 0 0 2px rgba(26,115,232,0.12); }
        
        .pill {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          font-family: "'Google Sans', sans-serif";
        }
        
        .file-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #1a73e8;
          text-decoration: none;
          transition: color 0.2s;
        }
        .file-link:hover { color: #1557b0; }
        
        .no-file {
          color: #cbd5e1;
          font-size: 0.78rem;
        }
        
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.48);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-box {
          background: #fff;
          border-radius: 12px;
          padding: 24px 28px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18);
          max-width: 360px;
          width: 100%;
          font-family: "'Google Sans', sans-serif";
        }
        
        .wrap-text {
          white-space: normal;
          word-wrap: break-word;
          max-width: 200px;
        }

        /* Scrollable table container */
        .scrollable-table-container {
          flex: 1;
          min-height: 0;
          overflow: auto;
          background: #fff;
          border-radius: 10px;
          border: 1px solid #e8eaed;
        }
        
        .data-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .data-table thead tr th {
          position: sticky;
          top: 0;
          z-index: 10;
          background: #0b81f8;
        }

        /* Pagination Styles */
        .pagination-container {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 8px;
          margin-top: 16px;
          padding: 12px 0;
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
          border-radius: 6px;
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

        /* ── Header bar ── */
        .cl-header-bar {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          height: 56px;
          border-bottom: 1px solid #e8eaed;
          gap: 8px;
          flex-wrap: wrap;
        }
        .cl-header-bar h1 {
          font-size: 25px;
          font-weight: 600;
          color: #0d0d0e;
          margin: 4px 0;
          letter-spacing: 0.1px;
          line-height: 1.2;
        }
        .cl-add-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 18px;
          border-radius: 8px;
          border: none;
          background: #1a73e8;
          color: #fff;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          font-family: 'Google Sans', sans-serif;
          box-shadow: 0 2px 8px rgba(26,115,232,0.3);
          transition: all 0.2s;
          white-space: nowrap;
        }
        .cl-add-btn:hover { background: #1557b0; transform: translateY(-1px); }

        /* ── Filters ── */
        .cl-filters-wrap {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          align-items: flex-end;
        }
        .cl-filter-search {
          flex: 1;
          min-width: 200px;
        }
        .cl-filter-item {
          min-width: 140px;
        }
        .cl-filter-label {
          font-size: 12px;
          font-weight: 600;
          color: #0a0a0a;
          display: block;
          margin-bottom: 6px;
          text-align: left;
          letter-spacing: 0.8px;
          font-family: 'Google Sans', sans-serif;
        }
        .cl-filter-input {
          width: 100%;
          padding: 9px 12px;
          border: 1px solid #e8eaed;
          border-radius: 7px;
          font-size: 13px;
          font-family: 'Google Sans', sans-serif;
          outline: none;
          transition: border 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }
        .cl-filter-input:focus { border-color: #1a73e8; box-shadow: 0 0 0 2px rgba(26,115,232,0.12); }

        /* ── Summary cards ── */
        .summary-cards {
          display: flex;
          gap: 16px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .summary-card {
          background: #fff;
          border: 1px solid #e8eaed;
          border-radius: 12px;
          padding: 16px 20px;
          flex: 1;
          min-width: 150px;
        }
        .summary-card-title {
          font-size: 12px;
          font-weight: 600;
          color: #5f6368;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 8px;
        }
        .summary-card-value {
          font-size: 28px;
          font-weight: 700;
          color: #202124;
        }
        .summary-card-sub {
          font-size: 12px;
          color: #5f6368;
          margin-top: 4px;
        }

        /* ── Mobile ── */
        @media (max-width: 600px) {
          .cl-header-bar {
            height: auto;
            padding: 10px 12px;
            gap: 8px;
          }
          .cl-header-bar h1 { font-size: 20px !important; }
          .cl-add-btn {
            width: 100%;
            justify-content: center;
            padding: 9px 18px;
          }
          /* Search + Status → single row */
          .cl-filters-wrap {
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            gap: 8px;
            align-items: flex-end;
          }
          .cl-filter-search {
            flex: 1 1 0;
            min-width: 0;
          }
          .cl-filter-item {
            flex: 0 0 110px;
            min-width: 0;
          }
          .cl-filter-search input,
          .cl-filter-item select,
          .status-select {
            width: 100% !important;
            font-size: 12px !important;
            padding: 8px 8px !important;
            box-sizing: border-box !important;
          }
          .cl-filter-label { font-size: 11px !important; margin-bottom: 4px !important; }
          /* Tighter filter container */
          .cl-filters-wrap-container { padding: 10px 12px !important; margin-bottom: 10px !important; }
          .summary-cards { gap: 8px; }
          .summary-card { min-width: calc(50% - 4px); padding: 10px 12px; }
          .summary-card-value { font-size: 20px; }
          .pagination-container {
            flex-wrap: wrap;
            justify-content: center;
            gap: 6px;
          }
          .col-hide-mobile { display: none !important; }

          /* ── Mobile Card Scroll Wrapper ── */
          .cl-desktop-table { display: none !important; }
          .cl-mobile-scroll-wrapper {
            display: flex !important;
            flex-direction: column;
            flex: 1;
            min-height: 0;
            overflow-y: auto;
            overflow-x: hidden;
            -webkit-overflow-scrolling: touch;
          }
          .cl-mobile-cards { display: flex; flex-direction: column; gap: 8px; padding: 4px 0; }

          /* ── Compact Challan Card ── */
          .challan-card {
            background: #fff;
            border-radius: 10px;
            border: 1px solid #e8eaed;
            box-shadow: 0 1px 6px rgba(0,0,0,0.06);
            padding: 10px 12px 10px 16px;
            position: relative;
            overflow: hidden;
          }
          .challan-card::before {
            content: '';
            position: absolute;
            left: 0; top: 0; bottom: 0;
            width: 4px;
            background: linear-gradient(180deg, #0b81f8, #1557b0);
            border-radius: 4px 0 0 4px;
          }
          .challan-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 7px;
            gap: 8px;
          }
          .challan-card-index {
            width: 22px; height: 22px;
            background: linear-gradient(135deg, #0b81f8, #1557b0);
            color: #fff; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 10px; font-weight: 700; flex-shrink: 0;
          }
          .challan-card-vehicle { flex: 1; min-width: 0; }
          .challan-card-vehicle-name { font-size: 13px; font-weight: 700; color: #1a73e8; }
          .challan-card-vehicle-reg { font-size: 11px; font-weight: 500; color: #1e293b; margin-top: 1px; }
          .challan-card-row {
            display: flex; gap: 6px; margin-bottom: 6px; flex-wrap: nowrap;
          }
          .challan-card-field {
            flex: 1; min-width: 0;
            background: #f8fafc; border-radius: 7px; padding: 5px 7px;
          }
          .challan-card-field-label {
            font-size: 9px; font-weight: 600; color: #9aa0a6;
            text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 2px;
          }
          .challan-card-field-value { font-size: 12px; font-weight: 600; color: #202124; }
          .challan-card-actions { 
            display: flex; 
            gap: 6px; 
            margin-top: 7px; 
            align-items: stretch; 
            width: 100%;
          }
          .challan-card-actions button, .challan-card-actions select {
            flex: 1; 
            padding: 7px 6px; 
            border-radius: 6px; 
            border: none;
            font-size: 12px; 
            font-weight: 600; 
            cursor: pointer;
            display: flex; 
            align-items: center; 
            justify-content: center; 
            gap: 4px;
            font-family: 'Google Sans', sans-serif; 
            min-height: 34px;
            white-space: nowrap;
            box-sizing: border-box;
          }
          .challan-card-docs {
            display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px;
          }
          .challan-card-doc-link {
            display: inline-flex; align-items: center; gap: 3px;
            font-size: 10px; font-weight: 600; color: #1a73e8;
            text-decoration: none; background: #fdfdfd; border-radius: 5px;
            padding: 3px 8px;
          }
        }

        /* Desktop: always show table, hide cards */
        @media (min-width: 601px) {
          .cl-desktop-table { display: block !important; }
          .cl-mobile-scroll-wrapper { display: none !important; }
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

      <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* ── Sticky Page Header Bar ── */}
        <div className="cl-header-bar">
          <h1>Challan List</h1>
          <button
            className="cl-add-btn"
            onClick={onAdd}
          >
            + Add Challan
          </button>
        </div>

        {/* ── Scrollable Body ── */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: "12px 16px" }}>

          {/* ── Filters Section ── */}
          <div className="cl-filters-wrap-container" style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: 10, padding: "18px 20px", marginBottom: 20, flexShrink: 0 }}>
            <div className="cl-filters-wrap">
              {/* Search */}
              <div className="cl-filter-search">
                <label className="cl-filter-label">Search</label>
                <input 
                  className="cl-search-input cl-filter-input"
                  type="text" 
                  placeholder="Search vehicle, challan, offence..."
                  value={search}
                  onChange={e => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              {/* Status Filter */}
              <div className="cl-filter-item">
                <label className="cl-filter-label">Status</label>
                <select
                  className="status-select"
                  value={statusFilter}
                  onChange={e => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{ width: "100%" }}
                >
                  <option value="All">All</option>
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            </div>
          </div>

          

          {/* ── Table with Scrollable Container (Only Table Scrolls) ── */}
          {filtered.length > 0 ? (
            <>
              {/* ── Mobile Card View ── */}
              <div className="cl-mobile-scroll-wrapper">
              <div className="cl-mobile-cards">
                {currentData.map((row, index) => {
                  const { number, name } = formatVehicleDisplay(row.vehicle_display || row.vehicle);
                  const statusStyle = STATUS_STYLES[row.payment_status] || STATUS_STYLES["Pending"];
                  return (
                    <div key={row.id} className="challan-card">
                      {/* Header: index + vehicle + status */}
                      <div className="challan-card-header">
                        <div className="challan-card-index">{startIndex + index + 1}</div>
                        <div className="challan-card-vehicle">
                          {name && <div className="challan-card-vehicle-name">{name}</div>}
                          {number && <div className="challan-card-vehicle-reg">{number}</div>}
                          {!name && !number && <div className="challan-card-vehicle-reg">—</div>}
                        </div>
                        <select
                          value={row.payment_status || "Pending"}
                          onChange={(e) => handleStatusChange(row.id, e.target.value)}
                          disabled={updatingStatusId === row.id}
                          style={{
                            padding: "3px 6px", borderRadius: 6, border: "none",
                            background: statusStyle.background, color: statusStyle.color,
                            fontFamily: "'Google Sans', sans-serif", fontSize: 7,
                            fontWeight: 700, cursor: "pointer", outline: "none",
                            flexShrink: 0,
                            opacity: updatingStatusId === row.id ? 0.7 : 1,
                          }}
                        >
                          <option value="Pending" style={{ background: "#fff", color: "#202124" }}>Pending</option>
                          <option value="Paid" style={{ background: "#fff", color: "#202124" }}>Paid</option>
                        </select>
                      </div>

                      {/* Row 1: Default Date + Challan No */}
                      <div className="challan-card-row">
                        <div className="challan-card-field">
                          <div className="challan-card-field-label">Default Date</div>
                          <div className="challan-card-field-value">{row.date || row.default_date || "—"}</div>
                        </div>
                        <div className="challan-card-field">
                          <div className="challan-card-field-label"> Challan No</div>
                          <div className="challan-card-field-value" style={{ color: "#1a73e8" }}>{row.challan_no || "—"}</div>
                        </div>
                      </div>

                      {/* Row 2: Challan Date + Fine Amount */}
                      <div className="challan-card-row">
                        <div className="challan-card-field">
                          <div className="challan-card-field-label">Challan Date</div>
                          <div className="challan-card-field-value">{row.challan_date || "—"}</div>
                        </div>
                        <div className="challan-card-field">
                          <div className="challan-card-field-label"> Fine Amount</div>
                          <div className="challan-card-field-value" style={{ color: "#d93025" }}>₹{parseFloat(row.fine_amount || 0).toLocaleString()}</div>
                        </div>
                      </div>

                      {/* Row 3: Offence + Location */}
                      <div className="challan-card-row">
                        <div className="challan-card-field">
                          <div className="challan-card-field-label"> Offence</div>
                          <div className="challan-card-field-value" style={{ fontSize: 12 }}>{row.offence_type || "—"}</div>
                        </div>
                        <div className="challan-card-field">
                          <div className="challan-card-field-label">Location</div>
                          <div className="challan-card-field-value" style={{ fontSize: 12 }}>{row.location || "—"}</div>
                        </div>
                      </div>

                      {/* Documents */}
                      {(row.challan_doc_url || row.payment_receipt_url || row.remark) && (
                        <div className="challan-card-docs">
                          {row.challan_doc_url && (
                            <button className="challan-card-doc-link" style={{ background: "#fdfdfd", border: "none", cursor: "pointer" }}
                              onClick={() => setDocViewer({ url: row.challan_doc_url, title: "Challan Document" })}>
                              <VisibilityOutlinedIcon style={{ fontSize: 13 }} /> Challan Doc
                            </button>
                          )}
                          {row.payment_receipt_url && (
                            <button className="challan-card-doc-link" style={{ background: "#fdfdfd", border: "none", cursor: "pointer" }}
                              onClick={() => setDocViewer({ url: row.payment_receipt_url, title: "Payment Receipt" })}>
                              <VisibilityOutlinedIcon style={{ fontSize: 13 }} /> Receipt
                            </button>
                          )}
                          {row.remark && (
                            <button
                              onClick={() => setRemarkPopup(row.remark)}
                              className="challan-card-doc-link"
                              style={{ background: "#ffffff", color: "#e65100", border: "none", cursor: "pointer" }}
                            >
                              <EditNotificationsOutlinedIcon style={{ fontSize: 13 }} /> Remark
                            </button>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="challan-card-actions">
                        <button onClick={() => setEditRow(row)} style={{ background: "#1a73e8", color: "#fff" }}>
                          <EditOutlinedIcon style={{ fontSize: 13 }} /> Edit
                        </button>
                        <button onClick={() => confirmDelete(row.id)} style={{ background: "#d93025", color: "#fff" }}>
                          <DeleteOutlineOutlinedIcon style={{ fontSize: 13 }} /> Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>{/* end cl-mobile-cards */}

                {/* Mobile pagination */}
                {totalPages > 1 && (
                  <div className="pagination-container" style={{ flexShrink: 0 }}>
                    <button className="pagination-button" onClick={goToPreviousPage} disabled={currentPage === 1}>‹ Prev</button>
                    {getVisiblePages().map(page => (
                      <button key={page} className={`pagination-button ${currentPage === page ? 'active' : ''}`} onClick={() => goToPage(page)}>{page}</button>
                    ))}
                    <button className="pagination-button" onClick={goToNextPage} disabled={currentPage === totalPages}>Next ›</button>
                  </div>
                )}
              </div>{/* end cl-mobile-scroll-wrapper */}

              {/* ── Desktop Table View ── */}
              <div className="cl-desktop-table scrollable-table-container">
                <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {HEADERS.map(h => (
                        <th key={h} className={["Challan Date","Offence Type","Location","Challan Doc","Payment Receipt","Remark"].includes(h) ? "col-hide-mobile" : ""} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentData.map((row, index) => (
                      <tr key={row.id}
                        onMouseEnter={e => e.currentTarget.style.background = "#f8f9fa"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        {/* Sl. no. - shows correct sequential number across pages */}
                        <td style={{ ...tdStyle, color: "#9aa0a6", fontWeight: 600, width: 56, textAlign: "center" }}>{startIndex + index + 1}</td>
                        
                        {/* Vehicle - number and name stacked, no dash */}
                        <td style={tdStyle}>
                          {(() => {
                            const { number, name } = formatVehicleDisplay(row.vehicle_display || row.vehicle);
                            return (
                              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                {name && (
                                  <span style={{ fontSize: 13, fontWeight: 600, color: "#1a73e8", letterSpacing: 0.4 }}>
                                    {name}
                                  </span>
                                )}
                                {number && (
                                  <span style={{ fontSize: 12, fontWeight: 500, color: "#1e293b" }}>
                                    {number}
                                  </span>
                                )}
                                {!number && !name && <span style={{ color: "#cbd5e1" }}>—</span>}
                              </div>
                            );
                          })()}
                        </td>
                        
                        {/* Default Date */}
                        <td style={tdStyle}>{row.date || row.default_date || "—"}</td>
                        
                        {/* Challan No */}
                        <td style={{ ...tdStyle, color: "#1a73e8", fontWeight: 600 }}>{row.challan_no || "—"}</td>
                        
                        {/* Challan Date */}
                        <td className="col-hide-mobile" style={tdStyle}>{row.challan_date || "—"}</td>
                        
                        {/* Offence Type */}
                        <td className="col-hide-mobile" style={tdStyle}>{row.offence_type || "—"}</td>
                        
                        {/* Location */}
                        <td className="wrap-text col-hide-mobile" style={tdStyle}>{row.location || "—"}</td>
                        
                        {/* Fine Amount */}
                        <td style={{ ...tdStyle, fontWeight: 600, color: "#0f172a", textAlign: "right" }}>
                          ₹{parseFloat(row.fine_amount || 0).toLocaleString()}
                        </td>
                        
                        {/* Payment Status */}
                        <td style={tdStyle}>
                          {(() => {
                            const statusStyle = STATUS_STYLES[row.payment_status] || STATUS_STYLES["Pending"];
                            return (
                              <select
                                value={row.payment_status || "Pending"}
                                onChange={(e) => handleStatusChange(row.id, e.target.value)}
                                disabled={updatingStatusId === row.id}
                                style={{
                                  padding: "6px 10px",
                                  borderRadius: 6,
                                  border: "none",
                                  background: statusStyle.background,
                                  color: statusStyle.color,
                                  fontFamily: "'Google Sans', sans-serif",
                                  fontSize: 13,
                                  fontWeight: 600,
                                  cursor: updatingStatusId === row.id ? "not-allowed" : "pointer",
                                  outline: "none",
                                  opacity: updatingStatusId === row.id ? 0.7 : 1
                                }}
                              >
                                <option value="Pending" style={{ background: "#fff", color: "#202124" }}>Pending</option>
                                <option value="Paid" style={{ background: "#fff", color: "#202124" }}>Paid</option>
                              </select>
                            );
                          })()}
                        </td>
                        
                        {/* Challan Doc - centered icon */}
                        <td className="col-hide-mobile" style={{ ...tdStyle, textAlign: "center" }}>
                          {row.challan_doc_url ? (
                            <button className="file-link" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                              onClick={() => setDocViewer({ url: row.challan_doc_url, title: "Challan Document" })}>
                              <VisibilityOutlinedIcon style={{ fontSize: 18 }} />
                            </button>
                          ) : (
                            <span className="no-file">—</span>
                          )}
                        </td>
                        
                        {/* Payment Receipt - centered icon */}
                        <td className="col-hide-mobile" style={{ ...tdStyle, textAlign: "center" }}>
                          {row.payment_receipt_url ? (
                            <button className="file-link" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                              onClick={() => setDocViewer({ url: row.payment_receipt_url, title: "Payment Receipt" })}>
                              <VisibilityOutlinedIcon style={{ fontSize: 18 }} />
                            </button>
                          ) : (
                            <span className="no-file">—</span>
                          )}
                        </td>
                        
                        {/* Remark */}
                        <td className="col-hide-mobile" style={{ ...tdStyle, textAlign: "center" }}>
                          {row.remark ? (
                            <button
                              onClick={() => setRemarkPopup(row.remark)}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#1a73e8", display: "inline-flex", alignItems: "center", padding: 0 }}
                            >
                              <EditNotificationsOutlinedIcon style={{ fontSize: 20 }} />
                            </button>
                          ) : (
                            <span className="no-file">—</span>
                          )}
                        </td>
                        
                        {/* Actions */}
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button 
                              onClick={() => setEditRow(row)} 
                              style={{ 
                                padding: "5px 12px", borderRadius: 6, border: "none", 
                                background: "#1a73e8", color: "#fff", fontSize: 12, 
                                fontWeight: 600, cursor: "pointer", display: "flex", 
                                alignItems: "center", gap: 4, fontFamily: "'Google Sans', sans-serif" 
                              }}
                            >
                              <EditOutlinedIcon style={{ fontSize: 13 }} /> Edit
                            </button>
                            <button 
                              onClick={() => confirmDelete(row.id)} 
                              style={{ 
                                padding: "5px 12px", borderRadius: 6, border: "none", 
                                background: "#d93025", color: "#fff", fontSize: 12, 
                                fontWeight: 600, cursor: "pointer", display: "flex", 
                                alignItems: "center", gap: 4, fontFamily: "'Google Sans', sans-serif" 
                              }}
                            >
                              <DeleteOutlineOutlinedIcon style={{ fontSize: 13 }} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>{/* end cl-desktop-table */}

              {/* ── Pagination ── */}
              {totalPages > 1 && (
                <div className="pagination-container">
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
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", border: "1px solid #e8eaed", borderRadius: 10, color: "#5f6368", fontSize: 14, fontFamily: "'Google Sans', sans-serif" }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#202124", marginBottom: 6 }}>No challans found</div>
              <div>Try adjusting your filters or add a new challan.</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Document Viewer Modal ── */}
      {docViewer && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: "16px" }}
          onClick={() => setDocViewer(null)}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 780, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.35)", overflow: "hidden" }}
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #e8eaed", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <VisibilityOutlinedIcon style={{ fontSize: 18, color: "#1a73e8" }} />
                <span style={{ fontWeight: 700, fontSize: 15, color: "#202124", fontFamily: "'Google Sans', sans-serif" }}>{docViewer.title}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <a href={docViewer.url} target="_blank" rel="noreferrer"
                  style={{ padding: "6px 14px", borderRadius: 7, background: "#1a73e8", color: "#fff", fontSize: 12, fontWeight: 600, textDecoration: "none", fontFamily: "'Google Sans', sans-serif" }}>
                  Open in new tab
                </a>
                <button onClick={() => setDocViewer(null)}
                  style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e8eaed", background: "#f8f9fa", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#5f6368", lineHeight: 1 }}>
                  ×
                </button>
              </div>
            </div>
            {/* Content */}
            <div style={{ flex: 1, minHeight: 0, overflow: "auto", background: "#f8f9fa", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
              {/\.(jpg|jpeg|png|gif|webp)$/i.test(docViewer.url) ? (
                <img src={docViewer.url} alt={docViewer.title}
                  style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", objectFit: "contain" }} />
              ) : (
                <iframe src={docViewer.url} title={docViewer.title}
                  style={{ width: "100%", height: "70vh", border: "none", borderRadius: 8 }} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Remark Popup ── */}
      {remarkPopup && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setRemarkPopup(null)}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "24px 28px", maxWidth: 400, width: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", fontFamily: "'Google Sans', sans-serif" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <EditNotificationsOutlinedIcon style={{ fontSize: 20, color: "#1a73e8" }} />
              <span style={{ fontWeight: 700, fontSize: 15, color: "#202124" }}>Remark</span>
            </div>
            <p style={{ margin: 0, fontSize: 14, color: "#3c3c3c", lineHeight: 1.8, whiteSpace: "pre-wrap", wordBreak: "break-word", overflowWrap: "break-word", maxHeight: 300, overflowY: "auto" }}>{remarkPopup}</p>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setRemarkPopup(null)} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#1a73e8", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "'Google Sans', sans-serif" }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editRow && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.48)", zIndex: 200, overflowY: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 16px" }}>
          <div style={{ width: "100%", maxWidth: 900, position: "relative" }}>
            <ChallanAdd
              initialData={editRow}
              onBack={() => setEditRow(null)}
              onSuccess={() => { setEditRow(null); fetchChallans(); }}
            />
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {delId && (
        <div className="modal-overlay" onClick={() => setDelId(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: "2rem", marginBottom: 12 }}>🗑️</div>
            <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "#0f172a", marginBottom: 8 }}>
              Delete Challan?
            </div>
            <div style={{ fontSize: ".85rem", color: "#64748b", marginBottom: 24 }}>
              Are you sure you want to delete challan record <strong style={{ color: "#1a73e8" }}>
              {data.find(r=>r.id===delId)?.challan_no}</strong>? This action cannot be undone.
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #e8eaed", background: "#fff", color: "#5f6368", fontFamily: "'Google Sans', sans-serif", fontSize: ".86rem", cursor: "pointer" }}
                onClick={() => setDelId(null)}>Cancel</button>
              <button
                style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "#d93025", color: "#fff", fontFamily: "'Google Sans', sans-serif", fontWeight: 700, fontSize: ".86rem", cursor: "pointer" }}
                onClick={doDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="imcb-footer">
        Powered by <span style={{ fontWeight: 600, color: "#1a73e8" }}>IMCB Solutions LLP</span>
      </div>
    </>
  );
}