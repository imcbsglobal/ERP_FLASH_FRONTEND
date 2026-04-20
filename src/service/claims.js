// ─────────────────────────────────────────────────────────────
//  claimsApi.js  –  All API calls for the Claims module
// ─────────────────────────────────────────────────────────────

const BASE_URL = "https://flasherp.in/api";

/** ── Helpers ────────────────────────────────────────────────── */

function authHeader() {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  console.log(`Making ${options.method || 'GET'} request to:`, url);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...authHeader(),
        ...(options.headers || {}),
      },
    });

    console.log(`Response status: ${response.status} for ${url}`);

    // Handle 401 Unauthorized
    if (response.status === 401) {
      localStorage.removeItem("access_token");
      window.location.href = '/login';
      throw new Error("Session expired. Please login again.");
    }

    if (!response.ok) {
      let errorDetail = `Request failed: ${response.status}`;
      try {
        const errBody = await response.json();
        if (errBody.detail) errorDetail = errBody.detail;
        else if (errBody.error) errorDetail = errBody.error;
      } catch (_) {}
      throw new Error(errorDetail);
    }

    if (response.status === 204) return null;
    return response.json();
  } catch (error) {
    console.error("Request failed:", error);
    throw error;
  }
}

/** ── Map API response shape → frontend shape ────────────────── */
function mapClaim(apiClaim) {
  const receiptUrl = apiClaim.receipt
    ? apiClaim.receipt.startsWith("http")
      ? apiClaim.receipt
      : `https://flasherp.in${apiClaim.receipt}`
    : null;

  return {
    id:          apiClaim.id,
    date:        apiClaim.created_at || new Date().toISOString(),
    claimedBy:   apiClaim.claimed_by_name || "Unknown",
    clientName:  apiClaim.client_name || "",
    department:  apiClaim.department_display || apiClaim.department || "",
    expense:     apiClaim.expense_type_display || apiClaim.expense_type || "",
    amount:      parseFloat(apiClaim.amount) || 0,
    receipt:     !!(apiClaim.receipt || apiClaim.has_receipt),
    receiptUrl:  receiptUrl,
    status:      apiClaim.status || "Pending",
    expense_type: apiClaim.expense_type || "",
    purpose:     apiClaim.purpose || "",
    notes:       apiClaim.notes || "",
    _raw:        apiClaim,
  };
}

/** ── Map form state → FormData for multipart POST ───────────── */
function buildFormData(form, isDraft = false) {
  const fd = new FormData();
  fd.append("expense_type", form.expenseType);
  fd.append("department",   form.department);
  fd.append("client_name",  form.clientName  || "");
  fd.append("purpose",      form.purpose     || "");
  fd.append("amount",       form.amount      || "0");
  fd.append("notes",        form.notes       || "");
  if (isDraft) fd.append("status", "Draft");
  if (form.receipt instanceof File) {
    fd.append("receipt", form.receipt);
  }
  return fd;
}

// ─────────────────────────────────────────────────────────────
//  Public API
// ─────────────────────────────────────────────────────────────

export async function fetchClaims(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const path = `/claims/${qs ? `?${qs}` : ""}`;
  const data = await request(path);
  // Handle both paginated and non-paginated responses
  const results = data?.results ?? data;
  if (Array.isArray(results)) {
    return results.map(mapClaim);
  }
  return [];
}

export async function fetchClaim(id) {
  const data = await request(`/claims/${id}/`);
  return mapClaim(data);
}

export async function createClaim(form) {
  const fd = buildFormData(form, false);
  const response = await fetch(`${BASE_URL}/claims/`, {
    method: "POST",
    headers: authHeader(),
    body: fd,
  });

  if (!response.ok) {
    let errorDetail = `Request failed: ${response.status}`;
    try {
      const errBody = await response.json();
      if (errBody.detail) errorDetail = errBody.detail;
      else if (errBody.error) errorDetail = errBody.error;
    } catch (_) {}
    throw new Error(errorDetail);
  }

  const data = await response.json();
  return mapClaim(data);
}

export async function saveDraftClaim(form) {
  const fd = buildFormData(form, true);
  const response = await fetch(`${BASE_URL}/claims/draft/`, {
    method: "POST",
    headers: authHeader(),
    body: fd,
  });

  if (!response.ok) {
    let errorDetail = `Request failed: ${response.status}`;
    try {
      const errBody = await response.json();
      if (errBody.detail) errorDetail = errBody.detail;
      else if (errBody.error) errorDetail = errBody.error;
    } catch (_) {}
    throw new Error(errorDetail);
  }

  const data = await response.json();
  return mapClaim(data);
}

export async function updateClaimStatus(id, newStatus) {
  const response = await fetch(`${BASE_URL}/claims/${id}/status/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify({ status: newStatus }),
  });

  if (!response.ok) {
    let errorDetail = `Request failed: ${response.status}`;
    try {
      const errBody = await response.json();
      if (errBody.detail) errorDetail = errBody.detail;
    } catch (_) {}
    throw new Error(errorDetail);
  }

  return response.json();
}

export async function updateClaim(id, form) {
  const fd = buildFormData(form, false);
  const response = await fetch(`${BASE_URL}/claims/${id}/`, {
    method: "PUT",
    headers: authHeader(),
    body: fd,
  });

  if (!response.ok) {
    let errorDetail = `Request failed: ${response.status}`;
    try {
      const errBody = await response.json();
      if (errBody.detail) errorDetail = errBody.detail;
      else if (errBody.error) errorDetail = errBody.error;
    } catch (_) {}
    throw new Error(errorDetail);
  }

  const data = await response.json();
  return mapClaim(data);
}

export async function deleteClaim(id) {
  const response = await fetch(`${BASE_URL}/claims/${id}/`, {
    method: "DELETE",
    headers: authHeader(),
  });

  if (!response.ok) {
    let errorDetail = `Request failed: ${response.status}`;
    try {
      const errBody = await response.json();
      if (errBody.detail) errorDetail = errBody.detail;
    } catch (_) {}
    throw new Error(errorDetail);
  }

  return null;
}