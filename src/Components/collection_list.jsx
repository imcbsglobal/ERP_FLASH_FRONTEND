import React, { useState, useEffect, useCallback } from 'react';
import PaymentForm from './collection';
import { fetchPayments, fetchPaymentById, deletePayment, updatePaymentStatus, updatePayment, normalizePayment } from '../service/payment';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// ── Auth helpers ───────────────────────────────────────────────
function authHeaders(extra = {}) {
  const token = localStorage.getItem('access_token');
  const headers = { 'Accept': 'application/json', ...extra };
  if (token) {
    const rawToken = token.replace(/^Bearer\s+/i, '');
    headers['Authorization'] = `Bearer ${rawToken}`;
  }
  return headers;
}

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

    // Only clear auth state for 401/403 (invalid token).
    // A 500 is a server-side error — keep tokens so the user isn't
    // unexpectedly logged out when the backend is temporarily broken.
    if (response.status === 401 || response.status === 403) {
      console.warn(`Token refresh rejected (${response.status}). Clearing auth state.`);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      return null;
    }

    // 5xx — throw so the caller can show a "server error" message instead of "please log in"
    throw new Error(`Token refresh server error (${response.status}). Try again shortly.`);

  } catch (error) {
    // Re-throw server errors so the caller distinguishes them from auth failures
    if (error.message.startsWith('Token refresh server error')) throw error;
    console.error('Token refresh network error:', error);
    return null;   // network failure — don't clear tokens, just fail gracefully
  }
}

class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthError';
  }
}

async function apiFetch(url, options = {}) {
  let res = await fetch(url, options);

  if (res.status === 401) {
    let newToken = null;
    try {
      newToken = await refreshAccessToken();
    } catch (refreshErr) {
      // Server error during refresh — propagate as a plain Error, NOT AuthError,
      // so the UI shows "server error" rather than "please log in".
      throw new Error(refreshErr.message);
    }

    if (newToken) {
      const newOptions = {
        ...options,
        headers: { ...options.headers, 'Authorization': `Bearer ${newToken}` },
      };
      res = await fetch(url, newOptions);
    } else {
      throw new AuthError('Session expired. Please log in again.');
    }
  }

  if (res.status === 204) return null;

  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401) throw new AuthError('Session expired. Please log in again.');
    const msg =
      data?.detail ||
      Object.entries(data)
        .map(([f, e]) => `${f}: ${Array.isArray(e) ? e.join(', ') : e}`)
        .join(' | ');
    throw new Error(msg || `Error ${res.status}`);
  }
  return data;
}

// ── Component ──────────────────────────────────────────────────
const PaymentTable = () => {
  const [payments, setPayments]               = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState(null);
  const [isAuthError, setIsAuthError]         = useState(false);
  const [searchTerm, setSearchTerm]           = useState('');
  const [filterType, setFilterType]           = useState('all');
  const [filterStatus, setFilterStatus]       = useState('all');
  const [dateFrom, setDateFrom]               = useState('');
  const [dateTo, setDateTo]                   = useState('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [deletingId, setDeletingId]           = useState(null);
  const [updatingId, setUpdatingId]           = useState(null);
  const [editingPayment, setEditingPayment]   = useState(null);
  const [editLoading, setEditLoading]         = useState(false);

  // ── Fetch all payments ─────────────────────────────────────────
  const loadPayments = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      setIsAuthError(true);
      setError('Please log in to view payments.');
      return;
    }

    setLoading(true);
    setError(null);
    setIsAuthError(false);

    try {
      const params = new URLSearchParams();
      if (searchTerm)            params.append('search', searchTerm);
      if (filterType !== 'all') params.append('collection_type', filterType);

      const data = await apiFetch(
        `${BASE_URL}/payments/?${params}`,
        { headers: authHeaders({ Accept: 'application/json' }) }
      );

      const list = Array.isArray(data) ? data : (data.results ?? []);
      setPayments(list.map(normalizePayment));
    } catch (err) {
      if (err.name === 'AuthError') {
        setIsAuthError(true);
        setError(err.message);
      } else {
        setError(err.message || 'Failed to load payments.');
      }
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterType]);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  // ── Add new payment from PaymentForm ──────────────────────────
  const handleNewPayment = (normalizedPayment) => {
    setPayments(prev => [normalizedPayment, ...prev]);
    setShowPaymentForm(false);
  };

  // ── Edit ───────────────────────────────────────────────────────
  const handleEditClick = async (payment) => {
    setEditLoading(payment.id);
    try {
      const fresh = await fetchPaymentById(payment.id);
      setEditingPayment(normalizePayment(fresh));
    } catch (err) {
      // Fall back to cached data if fetch fails
      setEditingPayment(payment);
    } finally {
      setEditLoading(null);
    }
  };

  const handleEditSuccess = (updatedPayment) => {
    setPayments(prev => prev.map(p => p.id === updatedPayment.id ? updatedPayment : p));
    setEditingPayment(null);
  };

  // ── Delete ─────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this payment?')) return;
    setDeletingId(id);
    try {
      await apiFetch(`${BASE_URL}/payments/${id}/`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      setPayments(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      if (err.name === 'AuthError') {
        setIsAuthError(true);
        setError(err.message);
      } else {
        alert(`Delete failed: ${err.message}`);
      }
    } finally {
      setDeletingId(null);
    }
  };

  // ── Status dropdown ────────────────────────────────────────────
  const STATUS_OPTIONS = ['Pending', 'Completed', 'Failed'];

  const handleStatusUpdate = async (payment, nextStatus) => {
    if (nextStatus === payment.status) return;
    setUpdatingId(payment.id);
    try {
      const updated = await apiFetch(`${BASE_URL}/payments/${payment.id}/status/`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status: nextStatus }),
      });
      setPayments(prev =>
        prev.map(p => p.id === payment.id ? normalizePayment(updated) : p)
      );
    } catch (err) {
      if (err.name === 'AuthError') {
        setIsAuthError(true);
        setError(err.message);
      } else {
        alert(`Status update failed: ${err.message}`);
      }
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Client-side filter ─────────────────────────────────────────
  const filteredPayments = payments.filter(payment => {
    const matchesSearch =
      payment.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.branch.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.paidFor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType   = filterType === 'all' || payment.collectionType === filterType;
    const matchesStatus = filterStatus === 'all' || (payment.status || '').toLowerCase() === filterStatus.toLowerCase();
    const payDate = payment.date ? new Date(payment.date) : null;
    const matchesFrom = !dateFrom || (payDate && payDate >= new Date(dateFrom));
    const matchesTo   = !dateTo   || (payDate && payDate <= new Date(dateTo + 'T23:59:59'));
    return matchesSearch && matchesType && matchesStatus && matchesFrom && matchesTo;
  });

  // ── Formatters ─────────────────────────────────────────────────
  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR',
      minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric' });

  const getStatusClass = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'completed': return 'pill-green';
      case 'pending':   return 'pill-amber';
      case 'failed':    return 'pill-red';
      default:          return 'pill-muted';
    }
  };

  const collectionTypes = ['all', 'Cash', 'Cheque', 'Bank Transfer', 'Credit Card', 'Debit Card', 'Online Payment'];

  const cols = [
    { key: 'id',     label: 'ID',           width: '60px',  align: 'left'   },
    { key: 'client', label: 'Client Name',  width: '160px', align: 'left'   },
    { key: 'branch', label: 'Branch',       width: '100px', align: 'left'   },
    { key: 'type',   label: 'Payment Type', width: '130px', align: 'left'   },
    { key: 'amount', label: 'Amount',       width: '120px', align: 'right'  },
    { key: 'for',    label: 'Paid For',     width: '150px', align: 'left'   },
    { key: 'date',   label: 'Date',         width: '105px', align: 'center' },
    { key: 'status', label: 'Status',       width: '100px', align: 'center' },
    { key: 'proof',  label: 'Proof',        width: '75px',  align: 'center' },
    { key: 'acts',   label: 'Actions',      width: '130px', align: 'center' },
  ];

  // ── Loading / Error states ─────────────────────────────────────
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: 'var(--muted)', fontSize: '14px' }}>
        Loading payments...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ color: 'var(--red)', marginBottom: '12px' }}>{error}</p>
        {isAuthError ? (
          <button
            className="btn-p"
            onClick={() => {
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              window.location.href = '/login';
            }}
          >
            Go to Login
          </button>
        ) : (
          <button className="btn-p" onClick={loadPayments}>Retry</button>
        )}
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        * { font-family: 'Nohemi', sans-serif !important; }

        .pt-toolbar { display: flex; justify-content: space-between; align-items: center;
          flex-wrap: wrap; gap: 12px; margin-bottom: 18px; }
        .pt-filters { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }

        .pt-search { padding: 8px 12px; border: 1px solid var(--border); border-radius: 7px;
          font-size: 13px; width: 260px; background: var(--surface); color: var(--text); transition: border-color 0.2s; }
        .pt-search:focus { outline: none; border-color: var(--gold); box-shadow: 0 0 0 2px rgba(201,168,76,0.12); }

        .pt-select { padding: 8px 12px; border: 1px solid var(--border); border-radius: 7px;
          font-size: 13px; background: var(--surface); color: var(--text); cursor: pointer; }
        .pt-select:focus { outline: none; border-color: var(--gold); }

        .pt-date { padding: 8px 10px; border: 1px solid var(--border); border-radius: 7px;
          font-size: 13px; background: var(--surface); color: var(--text); cursor: pointer; font-family: 'Nohemi', sans-serif; }
        .pt-date:focus { outline: none; border-color: var(--gold); }

        .pt-clear-btn { padding: 7px 12px; border: 1px solid var(--border); border-radius: 7px;
          font-size: 12px; background: var(--surface); color: var(--muted); cursor: pointer; font-family: 'Nohemi', sans-serif; }
        .pt-clear-btn:hover { background: #fee2e2; color: #991b1b; border-color: #fca5a5; }

        .pt-card { background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--r); overflow: hidden; margin-bottom: 18px; }
        .pt-scroll { overflow-x: auto; }

        .pt-table { width: 100%; border-collapse: collapse; min-width: 900px; table-layout: fixed; }
        .pt-table thead th { font-size: 14px; font-weight: 700; letter-spacing: 1.2px;
          text-transform:capitalize; color:black; padding: 11px 14px; background:white;
          border-bottom: 1px solid var(--border); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pt-table tbody tr { transition: background 0.15s; }
        .pt-table tbody tr:not(:last-child) td { border-bottom: 1px solid var(--border); }
        .pt-table tbody tr:hover td { background: #fafaf7; }
        .pt-table tbody td { padding: 11px 14px; font-size: 13px; color: var(--text);
          vertical-align: middle; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .pt-empty { text-align: center; padding: 32px; color: var(--muted); font-size: 13px; }

        .pill { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 600; }
        .pill-green {color: #13df46; }
        .pill-amber {color: #bfd30e; }
        .pill-red  {color: #991b1b; }
        .pill-muted {color: #64748b; }

        .btn-view { padding: 3px 10px; border-radius: 5px; border: 1px solid var(--border);
          background: var(--surface); color: var(--accent); font-size: 12px; cursor: pointer; }
        .btn-view:hover { background: var(--surface2); }
        .no-proof { font-size: 11px; color: var(--muted); }

        .act-group { display: flex; gap: 5px; justify-content: center; }
        .btn-edit { padding: 3px 10px; border-radius: 5px; border: 1px solid var(--border);
          background: var(--surface); color: var(--accent); font-size: 12px; cursor: pointer; }
        .btn-edit:hover { background: var(--surface2); }
        .btn-del { padding: 3px 10px; border-radius: 5px; border: none;
          background: #fee2e2; color: #991b1b; font-size: 12px; cursor: pointer; }
        .btn-del:hover { background: #fecaca; }
        .btn-del:disabled { opacity: 0.5; cursor: not-allowed; }

        .pt-stat { background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--r); padding: 12px 22px; min-width: 130px; text-align: center; }
        .pt-stat .s-label { font-size: 10px; font-weight: 600; letter-spacing: 1.2px;
          text-transform:capitalize; color: var(--muted); margin-bottom: 6px; }
        .pt-stat .s-value { font-size: 20px; font-weight: 700; color: var(--accent); line-height: 1; }
        .pt-stat .s-value.green { color: var(--green); }
        .pt-stat .s-value.amber { color: var(--amber); }

        .pt-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.48);
          display: flex; justify-content: center; align-items: center; z-index: 1000;
          padding: 20px; overflow-y: auto; }
        .pt-modal { background: #fff; border-radius: 12px; max-width: 800px; width: 100%;
          max-height: 90vh; overflow-y: auto; position: relative; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
        .pt-modal-header { position: sticky; top: 0; background: #fff; padding: 16px 24px;
          border-bottom: 1px solid var(--border); display: flex; justify-content: space-between;
          align-items: center; z-index: 1; }
        .pt-modal-close { background: none; border: none; font-size: 22px; cursor: pointer;
          color: var(--muted); padding: 2px 6px; border-radius: 4px; transition: background 0.15s; }
        .pt-modal-close:hover { background: var(--surface2); color: var(--text); }
        .pt-modal-body { padding: 24px; }

        .btn-p { font-family: 'Nohemi', sans-serif; padding: 8px 20px;
          border-radius: 6px; border: none; background: var(--accent); color: #fff;
          cursor: pointer; font-weight: 500; }

        .pill-status-btn { cursor: pointer; border: none; background: none; padding: 0; }
        .pill-status-btn:disabled { cursor: not-allowed; opacity: 0.6; }

        .status-select { padding: 3px 8px; border-radius: 99px; font-size: 11px; font-weight: 600;
          border: none; cursor: pointer; appearance: none; text-align: center; outline: none; }
        .status-select:disabled { cursor: not-allowed; opacity: 0.6; }
        .status-select.pill-green {color: #38ce13; }
        .status-select.pill-amber {color: #f7ab08; }
        .status-select.pill-red {color: #d40b0b; }
        .status-select.pill-muted {color: #64748b; }
      `}</style>

      <div className="payment-table-container">

        {/* ── Toolbar ── */}
        <div className="pt-toolbar">
          <div className="pt-filters">
            <input
              className="pt-search" type="text"
              placeholder="Search by client, branch or service..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select className="pt-select" value={filterType}
              onChange={(e) => setFilterType(e.target.value)}>
              {collectionTypes.map(type => (
                <option key={type} value={type}>{type === 'all' ? 'All Types' : type}</option>
              ))}
            </select>
            <select className="pt-select" value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="Failed">Failed</option>
            </select>
            <input
              className="pt-date" type="date"
              title="From date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <input
              className="pt-date" type="date"
              title="To date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            {(dateFrom || dateTo || filterStatus !== 'all') && (
              <button className="pt-clear-btn" onClick={() => { setDateFrom(''); setDateTo(''); setFilterStatus('all'); }}>
                Clear
              </button>
            )}
          </div>
          <button className="btn-p" onClick={() => setShowPaymentForm(true)}>
            + New Payment
          </button>
        </div>

        {/* ── Table ── */}
        <div className="pt-card">
          <div className="pt-scroll">
            <table className="pt-table">
              <colgroup>
                {cols.map(c => <col key={c.key} style={{ width: c.width }} />)}
              </colgroup>
              <thead>
                <tr>
                  {cols.map(c => (
                    <th key={c.key} style={{ textAlign: c.align }}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length > 0 ? filteredPayments.map((payment, index) => (
                  <tr key={payment.id}>
                    <td style={{ textAlign: 'left' }}>{index + 1}</td>
                    <td style={{ textAlign: 'left' }}>{payment.clientName}</td>
                    <td style={{ textAlign: 'left' }}>{payment.branch}</td>
                    <td style={{ textAlign: 'left' }}>{payment.collectionType}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(payment.amount)}</td>
                    <td style={{ textAlign: 'left' }}>{payment.paidFor}</td>
                    <td style={{ textAlign: 'center' }}>{formatDate(payment.date)}</td>

                    <td style={{ textAlign: 'center' }}>
                      <select
                        className={`status-select ${getStatusClass(payment.status)}`}
                        value={payment.status}
                        disabled={updatingId === payment.id}
                        onChange={(e) => handleStatusUpdate(payment, e.target.value)}
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      {payment.paymentProofUrl ? (
                        <button className="btn-view"
                          onClick={() => window.open(payment.paymentProofUrl, '_blank')}>
                          View
                        </button>
                      ) : (
                        <span className="no-proof">None</span>
                      )}
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <div className="act-group">
                        <button
                          className="btn-edit"
                          disabled={editLoading === payment.id}
                          onClick={() => handleEditClick(payment)}
                        >
                          {editLoading === payment.id ? '...' : 'Edit'}
                        </button>
                        <button
                          className="btn-del"
                          disabled={deletingId === payment.id}
                          onClick={() => handleDelete(payment.id)}
                        >
                          {deletingId === payment.id ? '...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={cols.length} className="pt-empty">No payments found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ── New Payment Modal ── */}
      {showPaymentForm && (
        <div className="pt-modal-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) setShowPaymentForm(false); }}>
          <div className="pt-modal">
            <div className="pt-modal-header">
              <button className="pt-modal-close" onClick={() => setShowPaymentForm(false)}>×</button>
            </div>
            <div className="pt-modal-body">
              <PaymentForm
                onSuccess={handleNewPayment}
                onCancel={() => setShowPaymentForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Payment Modal ── */}
      {editingPayment && (
        <div className="pt-modal-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) setEditingPayment(null); }}>
          <div className="pt-modal">
            <div className="pt-modal-header">
              <span style={{ fontWeight: 600, fontSize: 15 }}>Edit Payment #{editingPayment.id}</span>
              <button className="pt-modal-close" onClick={() => setEditingPayment(null)}>×</button>
            </div>
            <div className="pt-modal-body">
              <PaymentForm
                initialData={editingPayment}
                onSuccess={handleEditSuccess}
                onCancel={() => setEditingPayment(null)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PaymentTable;