import { useState, useRef, useEffect } from "react";
import CameraswitchOutlinedIcon from "@mui/icons-material/CameraswitchOutlined";
import { updateClaim, fetchClaim } from "../service/claims";

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

const DEPARTMENTS_API_URL = "https://flasherp.imcbs.com/api/departments/";

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

  // Fetch departments from API on mount
  useEffect(() => {
    fetch(DEPARTMENTS_API_URL)
      .then((r) => r.json())
      .then((data) => {
        const results = data?.results ?? data;
        if (Array.isArray(results)) {
          setDepartments([
            { value: "", label: "Select Department" },
            ...results.map((d) => ({ value: d.department, label: d.department })),
          ]);
        }
      })
      .catch(() => {})
      .finally(() => setDeptLoading(false));
  }, []);

  useEffect(() => {
    const loadClaimData = async () => {
      try {
        // Fetch full claim data including receipt URL
        const fullClaim = await fetchClaim(claim.id);
        setForm({
          expenseType: fullClaim._raw?.expense_type || claim.expense_type || "",
          department: fullClaim._raw?.department || claim.department || "",
          clientName: fullClaim.clientName || claim.clientName || "",
          purpose: fullClaim._raw?.purpose || "",
          amount: fullClaim.amount || claim.amount || "",
          notes: fullClaim._raw?.notes || "",
          receipt: null,
        });
        setHasExistingReceipt(!!fullClaim._raw?.receipt);
      } catch (err) {
        // Fallback to passed claim data
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
    loadClaimData();
  }, [claim]);

  const validate = () => {
    const newErrors = {};
    if (!form.expenseType) newErrors.expenseType = "Expense type is required.";
    if (!form.department) newErrors.department = "Department is required.";
    if (!form.clientName.trim()) newErrors.clientName = "Client name is required.";
    if (!form.purpose.trim()) newErrors.purpose = "Purpose is required.";
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
    handleFile(e.dataTransfer.files[0]);
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
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.header}>
          <div style={s.headerCircle1} />
          <div style={s.headerCircle2} />
          <div style={s.headerContent}>
            <h1 style={s.headerTitle}>Edit Claim</h1>
          </div>
        </div>

        {apiError && (
          <div style={s.apiBanner}>
            ⚠️ {apiError}
          </div>
        )}

        <div style={s.formBody}>
          <div style={s.row2}>
            <Field label="Department" required error={errors.department}>
              <select
                name="department"
                value={form.department}
                onChange={handleChange}
                style={{ ...s.input, ...(errors.department ? s.inputError : {}) }}
                disabled={deptLoading}
              >
                {deptLoading
                  ? <option value="">Loading departments…</option>
                  : departments.map((d) => (
                      <option key={d.value || "placeholder"} value={d.value}>{d.label}</option>
                    ))
                }
              </select>
            </Field>

            <Field label="Expense Type" required error={errors.expenseType}>
              <select
                name="expenseType"
                value={form.expenseType}
                onChange={handleChange}
                style={{ ...s.input, ...(errors.expenseType ? s.inputError : {}) }}
              >
                {expenseTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>
          </div>

          <div style={s.row2}>
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
                value={form.amount}
                onChange={handleChange}
                style={{ ...s.input, ...(errors.amount ? s.inputError : {}) }}
              />
            </Field>
          </div>

          <div style={s.row2}>
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
                  style={{ ...s.dropZoneInline, ...(dragOver ? s.dropZoneActiveInline : {}) }}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <CameraswitchOutlinedIcon style={{ fontSize: 22, color: "#64748b" }} />
                  <div style={s.dropTextInline}>Click or drag to upload</div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    style={{ display: "none" }}
                    onChange={(e) => handleFile(e.target.files[0])}
                  />
                </div>
              ) : (
                <div style={s.receiptCardInline}>
                  {receiptPreview === "pdf" ? (
                    <div style={s.pdfRowInline}>
                      <span style={{ fontSize: 20 }}>📄</span>
                      <div style={s.receiptFileNameInline}>{form.receipt?.name || "Receipt attached"}</div>
                    </div>
                  ) : receiptPreview ? (
                    <div style={s.imgPreviewInline}>
                      <img src={receiptPreview} alt="Receipt preview" style={s.thumbImg} />
                      <span style={s.receiptFileNameInline}>{form.receipt?.name}</span>
                    </div>
                  ) : hasExistingReceipt && (
                    <div style={s.pdfRowInline}>
                      <span style={{ fontSize: 20 }}>📎</span>
                      <div style={s.receiptFileNameInline}>Existing receipt (replace by uploading new)</div>
                    </div>
                  )}
                  <button style={s.removeBtnInline} onClick={removeReceipt}>✕</button>
                </div>
              )}
            </Field>
          </div>

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

          <div style={s.actionBar}>
            <button style={s.cancelBtn} onClick={onCancel} disabled={loading}>
              Cancel
            </button>
            <button style={{ ...s.submitBtn, opacity: loading ? 0.7 : 1 }} onClick={handleSubmit} disabled={loading}>
              {loading ? "Updating…" : "Update Claim"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: {
    height: "100%",
    width: "100%",
    overflowY: "auto",
    background: "#f4f5f7",
    fontFamily: "'Google Sans', sans-serif",
    padding: "28px 32px",
    // Mobile: reduce padding
    "@media (max-width: 768px)": {
      padding: "16px",
    },
  },
  card: {
    width: "100%",
    maxWidth: 960,
    margin: "0 auto",
    background: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
    border: "1px solid #e8eaed",
  },
  header: {
    position: "relative",
    padding: "28px 40px 24px",
    overflow: "hidden",
    // Mobile: reduce padding
    "@media (max-width: 768px)": {
      padding: "20px 20px 16px",
    },
  },
  headerCircle1: {
    position: "absolute", top: -60, right: -60,
    width: 180, height: 180, borderRadius: "50%",
    background: "rgba(255,255,255,0.05)",
  },
  headerCircle2: {
    position: "absolute", bottom: -40, left: "42%",
    width: 120, height: 120, borderRadius: "50%",
    background: "rgba(255,255,255,0.03)",
  },
  headerContent: { position: "relative", zIndex: 1 },
  headerTitle: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    color: "black",
    letterSpacing: "-0.5px",
    // Mobile: smaller font size
    "@media (max-width: 768px)": {
      fontSize: 22,
    },
  },
  apiBanner: {
    margin: "0 40px",
    padding: "10px 16px",
    background: "#fff5f5",
    border: "1px solid #fca5a5",
    borderRadius: 8,
    color: "#b91c1c",
    fontSize: 13,
    fontFamily: "'Google Sans', sans-serif",
    // Mobile: reduce side margin
    "@media (max-width: 768px)": {
      margin: "0 20px",
    },
  },
  formBody: {
    padding: "28px 40px 32px",
    display: "flex",
    flexDirection: "column",
    gap: 18,
    // Mobile: reduce padding
    "@media (max-width: 768px)": {
      padding: "20px 20px 24px",
      gap: 14,
    },
  },
  row2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
    // Mobile: stack columns
    "@media (max-width: 768px)": {
      gridTemplateColumns: "1fr",
      gap: 14,
    },
  },
  fieldWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    alignItems: "flex-start",
    width: "100%",
  },
  label: {
    fontSize: 15,
    fontWeight: 600,
    color: "#1e293b",
    fontFamily: "'Google Sans', sans-serif",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  required: { color: "#e11d48" },
  input: {
    padding: "10px 14px",
    border: "1.5px solid #e2e8f0",
    borderRadius: 10,
    fontSize: 14,
    fontFamily: "'Google Sans', sans-serif",
    color: "#1e293b",
    background: "#f8fafc",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  },
  inputError: { borderColor: "#fca5a5", background: "#fff5f5" },
  textarea: { resize: "vertical", minHeight: 70, lineHeight: 1.5 },
  errorMsg: { fontSize: 11, color: "#e11d48", fontFamily: "'Courier New',monospace", marginTop: 3 },
  dropZoneInline: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    borderRadius: 10,
    padding: "8px 14px",
    background: "#f8fafc",
    cursor: "pointer",
    transition: "all 0.2s",
    border: "1.5px dashed #e2e8f0",
    // Mobile: wrap content
    "@media (max-width: 768px)": {
      flexWrap: "wrap",
      justifyContent: "center",
      gap: 6,
    },
  },
  dropZoneActiveInline: { borderColor: "#0f2744", background: "#eff6ff" },
  dropTextInline: {
    fontSize: 12,
    color: "#64748b",
    // Mobile: smaller text
    "@media (max-width: 768px)": {
      fontSize: 11,
    },
  },
  receiptCardInline: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    border: "1.5px solid #e2e8f0",
    borderRadius: 10,
    padding: "4px 8px 4px 12px",
    background: "#f8fafc",
    // Mobile: wrap on very small screens
    "@media (max-width: 480px)": {
      flexWrap: "wrap",
      padding: "8px",
    },
  },
  pdfRowInline: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0, // allows text truncation
  },
  imgPreviewInline: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  thumbImg: { width: 28, height: 28, objectFit: "cover", borderRadius: 6 },
  receiptFileNameInline: {
    fontSize: 11,
    color: "#1e293b",
    fontWeight: 500,
    wordBreak: "break-all",
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    "@media (max-width: 480px)": {
      whiteSpace: "normal",
      wordBreak: "break-word",
    },
  },
  removeBtnInline: {
    background: "none",
    border: "none",
    color: "#ef4444",
    fontSize: 16,
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: 20,
    flexShrink: 0,
  },
  divider: { borderTop: "1px solid #f1f5f9", marginTop: 8 },
  actionBar: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 4,
    // Mobile: full width buttons
    "@media (max-width: 768px)": {
      flexDirection: "column",
      alignItems: "stretch",
      gap: 10,
    },
  },
  cancelBtn: {
    padding: "10px 24px",
    borderRadius: 10,
    border: "1.5px solid #cbd5e1",
    background: "#ffffff",
    color: "#64748b",
    fontSize: 13,
    fontFamily: "'Google Sans', sans-serif",
    fontWeight: 600,
    cursor: "pointer",
    // Mobile: full width
    "@media (max-width: 768px)": {
      width: "100%",
      textAlign: "center",
    },
  },
  submitBtn: {
    padding: "10px 28px",
    borderRadius: 10,
    border: "none",
    background: "#1a73e8",
    color: "#fff",
    fontSize: 13,
    fontFamily: "'Google Sans', sans-serif",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(15,39,68,0.3)",
    // Mobile: full width
    "@media (max-width: 768px)": {
      width: "100%",
      textAlign: "center",
    },
  },
};