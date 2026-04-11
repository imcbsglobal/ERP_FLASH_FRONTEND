// ── Base URL ──────────────────────────────────────────────────────────────────
const BASE_URL = "https://erp.flashinnovations.in/api";

// ── Helper: build headers with auth token ────────────────────────────────────
const authHeaders = (isMultipart = false) => {
  const headers = {
    Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
  };
  // Do NOT set Content-Type for multipart — the browser sets it with the boundary
  if (!isMultipart) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
};

// ── Helper: refresh access token ─────────────────────────────────────────────
const refreshAccessToken = async () => {
  const refresh = localStorage.getItem("refresh_token");
  if (!refresh) throw new Error("No refresh token");

  const res = await fetch(`${BASE_URL}/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  if (!res.ok) throw new Error("Refresh failed");
  const data = await res.json();
  localStorage.setItem("access_token", data.access);
  return data.access;
};

// ── Helper: handle response (with auto-refresh on 401) ───────────────────────
const handleResponse = async (res, retryFn) => {
  if (res.status === 401 && retryFn) {
    try {
      await refreshAccessToken();
      const retryRes = await retryFn();
      return handleResponse(retryRes, null);
    } catch {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      window.location.href = "/login";
      return;
    }
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    err._status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
};

// ── Helper: build FormData or JSON body ──────────────────────────────────────
/**
 * If payload contains a `photo` File, return a FormData object so the browser
 * sends multipart/form-data.  Otherwise return a plain JSON string.
 */
const buildBody = (payload) => {
  const { photo, ...rest } = payload;

  if (photo instanceof File) {
    const fd = new FormData();
    Object.entries(rest).forEach(([k, v]) => {
      if (v !== undefined && v !== null) fd.append(k, String(v));
    });
    fd.append("photo", photo);
    return fd;
  }

  return JSON.stringify(rest);
};

// ════════════════════════════════════════════════════════════════════════════
//  USER APIs
// ════════════════════════════════════════════════════════════════════════════

export const saveUserInfo = (userData) => {
  localStorage.setItem("user", JSON.stringify(userData));
};

export const getCurrentUser = () => {
  const userStr = localStorage.getItem("user");
  if (!userStr) return null;
  try { return JSON.parse(userStr); } catch { return null; }
};

export const logout = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
  window.location.href = "/login";
};

/**
 * GET /api/users/
 */
export const getUsers = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.role)   params.append("role",   filters.role);
  if (filters.status) params.append("status", filters.status);
  if (filters.branch) params.append("branch", filters.branch);
  if (filters.search) params.append("search", filters.search);

  const query = params.toString() ? `?${params.toString()}` : "";
  const doFetch = () =>
    fetch(`${BASE_URL}/users/${query}`, { method: "GET", headers: authHeaders() });
  const data = await handleResponse(await doFetch(), doFetch);
  if (Array.isArray(data)) return { count: data.length, results: data };
  return data;
};

/**
 * POST /api/users/
 * payload may include a `photo` File field.
 */
export const createUser = async (payload) => {
  const body        = buildBody(payload);
  const isMultipart = body instanceof FormData;

  const doFetch = () =>
    fetch(`${BASE_URL}/users/`, {
      method:  "POST",
      headers: authHeaders(isMultipart),
      body,
    });
  return handleResponse(await doFetch(), doFetch);
};

/**
 * GET /api/users/:id/
 */
export const getUserById = async (id) => {
  const doFetch = () =>
    fetch(`${BASE_URL}/users/${id}/`, { method: "GET", headers: authHeaders() });
  return handleResponse(await doFetch(), doFetch);
};

/**
 * PUT /api/users/:id/
 * payload may include a `photo` File field.
 */
export const updateUser = async (id, payload) => {
  const body        = buildBody(payload);
  const isMultipart = body instanceof FormData;

  const doFetch = () =>
    fetch(`${BASE_URL}/users/${id}/`, {
      method:  "PUT",
      headers: authHeaders(isMultipart),
      body,
    });
  return handleResponse(await doFetch(), doFetch);
};

/**
 * PATCH /api/users/:id/
 * payload may include a `photo` File field.
 */
export const patchUser = async (id, payload) => {
  const body        = buildBody(payload);
  const isMultipart = body instanceof FormData;

  const doFetch = () =>
    fetch(`${BASE_URL}/users/${id}/`, {
      method:  "PATCH",
      headers: authHeaders(isMultipart),
      body,
    });
  return handleResponse(await doFetch(), doFetch);
};

/**
 * DELETE /api/users/:id/
 */
export const deleteUser = async (id) => {
  const doFetch = () =>
    fetch(`${BASE_URL}/users/${id}/`, { method: "DELETE", headers: authHeaders() });
  return handleResponse(await doFetch(), doFetch);
};

/**
 * PATCH /api/users/:id/toggle-status/
 */
export const toggleUserStatus = async (id) => {
  const doFetch = () =>
    fetch(`${BASE_URL}/users/${id}/toggle-status/`, {
      method: "PATCH",
      headers: authHeaders(),
    });
  return handleResponse(await doFetch(), doFetch);
};

// ════════════════════════════════════════════════════════════════════════════
//  BRANCH APIs
// ════════════════════════════════════════════════════════════════════════════

export const getBranches = async () => {
  const doFetch = () =>
    fetch(`${BASE_URL}/branches/`, { method: "GET", headers: authHeaders() });
  return handleResponse(await doFetch(), doFetch);
};

export const createBranch = async (payload) => {
  const doFetch = () =>
    fetch(`${BASE_URL}/branches/`, {
      method:  "POST",
      headers: authHeaders(),
      body:    JSON.stringify(payload),
    });
  return handleResponse(await doFetch(), doFetch);
};