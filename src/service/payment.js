// payment.js
// API service layer for Payment Collection — connects collection.jsx & collection_list.jsx to the Django backend.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// ─── Helper: get auth headers ─────────────────────────────────────────────────
function getAuthHeaders() {
  const token = localStorage.getItem('access_token');
  const headers = { 'Accept': 'application/json' };
  if (token) {
    const rawToken = token.replace(/^Bearer\s+/i, '');
    headers['Authorization'] = `Bearer ${rawToken}`;
  }
  return headers;
}

// ─── Helper: refresh token ───────────────────────────────────────────────────
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${BASE_URL}/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('access_token', data.access);
      if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
      return data.access;
    }

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    return null;
  } catch (error) {
    console.error('Token refresh failed:', error);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    return null;
  }
}

// ─── Helper: auth fetch with auto-refresh ────────────────────────────────────
async function authFetch(url, options = {}) {
  let response = await fetch(url, {
    ...options,
    headers: { ...getAuthHeaders(), ...options.headers }
  });

  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const newHeaders = {
        ...options.headers,
        'Authorization': `Bearer ${newToken}`,
        'Accept': 'application/json'
      };
      response = await fetch(url, { ...options, headers: newHeaders });
    } else {
      const error = new Error('Session expired. Please log in again.');
      error.name = 'AuthError';
      throw error;
    }
  }

  return response;
}

async function handleResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    // Surface Django field-level validation errors if present
    const message =
      data?.detail ||
      Object.entries(data || {})
        .map(([field, errs]) => `${field}: ${Array.isArray(errs) ? errs.join(', ') : errs}`)
        .join(' | ') ||
      `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.data   = data;
    throw error;
  }

  return data;
}

// ─── Payment CRUD ─────────────────────────────────────────────────────────────

/**
 * Fetch all payments.
 * Supports search, filter, and ordering that match the backend ListCreateView.
 *
 * @param {Object} params
 * @param {string} [params.search]          - Searches client_name, branch, paid_for
 * @param {string} [params.collection_type] - Filter by payment type (e.g. 'Cash')
 * @param {string} [params.status]          - Filter by status ('Pending' | 'Completed' | 'Failed')
 * @param {string} [params.branch]          - Filter by branch
 * @param {string} [params.date]            - Filter by exact date (YYYY-MM-DD)
 * @param {string} [params.ordering]        - e.g. '-created_at', 'amount'
 * @param {number} [params.page]            - Page number (pagination)
 */
export async function fetchPayments(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') query.append(key, val);
  });

  const url = `${BASE_URL}/payments/${query.toString() ? `?${query}` : ''}`;
  const response = await authFetch(url, {
    method: 'GET',
  });
  return handleResponse(response);
}

/**
 * Fetch a single payment by ID.
 * @param {number} id
 */
export async function fetchPaymentById(id) {
  const response = await authFetch(`${BASE_URL}/payments/${id}/`, {
    method: 'GET',
  });
  return handleResponse(response);
}

/**
 * Create a new payment.
 * Automatically switches to multipart/form-data when a file is attached.
 *
 * Matches collection.jsx formData shape:
 *   { clientName, branch, collectionType, amount, paidFor, notes, paymentProof }
 *
 * @param {Object} formData - React state formData from collection.jsx
 */
export async function createPayment(formData) {
  // Map camelCase (React) → snake_case (Django)
  const payload = new FormData();
  payload.append('client_name',     formData.clientName);
  payload.append('branch',          formData.branch);
  payload.append('collection_type', formData.collectionType);
  payload.append('amount',          formData.amount);
  payload.append('paid_for',        formData.paidFor);
  payload.append('notes',           formData.notes || '');

  if (formData.paymentProof) {
    payload.append('payment_proof', formData.paymentProof);
  }

  const response = await authFetch(`${BASE_URL}/payments/`, {
    method: 'POST',
    body: payload,
  });
  return handleResponse(response);
}

/**
 * Update a payment (full update).
 * @param {number} id
 * @param {Object} formData - Same shape as createPayment
 */
export async function updatePayment(id, formData) {
  const payload = new FormData();
  payload.append('client_name',     formData.clientName);
  payload.append('branch',          formData.branch);
  payload.append('collection_type', formData.collectionType);
  payload.append('amount',          formData.amount);
  payload.append('paid_for',        formData.paidFor);
  payload.append('notes',           formData.notes || '');

  if (formData.paymentProof instanceof File) {
    payload.append('payment_proof', formData.paymentProof);
  }

  const response = await authFetch(`${BASE_URL}/payments/${id}/`, {
    method: 'PUT',
    body: payload,
  });
  return handleResponse(response);
}

/**
 * Update only the status of a payment.
 * Used by the Edit/Status toggle in collection_list.jsx.
 *
 * @param {number} id
 * @param {'Pending'|'Completed'|'Failed'} status
 */
export async function updatePaymentStatus(id, status) {
  const response = await authFetch(`${BASE_URL}/payments/${id}/status/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return handleResponse(response);
}

/**
 * Delete a payment by ID.
 * Also removes the associated proof file on the server.
 * @param {number} id
 */
export async function deletePayment(id) {
  const response = await authFetch(`${BASE_URL}/payments/${id}/`, {
    method: 'DELETE',
  });
  // 204 No Content — handleResponse returns null
  return handleResponse(response);
}

// ─── Summary ──────────────────────────────────────────────────────────────────

/**
 * Fetch aggregate stats for the summary bar in collection_list.jsx.
 * Returns: { total_amount, total_count, completed_count, pending_count, failed_count }
 */
export async function fetchPaymentSummary() {
  const response = await authFetch(`${BASE_URL}/payments/summary/`, {
    method: 'GET',
  });
  return handleResponse(response);
}

// ─── Utility ──────────────────────────────────────────────────────────────────

/**
 * Format a Django-returned payment object to the camelCase shape
 * used by collection_list.jsx state (payments array).
 *
 * @param {Object} p - Raw payment object from Django API
 * @returns {Object}
 */
export function normalizePayment(p) {
  return {
    id:             p.id,
    clientName:     p.client_name,
    branch:         p.branch,
    collectionType: p.collection_type,
    amount:         parseFloat(p.amount),
    paidFor:        p.paid_for,
    notes:          p.notes,
    paymentProof:   p.payment_proof      || null,   // relative path stored in DB
    paymentProofUrl: p.payment_proof_url || null,   // absolute URL for "View" button
    status:         p.status,
    date:           p.date,
  };
}

/**
 * Build the proof file URL for the "View" button in the payments table.
 * Falls back to constructing the URL from the relative path if the API
 * doesn't return payment_proof_url directly.
 *
 * @param {Object} payment - Normalized payment object
 * @returns {string|null}
 */
export function getProofUrl(payment) {
  if (payment.paymentProofUrl) return payment.paymentProofUrl;
  if (payment.paymentProof)    return `${BASE_URL.replace('/api', '')}/media/${payment.paymentProof}`;
  return null;
}