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
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined';

import EmergencyOutlinedIcon from '@mui/icons-material/EmergencyOutlined';
import ClaimsList from "../Components/claim_list.jsx";
import ClaimsAdd from "../Components/claim_add.jsx";

import ImageCaptureLinkGenerator from "../Components/Image_link.jsx";
import ImageCaptureList from "../Components/imgcapture_list.jsx";
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
        label: "Add Collection",
        icon: <GradingOutlinedIcon style={{ width: 18, height: 18 }} />
      },
      {
        id: "col_reports_view",
        permKey: "col_reports_view",
        label: "Collection Report",
        icon: <AssessmentOutlinedIcon style={{ width: 18, height: 18 }} />
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

  // ── Claims: single item, no children (same pattern as Image Capture) ───────
  {
    section: "Claims",
    icon: <EmergencyOutlinedIcon style={{ width: 18, height: 18 }} />,
    id: "cl_list",
    permKey: "cl_list",
    children: null
  },
  // ─────────────────────────────────────────────────────────────────────────────

  {
    section: "Image Capture",
    icon: <CameraAltOutlinedIcon style={{ width: 18, height: 18 }} />,
    id: "image_capture",
    permKey: "image_capture",
    children: null
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
  dashboard:   { title: "My Dashboard",        tag: "Overview",            desc: "Your financial overview, recent activity and collection summary." },
  um_users:    { title: "All Users",            tag: "User Management",     desc: "Browse, search and manage every registered user account." },
  um_roles:    { title: "Roles & Access",       tag: "User Management",     desc: "Define permissions and control what each role can do." },
  mm_vehicle:  { title: "Vehicle",              tag: "Master Menu",         desc: "Manage vehicle records, types and configurations." },
  vm_vehicle:  { title: "Vehicle Master",       tag: "Vehicle Management",  desc: "Manage vehicle records, types and configurations." },
  vm_trips:    { title: "Trip Management",      tag: "Vehicle Management",  desc: "Track and manage all vehicle trips and assignments." },
  vm_fuel:     { title: "Fuel Logs",            tag: "Vehicle Management",  desc: "Record and monitor fuel consumption across the fleet." },
  vm_service:  { title: "Service & Maintenance",tag: "Vehicle Management",  desc: "Schedule and track vehicle service and maintenance history." },
  col_reports: { title: "",                     tag: "",                    desc: "" },
  col_reports_view: { title: "Collection Reports", tag: "Collection",        desc: "View and analyse collection reports and summaries." },
  cl_list:     { title: "Claims List",          tag: "Claims",              desc: "Track, review and manage all expense claims." },
  image_capture: { title: "Image Capture",      tag: "Image Capture",       desc: "Generate secure image capture links for customers." },
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

const CollapseIcon = ({ isCollapsed }) => (
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
    <rect x="3"  y="5" width="7" height="14" rx="1.5" stroke="#5f6368" strokeWidth="1.5" fill="none" />
    <rect x="14" y="5" width="7" height="14" rx="1.5" stroke="#5f6368" strokeWidth="1.5" fill="none" />
  </svg>
);

export default function Layout({ children }) {
  const [active, setActive] = useState("dashboard");
  const [open, setOpen] = useState({
    usermgmt: false,
    collection: false,
    mastermenu: false,
    vehiclemgmt: false,
  });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [challanView, setChallanView] = useState("list");
  const [claimsView, setClaimsView] = useState("list");
  const [imageCaptureView, setImageCaptureView] = useState("list");

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
    } catch { return {}; }
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
    const refresh     = localStorage.getItem("refresh_token");
    const accessToken = localStorage.getItem("access_token");
    const API_BASE    = (import.meta.env.VITE_API_BASE_URL || "https://flasherp.in").replace(/\/$/, "");
    try {
      if (refresh) {
        await fetch(`${API_BASE}/api/auth/logout/`, {
          method:  "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ refresh }),
        });
      }
    } catch {
      // silent fail
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      localStorage.removeItem("menu_permissions");
      window.location.href = "/login";
    }
  };

  const toggleSection = (id) => setOpen(p => ({ ...p, [id]: !p[id] }));
  const handleNav = (id, parentId) => {
    setActive(id);
    setMobileOpen(false);
    if (parentId) setOpen(p => ({ ...p, [parentId]: true }));
    if (id !== "vm_service") setChallanView("list");
    if (id !== "cl_list") setClaimsView("list");
    if (id !== "image_capture") setImageCaptureView("list");
  };

  const meta = PAGE_META[active] || {};
  const isCol          = active === "col_reports";
  const isColReportsPage = active === "col_reports_view";
  const isUsersPage    = active === "um_users";
  const isRolesPage    = active === "um_roles";
  const isVehiclePage  = active === "mm_vehicle";
  const isVmVehiclePage = active === "vm_vehicle";
  const isVmTripsPage  = active === "vm_trips";
  const isVmFuelPage   = active === "vm_fuel";
  const isVmServicePage = active === "vm_service";
  const isClaimsPage   = active === "cl_list";
  const isImageCapturePage = active === "image_capture";

  const sidebarWidth = isCollapsed ? "72px" : "256px";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Google Sans', sans-serif !important; }
        :root {
          --bg:#f8f9fa; --surface:#ffffff; --surface2:#f1f3f4; --border:#e8eaed;
          --accent:#1a73e8; --gold:#1a73e8;
          --red:#d93025; --red-lt:#fce8e6; --green:#188038; --green-lt:#e6f4ea;
          --amber:#e37400; --amber-lt:#fef7e0;
          --text:#202124; --muted:#5f6368;
          --sw:256px; --r:8px; --ff:'Google Sans',sans-serif; --ffd:'Google Sans',sans-serif;
          --ease:0.2s cubic-bezier(0.4,0,0.2,1);
        }
        html,body,#root { height:100%; margin:0; padding:0; }
        body { font-family:'Google Sans',sans-serif; background:#e1ebf8; color:var(--text); -webkit-font-smoothing:antialiased; }
        .shell { display:flex; width:100vw; height:100vh; overflow:hidden; }
        .sidebar { width:var(--sidebar-width); min-width:var(--sidebar-width); flex-shrink:0; background:#ffffff; border-right:1px solid #e8eaed; display:flex; flex-direction:column; height:100vh; overflow:hidden; transition:width 0.3s cubic-bezier(0.4,0,0.2,1); }
        .sb-header { display:flex; align-items:center; justify-content:space-between; padding:0 16px; height:60px; border-bottom:1px solid #e8eaed; flex-shrink:0; }
        .sb-logo { display:flex; align-items:center; gap:11px; justify-content:flex-start; transition:all 0.3s cubic-bezier(0.4,0,0.2,1); }
        .sidebar.collapsed .sb-logo { justify-content:center; width:100%; }
        .collapse-btn-header { display:flex; align-items:center; justify-content:center; padding:6px; border-radius:8px; border:1px solid #e8eaed; background:#f8f9fa; cursor:pointer; transition:all 0.3s cubic-bezier(0.4,0,0.2,1); width:32px; height:32px; flex-shrink:0; }
        .sidebar.collapsed .collapse-btn-header { margin:0 auto; }
        .collapse-btn-header:hover { background:rgba(26,115,232,0.08); border-color:var(--accent); transform:translateY(-1px); }
        .collapse-btn-header:active { transform:translateY(0); }
        .sb-nav { flex:1; overflow-y:auto; overflow-x:hidden; padding:14px 0 20px; scrollbar-width:none; }
        .sb-nav::-webkit-scrollbar { display:none; }
        .sb-divider { height:1px; background:#e8eaed; margin:6px 22px; }
        .sidebar.collapsed .sb-divider { margin:6px 12px; }
        .sb-sec { display:flex; align-items:center; gap:10px; width:100%; padding:11px 22px; background:none; border:none; cursor:pointer; color:#5f6368; font-family:'Google Sans',sans-serif; font-size:14px; font-weight:600; text-align:left; position:relative; transition:all 0.3s cubic-bezier(0.4,0,0.2,1); justify-content:flex-start; }
        .sidebar.collapsed .sb-sec { justify-content:center; padding:11px 0; }
        .sidebar.collapsed .sb-child { justify-content:center; padding:8px 0; }
        .sb-sec:hover { color:#1a73e8; background:rgba(26,115,232,0.06); border-radius:0 24px 24px 0; margin-right:16px; }
        .sb-sec.active-single { color:#1a73e8; background:rgba(26,115,232,0.1); border-radius:0 24px 24px 0; margin-right:16px; font-weight:700; }
        .sb-sec.active-single::before,.sb-child.active::before { content:''; position:absolute; left:0; top:6px; bottom:6px; width:3px; background:var(--accent); border-radius:0 3px 3px 0; }
        .sb-sec.open { color:#202124; }
        .sb-sec-icon { font-size:18px; flex-shrink:0; width:24px; text-align:center; color:#202124; transition:color 0.2s ease; }
        .sb-sec:hover .sb-sec-icon { color:#1a73e8; }
        .sb-sec.active-single .sb-sec-icon { color:#1a73e8; }
        .sb-sec-lbl { flex:1; white-space:nowrap; transition:opacity 0.3s cubic-bezier(0.4,0,0.2,1); }
        .sidebar.collapsed .sb-sec-lbl { display:none; }
        .sb-chevron { font-size:10px; color:#9aa0a6; transition:transform 0.3s cubic-bezier(0.4,0,0.2,1); }
        .sb-chevron.open { transform:rotate(180deg); }
        .sidebar.collapsed .sb-chevron { display:none; }
        .sb-child { display:flex; align-items:center; gap:9px; width:100%; padding:8px 22px 8px 46px; background:none; border:none; cursor:pointer; color:#5f6368; font-family:'Google Sans',sans-serif; font-size:13px; font-weight:500; text-align:left; position:relative; transition:all 0.3s cubic-bezier(0.4,0,0.2,1); justify-content:flex-start; }
        .sb-child:hover { color:#1a73e8; background:rgba(26,115,232,0.06); border-radius:0 24px 24px 0; margin-right:16px; }
        .sb-child.active { color:#1a73e8; background:rgba(26,115,232,0.1); border-radius:0 24px 24px 0; margin-right:16px; font-weight:700; }
        .sb-child-icon { font-size:16px; width:20px; text-align:center; color:#202124; transition:color 0.2s ease; }
        .sb-child:hover .sb-child-icon { color:#1a73e8; }
        .sb-child.active .sb-child-icon { color:#1a73e8; }
        .sb-child-label { transition:opacity 0.3s cubic-bezier(0.4,0,0.2,1); }
        .sidebar.collapsed .sb-child-label { display:none; }
        .sb-footer { padding:12px 16px; border-top:1px solid #e8eaed; display:flex; flex-direction:column; gap:10px; flex-shrink:0; transition:all 0.3s cubic-bezier(0.4,0,0.2,1); }
        .sidebar.collapsed .sb-footer { padding:12px 8px; }
        .sb-user-section { display:flex; align-items:center; gap:10px; justify-content:flex-start; transition:all 0.3s cubic-bezier(0.4,0,0.2,1); }
        .sidebar.collapsed .sb-user-section { justify-content:center; }
        .sb-av { width:32px; height:32px; border-radius:8px; background:var(--accent); display:grid; place-items:center; font-size:12px; font-weight:700; color:#ffffff; flex-shrink:0; }
        .sidebar.collapsed .sb-user-info { display:none; }
        .sb-uname { font-size:13px; font-weight:600; color:#202124; white-space:nowrap; }
        .sb-urole { font-size:10px; color:#5f6368; margin-top:1px; white-space:nowrap; }
        .logout-btn { display:flex; align-items:center; justify-content:center; gap:6px; padding:8px; border-radius:8px; border:1px solid #e8eaed; background:#f8f9fa; cursor:pointer; transition:all 0.3s cubic-bezier(0.4,0,0.2,1); width:100%; margin-top:4px; }
        .logout-btn:hover { background:rgba(217,48,37,0.08); border-color:var(--red); transform:scale(1.05); }
        .logout-icon { color:#5f6368; font-size:25px; font-weight:600; display:inline-block; transition:transform 0.3s cubic-bezier(0.4,0,0.2,1); }
        .logout-btn:hover .logout-icon { transform:rotate(90deg); }
        .logout-text { font-size:13px; font-weight:500; color:#202124; }
        .main { flex:1; min-width:0; display:flex; flex-direction:column; height:100vh; overflow:hidden; background:var(--bg); }
        .mobile-topbar { display: none; align-items: center; gap: 12px; padding: 0 16px; height: 52px; background: #fff; border-bottom: 1px solid #e8eaed; flex-shrink: 0; position: sticky; top: 0; z-index: 100; }
        .hamburger-btn { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border: none; background: none; cursor: pointer; border-radius: 8px; padding: 6px; transition: background 0.15s; }
        .hamburger-btn:hover { background: #f1f3f4; }
        .mobile-topbar-logo { height: 28px; object-fit: contain; }
        .sb-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 200; animation: fadeIn 0.2s ease; }
        .sb-overlay.open { display: block; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @media (max-width: 768px) {
          .shell { position: relative; }
          .collapse-btn-header { display: none !important; }
          .sidebar { position: fixed !important; top: 0; left: 0; height: 100vh !important; width: 260px !important; min-width: 260px !important; z-index: 300; transform: translateX(-100%); transition: transform 0.28s cubic-bezier(0.4,0,0.2,1) !important; box-shadow: none; }
          .sidebar.mobile-drawer-open { transform: translateX(0); box-shadow: 4px 0 24px rgba(0,0,0,0.15); }
          .sidebar.collapsed .sb-sec-lbl, .sidebar.collapsed .sb-child-label, .sidebar.collapsed .sb-chevron, .sidebar.collapsed .sb-group-label { display: block !important; }
          .sidebar.collapsed .sb-sec { justify-content: flex-start !important; padding: 11px 22px !important; }
          .sidebar.collapsed .sb-child { justify-content: flex-start !important; padding: 8px 22px 8px 46px !important; }
          .sidebar.collapsed .sb-footer { padding: 12px 16px !important; }
          .sidebar.collapsed .sb-user-section { justify-content: flex-start !important; }
          .sidebar.collapsed .sb-user-info { display: block !important; }
          .sidebar.collapsed .sb-divider { margin: 6px 22px !important; }
          .mobile-topbar { display: flex; }
          .main { width: 100vw; }
        }
        .page { flex:1; padding:28px; overflow-y:auto; }
        .page-full { flex:1; display:flex; flex-direction:column; overflow:hidden; }
        .page-full-scroll { flex:1; display:flex; flex-direction:column; overflow-y:auto; }
        .page-head { margin-bottom:26px; }
        .page-tag { font-size:10px; font-weight:600; letter-spacing:2px; text-transform:uppercase; color:var(--accent); margin-bottom:4px; }
        .page-title { font-family:var(--ffd); font-size:27px; font-weight:700; color:black; letter-spacing:-0.4px; }
        .page-desc { font-size:13.5px; color:var(--muted); margin-top:5px; max-width:500px; line-height:1.6; }
        .stats { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:14px; margin-bottom:22px; }
        .stat-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--r); padding:18px 20px; transition:box-shadow var(--ease),transform var(--ease); }
        .stat-card:hover { box-shadow:0 4px 22px rgba(0,0,0,0.07); transform:translateY(-2px); }
        .s-label { font-size:10px; font-weight:600; letter-spacing:1.3px; text-transform:uppercase; color:var(--muted); margin-bottom:8px; }
        .s-value { font-family:var(--ffd); font-size:24px; font-weight:700; color:var(--accent); line-height:1; }
        .card { background:var(--surface); border:1px solid var(--border); border-radius:var(--r); overflow:hidden; }
        .card-head { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid var(--border); }
        .card-title { font-size:14px; font-weight:700; color:var(--accent); }
        .btn { font-size:12px; font-weight:600; padding:6px 14px; border-radius:7px; border:none; cursor:pointer; transition:all var(--ease); }
        .btn-p { background:var(--accent); color:#fff; }
        .btn-p:hover { background:#0f2418; }
        .btn-g { background:var(--surface2); color:var(--muted); border:1px solid var(--border); }
        .btn-g:hover { color:var(--accent); border-color:var(--accent); }
        table { width:100%; border-collapse:collapse; }
        thead th { font-size:10px; font-weight:600; letter-spacing:1.2px; text-transform:uppercase; color:var(--muted); text-align:left; padding:10px 20px; background:var(--surface2); border-bottom:1px solid var(--border); }
        tbody tr { transition:background var(--ease); }
        tbody tr:not(:last-child) td { border-bottom:1px solid var(--border); }
        tbody tr:hover td { background:#fafaf7; }
        tbody td { padding:12px 20px; font-size:13px; }
        .pill { display:inline-block; padding:3px 10px; border-radius:20px; font-size:10.5px; font-weight:600; }
        .pill-green { background:var(--green-lt); color:var(--green); }
        .pill-red { background:var(--red-lt); color:var(--red); }
        .pill-amber { background:var(--amber-lt); color:var(--amber); }
        .pill-muted { background:var(--surface2); color:var(--muted); }
        .dash-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-top:14px; }
        @media (max-width:900px) { .dash-grid { grid-template-columns:1fr; } }
        .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:20px; }
        @media (max-width:1200px) { .kpi-grid { grid-template-columns:repeat(2,1fr); } }
        @media (max-width:768px) { .kpi-grid { grid-template-columns:1fr; } }
        .kpi-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--r); padding:20px; display:flex; flex-direction:column; gap:4px; transition:box-shadow 0.2s,transform 0.2s; }
        .kpi-card:hover { box-shadow:0 6px 24px rgba(0,0,0,0.08); transform:translateY(-2px); }
        .kpi-label { font-size:10px; font-weight:700; letter-spacing:1.3px; text-transform:uppercase; color:var(--muted); }
        .kpi-value { font-family:var(--ffd); font-size:26px; font-weight:800; color:var(--accent); line-height:1; }
        .kpi-delta { font-size:11px; font-weight:700; padding:2px 7px; border-radius:10px; }
        .kpi-delta.pos { background:var(--green-lt); color:var(--green); }
        .kpi-delta.neg { background:var(--red-lt); color:var(--red); }
        .kpi-sub { font-size:11px; color:var(--muted); }
      `}</style>

      <div className={`shell ${isCollapsed ? 'collapsed' : ''}`} style={{ '--sidebar-width': sidebarWidth }}>

        <div className={`sb-overlay${mobileOpen ? ' open' : ''}`} onClick={() => setMobileOpen(false)} />

        <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-drawer-open' : ''}`}>
          <div className="sb-header">
            <div className="sb-logo">
              {isCollapsed ? (
                <img src={floshLogo} alt="Flosh Innovations" style={{ width: "36px", height: "36px", objectFit: "contain" }} />
              ) : (
                <img src={floshLogo} alt="Flosh Innovations" style={{ height: "38px", maxWidth: "160px", objectFit: "contain" }} />
              )}
            </div>
            {!isCollapsed && (
              <button className="collapse-btn-header" onClick={() => setIsCollapsed(!isCollapsed)}>
                <CollapseIcon isCollapsed={isCollapsed} />
              </button>
            )}
          </div>

          {isCollapsed && (
            <div style={{ display:'flex', justifyContent:'center', padding:'12px 0', borderBottom:'1px solid #e8eaed' }}>
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

        <div className="main">

          <div className="mobile-topbar">
            <button className="hamburger-btn" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5f6368" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <img src={floshLogo} alt="Flosh" className="mobile-topbar-logo" />
          </div>

          {isVehiclePage && (
            <div className="page-full"><VehicleMaster /></div>
          )}

          {isVmVehiclePage && (
            <div className="page-full"><VehicleMaster /></div>
          )}

          {isVmTripsPage && (
            <div className="page-full" style={{ padding: "0" }}><TravelList /></div>
          )}

          {isVmFuelPage && (
            <div className="page">
              <div className="page-head">
                <div className="page-tag">Vehicle Management</div>
                <h1 className="page-title">Fuel Logs</h1>
                <p className="page-desc">Record and monitor fuel consumption across the fleet.</p>
              </div>
              <div style={{ textAlign:"center", padding:"60px 20px", background:"#fff", border:"1px solid #e8eaed", borderRadius:10, color:"#5f6368", fontSize:14 }}>
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
            <div className="page-full"><UserList /></div>
          )}

          {isRolesPage && (
            <div className="page-full"><RoleAccess /></div>
          )}

          {isCol && (
            <div className="page-full"><PaymentTable mode="my" /></div>
          )}

          {isColReportsPage && (
            <div className="page-full"><PaymentTable mode="all" /></div>
          )}

          {isClaimsPage && (
            <div className="page-full">
              {claimsView === "list" ? (
                <ClaimsList onAdd={() => setClaimsView("add")} />
              ) : (
                <ClaimsAdd onSuccess={() => setClaimsView("list")} onCancel={() => setClaimsView("list")} />
              )}
            </div>
          )}

          {isImageCapturePage && (
            <div className="page-full-scroll">
              {imageCaptureView === "list" ? (
                <ImageCaptureList onGenerateLink={() => setImageCaptureView("generate")} />
              ) : (
                <ImageCaptureLinkGenerator onBack={() => setImageCaptureView("list")} />
              )}
            </div>
          )}

          {active === "dashboard" && (
            <div className="page-full-scroll"><Dashboard /></div>
          )}

          {children}
        </div>
      </div>
    </>
  );
}