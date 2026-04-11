import React, { useState, useEffect, useCallback } from 'react';
import PaymentForm from './collection';
import { fetchPayments, fetchPaymentById, deletePayment, updatePaymentStatus, updatePayment, normalizePayment } from '../service/payment';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';

const BASE_URL = 'https://erp.flashinnovations.in/api';

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
      payment.paidFor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (payment.department && payment.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (payment.place && payment.place.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (payment.phoneNumber && payment.phoneNumber.includes(searchTerm));
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

  // Table headers - Updated order: Sl. no., Date, Client Name, Branch, Department, Payment Type, Amount, Paid For, Status, Proof, Action
  const headers = [
    "Sl. no.", "Date", "Client Name", "Branch", "Department", "Payment Type", 
    "Amount", "Paid For", "Status", "Proof", "Action"
  ];

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

  // Table styles matching Vehicle Master
  const thStyle = { 
    fontSize: 14, 
    fontWeight: 600, 
    letterSpacing: "0.4px", 
    color: "#0a0a0a", 
    textAlign: "left", 
    padding: "11px 14px", 
    background: "#f8f9fa", 
    borderBottom: "1px solid #e8eaed", 
    fontFamily: "'Google Sans', sans-serif", 
    whiteSpace: "nowrap", 
    textTransform: "capitalize" 
  };
  
  const tdStyle = { 
    padding: "12px 14px", 
    fontSize: 13, 
    borderBottom: "1px solid #e8eaed", 
    fontFamily: "'Google Sans', sans-serif", 
    color: "#202124", 
    textAlign: "left", 
    verticalAlign: "middle" 
  };

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
          font-size: 12px;
          font-weight:bold;
          border: none;
          cursor: pointer;
          text-align: left;
          outline: none;
          font-family: 'Google Sans', sans-serif;
        }
        .status-select:disabled { cursor: not-allowed; opacity: 0.6; }
        .status-select.pill-green { background:#188038 ; color: #f6faf7; }
        .status-select.pill-amber { background: rgb(26, 115, 232); color: #faf9fc; }
        .status-select.pill-red { background: #fc5032f5; color: #f5f1f1; }
        .status-select.pill-muted { background:#5f6368; colorrgb(249, 250, 252)68; }
        
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
        
        .client-info { display: flex; flex-direction: column; gap: 4px; }
        .client-name { font-weight: 600; color: #111827; font-size: 13px; }
        .client-place { font-size: 11px; color: #0c0c0c; display: flex; align-items: center; gap: 4px; }
        .client-phone { font-size: 11px; color: #0a0a0a; display: flex; align-items: center; gap: 4px; margin-top: 2px; }
        .client-place svg, .client-phone svg { width: 11px; height: 11px; opacity: 0.7; flex-shrink: 0; }
        
        .department-badge {
          display: inline-block;
         
          border-radius: 6px;
          font-size: 12px;
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
      `}</style>

      <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* ── Sticky Page Header Bar ── */}
        <div style={{ 
          flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", 
          padding: "0 16px", height: 56, borderBottom: "1px solid #e8eaed", 
          gap: 8, flexWrap: "wrap" 
        }}>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: "#202124", margin: 5, letterSpacing: "0.10px", lineHeight: 1.2 }}>
              Collections
            </h1>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
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
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>

          {/* ── Filters Section ── */}
          <div style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: 10, padding: "18px 20px", marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
              {/* Search */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#5f6368", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: "'Google Sans', sans-serif" }}>
                  Search
                </label>
                <input 
                  className="pt-search-input"
                  type="text" 
                  placeholder="Search by client, place, phone, branch, department or service..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ 
                    width: "100%", padding: "9px 12px", border: "1px solid #e8eaed", 
                    borderRadius: 7, fontSize: 13, fontFamily: "'Google Sans', sans-serif", 
                    outline: "none", transition: "border 0.2s, box-shadow 0.2s", 
                    boxSizing: "border-box" 
                  }}
                />
              </div>

              {/* Payment Type */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#5f6368", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: "'Google Sans', sans-serif" }}>
                  Payment Type
                </label>
                <select 
                  className="pt-select" 
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  style={{ 
                    padding: "9px 12px", border: "1px solid #e8eaed", borderRadius: 7, 
                    fontSize: 13, background: "#fff", color: "#202124", cursor: "pointer", 
                    fontFamily: "'Google Sans', sans-serif", outline: "none", minWidth: 160 
                  }}
                >
                  {collectionTypes.map(type => (
                    <option key={type} value={type}>{type === 'all' ? 'All Types' : type}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#5f6368", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: "'Google Sans', sans-serif" }}>
                  Status
                </label>
                <select 
                  className="pt-select" 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{ 
                    padding: "9px 12px", border: "1px solid #e8eaed", borderRadius: 7, 
                    fontSize: 13, background: "#fff", color: "#202124", cursor: "pointer", 
                    fontFamily: "'Google Sans', sans-serif", outline: "none", minWidth: 140 
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                  <option value="Failed">Failed</option>
                </select>
              </div>

              {/* Date From */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#5f6368", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: "'Google Sans', sans-serif" }}>
                  From Date
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  style={{ 
                    padding: "9px 12px", border: "1px solid #e8eaed", borderRadius: 7, 
                    fontSize: 13, background: "#fff", color: "#202124", cursor: "pointer", 
                    fontFamily: "'Google Sans', sans-serif", outline: "none", minWidth: 140 
                  }}
                />
              </div>

              {/* Date To */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#5f6368", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.8px", fontFamily: "'Google Sans', sans-serif" }}>
                  To Date
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  style={{ 
                    padding: "9px 12px", border: "1px solid #e8eaed", borderRadius: 7, 
                    fontSize: 13, background: "#fff", color: "#202124", cursor: "pointer", 
                    fontFamily: "'Google Sans', sans-serif", outline: "none", minWidth: 140 
                  }}
                />
              </div>

              {/* Clear Filters Button */}
              {(dateFrom || dateTo || filterStatus !== 'all') && (
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <button 
                    onClick={() => { setDateFrom(''); setDateTo(''); setFilterStatus('all'); }}
                    style={{ 
                      display: "flex", alignItems: "center", gap: 6, padding: "9px 22px", 
                      borderRadius: 7, border: "1px solid #e8eaed", background: "#fff", 
                      color: "#5f6368", fontWeight: 600, fontSize: 13, cursor: "pointer", 
                      fontFamily: "'Google Sans', sans-serif" 
                    }}
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Count ── */}
          <div style={{ marginBottom: 16, fontSize: 13, color: "#5f6368", fontFamily: "'Google Sans', sans-serif", fontWeight: 600 }}>
            {filteredPayments.length} payment{filteredPayments.length !== 1 ? "s" : ""} found
          </div>

          {/* ── Table ── */}
          {filteredPayments.length > 0 ? (
            <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e8eaed", overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {headers.map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((payment, index) => (
                      <tr key={payment.id}
                        onMouseEnter={e => e.currentTarget.style.background = "#f8f9fa"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        {/* Sl. no. */}
                        <td style={{ ...tdStyle, color: "#9aa0a6", fontWeight: 600, width: 56 }}>{index + 1}</td>
                        
                        {/* Date */}
                        <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{formatDate(payment.date)}</td>
                        
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
                        <td style={{ ...tdStyle, whiteSpace: "normal", wordWrap: "break-word", maxWidth: 180 }}>
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
                        <td style={{ ...tdStyle, textAlign: "left", fontWeight: "600" }}>{formatCurrency(payment.amount)}</td>
                        
                        {/* Paid For */}
                        <td className="paidfor-cell" style={{ ...tdStyle, whiteSpace: "normal", wordWrap: "break-word", maxWidth: 160 }}>{payment.paidFor}</td>
                        
                        {/* Status */}
                        <td style={tdStyle}>
                          <select
                            className={`status-select ${getStatusClass(payment.status)}`}
                            value={payment.status || 'Pending'}
                            disabled={updatingId === payment.id}
                            onChange={(e) => handleStatusUpdate(payment, e.target.value)}
                          >
                            {STATUS_OPTIONS.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                        
                        {/* Proof */}
                        <td style={{ ...tdStyle, textAlign: "left" }}>
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
            </div>
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