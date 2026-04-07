import { useState } from "react";
import UserList from "../Components/user_list";
import RoleAccess from "../Components/user_acess";
import PaymentTable from "../Components/collection_list.jsx";
import Dashboard from "../Base_Templates/Dashboard.jsx";
import VehicleMaster from "../Components/Vehicle_Master_List.jsx";
import floshLogo from "../assets/logo.png";
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import LibraryAddOutlinedIcon from '@mui/icons-material/LibraryAddOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import GradingOutlinedIcon from '@mui/icons-material/GradingOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import StarsOutlinedIcon from '@mui/icons-material/StarsOutlined';
import DirectionsCarOutlinedIcon from '@mui/icons-material/DirectionsCarOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import AirportShuttleOutlinedIcon from '@mui/icons-material/AirportShuttleOutlined';
import EvStationOutlinedIcon from '@mui/icons-material/EvStationOutlined';
import PlaylistAddCheckOutlinedIcon from '@mui/icons-material/PlaylistAddCheckOutlined';
import DriveEtaOutlinedIcon from '@mui/icons-material/DriveEtaOutlined';
import TravelList from "../Components/Travel_Trip.jsx";
import ChallanList from "../Components/challan_list.jsx";
import ChallanAdd from "../Components/challan_add.jsx";
const NAV = [
  {
    section: "Dashboard",
    icon: <DashboardOutlinedIcon style={{ width: 18, height: 18 }} />,
    id: "dashboard",
    permKey: "dashboard",
    children: null
  },
  {
    section: "Collection",
    icon: <CategoryOutlinedIcon style={{ width: 18, height: 18 }} />,
    id: "collection",
    children: [
      {
        id: "col_reports",
        permKey: "col_reports",
        label: "Reports",
        icon: <GradingOutlinedIcon style={{ width: 18, height: 18 }} />
      }
    ],
  },
  {
    section: "Vehicle Management",
    icon: <AirportShuttleOutlinedIcon style={{ width: 18, height: 18 }} />,
    id: "vehiclemgmt",
    children: [
      
      {
        id: "vm_trips",
        permKey: "vm_trips",
        label: "Trip ",
        icon: <DriveEtaOutlinedIcon style={{ width: 18, height: 18 }} />
      },
     
      {
        id: "vm_service",
        permKey: "vm_service",
        label: "Challan",
        icon: <PlaylistAddCheckOutlinedIcon style={{ width: 18, height: 18 }} />
      },
    ],
  },

 {
    section: "User Management",
    icon: <ManageAccountsIcon style={{ width: 18, height: 18 }} />,
    id: "usermgmt",
    children: [
      {
        id: "um_users",
        permKey: "um_users",
        label: "All Users",
        icon: <LibraryAddOutlinedIcon style={{ width: 18, height: 18 }} />
      },
      {
        id: "um_roles",
        permKey: "um_roles",
        label: "User Control",
        icon: <AdminPanelSettingsOutlinedIcon style={{ width: 18, height: 18 }} />
      },
    ],
  },
{
    section: "Master",
    icon: <StarsOutlinedIcon style={{ width: 18, height: 18 }} />,
    id: "mastermenu",
    children: [
      {
        id: "mm_vehicle",
        permKey: "mm_vehicle",
        label: "Vehicle Master",
        icon: <DirectionsCarOutlinedIcon style={{ width: 18, height: 18 }} />
      },
    ],
  },
];

const PAGE_META = {
  dashboard:   { title: "My Dashboard",  tag: "Overview",        desc: "Your financial overview, recent activity and collection summary." },
  um_users:    { title: "All Users",      tag: "User Management", desc: "Browse, search and manage every registered user account." },
  um_roles:    { title: "Roles & Access", tag: "User Management", desc: "Define permissions and control what each role can do." },
  mm_vehicle:  { title: "Vehicle",           tag: "Master Menu",         desc: "Manage vehicle records, types and configurations." },
  vm_vehicle:  { title: "Vehicle Master",     tag: "Vehicle Management",  desc: "Manage vehicle records, types and configurations." },
  vm_trips:    { title: "Trip Management",    tag: "Vehicle Management",  desc: "Track and manage all vehicle trips and assignments." },
  vm_fuel:     { title: "Fuel Logs",          tag: "Vehicle Management",  desc: "Record and monitor fuel consumption across the fleet." },
  vm_service:  { title: "Service & Maintenance", tag: "Vehicle Management", desc: "Schedule and track vehicle service and maintenance history." },
  col_reports: { title: "Payment Reports", tag: "",      desc: "" },
};

function pillClass(val) {
  const v = val?.toLowerCase();
  if (["active","paid","verified"].includes(v))      return "pill-green";
  if (["pending","invited"].includes(v))              return "pill-amber";
  if (["overdue","rejected","inactive"].includes(v)) return "pill-red";
  return "pill-muted";
}

function getInitials(name) {
  if (!name) return "U";
  const p = name.trim().split(" ");
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length-1][0]).toUpperCase();
}

// Custom collapse icon component with two rectangular panels that rotate
const CollapseIcon = ({ isCollapsed }) => {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      style={{
        transform: isCollapsed ? "rotate(0deg)" : "rotate(180deg)",
        transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      }}
    >
      {/* Left panel */}
      <rect
        x="3"
        y="5"
        width="7"
        height="14"
        rx="1.5"
        stroke="#5f6368"
        strokeWidth="1.5"
        fill="none"
      />
      {/* Right panel */}
      <rect
        x="14"
        y="5"
        width="7"
        height="14"
        rx="1.5"
        stroke="#5f6368"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
};

export default function Layout({ children }) {
  const [active, setActive] = useState("dashboard");
  const [open, setOpen] = useState({ usermgmt: false, collection: false, mastermenu: false, vehiclemgmt: false });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [challanView, setChallanView] = useState("list"); // "list" | "add"

  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const displayName = user?.full_name || user?.username || "User";
  const displayRole = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Agent";
  const initials = getInitials(displayName);

  const readPermissions = () => {
    try {
      const raw = localStorage.getItem("menu_permissions");
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  };

  const permissions = readPermissions();
  const isAdmin = user?.role === "Admin" || user?.is_staff === true;

  const filteredNav = NAV.map(section => {
    if (!section.children) {
      if (isAdmin) return section;
      if (!section.permKey) return section;
      if (permissions[section.permKey] === true) return section;
      return null;
    }

    const allowedChildren = section.children.filter(item => {
      if (isAdmin) return true;
      if (!item.permKey) return true;
      return permissions[item.permKey] === true;
    });
    if (allowedChildren.length === 0) return null;

    return { ...section, children: allowedChildren };
  }).filter(Boolean);

  const handleLogout = async () => {
    const refresh = localStorage.getItem("refresh_token");
    try {
      if (refresh) await fetch("http://127.0.0.1:8000/api/auth/logout/", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("access_token")}` },
        body: JSON.stringify({ refresh }),
      });
    } catch {}
    finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
  };

  const toggleSection = (id) => setOpen(p => ({ ...p, [id]: !p[id] }));
  const handleNav = (id, parentId) => {
    setActive(id);
    if (parentId) setOpen(p => ({ ...p, [parentId]: true }));
    if (id !== "vm_service") setChallanView("list");
  };

  const meta = PAGE_META[active] || {};
  const isCol = active.startsWith("col_");
  const isUsersPage = active === "um_users";
  const isRolesPage = active === "um_roles";
  const isVehiclePage    = active === "mm_vehicle";
  const isVmVehiclePage  = active === "vm_vehicle";
  const isVmTripsPage    = active === "vm_trips";
  const isVmFuelPage     = active === "vm_fuel";
  const isVmServicePage  = active === "vm_service";

  const sidebarWidth = isCollapsed ? "72px" : "256px";

  return (
    <>
      <style>{`
        @import url('https://fonts.cdnfonts.com/css/nohemi');
        
        *, *::before, *::after { 
          box-sizing: border-box; 
          margin: 0; 
          padding: 0; 
          font-family: 'Nohemi', sans-serif !important;
        }

        :root {
          --bg:       #f8f9fa;
          --surface:  #ffffff;
          --surface2: #f1f3f4;
          --border:   #e8eaed;
          --accent:   #1a73e8;
          --gold:     #1a73e8;
          --red:      #d93025;  --red-lt:   #fce8e6;
          --green:    #188038;  --green-lt: #e6f4ea;
          --amber:    #e37400;  --amber-lt: #fef7e0;
          --text:     #202124;
          --muted:    #5f6368;
          --sw:       256px;
          --r:        8px;
          --ff:       'Nohemi', sans-serif;
          --ffd:      'Nohemi', sans-serif;
          --ease:     0.2s cubic-bezier(0.4,0,0.2,1);
        }

        html, body, #root { height: 100%; margin: 0; padding: 0; }
        body { font-family: 'Nohemi', sans-serif; background:#e1ebf8; color: var(--text); -webkit-font-smoothing: antialiased; }

        .shell { display: flex; width: 100vw; height: 100vh; overflow: hidden; }

        .sidebar { 
          width: var(--sidebar-width);
          min-width: var(--sidebar-width);
          flex-shrink: 0; 
          background: #ffffff;
          border-right: 1px solid #e8eaed;
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow: hidden;
          transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .sb-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          height: 60px;
          border-bottom: 1px solid #e8eaed;
          flex-shrink: 0;
        }

        .sb-logo { 
          display: flex; 
          align-items: center; 
          gap: 11px;
          justify-content: flex-start;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .sidebar.collapsed .sb-logo {
          justify-content: center;
          width: 100%;
        }
        
        .sb-mark { 
          width: 34px; 
          height: 34px; 
          border-radius: 9px; 
          background: var(--accent);
          display: grid;
          place-items: center;
          font-family: var(--ffd);
          font-size: 18px;
          font-weight: 700;
          color: #ffffff;
          flex-shrink: 0;
        }
        
        .sb-brand-text { 
          font-family: var(--ffd);
          font-size: 17px;
          color: #202124;
          white-space: nowrap;
        }
        
        .sb-tagline { 
          font-size: 9px; 
          font-weight: 500; 
          letter-spacing: 2px; 
          text-transform: uppercase; 
          color: #5f6368;
          white-space: nowrap;
          font-family: 'Google Sans', 'Roboto', sans-serif;
        }

        .collapse-btn-header {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          border-radius: 8px;
          border: 1px solid #e8eaed;
          background: #f8f9fa;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          width: 32px;
          height: 32px;
          flex-shrink: 0;
        }
        
        .sidebar.collapsed .collapse-btn-header {
          margin: 0 auto;
        }
        
        .collapse-btn-header:hover {
          background: rgba(26,115,232,0.08);
          border-color: var(--accent);
          transform: translateY(-1px);
        }
        
        .collapse-btn-header:active {
          transform: translateY(0);
        }

        .sb-nav { 
          flex: 1; 
          overflow-y: auto; 
          overflow-x: hidden; 
          padding: 14px 0 20px; 
          scrollbar-width: none;
        }
        .sb-nav::-webkit-scrollbar { display:none; }
        .sb-divider { height:1px; background:#e8eaed; margin:6px 22px; }
        
        .sidebar.collapsed .sb-divider {
          margin: 6px 12px;
        }

        .sb-sec { 
          display: flex; 
          align-items: center; 
          gap: 10px; 
          width: 100%; 
          padding: 11px 22px; 
          background: none; 
          border: none; 
          cursor: pointer; 
          color: #5f6368;
          font-family: 'Google Sans', 'Roboto', sans-serif; 
          font-size:14px; 
          font-weight: 600; 
          text-align: left; 
          position: relative; 
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
          justify-content: flex-start;
        }
        
        /* When sidebar is collapsed, center the icons */
        .sidebar.collapsed .sb-sec {
          justify-content: center;
          padding: 11px 0;
        }
        
        .sidebar.collapsed .sb-child {
          justify-content: center;
          padding: 8px 0;
        }
        
        .sidebar.collapsed .sb-sec-icon,
        .sidebar.collapsed .sb-child-icon {
          margin: 0;
        }
        
        .sb-sec:hover { color:#1a73e8; background:rgba(26,115,232,0.06); border-radius:0 24px 24px 0; margin-right:16px; }
        .sb-sec.active-single { color:#1a73e8; background:rgba(26,115,232,0.1); border-radius:0 24px 24px 0; margin-right:16px; font-weight:700; }
        .sb-sec.active-single::before, .sb-child.active::before { content:''; position:absolute; left:0; top:6px; bottom:6px; width:3px; background:var(--accent); border-radius:0 3px 3px 0; }
        .sb-sec.open { color:#202124; }
        .sb-sec-icon { 
          font-size: 18px; 
          flex-shrink: 0; 
          width: 24px; 
          text-align: center;
          color: #202124;
          filter: none;
          transition: color 0.2s ease;
        }
        .sb-sec:hover .sb-sec-icon { color: #1a73e8; }
        .sb-sec.active-single .sb-sec-icon { color: #1a73e8; }
        .sb-sec.open .sb-sec-icon { color: #202124; }
        .sb-sec-lbl  { 
          flex: 1; 
          white-space: nowrap;
          transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .sidebar.collapsed .sb-sec-lbl {
          display: none;
        }
        
        .sb-chevron  { 
          font-size: 10px; 
          color: #9aa0a6; 
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .sb-chevron.open { transform:rotate(180deg); }
        
        .sidebar.collapsed .sb-chevron {
          display: none;
        }

        .sb-child { 
          display: flex; 
          align-items: center; 
          gap: 9px; 
          width: 100%; 
          padding: 8px 22px 8px 46px; 
          background: none; 
          border: none; 
          cursor: pointer; 
          color: #5f6368;
          font-family: 'Google Sans', 'Roboto', sans-serif;
          font-size: 13px;
          font-weight: 500; 
          text-align: left; 
          position: relative; 
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
          justify-content: flex-start;
        }
        .sb-child:hover  { color:#1a73e8; background:rgba(26,115,232,0.06); border-radius:0 24px 24px 0; margin-right:16px; }
        .sb-child.active { color:#1a73e8; background:rgba(26,115,232,0.1); border-radius:0 24px 24px 0; margin-right:16px; font-weight:700; }
        .sb-child-icon   { 
          font-size: 16px; 
          width: 20px; 
          text-align: center;
          color: #202124;
          filter: none;
          transition: color 0.2s ease;
        }
        .sb-child:hover .sb-child-icon { color: #1a73e8; }
        .sb-child.active .sb-child-icon { color: #1a73e8; }
        .sb-child-label  {
          transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .sidebar.collapsed .sb-child-label {
          display: none;
        }

        .sb-footer { 
          padding: 12px 16px; 
          border-top: 1px solid #e8eaed;
          display: flex;
          flex-direction: column; 
          gap: 10px; 
          flex-shrink: 0; 
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .sidebar.collapsed .sb-footer {
          padding: 12px 8px;
        }
        
        .sb-user-section { 
          display: flex; 
          align-items: center; 
          gap: 10px; 
          justify-content: flex-start;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .sidebar.collapsed .sb-user-section {
          justify-content: center;
        }
        
        .sb-av { 
          width: 32px; 
          height: 32px; 
          border-radius: 8px; 
          background: var(--accent);
          display: grid;
          place-items: center;
          font-size: 12px;
          font-weight: 700;
          color: #ffffff;
          flex-shrink: 0;
          font-family: 'Google Sans', 'Roboto', sans-serif;
        }
        .sb-user-info { 
          transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .sidebar.collapsed .sb-user-info {
          display: none;
        }
        
        .sb-uname { font-size:13px; font-weight:600; color:#202124; white-space: nowrap; font-family: 'Google Sans', 'Roboto', sans-serif; }
        .sb-urole { font-size:10px; color:#5f6368; margin-top:1px; white-space: nowrap; font-family: 'Google Sans', 'Roboto', sans-serif; }

        .logout-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px;
          border-radius: 8px;
          border: 1px solid #e8eaed;
          background: #f8f9fa;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          width: 100%;
          margin-top: 4px;
          font-family: 'Calibri', 'Segoe UI', 'Roboto', sans-serif;
        }
        
        .sidebar.collapsed .logout-btn {
          padding: 8px;
        }
        
        .logout-btn:hover {
          background: rgba(217,48,37,0.08);
          border-color: var(--red);
          transform: scale(1.05);
        }
        
        .logout-icon {
          color: #5f6368;
          font-size: 25px;
          font-weight: 600;
          display: inline-block;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .logout-btn:hover .logout-icon {
          transform: rotate(90deg);
        }
        
        .logout-text {
        font-size: 13px;
        font-weight: 500;
        color: #202124;
        }

        .main { flex: 1; min-width: 0; display: flex; flex-direction: column; height: 100vh; overflow: hidden; background: var(--bg); }

        .page { flex:1; padding:28px; overflow-y:auto; }
        .page-full { flex:1; display:flex; flex-direction:column; overflow:hidden; }
        .page-full-scroll { flex:1; display:flex; flex-direction:column; overflow-y:auto; }

        .page-head  { margin-bottom:26px; }
        .page-tag   { font-size:10px; font-weight:600; letter-spacing:2px; text-transform:uppercase; color:var(--accent); margin-bottom:4px; font-family: 'Google Sans', 'Roboto', sans-serif; }
        .page-title { font-family:var(--ffd); font-size:27px; font-weight:700; color:black; letter-spacing:-0.4px; }
        .page-desc  { font-size:13.5px; color:var(--muted); margin-top:5px; max-width:500px; line-height:1.6; font-family: 'Calibri', 'Segoe UI', 'Roboto', sans-serif; }

        .stats { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:14px; margin-bottom:22px; }
        .stat-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--r); padding:18px 20px; transition:box-shadow var(--ease),transform var(--ease); }
        .stat-card:hover { box-shadow:0 4px 22px rgba(0,0,0,0.07); transform:translateY(-2px); }
        .s-label { font-size:10px; font-weight:600; letter-spacing:1.3px; text-transform:uppercase; color:var(--muted); margin-bottom:8px; font-family: 'Calibri', 'Segoe UI', 'Roboto', sans-serif; }
        .s-value { font-family:var(--ffd); font-size:24px; font-weight:700; color:var(--accent); line-height:1; }
        .s-delta { margin-top:6px; font-size:11.5px; font-weight:600; font-family: 'Calibri', 'Segoe UI', 'Roboto', sans-serif; }
        .s-delta.pos { color:var(--green); }
        .s-delta.neg { color:var(--red); }

        .card      { background:var(--surface); border:1px solid var(--border); border-radius:var(--r); overflow:hidden; }
        .card-head { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid var(--border); }
        .card-title { font-size:14px; font-weight:700; color:var(--accent); font-family: 'Calibri', 'Segoe UI', 'Roboto', sans-serif; }
        .card-acts  { display:flex; gap:8px; }

        .btn   { font-family: 'Calibri', 'Segoe UI', 'Roboto', sans-serif; font-size:12px; font-weight:600; padding:6px 14px; border-radius:7px; border:none; cursor:pointer; transition:all var(--ease); }
        .btn-p { background:var(--accent); color:#fff; }
        .btn-p:hover { background:#0f2418; }
        .btn-g { background:var(--surface2); color:var(--muted); border:1px solid var(--border); }
        .btn-g:hover { color:var(--accent); border-color:var(--accent); }

        table { width:100%; border-collapse:collapse; }
        thead th { font-size:10px; font-weight:600; letter-spacing:1.2px; text-transform:uppercase; color:var(--muted); text-align:left; padding:10px 20px; background:var(--surface2); border-bottom:1px solid var(--border); font-family: 'Calibri', 'Segoe UI', 'Roboto', sans-serif; }
        tbody tr { transition:background var(--ease); }
        tbody tr:not(:last-child) td { border-bottom:1px solid var(--border); }
        tbody tr:hover td { background:#fafaf7; }
        tbody td { padding:12px 20px; font-size:13px; font-family: 'Calibri', 'Segoe UI', 'Roboto', sans-serif; }

        .pill       { display:inline-block; padding:3px 10px; border-radius:20px; font-size:10.5px; font-weight:600; font-family: 'Calibri', 'Segoe UI', 'Roboto', sans-serif; }
        .pill-green { background:var(--green-lt); color:var(--green); }
        .pill-red   { background:var(--red-lt);   color:var(--red);   }
        .pill-amber { background:var(--amber-lt); color:var(--amber); }
        .pill-muted { background:var(--surface2); color:var(--muted); }

        .dash-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-top:14px; }
        @media (max-width:900px) { .dash-grid { grid-template-columns:1fr; } }

        .tx-row { display:flex; align-items:center; gap:12px; padding:12px 20px; border-bottom:1px solid var(--border); transition:background var(--ease); }
        .tx-row:last-child { border-bottom:none; }
        .tx-row:hover { background:#fafaf7; }
        .tx-dot  { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
        .tx-name { font-size:13px; font-weight:600; flex:1; font-family: 'Calibri', 'Segoe UI', 'Roboto', sans-serif; }
        .tx-date { font-size:11px; color:var(--muted); font-family: 'Calibri', 'Segoe UI', 'Roboto', sans-serif; }
        .tx-amt  { font-family:var(--ffd); font-size:13px; font-weight:700; }
        .tx-amt.cr { color:var(--green); }
        .tx-amt.dr { color:var(--red); }

        .payment-form-container {
          max-width: 800px;
          margin: 0 auto;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--r);
          padding: 24px;
        }

        .payment-form-container h2 {
          font-family: var(--ffd);
          font-size: 20px;
          color: var(--accent);
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border);
        }

        .payment-form .form-group {
          margin-bottom: 18px;
        }

        .payment-form label {
          display: block;
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 6px;
          color: var(--accent);
          font-family: 'Calibri', 'Segoe UI', 'Roboto', sans-serif;
        }

        .payment-form input,
        .payment-form select,
        .payment-form textarea {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--border);
          border-radius: 6px;
          font-family: 'Calibri', 'Segoe UI', 'Roboto', sans-serif;
          font-size: 13px;
          transition: all var(--ease);
        }

        .payment-form input:focus,
        .payment-form select:focus,
        .payment-form textarea:focus {
          outline: none;
          border-color: var(--gold);
          box-shadow: 0 0 0 2px rgba(201, 168, 76, 0.1);
        }

        .payment-form .error {
          border-color: var(--red);
        }

        .error-message {
          color: var(--red);
          font-size: 11px;
          margin-top: 4px;
          display: block;
          font-family: 'Calibri', 'Segoe UI', 'Roboto', sans-serif;
        }

        .amount-input {
          position: relative;
          display: flex;
          align-items: center;
        }

        .currency-symbol {
          position: absolute;
          left: 12px;
          font-weight: 600;
          color: var(--muted);
          font-family: 'Calibri', 'Segoe UI', 'Roboto', sans-serif;
        }

        .amount-input input {
          padding-left: 28px;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid var(--border);
        }

        .btn-primary {
          background: var(--accent);
          color: white;
          min-width: 120px;
          font-family: 'Calibri', 'Segoe UI', 'Roboto', sans-serif;
        }

        .btn-secondary {
          background: var(--surface2);
          color: var(--muted);
          border: 1px solid var(--border);
          font-family: 'Calibri', 'Segoe UI', 'Roboto', sans-serif;
        }

        .btn-primary:hover:not(:disabled) {
          background: #0f2418;
          transform: translateY(-1px);
        }

        .btn-secondary:hover:not(:disabled) {
          background: var(--surface);
          color: var(--accent);
          border-color: var(--accent);
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .alert {
          padding: 12px 16px;
          border-radius: 6px;
          margin-bottom: 20px;
          font-size: 13px;
          font-weight: 500;
          font-family: 'Calibri', 'Segoe UI', 'Roboto', sans-serif;
        }

        .alert-success {
          background: var(--green-lt);
          color: var(--green);
          border: 1px solid rgba(30, 107, 69, 0.2);
        }

        .alert-error {
          background: var(--red-lt);
          color: var(--red);
          border: 1px solid rgba(192, 57, 43, 0.2);
        }

        .debug-info {
          margin-top: 24px;
          padding: 16px;
          background: var(--surface2);
          border-radius: 6px;
          font-size: 11px;
          overflow-x: auto;
          font-family: 'Calibri', 'Segoe UI', 'Roboto', sans-serif;
        }

        /* Chart styles */
        .bar-chart {
          display: flex;
          align-items: flex-end;
          gap: 12px;
          height: 180px;
          padding: 20px 16px;
        }
        .bar-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .bar {
          width: 100%;
          background: var(--accent);
          border-radius: 6px 6px 0 0;
          transition: height 0.5s ease;
          cursor: pointer;
        }
        .bar:hover {
          opacity: 0.8;
          transform: scaleX(1.02);
        }
        .bar-label {
          font-size: 10px;
          font-weight: 600;
          color: var(--muted);
          text-align: center;
        }
        .bar-value {
          font-size: 11px;
          font-weight: 700;
          color: var(--accent);
        }

        .pie-chart-container {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          gap: 24px;
          flex-wrap: wrap;
        }
        .pie-legend {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 500;
        }
        .legend-color {
          width: 10px;
          height: 10px;
          border-radius: 2px;
        }
        .legend-label {
          color: var(--text);
        }
        .legend-value {
          color: var(--muted);
          margin-left: 4px;
        }
        
        /* KPI Grid Styles */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 20px;
        }
        
        @media (max-width: 1200px) {
          .kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media (max-width: 768px) {
          .kpi-grid {
            grid-template-columns: 1fr;
          }
        }
        
        .kpi-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--r);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          transition: box-shadow 0.2s, transform 0.2s;
          cursor: default;
          min-width: 0;
        }
        
        .kpi-card:hover {
          box-shadow: 0 6px 24px rgba(0,0,0,0.08);
          transform: translateY(-2px);
        }
        
        .kpi-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        
        .kpi-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.3px;
          text-transform: uppercase;
          color: var(--muted);
          font-family: 'Calibri', 'Segoe UI', 'Roboto', sans-serif;
        }
        
        .kpi-icon {
          font-size: 20px;
          line-height: 1;
        }
        
        .kpi-value {
          font-family: var(--ffd);
          font-size: 26px;
          font-weight: 800;
          color: var(--accent);
          line-height: 1;
        }
        
        .kpi-footer {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 6px;
        }
        
        .kpi-delta {
          font-size: 11px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 10px;
          font-family: 'Calibri', 'Segoe UI', 'Roboto', sans-serif;
        }
        
        .kpi-delta.pos {
          background: var(--green-lt);
          color: var(--green);
        }
        
        .kpi-delta.neg {
          background: var(--red-lt);
          color: var(--red);
        }
        
        .kpi-sub {
          font-size: 11px;
          color: var(--muted);
          font-family: 'Calibri', 'Segoe UI', 'Roboto', sans-serif;
        }
      `}</style>

      <div className={`shell ${isCollapsed ? 'collapsed' : ''}`} style={{ '--sidebar-width': sidebarWidth }}>

        {/* ── SIDEBAR ── */}
        <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
          <div className="sb-header">
            <div className="sb-logo">
              {isCollapsed ? (
                <img
                  src={floshLogo}
                  alt="Flosh Innovations"
                  style={{ width: "36px", height: "36px", objectFit: "contain" }}
                />
              ) : (
                <img
                  src={floshLogo}
                  alt="Flosh Innovations"
                  style={{ height: "38px", maxWidth: "160px", objectFit: "contain" }}
                />
              )}
            </div>
            {!isCollapsed && (
              <button className="collapse-btn-header" onClick={() => setIsCollapsed(!isCollapsed)}>
                <CollapseIcon isCollapsed={isCollapsed} />
              </button>
            )}
          </div>
          
          {/* Show collapse button in centered position when collapsed */}
          {isCollapsed && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0', borderBottom: '1px solid #e8eaed' }}>
              <button className="collapse-btn-header" onClick={() => setIsCollapsed(!isCollapsed)}>
                <CollapseIcon isCollapsed={isCollapsed} />
              </button>
            </div>
          )}

          <nav className="sb-nav">
            {filteredNav.map((item, idx) => {
              const isExpanded = open[item.id] || item.children?.some(c => c.id === active);
              return (
                <div key={item.id}>
                  {idx > 0 && <div className="sb-divider" />}
                  <button
                    className={`sb-sec ${item.children === null ? (active === item.id ? "active-single" : "") : (isExpanded ? "open" : "")}`}
                    onClick={() => item.children === null ? setActive(item.id) : toggleSection(item.id)}
                    title={isCollapsed ? item.section : ""}
                  >
                    <span className="sb-sec-icon">{item.icon}</span>
                    {!isCollapsed && <span className="sb-sec-lbl">{item.section}</span>}
                    {item.children && !isCollapsed && <span className={`sb-chevron ${isExpanded ? "open" : ""}`}>▾</span>}
                  </button>
                  {item.children && isExpanded && (
                    <div>
                      {item.children.map(child => (
                        <button 
                          key={child.id} 
                          className={`sb-child ${active === child.id ? "active" : ""}`} 
                          onClick={() => handleNav(child.id, item.id)}
                          title={isCollapsed ? child.label : ""}
                        >
                          <span className="sb-child-icon">{child.icon}</span>
                          {!isCollapsed && <span className="sb-child-label">{child.label}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="sb-footer">
            <div className="sb-user-section">
              <div className="sb-av">{initials}</div>
              {!isCollapsed && (
                <div className="sb-user-info">
                  <div className="sb-uname">{displayName}</div>
                  <div className="sb-urole">{displayRole}</div>
                </div>
              )}
            </div>

            <button className="logout-btn" onClick={handleLogout}>
              <span className="logout-icon">⎋</span>
              <span className="logout-text">Sign Out</span>
            </button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <div className="main">

          {isVehiclePage && (
            <div className="page-full">
              <VehicleMaster />
            </div>
          )}

          {isVmVehiclePage && (
            <div className="page-full">
              <VehicleMaster />
            </div>
          )}

          {isVmTripsPage && (
            <div className="page-full">
              <TravelList />
            </div>
          )}

          {isVmFuelPage && (
            <div className="page">
              <div className="page-head">
                <div className="page-tag">Vehicle Management</div>
                <h1 className="page-title">Fuel Logs</h1>
                <p className="page-desc">Record and monitor fuel consumption across the fleet.</p>
              </div>
              <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", border: "1px solid #e8eaed", borderRadius: 10, color: "#5f6368", fontSize: 14 }}>
                ⛽ Fuel Logs module coming soon.
              </div>
            </div>
          )}

          {isVmServicePage && (
            <div className="page-full">
              {challanView === "list" ? (
                <ChallanList onAdd={() => setChallanView("add")} />
              ) : (
                <ChallanAdd onBack={() => setChallanView("list")} />
              )}
            </div>
          )}

          {isUsersPage && (
            <div className="page-full">
              <UserList />
            </div>
          )}

          {isRolesPage && (
            <div className="page-full">
              <RoleAccess />
            </div>
          )}

          {isCol && (
            <div className="page">
              <div className="page-head">
                <div className="page-tag">{meta.tag}</div>
                <h1 className="page-title">{meta.title}</h1>
                <p className="page-desc">{meta.desc}</p>
              </div>
              <PaymentTable />
            </div>
          )}

          {/* Dashboard Component */}
          {active === "dashboard" && (
            <div className="page-full-scroll">
              <Dashboard />
            </div>
          )}

          {children}
        </div>
      </div>
    </>
  );
}