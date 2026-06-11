import { useState, useEffect, useCallback } from "react";
import MoveDownIcon from '@mui/icons-material/MoveDown';
import MoveUpIcon from '@mui/icons-material/MoveUp';
import LockResetIcon from '@mui/icons-material/LockReset';
import StandbyAdd from "./standby_add.jsx";
import { apiFetch, authHeaders, ENDPOINTS, getUsers, authService } from "../service/Api";

/** Normalize an API Standby record to the shape this component expects. */
function normalize(r) {
  return {
    id:                    r.id,
    branch_id:             r.branch_id ?? null,
    date:                  r.received_date,
    customerName:          r.customer_name,
    employeeName:          [r.employee1, r.employee2].filter(Boolean).join(", "),
    employee1:             r.employee1 || "",
    employee2:             r.employee2 || "",
    standbyProduct:        r.product + (r.model ? ` ${r.model}` : ""),
    issueDate:             r.issue_date  || "",
    returnDate:            r.return_date || "",
    stage_issue:           r.stage_issue,
    stage_returnFromCustomer: r.stage_return_from_customer,
    stage_returnToOffice:  r.stage_return_to_office,
    status:                r.status,
    // keep full record for edit modal
    _raw: r,
  };
}

// Status → pill CSS class + badge colours
const STATUS_META = {
  Assigned:  { pill: "pill-muted",  bg: "#f1f3f4", color: "#5f6368", dot: "#5f6368" },
  Issued:    { pill: "pill-amber",  bg: "#fff7e0", color: "#7a5700", dot: "#f7aa04" },
  Collected: { pill: "pill-red",    bg: "#fdecea", color: "#7a1c0d", dot: "#d35741" },
  Returned:  { pill: "pill-green",  bg: "#e6f4ea", color: "#137333", dot: "#188038" },
};

const ALL_STATUSES = ["Assigned", "Issued", "Collected", "Returned"];

const STAGE_CONFIG = [
  {
    field: "stage_issue",
    label: "Issue",
    activeColor: "#1a73e8",
    Icon: MoveDownIcon,
  },
  {
    field: "stage_returnFromCustomer",
    label: "Return from Customer",
    activeColor: "#ea580c",
    Icon: MoveUpIcon,
  },
  {
    field: "stage_returnToOffice",
    label: "Return to Office",
    activeColor: "#188038",
    Icon: LockResetIcon,
  },
];



// ── View Modal ───────────────────────────────────────────────
function ViewModal({ row, onClose, onEdit }) {
  if (!row) return null;
  const raw = row._raw || {};
  const images = Array.isArray(raw.images) ? raw.images.map((img) => ({
    id: img.id,
    url: img.image_url,
    name: img.name,
  })) : [];

  const meta = STATUS_META[row.status] || { bg: "#f1f5f9", color: "#64748b", dot: "#94a3b8" };

  return (
    <div style={vmStyles.overlay} onClick={onClose}>
      <div style={vmStyles.dialog} onClick={(e) => e.stopPropagation()}>

        {/* Blue Header */}
        <div style={vmStyles.header}>
          <span style={vmStyles.headerTitle}>Standby Details — #{row.id}</span>
          <button style={vmStyles.headerClose} onClick={onClose}>✕</button>
        </div>

        {/* Scrollable Body */}
        <div style={vmStyles.body}>

          {/* ── Customer Info ── */}
          <VmSection title="Customer Info">
            <VmField label="Customer Name"  value={row.customerName} />
            <VmField label="Customer Place" value={raw.customer_place} />
            <VmField label="Customer Phone" value={raw.customer_phone} />
            <VmField label="Person Name"    value={raw.person_name} />
            <VmField label="Phone Number"   value={raw.phone_number} />
          </VmSection>

          {/* ── Product ── */}
          <VmSection title="Product">
            <VmField label="Product"   value={raw.product} />
            <VmField label="Model"     value={raw.model} />
            <VmField label="Serial No" value={raw.serial_no} mono />
          </VmSection>

          {/* ── Assignment ── */}
          <VmSection title="Assignment">
            <VmField label="Received Date" value={row.date} />
            <VmField label="Employee 1"    value={raw.employee1} />
            <VmField label="Employee 2"    value={raw.employee2} />
            <VmField label="Issue Date"    value={row.issueDate} />
            <VmField label="Return Date"   value={row.returnDate} />
          </VmSection>

          {/* ── Stage Progress ── */}
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
              color: "#1b85f0", borderBottom: "1.5px solid #e2e8f0", paddingBottom: 4, marginBottom: 10,
              textAlign: "left",
            }}>Stage Progress</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px 12px" }}>
              <VmField label="Issue"                value={row.stage_issue              ? "Done" : "Pending"} badge={row.stage_issue              ? "green" : "grey"} />
              <VmField label="Return from Customer" value={row.stage_returnFromCustomer ? "Done" : "Pending"} badge={row.stage_returnFromCustomer ? "green" : "grey"} />
              <VmField label="Return to Office"     value={row.stage_returnToOffice     ? "Done" : "Pending"} badge={row.stage_returnToOffice     ? "green" : "grey"} />
            </div>
          </div>

          {/* ── Notes & Status ── */}
          <VmSection title="Notes & Status">
            <VmField label="Notes" value={raw.notes} />
            <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-start" }}>
              <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textAlign: "left" }}>Status</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, borderRadius: 20, padding: "3px 10px", background: meta.bg, color: meta.color, width: "fit-content" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: meta.dot, flexShrink: 0, display: "inline-block" }} />
                {row.status}
              </span>
            </div>
          </VmSection>

          {/* ── Images ── */}
          {images.length > 0 && <VmImages images={images} />}

        </div>

        {/* Footer */}
        <div style={vmStyles.footer}>
          <button style={vmStyles.closeBtn} onClick={onClose}>Close</button>
          {onEdit && (
            <button style={vmStyles.editBtn} onClick={() => { onClose(); onEdit(row); }}>Edit</button>
          )}
        </div>

      </div>
    </div>
  );
}

// ── Sectioned View Modal Helpers ──────────────────────────────
function VmSection({ title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
        color: "#1b85f0", borderBottom: "1.5px solid #e2e8f0", paddingBottom: 4, marginBottom: 10,
        textAlign: "left",
      }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
        {children}
      </div>
    </div>
  );
}

function VmField({ label, value, mono, badge }) {
  const display = value || "—";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-start" }}>
      <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textAlign: "left" }}>{label}</span>
      {badge ? (
        <span style={{
          fontSize: 12, fontWeight: 700, borderRadius: 6, padding: "2px 8px",
          display: "inline-block", width: "fit-content",
          background: badge === "green" ? "#dcfce7" : "#f1f5f9",
          color:      badge === "green" ? "#166534" : "#64748b",
        }}>{display}</span>
      ) : (
        <span style={{ fontSize: 13, color: "#111827", fontFamily: mono ? "monospace" : "inherit" }}>
          {display}
        </span>
      )}
    </div>
  );
}

function VmImages({ images }) {
  const [lightbox, setLightbox] = useState(null);
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
        color: "#1b85f0", borderBottom: "1.5px solid #e2e8f0", paddingBottom: 4, marginBottom: 10,
      }}>Images ({images.length})</div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {images.map((img, i) => (
          <div
            key={img.id || i}
            onClick={() => setLightbox(i)}
            title={img.name || `Image ${i + 1}`}
            style={{
              width: 80, height: 80, borderRadius: 8, overflow: "hidden",
              border: "2px solid #e2e8f0", cursor: "pointer", flexShrink: 0,
              background: "#f8fafc",
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = "#1b85f0"}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = "#e2e8f0"}
          >
            <img src={img.url} alt={img.name || `Image ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}
          onClick={() => setLightbox(null)}
        >
          <div style={{ position: "relative", maxWidth: "90vw", maxHeight: "85vh", display: "flex", alignItems: "center", gap: 16 }} onClick={(e) => e.stopPropagation()}>
            {images.length > 1 && (
              <button onClick={() => setLightbox((lightbox - 1 + images.length) % images.length)}
                style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 40, height: 40, color: "#fff", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>‹</button>
            )}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <img src={images[lightbox].url} alt={images[lightbox].name || `Image ${lightbox + 1}`}
                style={{ maxWidth: "72vw", maxHeight: "72vh", borderRadius: 10, objectFit: "contain", boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }} />
              {images[lightbox].name && <span style={{ color: "#e2e8f0", fontSize: 13 }}>{images[lightbox].name}</span>}
              <span style={{ color: "#94a3b8", fontSize: 12 }}>{lightbox + 1} / {images.length}</span>
            </div>
            {images.length > 1 && (
              <button onClick={() => setLightbox((lightbox + 1) % images.length)}
                style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 40, height: 40, color: "#fff", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>›</button>
            )}
            <button onClick={() => setLightbox(null)}
              style={{ position: "absolute", top: -16, right: -16, background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: 32, height: 32, color: "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── View Modal Styles ─────────────────────────────────────────
const vmStyles = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.38)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, animation: "fadeIn 0.2s ease both",
  },
  dialog: {
    background: "#fff", borderRadius: 14, width: "100%", maxWidth: 560,
    maxHeight: "90vh", display: "flex", flexDirection: "column",
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden",
    margin: "0 16px", animation: "fadeUp 0.25s ease both",
    fontFamily: "'Google Sans', sans-serif",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 22px", background: "#1b85f0",
    borderRadius: "14px 14px 0 0",
  },
  headerTitle: { fontSize: 25, fontWeight: 700, color: "#fff" },
  headerClose: { background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#fff", lineHeight: 1, padding: 2 },
  body: { overflowY: "auto", flex: 1, padding: "20px 22px" },
  footer: {
    display: "flex", justifyContent: "flex-end", gap: 10,
    padding: "12px 22px 16px 22px", borderTop: "1.5px solid #f1f5f9",
  },
  closeBtn: {
    padding: "8px 22px", borderRadius: 8, border: "1.5px solid #d1d5db",
    background: "#fff", color: "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  editBtn: {
    padding: "8px 24px", borderRadius: 8, border: "none",
    background: "#1a73e8", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
  },
};

// ── Delete Confirm Modal ─────────────────────────────────────
function DeleteModal({ row, onConfirm, onClose, deleting }) {
  if (!row) return null;
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={{ ...styles.modal, maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <span style={styles.modalTitle}>Confirm Delete</span>
          <button style={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div style={{ ...styles.modalBody, textAlign: "center", padding: "24px 28px" }}>
          <div style={styles.deleteIcon}>🗑</div>
          <p style={styles.deleteMsg}>
            Are you sure you want to delete the standby entry for{" "}
            <strong>{row.customerName}</strong>?
          </p>
          <p style={styles.deleteNote}>This action cannot be undone.</p>
        </div>
        <div style={{ ...styles.modalFooter, justifyContent: "center", gap: 10 }}>
          <button style={styles.closeBtn} onClick={onClose}>Cancel</button>
          <button style={{ ...styles.deleteConfirmBtn, opacity: deleting ? 0.6 : 1 }} onClick={() => onConfirm(row.id)} disabled={deleting}>{deleting ? "Deleting…" : "Delete"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Status Badge (modal only) ────────────────────────────────
function StatusBadge({ status }) {
  const m = STATUS_META[status] || { bg: "#f1f5f9", color: "#64748b", dot: "#94a3b8" };
  return (
    <span style={{ ...styles.badge, background: m.bg, color: m.color }}>
      <span style={{ ...styles.dot, background: m.dot }} />
      {status}
    </span>
  );
}

// ── Main Component ───────────────────────────────────────────
export default function StandbyList({ onAdd }) {
  const currentUser = authService.getCurrentUser();
  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "Super Admin" || currentUser?.is_staff === true;
  const isSuperAdmin = currentUser?.role === "Super Admin";

  const [view, setView]                     = useState("list");
  const [editRow, setEditRow]               = useState(null);   // raw API object for edit
  const [data, setData]                     = useState([]);
  const [loading, setLoading]               = useState(true);
  const [fetchError, setFetchError]         = useState("");
  const [search, setSearch]                 = useState("");
  const [customerFilter, setCustomerFilter] = useState("All");
  const [statusFilter, setStatusFilter]     = useState("All");
  const [filterBranch, setFilterBranch]     = useState("all");
  const [branchList, setBranchList]         = useState([]);   // [{id, name}]
  const [userBranchName, setUserBranchName] = useState("");
  const [dateFrom, setDateFrom]             = useState("");
  const [dateTo, setDateTo]                 = useState("");
  const [viewRow, setViewRow]               = useState(null);
  const [deleteRow, setDeleteRow]           = useState(null);
  const [deleting, setDeleting]             = useState(false);
  const [currentPage, setCurrentPage]       = useState(1);
  const rowsPerPage = 15;

  // ── Fetch list from backend ──────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      const records = await apiFetch(ENDPOINTS.standbys, {
        headers: authHeaders(),
      });
      let rows = Array.isArray(records) ? records : (records.results ?? records);
      // Non-admin users see only entries where they are employee1 or employee2
      if (!isAdmin && currentUser?.username) {
        const me = currentUser.username.toLowerCase();
        rows = rows.filter((r) =>
          (r.employee1 || "").toLowerCase() === me ||
          (r.employee2 || "").toLowerCase() === me
        );
      }
      setData(rows.map(normalize));
    } catch (err) {
      setFetchError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, currentUser?.username]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Branch init ──────────────────────────────────────────────
  useEffect(() => {
    const initBranches = async () => {
      // 1. Fetch departments from FlashERP for dropdown names
      let deptNames = [];
      try {
        const deptData = await apiFetch(ENDPOINTS.departments, { headers: authHeaders() });
        const raw = Array.isArray(deptData) ? deptData : (deptData?.data ?? deptData?.results ?? []);
        deptNames = raw.map(d => d.department).filter(Boolean);
      } catch { /* ignore */ }

      // 2. Fetch local branches to get id↔name mapping
      let localBranches = [];
      try {
        const branchData = await apiFetch(ENDPOINTS.branches, { headers: authHeaders() });
        localBranches = Array.isArray(branchData) ? branchData : (branchData?.results ?? []);
      } catch { /* ignore */ }

      // 3. Build branchList as [{id, name}] using dept names matched to local branch ids
      const nameToId = {};
      localBranches.forEach(b => { if (b.name) nameToId[b.name.trim().toLowerCase()] = b.id; });
      const merged = deptNames.map(name => ({
        id: nameToId[name.trim().toLowerCase()] ?? null,
        name,
      })).filter(b => b.id !== null).sort((a, b) => a.name.localeCompare(b.name));
      setBranchList(merged.length > 0 ? merged : localBranches.filter(b => b.name).sort((a, b) => a.name.localeCompare(b.name)));

      // 4. Get live branch_id for the logged-in user from /auth/me/
      try {
        const me = await authService.getMe();
        if (me) localStorage.setItem('user', JSON.stringify(me));
        if (me?.branch_id) {
          const match = localBranches.find(b => String(b.id) === String(me.branch_id));
          if (match?.name) { setUserBranchName(match.name); setFilterBranch(match.name); }
        }
      } catch { /* fallback */ }
    };
    initBranches();
  }, []);

  // ── Employee list for Employee 2 dropdowns ──────────────────
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    getUsers({ status: "Active" })
      .then((res) => {
        const users = Array.isArray(res) ? res : (res?.results ?? []);
        setEmployees(users.map((u) => u.username).filter(Boolean));
      })
      .catch(() => setEmployees([]));
  }, []);

  // Reload list after add/edit
  const handleBackFromAdd = () => {
    setEditRow(null);
    setView("list");
    fetchData();
  };

  // ── Patch helper ────────────────────────────────────────
  const patchRow = async (id, payload) => {
    const updated = await apiFetch(ENDPOINTS.standby(id), {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    setData((prev) => prev.map((r) => r.id === id ? normalize(updated) : r));
    return updated;
  };

  const customerOptions = ["All", ...Array.from(new Set(data.map((r) => r.customerName))).sort()];

  // ── Filter & Search ──────────────────────────────────────
  const filtered = data.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      r.customerName.toLowerCase().includes(q) ||
      r.employeeName.toLowerCase().includes(q) ||
      r.standbyProduct.toLowerCase().includes(q);
    const matchCustomer = customerFilter === "All" || r.customerName === customerFilter;
    const matchStatus   = statusFilter   === "All" || r.status === statusFilter;
    const matchBranch   = filterBranch === "all" || (() => {
      const sel = branchList.find(b => b.name === filterBranch);
      if (!sel) return true;
      return String(r.branch_id) === String(sel.id);
    })();
    const rowDate = r.date ? new Date(r.date) : null;
    const matchFrom = !dateFrom || (rowDate && rowDate >= new Date(dateFrom));
    const matchTo   = !dateTo   || (rowDate && rowDate <= new Date(dateTo + "T23:59:59"));
    return matchSearch && matchCustomer && matchStatus && matchBranch && matchFrom && matchTo;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginated  = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handleStatusChange = async (row, newStatus) => {
    // Optimistic update
    setData((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? { ...r, status: newStatus, returnDate: newStatus === "Returned" && !r.returnDate ? new Date().toISOString().slice(0, 10) : r.returnDate }
          : r
      )
    );
    try {
      const payload = { status: newStatus };
      if (newStatus === "Returned" && !row.returnDate) {
        payload.return_date = new Date().toISOString().slice(0, 10);
      }
      await patchRow(row.id, payload);
    } catch (err) {
      fetchData(); // revert on error
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      await apiFetch(ENDPOINTS.standby(id), { method: "DELETE", headers: authHeaders() });
      setData((prev) => prev.filter((r) => r.id !== id));
      setDeleteRow(null);
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleStageToggle = async (id, field) => {
    const row = data.find((r) => r.id === id);
    if (!row) return;
    const newVal = !row[field];
    // Map UI field → API field name
    const apiFieldMap = {
      stage_issue: "stage_issue",
      stage_returnFromCustomer: "stage_return_from_customer",
      stage_returnToOffice: "stage_return_to_office",
    };
    setData((prev) => prev.map((r) => r.id === id ? { ...r, [field]: newVal } : r));
    try {
      await patchRow(id, { [apiFieldMap[field] || field]: newVal });
    } catch (err) {
      fetchData();
      alert(`Failed to update stage: ${err.message}`);
    }
  };

  // Issue Modal
  const [issueModal, setIssueModal] = useState(null);
  const [issueForm, setIssueForm] = useState({
    employee1: "",
    employee2: "",
    responsiblePerson: "",
    phoneNumber: "",
    date: "",
  });

  /** Convert yyyy-mm-dd (API) → dd-mm-yyyy (display) */
  const isoToDisplay = (iso) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return y && m && d ? `${d}-${m}-${y}` : iso;
  };

  const openIssueModal = (row) => {
    const raw = row._raw || {};
    // Default date: existing issue_date if present, otherwise today
    const defaultDate = raw.issue_date
      ? isoToDisplay(raw.issue_date)
      : (() => {
          const t = new Date();
          return `${String(t.getDate()).padStart(2,"0")}-${String(t.getMonth()+1).padStart(2,"0")}-${t.getFullYear()}`;
        })();
    setIssueForm({
      employee1:         raw.employee1    || "",
      employee2:         raw.employee2    || "",
      responsiblePerson: raw.person_name  || "",
      phoneNumber:       raw.phone_number || "",
      date:              defaultDate,
    });
    setIssueModal({ rowId: row.id });
  };

  const closeIssueModal = () => setIssueModal(null);

  const saveIssue = async () => {
    // Parse dd-mm-yyyy → yyyy-mm-dd for API
    const [dd, mm, yyyy] = (issueForm.date || "").split("-");
    const isoDate = yyyy && mm && dd ? `${yyyy}-${mm}-${dd}` : new Date().toISOString().slice(0, 10);
    try {
      await patchRow(issueModal.rowId, {
        stage_issue:  true,
        status:       "Issued",
        issue_date:   isoDate,
        employee1:    issueForm.employee1         || undefined,
        employee2:    issueForm.employee2         || undefined,
        person_name:  issueForm.responsiblePerson || undefined,
        phone_number: issueForm.phoneNumber       || undefined,
      });
    } catch (err) {
      alert(`Failed to save issue: ${err.message}`);
    }
    closeIssueModal();
  };

  // Pre Return Modal (Return from Customer)
  const [preReturnModal, setPreReturnModal] = useState(null);
  const [preReturnForm, setPreReturnForm] = useState({
    employee1: "",
    employee2: "",
    date: "",
  });

  const openPreReturnModal = (row) => {
    const raw = row._raw || {};
    const defaultDate = raw.return_date
      ? isoToDisplay(raw.return_date)
      : (() => {
          const t = new Date();
          return `${String(t.getDate()).padStart(2,"0")}-${String(t.getMonth()+1).padStart(2,"0")}-${t.getFullYear()}`;
        })();
    setPreReturnForm({
      employee1: raw.employee1 || "",
      employee2: raw.employee2 || "",
      date:      defaultDate,
    });
    setPreReturnModal({ rowId: row.id });
  };

  const closePreReturnModal = () => setPreReturnModal(null);

  const savePreReturn = async () => {
    const [dd, mm, yyyy] = (preReturnForm.date || "").split("-");
    const isoDate = yyyy && mm && dd ? `${yyyy}-${mm}-${dd}` : new Date().toISOString().slice(0, 10);
    try {
      await patchRow(preReturnModal.rowId, {
        stage_return_from_customer: true,
        status:      "Collected",
        return_date: isoDate,
        employee1:   preReturnForm.employee1 || undefined,
        employee2:   preReturnForm.employee2 || undefined,
      });
    } catch (err) {
      alert(`Failed to save return: ${err.message}`);
    }
    closePreReturnModal();
  };

  // Return to Office Modal
  const [returnToOfficeModal, setReturnToOfficeModal] = useState(null);
  const [returnToOfficeForm, setReturnToOfficeForm] = useState({
    employee1: "",
    employee2: "",
    standbyReturned: "yes",
    date: "",
  });

  const openReturnToOfficeModal = (row) => {
    const raw = row._raw || {};
    const defaultDate = raw.return_date
      ? isoToDisplay(raw.return_date)
      : (() => {
          const t = new Date();
          return `${String(t.getDate()).padStart(2,"0")}-${String(t.getMonth()+1).padStart(2,"0")}-${t.getFullYear()}`;
        })();
    setReturnToOfficeForm({
      employee1:       raw.employee1 || "",
      employee2:       raw.employee2 || "",
      standbyReturned: raw.status === "Returned" ? "yes" : "no",
      date:            defaultDate,
    });
    setReturnToOfficeModal({ rowId: row.id });
  };

  const closeReturnToOfficeModal = () => setReturnToOfficeModal(null);

  const saveReturnToOffice = async () => {
    try {
      const [dd, mm, yyyy] = (returnToOfficeForm.date || "").split("-");
      const isoDate = yyyy && mm && dd ? `${yyyy}-${mm}-${dd}` : new Date().toISOString().slice(0, 10);
      const payload = {
        stage_return_to_office: true,
        status:      "Returned",
        return_date: isoDate,
      };
      if (returnToOfficeForm.employee1) payload.employee1 = returnToOfficeForm.employee1;
      if (returnToOfficeForm.employee2) payload.employee2 = returnToOfficeForm.employee2;
      await patchRow(returnToOfficeModal.rowId, payload);
    } catch (err) {
      alert(`Failed to save return to office: ${err.message}`);
    }
    closeReturnToOfficeModal();
  };

  const resetFilters = () => {
    setSearch(""); setCustomerFilter("All"); setStatusFilter("All");
    setFilterBranch(userBranchName || "all"); setDateFrom(""); setDateTo(""); setCurrentPage(1);
  };

  const hasActiveFilter = search || customerFilter !== "All" || statusFilter !== "All" ||
    filterBranch !== (userBranchName || "all") || dateFrom || dateTo;

  return (
    <>
      {(view === "add" || view === "edit") && (
        <StandbyAdd onBack={handleBackFromAdd} editRow={editRow} />
      )}
      {view === "list" && (
        <div style={styles.page}>
          <style>{css}</style>

          <div style={styles.card}>

            {/* ── Row 1: Title + Add Button ── */}
            <div style={styles.titleRow} className="title-row-mobile">
              <h1 style={styles.headerTitle}>Standby List</h1>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button style={{ ...styles.headerAddBtn, background: "#f1f5f9", color: "#475569", border: "1.5px solid #e2e8f0" }} onClick={fetchData} title="Refresh">⟳</button>
                <button style={styles.headerAddBtn} onClick={() => { setEditRow(null); setView("add"); }}>+ New Standby</button>
              </div>
            </div>

            {/* ── Loading / Error banner ── */}
            {loading && (
              <div style={{ padding: "16px 20px", color: "#1a73e8", fontSize: 13 }}>Loading standby entries…</div>
            )}
            {!loading && fetchError && (
              <div style={{ padding: "12px 20px", background: "#fff5f5", color: "#ef4444", fontSize: 13, borderTop: "1px solid #fecaca" }}>
                {fetchError} — <button style={{ background: "none", border: "none", color: "#1a73e8", cursor: "pointer", fontWeight: 600 }} onClick={fetchData}>Retry</button>
              </div>
            )}

            {/* ── Row 2: Search + Filters ── */}
            <div style={styles.filterRow} className="filter-row-mobile">
              <div style={styles.searchWrap}>
                <span style={styles.searchIcon}></span>
                <input
                  style={styles.searchInput}
                  placeholder="Search customer, employee or product…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                />
                {search && (
                  <button style={styles.clearSearch} onClick={() => { setSearch(""); setCurrentPage(1); }}>✕</button>
                )}
              </div>
              <div style={styles.selectWrap}>
                <select
                  style={styles.filterSelect}
                  value={customerFilter}
                  onChange={(e) => { setCustomerFilter(e.target.value); setCurrentPage(1); }}
                >
                  {customerOptions.map((c) => (
                    <option key={c} value={c}>{c === "All" ? "All Customers" : c}</option>
                  ))}
                </select>
              </div>
              <div style={styles.selectWrap}>
                <select
                  style={styles.filterSelect}
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                >
                  <option value="All">All Status</option>
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              {/* Branch filter — Admin/Super Admin */}
              {isAdmin && (
                <div style={styles.selectWrap}>
                  <select
                    style={styles.filterSelect}
                    value={filterBranch}
                    onChange={(e) => { setFilterBranch(e.target.value); setCurrentPage(1); }}
                  >
                    <option value="all">All Branches</option>
                    {branchList.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
              )}
              {/* From Date */}
              <div style={styles.selectWrap}>
                <input type="date" value={dateFrom} placeholder="From"
                  onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                  style={styles.filterSelect} />
              </div>
              {/* To Date */}
              <div style={styles.selectWrap}>
                <input type="date" value={dateTo} placeholder="To"
                  onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                  style={styles.filterSelect} />
              </div>
              {hasActiveFilter && (
                <button style={styles.clearFilterBtn} onClick={resetFilters}>✕ Clear</button>
              )}
            </div>

            <div style={styles.body} className="body-mobile">

              {/* ── Table (desktop) ── */}
              <div className="desktop-table" style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      {[
                        "Sl.No", "Date", "Customer Name", "Employee Name",
                        "Standby Product", "Issue Date", "Return Date", "Status", "Issue", "Return from Customer", "Return to Office", "Action",
                      ].map((h) => (
                        <th key={h} style={styles.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length === 0 ? (
                      <tr>
                        <td colSpan={12} style={styles.emptyCell}>
                          <div style={styles.emptyState}>
                            <span style={styles.emptyIcon}></span>
                            <p style={styles.emptyText}>No standby entries found</p>
                            <p style={styles.emptyHint}>Try adjusting your search or filters</p>
                            {hasActiveFilter && (
                              <button style={styles.clearFilterBtn2} onClick={resetFilters}>Clear Filters</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginated.map((row, idx) => (
                        <tr key={row.id} style={styles.tr} className="table-row">

                          {/* Sl.No */}
                          <td style={{ ...styles.td, color: "#94a3b8", fontWeight: 600, fontSize: 12 }}>
                            {(currentPage - 1) * rowsPerPage + idx + 1}
                          </td>

                          {/* Date */}
                          <td style={{ ...styles.td, color: "#64748b" }}>{row.date}</td>

                          {/* Customer Name */}
                          <td style={{ ...styles.td, fontWeight: 600, whiteSpace: "normal", minWidth: 120, maxWidth: 180, wordBreak: "break-word" }}>{row.customerName}</td>

                          {/* Employee Name */}
                          <td style={styles.td}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                              {row.employee1 && (
                                <span style={{ fontWeight: 500 }}>{row.employee1}</span>
                              )}
                              {row.employee2 && (
                                <span style={{ color: "#64748b", fontSize: 9 }}>{row.employee2}</span>
                              )}
                              {!row.employee1 && !row.employee2 && "—"}
                            </div>
                          </td>

                          {/* Standby Product */}
                          <td style={{ ...styles.td, fontWeight: 500 }}>{row.standbyProduct}</td>

                          {/* Issue Date */}
                          <td style={{ ...styles.td, color: "#64748b" }}>{row.issueDate}</td>

                          {/* Return Date */}
                          <td style={styles.td}>
                            {row.returnDate
                              ? <span style={styles.returnDateChip}>{row.returnDate}</span>
                              : <span style={styles.returnDateEmpty}>—</span>}
                          </td>

                          {/* Status — pill select */}
                          <td style={styles.td}>
                            <select
                              value={row.status}
                              disabled={!isAdmin}
                              onChange={(e) => handleStatusChange(row, e.target.value)}
                              className={`status-select ${STATUS_META[row.status]?.pill || ""}`}
                              style={{ ...styles.statusSelect, ...(isAdmin ? {} : { cursor: "not-allowed", opacity: 0.7 }) }}
                            >
                              {ALL_STATUSES.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </td>

                          {/* Stage Icons */}
                          {STAGE_CONFIG.map(({ field, label, activeColor, Icon }) => (
                            <td key={field} style={{ ...styles.td, textAlign: "center" }}>
                              <button
                                onClick={() =>
                                field === "stage_issue"
                                  ? openIssueModal(row)
                                  : field === "stage_returnFromCustomer"
                                  ? openPreReturnModal(row)
                                  : field === "stage_returnToOffice"
                                  ? openReturnToOfficeModal(row)
                                  : handleStageToggle(row.id, field)
                              }
                                title={`${label}: ${row[field] ? "Done — click to undo" : "Pending — click to mark done"}`}
                                style={{
                                  ...styles.stageIconBtn,
                                  color: row[field] ? activeColor : "#cbd5e1",
                                }}
                              >
                                <Icon style={{ fontSize: 22 }} />
                              </button>
                            </td>
                          ))}

                          {/* Action */}
                          <td style={styles.td}>
                            <div style={styles.actionBtns}>
                              <button style={styles.viewBtn} title="View" onClick={() => setViewRow(row)}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                              </button>
                              {isAdmin && (
                                <button style={styles.editBtn} title="Edit" onClick={() => { setEditRow(row._raw); setView("edit"); }}>
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                                </button>
                              )}
                              {isSuperAdmin && (
                                <button style={styles.delBtn} title="Delete" onClick={() => setDeleteRow(row)}>
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                                </button>
                              )}
                            </div>
                          </td>

                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* ── Mobile Cards ── */}
              <div className="mobile-cards">
                {paginated.length === 0 ? (
                  <div style={styles.emptyState}>
                    <span style={styles.emptyIcon}></span>
                    <p style={styles.emptyText}>No standby entries found</p>
                    <p style={styles.emptyHint}>Try adjusting your search or filters</p>
                    {hasActiveFilter && (
                      <button style={styles.clearFilterBtn2} onClick={resetFilters}>Clear Filters</button>
                    )}
                  </div>
                ) : (
                  paginated.map((row, idx) => (
                    <div key={row.id} className="standby-card">
                      {/* Card Header */}
                      <div className="standby-card-header">
                        <span className="standby-card-name">{row.customerName}</span>
                        <span className="standby-card-sl">#{(currentPage - 1) * rowsPerPage + idx + 1}</span>
                      </div>

                      {/* Card Grid */}
                      <div className="standby-card-grid">
                        <div className="standby-card-field">
                          <span className="standby-card-label">Product</span>
                          <span className="standby-card-value">{row.standbyProduct}</span>
                        </div>
                        <div className="standby-card-field">
                          <span className="standby-card-label">Employee</span>
                          <span className="standby-card-value" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            {row.employee1 && <span style={{ fontWeight: 500 }}>{row.employee1}</span>}
                            {row.employee2 && <span style={{ color: "#64748b", fontSize: 12 }}>{row.employee2}</span>}
                            {!row.employee1 && !row.employee2 && "—"}
                          </span>
                        </div>
                        <div className="standby-card-field">
                          <span className="standby-card-label">Issue Date</span>
                          <span className="standby-card-value">{row.issueDate}</span>
                        </div>
                        <div className="standby-card-field">
                          <span className="standby-card-label">Return Date</span>
                          <span className="standby-card-value">{row.returnDate || "—"}</span>
                        </div>
                        <div className="standby-card-field">
                          <span className="standby-card-label">Date</span>
                          <span className="standby-card-value" style={{ color: "#64748b" }}>{row.date}</span>
                        </div>
                        <div className="standby-card-field">
                          <span className="standby-card-label">Status</span>
                          <select
                            value={row.status}
                            disabled={!isAdmin}
                            onChange={(e) => handleStatusChange(row, e.target.value)}
                            className={`status-select ${STATUS_META[row.status]?.pill || ""}`}
                            style={{ ...styles.statusSelect, minWidth: 0, width: "100%", ...(isAdmin ? {} : { cursor: "not-allowed", opacity: 0.7 }) }}
                          >
                            {ALL_STATUSES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <hr className="standby-card-divider" />

                      {/* Card Footer: stages + actions */}
                      <div className="standby-card-footer">
                        <div className="standby-card-stages">
                          {STAGE_CONFIG.map(({ field, label, activeColor, Icon }) => (
                            <button
                              key={field}
                              onClick={() =>
                                field === "stage_issue"
                                  ? openIssueModal(row)
                                  : field === "stage_returnFromCustomer"
                                  ? openPreReturnModal(row)
                                  : field === "stage_returnToOffice"
                                  ? openReturnToOfficeModal(row)
                                  : handleStageToggle(row.id, field)
                              }
                              title={label}
                              style={{
                                ...styles.stageIconBtn,
                                color: row[field] ? activeColor : "#cbd5e1",
                                background: row[field] ? `${activeColor}12` : "#f8fafc",
                                border: `1.5px solid ${row[field] ? activeColor : "#e2e8f0"}`,
                                padding: "5px 8px",
                              }}
                            >
                              <Icon style={{ fontSize: 18 }} />
                            </button>
                          ))}
                        </div>
                        <div className="standby-card-actions">
                          <button style={styles.viewBtn} title="View" onClick={() => setViewRow(row)}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                          </button>
                          {isAdmin && (
                            <button style={styles.editBtn} title="Edit" onClick={() => { setEditRow(row._raw); setView("edit"); }}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                            </button>
                          )}
                          {isSuperAdmin && (
                            <button style={styles.delBtn} title="Delete" onClick={() => setDeleteRow(row)}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* ── Pagination ── */}
              <div style={styles.pagination} className="pagination-mobile">
                <span style={styles.pageInfo}>
                  {filtered.length === 0
                    ? "No results"
                    : `Showing ${Math.min((currentPage - 1) * rowsPerPage + 1, filtered.length)}–${Math.min(currentPage * rowsPerPage, filtered.length)} of ${filtered.length}`}
                </span>
                {totalPages > 1 && (
                  <div style={styles.pageBtns}>
                    <button
                      style={{ ...styles.pageBtn, ...(currentPage === 1 ? styles.pageBtnDisabled : {}) }}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >← Prev</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        style={{ ...styles.pageBtn, ...(p === currentPage ? styles.pageBtnActive : {}) }}
                        onClick={() => setCurrentPage(p)}
                      >{p}</button>
                    ))}
                    <button
                      style={{ ...styles.pageBtn, ...(currentPage === totalPages ? styles.pageBtnDisabled : {}) }}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >Next →</button>
                  </div>
                )}
              </div>

            </div>
          </div>

          <div className="imcb-footer">
            Powered by <span style={{ fontWeight: 600, color: "#1a73e8" }}>IMCB Solutions LLP</span>
          </div>

          {/* ── Return to Office Modal ── */}
          {returnToOfficeModal && (
            <div style={issueModalStyles.overlay} onClick={closeReturnToOfficeModal}>
              <div style={issueModalStyles.dialog} onClick={(e) => e.stopPropagation()}>
                <div style={issueModalStyles.header}>
                  <span style={issueModalStyles.title}>Return</span>
                  <button style={issueModalStyles.closeBtn} onClick={closeReturnToOfficeModal}>✕</button>
                </div>
                <div style={issueModalStyles.body}>
                  <div style={issueModalStyles.field}>
                    <label style={issueModalStyles.label}>Employee1</label>
                    <input
                      type="text"
                      value={returnToOfficeForm.employee1}
                      onChange={(e) => setReturnToOfficeForm((f) => ({ ...f, employee1: e.target.value }))}
                      style={issueModalStyles.input}
                      placeholder="Employee 1 name"
                    />
                  </div>
                  <div style={issueModalStyles.field}>
                    <label style={issueModalStyles.label}>Employee2</label>
                    <select
                      value={returnToOfficeForm.employee2}
                      onChange={(e) => setReturnToOfficeForm((f) => ({ ...f, employee2: e.target.value }))}
                      style={issueModalStyles.input}
                    >
                      <option value="">— Select Employee 2 —</option>
                      {employees.map((emp) => (
                        <option key={emp} value={emp}>{emp}</option>
                      ))}
                    </select>
                  </div>
                  <div style={issueModalStyles.field}>
                    <label style={issueModalStyles.label}>Standby Product returned or not?</label>
                    <div style={{ display: "flex", gap: 24, alignItems: "center", marginTop: 2 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 14, color: "#111827", cursor: "pointer", fontWeight: 500 }}>
                        <input
                          type="radio"
                          name="returnStandby"
                          value="yes"
                          checked={returnToOfficeForm.standbyReturned === "yes"}
                          onChange={() => setReturnToOfficeForm((f) => ({ ...f, standbyReturned: "yes" }))}
                          style={{ accentColor: "#3466ec", width: 17, height: 17, cursor: "pointer" }}
                        />
                        Yes
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 14, color: "#111827", cursor: "pointer", fontWeight: 500 }}>
                        <input
                          type="radio"
                          name="returnStandby"
                          value="no"
                          checked={returnToOfficeForm.standbyReturned === "no"}
                          onChange={() => setReturnToOfficeForm((f) => ({ ...f, standbyReturned: "no" }))}
                          style={{ accentColor: "#3466ec", width: 17, height: 17, cursor: "pointer" }}
                        />
                        No
                      </label>
                    </div>
                  </div>
                  <div style={issueModalStyles.field}>
                    <label style={issueModalStyles.label}>Date :</label>
                    <div style={issueModalStyles.inputWrap}>
                      <input
                        type="text"
                        value={returnToOfficeForm.date}
                        onChange={(e) => setReturnToOfficeForm((f) => ({ ...f, date: e.target.value }))}
                        style={issueModalStyles.input}
                        placeholder="DD-MM-YYYY"
                      />
                      <span style={issueModalStyles.calIcon}>📅</span>
                    </div>
                  </div>
                </div>
                <div style={issueModalStyles.footer}>
                  <button style={issueModalStyles.cancelBtn} onClick={closeReturnToOfficeModal}>Cancel</button>
                  <button style={issueModalStyles.saveBtn} onClick={saveReturnToOffice}>Save</button>
                </div>
              </div>
            </div>
          )}

          {/* ── Pre Return Modal ── */}
          {preReturnModal && (
            <div style={issueModalStyles.overlay} onClick={closePreReturnModal}>
              <div style={issueModalStyles.dialog} onClick={(e) => e.stopPropagation()}>
                <div style={issueModalStyles.header}>
                  <span style={issueModalStyles.title}>Pre return</span>
                  <button style={issueModalStyles.closeBtn} onClick={closePreReturnModal}>✕</button>
                </div>
                <div style={issueModalStyles.body}>
                  <div style={issueModalStyles.field}>
                    <label style={issueModalStyles.label}>Employee1</label>
                    <input
                      type="text"
                      value={preReturnForm.employee1}
                      onChange={(e) => setPreReturnForm((f) => ({ ...f, employee1: e.target.value }))}
                      style={issueModalStyles.input}
                      placeholder="Employee 1 name"
                    />
                  </div>
                  <div style={issueModalStyles.field}>
                    <label style={issueModalStyles.label}>Employee2</label>
                    <select
                      value={preReturnForm.employee2}
                      onChange={(e) => setPreReturnForm((f) => ({ ...f, employee2: e.target.value }))}
                      style={issueModalStyles.input}
                    >
                      <option value="">— Select Employee 2 —</option>
                      {employees.map((emp) => (
                        <option key={emp} value={emp}>{emp}</option>
                      ))}
                    </select>
                  </div>
                  <div style={issueModalStyles.field}>
                    <label style={issueModalStyles.label}>Date :</label>
                    <div style={issueModalStyles.inputWrap}>
                      <input
                        type="text"
                        value={preReturnForm.date}
                        onChange={(e) => setPreReturnForm((f) => ({ ...f, date: e.target.value }))}
                        style={issueModalStyles.input}
                        placeholder="DD-MM-YYYY"
                      />
                      <span style={issueModalStyles.calIcon}>📅</span>
                    </div>
                  </div>
                </div>
                <div style={issueModalStyles.footer}>
                  <button style={issueModalStyles.cancelBtn} onClick={closePreReturnModal}>Cancel</button>
                  <button style={issueModalStyles.saveBtn} onClick={savePreReturn}>Save</button>
                </div>
              </div>
            </div>
          )}

          {/* ── Issue Modal ── */}
          {issueModal && (
            <div style={issueModalStyles.overlay} onClick={closeIssueModal}>
              <div style={issueModalStyles.dialog} onClick={(e) => e.stopPropagation()}>
                <div style={issueModalStyles.header}>
                  <span style={issueModalStyles.title}>Issue</span>
                  <button style={issueModalStyles.closeBtn} onClick={closeIssueModal}>✕</button>
                </div>
                <div style={issueModalStyles.body}>
                  <div style={issueModalStyles.field}>
                    <label style={issueModalStyles.label}>Employee1</label>
                    <input
                      type="text"
                      value={issueForm.employee1}
                      onChange={(e) => setIssueForm((f) => ({ ...f, employee1: e.target.value }))}
                      style={issueModalStyles.input}
                      placeholder="Employee 1 name"
                    />
                  </div>
                  <div style={issueModalStyles.field}>
                    <label style={issueModalStyles.label}>Employee2</label>
                    <select
                      value={issueForm.employee2}
                      onChange={(e) => setIssueForm((f) => ({ ...f, employee2: e.target.value }))}
                      style={issueModalStyles.input}
                    >
                      <option value="">— Select Employee 2 —</option>
                      {employees.map((emp) => (
                        <option key={emp} value={emp}>{emp}</option>
                      ))}
                    </select>
                  </div>
                  <div style={issueModalStyles.field}>
                    <label style={issueModalStyles.label}>Responsible Person name</label>
                    <input
                      type="text"
                      value={issueForm.responsiblePerson}
                      onChange={(e) => setIssueForm((f) => ({ ...f, responsiblePerson: e.target.value }))}
                      style={issueModalStyles.input}
                      placeholder="Responsible person name"
                    />
                  </div>
                  <div style={issueModalStyles.field}>
                    <label style={issueModalStyles.label}>Phone number</label>
                    <input
                      type="text"
                      value={issueForm.phoneNumber}
                      onChange={(e) => setIssueForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                      style={issueModalStyles.input}
                      placeholder="Phone number"
                    />
                  </div>
                  <div style={issueModalStyles.field}>
                    <label style={issueModalStyles.label}>Date :</label>
                    <div style={issueModalStyles.inputWrap}>
                      <input
                        type="text"
                        value={issueForm.date}
                        onChange={(e) => setIssueForm((f) => ({ ...f, date: e.target.value }))}
                        style={issueModalStyles.input}
                        placeholder="DD-MM-YYYY"
                      />
                      <span style={issueModalStyles.calIcon}>📅</span>
                    </div>
                  </div>
                </div>
                <div style={issueModalStyles.footer}>
                  <button style={issueModalStyles.cancelBtn} onClick={closeIssueModal}>Cancel</button>
                  <button style={issueModalStyles.saveBtn} onClick={saveIssue}>Save</button>
                </div>
              </div>
            </div>
          )}

          {/* ── Modals ── */}
          <ViewModal   row={viewRow}   onClose={() => setViewRow(null)} onEdit={(row) => { setViewRow(null); setEditRow(row._raw); setView("edit"); }} />
          <DeleteModal row={deleteRow} onConfirm={handleDelete} onClose={() => !deleting && setDeleteRow(null)} deleting={deleting} />
        </div>
      )}
    </>
  );
}

// ── CSS ──────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@300;400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; color: #000; }
  input, select, button { font-family: 'Google Sans', sans-serif !important; transition: border-color 0.2s, box-shadow 0.2s, background 0.2s; }
  input:focus, select:focus { outline: none; border-color: #1e3a5f !important; box-shadow: 0 0 0 3px rgba(30,58,95,0.1); }
  button:hover { filter: brightness(0.93); transform: translateY(-1px); }
  button:active { transform: translateY(0); }
  .table-row:hover { background: #f8fafc !important; }

  /* ── Status pill select ── */
  .status-select {
    padding: 4px 12px;
    border-radius: 6px;
    border: none;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    outline: none;
    appearance: none;
    -webkit-appearance: none;
    text-align: center;
    min-width: 96px;
    transition: opacity 0.2s;
  }
  .status-select:disabled { cursor: not-allowed; opacity: 0.6; }
  .status-select.pill-green { background: #188038 !important; color: #f6faf7 !important; }
  .status-select.pill-amber { background: rgb(247,170,4) !important; color: #faf9fc !important; }
  .status-select.pill-red   { background: #d35741f5 !important; color: #f5f1f1 !important; }
  .status-select.pill-muted { background: #5f6368 !important; color: #fff !important; }

  @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn { from { opacity:0; transform:scale(0.96); }     to { opacity:1; transform:scale(1); } }

  /* ── Mobile: hide table, show cards ── */
  .desktop-table { display: block; }
  .mobile-cards  { display: none; }

  @media (max-width: 768px) {
    .desktop-table { display: none !important; }
    .mobile-cards  { display: flex; flex-direction: column; gap: 12px; padding: 12px 0; }

    .standby-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 16px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    .standby-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .standby-card-name {
      font-size: 15px;
      font-weight: 700;
      color: #1e293b;
      white-space: normal;
      word-break: break-word;
      flex: 1;
      min-width: 0;
      margin-right: 8px;
    }
    .standby-card-sl {
      font-size: 11px;
      font-weight: 600;
      color: #94a3b8;
      background: #f1f5f9;
      padding: 2px 8px;
      border-radius: 20px;
    }
    .standby-card-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 12px;
      margin-bottom: 12px;
    }
    .standby-card-field { display: flex; flex-direction: column; gap: 2px; }
    .standby-card-label { font-size: 10px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
    .standby-card-value { font-size: 13px; color: #1e293b; font-weight: 500; }
    .standby-card-divider { border: none; border-top: 1px solid #f1f5f9; margin: 10px 0; }
    .standby-card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
    }
    .standby-card-stages {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .standby-card-stage-label {
      font-size: 10px;
      color: #64748b;
      font-weight: 500;
    }
    .standby-card-actions { display: flex; gap: 6px; }

    /* Filter row stack on mobile */
    .filter-row-mobile {
      flex-direction: column !important;
      align-items: stretch !important;
      gap: 8px !important;
      padding: 10px 14px !important;
    }
    .filter-row-mobile > * { width: 100% !important; flex: unset !important; min-width: 0 !important; }
    .filter-row-mobile select { width: 100% !important; }

    /* Title row on mobile */
    .title-row-mobile {
      padding: 10px 14px !important;
    }
    .title-row-mobile h1 { font-size: 17px !important; }
    .title-row-mobile button { font-size: 12px !important; padding: 6px 12px !important; }

    /* Body padding on mobile */
    .body-mobile { padding: 0 14px 14px !important; }

    /* Pagination on mobile */
    .pagination-mobile {
      flex-direction: column !important;
      align-items: center !important;
      gap: 8px !important;
    }
  }

  /* ── IMCB Footer ── */
  .imcb-footer {
    width: 100%;
    text-align: center;
    padding: 10px 16px 6px;
    font-size: 12px;
    color: #64748b;
    font-family: 'Google Sans', sans-serif;
    flex-shrink: 0;
  }
`;

// ── Styles ───────────────────────────────────────────────────
const styles = {
  page: {
    background: "linear-gradient(135deg, #f0f4f8 0%, #e8edf3 100%)",
    display: "flex", flexDirection: "column",
    fontFamily: "'Google Sans', sans-serif",
    height: "100%", overflowY: "auto", overflowX: "hidden",
  },
  card: {
    flex: 1, display: "flex", flexDirection: "column",
    background: "#fff", overflow: "visible",
  },

  // Row 1: Title + Add button
  titleRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "8px 20px",
    borderBottom: "1px solid #f1f5f9",
    background: "#fff",
    flexShrink: 0,
  },
  headerTitle: {
    fontFamily: "'Google Sans', sans-serif",
    fontSize: 25, fontWeight: 800, color: "#0c0c0c",
    letterSpacing: "-0.02em", margin: 0,
  },
  headerAddBtn: {
    padding: "7px 18px", border: "none",
    borderRadius: 7, background: "#2567cb",
    color: "#fff", fontSize: 13, fontWeight: 700,
    cursor: "pointer", whiteSpace: "nowrap",
  },

  // Row 2: Search + Filters
  filterRow: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "8px 20px",
    borderBottom: "1.5px solid #e2e8f0",
    background: "#f9fafc",
    flexShrink: 0,
    flexWrap: "nowrap",
    boxSizing: "border-box",
  },

  body: { padding: "0 20px 16px", display: "flex", flexDirection: "column", flex: 1, overflow: "visible" },

  // Toolbar (hidden, replaced by filterRow)
  toolbar: { display: "none" },

  searchWrap: {
    flex: "2 1 0", minWidth: 0,
    display: "flex", alignItems: "center",
    border: "1.5px solid #e2e8f0", borderRadius: 8,
    background: "#fff", padding: "0 10px",
  },
  searchIcon: { fontSize: 12, color: "#94a3b8", marginRight: 5, flexShrink: 0 },
  searchInput: {
    flex: 1, border: "none", outline: "none",
    fontSize: 13, padding: "7px 0", background: "transparent",
  },
  clearSearch: {
    border: "none", background: "none", cursor: "pointer",
    fontSize: 12, color: "#94a3b8", padding: "0 2px",
  },

  // Dropdowns
  selectWrap: {
    display: "flex", alignItems: "center",
    border: "1.5px solid #e2e8f0", borderRadius: 8,
    background: "#fff", padding: "0 4px",
    flexShrink: 0,
  },
  selectIcon: { display: "none" },
  filterSelect: {
    border: "none", outline: "none", background: "transparent",
    fontSize: 13, padding: "7px 8px", cursor: "pointer",
    color: "#374151", minWidth: 110,
  },
  clearFilterBtn: {
    padding: "7px 14px", borderRadius: 8,
    border: "1.5px solid #fca5a5", background: "#fff5f5",
    color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer",
    whiteSpace: "nowrap",
  },
  clearFilterBtn2: {
    marginTop: 10, padding: "7px 18px", borderRadius: 8,
    border: "1.5px solid #e2e8f0", background: "#fff",
    color: "#64748b", fontSize: 12, fontWeight: 500, cursor: "pointer",
  },

  // Table
  tableWrap: { overflowX: "auto", overflowY: "visible", flex: 1 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    padding: "6px 10px", textAlign: "left",
    background: "#1b85f0",
    fontSize: 12, fontWeight: 700, color: "#ffffff",
    letterSpacing: "0.04em", textTransform: "capitalize",
    borderBottom: "1.5px solid #e2e8f0", whiteSpace: "nowrap",
  },
  tr: { borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" },
  td: { padding: "5px 10px", color: "#1e293b", fontSize: 11, verticalAlign: "middle", whiteSpace: "nowrap", textAlign: "left", lineHeight: "1.2" },

  // Return date
  returnDateChip: {
    display: "inline-block", padding: "2px 9px", borderRadius: 6,
    background: "#ffffff", color: "#0f0f0f",
     fontSize: 12, fontWeight: 500,
  },
  returnDateEmpty: { color: "#cbd5e1", fontSize: 15 },

  // Status select base (pill colours come from CSS classes)
  statusSelect: {
    padding: "4px 12px", borderRadius: 6, border: "none",
    fontSize: 12, fontWeight: 600, cursor: "pointer", outline: "none",
    appearance: "none", WebkitAppearance: "none", textAlign: "center",
    minWidth: 96,
  },

  // Badge (modal)
  badge: {
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
  },
  dot: { width: 7, height: 7, borderRadius: "50%", flexShrink: 0 },

  // Stage icon buttons
  stageIconBtn: {
    background: "none",
    border: "none",
    padding: 4,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    transition: "color 0.18s, transform 0.12s",
  },

  // Action buttons
  actionBtns: { display: "flex", gap: 6 },
  viewBtn: {
    padding: "5px 8px", borderRadius: 7, border: "none",
    background: "#0b8043", color: "#fff", fill: "#fff",
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Google Sans', sans-serif",
  },
  editBtn: {
    padding: "5px 8px", borderRadius: 7, border: "none",
    background: "#1a73e8", color: "#fff", fill: "#fff",
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Google Sans', sans-serif",
  },
  delBtn: {
    padding: "5px 8px", borderRadius: 7, border: "none",
    background: "#d93025", color: "#fff", fill: "#fff",
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Google Sans', sans-serif",
  },

  // Empty state
  emptyCell: { padding: "48px 20px", textAlign: "center" },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6 },
  emptyIcon: { fontSize: 36, marginBottom: 4 },
  emptyText: { fontSize: 15, fontWeight: 600, color: "#475569" },
  emptyHint: { fontSize: 13, color: "#94a3b8" },

  // Pagination
  pagination: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginTop: 14, flexWrap: "wrap", gap: 10,
  },
  pageInfo: { fontSize: 13, color: "#64748b" },
  pageBtns: { display: "flex", gap: 4 },
  pageBtn: {
    padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 500,
    border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", cursor: "pointer",
  },
  pageBtnActive:   { background: "#1e73e2", color: "#fff", borderColor: "#1e73e2", fontWeight: 700 },
  pageBtnDisabled: { opacity: 0.4, cursor: "not-allowed" },

  // Modal
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, animation: "fadeIn 0.2s ease both",
  },
  modal: {
    background: "#fff", borderRadius: 14, width: "100%", maxWidth: 460,
    boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
    overflow: "hidden", animation: "fadeUp 0.25s ease both", margin: "0 16px",
  },
  modalHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "14px 20px", borderBottom: "1.5px solid #f1f5f9", background: "#f8fafc",
  },
  modalTitle:  { fontSize: 15, fontWeight: 700, color: "#1e293b" },
  modalClose: {
    border: "none", background: "none", fontSize: 16,
    cursor: "pointer", color: "#64748b", padding: 4, lineHeight: 1,
  },
  modalBody: { padding: "16px 20px" },
  modalRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13,
  },
  modalLabel: { color: "#64748b", fontWeight: 500 },
  modalValue: { color: "#1e293b", fontWeight: 600, textAlign: "right" },
  modalFooter: {
    display: "flex", justifyContent: "flex-end",
    padding: "12px 20px", borderTop: "1.5px solid #f1f5f9",
  },
  closeBtn: {
    padding: "7px 20px", border: "1.5px solid #e2e8f0", borderRadius: 8,
    background: "#fff", color: "#000", fontSize: 13, fontWeight: 500, cursor: "pointer",
  },

  // Delete modal
  deleteIcon:       { fontSize: 36, marginBottom: 10 },
  deleteMsg:        { fontSize: 14, color: "#1e293b", marginBottom: 6, lineHeight: 1.5 },
  deleteNote:       { fontSize: 12, color: "#ef4444" },
  deleteConfirmBtn: {
    padding: "7px 20px", border: "none", borderRadius: 8,
    background: "#ef4444", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
};

const issueModalStyles = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.35)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000,
  },
  dialog: {
    background: "#fff",
    borderRadius: 14,
    width: 440,
    maxWidth: "94vw",
    boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
    display: "flex", flexDirection: "column",
    fontFamily: "'Google Sans', sans-serif",
    overflow: "hidden",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "18px 22px 14px 22px",
    borderBottom: "1px solid #f1f5f9",
  },
  title: { fontSize: 17, fontWeight: 700, color: "#0e0d0d" },
  closeBtn: {
    background: "none", border: "none", cursor: "pointer",
    fontSize: 18, color: "#94a3b8", lineHeight: 1, padding: 2,
  },
  body: {
    padding: "20px 22px",
    display: "flex", flexDirection: "column", gap: 16,
  },
  field: {
    display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start",
  },
  label: {
    fontSize: 13, fontWeight: 600, color: "#374151",
    textAlign: "left", display: "block", width: "100%",
  },
  inputWrap: {
    position: "relative", display: "flex", alignItems: "center", width: "100%",
  },
  input: {
    width: "100%",
    padding: "10px 38px 10px 13px",
    border: "1.5px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
    color: "#111827",
    fontFamily: "'Google Sans', sans-serif",
    outline: "none",
    boxSizing: "border-box",
  },
  calIcon: {
    position: "absolute", right: 10,
    fontSize: 16, color: "#6b7280", pointerEvents: "none",
  },
  footer: {
    display: "flex", justifyContent: "flex-end", gap: 10,
    padding: "14px 22px 18px 22px",
    borderTop: "1px solid #f1f5f9",
  },
  cancelBtn: {
    padding: "9px 22px", borderRadius: 8,
    border: "1.5px solid #d1d5db", background: "#fff",
    fontSize: 14, fontWeight: 600, color: "#374151", cursor: "pointer",
    fontFamily: "'Google Sans', sans-serif",
  },
  saveBtn: {
    padding: "9px 26px", borderRadius: 8,
    border: "none", background: "#3466ec",
    fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer",
    fontFamily: "'Google Sans', sans-serif",
  },
};