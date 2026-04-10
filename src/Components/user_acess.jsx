import React, { useState, useEffect, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

// NOTE: We do NOT import saveUserPermissions from useracess.js because
// that service only sends 4 keys. We handle the full 7-key PATCH directly here.

import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import LibraryAddOutlinedIcon from '@mui/icons-material/LibraryAddOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import GradingOutlinedIcon from '@mui/icons-material/GradingOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import StarsOutlinedIcon from '@mui/icons-material/StarsOutlined';
import DirectionsCarOutlinedIcon from '@mui/icons-material/DirectionsCarOutlined';
import AirportShuttleOutlinedIcon from '@mui/icons-material/AirportShuttleOutlined';
import PlaylistAddCheckOutlinedIcon from '@mui/icons-material/PlaylistAddCheckOutlined';
import DriveEtaOutlinedIcon from '@mui/icons-material/DriveEtaOutlined';

// ── Static config ─────────────────────────────────────────────────────────────
const ROLES = ["Admin", "Manager", "Operator", "Viewer", "Support", "Auditor"];

// All 7 permission keys — mirrors Layout.jsx NAV exactly
const ALL_PERM_KEYS = ["dashboard", "col_reports", "vm_trips", "vm_service", "um_users", "um_roles", "mm_vehicle"];

const MENU_GROUPS = [
  {
    group: "Dashboard",
    icon: <DashboardOutlinedIcon style={{ width: 18, height: 18 }} />,
    items: [
      { key: "dashboard", label: "Dashboard", icon: <DashboardOutlinedIcon style={{ width: 16, height: 16 }} /> },
    ],
  },
  {
    group: "Collection",
    icon: <CategoryOutlinedIcon style={{ width: 18, height: 18 }} />,
    items: [
      { key: "col_reports", label: "Reports", icon: <GradingOutlinedIcon style={{ width: 16, height: 16 }} /> },
    ],
  },
  {
    group: "Vehicle Management",
    icon: <AirportShuttleOutlinedIcon style={{ width: 18, height: 18 }} />,
    items: [
      { key: "vm_trips",   label: "Trip",    icon: <DriveEtaOutlinedIcon style={{ width: 16, height: 16 }} /> },
      { key: "vm_service", label: "Challan", icon: <PlaylistAddCheckOutlinedIcon style={{ width: 16, height: 16 }} /> },
    ],
  },
  {
    group: "User Management",
    icon: <ManageAccountsIcon style={{ width: 18, height: 18 }} />,
    items: [
      { key: "um_users", label: "All Users",    icon: <LibraryAddOutlinedIcon style={{ width: 16, height: 16 }} /> },
      { key: "um_roles", label: "User Control", icon: <AdminPanelSettingsOutlinedIcon style={{ width: 16, height: 16 }} /> },
    ],
  },
  {
    group: "Master",
    icon: <StarsOutlinedIcon style={{ width: 18, height: 18 }} />,
    items: [
      { key: "mm_vehicle", label: "Vehicle Master", icon: <DirectionsCarOutlinedIcon style={{ width: 16, height: 16 }} /> },
    ],
  },
];

const ROLE_BADGE = {
  Admin:    { bg: "#ffffff", color: "#1d4ed8" },
  Manager:  { bg: "#ffffff", color: "#1d4ed8" },
  Operator: { bg: "#ffffff", color: "#1d4ed8" },
  Viewer:   { bg: "#ffffff", color: "#1d4ed8" },
  Support:  { bg: "#ffffff", color: "#1d4ed8" },
  Auditor:  { bg: "#ffffff", color: "#1d4ed8" },
};

function flattenMenuItems() {
  return MENU_GROUPS.flatMap(g => g.items.map(item => ({ ...item, group: g.group })));
}

function buildDefaultPerms() {
  const p = {};
  ALL_PERM_KEYS.forEach(k => { p[k] = false; });
  return p;
}

function normalizePerms(apiData) {
  const defaults = buildDefaultPerms();
  if (!apiData) return defaults;
  return {
    ...defaults,
    ...Object.fromEntries(
      Object.entries(apiData).filter(([k]) => k in defaults)
    ),
  };
}

// ── Direct save — sends ALL 7 keys so nothing gets dropped ────────────────────
async function saveAllPermissions(userId, perms) {
  const token = localStorage.getItem("access_token");

  const payload = {};
  ALL_PERM_KEYS.forEach(k => { payload[k] = !!perms[k]; });

  console.log(`[UserControl] Saving all permissions for user ${userId}:`, payload);

  const res = await fetch(`${API_BASE}/users/${userId}/permissions/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let errBody;
    try { errBody = await res.json(); }
    catch { errBody = { error: res.statusText }; }
    const msg = errBody?.error || errBody?.detail || JSON.stringify(errBody) || "Failed to save.";
    const err = new Error(msg);
    err.detail = errBody;
    err.status  = res.status;
    throw err;
  }

  return res.json();
}

// ── Skeletons ─────────────────────────────────────────────────────────────────
function UserSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "8px 12px" }}>
      {[...Array(8)].map((_, i) => (
        <div key={i} style={{
          height: "60px", borderRadius: "8px", background: "#f1f3f4",
          animation: "pulse 1.4s ease-in-out infinite", animationDelay: `${i * 0.1}s`,
        }} />
      ))}
    </div>
  );
}

function PermSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "16px 24px" }}>
      {[...Array(7)].map((_, i) => (
        <div key={i} style={{
          height: "44px", borderRadius: "8px", background: "#f1f3f4",
          animation: "pulse 1.4s ease-in-out infinite", animationDelay: `${i * 0.08}s`,
        }} />
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function RoleAccess() {
  const [users, setUsers]               = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [search, setSearch]             = useState("");
  const [roleFilter, setRoleFilter]     = useState("All Job Roles");
  const [selectedUser, setSelectedUser] = useState(null);

  const [perms, setPerms]             = useState({});
  const [permLoading, setPermLoading] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [saveError, setSaveError]     = useState("");
  const [dirtyUsers, setDirtyUsers]   = useState(new Set());

  const [expanded, setExpanded] = useState(() => {
    const init = {};
    MENU_GROUPS.forEach(g => { init[g.group] = true; });
    return init;
  });

  // ── Fetch all users (only those created in user_list.jsx) ──────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      // Fetch from /users/ endpoint instead of /users/login-users/
      const res = await fetch(`${API_BASE}/users/`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      const list = data.results || data || [];
      
      // Filter to show only users that were created via user_list.jsx
      // Get created users from localStorage
      const createdUserIds = JSON.parse(localStorage.getItem("created_users") || "[]");
      
      // If there are created users in localStorage, filter them
      // Otherwise, show all users from the /users/ endpoint
      let filteredList = list;
      if (createdUserIds.length > 0) {
        filteredList = list.filter(user => createdUserIds.includes(user.id));
      }
      
      console.log("Filtered users (only created in user_list):", filteredList);
      setUsers(filteredList);

      const initialPerms = {};
      filteredList.forEach(u => {
        console.log(`User ${u.id} (${u.username}) has permissions:`, u.menu_permissions);
        initialPerms[u.id] = normalizePerms(u.menu_permissions ?? null);
      });
      setPerms(initialPerms);

      if (filteredList.length > 0) setSelectedUser(filteredList[0]);
    } catch (e) {
      console.error("Failed to load users", e);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ── Load permissions when user changes ───────────────────────────────────────
  const fetchPermissionsForUser = useCallback(async (userId) => {
    setPermLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${API_BASE}/users/${userId}/permissions/`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`Loaded fresh permissions for user ${userId}:`, data);
        setPerms(p => ({ ...p, [userId]: normalizePerms(data) }));
        setUsers(prev =>
          prev.map(u => u.id === userId ? { ...u, menu_permissions: data } : u)
        );
      } else {
        console.error("Failed to load permissions for user", userId);
      }
    } catch (error) {
      console.error("Error loading permissions:", error);
    } finally {
      setPermLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedUser) return;
    const uid = selectedUser.id;
    if (!(uid in perms)) {
      fetchPermissionsForUser(uid);
    } else {
      setPermLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser?.id, fetchPermissionsForUser]);

  // ── Filtered user list ───────────────────────────────────────────────────────
  const filtered = users.filter(u => {
    const name  = (u.full_name || u.username || "").toLowerCase();
    const email = (u.email || "").toLowerCase();
    const q     = search.toLowerCase();
    return (!q || name.includes(q) || email.includes(q)) &&
           (roleFilter === "All Job Roles" || u.role === roleFilter);
  });

  // ── Permission helpers ───────────────────────────────────────────────────────
  const getUserPerms = (uid) => perms[uid] || buildDefaultPerms();

  const markDirty = (uid) => {
    setDirtyUsers(prev => new Set([...prev, uid]));
    setSaved(false);
    setSaveError("");
  };

  const togglePerm = (menuKey) => {
    if (!selectedUser || permLoading) return;
    const uid = selectedUser.id;
    setPerms(p => ({ ...p, [uid]: { ...getUserPerms(uid), [menuKey]: !getUserPerms(uid)[menuKey] } }));
    markDirty(uid);
  };

  const selectAll = () => {
    if (!selectedUser || permLoading) return;
    const uid = selectedUser.id;
    const all = {};
    flattenMenuItems().forEach(item => { all[item.key] = true; });
    setPerms(p => ({ ...p, [uid]: all }));
    markDirty(uid);
  };

  const clearAll = () => {
    if (!selectedUser || permLoading) return;
    const uid = selectedUser.id;
    setPerms(p => ({ ...p, [uid]: buildDefaultPerms() }));
    markDirty(uid);
  };

  // ── Save — uses direct fetch with all 7 keys ─────────────────────────────────
  const handleSave = async () => {
    if (!selectedUser) return;
    const uid = selectedUser.id;
    setSaving(true);
    setSaveError("");
    try {
      const saved_perms = await saveAllPermissions(uid, getUserPerms(uid));

      setPerms(p => ({ ...p, [uid]: normalizePerms(saved_perms) }));
      setUsers(prev =>
        prev.map(u =>
          u.id === uid
            ? { ...u, menu_permissions: saved_perms, allowed_menus: saved_perms.allowed_menus || [] }
            : u
        )
      );

      // Update localStorage so Layout.jsx sidebar reflects changes immediately
      const currentUser = JSON.parse(localStorage.getItem("user") || "null");
      if (currentUser && currentUser.id === uid) {
        const persisted = {};
        ALL_PERM_KEYS.forEach(k => { persisted[k] = !!saved_perms[k]; });
        localStorage.setItem("menu_permissions", JSON.stringify(persisted));
        window.dispatchEvent(new CustomEvent("permissionsUpdated", { detail: persisted }));
      }

      setDirtyUsers(prev => { const next = new Set(prev); next.delete(uid); return next; });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error("Failed to save permissions", e);
      let errorMessage = "Failed to save. Please try again.";
      if (e.detail) {
        errorMessage = typeof e.detail === "string" ? e.detail : JSON.stringify(e.detail);
      } else if (e.message) {
        errorMessage = e.message;
      }
      setSaveError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // ── Group helpers ────────────────────────────────────────────────────────────
  const isGroupAllChecked = (group) => {
    if (!selectedUser) return false;
    const p = getUserPerms(selectedUser.id);
    return group.items.every(item => p[item.key]);
  };

  const toggleGroup = (group) => {
    if (!selectedUser || permLoading) return;
    const uid    = selectedUser.id;
    const allOn  = isGroupAllChecked(group);
    const updated = { ...getUserPerms(uid) };
    group.items.forEach(item => { updated[item.key] = !allOn; });
    setPerms(p => ({ ...p, [uid]: updated }));
    markDirty(uid);
  };

  const currentPerms = selectedUser ? getUserPerms(selectedUser.id) : {};
  const isDirty      = selectedUser ? dirtyUsers.has(selectedUser.id) : false;
  const saveDisabled = saving || permLoading || !isDirty;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: "flex", width: "100%", height: "100%",
      background: "#f8f9fa", fontFamily: "'Google Sans', sans-serif",
      overflow: "hidden", textAlign: "left",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&display=swap');
        @keyframes pulse { 0%,100%{opacity:0.6} 50%{opacity:0.2} }
        @keyframes spin   { to { transform: rotate(360deg); } }
        * { font-family: 'Google Sans', sans-serif !important; box-sizing: border-box; }
        .ua-user-row:hover  { background: #f1f3f4 !important; }
        .ua-user-row.active { background: #e8f0fe !important; border-left: 3px solid #1a73e8 !important; }
        .ua-menu-row:hover  { background: #f1f3f4; }
        .ua-menu-row.active { background: #e8f0fe !important; }
        .ua-scroll::-webkit-scrollbar       { width: 4px; }
        .ua-scroll::-webkit-scrollbar-thumb { background: #dadce0; border-radius: 4px; }
        input[type=checkbox].ua-cb { accent-color: #1a73e8; width: 16px; height: 16px; cursor: pointer; }
        select.ua-select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24'%3E%3Cpath fill='%235f6368' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center;
          padding-right: 28px !important;
        }
        .ua-dirty-dot { width:7px; height:7px; border-radius:50%; background:#f59e0b; display:inline-block; margin-left:4px; flex-shrink:0; }
      `}</style>

      {/* ═══ LEFT PANEL: User List ═══════════════════════════════════════════ */}
      <div style={{
        width: "300px", minWidth: "260px", flexShrink: 0,
        background: "#ffffff", borderRight: "1px solid #e8eaed",
        display: "flex", flexDirection: "column", height: "100%",
      }}>
        <div style={{ padding: "18px 16px 12px", borderBottom: "1px solid #e8eaed", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "12px" }}>
            <span style={{ fontSize: "15px", fontWeight: 700, color: "#202124" }}>Users</span>
            <span style={{ fontSize: "13px", color: "#5f6368" }}>{users.length}</span>
          </div>

          <div style={{ position: "relative", marginBottom: "8px" }}>
            <svg style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }}
              width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="#9aa0a6" strokeWidth="2" />
              <path d="M16.5 16.5L21 21" stroke="#9aa0a6" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              style={{
                width: "100%", padding: "8px 10px 8px 30px",
                border: "1px solid #e8eaed", borderRadius: "8px",
                fontSize: "13px", color: "#202124", outline: "none", background: "#f8f9fa",
              }}
            />
          </div>

          <select className="ua-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            style={{
              width: "100%", padding: "8px 10px", border: "1px solid #e8eaed",
              borderRadius: "8px", fontSize: "13px", color: "#202124",
              background: "#fff", outline: "none", cursor: "pointer",
            }}>
            <option>All Job Roles</option>
            {ROLES.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>

        <div className="ua-scroll" style={{ flex: 1, overflowY: "auto" }}>
          {usersLoading ? <UserSkeleton /> : filtered.length === 0 ? (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "#9aa0a6", fontSize: "13px" }}>
              No users found
            </div>
          ) : (
            <div style={{ padding: "8px 0" }}>
              {filtered.map(user => {
                const isActive = selectedUser?.id === user.id;
                const name     = user.full_name || user.username || "User";
                const role     = user.role || "User";
                const badge    = ROLE_BADGE[role] || { bg: "#f1f3f4", color: "#5f6368" };
                const hasDirty = dirtyUsers.has(user.id);
                return (
                  <div
                    key={user.id}
                    className={`ua-user-row ${isActive ? "active" : ""}`}
                    onClick={() => { setSelectedUser(user); setSaved(false); setSaveError(""); }}
                    style={{
                      display: "flex", alignItems: "center", gap: "12px",
                      padding: "10px 16px", cursor: "pointer",
                      borderLeft: isActive ? "3px solid #1a73e8" : "3px solid transparent",
                      transition: "background 0.15s",
                    }}
                  >
                    {user.photo_url && (
                      <div style={{
                        width: "36px", height: "36px", borderRadius: "50%",
                        overflow: "hidden", flexShrink: 0,
                        border: isActive ? "2px solid #1a73e8" : "2px solid #d2d4d8",
                        boxSizing: "border-box",
                      }}>
                        <img src={user.photo_url} alt={name}
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "#202124", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
                        {hasDirty && <span className="ua-dirty-dot" title="Unsaved changes" style={{ flexShrink: 0 }} />}
                      </div>
                      <span style={{
                        fontSize: "10px", fontWeight: 700, padding: "1px 7px",
                        borderRadius: "10px", background: badge.bg, color: badge.color,
                        textTransform: "uppercase", letterSpacing: "0.3px", flexShrink: 0,
                      }}>{role}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══ RIGHT PANEL: Permissions ════════════════════════════════════════ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "100%" }}>
        {!selectedUser ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#9aa0a6", fontSize: "14px" }}>
            Select a user to manage permissions
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{
              padding: "16px 24px", borderBottom: "1px solid #e8eaed",
              background: "#fff", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                {selectedUser.photo_url && (
                  <div style={{
                    width: "42px", height: "42px", borderRadius: "50%",
                    overflow: "hidden", flexShrink: 0,
                    border: "2px solid #1a73e8", boxSizing: "border-box",
                  }}>
                    <img src={selectedUser.photo_url} alt={selectedUser.full_name || selectedUser.username}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </div>
                )}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "16px", fontWeight: 700, color: "#202124" }}>
                      {selectedUser.full_name || selectedUser.username}
                    </span>
                    {selectedUser.role && (() => {
                      const badge = ROLE_BADGE[selectedUser.role] || { bg: "#f1f3f4", color: "#5f6368" };
                      return (
                        <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 10px", borderRadius: "10px", background: badge.bg, color: badge.color, textTransform: "uppercase" }}>
                          {selectedUser.role}
                        </span>
                      );
                    })()}
                    {isDirty && (
                      <span style={{ fontSize: "11px", color: "#f59e0b", fontWeight: 500 }}>• Unsaved changes</span>
                    )}
                  </div>
                  <div style={{ fontSize: "13px", color: "#5f6368", marginTop: "2px" }}>
                    {selectedUser.email || selectedUser.username}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                {saved && <span style={{ fontSize: "12px", color: "#188038", fontWeight: 600 }}>✓ Saved</span>}
                {saveError && (
                  <span style={{ fontSize: "12px", color: "#d93025", fontWeight: 500, maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={saveError}>
                    ⚠ {saveError}
                  </span>
                )}
                <button onClick={selectAll} disabled={permLoading} style={{
                  padding: "7px 14px", borderRadius: "6px", fontSize: "13px",
                  border: "1px solid #e8eaed", background: "#fff",
                  color: permLoading ? "#9aa0a6" : "#202124",
                  cursor: permLoading ? "not-allowed" : "pointer", fontWeight: 500,
                }}>Select All</button>
                <button onClick={clearAll} disabled={permLoading} style={{
                  padding: "7px 14px", borderRadius: "6px", fontSize: "13px",
                  border: "1px solid #e8eaed", background: "#fff",
                  color: permLoading ? "#9aa0a6" : "#202124",
                  cursor: permLoading ? "not-allowed" : "pointer", fontWeight: 500,
                }}>Clear All</button>
              </div>
            </div>

            {/* Menu tree */}
            <div className="ua-scroll" style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
              {permLoading ? <PermSkeleton /> : MENU_GROUPS.map(group => {
                const isOpen           = expanded[group.group] !== false;
                const groupAllChecked  = isGroupAllChecked(group);
                const groupSomeChecked = !groupAllChecked && group.items.some(item => currentPerms[item.key]);

                return (
                  <div key={group.group}>
                    <div
                      className={`ua-menu-row ${groupAllChecked ? "active" : ""}`}
                      style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 24px", cursor: "pointer", borderBottom: "1px solid #f1f3f4" }}
                    >
                      <button
                        onClick={() => setExpanded(e => ({ ...e, [group.group]: !isOpen }))}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                          style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                          <path d="M9 18l6-6-6-6" stroke="#5f6368" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <span style={{ color: "#5f6368", display: "flex", alignItems: "center" }}>{group.icon}</span>
                      <span style={{ flex: 1, fontSize: "14px", fontWeight: 500, color: groupAllChecked ? "#1a73e8" : "#202124" }}>{group.group}</span>
                      <input type="checkbox" className="ua-cb"
                        checked={groupAllChecked}
                        disabled={permLoading}
                        ref={el => { if (el) el.indeterminate = groupSomeChecked; }}
                        onChange={() => toggleGroup(group)}
                      />
                    </div>

                    {isOpen && group.items.map(item => (
                      <div
                        key={item.key}
                        className={`ua-menu-row ${currentPerms[item.key] ? "active" : ""}`}
                        style={{
                          display: "flex", alignItems: "center", gap: "10px",
                          padding: "10px 24px 10px 70px", borderBottom: "1px solid #f1f3f4",
                          cursor: permLoading ? "not-allowed" : "pointer",
                          opacity: permLoading ? 0.5 : 1,
                        }}
                        onClick={() => !permLoading && togglePerm(item.key)}
                      >
                        <span style={{ color: "#9aa0a6", display: "flex", alignItems: "center" }}>{item.icon}</span>
                        <span style={{ flex: 1, fontSize: "14px", color: currentPerms[item.key] ? "#1a73e8" : "#202124" }}>{item.label}</span>
                        <input type="checkbox" className="ua-cb"
                          checked={!!currentPerms[item.key]}
                          disabled={permLoading}
                          onChange={() => togglePerm(item.key)}
                          onClick={e => e.stopPropagation()}
                        />
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Save bar */}
            <div style={{
              padding: "14px 24px", borderTop: "1px solid #e8eaed",
              background: "#fff", flexShrink: 0,
              display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "12px",
            }}>
              {isDirty && !saving && (
                <span style={{ fontSize: "12px", color: "#5f6368" }}>You have unsaved changes</span>
              )}
              <button
                onClick={handleSave}
                disabled={saveDisabled}
                style={{
                  padding: "10px 28px", borderRadius: "8px", border: "none",
                  background: saveDisabled ? "#dadce0" : "#1a73e8",
                  color:      saveDisabled ? "#5f6368"  : "#fff",
                  fontSize: "14px", fontWeight: 600,
                  cursor: saveDisabled ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: "8px",
                  transition: "background 0.2s",
                }}
              >
                {saving ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 1s linear infinite" }}>
                      <circle cx="12" cy="12" r="10" stroke="#9aa0a6" strokeWidth="3" strokeDasharray="30 60" />
                    </svg>
                    Saving…
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke={saveDisabled ? "#9aa0a6" : "#fff"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Save Permissions
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}