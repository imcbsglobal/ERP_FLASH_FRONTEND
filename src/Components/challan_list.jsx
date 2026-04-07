import { useState, useEffect } from "react";
import { getChallans, deleteChallan } from "../service/challan";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import DisabledVisibleOutlinedIcon from "@mui/icons-material/DisabledVisibleOutlined";
import ChallanAdd from "./challan_add";

const STATUS_STYLES = {
  Paid:    {  color:"#16a34a",},
  Pending: {  color:"#b45309",  },
  Waived:  { color:"#7c3aed", },
};

// ── FIX: sort keys now match snake_case API field names ───────────────────────
const COLUMNS = [
  { key:"id",              label:"Sl.No",           w:50,  align:"right" },
  { key:"vehicle_display", label:"Vehicle",          w:200 },
  { key:"date",            label:"Default Date",     w:110 },
  { key:"challan_no",      label:"Challan No",       w:140 },
  { key:"challan_date",    label:"Challan Date",     w:110 },
  { key:"offence_type",    label:"Offence Type",     w:180 },
  { key:"location",        label:"Location",         w:220 },
  { key:"fine_amount",     label:"Fine Amt (₹)",     w:110, align:"right" },
  { key:"payment_status",  label:"Payment Status",   w:130 },
  { key:"challan_doc",     label:"Challan Doc",      w:130 },
  { key:"payment_receipt", label:"Payment Receipt",  w:140 },
  { key:"remark",          label:"Remark",           w:180 },
  { key:"actions",         label:"Actions",          w:160 },
];

export default function ChallanList({ onAdd, onEdit }) {
  const [data, setData]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortKey, setSortKey]         = useState(null);
  const [sortDir, setSortDir]         = useState("asc");
  const [delId, setDelId]             = useState(null);
  const [editRow, setEditRow]         = useState(null);

  const fetchChallans = async () => {
    try {
      setLoading(true);
      const response = await getChallans();
      // DRF paginated response has .results; plain list endpoint returns array
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

  /* ── sort ── */
  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        let av = a[sortKey], bv = b[sortKey];
        if (!isNaN(parseFloat(av)) && !isNaN(parseFloat(bv))) {
          return sortDir === "asc"
            ? parseFloat(av) - parseFloat(bv)
            : parseFloat(bv) - parseFloat(av);
        }
        return sortDir === "asc"
          ? String(av ?? "").localeCompare(String(bv ?? ""))
          : String(bv ?? "").localeCompare(String(av ?? ""));
      })
    : filtered;

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

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

  const totalFine = filtered.reduce((s, r) => s + parseFloat(r.fine_amount || 0), 0);
  const paidCount = filtered.filter(r => r.payment_status === "Paid").length;
  const pendCount = filtered.filter(r => r.payment_status === "Pending").length;

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <span style={s.sortNone}>⇅</span>;
    return <span style={s.sortActive}>{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  if (loading) {
    return (
      <div style={s.root}>
        <div style={s.container}>
          <div style={{ textAlign:"center", padding:"50px", color:"#94a3b8" }}>
            Loading challans…
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.cdnfonts.com/css/nohemi');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        html, body, input, select, textarea, button {
          font-family:'Nohemi', sans-serif !important;
        }
        body { background:#f0f4f8; }

        .cl-table { width:100%; border-collapse:collapse; font-family:'Nohemi',sans-serif; }

        .cl-th {
          background:#ffff;
          color:black;
          font-family:'Nohemi',sans-serif;
          font-weight:600;
          font-size:14px;
          letter-spacing:.05em;
          text-transform:capitalize;
          padding:12px 14px;
          text-align:left;
          white-space:nowrap;
          position:sticky; top:0; z-index:2;
          border-right:1px solid rgba(255,255,255,.12);
          user-select:none;
        }
        .cl-th:last-child { border-right:none; }
        .cl-th.sortable { cursor:pointer; }
        .cl-th.sortable:hover { background:#ffff; color:black; }

        .cl-td {
          padding:10px 14px;
          font-size:12px;
          color:#334155;
          border-bottom:1px solid #f1f5f9;
          border-right:1px solid #f1f5f9;
          vertical-align:middle;
          white-space:nowrap;
          font-family:'Nohemi',sans-serif;
        }
        .cl-td:last-child { border-right:none; }
        .cl-td.wrap { white-space:normal; min-width:160px; }

        .cl-tr:hover td { background:#f0f7ff; }
        .cl-tr:nth-child(even) td { background:#fafbfc; }
        .cl-tr:nth-child(even):hover td { background:#f0f7ff; }

        .ci-search {
          background:#fff;
          border:1px solid #d1d9e0;
          border-radius:8px;
          color:#1e293b;
          font-family:'Nohemi',sans-serif;
          font-size:12px;
          padding:9px 14px 9px 36px;
          outline:none;
          transition:border-color .2s, box-shadow .2s;
          width:100%;
          height:38px;
        }
        .ci-search:focus { border-color:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,.13); }

        .pill {
          display:inline-flex; align-items:center;
          padding:3px 10px; border-radius:50px;
          font-size:14px; font-weight:600; font-family:'Nohemi',sans-serif;
          letter-spacing:.03em;
        }

        .file-link {
          display:inline-flex; align-items:center; gap:5px;
          color:#2563eb; font-size:.8rem; text-decoration:none;
          padding:3px 8px; border-radius:5px; background:#eff6ff;
          border:1px solid #bfdbfe; cursor:pointer; transition:all .15s;
          font-family:'Nohemi',sans-serif;
        }
        .file-link:hover { background:#dbeafe; }

        .act-btn {
          border:none; border-radius:6px; cursor:pointer;
          font-family:'Nohemi',sans-serif; font-size:12px; font-weight:600;
          padding:5px 12px; transition:opacity .15s, transform .1s;
          display:flex; align-items:center; gap:4px; flex:1;
          color:#fff; letter-spacing:.01em;
        }
        .act-btn:hover { opacity:.87; transform:translateY(-1px); }
        .act-btn:active { transform:translateY(0); }
        .act-btn:disabled { opacity:.5; cursor:not-allowed; transform:none; }
        .act-edit { background:#1a73e8; }
        .act-del  { background:#d93025; }

        .status-select {
          appearance:none; -webkit-appearance:none;
          background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24'%3E%3Cpath fill='%232563eb' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E") no-repeat right 11px center;
          border:1px solid #d1d9e0; border-radius:8px;
          color:#1e293b; font-family:'Nohemi',sans-serif !important;
          font-size:14px; font-weight:500;
          padding:9px 36px 9px 13px;
          outline:none; cursor:pointer;
          transition:border-color .2s, box-shadow .2s;
          height:38px;
        }
        .status-select:focus { border-color:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,.13); }
        .status-select:hover { border-color:#94a3b8; }

        .modal-overlay {
          position:fixed; inset:0; background:rgba(15,23,42,.45);
          display:flex; align-items:center; justify-content:center; z-index:100;
        }
        .modal-box {
          background:#fff; border-radius:14px; padding:28px 32px;
          box-shadow:0 20px 60px rgba(0,0,0,.18); max-width:360px; width:100%;
          font-family:'Nohemi',sans-serif;
        }
      `}</style>

      <div style={s.root}>
        <div style={s.container}>
          {/* ── Header ── */}
          <div style={s.header}>
            <div style={{flex:1}}>
              <div style={s.title}>Challan List</div>
            </div>
            <button style={s.addBtn} onClick={onAdd}>+ Add Challan</button>
          </div>

          {/* ── Summary Cards ── */}
          
          {/* ── Toolbar ── */}
          <div style={s.toolbar}>
            <div style={{position:"relative", flex:1}}>
              
              <input
                className="ci-search"
                placeholder="Search vehicle, challan, offence…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div style={{display:"flex", alignItems:"center", gap:8, flexShrink:0}}>
              <span style={{fontSize:".82rem", color:"#64748b", fontWeight:500}}>Status:</span>
              <select
                className="status-select"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="All">All</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Waived">Waived</option>
              </select>
            </div>
          </div>

          {/* ── Table ── */}
          <div style={s.tableWrap}>
            <table className="cl-table">
              <thead>
                <tr>
                  {COLUMNS.map(col => (
                    <th key={col.key}
                      className="cl-th"
                      style={{ minWidth:col.w, width:col.w, textAlign:col.align||"left" }}
                    >
                      <span style={{display:"flex", alignItems:"center", gap:5, justifyContent:col.align==="right"?"flex-end":"flex-start"}}>
                        {col.label}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMNS.length} style={s.emptyTd}>
                      No records found.
                    </td>
                  </tr>
                ) : sorted.map((row, index) => (
                  <tr key={row.id} className="cl-tr">
                    <td className="cl-td" style={{color:"#94a3b8", fontWeight:600, textAlign:"right"}}>{index + 1}</td>
                    {/* ── FIX: use vehicle_display (serializer field) ── */}
                    <td className="cl-td" style={{fontWeight:500, color:"#1e293b", textAlign:"left"}}>
                      {row.vehicle_display || `Vehicle #${row.vehicle}`}
                    </td>
                    <td className="cl-td" style={{textAlign:"left"}}>{row.date}</td>
                    <td className="cl-td" style={{color:"#2563eb", fontWeight:600, textAlign:"left"}}>{row.challan_no}</td>
                    <td className="cl-td" style={{textAlign:"left"}}>{row.challan_date}</td>
                    <td className="cl-td" style={{textAlign:"left"}}>{row.offence_type}</td>
                    <td className="cl-td wrap" style={{maxWidth:220, overflow:"hidden", textOverflow:"ellipsis", textAlign:"left"}}>{row.location}</td>
                    <td className="cl-td" style={{fontWeight:600, color:"#0f172a", textAlign:"right"}}>₹{parseFloat(row.fine_amount || 0).toLocaleString()}</td>
                    <td className="cl-td">
                      <span className="pill" style={STATUS_STYLES[row.payment_status]}>
                        {row.payment_status}
                      </span>
                    </td>
                    <td className="cl-td">
                      {row.challan_doc_url
                        ? <a className="file-link" href={row.challan_doc_url} target="_blank" rel="noreferrer"><DisabledVisibleOutlinedIcon style={{ fontSize: 18 }} /></a>
                        : <span style={{color:"#cbd5e1", fontSize:".78rem"}}>—</span>}
                    </td>
                    <td className="cl-td">
                      {row.payment_receipt_url
                        ? <a className="file-link" href={row.payment_receipt_url} target="_blank" rel="noreferrer"><DisabledVisibleOutlinedIcon style={{ fontSize: 18 }} /></a>
                        : <span style={{color:"#cbd5e1", fontSize:".78rem"}}>—</span>}
                    </td>
                    <td className="cl-td wrap" style={{maxWidth:180, color:"#64748b", textAlign:"left"}}>
                      {row.remark || <span style={{color:"#cbd5e1"}}>—</span>}
                    </td>
                    <td className="cl-td">
                      <div style={{display:"flex", gap:6}}>
                        {/* ── FIX: pass full row as initialData to edit form ── */}
                        <button className="act-btn act-edit" onClick={() => setEditRow(row)}>
                          <EditOutlinedIcon style={{ fontSize: 13 }} /> Edit
                        </button>
                        <button className="act-btn act-del" onClick={() => confirmDelete(row.id)}>
                          <DeleteOutlineOutlinedIcon style={{ fontSize: 13 }} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Footer count ── */}
          <div style={s.footer}>
            Showing <strong>{sorted.length}</strong> of <strong>{data.length}</strong> records
          </div>
        </div>
      </div>

      {/* ── Edit Modal ── */}
      {editRow && (
        <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,.45)",zIndex:200,overflowY:"auto",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"32px 16px"}}>
          <div style={{width:"100%",maxWidth:900,position:"relative"}}>
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
            <div style={{fontSize:"2rem", marginBottom:12}}>🗑️</div>
            <div style={{fontWeight:700, fontSize:"1.05rem", color:"#0f172a", marginBottom:8}}>
              Delete Challan?
            </div>
            <div style={{fontSize:".85rem", color:"#64748b", marginBottom:24}}>
              Are you sure you want to delete challan record <strong style={{color:"#2563eb"}}>
              {data.find(r=>r.id===delId)?.challan_no}</strong>? This action cannot be undone.
            </div>
            <div style={{display:"flex", justifyContent:"flex-end", gap:10}}>
              <button
                style={{padding:"9px 20px", borderRadius:8, border:"1px solid #d1d9e0", background:"#fff", color:"#64748b", fontFamily:"'Nohemi',sans-serif", fontSize:".86rem", cursor:"pointer"}}
                onClick={() => setDelId(null)}>Cancel</button>
              <button
                style={{padding:"9px 20px", borderRadius:8, border:"none", background:"#ef4444", color:"#fff", fontFamily:"'Nohemi',sans-serif", fontWeight:700, fontSize:".86rem", cursor:"pointer"}}
                onClick={doDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const s = {
  root: {
    minHeight:"100vh",
    background:"#f0f4f8",
    fontFamily:"'Nohemi',sans-serif",
    color:"#1e293b",
    padding:"32px 28px 60px",
    width:"100%",
    boxSizing:"border-box",
  },
  container: { width:"100%" },
  header: { display:"flex", alignItems:"flex-end", gap:16, marginBottom:22 },
  title: { fontFamily:"'Nohemi',sans-serif", fontWeight:800, fontSize:"25px", lineHeight:1, color:"#0f172a" },
  addBtn: {
    padding:"10px 22px",
    background:"linear-gradient(135deg,#2563eb,#1d4ed8)",
    border:"none", borderRadius:9, color:"#fff",
    fontFamily:"'Nohemi',sans-serif", fontWeight:700, fontSize:".875rem",
    cursor:"pointer", boxShadow:"0 4px 14px rgba(37,99,235,.28)",
    transition:"opacity .2s", alignSelf:"center",
  },
  summaryRow: { display:"flex", gap:14, marginBottom:20, flexWrap:"wrap" },
  summaryCard: {
    display:"flex", alignItems:"center", gap:14,
    padding:"14px 20px", borderRadius:12,
    border:"1px solid #e2e8f0", flex:"1 1 160px",
    boxShadow:"0 1px 4px rgba(0,0,0,.05)",
  },
  toolbar: {
    display:"flex", alignItems:"center", gap:12,
    marginBottom:16, width:"100%",
  },
  searchIcon: {
    position:"absolute", left:11, top:"50%",
    transform:"translateY(-50%)", fontSize:"0.85rem", pointerEvents:"none",
  },
  tableWrap: {
    background:"#fff",
    border:"1px solid #e2e8f0",
    borderRadius:14,
    boxShadow:"0 2px 12px rgba(0,0,0,.06)",
    overflowX:"auto",
  },
  emptyTd: {
    padding:"48px 20px", textAlign:"center",
    color:"#94a3b8", fontSize:".9rem", fontFamily:"'Nohemi',sans-serif",
  },
  footer: {
    marginTop:14, fontSize:".8rem", color:"#94a3b8",
    textAlign:"right", fontFamily:"'Nohemi',sans-serif",
  },
  sortNone: { color:"rgba(0,0,0,.25)", fontSize:".7rem" },
  sortActive: { color:"#2563eb", fontSize:".75rem" },
};