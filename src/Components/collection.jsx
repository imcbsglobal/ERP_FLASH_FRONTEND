import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPayment, updatePayment, normalizePayment } from '../service/payment';
import { getBranches } from '../service/user';

const BASE_URL = 'https://erp.flashinnovations.in/api';

// ── Component ──────────────────────────────────────────────────
const PaymentForm = ({ initialData = null, onSuccess, onCancel }) => {
  const isEdit = Boolean(initialData?.id);

  const [formData, setFormData] = useState({
    clientName: '',
    place: '',
    phoneNumber: '',
    department: '',
    branch: '',
    collectionType: '',
    amount: '',
    paidFor: '',
    notes: '',
    paymentProof: null,
  });

  const [errors, setErrors]            = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [branches, setBranches]         = useState([]);

  // ── Departments from FlashERP ─────────────────────────────────
  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [departmentsError, setDepartmentsError] = useState('');

  // ── Debtor dropdown ───────────────────────────────────────────
  const [allDebtors, setAllDebtors]         = useState([]);
  const [debtorSearch, setDebtorSearch]     = useState('');
  const [debtorLoading, setDebtorLoading]   = useState(false);
  const [debtorError, setDebtorError]       = useState('');
  const [showDropdown, setShowDropdown]     = useState(false);
  const [selectedDebtor, setSelectedDebtor] = useState(null);
  const [activeIndex, setActiveIndex]       = useState(-1);
  const [retryCount, setRetryCount]         = useState(0);
  const wrapperRef = useRef(null);
  const searchRef  = useRef(null);
  const listRef    = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
        setDebtorSearch('');
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus search box when panel opens
  useEffect(() => {
    if (showDropdown) setTimeout(() => searchRef.current?.focus(), 30);
  }, [showDropdown]);

  // Strip trailing digit-runs ERP embeds
  const cleanDebtorName = (raw = '') => {
    if (!raw) return '';
    // Remove numeric suffixes like 00007034173116893
    let cleaned = raw.replace(/\d{10,}$/, '').trim();
    cleaned = cleaned.replace(/0+$/, '').trim();
    return cleaned;
  };

  // ── Filter debtors by selected department (match openingdepartment with department_id) ──
  const filterDebtorsByDepartment = useCallback((debtors, selectedDepartmentName) => {
    if (!selectedDepartmentName || !debtors.length) return debtors;
    
    // Find the department object to get the department_id
    const selectedDeptObj = departments.find(dept => dept.department === selectedDepartmentName);
    const selectedDeptId = selectedDeptObj?.department_id;
    
    if (!selectedDeptId) return debtors;
    
    return debtors.filter(debtor => {
      // Match debtor's openingdepartment with selected department_id
      const debtorDept = debtor.openingdepartment || debtor.remarkcolumntitle || debtor.super_code;
      return debtorDept && debtorDept === selectedDeptId;
    });
  }, [departments]);

  // ── Proxy route on YOUR Django backend (fixes CORS) ──────────
  const DEBTORS_API = `${BASE_URL}/payments/flasherp/debtors/`;
  const DEPARTMENTS_API = `${BASE_URL}/payments/flasherp/departments/`;

  // ── Fetch departments from FlashERP on mount ──────────────────
  useEffect(() => {
    let cancelled = false;

    const fetchDepartments = async () => {
      setDepartmentsLoading(true);
      setDepartmentsError('');

      try {
        const token = localStorage.getItem('access_token');
        const headers = { 'Accept': 'application/json' };
        if (token) {
          headers['Authorization'] = `Bearer ${token.replace(/^Bearer\s+/i, '')}`;
        }

        const response = await fetch(DEPARTMENTS_API, { method: 'GET', headers });

        if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        }
        if (response.status === 403) {
          throw new Error('Access denied. You do not have permission to view departments.');
        }
        if (!response.ok) {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        if (cancelled) return;

        const departmentsList = data.results || [];
        setDepartments(departmentsList);

      } catch (err) {
        console.error('Failed to load departments:', err);
        if (!cancelled) setDepartmentsError(err.message || 'Failed to load departments.');
      } finally {
        if (!cancelled) setDepartmentsLoading(false);
      }
    };

    fetchDepartments();
    return () => { cancelled = true; };
  }, []);

  // ── Fetch ALL pages of debtors on mount, deduplicate, sort A-Z ──
  useEffect(() => {
    let cancelled = false;

    const fetchAllPages = async () => {
      setDebtorLoading(true);
      setDebtorError('');
      const allResults = [];
      let url = DEBTORS_API;

      try {
        while (url) {
          const proxyUrl = url === DEBTORS_API
            ? DEBTORS_API
            : `${DEBTORS_API}?next=${encodeURIComponent(url)}`;

          const token = localStorage.getItem('access_token');
          const headers = { 'Accept': 'application/json' };
          if (token) {
            headers['Authorization'] = `Bearer ${token.replace(/^Bearer\s+/i, '')}`;
          }

          let r;
          try {
            r = await fetch(proxyUrl, { method: 'GET', headers });
          } catch (networkErr) {
            throw new Error(
              'Network error: Cannot reach the server. ' +
              'Please check your internet connection.'
            );
          }

          if (r.status === 401) {
            throw new Error(
              'Authentication failed (401): Your session may have expired. ' +
              'Please log out and log in again.'
            );
          }
          if (r.status === 403) {
            throw new Error(
              'Access denied (403): You do not have permission to view client data.'
            );
          }
          if (r.status === 502) {
            throw new Error(
              'Cannot reach FlashERP server (502). Please check your internet connection.'
            );
          }
          if (r.status === 504) {
            throw new Error(
              'FlashERP server timed out (504). Please try again.'
            );
          }
          if (!r.ok) {
            throw new Error(`Server error: ${r.status} ${r.statusText}`);
          }

          const data = await r.json();

          if (Array.isArray(data)) {
            allResults.push(...data);
            url = null;
          } else {
            allResults.push(...(data.results || []));
            url = data.next || null;
          }
        }

        if (cancelled) return;

        const seen    = new Map();
        const cleaned = [];
        for (const d of allResults) {
          const cleanName = cleanDebtorName(d.name);
          if (!cleanName) continue;
          if (!seen.has(cleanName)) {
            seen.set(cleanName, true);
            cleaned.push({
              ...d,
              _cleanName:    cleanName,
              _originalName: d.name,
              _phone: (d.phone2 || d.phone || d.mobile || '').trim(),
              _place: (d.place  || d.city  || d.address || d.area || '').trim(),
            });
          }
        }

        cleaned.sort((a, b) => a._cleanName.localeCompare(b._cleanName));
        setAllDebtors(cleaned);

      } catch (err) {
        console.error('Failed to load debtors:', err);
        if (!cancelled) setDebtorError(err.message || 'Failed to load clients.');
      } finally {
        if (!cancelled) setDebtorLoading(false);
      }
    };

    fetchAllPages();
    return () => { cancelled = true; };
  }, [retryCount]);

  // ── Client-side filter — by department first, then name starts with ──
  const visibleDebtors = useCallback(() => {
    let filtered = allDebtors;
    
    // First filter by department if selected
    if (formData.department) {
      filtered = filterDebtorsByDepartment(filtered, formData.department);
    }
    
    // Then filter by search text
    if (!debtorSearch.trim()) return filtered;
    
    const q = debtorSearch.trim().toLowerCase();
    return filtered.filter(d => d._cleanName.toLowerCase().startsWith(q));
  }, [allDebtors, debtorSearch, formData.department, filterDebtorsByDepartment]);

  // ── Select a debtor → auto-fill place, phone, department ─────
  const applyDebtor = (debtor) => {
    // Get the department name from department_id
    const selectedDeptObj = departments.find(dept => dept.department_id === debtor.openingdepartment);
    const departmentName = selectedDeptObj ? selectedDeptObj.department : (debtor.openingdepartment || debtor.remarkcolumntitle || debtor.super_code);
    
    setSelectedDebtor(debtor);
    setFormData(prev => ({
      ...prev,
      clientName:  debtor._cleanName,
      place:       debtor._place       || prev.place,
      phoneNumber: debtor._phone       || prev.phoneNumber,
      department:  departmentName || prev.department,
    }));
    setShowDropdown(false);
    setDebtorSearch('');
    setActiveIndex(-1);
    setErrors(prev => ({ ...prev, clientName: '', place: '', phoneNumber: '' }));
  };

  // ── Keyboard nav inside search box ───────────────────────────
  const handleSearchKeyDown = (e) => {
    const list = visibleDebtors();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, list.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0 && list[activeIndex]) {
      e.preventDefault();
      applyDebtor(list[activeIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setDebtorSearch('');
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current && activeIndex >= 0) {
      const item = listRef.current.children[activeIndex];
      if (item) item.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const collectionTypes = [
    'Cash', 'Cheque', 'Bank Transfer',
    'Credit Card', 'Debit Card', 'Online Payment',
  ];

  // ── Branches ──────────────────────────────────────────────────
  useEffect(() => {
    getBranches()
      .then(data => setBranches(Array.isArray(data) ? data : (data.results || data.data || [])))
      .catch(err => console.error('Failed to fetch branches:', err));
  }, []);

  // ── Populate in edit mode ─────────────────────────────────────
  useEffect(() => {
    if (isEdit && initialData) {
      setFormData({
        clientName:     initialData.clientName     ?? '',
        place:          initialData.place          ?? '',
        phoneNumber:    initialData.phoneNumber    ?? '',
        department:     initialData.department     ?? '',
        branch:         initialData.branch         ?? '',
        collectionType: initialData.collectionType ?? '',
        amount:         initialData.amount !== undefined ? String(initialData.amount) : '',
        paidFor:        initialData.paidFor        ?? '',
        notes:          initialData.notes          ?? '',
        paymentProof:   null,
      });
      setErrors({});
      setSubmitStatus(null);
    }
  }, [initialData, isEdit]);

  // ── Generic handlers ──────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear client-related fields when department changes
    if (name === 'department') {
      setSelectedDebtor(null);
      setFormData(prev => ({ 
        ...prev, 
        clientName: '', 
        place: '', 
        phoneNumber: '' 
      }));
      setDebtorSearch('');
      setShowDropdown(false);
    }
    
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFormData(prev => ({ ...prev, paymentProof: file }));
    if (errors.paymentProof) setErrors(prev => ({ ...prev, paymentProof: '' }));
  };

  // ── Validation ────────────────────────────────────────────────
  const validateForm = () => {
    const newErrors = {};
    if (!formData.department.trim())  newErrors.department     = 'Department is required';
    if (!formData.clientName.trim())  newErrors.clientName     = 'Client name is required';
    if (!formData.place.trim())       newErrors.place          = 'Place is required';
    if (!formData.phoneNumber.trim()) newErrors.phoneNumber    = 'Phone number is required';
    else if (!/^\+?[\d\s\-()]{7,15}$/.test(formData.phoneNumber.trim()))
      newErrors.phoneNumber = 'Enter a valid phone number';
    if (!formData.branch.trim())      newErrors.branch         = 'Branch is required';
    if (!formData.collectionType)     newErrors.collectionType = 'Collection type is required';
    if (!formData.amount) {
      newErrors.amount = 'Amount is required';
    } else if (isNaN(formData.amount) || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount greater than 0';
    }
    if (!formData.paidFor.trim()) newErrors.paidFor = 'Paid for field is required';
    if (formData.collectionType && formData.collectionType !== 'Cash' && !formData.paymentProof) {
      if (!isEdit || !initialData?.paymentProofUrl) {
        newErrors.paymentProof = 'Payment proof is required for this payment type';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Reset ─────────────────────────────────────────────────────
  const resetForm = () => {
    setFormData({
      clientName: '', place: '', phoneNumber: '', department: '', branch: '',
      collectionType: '', amount: '', paidFor: '', notes: '', paymentProof: null,
    });
    setErrors({});
    setSubmitStatus(null);
    setSelectedDebtor(null);
    setDebtorSearch('');
    setShowDropdown(false);
    const fileInput = document.getElementById('paymentProof');
    if (fileInput) fileInput.value = '';
  };

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    setSubmitStatus(null);
    try {
      const saved = isEdit
        ? await updatePayment(initialData.id, formData)
        : await createPayment(formData);
      const normalized = normalizePayment(saved);
      setSubmitStatus({
        type: 'success',
        message: isEdit ? 'Payment updated successfully!' : 'Payment submitted successfully!',
      });
      if (!isEdit) resetForm();
      if (typeof onSuccess === 'function') onSuccess(normalized);
    } catch (error) {
      console.error('Submission error:', error);
      setSubmitStatus({
        type: 'error',
        message: error.message || 'Failed to submit payment. Please try again.',
      });
      if (error.name === 'AuthError' || error.message?.includes('Session expired')) {
        setTimeout(() => { window.location.href = '/login'; }, 2000);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Retry fetch ───────────────────────────────────────────────
  const handleRetryFetch = () => {
    setDebtorError('');
    setAllDebtors([]);
    setRetryCount(c => c + 1);
  };

  // ── Render ────────────────────────────────────────────────────
  const visible = visibleDebtors();
  
  // Get the current selected department ID for display
  const selectedDeptObj = departments.find(dept => dept.department === formData.department);
  const selectedDeptId = selectedDeptObj?.department_id;

  return (
    <div className="payment-form-container" style={{ fontFamily: "'Google Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
      <style>{`
        * { font-family: 'Google Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important; }
        label {
          display: block; text-align: left;
          font-size: 14px !important; font-weight: bold !important; margin-bottom: 4px;
        }
        .form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px; }
        .btn { padding: 8px 16px; font-size: 14px; border-radius: 4px; cursor: pointer; transition: all 0.2s; }
        .btn-primary { background-color: var(--accent); color: white; border: none; min-width: 120px; }
        .btn-primary:hover:not(:disabled) { opacity: 0.88; }
        .btn-secondary { background-color: #f9fbfd; color: black; border: none; }
        .btn-secondary:hover:not(:disabled) { background-color: #f3f7fa; }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .debtor-input {
          width: 100%; padding: 8px 12px; border: 1px solid var(--border, #d1d5db);
          border-radius: 6px; background: #fff; font-size: 14px; color: #111827;
          text-align: left; min-height: 38px; box-sizing: border-box; outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .debtor-input::placeholder { color: #9ca3af; }
        .debtor-input:hover { border-color: #266648; }
        .debtor-input:focus { border-color: #266648; box-shadow: 0 0 0 3px rgba(38,102,72,0.12); }
        .debtor-input.dd-error { border-color: var(--red, #ef4444); }
        .debtor-input.dd-open {
          border-color: #266648;
          border-bottom-left-radius: 0;
          border-bottom-right-radius: 0;
          box-shadow: 0 0 0 3px rgba(38,102,72,0.1);
        }
        .dd-spinner {
          position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
          width: 13px; height: 13px;
          border: 2px solid #d1d5db; border-top-color: #266648;
          border-radius: 50%; animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .debtor-panel {
          position: absolute; z-index: 9999; left: 0; right: 0; top: 100%;
          background: #fff; border: 1px solid #266648; border-top: none;
          border-bottom-left-radius: 8px;
          border-bottom-right-radius: 8px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.13);
          animation: panelIn 0.12s ease; overflow: hidden;
        }
        @keyframes panelIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

        .dd-list { list-style: none; margin: 0; padding: 4px 0; max-height: 240px; overflow-y: auto; }
        .dd-list::-webkit-scrollbar { width: 4px; }
        .dd-list::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }
        .dd-item {
          padding: 10px 14px; cursor: pointer; display: flex; flex-direction: column;
          gap: 3px; text-align: left; border-left: 3px solid transparent; transition: background 0.1s;
        }
        .dd-item:hover, .dd-item.dd-active { background: #f0faf5; border-left-color: #266648; }
        .dd-item-name { font-size: 13px; font-weight: 600; color: #111827; text-align: left; }
        .dd-item-meta { font-size: 11px; color: #6b7280; text-align: left; }
        .dd-empty { padding: 14px 16px; text-align: left; font-size: 13px; color: #9ca3af; }
        .dd-footer {
          padding: 6px 14px; font-size: 11px; color: #9ca3af;
          border-top: 1px solid #f0f0f0; background: #fafafa; text-align: left;
        }

        .debtor-api-error {
          margin-top: 6px; padding: 8px 12px; font-size: 12px; color: #b91c1c;
          background: #fef2f2; border: 1px solid #fecaca; border-radius: 5px;
          display: flex; align-items: flex-start; gap: 8px; line-height: 1.4;
        }
        .debtor-api-error button {
          margin-left: auto; flex-shrink: 0; font-size: 11px; padding: 2px 8px;
          border: 1px solid #fca5a5; border-radius: 4px; background: #fff;
          color: #b91c1c; cursor: pointer;
        }
        .debtor-api-error button:hover { background: #fee2e2; }

        .client-detail-card {
          margin-top: 6px; padding: 8px 12px;
          background: #f0faf5; border: 1px solid #a7f3d0; border-radius: 6px;
          display: flex; gap: 16px; flex-wrap: wrap;
        }
        .client-detail-item { display: flex; flex-direction: column; gap: 1px; }
        .client-detail-label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
        .client-detail-value { font-size: 13px; color: #111827; font-weight: 500; }
        .client-count-badge {
          display: inline-block; font-size: 11px; color: #266648;
          background: #f0faf5; border: 1px solid #a7f3d0;
          border-radius: 10px; padding: 1px 8px; margin-left: 6px;
        }
        .dept-filter-badge {
          display: inline-block; font-size: 11px; color: #266648;
          background: #e8f5e9; border-radius: 12px; padding: 4px 10px;
          margin-bottom: 8px; font-weight: 500;
        }

        input, select, textarea {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--border, #d1d5db);
          border-radius: 6px;
          font-size: 14px;
          box-sizing: border-box;
        }
        .error-message {
          color: #ef4444;
          font-size: 12px;
          margin-top: 4px;
          display: block;
        }
        input.error, select.error, textarea.error {
          border-color: #ef4444;
        }
        .amount-input {
          position: relative;
          display: flex;
          align-items: center;
        }
        .currency-symbol {
          position: absolute;
          left: 12px;
          color: #6b7280;
        }
        .amount-input input {
          padding-left: 28px;
        }
      `}</style>

      <h2 style={{ color: 'var(--accent)', fontSize: '28px', fontWeight: '600' }}>
        {isEdit ? 'Edit Payment' : 'Collection Form'}
      </h2>

      {submitStatus && (
        <div className={`alert alert-${submitStatus.type}`}>{submitStatus.message}</div>
      )}

      <form onSubmit={handleSubmit} className="payment-form">

        {/* ── Row 1 — Department & Branch (single line) ── */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '18px' }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label htmlFor="department">
              Department <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <select
              id="department"
              name="department"
              value={formData.department}
              onChange={handleChange}
              className={errors.department ? 'error' : ''}
              disabled={departmentsLoading}
            >
              <option value="">
                {departmentsLoading ? 'Loading departments...' : 'Select department'}
              </option>
              {departments.map(dept => (
                <option key={dept.department_id} value={dept.department}>
                  {dept.department}
                </option>
              ))}
            </select>
            {departmentsError && (
              <span className="error-message" style={{ fontSize: '11px' }}>
                ⚠ {departmentsError}
              </span>
            )}
            {errors.department && <span className="error-message">{errors.department}</span>}
          </div>

          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label htmlFor="branch">Branch <span style={{ color: 'var(--red)' }}>*</span></label>
            <select
              id="branch" name="branch" value={formData.branch}
              onChange={handleChange} className={errors.branch ? 'error' : ''}
            >
              <option value="">Select branch</option>
              {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
            </select>
            {errors.branch && <span className="error-message">{errors.branch}</span>}
          </div>
        </div>

        {/* ── Row 2 — Client Name, Place, Phone Number (single line) ── */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '18px' }}>
          <div className="form-group" style={{ flex: 1.5, marginBottom: 0 }} ref={wrapperRef}>
            <label>
              Client Name <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <input
                  ref={searchRef}
                  type="text"
                  autoComplete="off"
                  className={`debtor-input${showDropdown ? ' dd-open' : ''}${errors.clientName ? ' dd-error' : ''}`}
                  placeholder={debtorLoading ? 'Loading clients…' : (formData.department ? `Search clients in ${formData.department}...` : 'Select department first')}
                  value={debtorSearch !== '' ? debtorSearch : formData.clientName}
                  disabled={debtorLoading || !formData.department}
                  onChange={e => {
                    const val = e.target.value;
                    setDebtorSearch(val);
                    setFormData(prev => ({ ...prev, clientName: val }));
                    setSelectedDebtor(null);
                    setActiveIndex(-1);
                    setShowDropdown(val.length > 0 && formData.department);
                  }}
                  onFocus={() => {
                    if (!debtorLoading && !debtorError && formData.department && formData.clientName) {
                      setDebtorSearch(formData.clientName);
                      setShowDropdown(true);
                    }
                  }}
                  onKeyDown={handleSearchKeyDown}
                />
                {debtorLoading && <span className="dd-spinner" />}
              </div>

              {/* Show department filter badge with ID */}
             
              {showDropdown && !debtorError && formData.department && (
                <div className="debtor-panel">
                  <ul className="dd-list" ref={listRef} role="listbox">
                    {visible.length === 0 ? (
                      <li className="dd-empty">
                        {debtorSearch ? `No clients found in ${formData.department} for "${debtorSearch}"` : `No clients available in ${formData.department} department`}
                      </li>
                    ) : visible.map((d, i) => (
                      <li
                        key={d.code || d.id || i}
                        role="option"
                        aria-selected={activeIndex === i}
                        className={`dd-item${activeIndex === i ? ' dd-active' : ''}`}
                        onMouseDown={e => { e.preventDefault(); applyDebtor(d); }}
                        onMouseEnter={() => setActiveIndex(i)}
                      >
                        <span className="dd-item-name">{d._cleanName}</span>
                        {(d._place || d._phone) && (
                          <span className="dd-item-meta">
                            {[d._place, d._phone].filter(Boolean).join(' · ')}
                          </span>
                        )}
                        {/* Show department info */}
                        {d.openingdepartment && (
                          <span className="dd-item-meta" style={{ fontSize: '10px', color: '#266648' }}>
                            Dept ID: {d.openingdepartment}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                  {visible.length > 0 && (
                    <div className="dd-footer">
                      {visible.length} client{visible.length !== 1 ? 's' : ''}
                      {debtorSearch ? ` matching "${debtorSearch}"` : ''} in {formData.department}
                    </div>
                  )}
                </div>
              )}
            </div>

            {debtorError && (
              <div className="debtor-api-error">
                <span>⚠ {debtorError}</span>
                <button type="button" onClick={handleRetryFetch}>Retry</button>
              </div>
            )}
            {errors.clientName && <span className="error-message">{errors.clientName}</span>}
          </div>

          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label htmlFor="place">Place <span style={{ color: 'var(--red)' }}>*</span></label>
            <input
              type="text" id="place" name="place" value={formData.place}
              onChange={handleChange} placeholder="Enter place"
              className={errors.place ? 'error' : ''}
            />
            {errors.place && <span className="error-message">{errors.place}</span>}
          </div>

          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label htmlFor="phoneNumber">Phone Number <span style={{ color: 'var(--red)' }}>*</span></label>
            <input
              type="tel" id="phoneNumber" name="phoneNumber" value={formData.phoneNumber}
              onChange={handleChange} placeholder="Enter phone number"
              className={errors.phoneNumber ? 'error' : ''}
            />
            {errors.phoneNumber && <span className="error-message">{errors.phoneNumber}</span>}
          </div>
        </div>

        {/* ── Row 3 — Payment Type & Payment Proof (single line) ── */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '18px', alignItems: 'flex-start' }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label htmlFor="collectionType">Payment Type <span style={{ color: 'var(--red)' }}>*</span></label>
            <select
              id="collectionType" name="collectionType" value={formData.collectionType}
              onChange={handleChange} className={errors.collectionType ? 'error' : ''}
            >
              <option value="">Select payment type</option>
              {collectionTypes.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
            {errors.collectionType && <span className="error-message">{errors.collectionType}</span>}
          </div>

          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            {formData.collectionType && formData.collectionType !== 'Cash' ? (
              <>
                <label htmlFor="paymentProof">Payment Proof <span style={{ color: 'var(--red)' }}>*</span></label>
                <input
                  type="file" id="paymentProof" name="paymentProof"
                  onChange={handleFileChange} accept="image/*,.pdf"
                  className={errors.paymentProof ? 'error' : ''}
                />
                {isEdit && initialData?.paymentProofUrl && (
                  <small style={{ marginTop: '4px', display: 'block' }}>
                    Current:{' '}
                    <a href={initialData.paymentProofUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#266648' }}>
                      View existing proof
                    </a>
                    {formData.paymentProof ? ' (will be replaced)' : ''}
                  </small>
                )}
                {errors.paymentProof && <span className="error-message">{errors.paymentProof}</span>}
              </>
            ) : (
              <>
                <label style={{ color: 'var(--muted)' }}>Payment Proof</label>
                <div style={{
                  padding: '8px 12px', border: '1px dashed var(--border)', borderRadius: '6px',
                  fontSize: '12px', color: 'var(--muted)', background: 'var(--surface2)',
                  minHeight: '38px', display: 'flex', alignItems: 'center',
                }}>
                  {formData.collectionType === 'Cash'
                    ? 'Not required for Cash payments'
                    : 'Select a payment type first'}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Row 4 — Amount & Paid For (single line) ── */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '18px', alignItems: 'flex-start' }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label htmlFor="amount">Amount <span style={{ color: 'var(--red)' }}>*</span></label>
            <div className="amount-input">
              <span className="currency-symbol">₹</span>
              <input
                type="number" id="amount" name="amount" value={formData.amount}
                onChange={handleChange} placeholder="0.00" step="0.01" min="0.01"
                className={errors.amount ? 'error' : ''}
              />
            </div>
            {errors.amount && <span className="error-message">{errors.amount}</span>}
          </div>

          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label htmlFor="paidFor">Paid For <span style={{ color: 'var(--red)' }}>*</span></label>
            <input
              type="text" id="paidFor" name="paidFor" value={formData.paidFor}
              onChange={handleChange} placeholder="e.g., Consultation, Product Purchase"
              className={errors.paidFor ? 'error' : ''}
            />
            {errors.paidFor && <span className="error-message">{errors.paidFor}</span>}
          </div>
        </div>

        {/* ── Row 5 — Notes (full width) ── */}
        <div className="form-group" style={{ marginBottom: '18px' }}>
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes" name="notes" value={formData.notes}
            onChange={handleChange}
            placeholder="Additional notes or remarks…"
            rows="3"
          />
        </div>

        {/* ── Actions ── */}
        <div className="form-actions">
          {!isEdit && (
            <button type="button" onClick={resetForm} className="btn btn-secondary" disabled={isSubmitting}>
              Reset
            </button>
          )}
          {typeof onCancel === 'function' && (
            <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={isSubmitting}>
              Cancel
            </button>
          )}
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting…' : isEdit ? 'Update Payment' : 'Submit Payment'}
          </button>
        </div>

      </form>
    </div>
  );
};

export default PaymentForm;