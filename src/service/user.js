// ── Base URL ──────────────────────────────────────────────────────────────────
const BASE_URL = "http://127.0.0.1:8000/api";

// ── Helper: build headers with auth token ────────────────────────────────────
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
});

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
    err._status = res.status;   // attach HTTP status so callers can check e.g. 404
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
};

// ════════════════════════════════════════════════════════════════════════════
//  USER APIs
// ════════════════════════════════════════════════════════════════════════════

/**
 * Save user info to localStorage after login
 */
export const saveUserInfo = (userData) => {
  localStorage.setItem('user', JSON.stringify(userData));
};

/**
 * Get current logged in user
 */
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

/**
 * Logout user
 */
export const logout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  window.location.href = '/login';
};

/**
 * GET /api/users/
 * login-app UserListView returns a plain array; normalise to { count, results }
 * so user_list.jsx's  data.results  works correctly.
 */
export const getUsers = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.role)   params.append("role",   filters.role);
  if (filters.status) params.append("status", filters.status);
  if (filters.branch) params.append("branch", filters.branch);
  if (filters.search) params.append("search", filters.search);

  const query = params.toString() ? `?${params.toString()}` : "";
  const doFetch = () => fetch(`${BASE_URL}/users/${query}`, {
    method: "GET",
    headers: authHeaders(),
  });
  const data = await handleResponse(await doFetch(), doFetch);
  // Normalise plain array → { count, results }
  if (Array.isArray(data)) return { count: data.length, results: data };
  return data;
};

/**
 * POST /api/users/
 * Creates a user in the same `users` table that list/delete/patch all query.
 * All CRUD operations must use the same table — mismatching endpoints causes
 * 404s on delete because IDs come from a different table.
 */
export const createUser = async (payload) => {
  const doFetch = () => fetch(`${BASE_URL}/users/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(await doFetch(), doFetch);
};

/**
 * GET /api/users/:id/
 */
export const getUserById = async (id) => {
  const doFetch = () => fetch(`${BASE_URL}/users/${id}/`, {
    method: "GET",
    headers: authHeaders(),
  });
  return handleResponse(await doFetch(), doFetch);
};

/**
 * PUT /api/users/:id/
 */
export const updateUser = async (id, payload) => {
  const doFetch = () => fetch(`${BASE_URL}/users/${id}/`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(await doFetch(), doFetch);
};

/**
 * PATCH /api/users/:id/
 */
export const patchUser = async (id, payload) => {
  const doFetch = () => fetch(`${BASE_URL}/users/${id}/`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(await doFetch(), doFetch);
};

/**
 * DELETE /api/users/:id/
 */
export const deleteUser = async (id) => {
  const doFetch = () => fetch(`${BASE_URL}/users/${id}/`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(await doFetch(), doFetch);
};

/**
 * PATCH /api/users/:id/toggle-status/
 */
export const toggleUserStatus = async (id) => {
  const doFetch = () => fetch(`${BASE_URL}/users/${id}/toggle-status/`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  return handleResponse(await doFetch(), doFetch);
};

// ════════════════════════════════════════════════════════════════════════════
//  BRANCH APIs
// ════════════════════════════════════════════════════════════════════════════

export const getBranches = async () => {
  const doFetch = () => fetch(`${BASE_URL}/branches/`, {
    method: "GET",
    headers: authHeaders(),
  });
  return handleResponse(await doFetch(), doFetch);
};

export const createBranch = async (payload) => {
  const doFetch = () => fetch(`${BASE_URL}/branches/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(await doFetch(), doFetch);
};