// src/components/Sidebar.jsx
// Reads `menu_permissions` from localStorage (set by Login.jsx after login)
// and shows ONLY the menus the logged-in user has been granted.
// Admin role and is_staff users always see ALL menus regardless of permissions.

import React, { useState, useEffect } from "react";

// ── Menu definition ────────────────────────────────────────────────────────────
// permKey must exactly match the keys Login.jsx stores:
//   { dashboard, col_reports, um_users, um_roles }
const MENU_GROUPS = [
  {
    group: "Dashboard",
    items: [
      {
        permKey: "dashboard",
        label:   "Dashboard",
        path:    "/dashboard",
        icon: (
          <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
        ),
      },
    ],
  },
  {
    group: "Collection",
    items: [
      {
        permKey: "col_reports",
        label:   "Reports",
        path:    "/collection/reports",
        icon: (
          <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        ),
      },
    ],
  },
  {
    group: "User Management",
    items: [
      {
        permKey: "um_users",
        label:   "All Users",
        path:    "/users",
        icon: (
          <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        ),
      },
      {
        permKey: "um_roles",
        label:   "User Control",
        path:    "/users/access",
        icon: (
          <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        ),
      },
    ],
  },
];

// ── Read helpers ──────────────────────────────────────────────────────────────
function readPermissions() {
  try {
    const raw = localStorage.getItem("menu_permissions");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function readUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getInitials(name) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  return parts.length === 1
    ? parts[0][0].toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const ROLE_COLORS = {
  Admin:    "#7c3aed",
  Manager:  "#1d4ed8",
  Operator: "#15803d",
  Viewer:   "#a16207",
  Support:  "#be123c",
  Auditor:  "#166534",
};

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar Component
// Props:
//   activePath  — current pathname, e.g. "/dashboard"
//   onNavigate  — fn(path) — use react-router's navigate()
//   collapsed   — boolean, renders icon-only narrow sidebar
// ─────────────────────────────────────────────────────────────────────────────
export default function Sidebar({ activePath = "", onNavigate, collapsed = false }) {
  const [permissions, setPermissions] = useState(readPermissions);
  const [user,        setUser]        = useState(readUser);

  // Re-sync on: other-tab localStorage change, window focus, or route change
  useEffect(() => {
    const sync = () => {
      setPermissions(readPermissions());
      setUser(readUser());
    };
    window.addEventListener("storage", sync);
    window.addEventListener("focus",   sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus",   sync);
    };
  }, []);

  // Listen for custom permission update events from user_acess.jsx
  useEffect(() => {
    const handlePermissionUpdate = (event) => {
      console.log("Sidebar received permission update:", event.detail);
      if (event.detail) {
        setPermissions(event.detail);
      } else {
        setPermissions(readPermissions());
      }
      setUser(readUser());
    };
    
    window.addEventListener("permissionsUpdated", handlePermissionUpdate);
    
    return () => {
      window.removeEventListener("permissionsUpdated", handlePermissionUpdate);
    };
  }, []);

  // Re-read on every navigation (catches same-tab login redirect)
  useEffect(() => {
    setPermissions(readPermissions());
    setUser(readUser());
  }, [activePath]);

  // Debug logging
  useEffect(() => {
    console.log("Sidebar - Current permissions:", permissions);
    console.log("Sidebar - Current user:", user);
    console.log("Sidebar - Is admin bypass:", user?.role === "Admin" || user?.is_staff === true);
  }, [permissions, user]);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    localStorage.removeItem("menu_permissions");
    window.location.href = "/login";
  };

  // ── Admin / staff bypass ──────────────────────────────────────────────────
  // Admin role and is_staff users always see every menu item.
  // All other roles only see items where their permission flag is strictly true.
  const isAdmin = user?.role === "Admin" || user?.is_staff === true;

  const allowedGroups = MENU_GROUPS
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        isAdmin ? true : permissions[item.permKey] === true
      ),
    }))
    .filter((group) => group.items.length > 0);

  const W = collapsed ? 64 : 240;

  return (
    <>
      <style>{`
        .sb-root {
          width: ${W}px; min-width: ${W}px;
          height: 100vh;
          background: #ffffff;
          border-right: 1px solid #e8eaed;
          display: flex; flex-direction: column;
          flex-shrink: 0; overflow: hidden;
          font-family: 'Nohemi', 'Plus Jakarta Sans', sans-serif;
          transition: width 0.22s ease;
        }
        .sb-brand {
          padding: ${collapsed ? "16px 0" : "18px 16px 14px"};
          border-bottom: 1px solid #f1f3f4;
          display: flex; align-items: center;
          justify-content: ${collapsed ? "center" : "flex-start"};
          gap: 10px; flex-shrink: 0;
        }
        .sb-brand-icon {
          width: 30px; height: 30px; border-radius: 8px;
          background: #1a73e8;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .sb-brand-name {
          font-size: 15px; font-weight: 700; color: #202124;
          white-space: nowrap;
          display: ${collapsed ? "none" : "block"};
        }
        .sb-nav { flex: 1; overflow-y: auto; padding: 6px 0; }
        .sb-nav::-webkit-scrollbar { width: 3px; }
        .sb-nav::-webkit-scrollbar-thumb { background: #e0e0e0; border-radius: 3px; }
        .sb-group-label {
          padding: 10px 18px 3px;
          font-size: 10px; font-weight: 700; color: #b0b7c0;
          text-transform: uppercase; letter-spacing: 0.9px;
          display: ${collapsed ? "none" : "block"};
        }
        .sb-item {
          display: flex; align-items: center; gap: 10px;
          padding: ${collapsed ? "0" : "9px 16px"};
          margin: ${collapsed ? "4px auto" : "1px 8px"};
          width: ${collapsed ? "40px" : "calc(100% - 16px)"};
          height: ${collapsed ? "40px" : "auto"};
          justify-content: ${collapsed ? "center" : "flex-start"};
          border-radius: 8px; cursor: pointer;
          color: #5f6368; font-size: 13.5px; font-weight: 500;
          transition: background 0.14s, color 0.14s;
          position: relative; border: none; background: none;
          font-family: inherit; text-align: left;
        }
        .sb-item:hover { background: #f1f3f4; color: #202124; }
        .sb-item.sb-active { background: #e8f0fe; color: #1a73e8; font-weight: 600; }
        .sb-item.sb-active svg { stroke: #1a73e8; }
        .sb-item.sb-active::before {
          content: ""; position: absolute;
          left: ${collapsed ? "0" : "-8px"};
          top: 50%; transform: translateY(-50%);
          width: 3px; height: 18px;
          background: #1a73e8; border-radius: 0 3px 3px 0;
        }
        .sb-item-label { display: ${collapsed ? "none" : "block"}; flex: 1; }
        .sb-tooltip {
          display: none; position: absolute;
          left: calc(100% + 10px); top: 50%; transform: translateY(-50%);
          background: #202124; color: #fff;
          font-size: 12px; font-weight: 500;
          padding: 5px 10px; border-radius: 6px;
          white-space: nowrap; z-index: 9999; pointer-events: none;
          box-shadow: 0 2px 8px rgba(0,0,0,0.18);
        }
        ${collapsed ? ".sb-item:hover .sb-tooltip { display: block; }" : ""}
        .sb-empty {
          padding: 32px 18px; font-size: 12px; color: #9aa0a6;
          text-align: center; line-height: 1.6;
        }
        .sb-footer {
          border-top: 1px solid #f1f3f4;
          padding: ${collapsed ? "10px 0" : "10px 12px"};
          display: flex; align-items: center;
          justify-content: ${collapsed ? "center" : "flex-start"};
          gap: 10px; flex-shrink: 0;
        }
        .sb-avatar {
          width: 34px; height: 34px; border-radius: 50%;
          background: #1a73e8;
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 13px; font-weight: 700; flex-shrink: 0;
        }
        .sb-user-info { flex: 1; min-width: 0; display: ${collapsed ? "none" : "block"}; }
        .sb-user-name {
          font-size: 13px; font-weight: 600; color: #202124;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .sb-user-role { font-size: 11px; margin-top: 1px; }
        .sb-logout {
          background: none; border: none; cursor: pointer; color: #9aa0a6;
          padding: 5px; border-radius: 6px;
          display: ${collapsed ? "none" : "flex"}; align-items: center;
          transition: color 0.15s, background 0.15s;
        }
        .sb-logout:hover { color: #d93025; background: #fce8e6; }
      `}</style>

      <div className="sb-root">

        {/* Brand */}
        <div className="sb-brand">
          <div className="sb-brand-icon">
            <svg width="15" height="15" fill="none" stroke="#fff" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="sb-brand-name">Flosh</span>
        </div>

        {/* Nav */}
        <nav className="sb-nav">
          {allowedGroups.length === 0 ? (
            <div className="sb-empty">
              {collapsed ? "—" : "No menu access.\nContact your administrator."}
            </div>
          ) : (
            allowedGroups.map((group) => (
              <div key={group.group}>
                <div className="sb-group-label">{group.group}</div>
                {group.items.map((item) => {
                  const isActive =
                    activePath === item.path ||
                    activePath.startsWith(item.path + "/");
                  return (
                    <button
                      key={item.permKey}
                      className={`sb-item${isActive ? " sb-active" : ""}`}
                      onClick={() => onNavigate && onNavigate(item.path)}
                    >
                      {item.icon}
                      <span className="sb-item-label">{item.label}</span>
                      {collapsed && <span className="sb-tooltip">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </nav>

        {/* Footer */}
        <div className="sb-footer">
          <div className="sb-avatar">
            {getInitials(user?.full_name || user?.username)}
          </div>
          <div className="sb-user-info">
            <div className="sb-user-name">
              {user?.full_name || user?.username || "User"}
            </div>
            <div className="sb-user-role" style={{ color: ROLE_COLORS[user?.role] || "#9aa0a6" }}>
              {user?.role || "—"}
            </div>
          </div>
          <button className="sb-logout" onClick={handleLogout} title="Logout">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>

      </div>
    </>
  );
}