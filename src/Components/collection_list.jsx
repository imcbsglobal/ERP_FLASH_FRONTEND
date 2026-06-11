import React, { useState, useEffect, useCallback } from 'react';
import PaymentForm from './collection';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import AddTaskIcon from '@mui/icons-material/AddTask';
import { fetchPayments, fetchPaymentById, deletePayment, updatePaymentStatus, updatePayment, normalizePayment, ENDPOINTS, authHeaders, apiFetch, authService } from '../service/Api';

class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthError';
  }
}

// ── Mobile Card Component ──────────────────────────────────────
function MobileCard({ payment, index, startIndex, STATUS_OPTIONS, updatingId, onStatusUpdate, onEdit, onDelete, editLoading, mode, isAdmin, isSuperAdmin, cashReceived, cashAmount, onViewProof, onCompletePendingAmount }) {
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
  const canEdit = isAdmin;
  const canDelete = isSuperAdmin;
  const canEditDelete = canEdit || canDelete;
  const statusDisabled = updatingId === payment.id || !isAdmin;
  
  // Calculate pending amount
  const cashReceivedValue = cashReceived === true && cashAmount ? parseFloat(cashAmount) : 0;
  const pendingAmount = Math.max(0, payment.amount - cashReceivedValue);

  return (
    <div className="mobile-card">
      {/* Header */}
      <div className="mc-head">
        <div className="mc-left">
          <div className="mc-serial">#{startIndex + index + 1}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="client-name">{payment.clientName}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 8px', marginTop: 3 }}>
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
            disabled={statusDisabled}
            onClick={e => e.stopPropagation()}
            onChange={e => { e.stopPropagation(); onStatusUpdate(payment, e.target.value); }}
          >
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Always-visible summary — 2-col compact grid */}
      <div className="mc-summary">
        <div>
          <div className="mc-lbl">Date</div>
          <div className="mc-val">{formatDate(payment.date)}</div>
          {(payment.createdByName || payment.created_by_name) && (
            <div style={{ fontSize: 10, color: "#5f6368", marginTop: 1, display: "flex", alignItems: "center", gap: 3, fontWeight: 500 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="9" height="9" style={{ flexShrink: 0 }}>
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
        <div>
          <div className="mc-lbl">Cash Received</div>
          <div className="mc-val">
            {cashReceived === true ? (
              <div>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "#e6f4ea", color: "#188038", borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                  ✓ Yes
                </span>
                {cashAmount && (
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#188038", marginTop: 2 }}>
                    ₹{parseFloat(cashAmount).toLocaleString('en-IN')}
                  </div>
                )}
              </div>
            ) : cashReceived === false ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "#fce8e6", color: "#c5221f", borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                ✗ No
              </span>
            ) : (
              <span style={{ color: "#9ca3af", fontSize: 12 }}>—</span>
            )}
          </div>
        </div>
        <div>
          <div className="mc-lbl">Pending Amount</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
            <div className="mc-val" style={{ color: pendingAmount > 0.01 ? "#e67e22" : "#188038", fontWeight: 700 }}>
              {formatCurrency(pendingAmount)}
            </div>
            {pendingAmount > 0.01 && (
              <button
                onClick={(e) => { e.stopPropagation(); onCompletePendingAmount(payment); }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px',
                  borderRadius: '4px',
                  color: '#1a73e8'
                }}
                title="Complete pending amount"
              >
                <AddTaskIcon style={{ fontSize: '14px' }} />
              </button>
            )}
          </div>
        </div>
        {payment.paymentProofUrl && (
          <div>
            <div className="mc-lbl">Proof</div>
            <button className="file-link" style={{ background: "none", border: "none", cursor: "pointer", padding: 0, gap: 3 }}
              onClick={e => { e.stopPropagation(); onViewProof(payment.paymentProofUrl); }}>
              <VisibilityOutlinedIcon style={{ fontSize: 16 }} /> View
            </button>
          </div>
        )}
        {payment.notes && (
          <div style={{ gridColumn: '1 / -1' }}>
            <div className="mc-lbl">Notes</div>
            <div className="mc-val" style={{ fontSize: 11, lineHeight: 1.4, wordBreak: 'break-word' }}>{payment.notes}</div>
          </div>
        )}
      </div>

      {/* Edit / Delete buttons — role-based visibility */}
      {canEditDelete && (
        <div className="mc-actions" onClick={e => e.stopPropagation()}>
          {canEdit && (
            <button
              onClick={() => onEdit(payment)}
              style={{ flex: 1, padding: '6px 0', borderRadius: 7, border: 'none', background: '#1a73e8', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: "'Google Sans', sans-serif" }}
            >
              <EditOutlinedIcon style={{ fontSize: 13 }} /> Edit
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => onDelete(payment.id)}
              style={{ flex: 1, padding: '6px 0', borderRadius: 7, border: 'none', background: '#d93025', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: "'Google Sans', sans-serif" }}
            >
              <DeleteOutlineOutlinedIcon style={{ fontSize: 13 }} /> Delete
            </button>
          )}
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
  const userRole = (() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return u?.role || 'User';
    } catch { return 'User'; }
  })();
  const isAdmin = userRole === 'Admin' || userRole === 'Super Admin' || ((() => { try { return JSON.parse(localStorage.getItem('user') || '{}')?.is_staff === true; } catch { return false; } })());
  const isSuperAdmin = userRole === 'Super Admin';
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthError, setIsAuthError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBranch, setFilterBranch] = useState('all');
  const [branchList, setBranchList] = useState([]);
  const [userBranchName, setUserBranchName] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  
  // Cash received map: merged from API data + any popup answers in this session
  const [cashReceivedMap, setCashReceivedMap] = useState({});
  const [cashAmountMap, setCashAmountMap] = useState({});
  const [proofViewer, setProofViewer] = useState(null);

  // State for pending amount completion
  const [pendingCompletionPayment, setPendingCompletionPayment] = useState(null);
  const [pendingAmountInput, setPendingAmountInput] = useState('');
  const [completingPending, setCompletingPending] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

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
      if (searchTerm) params.append('search', searchTerm);
      if (filterType !== 'all') params.append('collection_type', filterType);
      if (mode === 'my') {
        params.append('my_payments', 'true');
      }

      const data = await apiFetch(
        `${ENDPOINTS.payments}?${params}`,
        { headers: authHeaders({ Accept: 'application/json' }) }
      );

      const list = Array.isArray(data) ? data : (data.results ?? []);
      const normalized = list.map(normalizePayment);
      setPayments(normalized);
      
      // Seed cashReceivedMap and cashAmountMap from API
      const nextReceived = {};
      const nextAmount = {};
      normalized.forEach(p => {
        if (p.cashReceived !== null && p.cashReceived !== undefined) {
          nextReceived[p.id] = p.cashReceived;
        }
        if (p.cashAmount !== null && p.cashAmount !== undefined) {
          nextAmount[p.id] = p.cashAmount;
        }
      });
      setCashReceivedMap(nextReceived);
      setCashAmountMap(nextAmount);
      setCurrentPage(1);
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

  // ── Fetch branch list + set default branch filter from logged-in user ──────
  useEffect(() => {
    const initBranches = async () => {
      // 1. Fetch departments from FlashERP for the branch dropdown
      try {
        const data = await apiFetch(ENDPOINTS.departments, { headers: authHeaders() });
        const raw = Array.isArray(data) ? data : (data?.data ?? data?.results ?? []);
        setBranchList(raw.map(d => d.department).filter(Boolean).sort());
      } catch { /* ignore */ }

      // 2. Get live branch_id for the logged-in user from /auth/me/
      try {
        const me = await authService.getMe();
        if (me) localStorage.setItem('user', JSON.stringify(me));
        if (me?.branch_id) {
          // Resolve branch name from branch list or fetch directly
          const branchData = await apiFetch(ENDPOINTS.branches, { headers: authHeaders() });
          const allBranches = Array.isArray(branchData) ? branchData : (branchData?.results ?? []);
          const match = allBranches.find(b => String(b.id) === String(me.branch_id));
          if (match?.name) {
            setUserBranchName(match.name);
            // For Admin & Super Admin: default to their own branch but allow changing
            // For regular User: lock to their branch
            setFilterBranch(match.name);
          }
        }
        // If no branch_id (e.g. platform-wide admin), stay on 'all'
      } catch { /* fallback: stay on 'all' */ }
    };
    initBranches();
  }, []);

  // ── Reset page when branch filter changes ──────────────────────
  useEffect(() => { setCurrentPage(1); }, [filterBranch]);

  // ── Add new payment from PaymentForm ──────────────────────────
  const handleNewPayment = async (normalizedPayment) => {
    setShowPaymentForm(false);
    if (normalizedPayment?.id != null) {
      if (normalizedPayment.cashReceived !== undefined) {
        setCashReceivedMap(prev => ({ ...prev, [normalizedPayment.id]: normalizedPayment.cashReceived }));
      }
      if (normalizedPayment.cashAmount !== undefined) {
        setCashAmountMap(prev => ({ ...prev, [normalizedPayment.id]: normalizedPayment.cashAmount }));
      }
    }
    await loadPayments();
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
    if (updatedPayment.cashReceived !== undefined) {
      setCashReceivedMap(prev => ({ ...prev, [updatedPayment.id]: updatedPayment.cashReceived }));
    }
    if (updatedPayment.cashAmount !== undefined) {
      setCashAmountMap(prev => ({ ...prev, [updatedPayment.id]: updatedPayment.cashAmount }));
    }
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
      await apiFetch(ENDPOINTS.payment(id), {
        method: 'DELETE',
        headers: authHeaders(),
      });
      setPayments(prev => prev.filter(p => p.id !== id));
      setCashReceivedMap(prev => { const next = { ...prev }; delete next[id]; return next; });
      setCashAmountMap(prev => { const next = { ...prev }; delete next[id]; return next; });
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
      const updated = await apiFetch(ENDPOINTS.paymentStatus(payment.id), {
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

  // ── Handle pending amount completion ──────────────────────────
  const handleCompletePendingAmount = async (payment) => {
    const cashReceived = cashReceivedMap[payment.id];
    const cashAmountVal = cashAmountMap[payment.id];
    const currentPendingAmount = cashReceived === true && cashAmountVal ? payment.amount - parseFloat(cashAmountVal) : payment.amount;
    
    setPendingCompletionPayment(payment);
    setPendingAmountInput(currentPendingAmount.toString());
  };

  const handleSubmitPendingCompletion = async () => {
    if (!pendingCompletionPayment) return;
    
    const pendingAmount = parseFloat(parseFloat(pendingAmountInput).toFixed(2));
    if (isNaN(pendingAmount) || pendingAmount <= 0) {
      alert('Please enter a valid pending amount');
      return;
    }
    
    // Get current cash received amount
    const currentCashAmount = parseFloat(cashAmountMap[pendingCompletionPayment.id] || 0);
    const newCashAmount = parseFloat((currentCashAmount + pendingAmount).toFixed(2));
    
    // Check if new cash amount exceeds total amount
    if (newCashAmount > pendingCompletionPayment.amount) {
      alert('Total cash received cannot exceed the payment amount');
      return;
    }
    
    setCompletingPending(true);
    try {
      // Update the payment with new cash received amount
      const updatedPayment = await apiFetch(ENDPOINTS.payment(pendingCompletionPayment.id), {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          cash_received: true,
          cash_amount: newCashAmount,
        }),
      });
      
      // Update local state
      setCashReceivedMap(prev => ({ ...prev, [pendingCompletionPayment.id]: true }));
      setCashAmountMap(prev => ({ ...prev, [pendingCompletionPayment.id]: newCashAmount }));
      setPayments(prev => prev.map(p => p.id === pendingCompletionPayment.id ? normalizePayment(updatedPayment) : p));
      
      // Close modal
      setPendingCompletionPayment(null);
      setPendingAmountInput('');
      
      alert('Pending amount updated successfully!');
    } catch (err) {
      console.error('Failed to update pending amount:', err);
      alert(`Failed to update: ${err.message}`);
    } finally {
      setCompletingPending(false);
    }
  };

  // ── Client-side filter ─────────────────────────────────────────
  const filteredPayments = payments.filter(payment => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      (payment.clientName || '').toLowerCase().includes(search) ||
      (payment.branch || '').toLowerCase().includes(search) ||
      (payment.paidFor || '').toLowerCase().includes(search) ||
      (payment.department || '').toLowerCase().includes(search) ||
      (payment.place || '').toLowerCase().includes(search) ||
      (payment.phoneNumber || '').includes(searchTerm);
    const matchesType = filterType === 'all' || payment.collectionType === filterType;
    const matchesStatus = filterStatus === 'all' || (payment.status || '').toLowerCase() === filterStatus.toLowerCase();
    const matchesBranch = filterBranch === 'all' || (
      (payment.branch || '').trim().toLowerCase() === filterBranch.trim().toLowerCase() &&
      payment.branch !== 'undefined'
    );
    const payDate = payment.date ? new Date(payment.date) : null;
    const matchesFrom = !dateFrom || (payDate && payDate >= new Date(dateFrom));
    const matchesTo = !dateTo || (payDate && payDate <= new Date(dateTo + 'T23:59:59'));
    const matchesUser = mode !== 'my' ? true : (() => {
      const uid = loggedInUser.id;
      const createdBy = payment.created_by != null ? payment.created_by : (payment.created_by_id != null ? payment.created_by_id : null);
      if (uid && createdBy != null) {
        return String(createdBy) === String(uid);
      }
      return true;
    })();
    return matchesSearch && matchesType && matchesStatus && matchesBranch && matchesFrom && matchesTo && matchesUser;
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
  const branchOptions = ['all', ...branchList];

  // Table headers - Added "Pending Amount" column
  const canEditRows = isAdmin;     // Admin + Super Admin can edit
  const canDeleteRows = isSuperAdmin; // Only Super Admin can delete
  const canActOnRows = isAdmin;
  const headers = [
    "Sl. no.", "Date", "Client Name", "Branch",
    "Payment Type", "Amount", "Paid For", "Cash Received", "Pending Amount", "Status", "Proof",
    ...(canActOnRows ? ["Action"] : []),
  ];

  const thStyle = { 
    fontSize: 12, 
    fontWeight: 600, 
    letterSpacing: "0.4px", 
    color: "#fcfbfb", 
    textAlign: "left", 
    padding: "7px 14px", 
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
    padding: "4px 14px", 
    fontSize: 12, 
    borderBottom: "1px solid #e8eaed", 
    fontFamily: "'Google Sans', sans-serif", 
    color: "#202124", 
    textAlign: "left", 
    verticalAlign: "middle",
    whiteSpace: "nowrap",
    lineHeight: "1.2",
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
    <div className="pt-root-container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&display=swap');
        * { font-family: 'Google Sans', sans-serif; }
        
        .pt-search-input::placeholder { color: #9aa0a6; }
        .pt-search-input:focus { border-color: #1a73e8 !important; box-shadow: 0 0 0 2px rgba(26,115,232,0.12); }
        
        .status-select {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: bold;
          border: none;
          cursor: pointer;
          text-align: left;
          outline: none;
          font-family: 'Google Sans', sans-serif;
          background-color: transparent;
          color: #333;
        }
        .status-select:disabled { cursor: not-allowed; opacity: 0.6; }
        .status-select.pill-green { background: #188038 !important; color: #f6faf7 !important; }
        .status-select.pill-amber { background: rgb(247, 170, 4) !important; color: #faf9fc !important; }
        .status-select.pill-red { background: #d35741f5 !important; color: #f5f1f1 !important; }
        .status-select.pill-muted { background: #5f6368 !important; color: #fff !important; }
        
        .file-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #1a73e8;
          text-decoration: none;
          transition: color 0.2s;
        }
        .file-link:hover { color: #1557b0; }
        
        .no-proof { color: #cbd5e1; font-size: 0.78rem; }
        
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
        .client-name { font-weight: 600; color: #111827; font-size: 11px; white-space: normal; word-break: break-word; line-height: 1.3; }
        .client-place { font-size: 13px; color: #0c0c0c; display: flex; align-items: center; gap: 2px; }
        .client-phone { font-size: 13px; color: #0a0a0a; display: flex; align-items: center; gap: 2px; margin-top: 0; }
        .client-place svg, .client-phone svg { width: 11px; height: 11px; opacity: 0.7; flex-shrink: 0; }
        
        .department-badge {
          display: inline-block;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 500;
          color: #202124;
          word-wrap: break-word;
          white-space: normal;
          line-height: 1.3;
        }
        
        .branch-cell, .paidfor-cell {
          white-space: normal;
          word-wrap: break-word;
        }

        .single-scroll-table-container {
          flex: 1;
          min-height: 0;
          overflow: auto;
          background: #fff;
          border-radius: 10px;
          border: 1px solid #e8eaed;
        }
        
        .data-table {
          width: max-content;
          min-width: 100%;
          border-collapse: collapse;
          table-layout: auto;
        }
        
        .data-table thead tr th {
          position: sticky;
          top: 0;
          z-index: 10;
          background: #017efc;
        }

        .pagination-container {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          padding: 6px 0;
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

        .filters-grid {
          display: flex;
          gap: 8px;
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
          padding: 6px 12px;
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
          margin-bottom: 3px;
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
          height: 46px;
          border-bottom: 1px solid #e8eaed;
          flex-wrap: wrap;
          gap: 0;
        }

        .pt-root-container {
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .mobile-card-scroll-wrapper {
          display: none;
          flex-direction: column;
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
          padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 80px);
        }
        .mobile-card-list { display: flex; flex-direction: column; gap: 8px; }
        .mobile-card {
          background: #fff;
          border: 1px solid #e8eaed;
          border-radius: 12px;
          padding: 10px 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .mc-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
        .mc-left { display: flex; align-items: flex-start; gap: 8px; flex: 1; min-width: 0; }
        .mc-serial {
          width: 26px; height: 26px; border-radius: 7px; flex-shrink: 0;
          background: #e8f0fe; color: #1a73e8;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700;
        }
        .mc-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
        .mc-summary {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 6px 10px; margin-top: 8px;
          padding-top: 8px; border-top: 1px solid #f3f4f6;
        }
        .mc-lbl { font-size: 9px; color: #9aa0a6; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 1px; }
        .mc-val { font-size: 12px; font-weight: 600; color: #202124; word-break: break-word; }
        .mc-val-blue { color: #1a73e8; font-weight: 700; }
        .mc-actions { display: flex; gap: 6px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #f3f4f6; }

        @media (max-width: 600px) {
          .pt-root-container {
            height: 100dvh !important;
            max-height: 100dvh !important;
            overflow: hidden !important;
          }
          .single-scroll-table-container { display: none !important; }
          .mobile-card-scroll-wrapper {
            display: flex !important;
            padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 80px) !important;
          }
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
          .filter-row-2col {
            display: grid !important;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            width: 100%;
          }
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
          .filter-container { padding: 12px !important; margin-bottom: 12px !important; }
          .mobile-card { padding: 9px 11px !important; border-radius: 10px !important; }
          .mc-serial { width: 24px !important; height: 24px !important; font-size: 10px !important; }
          .client-name { font-size: 12px !important; }
          .client-place, .client-phone { font-size: 10px !important; }
          .status-select { font-size: 11px !important; padding: 3px 7px !important; }
          .mc-summary { margin-top: 6px !important; padding-top: 6px !important; gap: 5px 8px !important; }
          .mc-lbl { font-size: 9px !important; }
          .mc-val { font-size: 11px !important; }
          .mobile-card-list { gap: 7px !important; }
          .mobile-card-scroll-wrapper { padding-bottom: 10px !important; }
          .desktop-pagination-only { display: none !important; }
        }
      
        .imcb-footer {
          text-align: center;
          padding: 12px 16px;
          margin-top: 8px;
          border-top: 1px solid #e8eaed;
          font-size: 12px;
          color: #9aa0a6;
          font-family: 'Google Sans', sans-serif;
          letter-spacing: 0.01em;
          flex-shrink: 0;
          background: #fff;
          width: 100%;
          box-sizing: border-box;
        }
        @media (max-width: 600px) {
          .imcb-footer {
            padding: 10px 12px;
            font-size: 11px;
            margin-top: 4px;
          }
        }
      `}</style>

      {/* Page Header Bar */}
      <div className="page-header-bar">
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h1 style={{ fontSize: 25, fontWeight: "600", color: "#050505", margin: 5, letterSpacing: "0.10px", lineHeight: 1.2 }}>
            {mode === 'my' ? 'My Collections' : 'Collection Report'}
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
            >
              + New Payment
            </button>
          )}
        </div>
      </div>

      {/* Filters Section */}
      <div style={{ flexShrink: 0, padding: "8px 16px 0 16px" }}>
        <div className="filter-container" style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: 10, padding: "10px 14px", marginBottom: 10 }}>
          <div className="filters-grid">
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
            <div className="filter-row-2col">
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
              <div className="filter-item">
                <label className="filter-label">Branch</label>
                {isAdmin ? (
                  <select
                    className="pt-select"
                    value={filterBranch}
                    onChange={(e) => setFilterBranch(e.target.value)}
                  >
                    <option value="all">All Branches</option>
                    {branchList.filter(b => b != null && b !== '').map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                ) : (
                  <select className="pt-select" value={filterBranch} disabled>
                    <option value={filterBranch}>{filterBranch || 'My Branch'}</option>
                  </select>
                )}
              </div>
            </div>
            <div className="filter-row-dates">
              <div className="filter-item">
                <label className="filter-label">From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="filter-item">
                <label className="filter-label">To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
            {(dateFrom || dateTo || filterStatus !== 'all' || filterBranch !== 'all') && (
              <div className="filter-clear-wrap">
                <button 
                  className="filter-clear-btn"
                  onClick={() => { setDateFrom(''); setDateTo(''); setFilterStatus('all'); setFilterBranch(userBranchName || 'all'); }}
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column", padding: "0 16px 8px 16px" }}>
        {filteredPayments.length > 0 ? (
          <>
            <div className="single-scroll-table-container">
              <table className="data-table" style={{ borderCollapse: "collapse" }}>
                <colgroup>
                  <col style={{ width: "1%", whiteSpace: "nowrap" }} />
                  <col style={{ width: "1%", whiteSpace: "nowrap" }} />
                  <col style={{ width: "1%", whiteSpace: "nowrap" }} />
                  <col style={{ width: "1%", whiteSpace: "nowrap" }} />
                  <col style={{ width: "1%", whiteSpace: "nowrap" }} />
                  <col style={{ width: "1%", whiteSpace: "nowrap" }} />
                  <col style={{ width: "1%", whiteSpace: "nowrap" }} />
                  <col style={{ width: "1%", whiteSpace: "nowrap" }} />
                  <col style={{ width: "1%", whiteSpace: "nowrap" }} />
                  <col style={{ width: "1%", whiteSpace: "nowrap" }} />
                  <col style={{ width: "1%", whiteSpace: "nowrap" }} />
                  {canActOnRows && <col style={{ width: "1%", whiteSpace: "nowrap" }} />}
                </colgroup>
                <thead>
                  <tr>
                    {headers.map(h => (
                      <th key={h} className={["Branch","Paid For","Proof","Cash Received","Pending Amount"].includes(h) ? "col-hide-mobile" : ""} style={{ ...thStyle, textAlign: h === "Amount" || h === "Pending Amount" ? "right" : "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentPayments.map((payment, index) => {
                    const cashReceived = cashReceivedMap[payment.id];
                    const cashAmountVal = cashAmountMap[payment.id];
                    // Calculate pending amount
                    const cashReceivedValue = cashReceived === true && cashAmountVal ? parseFloat(cashAmountVal) : 0;
                    const pendingAmount = Math.max(0, payment.amount - cashReceivedValue);
                    
                    return (
                      <tr key={payment.id}
                        onMouseEnter={e => e.currentTarget.style.background = "#f8f9fa"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <td style={{ ...tdStyle, color: "#9aa0a6", fontWeight: 600, width: 56 }}>{startIndex + index + 1}</td>
                        <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                          <div style={{ fontWeight: 500 }}>{formatDate(payment.date)}</div>
                          {(payment.createdByName || payment.created_by_name) && (
                            <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 1, fontSize: 10, color: "#0a0a0a", fontWeight: 500 }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10" style={{ flexShrink: 0 }}>
                                <circle cx="12" cy="8" r="4" />
                                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                              </svg>
                              {payment.createdByName || payment.created_by_name}
                            </div>
                          )}
                        </td>
                        <td style={{ ...tdStyle, whiteSpace: "normal", wordBreak: "break-word", maxWidth: 180, textAlign: 'left' }}>
                          <div className="client-info">
                            <div className="client-name">{payment.clientName}</div>
                          </div>
                        </td>
                        <td className="col-hide-mobile" style={{ ...tdStyle, whiteSpace: "normal", wordWrap: "break-word" }}>
                          {payment.branch ? (
                            <span className="department-badge">{payment.branch}</span>
                          ) : (
                            <span style={{ color: '#9ca3af', fontSize: '12px' }}>—</span>
                          )}
                        </td>
                        <td style={tdStyle}>{payment.collectionType}</td>
                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: "600" }}>{formatCurrency(payment.amount)}</td>
                        <td className="paidfor-cell col-hide-mobile" style={{ ...tdStyle, whiteSpace: "normal", wordWrap: "break-word" }}>{payment.paidFor}</td>
                        
                        {/* Cash Received Column */}
                        <td className="col-hide-mobile" style={{ ...tdStyle, textAlign: "center" }}>
                          {cashReceived === true ? (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                              <span style={{ 
                                display: "inline-flex", alignItems: "center", gap: 4, 
                                background: "#e6f4ea", color: "#188038", 
                                borderRadius: 6, padding: "3px 10px", 
                                fontSize: 12, fontWeight: 700 
                              }}>
                                ✓ Yes
                              </span>
                              {cashAmountVal && (
                                <div style={{ fontSize: 13, fontWeight: 600, color: "#188038", marginTop: 1, textAlign: "right", width: "100%" }}>
                                  ₹{parseFloat(cashAmountVal).toLocaleString('en-IN')}
                                </div>
                              )}
                            </div>
                          ) : cashReceived === false ? (
                            <span style={{ 
                              display: "inline-flex", alignItems: "center", gap: 4, 
                              background: "#fce8e6", color: "#c5221f", 
                              borderRadius: 6, padding: "3px 10px", 
                              fontSize: 12, fontWeight: 700 
                            }}>
                              ✗ No
                            </span>
                          ) : (
                            <span style={{ color: "#cbd5e1", fontSize: 12 }}>—</span>
                          )}
                        </td>
                        
                        {/* Pending Amount Column with AddTask Icon */}
                        <td className="col-hide-mobile" style={{ ...tdStyle, textAlign: "right" }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                            <span style={{ 
                              fontWeight: 700, 
                              color: pendingAmount > 0.01 ? "#e67e22" : "#188038",
                              fontSize: 12
                            }}>
                              {formatCurrency(pendingAmount)}
                            </span>
                            {pendingAmount > 0.01 && (
                              <button
                                onClick={() => handleCompletePendingAmount(payment)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '4px',
                                  borderRadius: '4px',
                                  color: '#1a73e8',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#e8f0fe'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                title="Complete pending amount"
                              >
                                <AddTaskIcon style={{ fontSize: '18px' }} />
                              </button>
                            )}
                          </div>
                        </td>
                        
                        <td style={tdStyle}>
                          <select
                            className={`status-select ${getStatusClass(payment.status)}`}
                            value={(payment.status === 'Failed' ? 'Rejected' : payment.status) || 'Pending'}
                            disabled={updatingId === payment.id || !isAdmin}
                            onChange={(e) => handleStatusUpdate(payment, e.target.value)}
                          >
                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="col-hide-mobile" style={{ ...tdStyle, textAlign: "left" }}>
                          {payment.paymentProofUrl ? (
                            <button className="file-link" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                              onClick={() => setProofViewer(payment.paymentProofUrl)}>
                              <VisibilityOutlinedIcon style={{ fontSize: 18 }} />
                            </button>
                          ) : (
                            <span className="no-proof">—</span>
                          )}
                        </td>
                        {canActOnRows && (
                          <td style={{ ...tdStyle, textAlign: "left" }}>
                            <div style={{ display: "flex", gap: 6 }}>
                              {canEditRows && (
                                <button 
                                  onClick={() => handleEditClick(payment)} 
                                  style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: "#1a73e8", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "'Google Sans', sans-serif" }}
                                >
                                  <EditOutlinedIcon style={{ fontSize: 13 }} />
                                </button>
                              )}
                              {canDeleteRows && (
                                <button 
                                  onClick={() => confirmDelete(payment.id)} 
                                  style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: "#d93025", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "'Google Sans', sans-serif" }}
                                >
                                  <DeleteOutlineOutlinedIcon style={{ fontSize: 13 }} />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination-container desktop-pagination-only">
                <button className="pagination-button" onClick={goToPreviousPage} disabled={currentPage === 1}>‹ Previous</button>
                {getVisiblePages()[0] > 1 && (
                  <>
                    <button className="pagination-button" onClick={() => goToPage(1)}>1</button>
                    {getVisiblePages()[0] > 2 && <span className="pagination-ellipsis">...</span>}
                  </>
                )}
                {getVisiblePages().map(page => (
                  <button key={page} className={`pagination-button ${currentPage === page ? 'active' : ''}`} onClick={() => goToPage(page)}>{page}</button>
                ))}
                {getVisiblePages()[getVisiblePages().length - 1] < totalPages && (
                  <>
                    {getVisiblePages()[getVisiblePages().length - 1] < totalPages - 1 && <span className="pagination-ellipsis">...</span>}
                    <button className="pagination-button" onClick={() => goToPage(totalPages)}>{totalPages}</button>
                  </>
                )}
                <button className="pagination-button" onClick={goToNextPage} disabled={currentPage === totalPages}>Next ›</button>
              </div>
            )}

            {/* Mobile Card List */}
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
                    mode={mode}
                    isAdmin={isAdmin}
                    isSuperAdmin={isSuperAdmin}
                    onViewProof={setProofViewer}
                    onCompletePendingAmount={handleCompletePendingAmount}
                    cashReceived={cashReceivedMap[payment.id]}
                    cashAmount={cashAmountMap[payment.id]}
                  />
                ))}
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
      
      {/* Footer */}
      <div className="imcb-footer">
        Powered by <span style={{ fontWeight: 600, color: "#1a73e8" }}>IMCB Solutions LLP</span>
      </div>

      {/* Proof Viewer Modal */}
      {proofViewer && (() => {
        const proofPath = (() => { try { return new URL(proofViewer).pathname; } catch { return proofViewer; } })();
        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(proofPath);
        const isPdf = /\.pdf$/i.test(proofPath);
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100 }}
            onClick={() => setProofViewer(null)}>
            <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 720, height: "90dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}
              onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #e8eaed", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <VisibilityOutlinedIcon style={{ fontSize: 18, color: "#1a73e8" }} />
                  <span style={{ fontWeight: 700, fontSize: 15 }}>Payment Proof</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <a href={proofViewer} target="_blank" rel="noreferrer"
                    style={{ padding: "6px 12px", borderRadius: 7, background: "#1a73e8", color: "#fff", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                    Open ↗
                  </a>
                  <button onClick={() => setProofViewer(null)}
                    style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e8eaed", background: "#f8f9fa", cursor: "pointer", fontSize: 20 }}>
                    ×
                  </button>
                </div>
              </div>
              <div style={{ flex: 1, minHeight: 0, overflow: "auto", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", padding: isImage ? 12 : 0 }}>
                {isImage ? (
                  <img src={proofViewer} alt="Payment Proof" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                ) : isPdf ? (
                  <iframe src={proofViewer} title="Payment Proof" style={{ width: "100%", height: "100%", border: "none" }} />
                ) : (
                  <div style={{ textAlign: "center", color: "#ccc" }}>
                    <p>Cannot preview this file.</p>
                    <a href={proofViewer} target="_blank" rel="noreferrer" style={{ color: "#1a73e8" }}>Open file</a>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* New Payment Modal */}
      {showPaymentForm && (
        <div className="pt-modal-backdrop">
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

      {/* Edit Payment Modal */}
      {editingPayment && (
        <div className="pt-modal-backdrop">
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

      {/* Pending Amount Completion Modal */}
      {pendingCompletionPayment && (
        <div className="pt-modal-backdrop" onClick={() => setPendingCompletionPayment(null)}>
          <div className="pt-modal" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="pt-modal-header">
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                Complete Pending Amount
              </h3>
              <button className="pt-modal-close" onClick={() => setPendingCompletionPayment(null)}>×</button>
            </div>
            <div className="pt-modal-body">
              <div style={{ marginBottom: '20px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#5f6368', marginBottom: '6px' }}>
                    Client Name
                  </label>
                  <div style={{ fontSize: '15px', fontWeight: '500', color: '#202124' }}>
                    {pendingCompletionPayment.clientName}
                  </div>
                </div>
                
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#5f6368', marginBottom: '6px' }}>
                    Total Amount
                  </label>
                  <div style={{ fontSize: '15px', fontWeight: '500', color: '#202124' }}>
                    {formatCurrency(pendingCompletionPayment.amount)}
                  </div>
                </div>
                
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#5f6368', marginBottom: '6px' }}>
                    Current Cash Received
                  </label>
                  <div style={{ fontSize: '15px', fontWeight: '500', color: '#188038' }}>
                    {formatCurrency(cashAmountMap[pendingCompletionPayment.id] || 0)}
                  </div>
                </div>
                
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#5f6368', marginBottom: '6px' }}>
                    Current Pending Amount
                  </label>
                  <div style={{ fontSize: '15px', fontWeight: '500', color: '#e67e22' }}>
                    {formatCurrency((cashReceivedMap[pendingCompletionPayment.id] === true && cashAmountMap[pendingCompletionPayment.id] 
                      ? pendingCompletionPayment.amount - parseFloat(cashAmountMap[pendingCompletionPayment.id])
                      : pendingCompletionPayment.amount))}
                  </div>
                </div>
                
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#5f6368', marginBottom: '6px' }}>
                    Amount to Complete
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    value={pendingAmountInput}
                    onChange={(e) => setPendingAmountInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #e8eaed',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontFamily: "'Google Sans', sans-serif"
                    }}
                    placeholder="Enter amount"
                    autoFocus
                  />
                </div>
                
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setPendingCompletionPayment(null)}
                    style={{
                      padding: '8px 20px',
                      borderRadius: '6px',
                      border: '1px solid #e8eaed',
                      background: '#fff',
                      color: '#5f6368',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontFamily: "'Google Sans', sans-serif"
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitPendingCompletion}
                    disabled={completingPending}
                    style={{
                      padding: '8px 20px',
                      borderRadius: '6px',
                      border: 'none',
                      background: completingPending ? '#9aa0a6' : '#1a73e8',
                      color: '#fff',
                      fontWeight: '600',
                      cursor: completingPending ? 'not-allowed' : 'pointer',
                      fontFamily: "'Google Sans', sans-serif",
                    }}
                  >
                    {completingPending ? 'Processing...' : 'Complete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentTable;