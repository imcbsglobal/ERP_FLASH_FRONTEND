import { useState, useEffect, useCallback, useRef } from "react";
import { getUsers, createUser, deleteUser, patchUser, getBranches, createBranch } from "../service/Api";
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';

// ── Constants ─────────────────────────────────────────────────────────────────
const ROLES    = ["Admin", "Manager", "User"];
const STATUSES = ["Active", "Inactive"];
const EMPTY_FORM = {
  username: "", address: "", phone: "", branch: "",
  password: "", role: "", status: "",
  photo: null, photoPreview: "",
};

// ── Column definitions ────────────────────────────────────────────────────────
const COLS = [
  { key: "sl",       label: "Sl.No",    width: "5%",  align: "center" },
  { key: "username", label: "Username", width: "18%", align: "left"   },
  { key: "address",  label: "Address",  width: "25%", align: "left"   },
  { key: "phone",    label: "Phone",    width: "13%", align: "left"   },
  { key: "branch",   label: "Branch",   width: "13%", align: "left"   },
  { key: "role",     label: "Role",     width: "10%", align: "left"   },
  { key: "status",   label: "Status",   width: "8%",  align: "center" },
  { key: "action",   label: "Action",   width: "8%",  align: "center" },
];

const thStyle = (col) => ({
  padding: "11px 14px",
  textAlign: col.align,
  fontSize: "15px",
  fontWeight: 600,
  color: "white",
  textTransform: "capitalize",
  letterSpacing: "0.8px",
  borderBottom: "1px solid var(--border)",
  background: "rgb(1, 126, 252)",
  whiteSpace: "nowrap",
});

const tdStyle = (col, extra = {}) => ({
  padding: "12px 14px",
  fontSize: "13px",
  verticalAlign: "middle",
  textAlign: col.align,
  ...extra,
});

// ── Photo avatar (table cell) ─────────────────────────────────────────────────
function UserAvatar({ user }) {
  const url = user.photo_url || null;
  const [imgError, setImgError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const initials = (user.username || "U").slice(0, 2).toUpperCase();

  useEffect(() => {
    setImgError(false);
    setLoaded(false);
  }, [url]);

  const avatarBase = {
    minWidth: "36px",
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    flexShrink: 0,
  };

  if (url && !imgError) {
    return (
      <div style={{ ...avatarBase, position: "relative", overflow: "hidden", border: "2px solid var(--accent)", boxSizing: "border-box" }}>
        {!loaded && (
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(90deg, var(--surface2) 25%, var(--border) 50%, var(--surface2) 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.2s infinite",
          }} />
        )}
        <img
          src={url}
          alt={user.username}
          onLoad={() => setLoaded(true)}
          onError={() => setImgError(true)}
          style={{
            width: "100%", height: "100%",
            objectFit: "cover",
            display: "block",
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.2s ease",
          }}
        />
      </div>
    );
  }

  return (
    <div style={{
      ...avatarBase,
      background: "var(--accent)",
      color: "#fff",
      display: "grid",
      placeItems: "center",
      fontSize: "13px",
      fontWeight: 700,
      border: "2px solid var(--accent)",
      boxSizing: "border-box",
    }}>
      {initials}
    </div>
  );
}

// ── Photo upload widget ───────────────────────────────────────────────────────
function PhotoUpload({ preview, existingUrl, onChange, onClear }) {
  const fileRef = useRef(null);
  const displaySrc = preview || existingUrl || null;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
      <div
        onClick={() => fileRef.current?.click()}
        style={{
          width: "72px",
          height: "72px",
          borderRadius: "50%",
          border: "2px dashed var(--border)",
          overflow: "hidden",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--surface2)",
          flexShrink: 0,
          transition: "border-color 0.2s",
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"}
        onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
        title="Click to upload photo"
      >
        {displaySrc ? (
          <img src={displaySrc} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ fontSize: "26px", lineHeight: 1 }}>📷</span>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          style={{
            padding: "6px 14px",
            fontSize: "12px",
            fontWeight: 600,
            borderRadius: "6px",
            border: "1px solid var(--accent)",
            color: "black",
            background: "transparent",
            cursor: "pointer",
          }}
        >
          {displaySrc ? "Change Photo" : "Upload Photo"}
        </button>
        {displaySrc && (
          <button
            type="button"
            onClick={onClear}
            style={{
              padding: "5px 14px",
              fontSize: "11px",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              color: "var(--muted)",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            Remove
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > 5 * 1024 * 1024) {
            alert("Photo must be under 5 MB.");
            return;
          }
          onChange(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function RegisteredUsers() {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editErrors, setEditErrors] = useState({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const editSubmitInFlight = useRef(false);
  const [editSuccess, setEditSuccess] = useState(false);
  const [showEditPwd, setShowEditPwd] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newBranchMode, setNewBranchMode] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchError, setNewBranchError] = useState("");
  const [creatingBranch, setCreatingBranch] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const deleteInFlight = useRef(false);

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setApiError("");
    try {
      const data = await getUsers();
      setUsers(data.results || []);
    } catch (err) {
      setApiError("Failed to load users. Please try again.");
      console.error("Fetch users error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBranches = useCallback(async () => {
    try {
      const data = await getBranches();
      let list = [];
      if (Array.isArray(data)) list = data;
      else if (data.results && Array.isArray(data.results)) list = data.results;
      else if (data.data && Array.isArray(data.data)) list = data.data;
      setBranches(list);
    } catch (err) {
      console.error("Failed to fetch branches:", err);
      setApiError("Failed to load branches. Please refresh the page.");
    }
  }, []);

  useEffect(() => { fetchUsers(); fetchBranches(); }, [fetchUsers, fetchBranches]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const handleInput = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(er => ({ ...er, [name]: "" }));
  };

  const handleSelect = (name) => (value) => {
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(er => ({ ...er, [name]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.username.trim()) e.username = "Username is required";
    if (!form.address.trim()) e.address = "Address is required";
    if (!form.phone.trim()) e.phone = "Phone number is required";
    else if (!/^\+?[\d\s\-()]{7,15}$/.test(form.phone)) e.phone = "Invalid phone number";
    if (!form.branch) e.branch = "Please select a branch";
    if (!form.password) e.password = "Password is required";
    if (form.password && form.password.length < 8) e.password = "Password must be at least 8 characters";
    if (!form.role) e.role = "Please select a role";
    if (!form.status) e.status = "Please select a status";
    return e;
  };

  const getBranchName = (branchId) => {
    if (!branchId) return "—";
    const b = branches.find(b => b.id === parseInt(branchId) || b.id === branchId);
    return b ? b.name : branchId;
  };

  // ── Photo helpers ───────────────────────────────────────────────────────────
  const handlePhotoChange = (file) => {
    const preview = URL.createObjectURL(file);
    setForm(f => ({ ...f, photo: file, photoPreview: preview }));
  };

  const handlePhotoClear = () => {
    if (form.photoPreview) URL.revokeObjectURL(form.photoPreview);
    setForm(f => ({ ...f, photo: null, photoPreview: "" }));
  };

  const handleEditPhotoChange = (file) => {
    const preview = URL.createObjectURL(file);
    setEditForm(f => ({ ...f, photo: file, photoPreview: preview }));
  };

  const handleEditPhotoClear = () => {
    if (editForm.photoPreview) URL.revokeObjectURL(editForm.photoPreview);
    setEditForm(f => ({ ...f, photo: null, photoPreview: "" }));
  };

  // ── Submit: POST ────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }
    setSubmitting(true);
    setApiError("");
    try {
      const userData = {
        username: form.username.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        password: form.password,
        branch_id: parseInt(form.branch, 10),
        role: form.role,
        status: form.status,
        ...(form.photo ? { photo: form.photo } : {}),
      };
      await createUser(userData);
      setSuccess(true);
      await fetchUsers();
      setTimeout(() => {
        setSuccess(false);
        setOpen(false);
        if (form.photoPreview) URL.revokeObjectURL(form.photoPreview);
        setForm(EMPTY_FORM);
        setShowPwd(false);
        setErrors({});
      }, 1500);
    } catch (err) {
      const fieldErrors = {};
      const knownFields = ["username", "address", "phone", "branch_id", "role", "status"];
      knownFields.forEach(field => {
        if (err[field]) {
          fieldErrors[field === "branch_id" ? "branch" : field] =
            Array.isArray(err[field]) ? err[field][0] : err[field];
        }
      });
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        setApiError("Please fix the highlighted fields.");
      } else if (err.detail) {
        setApiError(err.detail);
      } else if (err.non_field_errors) {
        setApiError(Array.isArray(err.non_field_errors) ? err.non_field_errors[0] : err.non_field_errors);
      } else {
        setApiError("Failed to create user. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = (user) => setDeleteConfirm({ id: user.id, username: user.username });

  const confirmDelete = async () => {
    if (!deleteConfirm || deleteInFlight.current) return;
    deleteInFlight.current = true;
    setDeleting(true);
    setApiError("");
    try {
      await deleteUser(deleteConfirm.id);
    } catch (err) {
      if (err?._status !== 404) {
        console.error("Delete user error:", err);
        setApiError(err?.detail || "Failed to delete user. Please try again.");
        setDeleteConfirm(null);
        setDeleting(false);
        deleteInFlight.current = false;
        return;
      }
    }
    setUsers(prev => prev.filter(u => u.id !== deleteConfirm.id));
    setDeleteConfirm(null);
    setDeleting(false);
    deleteInFlight.current = false;
    fetchUsers();
  };

  const handleClose = () => {
    setOpen(false);
    if (form.photoPreview) URL.revokeObjectURL(form.photoPreview);
    setForm(EMPTY_FORM);
    setShowPwd(false);
    setErrors({});
    setSuccess(false);
    setApiError("");
    setNewBranchMode(false);
    setNewBranchName("");
    setNewBranchError("");
  };

  // ── Edit ────────────────────────────────────────────────────────────────────
  const handleOpenEdit = (user) => {
    setEditingUser(user);
    const branchVal = user.branch_id ?? user.branch ?? null;
    setEditForm({
      username: user.username || "",
      address: user.address || "",
      phone: user.phone || "",
      branch: branchVal != null ? String(branchVal) : "",
      password: "",
      role: user.role || "",
      status: user.status || "",
      photo: null,
      photoPreview: "",
    });
    setEditErrors({});
    setEditSuccess(false);
    setShowEditPwd(false);
    setEditOpen(true);
  };

  const handleCloseEdit = () => {
    setEditOpen(false);
    setEditingUser(null);
    if (editForm.photoPreview) URL.revokeObjectURL(editForm.photoPreview);
    setEditForm(EMPTY_FORM);
    setEditErrors({});
    setEditSuccess(false);
    setShowEditPwd(false);
    editSubmitInFlight.current = false;
  };

  const validateEdit = () => {
    const e = {};
    if (!editForm.username.trim()) e.username = "Username is required";
    if (!editForm.address.trim()) e.address = "Address is required";
    if (!editForm.phone.trim()) e.phone = "Phone number is required";
    else if (!/^\+?[\d\s\-()]{7,15}$/.test(editForm.phone)) e.phone = "Invalid phone number";
    if (!editForm.branch) e.branch = "Please select a branch";
    if (!editForm.role) e.role = "Please select a role";
    if (!editForm.status) e.status = "Please select a status";
    if (editForm.password && editForm.password.length < 8) e.password = "Password must be at least 8 characters";
    return e;
  };

  const handleEditSubmit = async () => {
    if (editSubmitInFlight.current) return;
    editSubmitInFlight.current = true;
    const validationErrors = validateEdit();
    if (Object.keys(validationErrors).length > 0) {
      setEditErrors(validationErrors);
      editSubmitInFlight.current = false;
      return;
    }
    setEditSubmitting(true);
    setApiError("");
    try {
      const payload = {
        username: editForm.username.trim(),
        address: editForm.address.trim(),
        phone: editForm.phone.trim(),
        branch_id: parseInt(editForm.branch, 10),
        role: editForm.role,
        status: editForm.status,
        ...(editForm.password ? { password: editForm.password } : {}),
        ...(editForm.photo ? { photo: editForm.photo } : {}),
      };
      const updated = await patchUser(editingUser.id, payload);
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...updated } : u));
      await fetchUsers();
      setEditSuccess(true);
      setTimeout(() => { handleCloseEdit(); }, 1200);
    } catch (err) {
      console.error("Edit user error:", err);
      if (err?._status === 404) {
        handleCloseEdit();
        setApiError("That user no longer exists and has been removed from the list.");
        await fetchUsers();
        return;
      }
      const fieldErrors = {};
      const knownFields = ["username", "address", "phone", "password", "branch_id", "role", "status"];
      knownFields.forEach(field => {
        if (err[field]) {
          fieldErrors[field === "branch_id" ? "branch" : field] =
            Array.isArray(err[field]) ? err[field][0] : err[field];
        }
      });
      if (Object.keys(fieldErrors).length > 0) {
        setEditErrors(fieldErrors);
        setApiError("Please fix the highlighted fields.");
      } else if (err.detail) {
        setApiError(err.detail);
      } else if (err.non_field_errors) {
        setApiError(Array.isArray(err.non_field_errors) ? err.non_field_errors[0] : err.non_field_errors);
      } else {
        setApiError("Failed to update user. Please try again.");
      }
    } finally {
      editSubmitInFlight.current = false;
      setEditSubmitting(false);
    }
  };

  // ── Inline branch creation ─────────────────────────────────────────────────
  const handleCreateBranch = async () => {
    const name = newBranchName.trim();
    if (!name) { setNewBranchError("Branch name is required."); return; }
    setCreatingBranch(true);
    setNewBranchError("");
    try {
      const created = await createBranch({ name });
      setBranches(prev => [...prev, created]);
      setForm(f => ({ ...f, branch: String(created.id) }));
      setNewBranchMode(false);
      setNewBranchName("");
      if (errors.branch) setErrors(e => ({ ...e, branch: "" }));
    } catch (err) {
      setNewBranchError(err?.name?.[0] || err?.detail || "Failed to create branch.");
    } finally {
      setCreatingBranch(false);
    }
  };

  const inputStyle = (err) => ({
    width: "100%",
    padding: "9px 12px",
    border: `1px solid ${err ? "var(--red)" : "var(--border)"}`,
    borderRadius: "6px",
    fontSize: "13px",
    fontFamily: "var(--ff)",
    background: "var(--surface)",
    outline: "none",
    transition: "border-color 0.2s",
    boxSizing: "border-box",
  });

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "var(--surface)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&display=swap');
        :root {
          --ff: 'Google Sans', sans-serif;
          --ffd: 'Google Sans', sans-serif;
        }
        *, *::before, *::after { font-family: 'Google Sans', sans-serif !important; box-sizing: border-box; }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @media (max-width: 768px) {
          .user-table-container { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .user-table { min-width: 600px; }
          .header-title { font-size: 18px !important; }
          .add-user-btn { padding: 6px 14px !important; font-size: 13px !important; }
          .modal-content { width: 95vw !important; max-height: 90vh !important; }
          .modal-padding { padding: 16px 20px !important; }
          .form-group { margin-bottom: 14px !important; }
          .form-label { font-size: 13px !important; }
          .form-input, .form-select { padding: 8px 10px !important; font-size: 16px !important; }
          .branch-inline { flex-wrap: wrap !important; }
          .branch-input { min-width: 120px !important; }
          .modal-actions { padding: 12px 20px !important; }
          .delete-modal { width: 85vw !important; }
        }
        /* Mobile card layout — hides table, shows cards */
        @media (max-width: 480px) {
          .user-table-wrapper { display: none !important; }
          .user-cards { display: flex !important; }
        }
        @media (min-width: 481px) {
          .user-cards { display: none !important; }
          .user-table-wrapper { display: block !important; }
        }
        .user-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        }
        .user-card-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .user-card-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          flex-shrink: 0;
          min-width: 60px;
        }
        .user-card-value {
          font-size: 13px;
          color: var(--text);
          text-align: right;
          word-break: break-word;
        }
        @media (max-width: 600px) {
          /* Header stacks vertically */
          .header-container {
            flex-direction: column !important;
            align-items: flex-start !important;
            padding: 12px 16px !important;
            gap: 10px !important;
          }
          .header-title { font-size: 20px !important; }
          .add-user-btn {
            width: 100% !important;
            justify-content: center !important;
            padding: 10px 18px !important;
            font-size: 14px !important;
            display: flex !important;
            align-items: center !important;
          }
          /* Hide less-critical columns on mobile */
          .col-hide-mobile { display: none !important; }
          /* Table min-width tight for visible columns */
          .user-table { min-width: 360px !important; }
          /* Modal full-width on mobile */
          .modal-content { width: 98vw !important; max-height: 95vh !important; border-radius: 10px !important; }
          .modal-header { padding: 16px 18px !important; }
          .modal-title { font-size: 18px !important; }
          .modal-subtitle { font-size: 12px !important; }
          .modal-padding { padding: 14px 16px !important; gap: 12px !important; }
          .modal-actions {
            padding: 12px 16px !important;
            flex-direction: row !important;
          }
          .btn-cancel, .btn-submit {
            flex: 1 !important;
            text-align: center !important;
            padding: 9px 12px !important;
            font-size: 13px !important;
          }
          /* Prevent iOS zoom on inputs */
          .form-input, .form-select { font-size: 16px !important; }
          .api-error-banner { padding: 8px 14px !important; font-size: 12px !important; }
          .success-toast { font-size: 11px !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid var(--border)", background: "var(--surface)", flexShrink: 0, flexWrap: "wrap", gap: 10 }} className="header-container">
        <div style={{ fontSize: "25px", fontWeight: 600, color: "black" }} className="header-title">Registered Users</div>
        <button className="btn btn-p add-user-btn" onClick={() => setOpen(true)} style={{ padding: "8px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: "var(--ff)" }}>+ Add User</button>
      </div>

      {/* API Error Banner */}
      {apiError && (
        <div style={{ background: "var(--red-lt)", color: "var(--red)", padding: "10px 24px", fontSize: "13px", display: "flex", justifyContent: "space-between", alignItems: "center" }} className="api-error-banner">
          <span>{apiError}</span>
          <button onClick={() => setApiError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)", fontWeight: 700, fontSize: "18px" }}>×</button>
        </div>
      )}

      {/* Table */}
      <div style={{ flex: 1, overflowX: "auto", overflowY: "auto", minHeight: 0 }} className="user-table-container">
        {/* Desktop/tablet table */}
        <div className="user-table-wrapper">
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "auto" }} className="user-table">
          <colgroup>{COLS.map(col => <col key={col.key} style={{ width: col.width }} />)}</colgroup>
          <thead style={{ position: "sticky", top: 0, zIndex: 5 }}>
            <tr>{COLS.map(col => (
              <th
                key={col.key}
                className={["address","phone"].includes(col.key) ? "col-hide-mobile" : ""}
                style={thStyle(col)}
              >{col.label}</th>
            ))}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={COLS.length} style={{ textAlign: "center", padding: "80px 20px", color: "var(--muted)", fontSize: "18px" }}>Loading users…</td></tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={COLS.length} style={{ textAlign: "center", padding: "80px 20px", color: "var(--muted)" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "48px", opacity: 0.4 }}>👥</span>
                    <span style={{ fontSize: "18px" }}>No users added yet. Click <strong style={{ color: "var(--accent)" }}>Add User</strong> to create one.</span>
                  </div>
                </td>
              </tr>
            ) : (
              users.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={tdStyle(COLS[0], { color: "var(--muted)" })}>{i + 1}</td>
                  <td style={tdStyle(COLS[1])}>
                    <div style={{ display: "flex", alignItems: "center", gap: "9px", overflow: "hidden" }}>
                      <UserAvatar user={u} />
                      <span style={{ fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "13px" }}>{u.username}</span>
                    </div>
                  </td>
                  <td className="col-hide-mobile" style={tdStyle(COLS[2], { color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" })} title={u.address}>{u.address}</td>
                  <td className="col-hide-mobile" style={tdStyle(COLS[3])}>{u.phone}</td>
                  <td style={tdStyle(COLS[4], { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" })} title={u.branch_name || getBranchName(u.branch_id) || "—"}>
                    {u.branch_name || getBranchName(u.branch_id) || "—"}
                  </td>
                  <td style={tdStyle(COLS[5])}>{u.role}</td>
                  <td style={tdStyle(COLS[6])}>
                    <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: "6px", fontSize: "14px", fontWeight: 600, background: u.status === "Active" ? "#058b46" : "#921212", color: u.status === "Active" ? "#f7faf9" : "#faf8f8" }}>
                      {u.status}
                    </span>
                  </td>
                  <td style={tdStyle(COLS[7])}>
                    <div style={{ display: "flex", gap: "5px", justifyContent: "center" }}>
                      <button onClick={() => handleOpenEdit(u)} style={{ background: "var(--accent)", border: "1px solid var(--border)", color: "white", cursor: "pointer", fontSize: "14px", fontWeight: 600, padding: "4px 10px", borderRadius: "6px", transition: "background 0.15s" }}>Edit</button>
                      <button onClick={() => handleDelete(u)} style={{ background: "var(--red)", border: "none", color: "white", cursor: "pointer", fontSize: "14px", fontWeight: 600, padding: "4px 10px", borderRadius: "6px", transition: "background 0.15s" }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>{/* end user-table-wrapper */}

        {/* Mobile card list (≤480px) */}
        <div className="user-cards" style={{ flexDirection: "column", gap: "10px", padding: "12px 14px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)", fontSize: "15px" }}>Loading users…</div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
              <div style={{ fontSize: "40px", marginBottom: "10px", opacity: 0.4 }}>👥</div>
              <div style={{ fontSize: "15px" }}>No users yet. Tap <strong style={{ color: "var(--accent)" }}>+ Add User</strong> above.</div>
            </div>
          ) : (
            users.map((u, i) => (
              <div key={u.id} className="user-card">
                {/* Top row: avatar + name + status */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <UserAvatar user={u} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.username}</div>
                    <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>{u.role}</div>
                  </div>
                  <span style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, background: u.status === "Active" ? "#058b46" : "#921212", color: "#fff", flexShrink: 0 }}>
                    {u.status}
                  </span>
                </div>
                {/* Details */}
                <div className="user-card-row">
                  <span className="user-card-label">Branch</span>
                  <span className="user-card-value">{u.branch_name || getBranchName(u.branch_id) || "—"}</span>
                </div>
                <div className="user-card-row">
                  <span className="user-card-label">Phone</span>
                  <span className="user-card-value">{u.phone || "—"}</span>
                </div>
                <div className="user-card-row">
                  <span className="user-card-label">Address</span>
                  <span className="user-card-value" style={{ maxWidth: "65%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={u.address}>{u.address || "—"}</span>
                </div>
                {/* Actions */}
                <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                  <button onClick={() => handleOpenEdit(u)} style={{ flex: 1, background: "var(--accent)", border: "none", color: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: 600, padding: "8px 0", borderRadius: "6px" }}>Edit</button>
                  <button onClick={() => handleDelete(u)} style={{ flex: 1, background: "var(--red)", border: "none", color: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: 600, padding: "8px 0", borderRadius: "6px" }}>Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(2px)" }} onClick={handleClose}>
          <div style={{ background: "var(--surface)", borderRadius: "12px", width: "min(650px, 92vw)", maxHeight: "88vh", overflowY: "auto", boxShadow: "0 25px 50px rgba(0,0,0,0.25)" }} onClick={e => e.stopPropagation()} className="modal-content">
            <div style={{ padding: "22px 28px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }} className="modal-header">
              <div>
                <h2 style={{ fontSize: "25px", fontFamily: "var(--ffd)", color: "black", marginBottom: "4px" }} className="modal-title">Add New User</h2>
                <p style={{ fontSize: "13px", color: "var(--muted)" }} className="modal-subtitle">Fill in the details to create a new user account.</p>
              </div>
              <button onClick={handleClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "24px", lineHeight: 1, padding: "2px 6px" }}>×</button>
            </div>
            <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: "16px" }} className="modal-padding">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <PhotoUpload preview={form.photoPreview} existingUrl={null} onChange={handlePhotoChange} onClear={handlePhotoClear} />
              </div>
              <div className="form-group">
                <label style={{ display: "block", fontSize: "16px", fontWeight: 600, color: "black", marginBottom: "6px", textAlign: "left" }} className="form-label">Username <span style={{ color: "var(--red)" }}>*</span></label>
                <input name="username" type="text" value={form.username} onChange={handleInput} placeholder="e.g. john_doe" style={inputStyle(errors.username)} className="form-input" />
                {errors.username && <p style={{ fontSize: "12px", color: "var(--red)", marginTop: "4px" }}>{errors.username}</p>}
              </div>
              <div className="form-group">
                <label style={{ display: "block", fontSize: "16px", fontWeight: 600, color: "black", marginBottom: "6px", textAlign: "left" }} className="form-label">Password <span style={{ color: "var(--red)" }}>*</span></label>
                <div style={{ position: "relative" }}>
                  <input name="password" type={showPwd ? "text" : "password"} value={form.password} onChange={handleInput} placeholder="Min. 8 characters" style={{ ...inputStyle(errors.password), paddingRight: "40px" }} className="form-input" />
                  <button type="button" onClick={() => setShowPwd(v => !v)} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex", alignItems: "center" }}>
                    {showPwd ? <VisibilityOffOutlinedIcon style={{ fontSize: 18 }} /> : <VisibilityOutlinedIcon style={{ fontSize: 18 }} />}
                  </button>
                </div>
                {errors.password && <p style={{ fontSize: "12px", color: "var(--red)", marginTop: "4px" }}>{errors.password}</p>}
              </div>
              <div className="form-group">
                <label style={{ display: "block", fontSize: "16px", fontWeight: 600, color: "black", marginBottom: "6px", textAlign: "left" }} className="form-label">Address <span style={{ color: "var(--red)" }}>*</span></label>
                <input name="address" type="text" value={form.address} onChange={handleInput} placeholder="Full address" style={inputStyle(errors.address)} className="form-input" />
                {errors.address && <p style={{ fontSize: "12px", color: "var(--red)", marginTop: "4px" }}>{errors.address}</p>}
              </div>
              <div className="form-group">
                <label style={{ display: "block", fontSize: "16px", fontWeight: 600, color: "black", marginBottom: "6px", textAlign: "left" }} className="form-label">Phone <span style={{ color: "var(--red)" }}>*</span></label>
                <input name="phone" type="tel" value={form.phone} onChange={handleInput} placeholder="+91 98765 43210" style={inputStyle(errors.phone)} className="form-input" />
                {errors.phone && <p style={{ fontSize: "12px", color: "var(--red)", marginTop: "4px" }}>{errors.phone}</p>}
              </div>
              <div className="form-group">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <label style={{ fontSize: "16px", fontWeight: 600, color: "black" }} className="form-label">Branch <span style={{ color: "var(--red)" }}>*</span></label>
                  {!newBranchMode && (
                    <button type="button" onClick={() => { setNewBranchMode(true); setNewBranchName(""); setNewBranchError(""); }} style={{ fontSize: "14px", fontWeight: 600, color: "black", background: "none", border: "none", cursor: "pointer", padding: 0 }}>+ New Branch</button>
                  )}
                </div>
                {newBranchMode ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }} className="branch-inline">
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <input autoFocus value={newBranchName} onChange={e => { setNewBranchName(e.target.value); setNewBranchError(""); }} onKeyDown={e => { if (e.key === "Enter") handleCreateBranch(); if (e.key === "Escape") setNewBranchMode(false); }} placeholder="Branch name e.g. SYSMAC" style={{ ...inputStyle(newBranchError), flex: 1 }} className="branch-input" />
                      <button type="button" onClick={handleCreateBranch} disabled={creatingBranch} style={{ padding: "8px 14px", borderRadius: "6px", border: "none", background: "var(--accent)", color: "#fff", fontSize: "12px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", opacity: creatingBranch ? 0.7 : 1 }}>{creatingBranch ? "Saving…" : "Save"}</button>
                      <button type="button" onClick={() => { setNewBranchMode(false); setNewBranchName(""); setNewBranchError(""); }} style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface)", fontSize: "12px", cursor: "pointer", color: "var(--muted)" }}>Cancel</button>
                    </div>
                    {newBranchError && <p style={{ fontSize: "11px", color: "var(--red)", margin: 0 }}>{newBranchError}</p>}
                  </div>
                ) : (
                  <select value={form.branch} onChange={e => handleSelect("branch")(e.target.value)} style={inputStyle(errors.branch)} className="form-select">
                    <option value="">{branches.length === 0 ? "No branches — create one above" : "Select Branch"}</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                )}
                {errors.branch && <p style={{ fontSize: "11px", color: "var(--red)", marginTop: "4px" }}>{errors.branch}</p>}
              </div>
              <div className="form-group">
                <label style={{ display: "block", fontSize: "16px", fontWeight: 600, color: "black", marginBottom: "6px", textAlign: "left" }} className="form-label">Role <span style={{ color: "var(--red)" }}>*</span></label>
                <select value={form.role} onChange={e => handleSelect("role")(e.target.value)} style={inputStyle(errors.role)} className="form-select">
                  <option value="">Select role</option>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                {errors.role && <p style={{ fontSize: "12px", color: "var(--red)", marginTop: "4px" }}>{errors.role}</p>}
              </div>
              <div className="form-group">
                <label style={{ display: "block", fontSize: "16px", fontWeight: 600, color: "black", marginBottom: "6px", textAlign: "left" }} className="form-label">Status <span style={{ color: "var(--red)" }}>*</span></label>
                <select value={form.status} onChange={e => handleSelect("status")(e.target.value)} style={inputStyle(errors.status)} className="form-select">
                  <option value="">Select status</option>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.status && <p style={{ fontSize: "12px", color: "var(--red)", marginTop: "4px" }}>{errors.status}</p>}
              </div>
            </div>
            <div style={{ padding: "16px 28px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "10px", position: "relative" }} className="modal-actions">
              {success && (
                <div style={{ position: "absolute", top: "-44px", left: "50%", transform: "translateX(-50%)", background: "var(--green)", color: "#fff", padding: "7px 16px", borderRadius: "8px", fontSize: "13px", whiteSpace: "nowrap" }} className="success-toast">✓ User added successfully!</div>
              )}
              <button className="btn btn-g btn-cancel" onClick={handleClose} disabled={submitting} style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer" }}>Cancel</button>
              <button className="btn btn-p btn-submit" onClick={handleSubmit} disabled={success || submitting} style={{ padding: "8px 20px", borderRadius: "6px", border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", fontWeight: 500 }}>{submitting ? "Creating..." : "Create User"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(2px)" }} onClick={handleCloseEdit}>
          <div style={{ background: "var(--surface)", borderRadius: "12px", width: "min(650px, 92vw)", maxHeight: "88vh", overflowY: "auto", boxShadow: "0 25px 50px rgba(0,0,0,0.25)", animation: "slideUp 0.2s ease" }} onClick={e => e.stopPropagation()} className="modal-content">
            <div style={{ padding: "22px 28px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }} className="modal-header">
              <div>
                <h2 style={{ fontSize: "20px", fontFamily: "var(--ffd)", color: "var(--accent)", marginBottom: "4px" }} className="modal-title">Edit User</h2>
                <p style={{ fontSize: "13px", color: "var(--muted)" }} className="modal-subtitle">Update the details for <strong>{editingUser?.username}</strong>.</p>
              </div>
              <button onClick={handleCloseEdit} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "24px", lineHeight: 1, padding: "2px 6px" }}>×</button>
            </div>
            <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: "16px" }} className="modal-padding">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <PhotoUpload preview={editForm.photoPreview} existingUrl={editingUser?.photo_url || null} onChange={handleEditPhotoChange} onClear={handleEditPhotoClear} />
              </div>
              <div className="form-group">
                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "var(--accent)", marginBottom: "6px", textAlign: "left" }} className="form-label">Username <span style={{ color: "var(--red)" }}>*</span></label>
                <input name="username" type="text" value={editForm.username} onChange={e => { setEditForm(f => ({ ...f, username: e.target.value })); if (editErrors.username) setEditErrors(er => ({ ...er, username: "" })); }} placeholder="e.g. john_doe" style={inputStyle(editErrors.username)} className="form-input" />
                {editErrors.username && <p style={{ fontSize: "11px", color: "var(--red)", marginTop: "4px" }}>{editErrors.username}</p>}
              </div>
              <div className="form-group">
                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "var(--accent)", marginBottom: "6px", textAlign: "left" }} className="form-label">Password <span style={{ color: "var(--muted)", fontWeight: 400 }}>(leave blank to keep current)</span></label>
                <div style={{ position: "relative" }}>
                  <input name="password" type={showEditPwd ? "text" : "password"} value={editForm.password} onChange={e => { setEditForm(f => ({ ...f, password: e.target.value })); if (editErrors.password) setEditErrors(er => ({ ...er, password: "" })); }} placeholder="New password (optional)" style={{ ...inputStyle(editErrors.password), paddingRight: "40px" }} className="form-input" />
                  <button type="button" onClick={() => setShowEditPwd(v => !v)} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex", alignItems: "center" }}>
                    {showEditPwd ? <VisibilityOffOutlinedIcon style={{ fontSize: 18 }} /> : <VisibilityOutlinedIcon style={{ fontSize: 18 }} />}
                  </button>
                </div>
                {editErrors.password && <p style={{ fontSize: "11px", color: "var(--red)", marginTop: "4px" }}>{editErrors.password}</p>}
              </div>
              <div className="form-group">
                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "var(--accent)", marginBottom: "6px", textAlign: "left" }} className="form-label">Address <span style={{ color: "var(--red)" }}>*</span></label>
                <input name="address" type="text" value={editForm.address} onChange={e => { setEditForm(f => ({ ...f, address: e.target.value })); if (editErrors.address) setEditErrors(er => ({ ...er, address: "" })); }} placeholder="Full address" style={inputStyle(editErrors.address)} className="form-input" />
                {editErrors.address && <p style={{ fontSize: "11px", color: "var(--red)", marginTop: "4px" }}>{editErrors.address}</p>}
              </div>
              <div className="form-group">
                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "var(--accent)", marginBottom: "6px", textAlign: "left" }} className="form-label">Phone <span style={{ color: "var(--red)" }}>*</span></label>
                <input name="phone" type="tel" value={editForm.phone} onChange={e => { setEditForm(f => ({ ...f, phone: e.target.value })); if (editErrors.phone) setEditErrors(er => ({ ...er, phone: "" })); }} placeholder="+91 98765 43210" style={inputStyle(editErrors.phone)} className="form-input" />
                {editErrors.phone && <p style={{ fontSize: "11px", color: "var(--red)", marginTop: "4px" }}>{editErrors.phone}</p>}
              </div>
              <div className="form-group">
                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "var(--accent)", marginBottom: "6px", textAlign: "left" }} className="form-label">Branch <span style={{ color: "var(--red)" }}>*</span></label>
                <select value={editForm.branch} onChange={e => { setEditForm(f => ({ ...f, branch: e.target.value })); if (editErrors.branch) setEditErrors(er => ({ ...er, branch: "" })); }} style={inputStyle(editErrors.branch)} className="form-select">
                  <option value="">Select Branch</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                {editErrors.branch && <p style={{ fontSize: "11px", color: "var(--red)", marginTop: "4px" }}>{editErrors.branch}</p>}
              </div>
              <div className="form-group">
                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "var(--accent)", marginBottom: "6px", textAlign: "left" }} className="form-label">Role <span style={{ color: "var(--red)" }}>*</span></label>
                <select value={editForm.role} onChange={e => { setEditForm(f => ({ ...f, role: e.target.value })); if (editErrors.role) setEditErrors(er => ({ ...er, role: "" })); }} style={inputStyle(editErrors.role)} className="form-select">
                  <option value="">Select role</option>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                {editErrors.role && <p style={{ fontSize: "11px", color: "var(--red)", marginTop: "4px" }}>{editErrors.role}</p>}
              </div>
              <div className="form-group">
                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "var(--accent)", marginBottom: "6px", textAlign: "left" }} className="form-label">Status <span style={{ color: "var(--red)" }}>*</span></label>
                <select value={editForm.status} onChange={e => { setEditForm(f => ({ ...f, status: e.target.value })); if (editErrors.status) setEditErrors(er => ({ ...er, status: "" })); }} style={inputStyle(editErrors.status)} className="form-select">
                  <option value="">Select status</option>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {editErrors.status && <p style={{ fontSize: "11px", color: "var(--red)", marginTop: "4px" }}>{editErrors.status}</p>}
              </div>
            </div>
            <div style={{ padding: "16px 28px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "10px", position: "relative" }} className="modal-actions">
              {editSuccess && (
                <div style={{ position: "absolute", top: "-44px", left: "50%", transform: "translateX(-50%)", background: "var(--green)", color: "#fff", padding: "7px 16px", borderRadius: "8px", fontSize: "13px", whiteSpace: "nowrap" }} className="success-toast">✓ User updated successfully!</div>
              )}
              <button onClick={handleCloseEdit} disabled={editSubmitting} className="btn-cancel" style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleEditSubmit} disabled={editSubmitting || editSuccess} className="btn-submit" style={{ padding: "8px 20px", borderRadius: "6px", border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", fontWeight: 500 }}>{editSubmitting ? "Saving..." : "Save Changes"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, backdropFilter: "blur(2px)" }} onClick={() => !deleting && setDeleteConfirm(null)}>
          <div style={{ background: "var(--surface)", borderRadius: "12px", width: "min(420px, 90vw)", boxShadow: "0 25px 50px rgba(0,0,0,0.3)", animation: "slideUp 0.18s ease", overflow: "hidden" }} onClick={e => e.stopPropagation()} className="delete-modal">
            <div style={{ padding: "28px 28px 20px", textAlign: "center" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>🗑️</div>
              <h3 style={{ fontSize: "17px", fontWeight: 700, color: "var(--text)", marginBottom: "8px" }}>Delete User?</h3>
              <p style={{ fontSize: "13px", color: "var(--muted)", lineHeight: 1.5 }}>This will permanently delete <strong style={{ color: "var(--text)" }}>{deleteConfirm.username}</strong>. This action cannot be undone.</p>
            </div>
            <div style={{ padding: "0 28px 24px", display: "flex", gap: "10px", justifyContent: "center" }}>
              <button onClick={() => setDeleteConfirm(null)} disabled={deleting} style={{ padding: "9px 22px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", fontSize: "13px", fontWeight: 500, color: "var(--text)" }}>Cancel</button>
              <button onClick={confirmDelete} disabled={deleting} style={{ padding: "9px 22px", borderRadius: "8px", border: "none", background: "var(--red)", color: "#fff", cursor: deleting ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: 600, opacity: deleting ? 0.7 : 1 }}>{deleting ? "Deleting…" : "Yes, Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}