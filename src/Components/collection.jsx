import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPayment, updatePayment, normalizePayment, getBranches, ENDPOINTS, authHeaders, apiFetch } from '../service/Api';

// ── WhatsApp Notification using Approved Template ─────────────────
const sendWhatsAppNotification = async (formData) => {
  try {
    // Build the client's phone number (10 digits only, no country code)
    const rawPhone = (formData.phoneNumber || '').replace(/\D/g, '');
    const clientPhone = rawPhone.startsWith('91') ? rawPhone.slice(2) : rawPhone;

    // Format amount with ₹ symbol
    const amount = `₹${formData.amount}`;

    // Build template message: Hello {{1}}, an amount of {{2}} has been collected...
    const templateMessage = `Hello ${formData.clientName}, an amount of ${amount} has been collected and updated in your account. Thanks, Flash Innovations!`;

    // URL encode the template message
    const encodedMessage = encodeURIComponent(templateMessage);

    // Build the complete API URL with your credentials
    const apiUrl = `http://bhashsms.com/api/sendmsg.php?user=innovations&pass=9447733322&sender=BUZWAP&phone=${clientPhone}&text=${encodedMessage}&priority=wa&stype=normal`;

    // Send the notification
    const response = await fetch(apiUrl, {
      method: 'GET',
      mode: 'no-cors'
    });

    console.log('WhatsApp notification sent to:', clientPhone, '| Client:', formData.clientName, '| Amount:', amount);
    return true;
  } catch (err) {
    console.error('WhatsApp notification failed:', err.message);
    return false;
  }
};

// ── Component ──────────────────────────────────────────────────
const PaymentForm = ({ initialData = null, onSuccess, onCancel }) => {
  const isEdit = Boolean(initialData?.id ?? initialData?._id ?? initialData?.payment_id);

  // Mobile detection utility
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth <= 768;
  };

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
    cashReceived: null,
  });

  const [errors, setErrors]            = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [branches, setBranches]         = useState([]);
  const [showCashPopup, setShowCashPopup] = useState(false);
  const [pendingSuccess, setPendingSuccess] = useState(null); // { normalized, formSnapshot }

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
  const DEBTORS_API = ENDPOINTS.debtors;
  const DEPARTMENTS_API = ENDPOINTS.departments;

  // ── Fetch departments from FlashERP on mount ──────────────────
  useEffect(() => {
    let cancelled = false;

    const fetchDepartments = async () => {
      setDepartmentsLoading(true);
      setDepartmentsError('');

      try {
        const data = await apiFetch(DEPARTMENTS_API, { method: 'GET', headers: authHeaders() });
        if (cancelled) return;

        const departmentsList = Array.isArray(data) ? data : (data.results || []);
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

          let data;
          try {
            data = await apiFetch(proxyUrl, { method: 'GET', headers: authHeaders() });
          } catch (networkErr) {
            throw new Error(
              networkErr.message?.includes('401')
                ? 'Authentication failed (401): Your session may have expired. Please log out and log in again.'
                : networkErr.message?.includes('403')
                ? 'Access denied (403): You do not have permission to view client data.'
                : networkErr.message?.includes('502')
                ? 'Cannot reach FlashERP server (502). Please check your internet connection.'
                : networkErr.message?.includes('504')
                ? 'FlashERP server timed out (504). Please try again.'
                : 'Network error: Cannot reach the server. Please check your internet connection.'
            );
          }

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
        cashReceived:   initialData.cashReceived   ?? null,
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
    if (!file) return;

    // Maximum 5MB file size
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    
    if (file.size > MAX_FILE_SIZE) {
      setErrors(prev => ({
        ...prev,
        paymentProof: `File is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum allowed size is 5MB.`
      }));
      e.target.value = '';
      return;
    }

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
      collectionType: '', amount: '', paidFor: '', notes: '', paymentProof: null, cashReceived: null,
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
        ? await updatePayment(initialData.id ?? initialData._id ?? initialData.payment_id, formData)
        : await createPayment(formData);
      const normalized = normalizePayment(saved);
      setSubmitStatus({
        type: 'success',
        message: isEdit ? 'Payment updated successfully!' : 'Payment submitted successfully!',
      });
      // Only show cash popup for NEW submissions, never for updates
      const isNewRecord = !isEdit && !(initialData?.id ?? initialData?._id ?? initialData?.payment_id);
      if (isNewRecord) {
        sendWhatsAppNotification(formData);
        // Store result and show popup — reset/onSuccess happen after dismiss
        setPendingSuccess({ normalized });
        setShowCashPopup(true);
      } else {
        if (typeof onSuccess === 'function') onSuccess(normalized);
      }
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
    <div className="payment-form-container">
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        * { font-family: 'Google Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important; }

        /* ── Container ── */
        .payment-form-container {
          width: 100%;
          max-width: 100%;
          padding: 12px 16px 24px;
        }
        .payment-form-container h2 {
          color: var(--accent);
          font-size: 22px;
          font-weight: 600;
          margin: 0 0 16px;
        }
        .payment-form { width: 100%; }

        /* ── Labels ── */
        label {
          display: block;
          font-size: 13px !important;
          font-weight: 600 !important;
          color: #374151;
          margin-bottom: 5px;
          text-align: left;
        }

        /* ── Inputs ── */
        input, select, textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 15px;
          color: #111827;
          background: #fff;
          appearance: none;
          -webkit-appearance: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        input:focus, select:focus, textarea:focus {
          outline: none;
          border-color: #266648;
          box-shadow: 0 0 0 3px rgba(38,102,72,0.12);
        }
        input.error, select.error, textarea.error { border-color: #ef4444; }
        .error-message { color: #ef4444; font-size: 12px; margin-top: 4px; display: block; }

        /* ── Amount input ── */
        .amount-input { position: relative; display: flex; align-items: center; }
        .currency-symbol { position: absolute; left: 12px; color: #6b7280; font-size: 15px; pointer-events: none; }
        .amount-input input { padding-left: 26px; }

        /* ── Form layout — mobile-first single column ── */
        .form-group { margin-bottom: 14px; width: 100%; }
        .form-row {
          display: flex;
          flex-direction: column;
          gap: 0;
          margin-bottom: 0;
        }
        .form-row > * { width: 100%; margin-bottom: 14px; }

        /* ── Two-column on tablet+ ── */
        @media (min-width: 600px) {
          .payment-form-container { padding: 16px 20px 28px; }
          .payment-form-container h2 { font-size: 26px; }
          .form-row { flex-direction: row; gap: 16px; margin-bottom: 4px; align-items: flex-start; }
          .form-row > * { flex: 1; margin-bottom: 14px; }
          .form-row .flex-15 { flex: 1.5; }
          input, select, textarea { font-size: 14px; }
        }

        /* ── Buttons ── */
        .btn {
          padding: 11px 18px; font-size: 14px; font-weight: 600;
          border-radius: 8px; cursor: pointer; transition: all 0.2s;
          border: none; touch-action: manipulation;
        }
        .btn-primary { background-color: var(--accent, #266648); color: #fff; min-width: 130px; }
        .btn-primary:hover:not(:disabled) { opacity: 0.88; }
        .btn-secondary { background-color: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
        .btn-secondary:hover:not(:disabled) { background-color: #e5e7eb; }
        .btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .form-actions {
          display: flex; gap: 10px; justify-content: flex-end;
          margin-top: 20px; flex-wrap: wrap;
        }
        @media (max-width: 599px) {
          .form-actions { flex-direction: column-reverse; gap: 8px; }
          .form-actions .btn { width: 100%; text-align: center; min-width: unset; padding: 13px; }
        }

        /* ── Client search (debtor) input ── */
        .debtor-input {
          width: 100%; padding: 10px 12px;
          border: 1px solid #d1d5db; border-radius: 8px;
          background: #fff; font-size: 15px; color: #111827;
          text-align: left; min-height: 42px; outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        @media (min-width: 600px) { .debtor-input { font-size: 14px; min-height: 38px; } }
        .debtor-input::placeholder { color: #9ca3af; }
        .debtor-input:hover { border-color: #266648; }
        .debtor-input:focus { border-color: #266648; box-shadow: 0 0 0 3px rgba(38,102,72,0.12); }
        .debtor-input.dd-error { border-color: #ef4444; }
        .debtor-input.dd-open {
          border-color: #266648;
          border-bottom-left-radius: 0;
          border-bottom-right-radius: 0;
          box-shadow: 0 0 0 3px rgba(38,102,72,0.1);
        }

        /* ── Spinner ── */
        .dd-spinner {
          position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
          width: 14px; height: 14px;
          border: 2px solid #d1d5db; border-top-color: #266648;
          border-radius: 50%; animation: spin 0.7s linear infinite; pointer-events: none;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Dropdown panel ── */
        .debtor-panel {
          position: absolute; z-index: 9999; left: 0; right: 0; top: 100%;
          background: #fff; border: 1px solid #266648; border-top: none;
          border-bottom-left-radius: 10px; border-bottom-right-radius: 10px;
          box-shadow: 0 8px 28px rgba(0,0,0,0.14);
          animation: panelIn 0.12s ease; overflow: hidden;
        }
        @keyframes panelIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 599px) {
          .debtor-panel {
            position: fixed !important;
            left: 12px !important; right: 12px !important; top: auto !important;
            max-height: 50vh; overflow-y: auto; z-index: 99999 !important;
            border-radius: 10px; border-top: 1px solid #266648;
          }
        }

        /* ── Dropdown list ── */
        .dd-list { list-style: none; margin: 0; padding: 4px 0; max-height: 220px; overflow-y: auto; }
        @media (max-width: 599px) { .dd-list { max-height: 200px !important; } }
        .dd-list::-webkit-scrollbar { width: 4px; }
        .dd-list::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }
        .dd-item {
          padding: 11px 14px; cursor: pointer; display: flex; flex-direction: column;
          gap: 2px; text-align: left; border-left: 3px solid transparent; transition: background 0.1s;
        }
        .dd-item:hover, .dd-item.dd-active { background: #f0faf5; border-left-color: #266648; }
        .dd-item-name { font-size: 13px; font-weight: 600; color: #111827; }
        .dd-item-meta { font-size: 11px; color: #6b7280; }
        .dd-empty { padding: 14px 16px; text-align: left; font-size: 13px; color: #9ca3af; }
        .dd-footer {
          padding: 6px 14px; font-size: 11px; color: #9ca3af;
          border-top: 1px solid #f0f0f0; background: #fafafa; text-align: left;
        }

        /* ── Error / info cards ── */
        .debtor-api-error {
          margin-top: 6px; padding: 9px 12px; font-size: 12px; color: #b91c1c;
          background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px;
          display: flex; align-items: flex-start; gap: 8px; line-height: 1.4;
        }
        .debtor-api-error button {
          margin-left: auto; flex-shrink: 0; font-size: 11px; padding: 3px 10px;
          border: 1px solid #fca5a5; border-radius: 5px; background: #fff;
          color: #b91c1c; cursor: pointer;
        }
        .debtor-api-error button:hover { background: #fee2e2; }

        .client-detail-card {
          margin-top: 6px; padding: 8px 12px;
          background: #f0faf5; border: 1px solid #a7f3d0; border-radius: 8px;
          display: flex; gap: 14px; flex-wrap: wrap;
        }
        .client-detail-item { display: flex; flex-direction: column; gap: 1px; }
        .client-detail-label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
        .client-detail-value { font-size: 13px; color: #111827; font-weight: 500; }
        @media (max-width: 599px) { .client-detail-card { flex-direction: column; gap: 8px; } }

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
      `}</style>

      <h2 style={{ color: 'var(--accent)', fontSize: '28px', fontWeight: '600' }}>
        {isEdit ? 'Edit Payment' : 'Collection Form'}
      </h2>

      {submitStatus && (
        <div className={`alert alert-${submitStatus.type}`}>{submitStatus.message}</div>
      )}

      <form onSubmit={handleSubmit} className="payment-form">

        {/* ── Row 1 — Department & Branch (single line) ── */}
        <div className="form-row">
          <div className="form-group">
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

          <div className="form-group">
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
        <div className="form-row">
          <div className="form-group flex-15" ref={wrapperRef}>
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
                        {d.openingdepartment && (() => {
                          const deptObj = departments.find(dept => dept.department_id === d.openingdepartment);
                          const deptLabel = deptObj ? deptObj.department : d.openingdepartment;
                          return (
                            <span className="dd-item-meta" style={{ fontSize: '10px', color: '#266648' }}>
                              {deptLabel}
                            </span>
                          );
                        })()}
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

          <div className="form-group">
            <label htmlFor="place">Place <span style={{ color: 'var(--red)' }}>*</span></label>
            <input
              type="text" id="place" name="place" value={formData.place}
              onChange={handleChange} placeholder="Enter place"
              className={errors.place ? 'error' : ''}
            />
            {errors.place && <span className="error-message">{errors.place}</span>}
          </div>

          <div className="form-group">
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
        <div className="form-row">
          <div className="form-group">
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

          <div className="form-group">
            {formData.collectionType && formData.collectionType !== 'Cash' ? (
              <>
                <label htmlFor="paymentProof">Payment Proof <span style={{ color: 'var(--red)' }}>*</span></label>
                {isMobileDevice() ? (
                  <input
                    type="file" id="paymentProof" name="paymentProof"
                    onChange={handleFileChange} accept="image/*"
                    capture="environment"
                    className={errors.paymentProof ? 'error' : ''}
                  />
                ) : (
                  <input
                    type="file" id="paymentProof" name="paymentProof"
                    onChange={handleFileChange} accept="image/*,.pdf"
                    className={errors.paymentProof ? 'error' : ''}
                  />
                )}
                <small style={{ marginTop: '4px', display: 'block', color: '#6b7280', fontSize: '11px' }}>
                  {isMobileDevice() ? '📷 Camera capture • Max 5MB' : '📁 File upload • Max 5MB'}
                </small>
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
        <div className="form-row">
          <div className="form-group">
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

          <div className="form-group">
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

      {/* ── Collection Submitted Popup ── */}
      {showCashPopup && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }}>
          <div style={{
            background: '#fff', borderRadius: '14px', padding: '36px 32px',
            minWidth: '320px', maxWidth: '400px', width: '90%', textAlign: 'center',
            boxShadow: '0 12px 40px rgba(0,0,0,0.22)',
          }}>
            {/* Success check */}
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: '#e8f5ee', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 16px',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="12" fill="#266648"/>
                <path d="M7 12.5l3.5 3.5 6.5-7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <h3 style={{ margin: '0 0 6px', color: '#1a1a1a', fontSize: '18px', fontWeight: 700 }}>
              Collection Submitted!
            </h3>
            <p style={{ margin: '0 0 20px', color: '#666', fontSize: '13.5px', lineHeight: 1.5 }}>
              Payment has been recorded successfully.
            </p>

            {/* Cash receiver confirmation */}
            <div style={{
              background: '#f6faf8', border: '1.5px solid #c3dfd1',
              borderRadius: '10px', padding: '14px 16px', marginBottom: '24px',
            }}>
              <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#266648', fontSize: '14px' }}>
                💵 Cash Received by Collector?
              </p>
              <p style={{ margin: 0, color: '#555', fontSize: '12.5px' }}>
                Confirm whether the cash has been physically collected.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={async () => {
                  const normalized = pendingSuccess?.normalized;
                  setShowCashPopup(false);
                  resetForm();
                  if (normalized?.id != null) {
                    try {
                      await apiFetch(`${ENDPOINTS.payment(normalized.id)}`, {
                        method: 'PATCH',
                        headers: authHeaders({ 'Content-Type': 'application/json' }),
                        body: JSON.stringify({ cash_received: true }),
                      });
                    } catch (err) {
                      console.warn('Failed to save cash_received:', err);
                    }
                  }
                  if (typeof onSuccess === 'function' && normalized) {
                    onSuccess({ ...normalized, cashReceived: true });
                  }
                  setPendingSuccess(null);
                }}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: '8px',
                  border: 'none', background: '#266648', color: '#fff',
                  fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                }}
              >
                ✓ Yes, Received
              </button>
              <button
                onClick={async () => {
                  const normalized = pendingSuccess?.normalized;
                  setShowCashPopup(false);
                  resetForm();
                  if (normalized?.id != null) {
                    try {
                      await apiFetch(`${ENDPOINTS.payment(normalized.id)}`, {
                        method: 'PATCH',
                        headers: authHeaders({ 'Content-Type': 'application/json' }),
                        body: JSON.stringify({ cash_received: false }),
                      });
                    } catch (err) {
                      console.warn('Failed to save cash_received:', err);
                    }
                  }
                  if (typeof onSuccess === 'function' && normalized) {
                    onSuccess({ ...normalized, cashReceived: false });
                  }
                  setPendingSuccess(null);
                }}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: '8px',
                  border: '1.5px solid #ddd', background: '#f5f5f5',
                  color: '#444', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                }}
              >
                ✗ Not Yet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentForm;