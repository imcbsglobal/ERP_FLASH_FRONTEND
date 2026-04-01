import { useState, useEffect, useCallback, useRef } from "react";
import { getUsers, createUser, deleteUser, patchUser, getBranches, createBranch } from "../service/user";
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';

// ── Constants ─────────────────────────────────────────────────────────────────
const ROLES    = ["Admin", "Manager", "Operator", "Viewer", "Support", "Auditor"];
const STATUSES = ["Active", "Inactive"];
const EMPTY_FORM = { username: "", address: "", phone: "", branch: "", password: "", role: "", status: "" };

const calcStrength = (pwd) => {
  let s = 0;
  if (pwd.length >= 8)          s++;
  if (/[A-Z]/.test(pwd))        s++;
  if (/[0-9]/.test(pwd))        s++;
  if (/[^a-zA-Z0-9]/.test(pwd)) s++;
  return s;
};

const strengthMeta = (s) => {
  if (s === 0) return { label: "",       color: "" };
  if (s === 1) return { label: "Weak",   color: "var(--red)" };
  if (s === 2) return { label: "Fair",   color: "#f59e0b" };
  if (s === 3) return { label: "Good",   color: "#3b82f6" };
  return              { label: "Strong", color: "var(--green)" };
};

// ── Column definitions in the specified order ─────────────────────────────────
const COLS = [
  { key: "sl",       label: "Sl.No",    width: "5%",  align: "center" },
  { key: "username", label: "Username", width: "12%", align: "left"   },
  { key: "password", label: "Password", width: "12%", align: "left"   },
  { key: "address",  label: "Address",  width: "18%", align: "left"   },
  { key: "phone",    label: "Phone",    width: "11%", align: "left"   },
  { key: "branch",   label: "Branch",   width: "12%", align: "left"   },
  { key: "role",     label: "Role",     width: "9%",  align: "left"   },
  { key: "status",   label: "Status",   width: "8%",  align: "center" },
  { key: "action",   label: "Action",   width: "8%",  align: "center" },
];

const thStyle = (col) => ({
  padding: "11px 14px",
  textAlign: col.align,
  fontSize: "14px",
  fontWeight: 600,
  color: "black",
  textTransform: "uppercase",
  letterSpacing: "0.8px",
  borderBottom: "1px solid var(--border)",
  background: "white",
  whiteSpace: "nowrap",
});

const tdStyle = (col, extra = {}) => ({
  padding: "12px 14px",
  fontSize: "13px",
  verticalAlign: "middle",
  textAlign: col.align,
  ...extra,
});

// ── Component ─────────────────────────────────────────────────────────────────
export default function RegisteredUsers() {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  // ── Edit state ──────────────────────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editErrors, setEditErrors] = useState({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const editSubmitInFlight = useRef(false); // synchronous guard — prevents double-click races
  const [editSuccess, setEditSuccess] = useState(false);
  const [showEditPwd, setShowEditPwd] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Plain-text passwords persisted in localStorage so the eye toggle
  // works after page refresh for any user created via this UI.
  const [plainPwds, setPlainPwds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user_plain_pwds") || "{}"); }
    catch { return {}; }
  });
  
  // Initialize revealed passwords from localStorage
  const [revealedPwds, setRevealedPwds] = useState(() => {
    try { 
      const revealed = localStorage.getItem("user_revealed_pwds");
      return new Set(revealed ? JSON.parse(revealed) : []);
    } catch { 
      return new Set(); 
    }
  });

  // Keep localStorage in sync whenever plainPwds changes
  useEffect(() => {
    try { localStorage.setItem("user_plain_pwds", JSON.stringify(plainPwds)); }
    catch { /* quota exceeded — ignore */ }
  }, [plainPwds]);

  // Keep localStorage in sync whenever revealedPwds changes
  useEffect(() => {
    try { 
      localStorage.setItem("user_revealed_pwds", JSON.stringify([...revealedPwds])); 
    } catch { 
      /* ignore */ 
    }
  }, [revealedPwds]);

  const [newBranchMode, setNewBranchMode] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchError, setNewBranchError] = useState("");
  const [creatingBranch, setCreatingBranch] = useState(false);

  // ── Delete confirmation state ────────────────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, username } | null
  const [deleting, setDeleting] = useState(false);
  const deleteInFlight = useRef(false); // synchronous guard — prevents double-click / StrictMode double-invoke

  const strength = calcStrength(form.password);
  const { label: strengthLabel, color: strengthColor } = strengthMeta(strength);

  // ── Fetch users from backend ────────────────────────────────────────────────
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

  // ── Fetch branches for dropdown ─────────────────────────────────────────────
  const fetchBranches = useCallback(async () => {
    try {
      const data = await getBranches();
      let branchList = [];
      if (Array.isArray(data)) {
        branchList = data;
      } else if (data.results && Array.isArray(data.results)) {
        branchList = data.results;
      } else if (data.data && Array.isArray(data.data)) {
        branchList = data.data;
      }
      setBranches(branchList);
    } catch (err) {
      console.error("Failed to fetch branches:", err);
      setApiError("Failed to load branches. Please refresh the page.");
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchBranches();
  }, [fetchUsers, fetchBranches]);

  // ── Form handlers ───────────────────────────────────────────────────────────
  const handleInput = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(err => ({ ...err, [name]: "" }));
  };

  const handleSelect = (name) => (value) => {
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(err => ({ ...err, [name]: "" }));
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

  // ── Helper function to get branch name from branch ID ───────────────────────
  const getBranchName = (branchId) => {
    if (!branchId) return "—";
    const branch = branches.find(b => b.id === parseInt(branchId) || b.id === branchId);
    return branch ? branch.name : branchId;
  };

  // ── Submit: POST to backend ─────────────────────────────────────────────────
  const handleSubmit = async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    setApiError("");

    try {
      // Payload matches UserWriteSerializer exactly
      const userData = {
        username:  form.username.trim(),
        address:   form.address.trim(),
        phone:     form.phone.trim(),
        password:  form.password,
        branch_id: parseInt(form.branch, 10),
        role:      form.role,      // title-cased: "Admin", "Manager", …
        status:    form.status,    // "Active" | "Inactive"
      };

      const response = await createUser(userData);

      // Keep the plain-text password so the table can show/hide it
      if (response?.id) {
        setPlainPwds(prev => ({ ...prev, [String(response.id)]: form.password }));
      }

      setSuccess(true);
      await fetchUsers();

      setTimeout(() => {
        setSuccess(false);
        setOpen(false);
        setForm(EMPTY_FORM);
        setShowPwd(false);
        setErrors({});
      }, 1500);
    } catch (err) {
      // err is the parsed JSON error body (thrown by handleResponse in user.js)
      const fieldErrors = {};
      const knownFields = ["username", "address", "phone", "password", "branch_id", "role", "status"];

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

  // ── Delete: DELETE to backend ───────────────────────────────────────────────
  const handleDelete = (user) => {
    setDeleteConfirm({ id: user.id, username: user.username });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm || deleteInFlight.current) return;
    deleteInFlight.current = true;
    setDeleting(true);
    setApiError("");
    try {
      await deleteUser(deleteConfirm.id);
    } catch (err) {
      // 404 = already deleted — treat as success, don't surface an error
      if (err?._status !== 404) {
        console.error("Delete user error:", err);
        const msg = err?.detail || "Failed to delete user. Please try again.";
        setApiError(msg);
        setDeleteConfirm(null);
        setDeleting(false);
        deleteInFlight.current = false;
        return;
      }
    }
    // Remove from local state whether the API returned 200/204 or 404
    const deletedId = deleteConfirm.id;
    setUsers(prev => prev.filter(u => u.id !== deletedId));
    setPlainPwds(prev => {
      const next = { ...prev };
      delete next[String(deletedId)];
      return next;
    });
    // Also clean up revealedPwds so the eye-toggle state doesn't leak
    setRevealedPwds(prev => {
      const next = new Set(prev);
      next.delete(deletedId);
      return next;
    });
    setDeleteConfirm(null);
    setDeleting(false);
    deleteInFlight.current = false;
    // Re-sync from DB to confirm permanent deletion
    fetchUsers();
  };

  const handleClose = () => {
    setOpen(false);
    setForm(EMPTY_FORM);
    setShowPwd(false);
    setErrors({});
    setSuccess(false);
    setApiError("");
    setNewBranchMode(false);
    setNewBranchName("");
    setNewBranchError("");
  };

  // ── Open edit modal ────────────────────────────────────────────────────────
  const handleOpenEdit = (user) => {
    setEditingUser(user);
    // UserReadSerializer returns both `branch` (FK int) and `branch_id` (same value).
    // Prefer branch_id; fall back to branch so both shapes work.
    const branchVal = user.branch_id ?? user.branch ?? null;
    setEditForm({
      username:  user.username  || '',
      address:   user.address   || '',
      phone:     user.phone     || '',
      branch:    branchVal != null ? String(branchVal) : '',
      password:  '',            // leave blank — only update if filled
      role:      user.role      || '',
      status:    user.status    || '',
    });
    setEditErrors({});
    setEditSuccess(false);
    setShowEditPwd(false);
    setEditOpen(true);
  };

  const handleCloseEdit = () => {
    setEditOpen(false);
    setEditingUser(null);
    setEditForm(EMPTY_FORM);
    setEditErrors({});
    setEditSuccess(false);
    setShowEditPwd(false);
    editSubmitInFlight.current = false;
  };

  const validateEdit = () => {
    const e = {};
    if (!editForm.username.trim()) e.username = 'Username is required';
    if (!editForm.address.trim())  e.address  = 'Address is required';
    if (!editForm.phone.trim())    e.phone    = 'Phone number is required';
    else if (!/^\+?[\d\s\-()]{7,15}$/.test(editForm.phone)) e.phone = 'Invalid phone number';
    if (!editForm.branch)  e.branch = 'Please select a branch';
    if (!editForm.role)    e.role   = 'Please select a role';
    if (!editForm.status)  e.status = 'Please select a status';
    if (editForm.password && editForm.password.length < 8) e.password = 'Password must be at least 8 characters';
    return e;
  };

  // ── Submit edit: PATCH to backend ───────────────────────────────────────────
  const handleEditSubmit = async () => {
    // Ref guard fires synchronously — blocks the second click before React can
    // re-render and disable the button via the editSubmitting state update.
    if (editSubmitInFlight.current) return;
    editSubmitInFlight.current = true;

    const validationErrors = validateEdit();
    if (Object.keys(validationErrors).length > 0) {
      setEditErrors(validationErrors);
      editSubmitInFlight.current = false;
      return;
    }

    setEditSubmitting(true);
    setApiError('');

    try {
      const payload = {
        username:  editForm.username.trim(),
        address:   editForm.address.trim(),
        phone:     editForm.phone.trim(),
        branch_id: parseInt(editForm.branch, 10),
        role:      editForm.role,
        status:    editForm.status,
      };
      if (editForm.password) payload.password = editForm.password;

      const updated = await patchUser(editingUser.id, payload);

      // If password was changed, persist the plain-text copy
      if (editForm.password) {
        setPlainPwds(prev => ({ ...prev, [String(editingUser.id)]: editForm.password }));
      }

      // Merge updated fields into the list row
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...updated } : u));

      // Re-fetch to pull fresh branch_name and any server-side changes
      await fetchUsers();

      setEditSuccess(true);
      setTimeout(() => { handleCloseEdit(); }, 1200);
    } catch (err) {
      console.error('Edit user error — status:', err?._status, '| body:', err);

      // 404 means the user was deleted in another session — close and resync
      if (err?._status === 404) {
        handleCloseEdit();
        setApiError('That user no longer exists and has been removed from the list.');
        await fetchUsers();
        return;
      }

      // Mirror the same field-error handling as handleSubmit
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
        setApiError('Failed to update user. Please try again.');
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
      const msg = err?.name?.[0] || err?.detail || "Failed to create branch.";
      setNewBranchError(msg);
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

  // ── Get password to display (only for users created this session) ───────────
  const getDisplayPassword = (user) => plainPwds[String(user.id)] || null;

  // ── Toggle password visibility ─────────────────────────────────────────────
  const togglePasswordVisibility = (userId) => {
    setRevealedPwds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "var(--surface)" }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 24px",
        borderBottom: "1px solid var(--border)",
        background: "var(--surface)",
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "black" }}>Registered Users</div>
          
        </div>
        <button 
          className="btn btn-p" 
          onClick={() => setOpen(true)} 
          style={{ padding: "8px 20px", cursor: "pointer" }}
        >
          + Add User
        </button>
      </div>

      {/* API Error Banner */}
      {apiError && (
        <div style={{ background: "var(--red-lt)", color: "var(--red)", padding: "10px 24px", fontSize: "13px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{apiError}</span>
          <button onClick={() => setApiError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)", fontWeight: 700, fontSize: "18px" }}>×</button>
        </div>
      )}

      {/* Table Area */}
      <div style={{ flex: 1, overflowX: "auto", overflowY: "auto", minHeight: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <colgroup>
            {COLS.map(col => <col key={col.key} style={{ width: col.width }} />)}
          </colgroup>
          <thead style={{ position: "sticky", top: 0, zIndex: 5, background: "#1a4f1a" }}>
            <tr>
              {COLS.map(col => (
                <th key={col.key} style={thStyle(col)}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={COLS.length} style={{ textAlign: "center", padding: "80px 20px", color: "var(--muted)" }}>
                  <div style={{ fontSize: "14px" }}>Loading users…</div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={COLS.length} style={{ textAlign: "center", padding: "80px 20px", color: "var(--muted)" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "48px", opacity: 0.4 }}>👥</span>
                    <span style={{ fontSize: "14px" }}>No users added yet. Click <strong style={{ color: "var(--accent)" }}>Add User</strong> to create one.</span>
                  </div>
                </td>
              </tr>
            ) : (
              users.map((u, i) => {
                const displayPassword = getDisplayPassword(u);
                return (
                  <tr
                    key={u.id}
                    style={{ borderBottom: "1px solid var(--border)", transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    {/* Sl.No */}
                    <td style={tdStyle(COLS[0], { color: "var(--muted)" })}>{i + 1}</td>
                    
                    {/* Username */}
                    <td style={tdStyle(COLS[1])}>
                      <div style={{ display: "flex", alignItems: "center", gap: "9px", overflow: "hidden" }}>
                        <div style={{
                          minWidth: "30px",
                          width: "30px",
                          height: "30px",
                          borderRadius: "8px",
                          background: "var(--accent)",
                          color: "#fff",
                          display: "grid",
                          placeItems: "center",
                          fontSize: "15px",
                          fontWeight: 700,
                          flexShrink: 0,
                        }}>
                          {u.username?.slice(0, 2).toUpperCase() || "U"}
                        </div>
                        <span style={{ fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {u.username}
                        </span>
                      </div>
                    </td>
                    
                    {/* Password */}
                    <td style={tdStyle(COLS[2])}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{
                          fontFamily: "monospace",
                          fontSize: "13px",
                          color: revealedPwds.has(u.id) ? "var(--text)" : "var(--muted)",
                          letterSpacing: revealedPwds.has(u.id) ? "0.5px" : "2px",
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}>
                          {revealedPwds.has(u.id) ? (displayPassword || "••••••••") : "••••••••"}
                        </span>
                        <button
                          onClick={() => togglePasswordVisibility(u.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: "2px", lineHeight: 1, flexShrink: 0, display: "flex", alignItems: "center" }}
                          title={revealedPwds.has(u.id) ? "Hide password" : "Show password"}
                        >
                          {revealedPwds.has(u.id) ? <VisibilityOffOutlinedIcon style={{ fontSize: 16 }} /> : <VisibilityOutlinedIcon style={{ fontSize: 16 }} />}
                        </button>
                      </div>
                    </td>
                    
                    {/* Address */}
                    <td style={tdStyle(COLS[3], { color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" })} title={u.address}>
                      {u.address}
                    </td>
                    
                    {/* Phone */}
                    <td style={tdStyle(COLS[4])}>{u.phone}</td>
                    
                    {/* Branch */}
                    <td style={tdStyle(COLS[5], { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" })} title={u.branch_name || getBranchName(u.branch_id) || "—"}>
                      {u.branch_name || getBranchName(u.branch_id) || "—"}
                    </td>
                    
                    {/* Role */}
                    <td style={tdStyle(COLS[6])}>{u.role}</td>
                    
                    {/* Status */}
                    <td style={tdStyle(COLS[7])}>
                      <span style={{
                        display: "inline-block",
                        padding: "4px 10px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: 600,
                        background: u.status === "Active" ? "#d1fae5" : "#fee2e2",
                        color: u.status === "Active" ? "#065f46" : "#991b1b",
                      }}>
                        {u.status}
                      </span>
                    </td>
                    
                    {/* Action */}
                    <td style={tdStyle(COLS[8])}>
                      <div style={{ display: "flex", gap: "5px", justifyContent: "center" }}>
                        <button
                          onClick={() => handleOpenEdit(u)}
                          style={{ background: "none", border: "1px solid var(--border)", color: "var(--accent)", cursor: "pointer", fontSize: "12px", fontWeight: 600, padding: "4px 10px", borderRadius: "6px", transition: "background 0.15s" }}
                          onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: "12px", fontWeight: 600, padding: "4px 10px", borderRadius: "6px", transition: "background 0.15s" }}
                          onMouseEnter={e => e.currentTarget.style.background = "var(--red-lt)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {open && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(2px)" }}
          onClick={handleClose}
        >
          <div
            style={{ background: "var(--surface)", borderRadius: "12px", width: "min(520px, 92vw)", maxHeight: "88vh", overflowY: "auto", boxShadow: "0 25px 50px rgba(0,0,0,0.25)" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: "22px 28px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <h2 style={{ fontSize: "20px", fontFamily: "var(--ffd)", color: "var(--accent)", marginBottom: "4px" }}>Add New User</h2>
                <p style={{ fontSize: "13px", color: "var(--muted)" }}>Fill in the details to create a new user account.</p>
              </div>
              <button onClick={handleClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "24px", lineHeight: 1, padding: "2px 6px" }}>×</button>
            </div>

            {/* Modal Form */}
            <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* Username */}
              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "var(--accent)", marginBottom: "6px", textAlign: "left" }}>
                  Username <span style={{ color: "var(--red)" }}>*</span>
                </label>
                <input name="username" type="text" value={form.username} onChange={handleInput} placeholder="e.g. john_doe" style={inputStyle(errors.username)} />
                {errors.username && <p style={{ fontSize: "12px", color: "var(--red)", marginTop: "4px" }}>{errors.username}</p>}
              </div>

              {/* Password */}
              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "var(--accent)", marginBottom: "6px", textAlign: "left" }}>
                  Password <span style={{ color: "var(--red)" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <input name="password" type={showPwd ? "text" : "password"} value={form.password} onChange={handleInput} placeholder="Min. 8 characters" style={{ ...inputStyle(errors.password), paddingRight: "40px" }} />
                  <button type="button" onClick={() => setShowPwd(v => !v)} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex", alignItems: "center" }}>
                    {showPwd ? <VisibilityOffOutlinedIcon style={{ fontSize: 18 }} /> : <VisibilityOutlinedIcon style={{ fontSize: 18 }} />}
                  </button>
                </div>
                {errors.password && <p style={{ fontSize: "12px", color: "var(--red)", marginTop: "4px" }}>{errors.password}</p>}
              </div>

              {/* Address */}
              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "var(--accent)", marginBottom: "6px", textAlign: "left" }}>
                  Address <span style={{ color: "var(--red)" }}>*</span>
                </label>
                <input name="address" type="text" value={form.address} onChange={handleInput} placeholder="Full address" style={inputStyle(errors.address)} />
                {errors.address && <p style={{ fontSize: "12px", color: "var(--red)", marginTop: "4px" }}>{errors.address}</p>}
              </div>

              {/* Phone */}
              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "var(--accent)", marginBottom: "6px", textAlign: "left" }}>
                  Phone <span style={{ color: "var(--red)" }}>*</span>
                </label>
                <input name="phone" type="tel" value={form.phone} onChange={handleInput} placeholder="+91 98765 43210" style={inputStyle(errors.phone)} />
                {errors.phone && <p style={{ fontSize: "12px", color: "var(--red)", marginTop: "4px" }}>{errors.phone}</p>}
              </div>

              {/* Branch Dropdown */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <label style={{ fontSize: "14px", fontWeight: 600, color: "var(--accent)", textAlign: "left" }}>
                    Branch <span style={{ color: "var(--red)" }}>*</span>
                  </label>
                  {!newBranchMode && (
                    <button type="button" onClick={() => { setNewBranchMode(true); setNewBranchName(""); setNewBranchError(""); }} style={{ fontSize: "12px", fontWeight: 600, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                      + New Branch
                    </button>
                  )}
                </div>
                {newBranchMode ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input autoFocus value={newBranchName} onChange={e => { setNewBranchName(e.target.value); setNewBranchError(""); }} onKeyDown={e => { if (e.key === "Enter") handleCreateBranch(); if (e.key === "Escape") setNewBranchMode(false); }} placeholder="Branch name e.g. SYSMAC" style={{ ...inputStyle(newBranchError), flex: 1 }} />
                      <button type="button" onClick={handleCreateBranch} disabled={creatingBranch} style={{ padding: "8px 14px", borderRadius: "6px", border: "none", background: "var(--accent)", color: "#fff", fontSize: "12px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", opacity: creatingBranch ? 0.7 : 1 }}>{creatingBranch ? "Saving…" : "Save"}</button>
                      <button type="button" onClick={() => { setNewBranchMode(false); setNewBranchName(""); setNewBranchError(""); }} style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface)", fontSize: "12px", cursor: "pointer", color: "var(--muted)" }}>Cancel</button>
                    </div>
                    {newBranchError && <p style={{ fontSize: "11px", color: "var(--red)", margin: 0 }}>{newBranchError}</p>}
                  </div>
                ) : (
                  <select value={form.branch} onChange={e => handleSelect("branch")(e.target.value)} style={inputStyle(errors.branch)}>
                    <option value="">{branches.length === 0 ? "No branches — create one above" : "Select Branch"}</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                )}
                {errors.branch && <p style={{ fontSize: "11px", color: "var(--red)", marginTop: "4px" }}>{errors.branch}</p>}
              </div>

              {/* Role */}
              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "var(--accent)", marginBottom: "6px", textAlign: "left" }}>
                  Role <span style={{ color: "var(--red)" }}>*</span>
                </label>
                <select value={form.role} onChange={e => handleSelect("role")(e.target.value)} style={inputStyle(errors.role)}>
                  <option value="">Select role</option>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                {errors.role && <p style={{ fontSize: "12px", color: "var(--red)", marginTop: "4px" }}>{errors.role}</p>}
              </div>

              {/* Status */}
              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "var(--accent)", marginBottom: "6px", textAlign: "left" }}>
                  Status <span style={{ color: "var(--red)" }}>*</span>
                </label>
                <select value={form.status} onChange={e => handleSelect("status")(e.target.value)} style={inputStyle(errors.status)}>
                  <option value="">Select status</option>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.status && <p style={{ fontSize: "12px", color: "var(--red)", marginTop: "4px" }}>{errors.status}</p>}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: "16px 28px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "10px", position: "relative" }}>
              {success && (
                <div style={{ position: "absolute", top: "-44px", left: "50%", transform: "translateX(-50%)", background: "var(--green)", color: "#fff", padding: "7px 16px", borderRadius: "8px", fontSize: "13px", whiteSpace: "nowrap" }}>
                  ✓ User added successfully!
                </div>
              )}
              <button 
                className="btn btn-g" 
                onClick={handleClose} 
                disabled={submitting}
                style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-p" 
                onClick={handleSubmit} 
                disabled={success || submitting}
                style={{ padding: "8px 20px", borderRadius: "6px", border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", fontWeight: 500 }}
              >
                {submitting ? "Creating..." : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit User Modal ── */}
      {editOpen && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(2px)" }}
          onClick={handleCloseEdit}
        >
          <div
            style={{ background: "var(--surface)", borderRadius: "12px", width: "min(520px, 92vw)", maxHeight: "88vh", overflowY: "auto", boxShadow: "0 25px 50px rgba(0,0,0,0.25)", animation: "slideUp 0.2s ease" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: "22px 28px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <h2 style={{ fontSize: "20px", fontFamily: "var(--ffd)", color: "var(--accent)", marginBottom: "4px" }}>Edit User</h2>
                <p style={{ fontSize: "13px", color: "var(--muted)" }}>Update the details for <strong>{editingUser?.username}</strong>.</p>
              </div>
              <button onClick={handleCloseEdit} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "24px", lineHeight: 1, padding: "2px 6px" }}>×</button>
            </div>

            {/* Modal Form */}
            <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* Username */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--text)", marginBottom: "6px" }}>
                  Username <span style={{ color: "var(--red)" }}>*</span>
                </label>
                <input name="username" type="text" value={editForm.username}
                  onChange={e => { setEditForm(f => ({ ...f, username: e.target.value })); if (editErrors.username) setEditErrors(er => ({ ...er, username: "" })); }}
                  placeholder="e.g. john_doe" style={inputStyle(editErrors.username)} />
                {editErrors.username && <p style={{ fontSize: "11px", color: "var(--red)", marginTop: "4px" }}>{editErrors.username}</p>}
              </div>

              {/* Password (optional on edit) */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--text)", marginBottom: "6px" }}>
                  Password <span style={{ color: "var(--muted)", fontWeight: 400 }}>(leave blank to keep current)</span>
                </label>
                <div style={{ position: "relative" }}>
                  <input name="password" type={showEditPwd ? "text" : "password"} value={editForm.password}
                    onChange={e => { setEditForm(f => ({ ...f, password: e.target.value })); if (editErrors.password) setEditErrors(er => ({ ...er, password: "" })); }}
                    placeholder="New password (optional)" style={{ ...inputStyle(editErrors.password), paddingRight: "40px" }} />
                  <button type="button" onClick={() => setShowEditPwd(v => !v)}
                    style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", display: "flex", alignItems: "center" }}>
                    {showEditPwd ? <VisibilityOffOutlinedIcon style={{ fontSize: 18 }} /> : <VisibilityOutlinedIcon style={{ fontSize: 18 }} />}
                  </button>
                </div>
                {editErrors.password && <p style={{ fontSize: "11px", color: "var(--red)", marginTop: "4px" }}>{editErrors.password}</p>}
              </div>

              {/* Address */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--text)", marginBottom: "6px" }}>
                  Address <span style={{ color: "var(--red)" }}>*</span>
                </label>
                <input name="address" type="text" value={editForm.address}
                  onChange={e => { setEditForm(f => ({ ...f, address: e.target.value })); if (editErrors.address) setEditErrors(er => ({ ...er, address: "" })); }}
                  placeholder="Full address" style={inputStyle(editErrors.address)} />
                {editErrors.address && <p style={{ fontSize: "11px", color: "var(--red)", marginTop: "4px" }}>{editErrors.address}</p>}
              </div>

              {/* Phone */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--text)", marginBottom: "6px" }}>
                  Phone <span style={{ color: "var(--red)" }}>*</span>
                </label>
                <input name="phone" type="tel" value={editForm.phone}
                  onChange={e => { setEditForm(f => ({ ...f, phone: e.target.value })); if (editErrors.phone) setEditErrors(er => ({ ...er, phone: "" })); }}
                  placeholder="+91 98765 43210" style={inputStyle(editErrors.phone)} />
                {editErrors.phone && <p style={{ fontSize: "11px", color: "var(--red)", marginTop: "4px" }}>{editErrors.phone}</p>}
              </div>

              {/* Branch */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--text)", marginBottom: "6px" }}>
                  Branch <span style={{ color: "var(--red)" }}>*</span>
                </label>
                <select value={editForm.branch}
                  onChange={e => { setEditForm(f => ({ ...f, branch: e.target.value })); if (editErrors.branch) setEditErrors(er => ({ ...er, branch: "" })); }}
                  style={inputStyle(editErrors.branch)}>
                  <option value="">Select Branch</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                {editErrors.branch && <p style={{ fontSize: "11px", color: "var(--red)", marginTop: "4px" }}>{editErrors.branch}</p>}
              </div>

              {/* Role */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--text)", marginBottom: "6px" }}>
                  Role <span style={{ color: "var(--red)" }}>*</span>
                </label>
                <select value={editForm.role}
                  onChange={e => { setEditForm(f => ({ ...f, role: e.target.value })); if (editErrors.role) setEditErrors(er => ({ ...er, role: "" })); }}
                  style={inputStyle(editErrors.role)}>
                  <option value="">Select role</option>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                {editErrors.role && <p style={{ fontSize: "11px", color: "var(--red)", marginTop: "4px" }}>{editErrors.role}</p>}
              </div>

              {/* Status */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--text)", marginBottom: "6px" }}>
                  Status <span style={{ color: "var(--red)" }}>*</span>
                </label>
                <select value={editForm.status}
                  onChange={e => { setEditForm(f => ({ ...f, status: e.target.value })); if (editErrors.status) setEditErrors(er => ({ ...er, status: "" })); }}
                  style={inputStyle(editErrors.status)}>
                  <option value="">Select status</option>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {editErrors.status && <p style={{ fontSize: "11px", color: "var(--red)", marginTop: "4px" }}>{editErrors.status}</p>}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: "16px 28px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "10px", position: "relative" }}>
              {editSuccess && (
                <div style={{ position: "absolute", top: "-44px", left: "50%", transform: "translateX(-50%)", background: "var(--green)", color: "#fff", padding: "7px 16px", borderRadius: "8px", fontSize: "13px", whiteSpace: "nowrap" }}>
                  ✓ User updated successfully!
                </div>
              )}
              <button onClick={handleCloseEdit} disabled={editSubmitting}
                style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={handleEditSubmit} disabled={editSubmitting || editSuccess}
                style={{ padding: "8px 20px", borderRadius: "6px", border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", fontWeight: 500 }}>
                {editSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteConfirm && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, backdropFilter: "blur(2px)" }}
          onClick={() => !deleting && setDeleteConfirm(null)}
        >
          <div
            style={{ background: "var(--surface)", borderRadius: "12px", width: "min(420px, 90vw)", boxShadow: "0 25px 50px rgba(0,0,0,0.3)", animation: "slideUp 0.18s ease", overflow: "hidden" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: "28px 28px 20px", textAlign: "center" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>🗑️</div>
              <h3 style={{ fontSize: "17px", fontWeight: 700, color: "var(--text)", marginBottom: "8px" }}>Delete User?</h3>
              <p style={{ fontSize: "13px", color: "var(--muted)", lineHeight: 1.5 }}>
                This will permanently delete <strong style={{ color: "var(--text)" }}>{deleteConfirm.username}</strong>. This action cannot be undone.
              </p>
            </div>
            <div style={{ padding: "0 28px 24px", display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                style={{ padding: "9px 22px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", fontSize: "13px", fontWeight: 500, color: "var(--text)" }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                style={{ padding: "9px 22px", borderRadius: "8px", border: "none", background: "var(--red)", color: "#fff", cursor: deleting ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: 600, opacity: deleting ? 0.7 : 1 }}
              >
                {deleting ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp { 
          from { opacity: 0; transform: translateY(16px); } 
          to { opacity: 1; transform: translateY(0); } 
        }
      `}</style>
    </div>
  );
}