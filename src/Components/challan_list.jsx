import { useState, useEffect } from "react";
import { getChallans, deleteChallan } from "../service/challan";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import ChallanAdd from "./challan_add";

const STATUS_STYLES = {
  Paid:    { background: "#188038", color: "#fbfcfb" },
  Pending: { background: "rgb(241 147 33)", color: "#fbfcfb" },
  Waived:  { background: "#7c3aed", color: "#f8f7fa" },
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

  const fetchChallans = async () => {
    try {
      setLoading(true);
      const response = await getChallans();
      const challanData = Array.isArray(response)
        ? response
        : (response.results || []);
      setData(challanData);
    } catch (error) {
      console.error("Failed to fetch challans:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchChallans(); }, []);

  /* ── filter ── */
  const filtered = data.filter(r => {
    const q = search.toLowerCase();
    const matchSearch =
      (r.vehicle_display || "").toLowerCase().includes(q) ||
      (r.challan_no     || "").toLowerCase().includes(q) ||
      (r.offence_type   || "").toLowerCase().includes(q) ||
      (r.location       || "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "All" || r.payment_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const confirmDelete = (id) => setDelId(id);

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

  // Helper function to format vehicle display - shows only vehicle number and name without extra formatting
  const formatVehicleDisplay = (vehicleData) => {
    if (!vehicleData) return "—";
    
    // If vehicle_display is already a clean string, use it directly
    if (typeof vehicleData === 'string') {
      // Remove any "Vehicle #" prefix if present
      return vehicleData.replace(/^Vehicle\s*#\s*/, '');
    }
    
    // If vehicle has number and name properties
    if (vehicleData.number && vehicleData.name) {
      return `${vehicleData.number} - ${vehicleData.name}`;
    }
    
    if (vehicleData.number) {
      return vehicleData.number;
    }
    
    if (vehicleData.name) {
      return vehicleData.name;
    }
    
    return "—";
  };

  const totalFine = filtered.reduce((s, r) => s + parseFloat(r.fine_amount || 0), 0);
  const paidCount = filtered.filter(r => r.payment_status === "Paid").length;
  const pendCount = filtered.filter(r => r.payment_status === "Pending").length;

  // Table styles matching Vehicle Master exactly
  const thStyle = { 
    fontSize: 14, 
    fontWeight: 600, 
    letterSpacing: "0.4px", 
    color: "#0a0a0a", 
    textAlign: "left", 
    padding: "11px 14px", 
    background: "#f8f9fa", 
    borderBottom: "1px solid #e8eaed", 
    fontFamily: "'Google Sans', sans-serif", 
    whiteSpace: "nowrap", 
    textTransform: "capitalize" 
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
      `}</style>

      <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* ── Sticky Page Header Bar ── */}
        <div style={{ 
          flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", 
          padding: "0 16px", height: 56,  borderBottom: "1px solid #e8eaed", 
          gap: 8, flexWrap: "wrap" 
        }}>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: "#202124", margin: 4, letterSpacing: "0.10px", lineHeight: 1.2 }}>
              Challan List
            </h1>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
            <button 
              onClick={onAdd} 
              style={{ 
                display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", 
                borderRadius: 8, border: "none", background: "#1a73e8", color: "#fff", 
                fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Google Sans', sans-serif", 
                boxShadow: "0 2px 8px rgba(26,115,232,0.3)", transition: "all 0.2s", whiteSpace: "nowrap" 
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#1557b0"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#1a73e8"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              + Add Challan
            </button>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>

          {/* ── Summary Cards ── */}
          <div className="summary-cards">
            <div className="summary-card">
              <div className="summary-card-title">Total Challans</div>
              <div className="summary-card-value">{filtered.length}</div>
              <div className="summary-card-sub">Total records</div>
            </div>
            <div className="summary-card">
              <div className="summary-card-title">Total Fine Amount</div>
              <div className="summary-card-value">₹{totalFine.toLocaleString()}</div>
              <div className="summary-card-sub">Accumulated fines</div>
            </div>
            <div className="summary-card">
              <div className="summary-card-title">Paid</div>
              <div className="summary-card-value">{paidCount}</div>
              <div className="summary-card-sub">Completed payments</div>
            </div>
            <div className="summary-card">
              <div className="summary-card-title">Pending</div>
              <div className="summary-card-value">{pendCount}</div>
              <div className="summary-card-sub">Awaiting payment</div>
            </div>
          </div>

          {/* ── Filters Section ── */}
          <div style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: 10, padding: "18px 20px", marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
              {/* Search */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#5f6368", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: "'Google Sans', sans-serif" }}>
                  Search
                </label>
                <input 
                  className="cl-search-input"
                  type="text" 
                  placeholder="Search vehicle, challan, offence..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ 
                    width: "100%", padding: "9px 12px", border: "1px solid #e8eaed", 
                    borderRadius: 7, fontSize: 13, fontFamily: "'Google Sans', sans-serif", 
                    outline: "none", transition: "border 0.2s, box-shadow 0.2s", 
                    boxSizing: "border-box" 
                  }}
                />
              </div>

              {/* Status Filter */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#5f6368", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: "'Google Sans', sans-serif" }}>
                  Status
                </label>
                <select
                  className="status-select"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  style={{ minWidth: 140 }}
                >
                  <option value="All">All</option>
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                  <option value="Waived">Waived</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── Count ── */}
          <div style={{ marginBottom: 16, fontSize: 13, color: "#5f6368", fontFamily: "'Google Sans', sans-serif", fontWeight: 600 }}>
            {filtered.length} record{filtered.length !== 1 ? "s" : ""} found
          </div>

          {/* ── Table with Vehicle Master styling ── */}
          {filtered.length > 0 ? (
            <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e8eaed", overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {HEADERS.map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row, index) => (
                      <tr key={row.id}
                        onMouseEnter={e => e.currentTarget.style.background = "#f8f9fa"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        {/* Sl. no. */}
                        <td style={{ ...tdStyle, color: "#9aa0a6", fontWeight: 600, width: 56, textAlign: "center" }}>{index + 1}</td>
                        
                        {/* Vehicle - properly formatted without extra characters */}
                        <td style={{ ...tdStyle, fontWeight: 500, color: "#1e293b" }}>
                          {formatVehicleDisplay(row.vehicle_display || row.vehicle)}
                        </td>
                        
                        {/* Default Date */}
                        <td style={tdStyle}>{row.date || row.default_date || "—"}</td>
                        
                        {/* Challan No */}
                        <td style={{ ...tdStyle, color: "#1a73e8", fontWeight: 600 }}>{row.challan_no || "—"}</td>
                        
                        {/* Challan Date */}
                        <td style={tdStyle}>{row.challan_date || "—"}</td>
                        
                        {/* Offence Type */}
                        <td style={tdStyle}>{row.offence_type || "—"}</td>
                        
                        {/* Location */}
                        <td className="wrap-text" style={tdStyle}>{row.location || "—"}</td>
                        
                        {/* Fine Amount */}
                        <td style={{ ...tdStyle, fontWeight: 600, color: "#0f172a", textAlign: "right" }}>
                          ₹{parseFloat(row.fine_amount || 0).toLocaleString()}
                        </td>
                        
                        {/* Payment Status */}
                        <td style={tdStyle}>
                          <span className="pill" style={STATUS_STYLES[row.payment_status] || { background: "#f1f3f4", color: "#5f6368" }}>
                            {row.payment_status || "Pending"}
                          </span>
                        </td>
                        
                        {/* Challan Doc - centered icon */}
                        <td style={{ ...tdStyle, textAlign: "center" }}>
                          {row.challan_doc_url ? (
                            <a className="file-link" href={row.challan_doc_url} target="_blank" rel="noreferrer">
                              <VisibilityOutlinedIcon style={{ fontSize: 18 }} />
                            </a>
                          ) : (
                            <span className="no-file">—</span>
                          )}
                        </td>
                        
                        {/* Payment Receipt - centered icon */}
                        <td style={{ ...tdStyle, textAlign: "center" }}>
                          {row.payment_receipt_url ? (
                            <a className="file-link" href={row.payment_receipt_url} target="_blank" rel="noreferrer">
                              <VisibilityOutlinedIcon style={{ fontSize: 18 }} />
                            </a>
                          ) : (
                            <span className="no-file">—</span>
                          )}
                        </td>
                        
                        {/* Remark */}
                        <td className="wrap-text" style={{ ...tdStyle, color: "#64748b" }}>
                          {row.remark || <span className="no-file">—</span>}
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
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", border: "1px solid #e8eaed", borderRadius: 10, color: "#5f6368", fontSize: 14, fontFamily: "'Google Sans', sans-serif" }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#202124", marginBottom: 6 }}>No challans found</div>
              <div>Try adjusting your filters or add a new challan.</div>
            </div>
          )}
        </div>
      </div>

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
    </>
  );
}