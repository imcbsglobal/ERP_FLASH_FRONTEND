// ═════════════════════════════════════════════════════════════════════════════
//  src/api.js  —  Central API file
//
//  ⚠️  Do NOT change the URL here.
//     To change the API URL → edit  src/apiConfig.js  only.
//
//  Modules included:
//    • Core helpers  (authHeaders, apiFetch, token refresh)
//    • Role / Access constants (ROLES, MENU_GROUPS)
//    • Auth          (login, logout, refresh, me)
//    • Users         (CRUD, toggle status)
//    • Branches      (list, create)
//    • User Permissions (get, save, bulk save)
//    • Vehicles      (CRUD + odometer, status, expiry, service due)
//    • Challans      (CRUD + summary)
//    • Claims        (CRUD + status + draft)
//    • Payments      (CRUD + status + summary + normalize)
//    • Trips         (start, end, fetch, update, delete)
//    • Image Capture (customers, links, OTP, upload, captures)
// ═════════════════════════════════════════════════════════════════════════════

import axios from 'axios';
import API_BASE_URL from './apiConfig';

// ─────────────────────────────────────────────────────────────────────────────
//  BASE URL  (single source — change only apiConfig.js)
// ─────────────────────────────────────────────────────────────────────────────
export const BASE_URL = API_BASE_URL.replace(/\/$/, '');

// ─────────────────────────────────────────────────────────────────────────────
//  ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────
export const ENDPOINTS = {
  // Auth
  login:            `${BASE_URL}/auth/login/`,
  logout:           `${BASE_URL}/auth/logout/`,
  tokenRefresh:     `${BASE_URL}/auth/token/refresh/`,
  me:               `${BASE_URL}/auth/me/`,
  changePassword:   `${BASE_URL}/auth/change-password/`,
  register:         `${BASE_URL}/auth/register/`,

  // Users
  users:            `${BASE_URL}/users/`,
  user:             (id) => `${BASE_URL}/users/${id}/`,
  userToggleStatus: (id) => `${BASE_URL}/users/${id}/toggle-status/`,
  userPermissions:  (id) => `${BASE_URL}/users/${id}/permissions/`,
  userPermsBulk:    `${BASE_URL}/users/permissions/bulk/`,

  // Branches
  branches:         `${BASE_URL}/branches/`,

  // Vehicles
  vehicles:         `${BASE_URL}/vehicles/`,
  vehicle:          (id) => `${BASE_URL}/vehicles/${id}/`,
  vehicleOdometer:  (id) => `${BASE_URL}/vehicles/${id}/update_odometer/`,
  vehicleStatus:    (id) => `${BASE_URL}/vehicles/${id}/update_status/`,
  vehicleInsurance: `${BASE_URL}/vehicles/expiring_insurance/`,
  vehiclePollution: `${BASE_URL}/vehicles/expiring_pollution/`,
  vehicleService:   `${BASE_URL}/vehicles/service_due/`,
  vehicleTrips:     (id) => `${BASE_URL}/vehicles/${id}/trip_history/`,

  // Challans
  challans:         `${BASE_URL}/challan/challans/`,
  challan:          (id) => `${BASE_URL}/challan/challans/${id}/`,
  challanSummary:   `${BASE_URL}/challan/challans/summary/`,

  // Claims
  claims:           `${BASE_URL}/claims/`,
  claim:            (id) => `${BASE_URL}/claims/${id}/`,
  claimStatus:      (id) => `${BASE_URL}/claims/${id}/status/`,
  claimDraft:       `${BASE_URL}/claims/draft/`,
  claimDepartments: `${BASE_URL}/claims/departments/`,

  // Payments
  payments:         `${BASE_URL}/payments/`,
  payment:          (id) => `${BASE_URL}/payments/${id}/`,
  paymentStatus:    (id) => `${BASE_URL}/payments/${id}/status/`,
  paymentSummary:   `${BASE_URL}/payments/summary/`,
  debtors:          `${BASE_URL}/payments/flasherp/debtors/`,
  departments:      `${BASE_URL}/payments/flasherp/departments/`,

  // Service Entries
  services:             `${BASE_URL}/services/`,
  service:              (id) => `${BASE_URL}/services/${id}/`,
  serviceImages:        (id) => `${BASE_URL}/services/${id}/images/`,
  serviceImage:         (id) => `${BASE_URL}/services/images/${id}/`,
  serviceStage:         (id, field) => `${BASE_URL}/services/${id}/stage/${field}/`,
  serviceStatus:        (id) => `${BASE_URL}/services/${id}/status/`,
  servicePreService:    (id) => `${BASE_URL}/services/${id}/pre-service/`,
  serviceDispatch:      (id) => `${BASE_URL}/services/${id}/dispatch/`,
  serviceReceive:       (id) => `${BASE_URL}/services/${id}/receive/`,
  servicePostService:   (id) => `${BASE_URL}/services/${id}/post-service/`,
  serviceDeliver:       (id) => `${BASE_URL}/services/${id}/deliver/`,

  // Standby Items
  standbys:             `${BASE_URL}/standbys/`,
  standby:              (id) => `${BASE_URL}/standbys/${id}/`,
  standbyImages:        (id) => `${BASE_URL}/standbys/${id}/images/`,
  standbyImage:         (id, imgId) => `${BASE_URL}/standbys/${id}/images/${imgId}/`,

  // Trips
  trips:            `${BASE_URL}/travel/trips/`,
  trip:             (id) => `${BASE_URL}/travel/trips/${id}/`,
  tripEnd:          (id) => `${BASE_URL}/travel/trips/${id}/end/`,
  tripsOngoing:     `${BASE_URL}/travel/trips/ongoing/`,

  // =========================================================================
  // IMAGE CAPTURE ENDPOINTS
  // =========================================================================
  // Image capture app is mounted at the root level in Django
  // (path("image_capture/", include(...))), NOT under /api/.
  // BASE_URL typically ends with /api, so we strip that suffix here.
  // =========================================================================

  // Customers
  imageCaptureCustomers:     `${BASE_URL.replace(/\/api$/, '')}/image_capture/api/customers/`,
  imageCaptureCustomer:      (id) => `${BASE_URL.replace(/\/api$/, '')}/image_capture/api/customers/${id}/`,

  // Capture Links
  imageCaptureGenerateLink:  `${BASE_URL.replace(/\/api$/, '')}/image_capture/api/generate-link/`,
  imageCaptureLinkDetail:    (uuid) => `${BASE_URL.replace(/\/api$/, '')}/image_capture/api/capture-link/${uuid}/`,
  imageCaptureLinks:         `${BASE_URL.replace(/\/api$/, '')}/image_capture/api/capture-links/`,

  // OTP
  imageCaptureSendOtp:       `${BASE_URL.replace(/\/api$/, '')}/image_capture/api/send-otp/`,
  imageCaptureVerifyOtp:     `${BASE_URL.replace(/\/api$/, '')}/image_capture/api/verify-otp/`,
  imageCaptureResendOtp:     `${BASE_URL.replace(/\/api$/, '')}/image_capture/api/resend-otp/`,

  // Image Upload & Captures
  imageCaptureUpload:        `${BASE_URL.replace(/\/api$/, '')}/image_capture/api/upload-image/`,
  imageCaptureList:          `${BASE_URL.replace(/\/api$/, '')}/image_capture/api/captures/`,
  imageCaptureDetail:        (id) => `${BASE_URL.replace(/\/api$/, '')}/image_capture/api/captures/${id}/`,
  imageCaptureManualStatus:  (id) => `${BASE_URL.replace(/\/api$/, '')}/image_capture/api/captures/${id}/manual-status/`,

  // Media helper — resolves relative /media/... paths to absolute URLs
  mediaUrl: (raw) => {
    if (!raw) return null;
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    return `${BASE_URL.replace(/\/api$/, '')}${raw.startsWith('/') ? '' : '/'}${raw}`;
  },
};


// ═════════════════════════════════════════════════════════════════════════════
//  CORE HELPERS
// ═════════════════════════════════════════════════════════════════════════════

/** Build Authorization + Accept headers from localStorage token */
export function authHeaders(extra = {}) {
  const token = localStorage.getItem('access_token') || localStorage.getItem('access');
  const headers = { Accept: 'application/json', ...extra };
  if (token) {
    headers['Authorization'] = `Bearer ${token.replace(/^Bearer\s+/i, '')}`;
  }
  return headers;
}

/** Refresh the access token using the refresh token */
export async function refreshAccessToken() {
  const refresh = localStorage.getItem('refresh_token') || localStorage.getItem('refresh');
  if (!refresh) return null;

  try {
    const res = await fetch(ENDPOINTS.tokenRefresh, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });

    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('access', data.access);
      if (data.refresh) {
        localStorage.setItem('refresh_token', data.refresh);
        localStorage.setItem('refresh', data.refresh);
      }
      return data.access;
    }

    if (res.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('access');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('refresh');
      return null;
    }

    throw new Error(`Token refresh failed (${res.status})`);
  } catch (err) {
    if (err.message.startsWith('Token refresh failed')) throw err;
    console.error('Token refresh network error:', err);
    return null;
  }
}

/** fetch() wrapper — auto-retries once after a 401 token refresh */
export async function apiFetch(url, options = {}) {
  const requestOptions = {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {}),
    },
  };

  let res = await fetch(url, requestOptions);

  if (res.status === 401) {
    let newToken = null;
    try { newToken = await refreshAccessToken(); }
    catch (e) { throw new Error(e.message); }

    if (newToken) {
      res = await fetch(url, {
        ...requestOptions,
        headers: { ...requestOptions.headers, Authorization: `Bearer ${newToken}` },
      });
    } else {
      localStorage.removeItem('access_token');
      localStorage.removeItem('access');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('refresh');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return;
    }
  }

  // 204 No Content (e.g. DELETE) — nothing to parse
  if (res?.status === 204) return null;

  // Parse error body and throw a readable message for non-OK responses
  if (!res.ok) {
    let body = {};
    try { body = await res.json(); } catch { /* non-JSON body */ }
    const msg =
      body?.detail ||
      Object.entries(body)
        .map(([f, e]) => `${f}: ${Array.isArray(e) ? e.join(', ') : e}`)
        .join(' | ') ||
      `Request failed (${res.status})`;
    const err = new Error(msg);
    err._status = res.status;
    err.data = body;
    throw err;
  }

  // Return parsed JSON — collection.jsx and collection_list.jsx both expect data directly
  return res.json();
}

/** Parse response — throws a readable error on non-OK status */
async function handleResponse(res, retryFn) {
  // retryFn pattern (used in service files that pass doFetch)
  if (res.status === 401 && retryFn) {
    try {
      await refreshAccessToken();
      const retryRes = await retryFn();
      return handleResponse(retryRes, null);
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('access');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('refresh');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return;
    }
  }

  if (!res.ok) {
    let body = {};
    try { body = await res.json(); } catch { /* non-JSON */ }
    const msg = body?.detail || body?.message ||
      Object.entries(body).map(([f, e]) => `${f}: ${Array.isArray(e) ? e.join(', ') : e}`).join(' | ') ||
      `Request failed (${res.status})`;
    const err = new Error(msg);
    err._status = res.status;
    err.data = body;
    throw err;
  }

  if (res.status === 204) return null;
  return res.json();
}


// ═════════════════════════════════════════════════════════════════════════════
//  AXIOS INSTANCE  (used by log.js / vehiclemanagement.js services)
// ═════════════════════════════════════════════════════════════════════════════

export const axiosApi = axios.create({
  headers: { 'Content-Type': 'application/json' },
});

axiosApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token') || localStorage.getItem('access');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

axiosApi.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('refresh_token') || localStorage.getItem('refresh');
      if (refresh) {
        try {
          const { data } = await axios.post(ENDPOINTS.tokenRefresh, { refresh });
          localStorage.setItem('access_token', data.access);
          localStorage.setItem('access', data.access);
          original.headers.Authorization = `Bearer ${data.access}`;
          return axiosApi(original);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('access');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('refresh');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);


// ═════════════════════════════════════════════════════════════════════════════

// =============================================================================
//  ROLE / ACCESS CONSTANTS  (from roleAccessHelpers.js)
// =============================================================================

export const ROLES = ['Admin', 'Manager', 'Operator', 'Viewer', 'Support', 'Auditor'];

export const MENU_GROUPS = [
  {
    group: 'Dashboard',
    items: [
      { key: 'dashboard', label: 'Dashboard' },
    ],
  },
  {
    group: 'Collection',
    items: [
      { key: 'col_reports', label: 'Payment Reports' },
    ],
  },
  {
    group: 'User Management',
    items: [
      { key: 'um_users', label: 'All Users' },
      { key: 'um_roles', label: 'Roles & Access' },
    ],
  },
];


//  AUTH SERVICE
// ═════════════════════════════════════════════════════════════════════════════

export const authService = {

  login: async (username, password) => {
    const { data } = await axiosApi.post(ENDPOINTS.login, { username, password });
    localStorage.setItem('access_token',  data.access);
    localStorage.setItem('access',        data.access);
    localStorage.setItem('refresh_token', data.refresh);
    localStorage.setItem('refresh',       data.refresh);
    localStorage.setItem('user',          JSON.stringify(data.user));
    return data;
  },

  logout: async () => {
    const refresh = localStorage.getItem('refresh_token') || localStorage.getItem('refresh');
    try {
      if (refresh) await axiosApi.post(ENDPOINTS.logout, { refresh });
    } catch { /* silently fail */ }
    finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('access');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('refresh');
      localStorage.removeItem('user');
      localStorage.removeItem('menu_permissions');
    }
  },

  refreshToken: async () => {
    const refresh = localStorage.getItem('refresh_token') || localStorage.getItem('refresh');
    if (!refresh) throw new Error('No refresh token found.');
    const { data } = await axios.post(ENDPOINTS.tokenRefresh, { refresh });
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('access', data.access);
    return data.access;
  },

  getMe:    async ()         => { const { data } = await axiosApi.get(ENDPOINTS.me); return data; },
  updateMe: async (payload)  => {
    const { data } = await axiosApi.patch(ENDPOINTS.me, payload);
    localStorage.setItem('user', JSON.stringify(data));
    return data;
  },
  changePassword: async (oldPassword, newPassword) => {
    const { data } = await axiosApi.post(ENDPOINTS.changePassword, {
      old_password: oldPassword, new_password: newPassword,
    });
    return data;
  },
  register: async (payload) => { const { data } = await axiosApi.post(ENDPOINTS.register, payload); return data; },

  isAuthenticated: () => !!(localStorage.getItem('access_token') || localStorage.getItem('access')),
  getCurrentUser:  () => { const u = localStorage.getItem('user'); return u ? JSON.parse(u) : null; },
  getAccessToken:  () => localStorage.getItem('access_token') || localStorage.getItem('access'),
};


// ═════════════════════════════════════════════════════════════════════════════
//  USER SERVICE
// ═════════════════════════════════════════════════════════════════════════════

// Auth header helper for service-style (no-Content-Type for multipart)
const _ah = (isMultipart = false) => {
  const h = { Authorization: `Bearer ${localStorage.getItem('access_token') || localStorage.getItem('access') || ''}` };
  if (!isMultipart) h['Content-Type'] = 'application/json';
  return h;
};

const _buildBody = (payload) => {
  const { photo, ...rest } = payload;
  if (photo instanceof File) {
    const fd = new FormData();
    Object.entries(rest).forEach(([k, v]) => {
      if (v !== undefined && v !== null) fd.append(k, String(v));
    });
    fd.append('photo', photo);
    return fd;
  }
  return JSON.stringify(rest);
};

export const saveUserInfo    = (u) => localStorage.setItem('user', JSON.stringify(u));
export const getCurrentUser  = ()  => { const u = localStorage.getItem('user'); try { return u ? JSON.parse(u) : null; } catch { return null; } };
export const logout          = ()  => {
  ['access_token', 'refresh_token', 'user'].forEach(k => localStorage.removeItem(k));
  window.location.href = '/login';
};

export const getUsers = async (filters = {}) => {
  const params = new URLSearchParams();
  ['role','status','branch','search'].forEach(k => { if (filters[k]) params.append(k, filters[k]); });
  const query = params.toString() ? `?${params}` : '';
  const doFetch = () => fetch(`${ENDPOINTS.users}${query}`, { method: 'GET', headers: _ah() });
  const data = await handleResponse(await doFetch(), doFetch);
  if (Array.isArray(data)) return { count: data.length, results: data };
  return data;
};

export const createUser = async (payload) => {
  const body = _buildBody(payload);
  const doFetch = () => fetch(ENDPOINTS.users, { method: 'POST', headers: _ah(body instanceof FormData), body });
  return handleResponse(await doFetch(), doFetch);
};

export const getUserById = async (id) => {
  const doFetch = () => fetch(ENDPOINTS.user(id), { method: 'GET', headers: _ah() });
  return handleResponse(await doFetch(), doFetch);
};

export const updateUser = async (id, payload) => {
  const body = _buildBody(payload);
  const doFetch = () => fetch(ENDPOINTS.user(id), { method: 'PUT', headers: _ah(body instanceof FormData), body });
  return handleResponse(await doFetch(), doFetch);
};

export const patchUser = async (id, payload) => {
  const body = _buildBody(payload);
  const doFetch = () => fetch(ENDPOINTS.user(id), { method: 'PATCH', headers: _ah(body instanceof FormData), body });
  return handleResponse(await doFetch(), doFetch);
};

export const deleteUser = async (id) => {
  const doFetch = () => fetch(ENDPOINTS.user(id), { method: 'DELETE', headers: _ah() });
  return handleResponse(await doFetch(), doFetch);
};

export const toggleUserStatus = async (id) => {
  const doFetch = () => fetch(ENDPOINTS.userToggleStatus(id), { method: 'PATCH', headers: _ah() });
  return handleResponse(await doFetch(), doFetch);
};


// ═════════════════════════════════════════════════════════════════════════════
//  BRANCH SERVICE
// ═════════════════════════════════════════════════════════════════════════════

export const getBranches = async () => {
  // Step 1: Fetch external departments (FlashERP) — { department_id, department }[]
  let deptList = [];
  try {
    const res  = await _authFetch(ENDPOINTS.departments, { method: 'GET' });
    const json = await _handlePaymentResponse(res);
    const raw  = Array.isArray(json) ? json : (json?.data ?? json?.results ?? []);
    deptList = raw.map(d => ({ deptId: d.department_id, name: d.department }));
  } catch (e) {
    console.warn('getBranches: departments fetch failed', e);
  }

  // Step 2: Fetch local branches (integer FK IDs) — { id, name }[]
  let localBranches = [];
  try {
    const doFetch = () => fetch(ENDPOINTS.branches, { method: 'GET', headers: _ah() });
    const data = await handleResponse(await doFetch(), doFetch);
    localBranches = Array.isArray(data) ? data : (data?.results ?? []);
  } catch (e) {
    console.warn('getBranches: local branches fetch failed', e);
  }

  // Step 3: Build a name→id map from local branches (case-insensitive)
  const nameToId = {};
  localBranches.forEach(b => { nameToId[b.name.trim().toUpperCase()] = b.id; });

  // Step 4: For each department, find or create a matching local branch
  const result = [];
  for (const dept of deptList) {
    const key = dept.name.trim().toUpperCase();
    if (nameToId[key] != null) {
      result.push({ id: nameToId[key], name: dept.name, deptId: dept.deptId });
    } else {
      // Auto-create the local branch so it gets an integer FK id
      try {
        const doFetch = () => fetch(ENDPOINTS.branches, {
          method: 'POST', headers: _ah(), body: JSON.stringify({ name: dept.name }),
        });
        const created = await handleResponse(await doFetch(), doFetch);
        if (created?.id) {
          nameToId[key] = created.id;
          result.push({ id: created.id, name: dept.name, deptId: dept.deptId });
        }
      } catch (e) {
        console.warn(`getBranches: could not create branch "${dept.name}"`, e);
        // Fallback: include without integer id so it still shows in dropdown
        result.push({ id: dept.deptId, name: dept.name, deptId: dept.deptId });
      }
    }
  }

  // If departments API returned nothing, fall back to local branches only
  if (result.length === 0 && localBranches.length > 0) {
    return localBranches.map(b => ({ id: b.id, name: b.name, deptId: null }));
  }

  return result;
};


export const createBranch = async (payload) => {
  const doFetch = () => fetch(ENDPOINTS.branches, {
    method: 'POST', headers: _ah(), body: JSON.stringify(payload),
  });
  return handleResponse(await doFetch(), doFetch);
};


// ═════════════════════════════════════════════════════════════════════════════
//  USER PERMISSIONS SERVICE
// ═════════════════════════════════════════════════════════════════════════════

export async function getUserPermissions(userId) {
  const doFetch = () => fetch(ENDPOINTS.userPermissions(userId), { headers: authHeaders({ 'Content-Type': 'application/json' }) });
  const res = await doFetch();
  return handleResponse(res, doFetch);
}

export async function saveUserPermissions(userId, perms) {
  const payload = {
    dashboard:   !!perms.dashboard,
    col_reports: !!perms.col_reports,
    vm_trips:    !!perms.vm_trips,
    vm_service:  !!perms.vm_service,
    um_users:    !!perms.um_users,
    um_roles:    !!perms.um_roles,
    mm_vehicle:  !!perms.mm_vehicle,
  };
  const doFetch = () => fetch(ENDPOINTS.userPermissions(userId), {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  const res = await doFetch();
  return handleResponse(res, doFetch);
}

export async function bulkSaveUserPermissions(permissionsList) {
  const payload = {
    permissions: permissionsList.map(item => ({
      user_id:     item.user_id,
      dashboard:   !!item.dashboard,
      col_reports: !!item.col_reports,
      vm_trips:    !!item.vm_trips,
      vm_service:  !!item.vm_service,
      um_users:    !!item.um_users,
      um_roles:    !!item.um_roles,
      mm_vehicle:  !!item.mm_vehicle,
    })),
  };
  const doFetch = () => fetch(ENDPOINTS.userPermsBulk, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  const res = await doFetch();
  return handleResponse(res, doFetch);
}


// ═════════════════════════════════════════════════════════════════════════════
//  VEHICLE MASTER SERVICE
// ═════════════════════════════════════════════════════════════════════════════

export const resolveMediaUrl = (url) => {
  if (!url) return null;
  try {
    const backendOrigin = new URL(BASE_URL).origin;
    const parsed = new URL(url);
    if (parsed.origin === backendOrigin || parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost') {
      parsed.protocol = new URL(BASE_URL).protocol;
      parsed.hostname = new URL(BASE_URL).hostname;
      parsed.port     = new URL(BASE_URL).port;
      return parsed.toString();
    }
    return url;
  } catch { return url; }
};

const _toSnake = (data) => {
  const map = {
    vehicleName: 'vehicle_name', companyBrand: 'company_brand',
    registrationNumber: 'registration_number', vehicleType: 'vehicle_type',
    fuelType: 'fuel_type', vehiclePhoto: 'vehicle_photo', ownerName: 'owner_name',
    insuranceNo: 'insurance_no', insuranceExpiredDate: 'insurance_expired_date',
    pollutionExpiredDate: 'pollution_expired_date', lastServiceDate: 'last_service_date',
    nextServiceDate: 'next_service_date', currentOdometer: 'current_odometer',
    chassisNumber: 'chassis_number', engineNumber: 'engine_number', status: 'status',
  };
  const result = {};
  for (const [k, v] of Object.entries(data)) result[map[k] || k] = v;
  return result;
};

const _flattenVehicle = ({ basicInfo, ownershipInsurance, maintenance, technical, additionalDetails }) => ({
  vehicleName: basicInfo.vehicleName, companyBrand: basicInfo.companyBrand,
  registrationNumber: basicInfo.registrationNumber, vehicleType: basicInfo.vehicleType,
  ownership: basicInfo.ownership, fuelType: basicInfo.fuelType, vehiclePhoto: basicInfo.vehiclePhoto,
  ownerName: ownershipInsurance.ownerName, insuranceNo: ownershipInsurance.insuranceNo,
  insuranceExpiredDate: ownershipInsurance.insuranceExpiredDate,
  pollutionExpiredDate: ownershipInsurance.pollutionExpiredDate,
  lastServiceDate: maintenance.lastServiceDate, nextServiceDate: maintenance.nextServiceDate,
  currentOdometer: maintenance.currentOdometer,
  chassisNumber: technical.chassisNumber, engineNumber: technical.engineNumber,
  note: additionalDetails.note, status: additionalDetails.status,
});

const _buildVehicleFD = (flat) => {
  const snake = _toSnake(flat);
  const fd = new FormData();
  for (const [k, v] of Object.entries(snake)) {
    if (k === 'vehicle_photo') { if (v instanceof File) fd.append('vehicle_photo', v); }
    else if (v !== null && v !== undefined && v !== '') fd.append(k, v);
  }
  return fd;
};

export const getVehicles = async (params = {}) => {
  const q = new URLSearchParams();
  if (params.search)                                              q.set('search',          params.search);
  if (params.status       && params.status !== 'All')            q.set('status',          params.status);
  if (params.vehicle_type && params.vehicle_type !== 'All Types')q.set('vehicle_type',    params.vehicle_type);
  if (params.ownership)                                          q.set('ownership',       params.ownership);
  if (params.fuel_type)                                          q.set('fuel_type',       params.fuel_type);
  if (params.ordering)                                           q.set('ordering',        params.ordering);
  if (params.page)                                               q.set('page',            params.page);
  if (params.exclude_ongoing)                                    q.set('exclude_ongoing', params.exclude_ongoing);
  const url = `${ENDPOINTS.vehicles}${q.toString() ? `?${q}` : ''}`;
  const doFetch = () => fetch(url, { method: 'GET', headers: _ah() });
  return handleResponse(await doFetch(), doFetch);
};

export const getVehicleById = async (id) => {
  const doFetch = () => fetch(ENDPOINTS.vehicle(id), { method: 'GET', headers: _ah() });
  return handleResponse(await doFetch(), doFetch);
};

export const createVehicle = async (formState) => {
  const fd = _buildVehicleFD(_flattenVehicle(formState));
  const doFetch = () => fetch(ENDPOINTS.vehicles, { method: 'POST', headers: _ah(true), body: fd });
  return handleResponse(await doFetch(), doFetch);
};

export const updateVehicle = async (id, formState) => {
  const fd = _buildVehicleFD(_flattenVehicle(formState));
  const doFetch = () => fetch(ENDPOINTS.vehicle(id), { method: 'PATCH', headers: _ah(true), body: fd });
  return handleResponse(await doFetch(), doFetch);
};

export const deleteVehicle = async (id) => {
  const doFetch = () => fetch(ENDPOINTS.vehicle(id), { method: 'DELETE', headers: _ah() });
  return handleResponse(await doFetch(), doFetch);
};

export const updateOdometer = async (id, newOdometer) => {
  const doFetch = () => fetch(ENDPOINTS.vehicleOdometer(id), {
    method: 'POST', headers: _ah(), body: JSON.stringify({ current_odometer: newOdometer }),
  });
  return handleResponse(await doFetch(), doFetch);
};

export const updateVehicleStatus = async (id, newStatus) => {
  const doFetch = () => fetch(ENDPOINTS.vehicleStatus(id), {
    method: 'POST', headers: _ah(), body: JSON.stringify({ status: newStatus }),
  });
  return handleResponse(await doFetch(), doFetch);
};

export const getExpiringInsurance = async () => {
  const doFetch = () => fetch(ENDPOINTS.vehicleInsurance, { method: 'GET', headers: _ah() });
  return handleResponse(await doFetch(), doFetch);
};

export const getExpiringPollution = async () => {
  const doFetch = () => fetch(ENDPOINTS.vehiclePollution, { method: 'GET', headers: _ah() });
  return handleResponse(await doFetch(), doFetch);
};

export const getServiceDue = async () => {
  const doFetch = () => fetch(ENDPOINTS.vehicleService, { method: 'GET', headers: _ah() });
  return handleResponse(await doFetch(), doFetch);
};

export const getVehicleTripHistory = async (id) => {
  const doFetch = () => fetch(ENDPOINTS.vehicleTrips(id), { method: 'GET', headers: _ah() });
  return handleResponse(await doFetch(), doFetch);
};


// ═════════════════════════════════════════════════════════════════════════════
//  CHALLAN SERVICE
// ═════════════════════════════════════════════════════════════════════════════

const _buildChallanFD = (payload) => {
  const fd = new FormData();
  const map = {
    vehicle: payload.vehicle, date: payload.date, challan_no: payload.challanNo,
    challan_date: payload.challanDate, offence_type: payload.offenceType,
    location: payload.location, fine_amount: payload.fineAmount,
    payment_status: payload.paymentStatus, remark: payload.remark ?? '',
  };
  Object.entries(map).forEach(([k, v]) => { if (v !== undefined && v !== null) fd.append(k, v); });
  if (payload.challanDoc     instanceof File) fd.append('challan_doc',      payload.challanDoc);
  if (payload.paymentReceipt instanceof File) fd.append('payment_receipt',  payload.paymentReceipt);
  return fd;
};

export const getChallans = async (params = {}) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') q.append(k, v); });
  const url = `${ENDPOINTS.challans}${q.toString() ? `?${q}` : ''}`;
  const doFetch = () => fetch(url, { method: 'GET', headers: authHeaders() });
  return handleResponse(await doFetch(), doFetch);
};

export const getChallan = async (id) => {
  const doFetch = () => fetch(ENDPOINTS.challan(id), { method: 'GET', headers: authHeaders() });
  return handleResponse(await doFetch(), doFetch);
};

export const getChallanSummary = async (params = {}) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') q.append(k, v); });
  const url = `${ENDPOINTS.challanSummary}${q.toString() ? `?${q}` : ''}`;
  const doFetch = () => fetch(url, { method: 'GET', headers: authHeaders() });
  return handleResponse(await doFetch(), doFetch);
};

export const createChallan = async (payload) => {
  const fd = _buildChallanFD(payload);
  const doFetch = () => fetch(ENDPOINTS.challans, { method: 'POST', headers: authHeaders(), body: fd });
  return handleResponse(await doFetch(), doFetch);
};

export const updateChallan = async (id, payload) => {
  const fd = _buildChallanFD(payload);
  const doFetch = () => fetch(ENDPOINTS.challan(id), { method: 'PATCH', headers: authHeaders(), body: fd });
  return handleResponse(await doFetch(), doFetch);
};

export const deleteChallan = async (id) => {
  const doFetch = () => fetch(ENDPOINTS.challan(id), { method: 'DELETE', headers: authHeaders() });
  return handleResponse(await doFetch(), doFetch);
};


// ═════════════════════════════════════════════════════════════════════════════
//  CLAIMS SERVICE
// ═════════════════════════════════════════════════════════════════════════════

function _mapClaim(c) {
  const receiptUrl = c.receipt
    ? c.receipt.startsWith('http') ? c.receipt : ENDPOINTS.mediaUrl(c.receipt)
    : null;
  return {
    id: c.id, date: c.created_at || new Date().toISOString(),
    claimedBy: c.claimed_by_name || 'Unknown', clientName: c.client_name || '',
    department: c.department || '',          // raw department_id stored in DB
    department_name: c.department_name || c.department || '',  // human-readable name
    expense: c.expense_type_display || c.expense_type || '',
    amount: parseFloat(c.amount) || 0,
    receipt: !!(c.receipt || c.has_receipt), receiptUrl,
    status: c.status === 'Approved' ? 'Accepted' : (c.status || 'Pending'), expense_type: c.expense_type || '',
    purpose: c.purpose || '', notes: c.notes || '',
    vehicleNumber: c.vehicle_number || '',
    vehicleName:   c.vehicle_name   || '',
    _raw: c,
  };
}

function _buildClaimFD(form, isDraft = false) {
  const fd = new FormData();
  fd.append('expense_type',   form.expenseType);
  fd.append('department',     form.department);
  fd.append('client_name',    form.clientName    || '');
  fd.append('purpose',        form.purpose       || '');
  fd.append('amount',         form.amount        || '0');
  fd.append('notes',          form.notes         || '');
  fd.append('vehicle_number', form.vehicleNumber || '');
  fd.append('vehicle_name',   form.vehicleName   || '');
  if (isDraft) fd.append('status', 'Draft');
  if (form.receipt instanceof File) fd.append('receipt', form.receipt);
  return fd;
}

function _authHeader() {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Parse a DRF error body into a human-readable string.
 *  Handles both { detail: "..." } and field-level { field: ["msg", ...] } responses. */
function _claimError(body) {
  if (!body) return 'Request failed';
  if (body.detail) return body.detail;
  const fieldErrors = Object.entries(body)
    .map(([field, errs]) => {
      const msg = Array.isArray(errs) ? errs.map(e => (e?.string || e)).join(', ') : String(errs);
      return `${field}: ${msg}`;
    })
    .join(' | ');
  return fieldErrors || 'Request failed';
}

export async function fetchClaims(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${ENDPOINTS.claims}${qs ? `?${qs}` : ''}`, {
    headers: _authHeader(),
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  const data = await res.json();
  const results = data?.results ?? data;
  return Array.isArray(results) ? results.map(_mapClaim) : [];
}

export async function fetchClaim(id) {
  const res = await fetch(ENDPOINTS.claim(id), { headers: _authHeader() });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return _mapClaim(await res.json());
}

export async function createClaim(form) {
  const res = await fetch(ENDPOINTS.claims, {
    method: 'POST', headers: _authHeader(), body: _buildClaimFD(form, false),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(_claimError(body));
  }
  return _mapClaim(await res.json());
}

export async function saveDraftClaim(form) {
  const res = await fetch(ENDPOINTS.claimDraft, {
    method: 'POST', headers: _authHeader(), body: _buildClaimFD(form, true),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(_claimError(body));
  }
  return _mapClaim(await res.json());
}

export async function updateClaimStatus(id, newStatus) {
  // UI uses "Accepted"; backend expects "Approved"
  const apiStatus = newStatus === 'Accepted' ? 'Approved' : newStatus;
  const res = await fetch(ENDPOINTS.claimStatus(id), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ..._authHeader() },
    body: JSON.stringify({ status: apiStatus }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(_claimError(body));
  }
  return res.json();
}

export async function updateClaim(id, form) {
  const res = await fetch(ENDPOINTS.claim(id), {
    method: 'PUT', headers: _authHeader(), body: _buildClaimFD(form, false),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(_claimError(body));
  }
  return _mapClaim(await res.json());
}

export async function deleteClaim(id) {
  const res = await fetch(ENDPOINTS.claim(id), { method: 'DELETE', headers: _authHeader() });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(_claimError(body));
  }
  return null;
}


// ═════════════════════════════════════════════════════════════════════════════
//  PAYMENT SERVICE
// ═════════════════════════════════════════════════════════════════════════════

async function _authFetch(url, options = {}) {
  const token = localStorage.getItem('access_token');
  const baseHeaders = { Accept: 'application/json' };
  if (token) baseHeaders['Authorization'] = `Bearer ${token.replace(/^Bearer\s+/i, '')}`;

  let res = await fetch(url, { ...options, headers: { ...baseHeaders, ...options.headers } });

  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await fetch(url, {
        ...options,
        headers: { ...options.headers, Authorization: `Bearer ${newToken}`, Accept: 'application/json' },
      });
    } else {
      const err = new Error('Session expired. Please log in again.');
      err.name = 'AuthError';
      throw err;
    }
  }
  return res;
}

async function _handlePaymentResponse(res) {
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : null;
  if (!res.ok) {
    const msg = data?.detail ||
      Object.entries(data || {}).map(([f, e]) => `${f}: ${Array.isArray(e) ? e.join(', ') : e}`).join(' | ') ||
      `Request failed with status ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function fetchPayments(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') q.append(k, v); });
  const url = `${ENDPOINTS.payments}${q.toString() ? `?${q}` : ''}`;
  return _handlePaymentResponse(await _authFetch(url, { method: 'GET' }));
}

export async function fetchPaymentById(id) {
  return _handlePaymentResponse(await _authFetch(ENDPOINTS.payment(id), { method: 'GET' }));
}

export async function createPayment(formData) {
  const payload = new FormData();
  payload.append('client_name',     formData.clientName);
  payload.append('place',           formData.place           || '');
  payload.append('phone_number',    formData.phoneNumber      || '');
  payload.append('department',      formData.department       || '');
  payload.append('branch',          formData.branch);
  payload.append('collection_type', formData.collectionType);
  payload.append('amount',          formData.amount);
  payload.append('paid_for',        formData.paidFor);
  payload.append('notes',           formData.notes            || '');
  if (formData.paymentProof) payload.append('payment_proof', formData.paymentProof);
  return _handlePaymentResponse(await _authFetch(ENDPOINTS.payments, { method: 'POST', body: payload }));
}

export async function updatePayment(id, formData) {
  const payload = new FormData();
  payload.append('client_name',     formData.clientName);
  payload.append('place',           formData.place           || '');
  payload.append('phone_number',    formData.phoneNumber      || '');
  payload.append('department',      formData.department       || '');
  payload.append('branch',          formData.branch);
  payload.append('collection_type', formData.collectionType);
  payload.append('amount',          formData.amount);
  payload.append('paid_for',        formData.paidFor);
  payload.append('notes',           formData.notes            || '');
  if (formData.paymentProof instanceof File) payload.append('payment_proof', formData.paymentProof);
  if (formData.cashReceived !== undefined && formData.cashReceived !== null)
    payload.append('cash_received', formData.cashReceived);
  return _handlePaymentResponse(await _authFetch(ENDPOINTS.payment(id), { method: 'PUT', body: payload }));
}

export async function updatePaymentStatus(id, status) {
  return _handlePaymentResponse(await _authFetch(ENDPOINTS.paymentStatus(id), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  }));
}

export async function deletePayment(id) {
  return _handlePaymentResponse(await _authFetch(ENDPOINTS.payment(id), { method: 'DELETE' }));
}

export async function fetchPaymentSummary() {
  return _handlePaymentResponse(await _authFetch(ENDPOINTS.paymentSummary, { method: 'GET' }));
}

/**
 * Fetch debtors from the FlashERP proxy endpoint.
 * Raw shape: { code, name, phone, phone2, place, address, area, city, ... }
 * NOTE: phone2 is the real contact number — phone is often blank.
 */
export async function fetchDebtors(search = '') {
  const q = new URLSearchParams();
  if (search && search.trim().length >= 2) q.set('search', search.trim());
  const url = `${ENDPOINTS.debtors}${q.toString() ? `?${q}` : ''}`;
  const res  = await _authFetch(url, { method: 'GET' });
  const data = await _handlePaymentResponse(res);
  const raw  = Array.isArray(data) ? data : (data?.results ?? []);
  return raw.map(d => ({
    code:    d.code    || '',
    name:    d.name    || '',
    phone:   d.phone2  || d.phone || '',   // phone2 is the real number
    place:   d.place   || d.city  || d.area || '',
    address: d.address || '',
  }));
}

export async function fetchDepartments() {
  // Fetch from local /branches/ endpoint → { id, name, created_at }[]
  // Normalised to { department_id, department } for the branch dropdown in user_list.jsx
  const doFetch = () => fetch(ENDPOINTS.branches, { method: 'GET', headers: _ah() });
  const data = await handleResponse(await doFetch(), doFetch);
  const raw = Array.isArray(data) ? data : (data?.results ?? data?.branches ?? []);
  return raw.map(d => ({
    department_id: d.department_id ?? d.id,
    department:    d.department    ?? d.name,
  }));
}

export function normalizePayment(p) {
  return {
    id:              p.id,
    clientName:      p.client_name,
    place:           p.place            || '',
    phoneNumber:     p.phone_number     || '',
    department:      p.department       || '',
    branch:          p.branch,
    collectionType:  p.collection_type,
    amount:          parseFloat(p.amount),
    paidFor:         p.paid_for,
    notes:           p.notes,
    paymentProof:    p.payment_proof     || null,
    paymentProofUrl: p.payment_proof_url || null,
    status:          p.status,
    cashReceived:    p.cash_received      ?? null,
    cashAmount:      p.cash_amount != null ? parseFloat(p.cash_amount) : null,
    date:            p.date,
    createdByName:   p.created_by_name   || null,
    created_by_name: p.created_by_name   || null,
    created_by:      p.created_by        ?? null,
  };
}

export function getProofUrl(payment) {
  if (payment.paymentProofUrl) return payment.paymentProofUrl;
  if (payment.paymentProof)    return `${BASE_URL.replace('/api', '')}/media/${payment.paymentProof}`;
  return null;
}


// ═════════════════════════════════════════════════════════════════════════════
//  TRIP SERVICE
// ═════════════════════════════════════════════════════════════════════════════

function _normaliseTrip(raw) {
  return {
    id:                  raw.id,
    // camelCase (used by Travel_Trip.jsx)
    vehicle:             raw.vehicle_name        ?? '',
    vehicleReg:          raw.registration_number ?? '',
    traveledBy:          raw.traveled_by         ?? '',
    purpose:             raw.purpose_of_trip     ?? '',
    date:                raw.date                ?? '',
    startTime:           raw.start_time          ?? '',
    endDate:             raw.end_date            ?? null,
    endTime:             raw.end_time            ?? null,
    odoStart:            raw.odometer_start != null ? parseFloat(raw.odometer_start) : null,
    odoEnd:              raw.odometer_end   != null ? parseFloat(raw.odometer_end)   : null,
    distance:            parseFloat(raw.distance_covered) || 0,
    fuel:                parseFloat(raw.fuel_cost)        || 0,
    cost:                parseFloat(raw.fuel_cost)        || 0,
    startImg:            raw.start_img_url  ?? null,
    endImg:              raw.end_img_url    ?? null,
    status:              raw.status         ?? 'ongoing',
    maintenanceCost:     parseFloat(raw.maintenance_cost) || 0,
    services:            raw.services_list  ?? [],
    // snake_case mirrors (for compatibility)
    vehicle_name:        raw.vehicle_name        ?? '',
    registration_number: raw.registration_number ?? '',
    traveled_by:         raw.traveled_by         ?? '',
    purpose_of_trip:     raw.purpose_of_trip     ?? '',
    start_time:          raw.start_time          ?? '',
    end_date:            raw.end_date            ?? null,
    end_time:            raw.end_time            ?? null,
    odometer_start:      raw.odometer_start != null ? parseFloat(raw.odometer_start) : null,
    odometer_end:        raw.odometer_end   != null ? parseFloat(raw.odometer_end)   : null,
    distance_covered:    parseFloat(raw.distance_covered) || 0,
    fuel_cost:           parseFloat(raw.fuel_cost)        || 0,
    maintenance_cost:    parseFloat(raw.maintenance_cost) || 0,
    services_list:       raw.services_list  ?? [],
    start_img_url:       raw.start_img_url  ?? null,
    end_img_url:         raw.end_img_url    ?? null,
  };
}

function _handleTripError(error, fallback) {
  if (error.response) {
    const d = error.response.data;
    if (typeof d === 'string') return new Error(d);
    if (d?.detail) return new Error(d.detail);
    if (typeof d === 'object') {
      const msg = Object.entries(d)
        .map(([f, m]) => `${f}: ${Array.isArray(m) ? m.join(', ') : String(m)}`)
        .join(' | ');
      return new Error(msg || fallback);
    }
  }
  if (error.request) return new Error('No response from server. Check your connection.');
  return new Error(error.message || fallback);
}

export async function fetchTrips(params = {}) {
  try {
    const res = await axiosApi.get(ENDPOINTS.trips, { params });
    const raw = Array.isArray(res.data) ? res.data : (res.data.results ?? []);
    return raw.map(_normaliseTrip);
  } catch (e) { throw _handleTripError(e, 'Failed to fetch trips'); }
}

export async function fetchTripById(id) {
  try {
    const res = await axiosApi.get(ENDPOINTS.trip(id));
    return _normaliseTrip(res.data);
  } catch (e) { throw _handleTripError(e, `Failed to fetch trip #${id}`); }
}

export async function fetchOngoingTrips() {
  try {
    const res = await axiosApi.get(ENDPOINTS.tripsOngoing);
    const raw = Array.isArray(res.data) ? res.data : (res.data.results ?? []);
    return raw.map(_normaliseTrip);
  } catch (e) { throw _handleTripError(e, 'Failed to fetch ongoing trips'); }
}

export async function startTrip(tripData) {
  try {
    const fd = new FormData();
    fd.append('vehicle_name',        tripData.vehicle_name        ?? '');
    fd.append('registration_number', tripData.registration_number ?? '');
    fd.append('date',                tripData.date);
    fd.append('time',                tripData.time);
    fd.append('purpose_of_trip',     tripData.purpose_of_trip);
    if (tripData.traveled_by   != null && tripData.traveled_by !== '')   fd.append('traveled_by',    tripData.traveled_by);
    if (tripData.odometer_start != null)                                  fd.append('odometer_start', tripData.odometer_start);
    if (tripData.maintenance_cost != null)                                fd.append('maintenance_cost', tripData.maintenance_cost);
    (Array.isArray(tripData.services) ? tripData.services : []).forEach(s => fd.append('services', s));
    if (tripData.odometer_image instanceof File)                          fd.append('odometer_image', tripData.odometer_image);
    const res = await axiosApi.post(ENDPOINTS.trips, fd);
    return _normaliseTrip(res.data);
  } catch (e) { throw _handleTripError(e, 'Failed to start trip'); }
}

export async function endTrip(id, endData) {
  try {
    const fd = new FormData();
    fd.append('end_date',     endData.end_date);
    fd.append('end_time',     endData.end_time);
    fd.append('odometer_end', endData.odometer_end);
    if (endData.fuel_cost != null)                   fd.append('fuel_cost',       endData.fuel_cost);
    if (endData.odometer_image instanceof File)      fd.append('odometer_image',  endData.odometer_image);
    const res = await axiosApi.patch(ENDPOINTS.tripEnd(id), fd);
    return _normaliseTrip(res.data);
  } catch (e) { throw _handleTripError(e, `Failed to end trip #${id}`); }
}

export async function updateTrip(id, fields) {
  try {
    const res = await axiosApi.patch(ENDPOINTS.trip(id), fields);
    return _normaliseTrip(res.data);
  } catch (e) { throw _handleTripError(e, `Failed to update trip #${id}`); }
}

export async function deleteTrip(id) {
  try {
    await axiosApi.delete(ENDPOINTS.trip(id));
  } catch (e) { throw _handleTripError(e, `Failed to delete trip #${id}`); }
}


// ═════════════════════════════════════════════════════════════════════════════
//  IMAGE CAPTURE SERVICE
// ═════════════════════════════════════════════════════════════════════════════

// ── Helper for image capture auth headers ──
const _icAuthHeader = (isMultipart = false) => {
  const token = localStorage.getItem('access_token');
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isMultipart) headers['Content-Type'] = 'application/json';
  return headers;
};

// ── Customer APIs ──
export async function getImageCaptureCustomers(filters = {}) {
  const params = new URLSearchParams();
  if (filters.branch) params.append('branch', filters.branch);
  if (filters.search) params.append('search', filters.search);
  const query = params.toString() ? `?${params}` : '';
  
  const doFetch = () => fetch(`${ENDPOINTS.imageCaptureCustomers}${query}`, {
    method: 'GET',
    headers: _icAuthHeader(),
  });
  return handleResponse(await doFetch(), doFetch);
}

export async function createImageCaptureCustomer(data) {
  const doFetch = () => fetch(ENDPOINTS.imageCaptureCustomers, {
    method: 'POST',
    headers: _icAuthHeader(),
    body: JSON.stringify(data),
  });
  return handleResponse(await doFetch(), doFetch);
}

// ── Capture Link APIs ──
export async function generateCaptureLink(data) {
  const body = {
    customer_name: data.customerName || null,
    phone: data.phone,
    expires_in_hours: data.expiresInHours || 24,
  };
  if (data.customerId) body.customer_id = data.customerId;
  const doFetch = () => fetch(ENDPOINTS.imageCaptureGenerateLink, {
    method: 'POST',
    headers: _icAuthHeader(),
    body: JSON.stringify(body),
  });
  return handleResponse(await doFetch(), doFetch);
}

export async function getCaptureLinkByUuid(uuid) {
  const doFetch = () => fetch(ENDPOINTS.imageCaptureLinkDetail(uuid), {
    method: 'GET',
    headers: _icAuthHeader(),
  });
  return handleResponse(await doFetch(), doFetch);
}

export async function getAllCaptureLinks(status = null) {
  const query = status ? `?status=${status}` : '';
  const doFetch = () => fetch(`${ENDPOINTS.imageCaptureLinks}${query}`, {
    method: 'GET',
    headers: _icAuthHeader(),
  });
  return handleResponse(await doFetch(), doFetch);
}

// ── OTP APIs ──
export async function sendOtp(phone, uuid = null) {
  const doFetch = () => fetch(ENDPOINTS.imageCaptureSendOtp, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, uuid }),
  });
  return handleResponse(await doFetch(), doFetch);
}

export async function verifyOtp(phone, otpCode, uuid = null) {
  const doFetch = () => fetch(ENDPOINTS.imageCaptureVerifyOtp, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp_code: otpCode, uuid }),
  });
  return handleResponse(await doFetch(), doFetch);
}

export async function resendOtp(phone, uuid = null) {
  const doFetch = () => fetch(ENDPOINTS.imageCaptureResendOtp, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, uuid }),
  });
  return handleResponse(await doFetch(), doFetch);
}

// ── Image Upload & Capture APIs ──
export async function uploadCaptureImage(formData) {
  const token = localStorage.getItem('access_token');
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // Don't set Content-Type for FormData - browser will set with boundary
  
  const response = await fetch(ENDPOINTS.imageCaptureUpload, {
    method: 'POST',
    headers,
    body: formData,
  });
  
  if (!response.ok) {
    let body = {};
    try { body = await response.json(); } catch {}
    const msg = body?.detail || body?.message || `Upload failed (${response.status})`;
    const err = new Error(msg);
    err._status = response.status;
    err.data = body;
    throw err;
  }
  
  return response.json();
}

export async function getAllCaptures(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.manualStatus) params.append('manual_status', filters.manualStatus);
  if (filters.search) params.append('search', filters.search);
  const query = params.toString() ? `?${params}` : '';
  
  const doFetch = () => fetch(`${ENDPOINTS.imageCaptureList}${query}`, {
    method: 'GET',
    headers: _icAuthHeader(),
  });
  return handleResponse(await doFetch(), doFetch);
}

export async function getCaptureById(id) {
  const doFetch = () => fetch(ENDPOINTS.imageCaptureDetail(id), {
    method: 'GET',
    headers: _icAuthHeader(),
  });
  return handleResponse(await doFetch(), doFetch);
}

export async function updateCaptureManualStatus(id, status) {
  const doFetch = () => fetch(ENDPOINTS.imageCaptureManualStatus(id), {
    method: 'PATCH',
    headers: _icAuthHeader(),
    body: JSON.stringify({ manual_status: status }),
  });
  return handleResponse(await doFetch(), doFetch);
}

export async function deleteCapture(id) {
  const doFetch = () => fetch(ENDPOINTS.imageCaptureDetail(id), {
    method: 'DELETE',
    headers: _icAuthHeader(),
  });
  return handleResponse(await doFetch(), doFetch);
}

export async function updateCapture(id, data) {
  const doFetch = () => fetch(ENDPOINTS.imageCaptureDetail(id), {
    method: 'PATCH',
    headers: _icAuthHeader(),
    body: JSON.stringify(data),
  });
  return handleResponse(await doFetch(), doFetch);
}

// ── Helper: Get full image URL ──
export function getCaptureImageUrl(imagePath) {
  if (!imagePath) return null;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
  return ENDPOINTS.mediaUrl(imagePath);
}

// ── Export all image capture services as a grouped object ──
export const imageCaptureService = {
  // Customers
  getCustomers: getImageCaptureCustomers,
  createCustomer: createImageCaptureCustomer,
  
  // Capture Links
  generateLink: generateCaptureLink,
  getLinkByUuid: getCaptureLinkByUuid,
  getAllLinks: getAllCaptureLinks,
  
  // OTP
  sendOtp,
  verifyOtp,
  resendOtp,
  
  // Captures
  upload: uploadCaptureImage,
  getAll: getAllCaptures,
  getById: getCaptureById,
  updateManualStatus: updateCaptureManualStatus,
  delete: deleteCapture,
  update: updateCapture,
  
  // Helpers
  getImageUrl: getCaptureImageUrl,
};