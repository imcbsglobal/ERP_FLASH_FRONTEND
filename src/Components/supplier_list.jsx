import { useState, useMemo, useEffect, useCallback } from "react";
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import ToggleOffIcon from '@mui/icons-material/ToggleOff';
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  toggleSupplierStatus,
} from "../service/Api";

const PER_PAGE = 5;

const AVATAR_COLORS = [
  { bg: "#EEEDFE", fg: "#534AB7" },
  { bg: "#E1F5EE", fg: "#0F6E56" },
  { bg: "#FAECE7", fg: "#993C1D" },
  { bg: "#E6F1FB", fg: "#185FA5" },
  { bg: "#FAEEDA", fg: "#854F0B" },
  { bg: "#EAF3DE", fg: "#3B6D11" },
  { bg: "#FBEAF0", fg: "#993556" },
];

function getAvatarColor(name) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

function getInitials(name) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

const STATUS_STYLES = {
  Active:   { badge: "badge badge-active",   dot: "#3B6D11" },
  Inactive: { badge: "badge badge-inactive", dot: "#5F5E5A" },
  Pending:  { badge: "badge badge-pending",  dot: "#854F0B" },
};

const EMPTY_FORM = { name: "" };

// ── Modal: Edit / Add ──────────────────────────────────────────────────────────
function SupplierModal({ open, title, form, onChange, onSave, onClose }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="form-row">
          <label className="form-label">Supplier name</label>
          <input className="form-input" value={form.name} onChange={(e) => onChange("name", e.target.value)} placeholder="e.g. Acme Corp" />
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={onSave}>Save changes</button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Delete confirm ──────────────────────────────────────────────────────
function DeleteModal({ open, supplierName, onConfirm, onClose }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="confirm-modal">
        <div className="confirm-icon">🗑</div>
        <div className="confirm-title">Delete supplier?</div>
        <div className="confirm-text">"{supplierName}" will be permanently removed.</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-delete-confirm" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Toggle confirm ──────────────────────────────────────────────────────
function ToggleModal({ open, supplier, onConfirm, onClose }) {
  if (!open || !supplier) return null;
  const isActive = supplier.status === "Active";
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="confirm-modal">
        <div className="confirm-icon" style={{ background: isActive ? "#FEF3CD" : "#E6F4EA", fontSize: 22 }}>
          {isActive ? "⚠️" : "✅"}
        </div>
        <div className="confirm-title">
          {isActive ? "Confirm Disable" : "Confirm Enable"}
        </div>
        <div className="confirm-text">
          Are you sure you want to {isActive ? "disable" : "enable"} <strong>{supplier.name}</strong>?
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button
            className="btn-toggle-confirm"
            style={{ background: isActive ? "#D97706" : "#1a73e8" }}
            onClick={onConfirm}
          >
            confirm
          </button>
        </div>
      </div>
    </div>
  );
}
function Toast({ message, visible }) {
  return (
    <div className={`toast ${visible ? "show" : ""}`}>
      ✓ <span>{message}</span>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function SupplierList() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // Delete modal
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Toggle modal
  const [toggleOpen, setToggleOpen] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  // Toast
  const [toast, setToast] = useState({ visible: false, message: "" });

  // ── Fetch from backend ────────────────────────────────────────────────────────
  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSuppliers();
      setSuppliers(data);
    } catch (err) {
      setError(err.message || "Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const showToast = (message) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2500);
  };

  const handleFormChange = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  // ── Filtering & pagination ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return suppliers.filter((s) =>
      (!q || s.name.toLowerCase().includes(q) || s.supplier_id.toLowerCase().includes(q))
    );
  }, [suppliers, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageData = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const goPage = (p) => setCurrentPage(p);

  // ── CRUD actions ──────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setEditOpen(true);
  };

  const openEdit = (id) => {
    const s = suppliers.find((x) => x.id === id);
    if (!s) return;
    setEditingId(id);   // pk (number) used for PATCH
    setForm({ name: s.name });
    setEditOpen(true);
  };

  const saveSupplier = async () => {
    if (!form.name.trim()) return;
    try {
      if (editingId) {
        await updateSupplier(editingId, { name: form.name });
        showToast("Supplier updated successfully");
      } else {
        await createSupplier({ name: form.name });
        showToast("Supplier added successfully");
      }
      setEditOpen(false);
      fetchSuppliers();
    } catch (err) {
      showToast(err.message || "Failed to save supplier");
    }
  };

  const openDelete = (id) => {
    setDeletingId(id);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    const s = suppliers.find((x) => x.id === deletingId);
    try {
      await deleteSupplier(deletingId);
      setDeleteOpen(false);
      setDeletingId(null);
      showToast(`"${s?.name}" deleted`);
      fetchSuppliers();
    } catch (err) {
      showToast(err.message || "Failed to delete supplier");
    }
  };

  const openToggle = (id) => {
    setTogglingId(id);
    setToggleOpen(true);
  };

  const confirmToggle = async () => {
    const s = suppliers.find((x) => x.id === togglingId);
    try {
      await toggleSupplierStatus(togglingId);
      setToggleOpen(false);
      setTogglingId(null);
      const newStatus = s?.status === "Active" ? "Inactive" : "Active";
      showToast(`"${s?.name}" ${newStatus === "Active" ? "enabled" : "disabled"} successfully`);
      fetchSuppliers();
    } catch (err) {
      showToast(err.message || "Failed to toggle status");
    }
  };

  const togglingSupplier = suppliers.find((x) => x.id === togglingId);

  const deletingSupplier = suppliers.find((x) => x.id === deletingId);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;font-family:'Google Sans', sans-serif !important}
        body{font-family:'Google Sans', sans-serif !important;background:#f8f8f7;color:#1a1a18}
        .page{padding:1.5rem;max-width:1100px;margin:0 auto;font-family:'Google Sans', sans-serif !important}
        .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem}
        .title{font-size:20px;font-weight:500;font-family:'Google Sans', sans-serif !important}
        .subtitle{font-size:13px;color:#888780;margin-top:2px;font-family:'Google Sans', sans-serif !important}
        .btn-add{display:flex;align-items:center;gap:6px;background:#1a73e8;color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:13px;font-weight:500;cursor:pointer;font-family:'Google Sans', sans-serif !important}
        .btn-add:hover{opacity:.85}
        .toolbar{display:flex;gap:10px;margin-bottom:1rem;align-items:center;justify-content:space-between;font-family:'Google Sans', sans-serif !important}
        .search-wrap{position:relative;flex:1;max-width:320px;font-family:'Google Sans', sans-serif !important}
        .search-icon{position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:13px;color:#888780;pointer-events:none;font-family:'Google Sans', sans-serif !important}
        .search-wrap input{padding:7px 10px;width:100%;border:.5px solid rgba(0,0,0,.2);border-radius:8px;font-size:13px;outline:none;background:#fff;font-family:'Google Sans', sans-serif !important}
        select.filter-select{padding:7px 10px;border:.5px solid rgba(0,0,0,.2);border-radius:8px;font-size:13px;background:#fff;cursor:pointer;outline:none;font-family:'Google Sans', sans-serif !important}
        .table-wrap{background:#fff;border:.5px solid rgba(0,0,0,.1);border-radius:12px;overflow:hidden;font-family:'Google Sans', sans-serif !important}
        table{width:100%;border-collapse:collapse;table-layout:fixed;font-family:'Google Sans', sans-serif !important}
        thead th{font-size:12px;font-weight:600;letter-spacing:1.2px;text-transform:capitalize;color:#fff;text-align:left;padding:10px 20px;background:rgb(27,133,240);border-bottom:1px solid rgba(255, 255, 255, 0.1);font-family:'Google Sans', sans-serif !important}
        td{padding:12px 14px;font-size:11px;border-bottom:.5px solid rgba(0,0,0,.07);vertical-align:middle;font-family:'Google Sans', sans-serif !important}
        tr:last-child td{border-bottom:none}
        tr:hover td{background:#f8f8f7}
        .col-name{width:50%}
        .col-status{width:25%;text-align:left}
        .col-action{width:25%;text-align:center}
        thead th.col-status{text-align:left;padding:10px 20px}
        thead th.col-action{text-align:center}
        td.col-name{padding:12px 20px}
        td.col-status{padding:12px 20px;text-align:left;vertical-align:middle}
        td.col-action{text-align:center;vertical-align:middle}
        .name-cell{display:flex;align-items:center;gap:8px;font-family:'Google Sans', sans-serif !important}
        .avatar{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:500;flex-shrink:0;font-family:'Google Sans', sans-serif !important}
        .supplier-name{font-weight:500;font-size:13px;font-family:'Google Sans', sans-serif !important}
        .supplier-id{font-size:11px;color:#888780;font-family:'Google Sans', sans-serif !important}
        .badge{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:20px;font-size:11px;font-weight:500;font-family:'Google Sans', sans-serif !important}
        .badge-active{background:#EAF3DE;color:#3B6D11;font-family:'Google Sans', sans-serif !important}
        .badge-inactive{background:#F1EFE8;color:#5F5E5A;font-family:'Google Sans', sans-serif !important}
        .badge-pending{background:#FAEEDA;color:#854F0B;font-family:'Google Sans', sans-serif !important}
        .badge-dot{width:5px;height:5px;border-radius:50%}
        .cat-badge{padding:2px 8px;border-radius:8px;font-size:11px;background:#f1efe8;color:#5f5e5a;border:.5px solid rgba(0,0,0,.1);font-family:'Google Sans', sans-serif !important}
        .muted{color:#888780;font-family:'Google Sans', sans-serif !important}
        .actions{display:flex;gap:4px;justify-content:center}
        .action-btn{width:28px;height:28px;border-radius:8px;border:.5px solid rgba(0,0,0,.15);background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;transition:all .15s;font-family:'Google Sans', sans-serif !important}
        .action-btn.edit:hover{background:#E6F1FB;border-color:#85B7EB;color:#185FA5}
        .action-btn.delete:hover{background:#FCEBEB;border-color:#F09595;color:#A32D2D}
        .footer{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#f8f8f7;border-top:.5px solid rgba(0,0,0,.1);font-size:12px;color:#888780;font-family:'Google Sans', sans-serif !important}
        .pagination{display:flex;gap:4px}
        .page-btn{width:26px;height:26px;border-radius:8px;border:.5px solid rgba(0,0,0,.15);background:transparent;cursor:pointer;font-size:12px;font-family:'Google Sans', sans-serif !important}
        .page-btn.active{background:#1a1a18;color:#fff;border-color:#1a1a18}
        .empty{text-align:center;padding:2.5rem;color:#888780;font-size:13px;font-family:'Google Sans', sans-serif !important}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:100;display:flex;align-items:center;justify-content:center}
        .modal{background:#fff;border-radius:12px;border:.5px solid rgba(0,0,0,.15);padding:1.25rem 1.5rem;width:400px;max-width:95vw;font-family:'Google Sans', sans-serif !important}
        .modal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem}
        .modal-title{font-size:15px;font-weight:500;font-family:'Google Sans', sans-serif !important}
        .modal-close{background:none;border:none;cursor:pointer;font-size:16px;color:#888780;padding:2px;font-family:'Google Sans', sans-serif !important}
        .form-row{margin-bottom:12px}
        .form-label{font-size:12px;color:#888780;margin-bottom:4px;display:block;font-family:'Google Sans', sans-serif !important}
        .form-input,.form-select{width:100%;padding:7px 10px;border:.5px solid rgba(0,0,0,.2);border-radius:8px;font-size:13px;background:#fff;outline:none;font-family:'Google Sans', sans-serif !important}
        .form-row-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .modal-footer{display:flex;justify-content:flex-end;gap:8px;margin-top:1.25rem}
        .btn-cancel{padding:7px 14px;border:.5px solid rgba(0,0,0,.2);border-radius:8px;background:transparent;font-size:13px;cursor:pointer;font-family:'Google Sans', sans-serif !important}
        .btn-save{padding:7px 14px;border:none;border-radius:8px;background:#1a1a18;color:#fff;font-size:13px;font-weight:500;cursor:pointer;font-family:'Google Sans', sans-serif !important}
        .confirm-modal{background:#fff;border-radius:12px;border:.5px solid rgba(0,0,0,.15);padding:1.5rem;width:340px;max-width:95vw;text-align:center;font-family:'Google Sans', sans-serif !important}
        .confirm-icon{width:44px;height:44px;border-radius:50%;background:#FCEBEB;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:20px}
        .confirm-title{font-size:15px;font-weight:500;margin-bottom:6px;font-family:'Google Sans', sans-serif !important}
        .confirm-text{font-size:13px;color:#888780;margin-bottom:1.25rem;font-family:'Google Sans', sans-serif !important}
        .btn-delete-confirm{padding:7px 14px;border:none;border-radius:8px;background:#A32D2D;color:#fff;font-size:13px;font-weight:500;cursor:pointer;font-family:'Google Sans', sans-serif !important}
        .btn-toggle-confirm{padding:7px 14px;border:none;border-radius:8px;color:#fff;font-size:13px;font-weight:500;cursor:pointer;font-family:'Google Sans', sans-serif !important}
        .toast{position:fixed;bottom:20px;right:20px;background:#1a1a18;color:#fff;padding:10px 16px;border-radius:8px;font-size:13px;z-index:200;display:flex;align-items:center;gap:8px;opacity:0;transform:translateY(6px);transition:all .2s;pointer-events:none;font-family:'Google Sans', sans-serif !important}
        .toast.show{opacity:1;transform:translateY(0)}
      `}</style>

      <div className="page">
        {/* Header */}
        <div className="header">
          <div className="title">Suppliers</div>
        </div>

        {/* Toolbar: search + add button on same line */}
        <div className="toolbar">
          <div className="search-wrap">
            <input
              type="text"
              placeholder="Search suppliers..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <button className="btn-add" onClick={openAdd}>+ Add supplier</button>
        </div>

        {/* Table */}
        <div className="table-wrap">
          {loading ? (
            <div className="empty">Loading suppliers…</div>
          ) : error ? (
            <div className="empty" style={{ color: "#A32D2D" }}>{error}</div>
          ) : (
          <>
          <table>
            <thead>
              <tr>
                <th className="col-name">Supplier name</th>
                <th className="col-status">Status</th>
                <th className="col-action">Action</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr><td colSpan={3}><div className="empty">No suppliers found</div></td></tr>
              ) : pageData.map((s) => {
                const av = getAvatarColor(s.name);
                const st = STATUS_STYLES[s.status] || STATUS_STYLES.Inactive;
                return (
                  <tr key={s.id}>
                    <td className="col-name">
                      <div className="name-cell">
                        <div className="avatar" style={{ background: av.bg, color: av.fg }}>{getInitials(s.name)}</div>
                        <div>
                          <div className="supplier-name">{s.name}</div>
                          <div className="supplier-id">{s.supplier_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="col-status">
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        
                        <button
                          onClick={() => openToggle(s.id)}
                          title={s.status === "Active" ? "Disable supplier" : "Enable supplier"}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
                        >
                          {s.status === "Active"
                            ? <ToggleOnIcon style={{ fontSize: 28, color: "#1a73e8" }} />
                            : <ToggleOffIcon style={{ fontSize: 28, color: "#aaa" }} />
                          }
                        </button>
                      </div>
                    </td>
                    <td>
                      <div className="actions">
                        <button className="action-btn edit" onClick={() => openEdit(s.id)} style={{ flex: 1, padding: '6px 0', borderRadius: 7, border: 'none', background: '#1a73e8', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: "'Google Sans', sans-serif" }} title="Edit" aria-label={`Edit ${s.name}`}><EditOutlinedIcon style={{ fontSize: 13 }} /> </button>
                        <button className="action-btn delete" onClick={() => openDelete(s.id)} style={{ flex: 1, padding: '6px 0', borderRadius: 7, border: 'none', background: '#d93025', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: "'Google Sans', sans-serif" }} title="Delete" aria-label={`Delete ${s.name}`}><DeleteOutlineOutlinedIcon style={{ fontSize: 13 }} /> </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="footer">
            <span>Showing {pageData.length} of {filtered.length} supplier{filtered.length !== 1 ? "s" : ""}</span>
            <div className="pagination">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} className={`page-btn${safePage === p ? " active" : ""}`} onClick={() => goPage(p)}>{p}</button>
              ))}
            </div>
          </div>
          </>
          )}
        </div>
      </div>

      {/* Edit / Add Modal */}
      <SupplierModal
        open={editOpen}
        title={editingId ? "Edit supplier" : "Add supplier"}
        form={form}
        onChange={handleFormChange}
        onSave={saveSupplier}
        onClose={() => setEditOpen(false)}
      />

      {/* Delete Confirm Modal */}
      <DeleteModal
        open={deleteOpen}
        supplierName={deletingSupplier?.name ?? ""}
        onConfirm={confirmDelete}
        onClose={() => setDeleteOpen(false)}
      />

      {/* Toggle Confirm Modal */}
      <ToggleModal
        open={toggleOpen}
        supplier={togglingSupplier}
        onConfirm={confirmToggle}
        onClose={() => setToggleOpen(false)}
      />

      {/* Toast */}
      <Toast message={toast.message} visible={toast.visible} />
    </>
  );
}