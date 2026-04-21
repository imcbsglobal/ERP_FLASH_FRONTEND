import React, { useState, useEffect, useCallback } from 'react';
import PaymentForm from './collection';
import { fetchPayments, fetchPaymentById, deletePayment, updatePaymentStatus, updatePayment, normalizePayment } from '../service/payment';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { Bold } from 'lucide-react';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://flasherp.in/api';

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

    if (response.status === 401 || response.status === 403) {
      console.warn(`Token refresh rejected (${response.status}). Clearing auth state.`);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      return null;
    }

    throw new Error(`Token refresh server error (${response.status}). Try again shortly.`);

  } catch (error) {
    if (error.message.startsWith('Token refresh server error')) throw error;
    console.error('Token refresh network error:', error);
    return null;
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

// ── Mobile Card Component ──────────────────────────────────────
function MobileCard({ payment, index, startIndex, STATUS_OPTIONS, updatingId, onStatusUpdate, onEdit, onDelete, editLoading }) {
  const [expanded, setExpanded] = React.useState(false);

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
      case 'rejected':
      case 'failed':    return 'pill-red';
      default:          return 'pill-muted';
    }
  };

  const statusDisplay = payment.status === 'Failed' ? 'Rejected' : payment.status;

  return (
    <div className="mobile-card" onClick={() => setExpanded(p => !p)}>
      {/* Header */}
      <div className="mc-head">
        <div className="mc-left">
          <div className="mc-serial">#{startIndex + index + 1}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="client-name">{payment.clientName}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 10px', marginTop: 4 }}>
              {payment.place && (
                <span className="client-place">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                    <circle cx="12" cy="9" r="2.5" />
                  </svg>
                  {payment.place}
                </span>
              )}
              {payment.phoneNumber && (
                <span className="client-phone">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  {payment.phoneNumber}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="mc-right">
          <select
            className={`status-select ${getStatusClass(payment.status)}`}
            value={statusDisplay || 'Pending'}
            disabled={updatingId === payment.id}
            onClick={e => e.stopPropagation()}
            onChange={e => { e.stopPropagation(); onStatusUpdate(payment, e.target.value); }}
          >
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <span className={`mc-chevron${expanded ? ' open' : ''}`}>▼</span>
        </div>
      </div>

      {/* Always-visible summary */}
      <div className="mc-summary">
        <div>
          <div className="mc-lbl">Date</div>
          <div className="mc-val">{formatDate(payment.date)}</div>
          {(payment.createdByName || payment.created_by_name) && (
            <div style={{
              fontSize: 11, color: "#6b7280", marginTop: 3,
              display: "flex", alignItems: "center", gap: 3, fontWeight: 500
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
              {payment.createdByName || payment.created_by_name}
            </div>
          )}
        </div>
        <div>
          <div className="mc-lbl">Amount</div>
          <div className="mc-val mc-val-blue">{formatCurrency(payment.amount)}</div>
        </div>
        <div>
          <div className="mc-lbl">Branch</div>
          <div className="mc-val">{payment.branch || '—'}</div>
        </div>
        <div>
          <div className="mc-lbl">Type</div>
          <div className="mc-val">{payment.collectionType || '—'}</div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mc-detail" onClick={e => e.stopPropagation()}>
          {payment.department && (
            <div>
              <div className="mc-lbl">Department</div>
              <div className="mc-val">{payment.department}</div>
            </div>
          )}
          {payment.paidFor && (
            <div>
              <div className="mc-lbl">Paid For</div>
              <div className="mc-val">{payment.paidFor}</div>
            </div>
          )}
          {payment.paymentProofUrl && (
            <div>
              <div className="mc-lbl">Proof</div>
              <a className="file-link" href={payment.paymentProofUrl} target="_blank" rel="noopener noreferrer">
                <VisibilityOutlinedIcon style={{ fontSize: 18 }} /> View
              </a>
            </div>
          )}
          <div className="mc-full mc-actions">
            <button
              onClick={() => onEdit(payment)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 7, border: 'none',
                background: '#1a73e8', color: '#fff', fontSize: 13,
                fontWeight: 600, cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: 6,
                fontFamily: "'Google Sans', sans-serif",
              }}
            >
              <EditOutlinedIcon style={{ fontSize: 15 }} /> Edit
            </button>
            <button
              onClick={() => onDelete(payment.id)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 7, border: 'none',
                background: '#d93025', color: '#fff', fontSize: 13,
                fontWeight: 600, cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: 6,
                fontFamily: "'Google Sans', sans-serif",
              }}
            >
              <DeleteOutlineOutlinedIcon style={{ fontSize: 15 }} /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────
const PaymentTable = ({ mode = 'all' }) => {
  // Get logged-in user info
  const getLoggedInUser = () => {
    try {
      const userJson = localStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        return {
          id:   user.id   || user.user_id  || null,
          name: user.full_name || user.name || user.username || user.email || null,
        };
      }
    } catch { /* ignore */ }
    return { id: null, name: null };
  };
  const loggedInUser = getLoggedInUser();
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
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
      // "my" mode: server filters by the authenticated user via my_payments=true
      if (mode === 'my') {
        params.append('my_payments', 'true');
      }

      const data = await apiFetch(
        `${BASE_URL}/payments/?${params}`,
        { headers: authHeaders({ Accept: 'application/json' }) }
      );

      const list = Array.isArray(data) ? data : (data.results ?? []);
      setPayments(list.map(normalizePayment));
      setCurrentPage(1); // Reset to first page when filters change
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
  }, [searchTerm, filterType, mode]);

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
  const confirmDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this payment?')) {
      handleDelete(id);
    }
  };

  const handleDelete = async (id) => {
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
  const STATUS_OPTIONS = ['Pending', 'Completed', 'Rejected'];

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
      payment.paidFor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (payment.department && payment.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (payment.place && payment.place.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (payment.phoneNumber && payment.phoneNumber.includes(searchTerm));
    const matchesType   = filterType === 'all' || payment.collectionType === filterType;
    const matchesStatus = filterStatus === 'all' || (payment.status || '').toLowerCase() === filterStatus.toLowerCase();
    const payDate = payment.date ? new Date(payment.date) : null;
    const matchesFrom = !dateFrom || (payDate && payDate >= new Date(dateFrom));
    const matchesTo   = !dateTo   || (payDate && payDate <= new Date(dateTo + 'T23:59:59'));
    // "my" mode: server already filtered, but apply client-side guard using created_by
    const matchesUser = mode !== 'my' ? true : (() => {
      const uid = loggedInUser.id;
      // Use the created_by field returned by the API (reliable server-side source)
      if (uid && payment.created_by != null) {
        return String(payment.created_by) === String(uid);
      }
      // Fallback: if API didn't return created_by, trust the server filtered correctly
      return true;
    })();
    return matchesSearch && matchesType && matchesStatus && matchesFrom && matchesTo && matchesUser;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPayments = filteredPayments.slice(startIndex, endIndex);

  // Pagination handlers
  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Get visible page numbers for pagination
  const getVisiblePages = () => {
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

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
      case 'rejected':    return 'pill-red';
      case 'failed':      return 'pill-red';
      default:          return 'pill-muted';
    }
  };

  const collectionTypes = ['all', 'Cash', 'Cheque', 'Bank Transfer', 'Credit Card', 'Debit Card', 'Online Payment'];

  // Table headers
  const headers = [
    "Sl. no.", "Date", "Client Name", "Branch", "Department", "Payment Type", 
    "Amount", "Paid For", "Status", "Proof", "Action"
  ];

  // Table styles - th font size set to 20
  const thStyle = { 
    fontSize: 15, 
    fontWeight: 600, 
    letterSpacing: "0.4px", 
    color: "#fcfbfb", 
    textAlign: "left", 
    padding: "11px 14px", 
    background: "#017efc", 
    borderBottom: "1px solid #e8eaed", 
    fontFamily: "'Google Sans', sans-serif", 
    whiteSpace: "nowrap", 
    textTransform: "capitalize",
    position: "sticky",
    top: 0,
    zIndex: 10
  };
  
  const tdStyle = { 
    padding: "12px 14px", 
    fontSize: 14, 
    borderBottom: "1px solid #e8eaed", 
    fontFamily: "'Google Sans', sans-serif", 
    color: "#202124", 
    textAlign: "left", 
    verticalAlign: "middle" 
  };

  // ── Loading / Error states ─────────────────────────────────────
  if (loading) {
    return (
      <div style={{ textAlign: 'left', padding: '60px', color: '#5f6368', fontSize: '14px', fontFamily: "'Google Sans', sans-serif" }}>
        Loading payments...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'left', padding: '40px' }}>
        <p style={{ color: '#d93025', marginBottom: '12px' }}>{error}</p>
        {isAuthError ? (
          <button
            style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#1a73e8', color: '#fff', cursor: 'pointer', fontWeight: 500, fontFamily: "'Google Sans', sans-serif" }}
            onClick={() => {
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              window.location.href = '/login';
            }}
          >
            Go to Login
          </button>
        ) : (
          <button style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#1a73e8', color: '#fff', cursor: 'pointer', fontWeight: 500, fontFamily: "'Google Sans', sans-serif" }} onClick={loadPayments}>Retry</button>
        )}
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&display=swap');
        * { font-family: 'Google Sans', sans-serif; }
        
        .pt-search-input::placeholder { color: #9aa0a6; }
        .pt-search-input:focus { border-color: #1a73e8 !important; box-shadow: 0 0 0 2px rgba(26,115,232,0.12); }
        
        .status-select {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 14px;
          font-weight:bold;
          border: none;
          cursor: pointer;
          text-align: left;
          outline: none;
          font-family: 'Google Sans', sans-serif;
          background-color: transparent;
          color: #333;
        }
        .status-select:disabled { cursor: not-allowed; opacity: 0.6; }
        .status-select.pill-green { background:#188038 !important; color: #f6faf7 !important; }
        .status-select.pill-amber { background: rgb(247, 170, 4) !important; color: #faf9fc !important; }
        .status-select.pill-red { background: #d35741f5 !important; color: #f5f1f1 !important; }
        .status-select.pill-muted { background:#5f6368 !important; color: #fff !important; }
        
        .file-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #1a73e8;
          text-decoration: none;
          transition: color 0.2s;
        }
        .file-link:hover { color: #1557b0; }
        
        .no-proof {
          color: #cbd5e1;
          font-size: 0.78rem;
        }
        
        .pt-modal-backdrop { 
          position: fixed; inset: 0; background: rgba(0,0,0,0.48);
          display: flex; justify-content: center; align-items: center; z-index: 1000;
          padding: 20px; overflow-y: auto; 
        }
        .pt-modal { 
          background: #fff; border-radius: 12px; max-width: 800px; width: 100%;
          max-height: 90vh; overflow-y: auto; position: relative; box-shadow: 0 20px 60px rgba(0,0,0,0.2); 
        }
        .pt-modal-header { 
          position: sticky; top: 0; background: #fff; padding: 16px 24px;
          border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between;
          align-items: center; z-index: 1; 
        }
        .pt-modal-close { 
          background: none; border: none; font-size: 24px; cursor: pointer;
          color: #6b7280; padding: 2px 6px; border-radius: 4px; transition: background 0.15s; 
        }
        .pt-modal-close:hover { background: #f3f4f6; color: #111827; }
        .pt-modal-body { padding: 24px; }
        
        .client-info { display: flex; flex-direction: column; gap: 1px; }
        .client-name { font-weight: 600; color: #111827; font-size: 14px; }
        .client-place { font-size: 13px; color: #0c0c0c; display: flex; align-items: center; gap: -1px; }
        .client-phone { font-size: 13px; color: #0a0a0a; display: flex; align-items: center; gap: 0px; margin-top: 0; }
        .client-place svg, .client-phone svg { width: 11px; height: 11px; opacity: 0.7; flex-shrink: 0; }
        
        .department-badge {
          display: inline-block;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          color: #202124;
          word-wrap: break-word;
          white-space: normal;
          line-height: 1.3;
        }
        
        .branch-cell, .paidfor-cell {
          white-space: normal;
          word-wrap: break-word;
          max-width: 160px;
        }

        /* Single scrollable table container - only table body scrolls */
        .single-scroll-table-container {
          flex: 1;
          min-height: 0;
          overflow: auto;
          background: #fff;
          border-radius: 10px;
          border: 1px solid #e8eaed;
        }
        
        .data-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .data-table thead tr th {
          position: sticky;
          top: 0;
          z-index: 10;
          background: #017efc;
        }

        /* Pagination Styles */
        .pagination-container {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 8px;
          margin-top: 16px;
          padding: 12px 0;
          flex-shrink: 0;
        }
        
        .pagination-button {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 36px;
          height: 36px;
          padding: 0 8px;
          border: 1px solid #e8eaed;
          background: #fff;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          color: #5f6368;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Google Sans', sans-serif;
        }
        
        .pagination-button:hover:not(:disabled) {
          background: #f8f9fa;
          border-color: #1a73e8;
          color: #1a73e8;
        }
        
        .pagination-button.active {
          background: #1a73e8;
          border-color: #1a73e8;
          color: #fff;
        }
        
        .pagination-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .pagination-ellipsis {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 36px;
          height: 36px;
          font-size: 14px;
          color: #5f6368;
        }
        
        .pagination-info {
          font-size: 13px;
          color: #5f6368;
          margin-right: 16px;
          font-family: 'Google Sans', sans-serif;
        }

        /* ── Filter grid layout ── */
        .filters-grid {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          align-items: flex-end;
        }
        .filter-item {
          flex: 1;
          min-width: 140px;
        }
        .filter-item-search {
          flex: 2;
          min-width: 200px;
        }
        .filter-item select,
        .filter-item input,
        .filter-item-search input {
          width: 100%;
          padding: 9px 12px;
          border: 1px solid #e8eaed;
          border-radius: 7px;
          font-size: 13px;
          font-family: 'Google Sans', sans-serif;
          outline: none;
          background: #fff;
          color: #202124;
          box-sizing: border-box;
          transition: border 0.2s, box-shadow 0.2s;
        }
        .filter-item input:focus,
        .filter-item-search input:focus {
          border-color: #1a73e8;
          box-shadow: 0 0 0 2px rgba(26,115,232,0.12);
        }
        .filter-label {
          font-size: 12px;
          font-weight: 600;
          color: #070707;
          display: block;
          margin-bottom: 6px;
          text-align: left;
          letter-spacing: 0.8px;
          font-family: 'Google Sans', sans-serif;
        }
        .filter-clear-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 9px 22px;
          border-radius: 7px;
          border: 1px solid #e8eaed;
          background: #fff;
          color: #5f6368;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          font-family: 'Google Sans', sans-serif;
        }
        .filter-clear-wrap {
          display: flex;
          align-items: flex-end;
        }
        /* Row wrappers — transparent on desktop (flex children), grid on mobile */
        .filter-row-2col,
        .filter-row-dates {
          display: contents;
        }
        .page-header-bar {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          height: 56px;
          border-bottom: 1px solid #e8eaed;
          flex-wrap: wrap;
          gap: 0;
        }

        /* ── Mobile Card styles ── */
        .mobile-card-scroll-wrapper {
          display: none;
          flex-direction: column;
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 16px;
        }
        .mobile-card-list { display: flex; flex-direction: column; gap: 10px; }
        .mobile-card {
          background: #fff;
          border: 1px solid #e8eaed;
          border-radius: 14px;
          padding: 14px 16px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);
          cursor: pointer;
          transition: box-shadow 0.15s;
        }
        .mobile-card:hover { box-shadow: 0 4px 12px rgba(26,115,232,0.10); }
        .mc-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
        .mc-left { display: flex; align-items: flex-start; gap: 10px; flex: 1; min-width: 0; }
        .mc-serial {
          width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
          background: #e8f0fe; color: #1a73e8;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700;
        }
        .mc-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }
        .mc-chevron { font-size: 11px; color: #9ca3af; transition: transform 0.2s; display: inline-block; }
        .mc-chevron.open { transform: rotate(180deg); }
        .mc-summary {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 8px 12px; margin-top: 12px;
          padding-top: 12px; border-top: 1px solid #f3f4f6;
        }
        .mc-detail {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 8px 12px; margin-top: 10px;
          padding-top: 10px; border-top: 1px dashed #e8eaed;
          animation: mcFadeIn 0.15s ease;
        }
        .mc-detail .mc-full { grid-column: 1 / -1; }
        .mc-lbl { font-size: 10px; color: #9aa0a6; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 2px; }
        .mc-val { font-size: 13px; font-weight: 600; color: #202124; }
        .mc-val-blue { color: #1a73e8; font-weight: 700; }
        .mc-actions { display: flex; gap: 6px; margin-top: 10px; padding-top: 10px; border-top: 1px solid #f3f4f6; }
        @keyframes mcFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

        /* ── Mobile responsive ── */
        @media (max-width: 600px) {
          .single-scroll-table-container { display: none !important; }
          .mobile-card-scroll-wrapper { display: flex !important; }
          .page-header-bar {
            height: auto;
            padding: 12px 14px;
            gap: 10px;
          }
          .page-header-bar h1 {
            font-size: 20px !important;
          }
          .filters-grid {
            flex-direction: column;
            gap: 10px;
          }
          .filter-item-search {
            flex: unset;
            width: 100%;
            min-width: unset;
          }
          /* Payment Type + Status → side by side */
          .filter-row-2col {
            display: grid !important;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            width: 100%;
          }
          /* From Date + To Date → side by side */
          .filter-row-dates {
            display: grid !important;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            width: 100%;
            min-width: 0;
          }
          .filter-row-dates .filter-item {
            min-width: 0;
            overflow: hidden;
          }
          .filter-row-dates .filter-item input[type="date"] {
            width: 100% !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
            font-size: 11px !important;
            padding: 9px 6px !important;
          }
          .filter-item {
            flex: unset;
            width: 100%;
            min-width: unset;
          }
          .filter-clear-wrap {
            width: 100%;
          }
          .filter-clear-btn {
            width: 100%;
            justify-content: center;
          }
          .pt-modal {
            max-height: 95vh;
            border-radius: 10px;
          }
          .pt-modal-body { padding: 14px; }
          .pagination-container {
            flex-wrap: wrap;
            justify-content: center;
            gap: 6px;
          }
          .col-hide-mobile { display: none !important; }
          /* Tighter filter section on mobile */
          .filter-container { padding: 12px !important; margin-bottom: 12px !important; }
          div[style*="flexShrink: 0"] { padding-top: 8px !important; }

          /* ── Compact cards: ~2 visible on screen ── */
          .mobile-card {
            padding: 10px 12px !important;
            border-radius: 10px !important;
          }
          .mc-serial {
            width: 26px !important; height: 26px !important;
            font-size: 11px !important;
          }
          .client-name { font-size: 13px !important; }
          .client-place, .client-phone { font-size: 11px !important; }
          .status-select { font-size: 11px !important; padding: 3px 7px !important; }
          .mc-summary {
            margin-top: 8px !important;
            padding-top: 8px !important;
            gap: 6px 10px !important;
          }
          .mc-lbl { font-size: 9px !important; }
          .mc-val { font-size: 12px !important; }
          .mc-chevron { font-size: 10px !important; }
          .mobile-card-list { gap: 8px !important; }
          .mobile-card-scroll-wrapper { padding-bottom: 10px !important; }
        }
      `}</style>

      <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* ── Sticky Page Header Bar ── */}
        <div className="page-header-bar">
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <h1 style={{ fontSize: 25, fontWeight: "600", color: "#050505", margin: 5, letterSpacing: "0.10px", lineHeight: 1.2 }}>
              Collections
            </h1>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
            {mode === 'my' && (
            <button 
              onClick={() => setShowPaymentForm(true)} 
              style={{ 
                display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", 
                borderRadius: 8, border: "none", background: "#1a73e8", color: "#fff", 
                fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Google Sans', sans-serif", 
                boxShadow: "0 2px 8px rgba(26,115,232,0.3)", transition: "all 0.2s", whiteSpace: "nowrap" 
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#1557b0"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#1a73e8"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              + New Payment
            </button>
            )}
          </div>
        </div>

        {/* ── Filters Section (Always Visible) ── */}
        <div style={{ flexShrink: 0, padding: "12px 16px 0 16px" }}>
          <div className="filter-container" style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: 10, padding: "18px 20px", marginBottom: 20 }}>
            <div className="filters-grid">
              {/* Search */}
              <div className="filter-item-search">
                <label className="filter-label">Search</label>
                <input 
                  className="pt-search-input"
                  type="text" 
                  placeholder="Search by client, place, phone, branch, department or service..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Payment Type + Status → one row on mobile */}
              <div className="filter-row-2col">
              {/* Payment Type */}
              <div className="filter-item">
                <label className="filter-label">Payment Type</label>
                <select 
                  className="pt-select" 
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  {collectionTypes.map(type => (
                    <option key={type} value={type}>{type === 'all' ? 'All Types' : type}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div className="filter-item">
                <label className="filter-label">Status</label>
                <select 
                  className="pt-select" 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              </div>

              {/* From Date + To Date → one row on mobile */}
              <div className="filter-row-dates">
              {/* Date From */}
              <div className="filter-item">
                <label className="filter-label">From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              {/* Date To */}
              <div className="filter-item">
                <label className="filter-label">To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              </div>

              {/* Clear Filters Button */}
              {(dateFrom || dateTo || filterStatus !== 'all') && (
                <div className="filter-clear-wrap">
                  <button 
                    className="filter-clear-btn"
                    onClick={() => { setDateFrom(''); setDateTo(''); setFilterStatus('all'); }}
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Single Scrollable Table Body Only ── */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: "0 16px 16px 16px" }}>
          
          {/* ── Count and Pagination Info ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexShrink: 0 }}>
            
          </div>

          {/* ── Table with Single Scrollbar (Only Table Scrolls) ── */}
          {filteredPayments.length > 0 ? (
            <>
              <div className="single-scroll-table-container">
                <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {headers.map(h => (
                        <th key={h} className={["Department","Paid For","Proof"].includes(h) ? "col-hide-mobile" : ""} style={{ ...thStyle, textAlign: h === "Amount" ? "right" : "left" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentPayments.map((payment, index) => (
                      <tr key={payment.id}
                        onMouseEnter={e => e.currentTarget.style.background = "#f8f9fa"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        {/* Sl. no. */}
                        <td style={{ ...tdStyle, color: "#9aa0a6", fontWeight: 600, width: 56 }}>{startIndex + index + 1}</td>
                        
                        {/* Date + Created By */}
                        <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                          <div>{formatDate(payment.date)}</div>
                          {(payment.createdByName || payment.created_by_name) && (
                            <div style={{
                              fontSize: 11, color: "#6b7280", marginTop: 3,
                              display: "flex", alignItems: "center", gap: 3, fontWeight: 500
                            }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10" style={{ flexShrink: 0 }}>
                                <circle cx="12" cy="8" r="4" />
                                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                              </svg>
                              {payment.createdByName || payment.created_by_name}
                            </div>
                          )}
                        </td>
                        
                        {/* Client Name with details */}
                        <td style={{ ...tdStyle, textAlign: 'left' }}>
                          <div className="client-info">
                            <div className="client-name">{payment.clientName}</div>
                            {payment.place && (
                              <div className="client-place">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
                                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                                  <circle cx="12" cy="9" r="2.5" />
                                </svg>
                                {payment.place}
                              </div>
                            )}
                            {payment.phoneNumber && (
                              <div className="client-phone">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
                                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                                </svg>
                                {payment.phoneNumber}
                              </div>
                            )}
                          </div>
                        </td>
                        
                        {/* Branch */}
                        <td className="branch-cell" style={{ ...tdStyle, whiteSpace: "normal", wordWrap: "break-word", maxWidth: 120 }}>{payment.branch}</td>
                        
                        {/* Department */}
                        <td className="col-hide-mobile" style={{ ...tdStyle, whiteSpace: "normal", wordWrap: "break-word", maxWidth: 180 }}>
                          {payment.department ? (
                            <span className="department-badge">
                              {payment.department}
                            </span>
                          ) : (
                            <span style={{ color: '#9ca3af', fontSize: '12px' }}>—</span>
                          )}
                        </td>
                        
                        {/* Payment Type */}
                        <td style={tdStyle}>{payment.collectionType}</td>
                        
                        {/* Amount */}
                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: "600" }}>{formatCurrency(payment.amount)}</td>
                        
                        {/* Paid For */}
                        <td className="paidfor-cell col-hide-mobile" style={{ ...tdStyle, whiteSpace: "normal", wordWrap: "break-word", maxWidth: 160 }}>{payment.paidFor}</td>
                        
                        {/* Status */}
                        <td style={tdStyle}>
                          <select
                            className={`status-select ${getStatusClass(payment.status)}`}
                            value={(payment.status === 'Failed' ? 'Rejected' : payment.status) || 'Pending'}
                            disabled={updatingId === payment.id}
                            onChange={(e) => handleStatusUpdate(payment, e.target.value)}
                          >
                            {STATUS_OPTIONS.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                        
                        {/* Proof */}
                        <td className="col-hide-mobile" style={{ ...tdStyle, textAlign: "left" }}>
                          {payment.paymentProofUrl ? (
                            <a className="file-link" href={payment.paymentProofUrl} target="_blank" rel="noopener noreferrer">
                              <VisibilityOutlinedIcon style={{ fontSize: 18 }} />
                            </a>
                          ) : (
                            <span className="no-proof">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ ...tdStyle, textAlign: "left" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button 
                              onClick={() => handleEditClick(payment)} 
                              style={{ 
                                padding: "5px 12px", borderRadius: 6, border: "none", 
                                background: "#1a73e8", color: "#fff", fontSize: 12, 
                                fontWeight: 600, cursor: "pointer", display: "flex", 
                                alignItems: "center", gap: 4, fontFamily: "'Google Sans', sans-serif" 
                              }}
                            >
                              <EditOutlinedIcon style={{ fontSize: 13 }} />
                            </button>
                            <button 
                              onClick={() => confirmDelete(payment.id)} 
                              style={{ 
                                padding: "5px 12px", borderRadius: 6, border: "none", 
                                background: "#d93025", color: "#fff", fontSize: 12, 
                                fontWeight: 600, cursor: "pointer", display: "flex", 
                                alignItems: "center", gap: 4, fontFamily: "'Google Sans', sans-serif" 
                              }}
                            >
                              <DeleteOutlineOutlinedIcon style={{ fontSize: 13 }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Pagination ── */}
              {totalPages > 1 && (
                <div className="pagination-container">
                  <button
                    className="pagination-button"
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                  >
                    ‹ Previous
                  </button>
                  
                  {getVisiblePages()[0] > 1 && (
                    <>
                      <button
                        className="pagination-button"
                        onClick={() => goToPage(1)}
                      >
                        1
                      </button>
                      {getVisiblePages()[0] > 2 && <span className="pagination-ellipsis">...</span>}
                    </>
                  )}
                  
                  {getVisiblePages().map(page => (
                    <button
                      key={page}
                      className={`pagination-button ${currentPage === page ? 'active' : ''}`}
                      onClick={() => goToPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                  
                  {getVisiblePages()[getVisiblePages().length - 1] < totalPages && (
                    <>
                      {getVisiblePages()[getVisiblePages().length - 1] < totalPages - 1 && <span className="pagination-ellipsis">...</span>}
                      <button
                        className="pagination-button"
                        onClick={() => goToPage(totalPages)}
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                  
                  <button
                    className="pagination-button"
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                  >
                    Next ›
                  </button>
                </div>
              )}

              {/* ── Mobile Card List (hidden on desktop via CSS) ── */}
              <div className="mobile-card-scroll-wrapper">
                <div className="mobile-card-list">
                {currentPayments.map((payment, index) => (
                  <MobileCard
                    key={payment.id}
                    payment={payment}
                    index={index}
                    startIndex={startIndex}
                    STATUS_OPTIONS={STATUS_OPTIONS}
                    updatingId={updatingId}
                    onStatusUpdate={handleStatusUpdate}
                    onEdit={handleEditClick}
                    onDelete={confirmDelete}
                    editLoading={editLoading}
                  />
                ))}
                {/* Mobile pagination */}
                {totalPages > 1 && (
                  <div className="pagination-container">
                    <button className="pagination-button" onClick={goToPreviousPage} disabled={currentPage === 1}>‹ Prev</button>
                    {getVisiblePages().map(page => (
                      <button key={page} className={`pagination-button ${currentPage === page ? 'active' : ''}`} onClick={() => goToPage(page)}>{page}</button>
                    ))}
                    <button className="pagination-button" onClick={goToNextPage} disabled={currentPage === totalPages}>Next ›</button>
                  </div>
                )}
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "left", padding: "60px 20px", background: "#fff", border: "1px solid #e8eaed", borderRadius: 10, color: "#5f6368", fontSize: 14, fontFamily: "'Google Sans', sans-serif" }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#202124", marginBottom: 6 }}>No payments found</div>
              <div>Try adjusting your filters or add a new payment.</div>
            </div>
          )}
        </div>
      </div>

      {/* ── New Payment Modal ── */}
      {showPaymentForm && (
        <div className="pt-modal-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) setShowPaymentForm(false); }}>
          <div className="pt-modal">
            <div className="pt-modal-header">
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>New Payment</h3>
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
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Edit Payment #{editingPayment.id}</h3>
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