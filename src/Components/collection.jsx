import React, { useState, useEffect } from 'react';
import { createPayment, updatePayment, normalizePayment } from '../service/payment';
import { getBranches } from '../service/user';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// ── Component ──────────────────────────────────────────────────
const PaymentForm = ({ initialData = null, onSuccess, onCancel }) => {
  const isEdit = Boolean(initialData?.id);

  const [formData, setFormData] = useState({
    clientName: '',
    branch: '',
    collectionType: '',
    amount: '',
    paidFor: '',
    notes: '',
    paymentProof: null,
  });

  const [errors, setErrors]           = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [branches, setBranches]         = useState([]);

  const collectionTypes = [
    'Cash', 'Cheque', 'Bank Transfer',
    'Credit Card', 'Debit Card', 'Online Payment',
  ];

  // ── Fetch branches for dropdown ───────────────────────────────
  useEffect(() => {
    getBranches()
      .then(data => {
        const list = Array.isArray(data) ? data : (data.results || data.data || []);
        setBranches(list);
      })
      .catch(err => console.error('Failed to fetch branches:', err));
  }, []);

  // ── Populate fields when editing ──────────────────────────────
  useEffect(() => {
    if (isEdit && initialData) {
      setFormData({
        clientName:     initialData.clientName     ?? '',
        branch:         initialData.branch         ?? '',
        collectionType: initialData.collectionType ?? '',
        amount:         initialData.amount         !== undefined ? String(initialData.amount) : '',
        paidFor:        initialData.paidFor        ?? '',
        notes:          initialData.notes          ?? '',
        paymentProof:   null,  // file inputs can't be pre-filled
      });
      setErrors({});
      setSubmitStatus(null);
    }
  }, [initialData]);

  // ── Handlers ──────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFormData(prev => ({ ...prev, paymentProof: file }));
    if (errors.paymentProof) setErrors(prev => ({ ...prev, paymentProof: '' }));
  };

  // ── Validation ─────────────────────────────────────────────────
  const validateForm = () => {
    const newErrors = {};
    if (!formData.clientName.trim())   newErrors.clientName     = 'Client name is required';
    if (!formData.branch.trim())       newErrors.branch         = 'Branch is required';
    if (!formData.collectionType)      newErrors.collectionType = 'Collection type is required';
    if (!formData.amount) {
      newErrors.amount = 'Amount is required';
    } else if (isNaN(formData.amount) || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount greater than 0';
    }
    if (!formData.paidFor.trim()) newErrors.paidFor = 'Paid for field is required';
    if (formData.collectionType && formData.collectionType !== 'Cash' && !formData.paymentProof) {
      // In edit mode, skip proof validation if an existing proof is already on record
      if (!isEdit || !initialData?.paymentProofUrl) {
        newErrors.paymentProof = 'Payment proof is required for this payment type';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Reset helper ───────────────────────────────────────────────
  const resetForm = () => {
    setFormData({
      clientName: '', branch: '', collectionType: '',
      amount: '', paidFor: '', notes: '', paymentProof: null,
    });
    setErrors({});
    setSubmitStatus(null);
    const fileInput = document.getElementById('paymentProof');
    if (fileInput) fileInput.value = '';
  };

  const handleReset = () => resetForm();

  // ── Submit — real API call ─────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const saved = isEdit
        ? await updatePayment(initialData.id, formData)   // PUT to Django
        : await createPayment(formData);                   // POST to Django
      const normalized = normalizePayment(saved);          // camelCase for parent

      setSubmitStatus({ type: 'success', message: isEdit ? 'Payment updated successfully!' : 'Payment submitted successfully!' });
      if (!isEdit) resetForm();

      if (typeof onSuccess === 'function') onSuccess(normalized); // update parent table

    } catch (error) {
      console.error('Submission error:', error);
      setSubmitStatus({
        type: 'error',
        message: error.message || 'Failed to submit payment. Please try again.',
      });
      
      // Handle auth error specifically
      if (error.name === 'AuthError' || error.message.includes('Session expired')) {
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="payment-form-container" style={{ fontFamily: "'Nohemi', sans-serif" }}>
      <style>{`
        * { font-family: 'Nohemi', sans-serif !important; }
        .payment-form-container, .payment-form, .form-group,
        label, input, select, textarea, button, .error-message, .alert {
          font-family: 'Nohemi', sans-serif !important;
        }
        label {
          display: block;
          text-align: left;
          font-size: 14px !important;
          font-weight: bold !important;
          margin-bottom: 4px;
        }
        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 20px;
        }
        .btn {
          padding: 8px 16px;
          font-size: 14px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-primary {
          background-color: #266648;
          color: white;
          border: none;
          min-width: 120px;
        }
        .btn-primary:hover:not(:disabled) {
          background-color: #1e523f;
        }
        .btn-secondary {
          background-color: #6c757d;
          color: white;
          border: none;
        }
        .btn-secondary:hover:not(:disabled) {
          background-color: #5a6268;
        }
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>

      <h2 style={{ fontFamily: "'Nohemi', sans-serif", color: '#266648', fontSize: '28px', fontWeight: '600' }}>
        {isEdit ? 'Edit Payment' : 'Payment Collection Form'}
      </h2>

      {submitStatus && (
        <div className={`alert alert-${submitStatus.type}`}>
          {submitStatus.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="payment-form">

        {/* Row 1 — Client Name & Branch */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '18px' }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label htmlFor="clientName">Client Name <span style={{ color: 'var(--red)' }}>*</span></label>
            <input
              type="text" id="clientName" name="clientName"
              value={formData.clientName} onChange={handleChange}
              placeholder="Enter client name"
              className={errors.clientName ? 'error' : ''}
            />
            {errors.clientName && <span className="error-message">{errors.clientName}</span>}
          </div>

          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label htmlFor="branch">Branch <span style={{ color: 'var(--red)' }}>*</span></label>
            <select
              id="branch" name="branch"
              value={formData.branch} onChange={handleChange}
              className={errors.branch ? 'error' : ''}
            >
              <option value="">Select branch</option>
              {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
            </select>
            {errors.branch && <span className="error-message">{errors.branch}</span>}
          </div>
        </div>

        {/* Row 2 — Payment Type & Payment Proof */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '18px', alignItems: 'flex-start' }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label htmlFor="collectionType">Payment Type <span style={{ color: 'var(--red)' }}>*</span></label>
            <select
              id="collectionType" name="collectionType"
              value={formData.collectionType} onChange={handleChange}
              className={errors.collectionType ? 'error' : ''}
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
                  style={{ paddingTop: '6px' }}
                />
                {/* Show existing proof link in edit mode */}
                {isEdit && initialData?.paymentProofUrl && (
                  <small style={{ marginTop: '4px', display: 'block' }}>
                    Current:{' '}
                    <a href={initialData.paymentProofUrl} target="_blank" rel="noopener noreferrer"
                      style={{ color: '#266648' }}>
                      View existing proof
                    </a>
                    {formData.paymentProof ? ' (will be replaced)' : ' '}
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
                  minHeight: '36px', display: 'flex', alignItems: 'center',
                }}>
                  {formData.collectionType === 'Cash' ? 'Not required for Cash payments' : 'Select a payment type first'}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Row 3 — Amount & Paid For */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '18px', alignItems: 'flex-start' }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label htmlFor="amount">Amount <span style={{ color: 'var(--red)' }}>*</span></label>
            <div className="amount-input">
              <span className="currency-symbol">₹</span>
              <input
                type="number" id="amount" name="amount"
                value={formData.amount} onChange={handleChange}
                placeholder="0.00" step="0.01" min="0.01"
                className={errors.amount ? 'error' : ''}
              />
            </div>
            {errors.amount && <span className="error-message">{errors.amount}</span>}
          </div>

          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label htmlFor="paidFor">Paid For <span style={{ color: 'var(--red)' }}>*</span></label>
            <input
              type="text" id="paidFor" name="paidFor"
              value={formData.paidFor} onChange={handleChange}
              placeholder="e.g., Consultation, Product Purchase"
              className={errors.paidFor ? 'error' : ''}
            />
            {errors.paidFor && <span className="error-message">{errors.paidFor}</span>}
          </div>
        </div>

        {/* Row 4 — Notes */}
        <div className="form-group">
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes" name="notes"
            value={formData.notes} onChange={handleChange}
            placeholder="Additional notes or remarks..." rows="3"
          />
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          {!isEdit && (
            <button type="button" onClick={handleReset} className="btn btn-secondary" disabled={isSubmitting}>
              Reset
            </button>
          )}
          {typeof onCancel === 'function' && (
            <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={isSubmitting}>
              Cancel
            </button>
          )}
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : isEdit ? 'Update Payment' : 'Submit Payment'}
          </button>
        </div>

      </form>
    </div>
  );
};

export default PaymentForm;