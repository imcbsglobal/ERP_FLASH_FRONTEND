// claim_edit.jsx - Fixed version
import { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import CameraswitchOutlinedIcon from "@mui/icons-material/CameraswitchOutlined";
import { updateClaim, fetchClaim, ENDPOINTS, authHeaders, apiFetch } from '../service/Api';

const DEPARTMENTS_API_URL = ENDPOINTS.claimDepartments;

// Fixed: Properly defined expenseTypes array
const expenseTypes = [
  { value: "", label: "Select Expense Type" },
  { value: "self_expense", label: "Self Expense" },
  { value: "travel_expense", label: "Travel Expense" },
  { value: "food_expense", label: "Food Expense" },
  { value: "accommodation", label: "Accommodation Expense" },
  { value: "fuel", label: "Fuel Expense" },
  { value: "parking", label: "Parking Expense" },
  { value: "toll", label: "Toll Expense" },
];

const STYLE_ID = "claim-edit-styles";

if (typeof document !== "undefined") {
  // Remove any stale version before injecting fresh styles
  const existing = document.getElementById(STYLE_ID);
  if (existing) existing.remove();
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    /* ── Base (desktop standalone page) ── */
    .ce-page {
      height: 100%;
      width: 100%;
      overflow-y: auto;
      background: #f5f7fb;
      font-family: 'Google Sans', 'Segoe UI', system-ui, -apple-system, sans-serif;
      padding: 24px;
      box-sizing: border-box;
    }

    /*
     * The card works in TWO contexts:
     *   1. Standalone page  → normal block, scrolls with page
     *   2. Inside a modal   → parent modal constrains height;
     *      card uses flex-column so the form scrolls and
     *      the action bar stays pinned to the bottom of the card.
     *
     * We use display:flex + flex-direction:column always, so both
     * contexts work without knowing which one we're in.
     */
    .ce-card {
      width: 100%;
      max-width: 960px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 28px;
      border: 1px solid #eef2f8;
      box-shadow: 0 8px 30px rgba(0,0,0,0.05);
      display: flex;
      flex-direction: column;
      /* When used as a standalone page the card grows naturally.
         When inside a modal, the modal sets max-height and overflow:hidden,
         so the card will respect that and let .ce-form-scroll handle scrolling. */
      overflow: hidden;
    }

    /* ── Header – never scrolls ── */
    .ce-header {
      position: relative;
      padding: 24px 32px 18px;
      background: #ffffff;
      border-bottom: 1px solid #f0f3f9;
      flex-shrink: 0;
    }
    .ce-header-title {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      color: #0a2540;
      letter-spacing: -0.3px;
    }

    /* ── Error banner ── */
    .ce-api-banner {
      margin: 12px 32px 0;
      padding: 12px 16px;
      background: #fff5f5;
      border-left: 4px solid #e53e3e;
      border-radius: 14px;
      color: #b91c1c;
      font-size: 13px;
      font-weight: 500;
      flex-shrink: 0;
    }

    /* ── Scrollable form area ── */
    .ce-form-body {
      flex: 1;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      padding: 24px 32px 20px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .ce-row2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    /* ── Action bar – pinned to bottom of card, never scrolls ── */
    .ce-action-bar {
      flex-shrink: 0;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 14px;
      padding: 16px 32px;
      border-top: 1px solid #eef2f8;
      background: #ffffff;
    }

    /* ── Buttons (desktop) ── */
    .ce-cancel-btn {
      padding: 11px 28px;
      border-radius: 60px;
      border: 1.5px solid #cbd5e1;
      background: #ffffff;
      color: #475569;
      font-size: 14px;
      font-family: 'Google Sans', sans-serif;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }
    .ce-cancel-btn:hover:not(:disabled) {
      background: #f8fafc;
      border-color: #94a3b8;
    }
    .ce-cancel-btn:active { transform: scale(0.97); }

    .ce-submit-btn {
      padding: 11px 32px;
      border-radius: 60px;
      border: none;
      background: #1a5cff;
      color: #ffffff;
      font-size: 14px;
      font-family: 'Google Sans', sans-serif;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(26,92,255,0.28);
      transition: all 0.2s ease;
      white-space: nowrap;
    }
    .ce-submit-btn:hover:not(:disabled) {
      background: #0e4ad0;
      box-shadow: 0 6px 18px rgba(26,92,255,0.38);
    }
    .ce-submit-btn:active { transform: scale(0.97); }

    /* ── Upload zone ── */
    .ce-drop-zone {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      border-radius: 20px;
      padding: 12px 16px;
      background: #fafcff;
      cursor: pointer;
      transition: all 0.2s;
      border: 1.8px dashed #cbdde9;
      min-height: 52px;
    }
    .ce-drop-zone.active {
      border-color: #1a5cff;
      background: #f0f6ff;
    }
    .ce-receipt-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      border: 1.5px solid #e2edf5;
      border-radius: 20px;
      padding: 8px 14px;
      background: #fafdff;
    }

    /* ── Mobile (≤ 600 px) ── */
    @media (max-width: 600px) {
      .ce-page {
        padding: 0;
        background: #fff;
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100dvh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        z-index: 1;
      }

      .ce-card {
        border-radius: 0;
        box-shadow: none;
        border: none;
        width: 100%;
        max-width: 100%;
        flex: 1;
        height: 100%;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .ce-header {
        padding: 16px 20px 14px;
        flex-shrink: 0;
      }
      .ce-header-title {
        font-size: 20px;
        text-align: center;
      }

      .ce-api-banner {
        margin: 10px 16px 0;
        font-size: 12px;
        flex-shrink: 0;
      }

      .ce-form-body {
        padding: 16px 16px 12px;
        gap: 14px;
        flex: 1;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }

      .ce-row2 {
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .ce-action-bar {
        padding: 12px 16px 16px;
        gap: 10px;
        justify-content: stretch;
        flex-shrink: 0;
        box-shadow: 0 -2px 12px rgba(0,0,0,0.06);
        background: #fff;
      }

      .ce-cancel-btn,
      .ce-submit-btn {
        flex: 1;
        text-align: center;
        padding: 13px 12px;
        font-size: 14px;
        font-weight: 700;
        border-radius: 10px;
        min-height: 46px;
      }

      .ce-drop-zone {
        flex-wrap: wrap;
        padding: 16px 12px;
        flex-direction: column;
        justify-content: center;
        gap: 8px;
      }
      .ce-receipt-card { flex-wrap: wrap; }

      input, select, textarea { font-size: 16px !important; }
    }

    /* ── Tablet (601 px – 900 px) ── */
    @media (min-width: 601px) and (max-width: 900px) {
      .ce-page { padding: 20px; }
      .ce-header { padding: 22px 28px 16px; }
      .ce-header-title { font-size: 24px; }
      .ce-api-banner { margin: 10px 28px 0; }
      .ce-form-body { padding: 22px 28px 18px; gap: 18px; }
      .ce-action-bar { padding: 14px 28px; }
      .ce-row2 { grid-template-columns: 1fr; gap: 18px; }
    }

    @media (min-width: 901px) and (max-width: 1100px) {
      .ce-card { max-width: 880px; }
    }

    /* -- Expense type combobox -- */
    .ce-combo-wrap { position: relative; width: 100%; }
    .ce-combo-arrow {
      position: absolute; right: 14px; top: 50%;
      transform: translateY(-50%);
      pointer-events: none; color: #64748b; font-size: 11px;
      transition: transform 0.15s;
    }
    .ce-combo-arrow--open { transform: translateY(-50%) rotate(180deg); }
    .ce-combo-input { padding-right: 36px !important; }
  `;
  document.head.appendChild(style);
}

// Expense type combobox — portal so it escapes overflow:hidden
function ExpenseTypeCombobox({ value, onChange, hasError }) {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState(value || "");
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const inputRef              = useRef(null);
  const dropRef               = useRef(null);

  useEffect(() => { setQuery(value || ""); }, [value]);

  useEffect(() => {
    if (open && inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX, width: r.width });
    }
  }, [open]);

  useEffect(() => {
    function onDown(e) {
      if (
        inputRef.current && !inputRef.current.contains(e.target) &&
        dropRef.current  && !dropRef.current.contains(e.target)
      ) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onScroll(e) {
      // Don't close when scrolling inside the dropdown list itself
      if (dropRef.current && dropRef.current.contains(e.target)) return;
      setOpen(false);
    }
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [open]);

  const allOpts = expenseTypes.filter(t => t.value);
  const filtered = query.trim()
    ? allOpts.filter(t => t.label.toLowerCase().includes(query.toLowerCase()))
    : allOpts;

  function select(label) {
    setQuery(label);
    onChange({ target: { name: "expenseType", value: label } });
    setOpen(false);
  }

  function handleInput(e) {
    setQuery(e.target.value);
    onChange({ target: { name: "expenseType", value: e.target.value } });
    setOpen(true);
  }

  const inputStyle = { ...s.input, paddingRight: 36, ...(hasError ? s.inputError : {}) };

  const dropdown = open ? ReactDOM.createPortal(
    <div
      ref={dropRef}
      style={{
        position: "absolute",
        top: dropPos.top, left: dropPos.left, width: dropPos.width,
        background: "#fff",
        border: "1.5px solid #1a5cff",
        borderRadius: 18,
        boxShadow: "0 8px 28px rgba(0,0,0,0.14)",
        zIndex: 99999,
        maxHeight: 240,
        overflowY: "auto",
        fontFamily: "'Google Sans', sans-serif",
      }}
    >
      {filtered.length > 0
        ? filtered.map(t => (
            <div
              key={t.value}
              onMouseDown={() => select(t.label)}
              style={{
                padding: "11px 16px", fontSize: 14,
                color: value === t.label ? "#1a5cff" : "#1a2c3e",
                background: value === t.label ? "#f0f6ff" : "transparent",
                cursor: "pointer",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#f0f6ff"}
              onMouseLeave={e => e.currentTarget.style.background = value === t.label ? "#f0f6ff" : "transparent"}
            >
              {t.label}
            </div>
          ))
        : (
            <div style={{ padding: "11px 16px", fontSize: 13, color: "#94a3b8", fontStyle: "italic" }}>
              Type to add &ldquo;{query}&rdquo; as custom expense type
            </div>
          )
      }
    </div>,
    document.body
  ) : null;

  return (
    <div className="ce-combo-wrap">
      <input
        ref={inputRef}
        type="text"
        name="expenseType"
        placeholder="Select or type expense type"
        value={query}
        onChange={handleInput}
        onFocus={() => setOpen(true)}
        autoComplete="off"
        style={inputStyle}
      />
      <span className={`ce-combo-arrow${open ? " ce-combo-arrow--open" : ""}`}>▼</span>
      {dropdown}
    </div>
  );
}

// Field component
function Field({ label, required, error, children }) {
  return (
    <div style={s.fieldWrap}>
      <label style={s.label}>
        {label} {required && <span style={s.required}>*</span>}
      </label>
      {children}
      {error && <span style={s.errorMsg}>{error}</span>}
    </div>
  );
}

export default function ClaimsEdit({ claim, onSuccess, onCancel }) {
  const [form, setForm] = useState({
    expenseType: "",
    department: "",
    clientName: "",
    purpose: "",
    amount: "",
    notes: "",
    receipt: null,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [hasExistingReceipt, setHasExistingReceipt] = useState(false);
  const [departments, setDepartments] = useState([{ value: "", label: "Select Department" }]);
  const [deptLoading, setDeptLoading] = useState(true);
  const fileInputRef = useRef();

  // Fetch departments
  useEffect(() => {
    apiFetch(DEPARTMENTS_API_URL, { headers: authHeaders() })
      .then((data) => {
        const results = data?.results ?? data;
        if (Array.isArray(results)) {
          setDepartments([
            { value: "", label: "Select Department" },
            ...results.map((d) => ({ value: d.department_id, label: d.department })),
          ]);
        }
      })
      .catch(() => console.warn("dept fetch failed"))
      .finally(() => setDeptLoading(false));
  }, []);

  // Load claim data
  useEffect(() => {
    const loadClaimData = async () => {
      try {
        const fullClaim = await fetchClaim(claim.id);
        // Always use the raw department_id stored in DB for the select value
        const deptId = fullClaim._raw?.department || claim.department || "";
        setForm({
          expenseType: fullClaim._raw?.expense_type || claim.expense_type || "",
          department: deptId,
          clientName: fullClaim.clientName || claim.clientName || "",
          purpose: fullClaim._raw?.purpose || "",
          amount: fullClaim.amount || claim.amount || "",
          notes: fullClaim._raw?.notes || "",
          receipt: null,
        });
        setHasExistingReceipt(!!fullClaim._raw?.receipt);
      } catch (err) {
        setForm({
          expenseType: claim.expense_type || "",
          department: claim.department || "",
          clientName: claim.clientName || "",
          purpose: "",
          amount: claim.amount || "",
          notes: "",
          receipt: null,
        });
        setHasExistingReceipt(!!claim.receipt);
      }
    };
    if (claim?.id) loadClaimData();
  }, [claim]);

  const validate = () => {
    const newErrors = {};
    if (!form.expenseType?.trim()) newErrors.expenseType = "Expense type is required.";
    if (!form.department) newErrors.department = "Department is required.";
    if (!form.clientName?.trim()) newErrors.clientName = "Client name is required.";
    if (!form.purpose?.trim()) newErrors.purpose = "Purpose is required.";
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0)
      newErrors.amount = "Enter a valid amount.";
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
    if (apiError) setApiError("");
  };

  const handleFile = (file) => {
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      setErrors((prev) => ({ ...prev, receipt: "Only JPG, PNG, WEBP or PDF allowed." }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, receipt: "File size must be under 5 MB." }));
      return;
    }
    setForm((prev) => ({ ...prev, receipt: file }));
    setErrors((prev) => ({ ...prev, receipt: undefined }));
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setReceiptPreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setReceiptPreview("pdf");
    }
    setHasExistingReceipt(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  const removeReceipt = () => {
    setForm((prev) => ({ ...prev, receipt: null }));
    setReceiptPreview(null);
    setHasExistingReceipt(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setLoading(true);
    setApiError("");
    try {
      const updatedClaim = await updateClaim(claim.id, form);
      if (onSuccess) onSuccess(updatedClaim);
      if (onCancel) onCancel();
    } catch (err) {
      setApiError(err.message || "Failed to update claim. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ce-page">
      <div className="ce-card">
        <div className="ce-header">
          <div style={s.headerCircle1} />
          <div style={s.headerCircle2} />
          <h1 className="ce-header-title">Edit Claim</h1>
        </div>

        {apiError && <div className="ce-api-banner">⚠️ {apiError}</div>}

        <div className="ce-form-body">
          {/* Department + Expense Type */}
          <div className="ce-row2">
            <Field label="Department" required error={errors.department}>
              <select
                name="department"
                value={form.department}
                onChange={handleChange}
                style={{ ...s.input, ...(errors.department ? s.inputError : {}) }}
                disabled={deptLoading}
              >
                {deptLoading ? (
                  <option value="">Loading departments…</option>
                ) : (
                  departments.map((d) => (
                    <option key={d.value || "placeholder"} value={d.value}>
                      {d.label}
                    </option>
                  ))
                )}
              </select>
            </Field>

            <Field label="Expense Type" required error={errors.expenseType}>
              <ExpenseTypeCombobox
                value={form.expenseType}
                onChange={handleChange}
                hasError={!!errors.expenseType}
              />
            </Field>
          </div>

          {/* Client Name + Amount */}
          <div className="ce-row2">
            <Field label="Client Name" required error={errors.clientName}>
              <input
                type="text"
                name="clientName"
                placeholder="Enter client name"
                value={form.clientName}
                onChange={handleChange}
                style={{ ...s.input, ...(errors.clientName ? s.inputError : {}) }}
              />
            </Field>

            <Field label="Amount (₹)" required error={errors.amount}>
              <input
                type="number"
                name="amount"
                placeholder="0.00"
                min="0"
                step="any"
                value={form.amount}
                onChange={handleChange}
                style={{ ...s.input, ...(errors.amount ? s.inputError : {}) }}
              />
            </Field>
          </div>

          {/* Purpose + Receipt */}
          <div className="ce-row2">
            <Field label="Purpose" required error={errors.purpose}>
              <input
                type="text"
                name="purpose"
                placeholder="Briefly describe the purpose"
                value={form.purpose}
                onChange={handleChange}
                style={{ ...s.input, ...(errors.purpose ? s.inputError : {}) }}
              />
            </Field>

            <Field label="Receipt / Attachment" error={errors.receipt}>
              {!receiptPreview && !hasExistingReceipt ? (
                <div
                  className={`ce-drop-zone ${dragOver ? "active" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <CameraswitchOutlinedIcon style={{ fontSize: 22, color: "#3b6cb7" }} />
                  <div style={s.dropTextInline}>Click or drag to upload</div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    style={{ display: "none" }}
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                </div>
              ) : (
                <div className="ce-receipt-card">
                  {receiptPreview === "pdf" ? (
                    <div style={s.pdfRowInline}>
                      <span style={{ fontSize: 22 }}>📄</span>
                      <div style={s.receiptFileNameInline}>
                        {form.receipt?.name || "document.pdf"}
                      </div>
                    </div>
                  ) : receiptPreview ? (
                    <div style={s.imgPreviewInline}>
                      <img src={receiptPreview} alt="Preview" style={s.thumbImg} />
                      <span style={s.receiptFileNameInline}>{form.receipt?.name}</span>
                    </div>
                  ) : hasExistingReceipt ? (
                    <div style={s.pdfRowInline}>
                      <span style={{ fontSize: 20 }}>📎</span>
                      <div style={s.receiptFileNameInline}>
                        Existing receipt (replace by uploading new)
                      </div>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    style={s.removeBtnInline}
                    onClick={removeReceipt}
                    aria-label="Remove receipt"
                  >
                    ✕
                  </button>
                </div>
              )}
            </Field>
          </div>

          {/* Notes full width */}
          <Field label="Notes">
            <textarea
              name="notes"
              placeholder="Additional notes (optional)"
              value={form.notes}
              onChange={handleChange}
              style={{ ...s.input, ...s.textarea }}
            />
          </Field>

          <div style={s.divider} />
        </div>

        {/* Action bar – flex-shrink:0, always visible at bottom of card */}
        <div className="ce-action-bar">
          <button className="ce-cancel-btn" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button
            className="ce-submit-btn"
            style={{ opacity: loading ? 0.7 : 1 }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Updating…" : "Update Claim"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Inline styles
const s = {
  headerCircle1: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: "50%",
    background: "rgba(26,92,255,0.03)",
    pointerEvents: "none",
  },
  headerCircle2: {
    position: "absolute",
    bottom: -40,
    left: "38%",
    width: 130,
    height: 130,
    borderRadius: "50%",
    background: "rgba(0,0,0,0.02)",
    pointerEvents: "none",
  },
  fieldWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    alignItems: "flex-start",
    width: "100%",
  },
  label: {
    fontSize: 14,
    fontWeight: 600,
    color: "#1e2f44",
    fontFamily: "'Google Sans', sans-serif",
    letterSpacing: 0.2,
  },
  required: { color: "#e53e3e", marginLeft: 2 },
  input: {
    padding: "12px 16px",
    border: "1.5px solid #e2edf2",
    borderRadius: 18,
    fontSize: 14,
    fontFamily: "'Google Sans', sans-serif",
    color: "#1a2c3e",
    background: "#ffffff",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    transition: "all 0.2s",
  },
  inputError: { borderColor: "#f5b0b0", background: "#fff8f8" },
  textarea: { resize: "vertical", minHeight: 80, lineHeight: 1.45, borderRadius: 20 },
  errorMsg: { fontSize: 11, color: "#e53e3e", fontWeight: 500, marginTop: 4 },
  dropTextInline: { fontSize: 13, color: "#4a627a", fontWeight: 500 },
  pdfRowInline: { display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 },
  imgPreviewInline: { display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 },
  thumbImg: { width: 34, height: 34, objectFit: "cover", borderRadius: 10, border: "1px solid #e2edf2" },
  receiptFileNameInline: {
    fontSize: 12,
    color: "#1f3a5f",
    fontWeight: 500,
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  removeBtnInline: {
    background: "#fef2f2",
    border: "none",
    color: "#dc2626",
    fontSize: 16,
    cursor: "pointer",
    padding: "6px 12px",
    borderRadius: 40,
    flexShrink: 0,
    fontWeight: 600,
    transition: "0.1s",
  },
  divider: { borderTop: "1px solid #ecf3f9", marginTop: 8 },
};