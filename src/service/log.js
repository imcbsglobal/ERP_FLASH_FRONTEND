// src/services/authService.js
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// ── Axios instance ────────────────────────────────────────────
const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// ── Attach access token to every request ─────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auto-refresh on 401 ──────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const { data } = await axios.post(
            `${API_BASE}/api/auth/token/refresh/`,
            { refresh }
          );
          localStorage.setItem("access_token", data.access);
          original.headers.Authorization = `Bearer ${data.access}`;
          return api(original);
        } catch {
          authService.logout();
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

// ════════════════════════════════════════════════════════════
// AUTH SERVICE
// ════════════════════════════════════════════════════════════
const authService = {

  // ── POST /api/auth/login/ ─────────────────────────────────
  login: async (username, password) => {
    const { data } = await api.post("/api/auth/login/", { username, password });
    // Store tokens & user in localStorage
    localStorage.setItem("access_token",  data.access);
    localStorage.setItem("refresh_token", data.refresh);
    localStorage.setItem("user",          JSON.stringify(data.user));
    return data;
  },

  // ── POST /api/auth/logout/ ────────────────────────────────
  logout: async () => {
    const refresh = localStorage.getItem("refresh_token");
    try {
      if (refresh) {
        await api.post("/api/auth/logout/", { refresh });
      }
    } catch {
      // Silently fail — clear tokens regardless
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
    }
  },

  // ── POST /api/auth/token/refresh/ ────────────────────────
  refreshToken: async () => {
    const refresh = localStorage.getItem("refresh_token");
    if (!refresh) throw new Error("No refresh token found.");
    const { data } = await axios.post(`${API_BASE}/api/auth/token/refresh/`, {
      refresh,
    });
    localStorage.setItem("access_token", data.access);
    return data.access;
  },

  // ── GET /api/auth/me/ ─────────────────────────────────────
  getMe: async () => {
    const { data } = await api.get("/api/auth/me/");
    return data;
  },

  // ── PATCH /api/auth/me/ ───────────────────────────────────
  updateMe: async (payload) => {
    const { data } = await api.patch("/api/auth/me/", payload);
    localStorage.setItem("user", JSON.stringify(data));
    return data;
  },

  // ── POST /api/auth/change-password/ ──────────────────────
  changePassword: async (oldPassword, newPassword) => {
    const { data } = await api.post("/api/auth/change-password/", {
      old_password: oldPassword,
      new_password: newPassword,
    });
    return data;
  },

  // ── POST /api/auth/register/ (admin only) ────────────────
  register: async (payload) => {
    const { data } = await api.post("/api/auth/register/", payload);
    return data;
  },

  // ── Helpers ───────────────────────────────────────────────
  isAuthenticated: () => !!localStorage.getItem("access_token"),

  getCurrentUser: () => {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  },

  getAccessToken: () => localStorage.getItem("access_token"),
};

// ════════════════════════════════════════════════════════════
// USER MANAGEMENT SERVICE
// ════════════════════════════════════════════════════════════
const userService = {

  // ── GET /api/users/ ───────────────────────────────────────
  getAllUsers: async () => {
    const { data } = await api.get("/api/users/");
    return data;
  },

  // ── GET /api/users/:id/ ───────────────────────────────────
  getUserById: async (id) => {
    const { data } = await api.get(`/api/users/${id}/`);
    return data;
  },

  // ── POST /api/auth/register/ ─────────────────────────────
  createUser: async (payload) => {
    const { data } = await api.post("/api/auth/register/", payload);
    return data;
  },

  // ── PATCH /api/users/:id/ ────────────────────────────────
  updateUser: async (id, payload) => {
    const { data } = await api.patch(`/api/users/${id}/`, payload);
    return data;
  },

  // ── DELETE /api/users/:id/ ───────────────────────────────
  deleteUser: async (id) => {
    await api.delete(`/api/users/${id}/`);
  },
};

// ════════════════════════════════════════════════════════════
// COLLECTION SERVICE
// ════════════════════════════════════════════════════════════
const collectionService = {

  // ── Invoices ──────────────────────────────────────────────
  getInvoices: async (params = {}) => {
    const { data } = await api.get("/api/collection/invoices/", { params });
    return data;
  },

  getInvoiceById: async (id) => {
    const { data } = await api.get(`/api/collection/invoices/${id}/`);
    return data;
  },

  createInvoice: async (payload) => {
    const { data } = await api.post("/api/collection/invoices/", payload);
    return data;
  },

  updateInvoice: async (id, payload) => {
    const { data } = await api.patch(`/api/collection/invoices/${id}/`, payload);
    return data;
  },

  deleteInvoice: async (id) => {
    await api.delete(`/api/collection/invoices/${id}/`);
  },

  // ── Payments ──────────────────────────────────────────────
  getPayments: async (params = {}) => {
    const { data } = await api.get("/api/collection/payments/", { params });
    return data;
  },

  createPayment: async (payload) => {
    const { data } = await api.post("/api/collection/payments/", payload);
    return data;
  },

  // ── Reports ───────────────────────────────────────────────
  getReports: async (params = {}) => {
    const { data } = await api.get("/api/collection/reports/", { params });
    return data;
  },

  exportReport: async (params = {}) => {
    const response = await api.get("/api/collection/reports/export/", {
      params,
      responseType: "blob",
    });
    // Trigger file download
    const url  = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href  = url;
    link.setAttribute("download", "report.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // ── Dashboard summary ─────────────────────────────────────
  getDashboardStats: async () => {
    const { data } = await api.get("/api/collection/dashboard/");
    return data;
  },
};

// ── Named exports ─────────────────────────────────────────────
export { api, authService, userService, collectionService };

// ── Default export (api instance) ────────────────────────────
export default api;