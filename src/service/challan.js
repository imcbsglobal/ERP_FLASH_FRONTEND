// challan.js

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";
const BASE = `${BASE_URL}/challan/challans/`;

// ── Helper: auth headers ─────────────────────────────────────────────────────
const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
  Accept: "application/json",
});

// ── Helper: refresh token ────────────────────────────────────────────────────
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

// ── Helper: handle response with auto-refresh on 401 ────────────────────────
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

// ── Helper: build FormData ───────────────────────────────────────────────────
function buildFormData(payload) {
  const fd = new FormData();

  const fieldMap = {
    vehicle:        payload.vehicle,
    date:           payload.date,
    challan_no:     payload.challanNo,
    challan_date:   payload.challanDate,
    offence_type:   payload.offenceType,
    location:       payload.location,
    fine_amount:    payload.fineAmount,
    payment_status: payload.paymentStatus,
    remark:         payload.remark ?? "",
  };

  Object.entries(fieldMap).forEach(([k, v]) => {
    if (v !== undefined && v !== null) fd.append(k, v);
  });

  if (payload.challanDoc instanceof File)
    fd.append("challan_doc", payload.challanDoc);

  if (payload.paymentReceipt instanceof File)
    fd.append("payment_receipt", payload.paymentReceipt);

  return fd;
}

// ── API calls ────────────────────────────────────────────────────────────────

/**
 * GET /api/challan/challans/
 * params: { payment_status, offence_type, vehicle, search, ordering, page }
 */
export async function getChallans(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") query.append(k, v);
  });

  const url = `${BASE}${query.toString() ? `?${query}` : ""}`;
  const doFetch = () => fetch(url, { method: "GET", headers: authHeaders() });
  return handleResponse(await doFetch(), doFetch);
}

/**
 * GET /api/challan/challans/<id>/
 */
export async function getChallan(id) {
  const doFetch = () =>
    fetch(`${BASE}${id}/`, { method: "GET", headers: authHeaders() });
  return handleResponse(await doFetch(), doFetch);
}

/**
 * GET /api/challan/challans/summary/
 */
export async function getChallanSummary(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") query.append(k, v);
  });

  const url = `${BASE}summary/${query.toString() ? `?${query}` : ""}`;
  const doFetch = () => fetch(url, { method: "GET", headers: authHeaders() });
  return handleResponse(await doFetch(), doFetch);
}

/**
 * POST /api/challan/challans/
 */
export async function createChallan(payload) {
  const fd = buildFormData(payload);
  const doFetch = () =>
    fetch(BASE, { method: "POST", headers: authHeaders(), body: fd });
  return handleResponse(await doFetch(), doFetch);
}

/**
 * PATCH /api/challan/challans/<id>/
 */
export async function updateChallan(id, payload) {
  const fd = buildFormData(payload);
  const doFetch = () =>
    fetch(`${BASE}${id}/`, { method: "PATCH", headers: authHeaders(), body: fd });
  return handleResponse(await doFetch(), doFetch);
}

/**
 * DELETE /api/challan/challans/<id>/
 */
export async function deleteChallan(id) {
  const doFetch = () =>
    fetch(`${BASE}${id}/`, { method: "DELETE", headers: authHeaders() });
  return handleResponse(await doFetch(), doFetch);
}