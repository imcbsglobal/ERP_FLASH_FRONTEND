// MobileResponsiveClaimsAdd.jsx - Enhanced mobile version with touch optimizations
import { useState, useRef, useEffect } from "react";
import CameraswitchOutlinedIcon from "@mui/icons-material/CameraswitchOutlined";
import { createClaim, saveDraftClaim } from "../service/claims";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

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

const BASE_URL = "https://flasherp.in/api";
const DEPARTMENTS_API_URL = `${BASE_URL}/claims/departments/`;

const initialForm = {
  expenseType: "",
  department: "",
  clientName: "",
  purpose: "",
  amount: "",
  notes: "",
  receipt: null,
};

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

export default function MobileResponsiveClaimsAdd({ onSuccess, onCancel }) {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [departments, setDepartments] = useState([{ value: "", label: "Select Department" }]);
  const [deptLoading, setDeptLoading] = useState(true);
  const fileInputRef = useRef();

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch departments from API
  useEffect(() => {
    async function loadDepartments() {
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch(DEPARTMENTS_API_URL, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error("Failed to fetch departments");
        const data = await res.json();
        const results = data?.results ?? data;
        if (Array.isArray(results)) {
          setDepartments([
            { value: "", label: "Select Department" },
            ...results.map((d) => ({
              value: d.department,   // store the name so it displays directly everywhere
              label: d.department,
            })),
          ]);
        }
      } catch (err) {
        console.error("Department fetch error:", err);
        // Keep placeholder on error
        setDepartments([{ value: "", label: "Select Department" }]);
      } finally {
        setDeptLoading(false);
      }
    }
    loadDepartments();
  }, []);

  const validate = (isDraftSave = false) => {
    const newErrors = {};
    if (!form.expenseType) newErrors.expenseType = "Expense type is required.";
    if (!form.department) newErrors.department = "Department is required.";
    if (!isDraftSave) {
      if (!form.clientName.trim()) newErrors.clientName = "Client name is required.";
      if (!form.purpose.trim()) newErrors.purpose = "Purpose is required.";
      if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0)
        newErrors.amount = "Enter a valid amount.";
    }
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
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const removeReceipt = () => {
    setForm((prev) => ({ ...prev, receipt: null }));
    setReceiptPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    const validationErrors = validate(false);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setLoading(true);
    setApiError("");
    try {
      const createdClaim = await createClaim(form);
      setIsDraft(false);
      setSubmitted(true);
      if (onSuccess) onSuccess({ ...createdClaim, _localReceiptPreview: receiptPreview });
    } catch (err) {
      setApiError(err.message || "Failed to submit claim. Please try again.");
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    const validationErrors = validate(true);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setLoading(true);
    setApiError("");
    try {
      const draftClaim = await saveDraftClaim(form);
      setIsDraft(true);
      setSubmitted(true);
      if (onSuccess) onSuccess({ ...draftClaim, _localReceiptPreview: receiptPreview });
    } catch (err) {
      setApiError(err.message || "Failed to save draft. Please try again.");
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (onCancel) onCancel();
  };

  if (submitted) {
    return (
      <div style={mobileSuccessStyles.container}>
        <div style={mobileSuccessStyles.card}>
          <div
            style={{
              ...mobileSuccessStyles.icon,
              background: isDraft ? "#64748b" : "#10b981",
            }}
          >
            {isDraft ? "📋" : "✓"}
          </div>
          <h2 style={mobileSuccessStyles.title}>
            {isDraft ? "Draft Saved!" : "Claim Submitted!"}
          </h2>
          <p style={mobileSuccessStyles.message}>
            {isDraft
              ? "Your claim draft has been saved."
              : `₹${Number(form.amount).toLocaleString("en-IN")} submitted successfully`}
          </p>
          <button onClick={handleClose} style={mobileSuccessStyles.closeButton}>
            Close
          </button>
        </div>
      </div>
    );
  }

  // Mobile form layout
  if (isMobile) {
    return (
      <div style={mobileFormStyles.container}>
        <div style={mobileFormStyles.header}>
          <button style={mobileFormStyles.backBtn} onClick={onCancel}>
            <ArrowBackIcon />
          </button>
          <h1 style={mobileFormStyles.title}>New Claim</h1>
          <div style={{ width: 40 }} />
        </div>

        {apiError && (
          <div style={mobileFormStyles.errorBanner}>
            ⚠️ {apiError}
          </div>
        )}

        <div style={mobileFormStyles.form}>
          <Field label="Department" required error={errors.department}>
            <select
              name="department"
              value={form.department}
              onChange={handleChange}
              style={mobileFormStyles.select}
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
              style={mobileFormStyles.select}
            >
              {expenseTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Client Name" required error={errors.clientName}>
            <input
              type="text"
              name="clientName"
              placeholder="Enter client name"
              value={form.clientName}
              onChange={handleChange}
              style={mobileFormStyles.input}
            />
          </Field>

          <Field label="Amount (₹)" required error={errors.amount}>
            <input
              type="number"
              name="amount"
              placeholder="0.00"
              value={form.amount}
              onChange={handleChange}
              style={mobileFormStyles.input}
            />
          </Field>

          <Field label="Purpose" required error={errors.purpose}>
            <input
              type="text"
              name="purpose"
              placeholder="Briefly describe the purpose"
              value={form.purpose}
              onChange={handleChange}
              style={mobileFormStyles.input}
            />
          </Field>

          <Field label="Receipt" error={errors.receipt}>
            {!receiptPreview ? (
              <div
                style={mobileFormStyles.dropZone}
                onClick={() => fileInputRef.current?.click()}
              >
                <CameraswitchOutlinedIcon style={{ fontSize: 28, color: "#64748b" }} />
                <div style={mobileFormStyles.dropText}>Tap to upload receipt</div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  style={{ display: "none" }}
                  onChange={(e) => handleFile(e.target.files[0])}
                />
              </div>
            ) : (
              <div style={mobileFormStyles.receiptPreview}>
                {receiptPreview === "pdf" ? (
                  <span>📄 {form.receipt?.name}</span>
                ) : (
                  <img src={receiptPreview} alt="Preview" style={mobileFormStyles.previewImg} />
                )}
                <button style={mobileFormStyles.removeBtn} onClick={removeReceipt}>
                  <CloseIcon style={{ fontSize: 16 }} />
                </button>
              </div>
            )}
          </Field>

          <Field label="Notes">
            <textarea
              name="notes"
              placeholder="Additional notes (optional)"
              value={form.notes}
              onChange={handleChange}
              style={mobileFormStyles.textarea}
              rows={3}
            />
          </Field>

          <div style={mobileFormStyles.actions}>
            <button style={mobileFormStyles.draftBtn} onClick={handleSaveDraft} disabled={loading}>
              {loading ? "Saving..." : "Save Draft"}
            </button>
            <button style={mobileFormStyles.submitBtn} onClick={handleSubmit} disabled={loading}>
              {loading ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Desktop form
  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.header}>
          <div style={s.headerCircle1} />
          <div style={s.headerCircle2} />
          <div style={s.headerContent}>
            <h1 style={s.headerTitle}>Add New Claim</h1>
          </div>
        </div>

        {apiError && (
          <div style={s.apiBanner}>⚠️ {apiError}</div>
        )}

        <div style={s.formBody}>
          <div style={s.row2}>
            <Field label="Department" required error={errors.department}>
              <select name="department" value={form.department} onChange={handleChange} style={s.input} disabled={deptLoading}>
                {deptLoading
                  ? <option value="">Loading departments…</option>
                  : departments.map((d) => (
                      <option key={d.value || "placeholder"} value={d.value}>{d.label}</option>
                    ))
                }
              </select>
            </Field>
            <Field label="Expense Type" required error={errors.expenseType}>
              <select name="expenseType" value={form.expenseType} onChange={handleChange} style={s.input}>
                {expenseTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>
          </div>

          <div style={s.row2}>
            <Field label="Client Name" required error={errors.clientName}>
              <input type="text" name="clientName" placeholder="Enter client name" value={form.clientName} onChange={handleChange} style={s.input} />
            </Field>
            <Field label="Amount (₹)" required error={errors.amount}>
              <input type="number" name="amount" placeholder="0.00" value={form.amount} onChange={handleChange} style={s.input} />
            </Field>
          </div>

          <div style={s.row2}>
            <Field label="Purpose" required error={errors.purpose}>
              <input type="text" name="purpose" placeholder="Briefly describe the purpose" value={form.purpose} onChange={handleChange} style={s.input} />
            </Field>
            <Field label="Receipt" error={errors.receipt}>
              {!receiptPreview ? (
                <div style={{ ...s.dropZoneInline, ...(dragOver ? s.dropZoneActiveInline : {}) }}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}>
                  <CameraswitchOutlinedIcon style={{ fontSize: 22, color: "#64748b" }} />
                  <div style={s.dropTextInline}>Click or drag to upload</div>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
                    style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
                </div>
              ) : (
                <div style={s.receiptCardInline}>
                  {receiptPreview === "pdf" ? (
                    <div style={s.pdfRowInline}><span>📄</span><div>{form.receipt?.name}</div></div>
                  ) : (
                    <div style={s.imgPreviewInline}><img src={receiptPreview} alt="Preview" style={s.thumbImg} /><span>{form.receipt?.name}</span></div>
                  )}
                  <button style={s.removeBtnInline} onClick={removeReceipt}>✕</button>
                </div>
              )}
            </Field>
          </div>

          <Field label="Notes">
            <textarea name="notes" placeholder="Additional notes (optional)" value={form.notes} onChange={handleChange} style={{ ...s.input, ...s.textarea }} />
          </Field>

          <div style={s.divider} />

          <div style={s.actionBar}>
            <button style={s.cancelBtn} onClick={onCancel} disabled={loading}>Cancel</button>
            <button style={s.draftBtn} onClick={handleSaveDraft} disabled={loading}>Save as Draft</button>
            <button style={s.submitBtn} onClick={handleSubmit} disabled={loading}>Submit Claim</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mobile form styles
const mobileFormStyles = {
  container: {
    background: "#f4f5f7",
    minHeight: "100%",
    fontFamily: "'Google Sans', sans-serif",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px",
    background: "#fff",
    borderBottom: "1px solid #e5e7eb",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  backBtn: {
    background: "none",
    border: "none",
    padding: 8,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    color: "#1a73e8",
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: "#0f172a",
    margin: 0,
  },
  errorBanner: {
    margin: "12px 16px",
    padding: "10px 12px",
    background: "#fff5f5",
    border: "1px solid #fca5a5",
    borderRadius: 8,
    color: "#b91c1c",
    fontSize: 12,
  },
  form: {
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  input: {
    padding: "12px 14px",
    border: "1.5px solid #e2e8f0",
    borderRadius: 10,
    fontSize: 16,
    fontFamily: "'Google Sans', sans-serif",
    width: "100%",
    boxSizing: "border-box",
    background: "#fff",
  },
  select: {
    padding: "12px 14px",
    border: "1.5px solid #e2e8f0",
    borderRadius: 10,
    fontSize: 16,
    fontFamily: "'Google Sans', sans-serif",
    width: "100%",
    background: "#fff",
  },
  textarea: {
    padding: "12px 14px",
    border: "1.5px solid #e2e8f0",
    borderRadius: 10,
    fontSize: 16,
    fontFamily: "'Google Sans', sans-serif",
    width: "100%",
    boxSizing: "border-box",
    resize: "vertical",
  },
  dropZone: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    padding: "24px",
    borderRadius: 10,
    background: "#f8fafc",
    border: "1.5px dashed #cbd5e1",
    cursor: "pointer",
  },
  dropText: {
    fontSize: 13,
    color: "#64748b",
  },
  receiptPreview: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    background: "#f8fafc",
    borderRadius: 10,
    border: "1.5px solid #e2e8f0",
  },
  previewImg: {
    width: 40,
    height: 40,
    objectFit: "cover",
    borderRadius: 6,
  },
  removeBtn: {
    background: "none",
    border: "none",
    padding: 6,
    cursor: "pointer",
    color: "#ef4444",
  },
  actions: {
    display: "flex",
    gap: 12,
    marginTop: 8,
    paddingBottom: 20,
  },
  draftBtn: {
    flex: 1,
    padding: "14px",
    borderRadius: 10,
    border: "1.5px solid #cbd5e1",
    background: "#fff",
    color: "#334155",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  submitBtn: {
    flex: 1,
    padding: "14px",
    borderRadius: 10,
    border: "none",
    background: "#1a73e8",
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
};

const mobileSuccessStyles = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100%",
    padding: "20px",
    background: "#f4f5f7",
  },
  card: {
    background: "#fff",
    borderRadius: 20,
    padding: "32px 24px",
    textAlign: "center",
    width: "100%",
    maxWidth: 320,
  },
  icon: {
    width: 60,
    height: 60,
    borderRadius: "50%",
    color: "#fff",
    fontSize: 28,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: "#0f172a",
    margin: "0 0 8px",
  },
  message: {
    fontSize: 14,
    color: "#64748b",
    margin: "0 0 20px 0",
  },
  closeButton: {
    padding: "10px 20px",
    borderRadius: 10,
    border: "none",
    background: "#1a73e8",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    width: "100%",
  },
};

// Original desktop styles
const s = {
  page: {
    height: "50%",
    width: "100%",
    overflowY: "auto",
    background: "#f4f5f7",
    fontFamily: "'Google Sans', sans-serif",
    padding: "28px 32px",
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
  headerTitle: { margin: 0, fontSize: 28, fontWeight: 700, color: "black", letterSpacing: "-0.5px" },
  apiBanner: {
    margin: "0 40px",
    padding: "10px 16px",
    background: "#fff5f5",
    border: "1px solid #fca5a5",
    borderRadius: 8,
    color: "#b91c1c",
    fontSize: 13,
    fontFamily: "'Google Sans', sans-serif",
  },
  formBody: {
    padding: "28px 40px 32px",
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },
  fieldWrap: { display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-start", width: "100%" },
  label: { fontSize: 15, fontWeight: 600, color: "#1e293b", fontFamily: "'Google Sans', sans-serif", letterSpacing: 0.3, marginBottom: 2 },
  required: { color: "#e11d48" },
  input: {
    padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10,
    fontSize: 14, fontFamily: "'Google Sans', sans-serif", color: "#1e293b",
    background: "#f8fafc", outline: "none", width: "100%",
    boxSizing: "border-box", transition: "border-color 0.2s",
  },
  inputError: { borderColor: "#fca5a5", background: "#fff5f5" },
  textarea: { resize: "vertical", minHeight: 70, lineHeight: 1.5 },
  errorMsg: { fontSize: 11, color: "#e11d48", fontFamily: "'Courier New',monospace", marginTop: 3 },
  dropZoneInline: {
    display: "flex", alignItems: "center", gap: 10,
    borderRadius: 10, padding: "8px 14px", background: "#f8fafc",
    cursor: "pointer", transition: "all 0.2s",
    border: "1.5px dashed #e2e8f0",
  },
  dropZoneActiveInline: { borderColor: "#0f2744", background: "#eff6ff" },
  dropTextInline: { fontSize: 12, color: "#64748b" },
  receiptCardInline: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 8, border: "1.5px solid #e2e8f0", borderRadius: 10,
    padding: "4px 8px 4px 12px", background: "#f8fafc",
  },
  pdfRowInline: { display: "flex", alignItems: "center", gap: 8, flex: 1 },
  imgPreviewInline: { display: "flex", alignItems: "center", gap: 10, flex: 1 },
  thumbImg: { width: 28, height: 28, objectFit: "cover", borderRadius: 6 },
  receiptFileNameInline: { fontSize: 11, color: "#1e293b", fontWeight: 500, wordBreak: "break-all", flex: 1 },
  removeBtnInline: { background: "none", border: "none", color: "#ef4444", fontSize: 16, cursor: "pointer", padding: "4px 8px", borderRadius: 20 },
  divider: { borderTop: "1px solid #f1f5f9", marginTop: 8 },
  actionBar: { display: "flex", justifyContent: "flex-end", alignItems: "center", flexWrap: "wrap", gap: 12, marginTop: 4 },
  cancelBtn: {
    padding: "10px 24px", borderRadius: 10, border: "1.5px solid #cbd5e1",
    background: "#ffffff", color: "#64748b", fontSize: 13,
    fontFamily: "'Google Sans', sans-serif", fontWeight: 600, cursor: "pointer",
  },
  draftBtn: {
    padding: "10px 24px", borderRadius: 10, border: "1.5px solid #cbd5e1",
    background: "#f8fafc", color: "#334155", fontSize: 13,
    fontFamily: "'Google Sans', sans-serif", fontWeight: 600, cursor: "pointer",
  },
  submitBtn: {
    padding: "10px 28px", borderRadius: 10, border: "none",
    background: "#1a73e8", color: "#fff", fontSize: 13,
    fontFamily: "'Google Sans', sans-serif", fontWeight: 700, cursor: "pointer",
    boxShadow: "0 4px 12px rgba(15,39,68,0.3)",
  },
};