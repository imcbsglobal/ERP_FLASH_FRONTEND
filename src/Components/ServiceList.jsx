import { useState, useEffect, useCallback } from "react";
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import InterpreterModeIcon from '@mui/icons-material/InterpreterMode';
import Diversity1Icon from '@mui/icons-material/Diversity1';
import GroupsIcon from '@mui/icons-material/Groups';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import InsertPhotoIcon from '@mui/icons-material/InsertPhoto';
import TwoWheelerOutlinedIcon from '@mui/icons-material/TwoWheelerOutlined';
import Woman2OutlinedIcon from '@mui/icons-material/Woman2Outlined';
import SupervisorAccountOutlinedIcon from '@mui/icons-material/SupervisorAccountOutlined';
import ServiceAdd from "./service_add.jsx";
import { apiFetch, authHeaders, ENDPOINTS, getUsers, getSuppliers, authService } from "../service/Api.js";

// Normalize API response row → component row shape
function normalize(r) {
  return {
    id:                  r.id,
    branch_id:           r.branch_id ?? null,
    receivedDate:        r.received_date,
    personName:          r.person_name,
    phoneNumber:         r.phone_number,
    employee1:           r.employee1,
    employee2:           r.employee2,
    customerName:        r.customer_name,
    customerPlace:       r.customer_place,
    customerPhone:       r.customer_phone,
    product:             r.product,
    model:               r.model,
    serialNo:            r.serial_no,
    notes:               r.notes || "",
    complaints:          (r.complaints || []).map((c) => c.text),
    images:              r.image_count ?? (r.images?.length ?? 0),
    imageUrls:           Array.isArray(r.images) ? r.images.map((img) => ({ id: img.id, url: img.image_url, name: img.name })) : [],
    preService:             r.pre_service,
    preServiceDate:         r.pre_service_date || "",
    preServiceEmployee1:    r.pre_service_employee1 || "",
    preServiceEmployee2:    r.pre_service_employee2 || "",
    preServiceStandby:      r.pre_service_standby_issued ?? false,
    dispatchToSupplier:     r.dispatch_to_supplier,
    dispatchDate:           r.dispatch_date || "",
    dispatchEmployee1:      r.dispatch_employee1 || "",
    dispatchEmployee2:      r.dispatch_employee2 || "",
    dispatchSupplier:       r.dispatch_supplier || "",
    receiveFromSupplier:    r.receive_from_supplier,
    receiveDate:            r.receive_date || "",
    receiveEmployee1:       r.receive_employee1 || "",
    receiveEmployee2:       r.receive_employee2 || "",
    receiveNote:            r.receive_note || "",
    postService:            r.post_service,
    postServiceDate:        r.post_service_date || "",
    postServiceEmployee1:   r.post_service_employee1 || "",
    postServiceEmployee2:   r.post_service_employee2 || "",
    deliveredStage:         r.delivered_stage,
    deliverDate:            r.deliver_date || "",
    deliverEmployee1:       r.deliver_employee1 || "",
    deliverEmployee2:       r.deliver_employee2 || "",
    deliverNote:            r.deliver_note || "",
    status:                 r.status,
    warranty:               r.has_warranty,
    standbyItem:            r.standby_issued,
    standbyReturned:        r.standby_returned,
  };
}

const STATUSES = [
  "Assigned",
  "Submitted for Service",
  "Sent to Supplier",
  "Sent to Replace",
  "Received Back",
  "Submitted After Service",
  "Delivered",
];

// pill class per status
const STATUS_PILL = {
  "Assigned":                "pill-amber",
  "Submitted for Service":   "pill-blue",
  "Sent to Supplier":        "pill-purple",
  "Sent to Replace":         "pill-purple",
  "Received Back":           "pill-orange",
  "Submitted After Service": "pill-teal",
  "Delivered":               "pill-green",
};

const COLUMNS = [
  { key: "id",             label: "Sl.No",          width: 50  },
  { key: "receivedDate",   label: "Received Date",  width: 120 },
  { key: "customerName",   label: "Customer Name",  width: 140 },
  { key: "productDetails", label: "Product Details",width: 200 },
  { key: "complaints",     label: "Complaints",     width: 200 },
  { key: "warranty",       label: "Warranty",       width: 100 },
  { key: "standbyItem",      label: "Standby Issued",   width: 120 },
  { key: "standbyReturned",  label: "Standby Returned", width: 130 },
  { key: "employees",        label: "Employees",        width: 160 },
  { key: "status",             label: "Status",               width: 120 },

  { key: "preService",         label: "Pre Service",          width: 100 },
  { key: "dispatchToSupplier", label: "Dispatch to Supplier", width: 130 },
  { key: "receiveFromSupplier",label: "Receive from Supplier",width: 140 },
  { key: "postService",        label: "Post Service",         width: 100 },
  { key: "deliveredStage",     label: "Delivered",            width: 100 },
  { key: "actions",            label: "Actions",              width: 90  },
];

const STAGE_CONFIG = [
  { field: "preService",          Icon: Woman2OutlinedIcon,   label: "Pre Service",           activeColor: "#1a73e8" },
  { field: "dispatchToSupplier",  Icon: TwoWheelerOutlinedIcon, label: "Dispatch to Supplier",  activeColor: "#7c3aed" },
  { field: "receiveFromSupplier", Icon: SupervisorAccountOutlinedIcon, label: "Receive from Supplier", activeColor: "#ea580c" },
  { field: "postService",         Icon: GroupsIcon,           label: "Post Service",          activeColor: "#0d9488" },
  { field: "deliveredStage",      Icon: HowToRegIcon,         label: "Delivered",             activeColor: "#188038" },
];

function FilterSelect({ label, value, options, onChange }) {
  return (
    <div style={filterSelectStyles.wrap} className="sl-filter-item">
      <label style={filterSelectStyles.label}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={filterSelectStyles.select}
      >
        {options.map((o) => (
          <option key={o} value={o}>{o === "All" ? `All ${label}s` : o}</option>
        ))}
      </select>
    </div>
  );
}

const filterSelectStyles = {
  wrap: { display: "flex", flexDirection: "row", alignItems: "center", gap: 6, flex: "1 1 0", minWidth: 0 },
  label: { fontSize: 13, fontWeight: 600, color: "#475569", letterSpacing: "0.03em", textTransform: "capitalize", whiteSpace: "nowrap", flexShrink: 0 },
  select: {
    padding: "8px 28px 8px 10px", border: "1.5px solid #e2e8f0",
    borderRadius: 8, fontSize: 13, color: "#000",
    background: `#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E") no-repeat right 8px center`,
    backgroundSize: "10px", appearance: "none", cursor: "pointer",
    fontFamily: "'Google Sans', sans-serif",
    flex: "1 1 0", minWidth: 0, width: "100%",
  },
};

export default function ServiceList() {
  const [view, setView] = useState("list");
  const [editRow, setEditRow] = useState(null);
  const [viewRow, setViewRow] = useState(null);

  const openEditForm = async (row) => {
    try {
      const json = await apiFetch(ENDPOINTS.service(row.id), { headers: authHeaders() });
      const full = normalize(json);
      setEditRow(full);
      setView("add");
    } catch {
      setEditRow(row);
      setView("add");
    }
  };
  const currentUser = authService.getCurrentUser();
  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "Super Admin" || currentUser?.is_staff === true;
  const isSuperAdmin = currentUser?.role === "Super Admin";

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [usersList, setUsersList] = useState([]);
  const [suppliersList, setSuppliersList] = useState([]);

  useEffect(() => {
    getUsers({ status: "Active" })
      .then((res) => {
        const users = Array.isArray(res) ? res : (res?.results ?? []);
        setUsersList(users.map((u) => u.username).filter(Boolean));
      })
      .catch(() => setUsersList([]));
  }, []);

  useEffect(() => {
    getSuppliers({ status: "Active" })
      .then((res) => {
        const suppliers = Array.isArray(res) ? res : (res?.results ?? []);
        setSuppliersList(suppliers.map((s) => s.name).filter(Boolean));
      })
      .catch(() => setSuppliersList([]));
  }, []);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [customerFilter, setCustomerFilter] = useState("All");
  const [employeeFilter, setEmployeeFilter] = useState("All");
  const [filterBranch, setFilterBranch] = useState("all");
  const [branchList, setBranchList] = useState([]);
  const [userBranchName, setUserBranchName] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedComplaints, setExpandedComplaints] = useState({});
  const [imageGallery, setImageGallery] = useState(null); // { rowId, images, activeIdx }
  const [preServiceModal, setPreServiceModal] = useState(null);
  const [preServiceForm, setPreServiceForm] = useState({
    date: "",
    employee1: "",
    employee2: "",
    standbyIssued: "yes",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      const json = await apiFetch(ENDPOINTS.services, { headers: authHeaders() });
      let rows = Array.isArray(json) ? json : (json.results ?? []);
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
      setFetchError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, currentUser?.username]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Branch init: fetch branches + set default from logged-in user ──────
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
      } catch { /* fallback: stay on 'all' */ }
    };
    initBranches();
  }, []);

  const [galleryLoading, setGalleryLoading] = useState(false);

  const openImageGallery = async (row) => {
    if (row.imageUrls && row.imageUrls.length > 0) {
      setImageGallery({ rowId: row.id, images: row.imageUrls, activeIdx: 0 });
      return;
    }
    setGalleryLoading(true);
    setImageGallery({ rowId: row.id, images: [], activeIdx: 0 });
    try {
      const json = await apiFetch(ENDPOINTS.service(row.id), { headers: authHeaders() });
      const imgs = (json.images || []).map((img) => ({
        id: img.id,
        url: img.image_url || ENDPOINTS.mediaUrl(img.image),
        name: img.name,
      })).filter((img) => img.url);
      setData((d) => d.map((r) => r.id === row.id ? { ...r, imageUrls: imgs } : r));
      setImageGallery({ rowId: row.id, images: imgs, activeIdx: 0 });
    } catch {
      setImageGallery({ rowId: row.id, images: [], activeIdx: 0 });
    } finally {
      setGalleryLoading(false);
    }
  };

  const openPreServiceModal = (row) => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const loggedUser = (() => { try { return JSON.parse(localStorage.getItem("user"))?.username || ""; } catch { return ""; } })();
    if (row.preService && row.preServiceDate) {
      // Already saved — show the stored values
      setPreServiceForm({
        date:          row.preServiceDate,
        employee1:     row.preServiceEmployee1,
        employee2:     row.preServiceEmployee2,
        standbyIssued: row.preServiceStandby ? "yes" : "no",
      });
    } else {
      // New entry — use today's date and logged-in user
      setPreServiceForm({
        date:          `${yyyy}-${mm}-${dd}`,
        employee1:     loggedUser || row.employee1 || "",
        employee2:     row.employee2 || "",
        standbyIssued: "no",
      });
    }
    setPreServiceModal({ rowId: row.id });
  };

  const closePreServiceModal = () => setPreServiceModal(null);

  const [preServiceSaving, setPreServiceSaving] = useState(false);
  const [preServiceError, setPreServiceError] = useState("");

  const savePreService = async () => {
    if (!preServiceForm.date) {
      setPreServiceError("Date is required.");
      return;
    }
    setPreServiceSaving(true);
    setPreServiceError("");
    try {
      await apiFetch(ENDPOINTS.servicePreService(preServiceModal.rowId), {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          pre_service_date:           preServiceForm.date,
          pre_service_employee1:      preServiceForm.employee1,
          pre_service_employee2:      preServiceForm.employee2,
          pre_service_standby_issued: preServiceForm.standbyIssued === "yes",
        }),
      });
      // Persist the status change to DB as well
      await apiFetch(ENDPOINTS.serviceStatus(preServiceModal.rowId), {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status: "Submitted for Service" }),
      });
      setData((d) =>
        d.map((r) =>
          r.id === preServiceModal.rowId
            ? {
                ...r,
                preService:          true,
                preServiceDate:      preServiceForm.date,
                preServiceEmployee1: preServiceForm.employee1,
                preServiceEmployee2: preServiceForm.employee2,
                preServiceStandby:   preServiceForm.standbyIssued === "yes",
                status:              "Submitted for Service",
              }
            : r
        )
      );
      closePreServiceModal();
    } catch (err) {
      setPreServiceError(err.message || "Failed to save. Please try again.");
    } finally {
      setPreServiceSaving(false);
    }
  };

  // Dispatch to Supplier Modal
  const [dispatchModal, setDispatchModal] = useState(null);
  const [dispatchForm, setDispatchForm] = useState({
    date: "",
    employee1: "",
    employee2: "",
    supplier: "",
  });

  const openDispatchModal = (row) => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const loggedUser = (() => { try { return JSON.parse(localStorage.getItem("user"))?.username || ""; } catch { return ""; } })();
    if (row.dispatchToSupplier && row.dispatchDate) {
      setDispatchForm({
        date:      row.dispatchDate,
        employee1: row.dispatchEmployee1,
        employee2: row.dispatchEmployee2,
        supplier:  row.dispatchSupplier,
      });
    } else {
      setDispatchForm({
        date:      `${yyyy}-${mm}-${dd}`,
        employee1: loggedUser || row.employee1 || "",
        employee2: row.employee2 || "",
        supplier:  "",
      });
    }
    setDispatchModal({ rowId: row.id });
  };

  const closeDispatchModal = () => setDispatchModal(null);

  const [dispatchSaving, setDispatchSaving] = useState(false);
  const [dispatchError, setDispatchError] = useState("");

  const saveDispatch = async () => {
    if (!dispatchForm.date) {
      setDispatchError("Date is required.");
      return;
    }
    setDispatchSaving(true);
    setDispatchError("");
    try {
      // Save dispatch details to DB via dedicated endpoint
      await apiFetch(ENDPOINTS.serviceDispatch(dispatchModal.rowId), {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          dispatch_date:      dispatchForm.date,
          dispatch_employee1: dispatchForm.employee1,
          dispatch_employee2: dispatchForm.employee2,
          dispatch_supplier:  dispatchForm.supplier,
        }),
      });
      // Save status to DB
      await apiFetch(ENDPOINTS.serviceStatus(dispatchModal.rowId), {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status: "Sent to Supplier" }),
      });
      setData((d) =>
        d.map((r) =>
          r.id === dispatchModal.rowId
            ? {
                ...r,
                dispatchToSupplier: true,
                dispatchDate:       dispatchForm.date,
                dispatchEmployee1:  dispatchForm.employee1,
                dispatchEmployee2:  dispatchForm.employee2,
                dispatchSupplier:   dispatchForm.supplier,
                status:             "Sent to Supplier",
              }
            : r
        )
      );
      closeDispatchModal();
    } catch (err) {
      setDispatchError(err.message || "Failed to save. Please try again.");
    } finally {
      setDispatchSaving(false);
    }
  };

  // Receive from Supplier Modal
  const [receiveModal, setReceiveModal] = useState(null);
  const [receiveForm, setReceiveForm] = useState({
    receiveNote: "",
    employee1: "",
    employee2: "",
    receivedDate: "",
  });

  const openReceiveModal = (row) => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const loggedUser = (() => { try { return JSON.parse(localStorage.getItem("user"))?.username || ""; } catch { return ""; } })();
    if (row.receiveFromSupplier && row.receiveDate) {
      setReceiveForm({
        receiveNote:  row.receiveNote,
        employee1:    row.receiveEmployee1,
        employee2:    row.receiveEmployee2,
        receivedDate: row.receiveDate,
      });
    } else {
      setReceiveForm({
        receiveNote:  "",
        employee1:    loggedUser || row.employee1 || "",
        employee2:    row.employee2 || "",
        receivedDate: `${yyyy}-${mm}-${dd}`,
      });
    }
    setReceiveModal({ rowId: row.id });
  };

  const closeReceiveModal = () => setReceiveModal(null);

  const [receiveSaving, setReceiveSaving] = useState(false);
  const [receiveError, setReceiveError] = useState("");

  const saveReceive = async () => {
    if (!receiveForm.receivedDate) {
      setReceiveError("Date is required.");
      return;
    }
    setReceiveSaving(true);
    setReceiveError("");
    try {
      await apiFetch(ENDPOINTS.serviceReceive(receiveModal.rowId), {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          receive_date:      receiveForm.receivedDate,
          receive_employee1: receiveForm.employee1,
          receive_employee2: receiveForm.employee2,
          receive_note:      receiveForm.receiveNote,
        }),
      });
      await apiFetch(ENDPOINTS.serviceStatus(receiveModal.rowId), {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status: "Received Back" }),
      });
      setData((d) =>
        d.map((r) =>
          r.id === receiveModal.rowId
            ? {
                ...r,
                receiveFromSupplier: true,
                receiveDate:         receiveForm.receivedDate,
                receiveEmployee1:    receiveForm.employee1,
                receiveEmployee2:    receiveForm.employee2,
                receiveNote:         receiveForm.receiveNote,
                status:              "Received Back",
              }
            : r
        )
      );
      closeReceiveModal();
    } catch (err) {
      setReceiveError(err.message || "Failed to save. Please try again.");
    } finally {
      setReceiveSaving(false);
    }
  };

  // Post Service Modal
  const [postServiceModal, setPostServiceModal] = useState(null);
  const [postServiceForm, setPostServiceForm] = useState({
    employee1: "",
    employee2: "",
    date: "",
  });

  const openPostServiceModal = (row) => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const loggedUser = (() => { try { return JSON.parse(localStorage.getItem("user"))?.username || ""; } catch { return ""; } })();
    if (row.postService && row.postServiceDate) {
      setPostServiceForm({
        employee1: row.postServiceEmployee1,
        employee2: row.postServiceEmployee2,
        date:      row.postServiceDate,
      });
    } else {
      setPostServiceForm({
        employee1: loggedUser || row.employee1 || "",
        employee2: row.employee2 || "",
        date:      `${yyyy}-${mm}-${dd}`,
      });
    }
    setPostServiceModal({ rowId: row.id });
  };

  const closePostServiceModal = () => setPostServiceModal(null);

  const [postServiceSaving, setPostServiceSaving] = useState(false);
  const [postServiceError, setPostServiceError] = useState("");

  const savePostService = async () => {
    if (!postServiceForm.date) {
      setPostServiceError("Date is required.");
      return;
    }
    setPostServiceSaving(true);
    setPostServiceError("");
    try {
      await apiFetch(ENDPOINTS.servicePostService(postServiceModal.rowId), {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          post_service_date:      postServiceForm.date,
          post_service_employee1: postServiceForm.employee1,
          post_service_employee2: postServiceForm.employee2,
        }),
      });
      await apiFetch(ENDPOINTS.serviceStatus(postServiceModal.rowId), {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status: "Submitted After Service" }),
      });
      setData((d) =>
        d.map((r) =>
          r.id === postServiceModal.rowId
            ? {
                ...r,
                postService:         true,
                postServiceDate:     postServiceForm.date,
                postServiceEmployee1: postServiceForm.employee1,
                postServiceEmployee2: postServiceForm.employee2,
                status:              "Submitted After Service",
              }
            : r
        )
      );
      closePostServiceModal();
    } catch (err) {
      setPostServiceError(err.message || "Failed to save. Please try again.");
    } finally {
      setPostServiceSaving(false);
    }
  };

  // Deliver Modal
  const [deliverModal, setDeliverModal] = useState(null);
  const [deliverForm, setDeliverForm] = useState({
    deliverNote: "",
    employee1: "",
    employee2: "",
    standbyReturned: "yes",
    deliverDate: "",
  });

  const openDeliverModal = (row) => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const loggedUser = (() => { try { return JSON.parse(localStorage.getItem("user"))?.username || ""; } catch { return ""; } })();
    if (row.deliveredStage && row.deliverDate) {
      setDeliverForm({
        deliverNote:     row.deliverNote || "",
        employee1:       row.deliverEmployee1,
        employee2:       row.deliverEmployee2,
        standbyReturned: row.standbyReturned ? "yes" : "no",
        deliverDate:     row.deliverDate,
      });
    } else {
      setDeliverForm({
        deliverNote:     "",
        employee1:       loggedUser || row.employee1 || "",
        employee2:       row.employee2 || "",
        standbyReturned: "yes",
        deliverDate:     `${yyyy}-${mm}-${dd}`,
      });
    }
    setDeliverModal({ rowId: row.id });
  };

  const closeDeliverModal = () => setDeliverModal(null);

  const [deliverSaving, setDeliverSaving] = useState(false);
  const [deliverError, setDeliverError] = useState("");

  const saveDeliver = async () => {
    if (!deliverForm.deliverDate) {
      setDeliverError("Date is required.");
      return;
    }
    setDeliverSaving(true);
    setDeliverError("");
    try {
      await apiFetch(ENDPOINTS.serviceDeliver(deliverModal.rowId), {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          deliver_date:      deliverForm.deliverDate,
          deliver_employee1: deliverForm.employee1,
          deliver_employee2: deliverForm.employee2,
          deliver_note:      deliverForm.deliverNote,
          standby_returned:  deliverForm.standbyReturned === "yes",
        }),
      });
      await apiFetch(ENDPOINTS.serviceStatus(deliverModal.rowId), {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status: "Delivered" }),
      });
      setData((d) =>
        d.map((r) =>
          r.id === deliverModal.rowId
            ? {
                ...r,
                deliveredStage:   true,
                deliverDate:      deliverForm.deliverDate,
                deliverEmployee1: deliverForm.employee1,
                deliverEmployee2: deliverForm.employee2,
                deliverNote:      deliverForm.deliverNote,
                standbyReturned:  deliverForm.standbyReturned === "yes",
                status:           "Delivered",
              }
            : r
        )
      );
      closeDeliverModal();
    } catch (err) {
      setDeliverError(err.message || "Failed to save. Please try again.");
    } finally {
      setDeliverSaving(false);
    }
  };

  const uniqueCustomers = ["All", ...Array.from(new Set(data.map((r) => r.customerName)))];
  const uniqueEmployees = ["All", ...Array.from(new Set(data.flatMap((r) => [r.employee1, r.employee2].filter(Boolean))))];

  // suppliersList is fetched from the Suppliers API (Active only) — see useEffect above

  const toggleComplaints = (id) =>
    setExpandedComplaints((prev) => ({ ...prev, [id]: !prev[id] }));



  const handleDelete = async (id) => {
    try {
      await apiFetch(ENDPOINTS.service(id), { method: "DELETE", headers: authHeaders() });
    } catch (err) {
      console.error("Delete failed:", err.message);
      return;
    }
    setData((d) => d.filter((r) => r.id !== id));
  };

  const handleStatusChange = (id, newStatus) =>
    setData((d) => d.map((r) => r.id === id ? { ...r, status: newStatus } : r));

  const handleStageToggle = (id, field) =>
    setData((d) => d.map((r) => r.id === id ? { ...r, [field]: !r[field] } : r));

  const filtered = data.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      r.customerName.toLowerCase().includes(q) ||
      r.serialNo.toLowerCase().includes(q) ||
      r.product.toLowerCase().includes(q) ||
      r.personName.toLowerCase().includes(q) ||
      r.phoneNumber.includes(q);
    const matchStatus   = statusFilter   === "All" || r.status === statusFilter;
    const matchCustomer = customerFilter === "All" || r.customerName === customerFilter;
    const matchEmployee = employeeFilter === "All" || r.employee1 === employeeFilter || r.employee2 === employeeFilter;
    const matchBranch = filterBranch === "all" || (() => {
      const sel = branchList.find(b => b.name === filterBranch);
      if (!sel) return true;
      return String(r.branch_id) === String(sel.id);
    })();
    const rowDate = r.receivedDate ? new Date(r.receivedDate) : null;
    const matchFrom = !dateFrom || (rowDate && rowDate >= new Date(dateFrom));
    const matchTo   = !dateTo   || (rowDate && rowDate <= new Date(dateTo + "T23:59:59"));
    return matchSearch && matchStatus && matchCustomer && matchEmployee && matchBranch && matchFrom && matchTo;
  });



  return (
    <>
      {view === "add" && <ServiceAdd key={editRow ? `edit-${editRow.id}` : "new"} onBack={() => { setView("list"); setEditRow(null); fetchData(); }} editRow={editRow} />}
      {view === "list" && (
    <div style={styles.page} className="sl-page">
      <style>{css}</style>

      <div style={styles.card} className="sl-card">

        {/* Title row */}
        <div style={styles.titleBar} className="sl-titlebar">
          <h1 style={styles.headerTitle}>Service List</h1>
          <button style={styles.addBtn} className="sl-add-btn" onClick={() => setView("add")}>+ New Entry</button>
        </div>

        {/* Filter row */}
        <div style={styles.toolbar} className="sl-toolbar">
          <div style={styles.searchWrap} className="sl-search-wrap">
            <span style={styles.searchIcon}></span>
            <input
              style={styles.searchInput}
              placeholder="Search customer, serial, product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button style={styles.clearBtn} onClick={() => setSearch("")}>✕</button>
            )}
          </div>
          <FilterSelect label="Status" value={statusFilter} options={["All", ...STATUSES]} onChange={setStatusFilter} />
          <FilterSelect label="Customer" value={customerFilter} options={uniqueCustomers} onChange={setCustomerFilter} />
          {isAdmin && <FilterSelect label="Employee" value={employeeFilter} options={uniqueEmployees} onChange={setEmployeeFilter} />}
          {/* Branch filter — Admin/Super Admin only */}
          {isAdmin && (
            <div style={filterSelectStyles.wrap} className="sl-filter-item">
              <label style={filterSelectStyles.label}>Branch</label>
              <select
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
                style={filterSelectStyles.select}
              >
                <option value="all">All Branches</option>
                {branchList.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
              </select>
            </div>
          )}
          {/* From Date */}
          <div style={filterSelectStyles.wrap} className="sl-filter-item">
            <label style={filterSelectStyles.label}>From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              style={{ ...filterSelectStyles.select, paddingRight: 8 }} />
          </div>
          {/* To Date */}
          <div style={filterSelectStyles.wrap} className="sl-filter-item">
            <label style={filterSelectStyles.label}>To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              style={{ ...filterSelectStyles.select, paddingRight: 8 }} />
          </div>
          {(statusFilter !== "All" || customerFilter !== "All" || (isAdmin && employeeFilter !== "All") || filterBranch !== (userBranchName || "all") || dateFrom || dateTo || search) && (
            <button style={styles.resetBtn} className="sl-reset-btn" onClick={() => {
              setSearch(""); setStatusFilter("All");
              setCustomerFilter("All"); setEmployeeFilter("All");
              setFilterBranch(userBranchName || "all"); setDateFrom(""); setDateTo("");
            }}>✕ Clear</button>
          )}
        </div>

        {/* Table */}
        <div style={styles.tableWrap} className="sl-table-wrap">
          {loading ? (
            <div style={{ padding: "48px", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>Loading...</div>
          ) : fetchError ? (
            <div style={{ padding: "48px", textAlign: "center", color: "#ef4444", fontSize: 14 }}>{fetchError}</div>
          ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    style={{ ...styles.th, minWidth: col.width }}

                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} style={styles.emptyCell}>
                    <div style={styles.emptyState}>
                      <span style={{ fontSize: 32 }}></span>
                      <p style={{ marginTop: 8, color: "#000" }}>No records found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((row, idx) => (
                  <tr
                    key={row.id}
                    style={{ background: idx % 2 === 0 ? "#fff" : "#f8fafc" }}
                    className="table-row"
                  >
                    <td style={styles.td}>{idx + 1}</td>
                    <td style={styles.td}>{row.receivedDate}</td>

                    {/* Customer */}
                    <td style={{ ...styles.td, fontWeight: 600 }}>{row.customerName}</td>

                    {/* Product Details: product + model + serial stacked */}
                    <td style={styles.td}>
                      <div style={styles.stackMain}>{row.product}</div>
                      
                    </td>

                    {/* Complaints cell */}
                    <td style={styles.td}>
                      <div>
                        {row.complaints.map((c, i) => (
                          <div key={i} style={{ ...styles.complaintText, marginTop: i > 0 ? 3 : 0 }}>
                            {row.complaints.length > 1 && <span style={{ color: "#94a3b8", marginRight: 4 }}>•</span>}
                            {c}
                          </div>
                        ))}
                      </div>
                      
                    </td>

                    {/* Warranty */}
                    <td style={{ ...styles.td, textAlign: "center" }}>
                      {row.warranty
                        ? <span style={{ ...styles.statusBadge,  color: "#166534" }}>Yes</span>
                        : <span style={{ ...styles.statusBadge,  color: "#991b1b" }}>No</span>}
                    </td>

                    {/* Standby Issued */}
                    <td style={{ ...styles.td, textAlign: "center" }}>
                      {row.standbyItem
                        ? <span style={{ ...styles.statusBadge,  color: "#166534" }}>Yes</span>
                        : <span style={{ ...styles.statusBadge,  color: "#991b1b" }}>No</span>}
                    </td>

                    {/* Standby Returned */}
                    <td style={{ ...styles.td, textAlign: "center" }}>
                      {row.standbyItem
                        ? (row.standbyReturned
                            ? <span style={{ ...styles.statusBadge,  color: "#166534" }}>Yes</span>
                            : <span style={{ ...styles.statusBadge,  color: "#991b1b" }}>No</span>)
                        : <span style={styles.na}>—</span>}
                    </td>

                    {/* Employees */}
                    <td style={styles.td}>
                      {row.employee1
                        ? <><div style={styles.stackMain}>{row.employee1}</div>
                            {row.employee2 && <div style={styles.stackSub}>{row.employee2}</div>}</>
                        : <span style={styles.na}>—</span>}
                    </td>

                    {/* Status */}
                    <td style={styles.td}>
                      <select
                        className={`status-select ${STATUS_PILL[row.status] || "pill-muted"}`}
                        value={row.status}
                        disabled={!isAdmin}
                        onChange={(e) => handleStatusChange(row.id, e.target.value)}
                        style={{ ...styles.statusSelect, ...(isAdmin ? {} : { cursor: "not-allowed", opacity: 0.7 }) }}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>

                    {/* Stage Icons */}
                    {STAGE_CONFIG.map(({ field, Icon, label, activeColor }) => (
                      <td key={field} style={{ ...styles.td, textAlign: "center" }}>
                        <button
                          onClick={() =>
                            field === "preService"
                              ? openPreServiceModal(row)
                              : field === "dispatchToSupplier"
                              ? openDispatchModal(row)
                              : field === "receiveFromSupplier"
                              ? openReceiveModal(row)
                              : field === "postService"
                              ? openPostServiceModal(row)
                              : field === "deliveredStage"
                              ? openDeliverModal(row)
                              : handleStageToggle(row.id, field)
                          }
                          style={{
                            ...styles.stageBtn,
                            color: row[field] ? activeColor : "#cbd5e1",
                          }}
                          title={`${label}: ${row[field] ? "Done — click to undo" : "Pending — click to mark done"}`}
                        >
                          <Icon style={{ fontSize: 22 }} />
                        </button>
                      </td>
                    ))}

                    {/* Actions */}
                    <td style={styles.td}>
                      <div style={styles.actionBtns}>
                        <button className="action-view" style={styles.viewBtn} title="View Details" onClick={() => setViewRow(row)}>
                          <VisibilityOutlinedIcon style={{ fontSize: 16, color: "#fff", fill: "#fff" }} />
                        </button>
                        {isAdmin && (
                          <button className="action-edit" style={styles.editBtn} title="Edit" onClick={() => openEditForm(row)}>                          <EditOutlinedIcon style={{ fontSize: 16, color: "#fff", fill: "#fff" }} /> 
                          </button>
                        )}
                        {isSuperAdmin && (
                          <button className="action-delete" style={styles.deleteBtn} title="Delete" onClick={() => handleDelete(row.id)}>
                            <DeleteOutlineOutlinedIcon style={{ fontSize: 16, color: "#fff", fill: "#fff" }} /> 
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          )}
        </div>

        {/* Mobile Card List */}
        <div className="sl-cards-wrap">
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
              <div style={{ fontSize: 32 }}>📋</div>
              <p style={{ marginTop: 8 }}>No records found</p>
            </div>
          ) : (
            filtered.map((row) => (
              <div key={row.id} className="sl-service-card">
                {/* Card Header */}
                <div className="sl-card-header">
                  <div className="sl-card-header-left">
                    <span className="sl-card-sl">#{row.id} · {row.receivedDate}</span>
                    <span className="sl-card-customer">{row.customerName}</span>
                  </div>
                  <div className="sl-card-header-right">
                  </div>
                </div>

                {/* Card Body */}
                <div className="sl-card-body">

                  {/* Product */}
                  <div className="sl-card-row">
                    <span className="sl-card-label">Product</span>
                    <div style={{ flex: 1 }}>
                      <div className="sl-card-value">{row.product} — {row.model}</div>
                      <div className="sl-card-mono">{row.serialNo}</div>
                    </div>
                  </div>

                  <div className="sl-card-divider" />

                  <div className="sl-card-divider" />

                  {/* Complaints */}
                  <div className="sl-card-row">
                    <span className="sl-card-label">Complaints</span>
                    <div style={{ flex: 1 }} className="sl-card-complaints">
                      <div className="sl-card-complaint-item">• {row.complaints[0]}</div>
                      {expandedComplaints[row.id] && row.complaints.slice(1).map((c, i) => (
                        <div key={i} className="sl-card-complaint-item">• {c}</div>
                      ))}
                      {row.complaints.length > 1 && (
                        <button className="sl-card-more-btn" onClick={() => toggleComplaints(row.id)}>
                          {expandedComplaints[row.id] ? "▲ show less" : `+${row.complaints.length - 1} more`}
                        </button>
                      )}
                      
                    </div>
                  </div>

                  <div className="sl-card-divider" />

                  {/* Warranty & Standby */}
                  <div className="sl-card-row">
                    <span className="sl-card-label">Warranty</span>
                    <div style={{ flex: 1 }}>
                      {row.warranty
                        ? <span style={{ fontSize: 12, fontWeight: 700, background: "#dcfce7", color: "#166534", borderRadius: 6, padding: "2px 8px" }}>Yes</span>
                        : <span style={{ fontSize: 12, fontWeight: 700, background: "#fee2e2", color: "#991b1b", borderRadius: 6, padding: "2px 8px" }}>No</span>}
                    </div>
                  </div>
                  <div className="sl-card-row">
                    <span className="sl-card-label">Standby</span>
                    <div style={{ flex: 1 }}>
                      {row.standbyItem
                        ? <span style={{ fontSize: 12, fontWeight: 700, background: "#dcfce7", color: "#166534", borderRadius: 6, padding: "2px 8px" }}>Yes</span>
                        : <span style={{ fontSize: 12, fontWeight: 700, background: "#fee2e2", color: "#991b1b", borderRadius: 6, padding: "2px 8px" }}>No</span>}
                    </div>
                  </div>
                  {row.standbyItem && (
                    <div className="sl-card-row">
                      <span className="sl-card-label">Returned</span>
                      <div style={{ flex: 1 }}>
                        {row.standbyReturned
                          ? <span style={{ fontSize: 12, fontWeight: 700, background: "#dcfce7", color: "#166534", borderRadius: 6, padding: "2px 8px" }}>Yes</span>
                          : <span style={{ fontSize: 12, fontWeight: 700, background: "#fee2e2", color: "#991b1b", borderRadius: 6, padding: "2px 8px" }}>No</span>}
                      </div>
                    </div>
                  )}
                  {row.employee1 && (
                    <div className="sl-card-row">
                      <span className="sl-card-label">Employees</span>
                      <div style={{ flex: 1 }}>
                        <div className="sl-card-value">{row.employee1}{row.employee2 ? ` · ${row.employee2}` : ""}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Stage Icons */}
                <div className="sl-card-stages">
                  {STAGE_CONFIG.map(({ field, Icon, label, activeColor }) => (
                    <div key={field} className="sl-stage-item">
                      <button
                        onClick={() =>
                          field === "preService" ? openPreServiceModal(row)
                          : field === "dispatchToSupplier" ? openDispatchModal(row)
                          : field === "receiveFromSupplier" ? openReceiveModal(row)
                          : field === "postService" ? openPostServiceModal(row)
                          : field === "deliveredStage" ? openDeliverModal(row)
                          : handleStageToggle(row.id, field)
                        }
                        style={{
                          background: "none", border: "none", padding: 4,
                          cursor: "pointer", display: "inline-flex",
                          color: row[field] ? activeColor : "#cbd5e1",
                          transition: "color 0.18s",
                        }}
                        title={label}
                      >
                        <Icon style={{ fontSize: 26 }} />
                      </button>
                      <span className="sl-stage-label">{label.replace(" to ", "\nto ")}</span>
                    </div>
                  ))}
                </div>

                {/* Card Footer: status + actions */}
                <div className="sl-card-footer">
                  <div className="sl-card-status-wrap">
                    <select
                      className={`status-select ${STATUS_PILL[row.status] || "pill-muted"}`}
                      value={row.status}
                      disabled={!isAdmin}
                      onChange={(e) => handleStatusChange(row.id, e.target.value)}
                      style={{ width: "100%", fontSize: 12, padding: "7px 12px", borderRadius: 8, border: "none", cursor: isAdmin ? "pointer" : "not-allowed", opacity: isAdmin ? 1 : 0.7 }}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sl-card-actions">
                    <button
                      className="action-view"
                      style={{ padding: "8px 10px", borderRadius: 8, border: "none", background: "#0d9488", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center" }}
                      onClick={() => setViewRow(row)}
                    >
                      <VisibilityOutlinedIcon style={{ fontSize: 16, color: "#fff", fill: "#fff" }} />
                    </button>
                    {isAdmin && (
                      <button
                        className="action-edit"
                        style={{ padding: "8px 10px", borderRadius: 8, border: "none", background: "#1a73e8", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center" }}
                        onClick={() => openEditForm(row)}
                      >
                        <EditOutlinedIcon style={{ fontSize: 16, color: "#fff", fill: "#fff" }} />
                      </button>
                    )}
                    {isSuperAdmin && (
                      <button
                        className="action-delete"
                        style={{ padding: "8px 10px", borderRadius: 8, border: "none", background: "#d93025", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center" }}
                        onClick={() => handleDelete(row.id)}
                      >
                        <DeleteOutlineOutlinedIcon style={{ fontSize: 16, color: "#fff", fill: "#fff" }} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer} className="sl-footer">
          <span style={{ color: "#000", fontSize: 13 }}>
            Showing <strong>{filtered.length}</strong> of <strong>{data.length}</strong> entries
          </span>
        </div>
      </div>
      <div className="imcb-footer">
        Powered by <span style={{ fontWeight: 600, color: "#1a73e8" }}>IMCB Solutions LLP</span>
      </div>
    </div>
      )}

      {/* Deliver Modal */}
      {deliverModal && (
        <div style={modalStyles.overlay} onClick={closeDeliverModal}>
          <div style={modalStyles.dialog} onClick={(e) => e.stopPropagation()}>
            <div style={modalStyles.header}>
              <span style={modalStyles.title}>Deliver</span>
              <button style={modalStyles.closeBtn} onClick={closeDeliverModal}>✕</button>
            </div>
            <div style={modalStyles.body}>
              <div style={modalStyles.field}>
                <label style={modalStyles.label}>Deliver Note</label>
                <input
                  type="text"
                  value={deliverForm.deliverNote}
                  onChange={(e) => setDeliverForm((f) => ({ ...f, deliverNote: e.target.value }))}
                  style={modalStyles.input}
                  placeholder=""
                />
              </div>
              <div style={modalStyles.field}>
                <label style={modalStyles.label}>Employee1</label>
                <input
                  type="text"
                  value={deliverForm.employee1}
                  onChange={(e) => setDeliverForm((f) => ({ ...f, employee1: e.target.value }))}
                  style={modalStyles.input}
                  placeholder="Employee 1 name"
                />
              </div>
              <div style={modalStyles.field}>
                <label style={modalStyles.label}>Employee2</label>
                <select
                  value={deliverForm.employee2}
                  onChange={(e) => setDeliverForm((f) => ({ ...f, employee2: e.target.value }))}
                  style={modalStyles.input}
                >
                  <option value="">-- Select Employee 2 --</option>
                  {usersList.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div style={modalStyles.field}>
                <label style={modalStyles.label}>Standby Product returned or not?</label>
                <div style={modalStyles.radioGroup}>
                  <label style={modalStyles.radioLabel}>
                    <input
                      type="radio"
                      name="standbyReturned"
                      value="yes"
                      checked={deliverForm.standbyReturned === "yes"}
                      onChange={() => setDeliverForm((f) => ({ ...f, standbyReturned: "yes" }))}
                      style={modalStyles.radio}
                    />
                    Yes
                  </label>
                  <label style={modalStyles.radioLabel}>
                    <input
                      type="radio"
                      name="standbyReturned"
                      value="no"
                      checked={deliverForm.standbyReturned === "no"}
                      onChange={() => setDeliverForm((f) => ({ ...f, standbyReturned: "no" }))}
                      style={modalStyles.radio}
                    />
                    No
                  </label>
                </div>
              </div>
              <div style={modalStyles.field}>
                <label style={modalStyles.label}>Deliver Date :</label>
                <div style={modalStyles.inputWrap}>
                  <input
                    type="date"
                    value={deliverForm.deliverDate}
                    onChange={(e) => setDeliverForm((f) => ({ ...f, deliverDate: e.target.value }))}
                    style={modalStyles.input}
                  />
                  <span style={modalStyles.calIcon}>📅</span>
                </div>
              </div>
              {deliverError && (
                <div style={{ color: "#ef4444", fontSize: 13, marginTop: -8 }}>{deliverError}</div>
              )}
            </div>
            <div style={modalStyles.footer}>
              <button style={modalStyles.cancelBtn} onClick={closeDeliverModal} disabled={deliverSaving}>Cancel</button>
              <button style={{ ...modalStyles.saveBtn, opacity: deliverSaving ? 0.7 : 1 }} onClick={saveDeliver} disabled={deliverSaving}>
                {deliverSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post Service Modal */}
      {postServiceModal && (
        <div style={modalStyles.overlay} onClick={closePostServiceModal}>
          <div style={modalStyles.dialog} onClick={(e) => e.stopPropagation()}>
            <div style={modalStyles.header}>
              <span style={modalStyles.title}>Post Service</span>
              <button style={modalStyles.closeBtn} onClick={closePostServiceModal}>✕</button>
            </div>
            <div style={modalStyles.body}>
              <div style={modalStyles.field}>
                <label style={modalStyles.label}>Employee1</label>
                <input
                  type="text"
                  value={postServiceForm.employee1}
                  onChange={(e) => setPostServiceForm((f) => ({ ...f, employee1: e.target.value }))}
                  style={modalStyles.input}
                  placeholder="Employee 1 name"
                />
              </div>
              <div style={modalStyles.field}>
                <label style={modalStyles.label}>Employee2</label>
                <select
                  value={postServiceForm.employee2}
                  onChange={(e) => setPostServiceForm((f) => ({ ...f, employee2: e.target.value }))}
                  style={modalStyles.input}
                >
                  <option value="">-- Select Employee 2 --</option>
                  {usersList.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div style={modalStyles.field}>
                <label style={modalStyles.label}>Date :</label>
                <div style={modalStyles.inputWrap}>
                  <input
                    type="date"
                    value={postServiceForm.date}
                    onChange={(e) => setPostServiceForm((f) => ({ ...f, date: e.target.value }))}
                    style={modalStyles.input}
                  />
                  <span style={modalStyles.calIcon}>📅</span>
                </div>
              </div>
              {postServiceError && (
                <div style={{ color: "#ef4444", fontSize: 13, marginTop: -8 }}>{postServiceError}</div>
              )}
            </div>
            <div style={modalStyles.footer}>
              <button style={modalStyles.cancelBtn} onClick={closePostServiceModal} disabled={postServiceSaving}>Cancel</button>
              <button style={{ ...modalStyles.saveBtn, opacity: postServiceSaving ? 0.7 : 1 }} onClick={savePostService} disabled={postServiceSaving}>
                {postServiceSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receive from Supplier Modal */}
      {receiveModal && (
        <div style={modalStyles.overlay} onClick={closeReceiveModal}>
          <div style={modalStyles.dialog} onClick={(e) => e.stopPropagation()}>
            <div style={modalStyles.header}>
              <span style={modalStyles.title}>Recieve</span>
              <button style={modalStyles.closeBtn} onClick={closeReceiveModal}>✕</button>
            </div>
            <div style={modalStyles.body}>
              <div style={modalStyles.field}>
                <label style={modalStyles.label}>Recieve Note</label>
                <input
                  type="text"
                  value={receiveForm.receiveNote}
                  onChange={(e) => setReceiveForm((f) => ({ ...f, receiveNote: e.target.value }))}
                  style={modalStyles.input}
                  placeholder=""
                />
              </div>
              <div style={modalStyles.field}>
                <label style={modalStyles.label}>Employee1</label>
                <input
                  type="text"
                  value={receiveForm.employee1}
                  onChange={(e) => setReceiveForm((f) => ({ ...f, employee1: e.target.value }))}
                  style={modalStyles.input}
                  placeholder="Employee 1 name"
                />
              </div>
              <div style={modalStyles.field}>
                <label style={modalStyles.label}>Employee2</label>
                <select
                  value={receiveForm.employee2}
                  onChange={(e) => setReceiveForm((f) => ({ ...f, employee2: e.target.value }))}
                  style={modalStyles.input}
                >
                  <option value="">-- Select Employee 2 --</option>
                  {usersList.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div style={modalStyles.field}>
                <label style={modalStyles.label}>Received Date :</label>
                <div style={modalStyles.inputWrap}>
                  <input
                    type="date"
                    value={receiveForm.receivedDate}
                    onChange={(e) => setReceiveForm((f) => ({ ...f, receivedDate: e.target.value }))}
                    style={modalStyles.input}
                  />
                  <span style={modalStyles.calIcon}>📅</span>
                </div>
              </div>
              {receiveError && (
                <div style={{ color: "#ef4444", fontSize: 13, marginTop: -8 }}>{receiveError}</div>
              )}
            </div>
            <div style={modalStyles.footer}>
              <button style={modalStyles.cancelBtn} onClick={closeReceiveModal} disabled={receiveSaving}>Cancel</button>
              <button style={{ ...modalStyles.saveBtn, opacity: receiveSaving ? 0.7 : 1 }} onClick={saveReceive} disabled={receiveSaving}>
                {receiveSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispatch to Supplier Modal */}
      {dispatchModal && (
        <div style={modalStyles.overlay} onClick={closeDispatchModal}>
          <div style={modalStyles.dialog} onClick={(e) => e.stopPropagation()}>
            <div style={modalStyles.header}>
              <span style={modalStyles.title}>Dispatch</span>
              <button style={modalStyles.closeBtn} onClick={closeDispatchModal}>✕</button>
            </div>
            <div style={modalStyles.body}>
              <div style={modalStyles.field}>
                <label style={modalStyles.label}>Date :</label>
                <input
                  type="date"
                  value={dispatchForm.date}
                  onChange={(e) => setDispatchForm((f) => ({ ...f, date: e.target.value }))}
                  style={modalStyles.input}
                />
              </div>
              <div style={modalStyles.field}>
                <label style={modalStyles.label}>Employee 1</label>
                <input
                  type="text"
                  value={dispatchForm.employee1}
                  onChange={(e) => setDispatchForm((f) => ({ ...f, employee1: e.target.value }))}
                  style={modalStyles.input}
                  placeholder="Employee 1 name"
                />
              </div>
              <div style={modalStyles.field}>
                <label style={modalStyles.label}>Employee 2</label>
                <select
                  value={dispatchForm.employee2}
                  onChange={(e) => setDispatchForm((f) => ({ ...f, employee2: e.target.value }))}
                  style={modalStyles.input}
                >
                  <option value="">-- Select Employee 2 --</option>
                  {usersList.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div style={modalStyles.field}>
                <label style={modalStyles.label}>Supplier</label>
                <select
                  value={dispatchForm.supplier}
                  onChange={(e) => setDispatchForm((f) => ({ ...f, supplier: e.target.value }))}
                  style={modalStyles.input}
                >
                  <option value="">-- Select Supplier --</option>
                  {suppliersList.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              {dispatchError && (
                <div style={{ color: "#ef4444", fontSize: 13, marginTop: -8 }}>{dispatchError}</div>
              )}
            </div>
            <div style={modalStyles.footer}>
              <button style={modalStyles.cancelBtn} onClick={closeDispatchModal} disabled={dispatchSaving}>Cancel</button>
              <button style={{ ...modalStyles.saveBtn, opacity: dispatchSaving ? 0.7 : 1 }} onClick={saveDispatch} disabled={dispatchSaving}>
                {dispatchSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Pre Service Modal ── */}
      {preServiceModal && (
        <div style={modalStyles.overlay} onClick={closePreServiceModal}>
          <div style={modalStyles.dialog} onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div style={modalStyles.header}>
              <span style={modalStyles.title}>Pre service</span>
              <button style={modalStyles.closeBtn} onClick={closePreServiceModal}>✕</button>
            </div>

            {/* Body */}
            <div style={modalStyles.body}>

              {/* Date */}
              <div style={modalStyles.field}>
                <label style={modalStyles.label}>Date :</label>
                <input
                  type="date"
                  value={preServiceForm.date}
                  onChange={(e) =>
                    setPreServiceForm((f) => ({ ...f, date: e.target.value }))
                  }
                  style={modalStyles.input}
                />
              </div>

              {/* Employee 1 */}
              <div style={modalStyles.field}>
                <label style={modalStyles.label}>Employee 1</label>
                <input
                  type="text"
                  value={preServiceForm.employee1}
                  onChange={(e) =>
                    setPreServiceForm((f) => ({ ...f, employee1: e.target.value }))
                  }
                  style={modalStyles.input}
                  placeholder="Employee 1 name"
                />
              </div>

              {/* Employee 2 */}
              <div style={modalStyles.field}>
                <label style={modalStyles.label}>Employee 2</label>
                <select
                  value={preServiceForm.employee2}
                  onChange={(e) =>
                    setPreServiceForm((f) => ({ ...f, employee2: e.target.value }))
                  }
                  style={modalStyles.input}
                >
                  <option value="">-- Select Employee 2 --</option>
                  {usersList.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              {/* Standby */}
              <div style={modalStyles.field}>
                <label style={modalStyles.label}>Whether Standby issued?</label>
                <div style={modalStyles.radioGroup}>
                  <label style={modalStyles.radioLabel}>
                    <input
                      type="radio"
                      name="standby"
                      value="yes"
                      checked={preServiceForm.standbyIssued === "yes"}
                      onChange={() =>
                        setPreServiceForm((f) => ({ ...f, standbyIssued: "yes" }))
                      }
                      style={modalStyles.radio}
                    />
                    Yes
                  </label>
                  <label style={modalStyles.radioLabel}>
                    <input
                      type="radio"
                      name="standby"
                      value="no"
                      checked={preServiceForm.standbyIssued === "no"}
                      onChange={() =>
                        setPreServiceForm((f) => ({ ...f, standbyIssued: "no" }))
                      }
                      style={modalStyles.radio}
                    />
                    No
                  </label>
                </div>
              </div>

              {/* Error */}
              {preServiceError && (
                <div style={{ color: "#ef4444", fontSize: 13, marginTop: -8 }}>{preServiceError}</div>
              )}

            </div>

            {/* Footer */}
            <div style={modalStyles.footer}>
              <button style={modalStyles.cancelBtn} onClick={closePreServiceModal} disabled={preServiceSaving}>Cancel</button>
              <button style={{ ...modalStyles.saveBtn, opacity: preServiceSaving ? 0.7 : 1 }} onClick={savePreService} disabled={preServiceSaving}>
                {preServiceSaving ? "Saving…" : "Save"}
              </button>
            </div>

          </div>
        </div>
      )}
      {/* Image Gallery Modal */}
      {imageGallery && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 2000, flexDirection: "column",
          }}
          onClick={() => setImageGallery(null)}
        >
          <div
            style={{ width: "100%", maxWidth: 900, padding: "0 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 15, fontFamily: "'Google Sans', sans-serif" }}>
                {galleryLoading
                  ? "Loading images…"
                  : imageGallery.images.length > 0
                  ? `Photo ${imageGallery.activeIdx + 1} of ${imageGallery.images.length}`
                  : "No photos"}
              </span>
              <button
                onClick={() => setImageGallery(null)}
                style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, color: "#fff", fontSize: 18, cursor: "pointer", padding: "4px 12px", fontFamily: "'Google Sans', sans-serif" }}
              >✕</button>
            </div>

            {galleryLoading ? (
              <div style={{ color: "#94a3b8", fontSize: 14, padding: "80px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, border: "3px solid rgba(255,255,255,0.2)", borderTopColor: "#60a5fa", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                <span>Loading images…</span>
              </div>
            ) : imageGallery.images.length === 0 ? (
              <div style={{ color: "#94a3b8", fontSize: 14, padding: "60px 0", textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🖼️</div>
                No images available
              </div>
            ) : (
              <>
                {/* Main image */}
                <div style={{ position: "relative", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                  {/* Prev */}
                  {imageGallery.images.length > 1 && (
                    <button
                      onClick={() => setImageGallery((g) => ({ ...g, activeIdx: (g.activeIdx - 1 + g.images.length) % g.images.length }))}
                      style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", color: "#fff", fontSize: 26, cursor: "pointer", width: 48, height: 48, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                      title="Previous"
                    >‹</button>
                  )}

                  <img
                    key={imageGallery.images[imageGallery.activeIdx]?.url}
                    src={imageGallery.images[imageGallery.activeIdx]?.url}
                    alt={imageGallery.images[imageGallery.activeIdx]?.name || `Photo ${imageGallery.activeIdx + 1}`}
                    style={{ maxHeight: "65vh", maxWidth: imageGallery.images.length > 1 ? "calc(100% - 120px)" : "100%", borderRadius: 12, objectFit: "contain", background: "#1a1a1a", boxShadow: "0 8px 40px rgba(0,0,0,0.6)" }}
                    onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                  />
                  <div style={{ display: "none", flexDirection: "column", alignItems: "center", gap: 8, color: "#94a3b8", fontSize: 13, padding: "60px 40px", background: "#1a1a1a", borderRadius: 12 }}>
                    <span style={{ fontSize: 32 }}>⚠️</span>
                    <span>Image could not be loaded</span>
                  </div>

                  {/* Next */}
                  {imageGallery.images.length > 1 && (
                    <button
                      onClick={() => setImageGallery((g) => ({ ...g, activeIdx: (g.activeIdx + 1) % g.images.length }))}
                      style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", color: "#fff", fontSize: 26, cursor: "pointer", width: 48, height: 48, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                      title="Next"
                    >›</button>
                  )}
                </div>

                {/* Filename */}
                {imageGallery.images[imageGallery.activeIdx]?.name && (
                  <div style={{ color: "#94a3b8", fontSize: 12, fontFamily: "'Google Sans', sans-serif", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {imageGallery.images[imageGallery.activeIdx].name}
                  </div>
                )}

                {/* Thumbnails */}
                {imageGallery.images.length > 1 && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", maxWidth: "100%", maxHeight: 80, overflowY: "auto" }}>
                    {imageGallery.images.map((img, i) => (
                      <img
                        key={img.id ?? i}
                        src={img.url}
                        alt={img.name || `Photo ${i + 1}`}
                        onClick={() => setImageGallery((g) => ({ ...g, activeIdx: i }))}
                        style={{
                          width: 64, height: 64, objectFit: "cover", borderRadius: 8, cursor: "pointer",
                          border: i === imageGallery.activeIdx ? "2.5px solid #60a5fa" : "2.5px solid transparent",
                          opacity: i === imageGallery.activeIdx ? 1 : 0.55,
                          transition: "opacity 0.15s, border 0.15s",
                          flexShrink: 0,
                        }}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
      {/* View Details Modal */}
      {viewRow && (
        <div style={modalStyles.overlay} onClick={() => setViewRow(null)}>
          <div
            style={{
              ...modalStyles.dialog,
              width: 560,
              maxWidth: "96vw",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ ...modalStyles.header, background: "#1b85f0", borderRadius: "14px 14px 0 0" }}>
              <span style={{ ...modalStyles.title, color: "#fff" }}>
                Service Details — #{viewRow.id}
              </span>
              <button style={{ ...modalStyles.closeBtn, color: "#fff" }} onClick={() => setViewRow(null)}>✕</button>
            </div>

            {/* Scrollable body */}
            <div style={{ overflowY: "auto", flex: 1, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 0 }}>

              {/* Section: Customer Info */}
              <ViewSection title="Customer Info">
                <ViewField label="Customer Name"   value={viewRow.customerName} />
                <ViewField label="Customer Place"  value={viewRow.customerPlace} />
                <ViewField label="Customer Phone"  value={viewRow.customerPhone} />
                <ViewField label="Person Name"     value={viewRow.personName} />
                <ViewField label="Phone Number"    value={viewRow.phoneNumber} />
              </ViewSection>

              {/* Section: Product */}
              <ViewSection title="Product">
                <ViewField label="Product"    value={viewRow.product} />
                <ViewField label="Model"      value={viewRow.model} />
                <ViewField label="Serial No"  value={viewRow.serialNo} mono />
              </ViewSection>

              {/* Section: Complaints & Notes */}
              <ViewSection title="Complaints & Notes">
                <ViewField label="Complaints" value={viewRow.complaints.length > 0 ? viewRow.complaints.join(", ") : "—"} />
                <ViewField label="Notes"      value={viewRow.notes || "—"} />
              </ViewSection>

              {/* Section: Received */}
              <ViewSection title="Received">
                <ViewField label="Received Date"     value={viewRow.receivedDate} />
                <ViewField label="Employee 1"        value={viewRow.employee1} />
                <ViewField label="Employee 2"        value={viewRow.employee2} />
                <ViewField label="Warranty"          value={viewRow.warranty ? "Yes" : "No"} badge={viewRow.warranty ? "green" : "red"} />
                <ViewField label="Standby Issued"    value={viewRow.standbyItem ? "Yes" : "No"} badge={viewRow.standbyItem ? "green" : "red"} />
                <ViewField label="Standby Returned"  value={viewRow.standbyItem ? (viewRow.standbyReturned ? "Yes" : "No") : "—"} badge={viewRow.standbyItem ? (viewRow.standbyReturned ? "green" : "red") : undefined} />
              </ViewSection>

              {/* Section: Pre Service */}
              {viewRow.preService && (
                <ViewSection title="Pre Service">
                  <ViewField label="Date"       value={viewRow.preServiceDate} />
                  <ViewField label="Employee 1" value={viewRow.preServiceEmployee1} />
                  <ViewField label="Employee 2" value={viewRow.preServiceEmployee2} />
                  <ViewField label="Standby Issued" value={viewRow.preServiceStandby ? "Yes" : "No"} badge={viewRow.preServiceStandby ? "green" : "red"} />
                </ViewSection>
              )}

              {/* Section: Dispatch to Supplier */}
              {viewRow.dispatchToSupplier && (
                <ViewSection title="Dispatch to Supplier">
                  <ViewField label="Date"       value={viewRow.dispatchDate} />
                  <ViewField label="Employee 1" value={viewRow.dispatchEmployee1} />
                  <ViewField label="Employee 2" value={viewRow.dispatchEmployee2} />
                  <ViewField label="Supplier"   value={viewRow.dispatchSupplier} />
                </ViewSection>
              )}

              {/* Section: Receive from Supplier */}
              {viewRow.receiveFromSupplier && (
                <ViewSection title="Receive from Supplier">
                  <ViewField label="Date"       value={viewRow.receiveDate} />
                  <ViewField label="Employee 1" value={viewRow.receiveEmployee1} />
                  <ViewField label="Employee 2" value={viewRow.receiveEmployee2} />
                  <ViewField label="Note"       value={viewRow.receiveNote} />
                </ViewSection>
              )}

              {/* Section: Post Service */}
              {viewRow.postService && (
                <ViewSection title="Post Service">
                  <ViewField label="Date"       value={viewRow.postServiceDate} />
                  <ViewField label="Employee 1" value={viewRow.postServiceEmployee1} />
                  <ViewField label="Employee 2" value={viewRow.postServiceEmployee2} />
                </ViewSection>
              )}

              {/* Section: Delivered */}
              {viewRow.deliveredStage && (
                <ViewSection title="Delivered">
                  <ViewField label="Date"       value={viewRow.deliverDate} />
                  <ViewField label="Employee 1" value={viewRow.deliverEmployee1} />
                  <ViewField label="Employee 2" value={viewRow.deliverEmployee2} />
                  <ViewField label="Note"       value={viewRow.deliverNote} />
                  <ViewField label="Standby Returned" value={viewRow.standbyReturned ? "Yes" : "No"} badge={viewRow.standbyReturned ? "green" : "red"} />
                </ViewSection>
              )}

              {/* Images */}
              {viewRow.images > 0 && (
                <ViewImagesSection row={viewRow} onLoadImages={async () => {
                  if (viewRow.imageUrls && viewRow.imageUrls.length > 0) return viewRow.imageUrls;
                  try {
                    const json = await apiFetch(ENDPOINTS.service(viewRow.id), { headers: authHeaders() });
                    const imgs = (json.images || []).map((img) => ({
                      id: img.id,
                      url: img.image_url || ENDPOINTS.mediaUrl(img.image),
                      name: img.name,
                    })).filter((img) => img.url);
                    setData((d) => d.map((r) => r.id === viewRow.id ? { ...r, imageUrls: imgs } : r));
                    setViewRow((prev) => ({ ...prev, imageUrls: imgs }));
                    return imgs;
                  } catch { return []; }
                }} />
              )}

              {/* Status */}
              <ViewSection title="Status">
                <ViewField label="Current Status" value={viewRow.status} statusPill={STATUS_PILL[viewRow.status]} />
              </ViewSection>

            </div>

            {/* Footer */}
            <div style={{ ...modalStyles.footer, justifyContent: "flex-end" }}>
              <button style={modalStyles.cancelBtn} onClick={() => setViewRow(null)}>Close</button>
              <button style={modalStyles.saveBtn} onClick={() => { setViewRow(null); openEditForm(viewRow); }}>
                Edit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Small helper components for the View modal ──────────────────────────
function ViewSection({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
        color: "#1b85f0", borderBottom: "1.5px solid #e2e8f0", paddingBottom: 5, marginBottom: 12,
      }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px", alignItems: "start" }}>
        {children}
      </div>
    </div>
  );
}

function ViewImagesSection({ row, onLoadImages }) {
  const [imgs, setImgs] = useState(row.imageUrls && row.imageUrls.length > 0 ? row.imageUrls : null);
  const [loading, setLoading] = useState(false);
  const [lightbox, setLightbox] = useState(null); // index

  useEffect(() => {
    if (!imgs) {
      setLoading(true);
      onLoadImages().then((result) => {
        setImgs(result);
        setLoading(false);
      });
    }
  }, []);

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
        color: "#1b85f0", borderBottom: "1.5px solid #e2e8f0", paddingBottom: 4, marginBottom: 10,
      }}>
        Images {imgs ? `(${imgs.length})` : `(${row.images})`}
      </div>

      {loading && (
        <div style={{ fontSize: 13, color: "#94a3b8", padding: "8px 0" }}>Loading images…</div>
      )}

      {imgs && imgs.length === 0 && (
        <div style={{ fontSize: 13, color: "#94a3b8" }}>No images available.</div>
      )}

      {imgs && imgs.length > 0 && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {imgs.map((img, i) => (
              <div
                key={img.id || i}
                onClick={() => setLightbox(i)}
                style={{
                  width: 80, height: 80, borderRadius: 8, overflow: "hidden",
                  border: "2px solid #e2e8f0", cursor: "pointer", flexShrink: 0,
                  background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "border-color 0.15s",
                }}
                title={img.name || `Image ${i + 1}`}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "#1b85f0"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "#e2e8f0"}
              >
                <img
                  src={img.url}
                  alt={img.name || `Image ${i + 1}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            ))}
          </div>

          {/* Lightbox */}
          {lightbox !== null && (
            <div
              style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)",
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 2000,
              }}
              onClick={() => setLightbox(null)}
            >
              <div
                style={{ position: "relative", maxWidth: "90vw", maxHeight: "85vh", display: "flex", alignItems: "center", gap: 16 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Prev */}
                {imgs.length > 1 && (
                  <button
                    onClick={() => setLightbox((lightbox - 1 + imgs.length) % imgs.length)}
                    style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 40, height: 40, color: "#fff", fontSize: 20, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                  >‹</button>
                )}

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                  <img
                    src={imgs[lightbox].url}
                    alt={imgs[lightbox].name || `Image ${lightbox + 1}`}
                    style={{ maxWidth: "75vw", maxHeight: "75vh", borderRadius: 10, objectFit: "contain", boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }}
                  />
                  {imgs[lightbox].name && (
                    <span style={{ color: "#e2e8f0", fontSize: 13 }}>{imgs[lightbox].name}</span>
                  )}
                  <span style={{ color: "#94a3b8", fontSize: 12 }}>{lightbox + 1} / {imgs.length}</span>
                </div>

                {/* Next */}
                {imgs.length > 1 && (
                  <button
                    onClick={() => setLightbox((lightbox + 1) % imgs.length)}
                    style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 40, height: 40, color: "#fff", fontSize: 20, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                  >›</button>
                )}

                {/* Close */}
                <button
                  onClick={() => setLightbox(null)}
                  style={{ position: "absolute", top: -16, right: -16, background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: 32, height: 32, color: "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >✕</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ViewField({ label, value, mono, badge, statusPill }) {
  const displayValue = value || "—";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0, width: "100%", alignItems: "flex-start", textAlign: "left" }}>
      <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", textAlign: "left" }}>{label}</span>
      {badge ? (
        <span style={{
          fontSize: 12, fontWeight: 700, borderRadius: 6, padding: "2px 10px",
          display: "inline-block",
          background: badge === "green" ? "#dcfce7" : "#fee2e2",
          color: badge === "green" ? "#166534" : "#991b1b",
          textAlign: "left",
        }}>{displayValue}</span>
      ) : statusPill ? (
        <span className={`status-select ${statusPill}`} style={{ fontSize: 11, fontWeight: 700, borderRadius: 6, padding: "3px 10px", display: "inline-block", textAlign: "left" }}>
          {displayValue}
        </span>
      ) : (
        <span style={{ fontSize: 13, color: "#111827", fontFamily: mono ? "monospace" : "inherit", fontWeight: mono ? 600 : 400, wordBreak: "break-word", textAlign: "left", display: "block" }}>
          {displayValue}
        </span>
      )}
    </div>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@300;400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; color: #000; }
  body, input, button, select { font-family: 'Google Sans', sans-serif !important; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
  @keyframes spin { to { transform: rotate(360deg); } }
  .table-row { transition: background 0.15s; }
  .table-row:hover { background: #eef3fb !important; }
  .action-edit svg, .action-delete svg { color: #fff !important; fill: #fff !important; }

  .status-select {
    appearance: none; -webkit-appearance: none;
    border: none; border-radius:6px;
    padding: 6px 12px; font-size: 12px; font-weight: 600;
    cursor: pointer; white-space: nowrap;
    font-family: 'Google Sans', sans-serif;
    text-align: center;
    width: auto; display: inline-block;
  }
  .status-select:focus { outline: 2px solid rgba(255,255,255,0.5); outline-offset: 1px; }
  .status-select option { background: #fff !important; color: #000 !important; }

  .pill-amber  { background: #f59e0b !important; color: #fff !important; }
  .pill-blue   { background: #1d73e8 !important; color: #fff !important; }
  .pill-purple { background: #7c3aed !important; color: #fff !important; }
  .pill-orange { background: #ea580c !important; color: #fff !important; }
  .pill-teal   { background: #0d9488 !important; color: #fff !important; }
  .pill-green  { background: #188038 !important; color: #fff !important; }
  .pill-muted  { background: #5f6368 !important; color: #fff !important; }

  /* ══════════════════════════════════════
     MOBILE  ≤ 768px
  ══════════════════════════════════════ */
  @media (max-width: 768px) {
    /* page fills full screen, locked — no page-level scroll */
    .sl-page { height: 100vh !important; min-height: unset !important; overflow: hidden !important; display: flex !important; flex-direction: column !important; }
    /* inner card stretches to fill remaining height */
    .sl-card  { flex: 1 1 0 !important; min-height: 0 !important; overflow: hidden !important; display: flex !important; flex-direction: column !important; }

    /* title bar */
    .sl-titlebar {
      flex-direction: column !important; align-items: flex-start !important;
      gap: 10px !important; padding: 14px 16px !important;
    }
    .sl-titlebar h1 { font-size: 18px !important; }
    .sl-add-btn { width: 100% !important; padding: 12px !important; font-size: 14px !important; border-radius: 10px !important; text-align: center; }

    /* toolbar: stack filters */
    .sl-toolbar {
      flex-direction: column !important; padding: 12px 16px !important;
      gap: 10px !important; overflow: visible !important;
    }
    .sl-search-wrap { width: 100% !important; }
    .sl-filter-row { display: flex; flex-direction: column; gap: 10px; width: 100%; }
    .sl-filter-item { width: 100% !important; }
    .sl-filter-item select { width: 100% !important; font-size: 14px !important; padding: 10px 32px 10px 12px !important; }
    .sl-filter-item label { font-size: 13px !important; min-width: 80px; }
    .sl-reset-btn { width: 100% !important; padding: 10px !important; font-size: 14px !important; }
    .sl-count-badge { display: none !important; }

    /* hide desktop table */
    .sl-table-wrap { display: none !important; }

    /* show mobile cards — one per row, vertical scroll only here */
    .sl-cards-wrap {
      display: flex !important;
      flex-direction: column !important;
      gap: 12px;
      padding: 12px 16px 24px;
      flex: 1 1 0;
      min-height: 0;
      overflow-y: auto !important;
      overflow-x: hidden !important;
      -webkit-overflow-scrolling: touch;
    }

    /* footer */
    .sl-footer { padding: 12px 16px !important; text-align: center !important; }
  }

  /* desktop: hide mobile cards */
  @media (min-width: 769px) {
    .sl-cards-wrap { display: none !important; }
  }

  /* ── Mobile Card styles ── */
  .sl-service-card {
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.08);
    overflow: hidden;
    border: 1px solid #e8edf5;
    font-family: 'Google Sans', sans-serif;
    flex-shrink: 0;
  }
  .sl-card-header {
    background: linear-gradient(135deg, #1b85f0 0%, #3466ec 100%);
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .sl-card-header-left { display: flex; flex-direction: column; gap: 2px; }
  .sl-card-sl { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.75); letter-spacing: 0.05em; }
  .sl-card-customer { font-size: 16px; font-weight: 700; color: #fff; }
  .sl-card-header-right { display: flex; align-items: center; gap: 8px; }
  .sl-card-body { padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }

  /* info rows inside card */
  .sl-card-row { display: flex; align-items: flex-start; gap: 10px; }
  .sl-card-label {
    font-size: 11px; font-weight: 700; color: #64748b;
    text-transform: uppercase; letter-spacing: 0.06em;
    min-width: 90px; flex-shrink: 0; padding-top: 1px;
  }
  .sl-card-value { font-size: 13px; color: #1e293b; font-weight: 500; flex: 1; }
  .sl-card-value-sub { font-size: 12px; color: #64748b; margin-top: 2px; }
  .sl-card-mono { font-family: monospace; font-size: 12px; color: #475569; letter-spacing: 0.03em; }

  /* divider */
  .sl-card-divider { height: 1px; background: #f1f5f9; margin: 2px 0; }

  /* stages row */
  .sl-card-stages {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 16px;
    background: #f8fafc;
    border-top: 1px solid #f1f5f9;
    gap: 4px;
  }
  .sl-stage-item { display: flex; flex-direction: column; align-items: center; gap: 3px; flex: 1; }
  .sl-stage-label { font-size: 9px; color: #94a3b8; font-weight: 600; text-align: center; line-height: 1.2; }

  /* card footer */
  .sl-card-footer {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 16px;
    border-top: 1px solid #f1f5f9;
    gap: 8px;
  }
  .sl-card-status-wrap { flex: 1; }
  .sl-card-status-wrap .status-select { width: 100% !important; font-size: 12px !important; padding: 7px 12px !important; border-radius: 8px !important; }
  .sl-card-actions { display: flex; gap: 8px; flex-shrink: 0; }
  .sl-card-actions button { padding: 8px 10px !important; border-radius: 8px !important; }

  /* complaints in card */
  .sl-card-complaints { display: flex; flex-direction: column; gap: 3px; }
  .sl-card-complaint-item { font-size: 12px; color: #374151; }
  .sl-card-more-btn {
    font-size: 11px; color: #1e73e2; background: none; border: none;
    cursor: pointer; font-weight: 600; padding: 0; margin-top: 2px;
    font-family: 'Google Sans', sans-serif;
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

const styles = {
  page: {
    minHeight: "100%",
    display: "flex",
    flexDirection: "column",
    background: "linear-gradient(135deg, #f0f4f8 0%, #e8edf3 100%)",
    fontFamily: "'Google Sans', sans-serif",
    overflowX: "hidden",
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
  },
  card: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    background: "#fff",
    overflowX: "hidden",
    overflowY: "visible",
  },

  // Title bar
  titleBar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "10px 20px 8px 20px",
    background: "#fff",
    borderBottom: "1px solid #f1f5f9",
  },
  headerTitle: {
    fontFamily: "'Google Sans', sans-serif",
    fontSize: 20, fontWeight: 800, color: "#0e0d0d",
    letterSpacing: "-0.02em", margin: 0,
  },
  addBtn: {
    padding: "8px 18px", background: "#3466ec", color: "#f9fafc",
    border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700,
    cursor: "pointer", letterSpacing: "0.01em", whiteSpace: "nowrap",
  },

  // Filter toolbar
  toolbar: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: "10px 20px",
    borderBottom: "2px solid #e2e8f0",
    background: "#f9fafc",
    flexWrap: "nowrap",
    width: "100%",
    boxSizing: "border-box",
    overflow: "hidden",
  },
  toolbarRow: { display: "flex", alignItems: "center", gap: 12 },
  filtersRow_UNUSED: {
    display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
    padding: "16px 28px", borderBottom: "1px solid #f1f5f9",
    background: "#fafbfc",
  },
  filtersRow: { display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" },
  resetBtn: { padding: "8px 16px", border: "1.5px solid #fecaca", borderRadius: 9, background: "#fff0f0", color: "#ef4444", fontSize: 13, fontWeight: 600, cursor: "pointer", alignSelf: "center", whiteSpace: "nowrap", flexShrink: 0 },
  searchWrap: {
    display: "flex", alignItems: "center", gap: 8,
    border: "1.5px solid #e2e8f0", borderRadius: 10,
    padding: "8px 12px", background: "#fff",
    flex: "2 1 0", minWidth: 0,
    boxSizing: "border-box",
  },
  searchIcon: { fontSize: 14, flexShrink: 0 },
  searchInput: {
    border: "none", outline: "none", fontSize: 13,
    background: "transparent", flex: 1, color: "#000",
  },
  clearBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#94a3b8", padding: 0 },
  countBadge: {
    marginLeft: "auto", fontSize: 12, fontWeight: 600,
    color: "#1e3a5f", background: "#e8f0fe", borderRadius: 20,
    padding: "4px 12px",
  },

  // Table
  tableWrap: { overflowX: "auto", overflowY: "auto", flex: 1 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    padding: "12px 14px", textAlign: "left",
    background: "#1b85f0ff", borderBottom: "2px solid #e2e8f0",
    fontWeight: 600, fontSize: 12, color: "#ffffffff",
    letterSpacing: "0.04em", textTransform: "capitalize",
    whiteSpace: "nowrap", userSelect: "none", textAlign: "left",
  },
  td: {
    padding: "5px 14px", borderBottom: "1px solid #f1f5f9",
    verticalAlign: "middle", fontSize: 11, color: "#000",
    textAlign: "left", lineHeight: "1.2",
  },
  emptyCell: { padding: "48px", textAlign: "center" },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center" },

  // Stacked cell styles
  stackMain: { fontSize: 13, fontWeight: 500, color: "#000", lineHeight: 1.4 },
  stackSub: { fontSize: 11, color: "#64748b", marginTop: 0, lineHeight: 1.2 },

  // Complaint cell
  complaintText: { fontSize: 12, color: "#000", lineHeight: 1.3 },
  moreBtn: {
    marginTop: 1, fontSize: 11, color: "#1e3a5f",
    background: "none", border: "none", cursor: "pointer",
    fontWeight: 600, padding: 0,
  },

  // Image badge
  imgBadge: {
    display: "inline-flex", alignItems: "center", gap: 3,
    fontSize: 12, fontWeight: 600, color: "#1e3a5f",
     borderRadius: 6, padding: "2px 8px",
  },
  na: { color: "#cbd5e1", fontSize: 13 },

  // Status
  statusBadge: {
    display: "inline-block", fontSize: 11, fontWeight: 700,
    borderRadius:6, padding: "3px 10px", whiteSpace: "nowrap",
  },

  // Stage checkbox button
  stageBtn: {
    background: "none",
    border: "none",
    padding: 4,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "color 0.18s, transform 0.12s",
    borderRadius: 6,
  },

  // Status select
  statusSelect: {
    display: "inline-block",
  },

  // Action buttons
  actionBtns: { display: "flex", gap: 6 },
  viewBtn: {
    padding: "5px 8px", borderRadius: 7, border: "none",
    background: "#0d9488", color: "#fff",
    fill: "#fff",
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Google Sans', sans-serif",
  },
  editBtn: {
    padding: "5px 8px", borderRadius: 7, border: "none",
    background: "#1a73e8", color: "#fff",
    fill: "#fff",
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Google Sans', sans-serif",
  },
  deleteBtn: {
    padding: "5px 8px", borderRadius: 7, border: "none",
    background: "#d93025", color: "#fff",
    fill: "#fff",
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Google Sans', sans-serif",
  },

  // Footer
  footer: {
    padding: "14px 28px", borderTop: "1px solid #f1f5f9",
    background: "#fafbfc", textAlign: "right",
  },
};

const modalStyles = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.35)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000,
  },
  dialog: {
    background: "#fff",
    borderRadius: 14,
    width: 420,
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
  title: {
    fontSize: 17, fontWeight: 700, color: "#0e0d0d",
  },
  closeBtn: {
    background: "none", border: "none", cursor: "pointer",
    fontSize: 18, color: "#94a3b8", lineHeight: 1, padding: 2,
  },
  body: {
    padding: "20px 22px",
    display: "flex", flexDirection: "column", gap: 18,
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
  radioGroup: {
    display: "flex", gap: 24, alignItems: "center",
  },
  radioLabel: {
    display: "flex", alignItems: "center", gap: 7,
    fontSize: 14, color: "#111827", cursor: "pointer", fontWeight: 500,
  },
  radio: {
    accentColor: "#3466ec",
    width: 17, height: 17, cursor: "pointer",
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