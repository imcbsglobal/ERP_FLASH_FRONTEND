// claim_add.jsx – Fully mobile-responsive (single unified layout + CSS media queries)
import { useState, useRef, useEffect } from "react";
import CameraswitchOutlinedIcon from "@mui/icons-material/CameraswitchOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import CameraAltOutlinedIcon from "@mui/icons-material/CameraAltOutlined";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";

/* ─── Static data ─────────────────────────────────────────────────── */
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

import { createClaim, saveDraftClaim, ENDPOINTS, authHeaders, apiFetch } from '../service/Api';
const DEPARTMENTS_API_URL = ENDPOINTS.claimDepartments;

const initialForm = {
  expenseType: "",
  department: "",
  clientName: "",
  purpose: "",
  amount: "",
  notes: "",
  receipt: null,
};

/* ─── Injected responsive CSS ─────────────────────────────────────── */
const RESPONSIVE_CSS = `
  .ca-page {
    min-height: 100%;
    width: 100%;
    overflow-y: auto;
    background: #f4f5f7;
    font-family: 'Google Sans', sans-serif;
    padding: 28px 32px;
    box-sizing: border-box;
  }
  .ca-card {
    width: 100%;
    max-width: 960px;
    margin: 0 auto;
    background: #fff;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    border: 1px solid #e8eaed;
  }
  .ca-header {
    position: relative;
    padding: 28px 40px 24px;
    overflow: hidden;
    background: #fff;
  }
  .ca-header-mobile-row {
    display: none;
  }
  .ca-header-title {
    margin: 0;
    font-size: 26px;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.5px;
  }
  .ca-form-body {
    padding: 28px 40px 32px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .ca-row2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  .ca-field-wrap {
    display: flex;
    flex-direction: column;
    gap: 5px;
    width: 100%;
    align-items: flex-start;
  }
  .ca-label {
    font-size: 14px;
    font-weight: 600;
    color: #1e293b;
    letter-spacing: 0.2px;
    text-align: left;
    display: block;
  }
  .ca-required {
    color: #e11d48;
  }
  .ca-input {
    padding: 11px 14px;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    font-size: 14px;
    font-family: 'Google Sans', sans-serif;
    color: #1e293b;
    background: #f8fafc;
    outline: none;
    width: 100%;
    box-sizing: border-box;
    transition: border-color 0.2s;
    appearance: auto;
  }
  .ca-input:focus {
    border-color: #1a73e8;
    background: #fff;
  }
  .ca-input-error {
    border-color: #fca5a5 !important;
    background: #fff5f5 !important;
  }
  .ca-textarea {
    resize: vertical;
    min-height: 72px;
    line-height: 1.5;
  }
  .ca-error-msg {
    font-size: 11px;
    color: #e11d48;
    font-family: 'Courier New', monospace;
  }
  .ca-api-banner {
    margin: 0 40px 4px;
    padding: 10px 16px;
    background: #fff5f5;
    border: 1px solid #fca5a5;
    border-radius: 8px;
    color: #b91c1c;
    font-size: 13px;
  }

  /* ── Desktop drag-and-drop zone ─────────────────────────────────── */
  .ca-drop-zone {
    display: flex;
    align-items: center;
    gap: 10px;
    border-radius: 10px;
    padding: 10px 14px;
    background: #f8fafc;
    cursor: pointer;
    transition: all 0.2s;
    border: 1.5px dashed #e2e8f0;
    width: 100%;
    box-sizing: border-box;
    position: relative;
  }
  .ca-drop-zone:hover,
  .ca-drop-zone-active {
    border-color: #1a73e8;
    background: #eff6ff;
  }
  .ca-drop-text {
    font-size: 12px;
    color: #64748b;
  }

  /* ── Mobile two-button zone – hidden on desktop ─────────────────── */
  .ca-mobile-receipt-zone {
    display: none;
  }

  /* ── Receipt preview card ───────────────────────────────────────── */
  .ca-receipt-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    padding: 6px 8px 6px 12px;
    background: #f8fafc;
    min-width: 0;
    width: 100%;
    box-sizing: border-box;
  }
  .ca-receipt-inner {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
  }
  .ca-thumb-img {
    width: 30px;
    height: 30px;
    object-fit: cover;
    border-radius: 6px;
    flex-shrink: 0;
  }
  .ca-receipt-name {
    font-size: 11px;
    color: #1e293b;
    font-weight: 500;
    word-break: break-all;
    flex: 1;
  }
  .ca-remove-btn {
    background: none;
    border: none;
    color: #ef4444;
    font-size: 16px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 20px;
    flex-shrink: 0;
  }
  .ca-divider {
    border-top: 1px solid #f1f5f9;
  }
  .ca-action-bar {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  }
  .ca-btn-cancel {
    padding: 10px 24px;
    border-radius: 10px;
    border: 1.5px solid #cbd5e1;
    background: #fff;
    color: #64748b;
    font-size: 13px;
    font-family: 'Google Sans', sans-serif;
    font-weight: 600;
    cursor: pointer;
    min-height: 40px;
  }
  .ca-btn-draft {
    padding: 10px 24px;
    border-radius: 10px;
    border: 1.5px solid #cbd5e1;
    background: #f8fafc;
    color: #334155;
    font-size: 13px;
    font-family: 'Google Sans', sans-serif;
    font-weight: 600;
    cursor: pointer;
    min-height: 40px;
  }
  .ca-btn-submit {
    padding: 10px 28px;
    border-radius: 10px;
    border: none;
    background: #1a73e8;
    color: #fff;
    font-size: 13px;
    font-family: 'Google Sans', sans-serif;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(26,115,232,0.3);
    min-height: 40px;
  }
  .ca-btn-submit:disabled,
  .ca-btn-draft:disabled,
  .ca-btn-cancel:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* ── Success screen ─────────────────────────────────────────────── */
  .ca-success-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100%;
    padding: 20px;
    background: #f4f5f7;
    box-sizing: border-box;
  }
  .ca-success-card {
    background: #fff;
    border-radius: 20px;
    padding: 32px 24px;
    text-align: center;
    width: 100%;
    max-width: 360px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.08);
  }
  .ca-success-icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    color: #fff;
    font-size: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
  }
  .ca-success-title {
    font-size: 20px;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 8px;
  }
  .ca-success-msg {
    font-size: 14px;
    color: #64748b;
    margin: 0 0 20px;
  }
  .ca-success-close {
    padding: 12px 20px;
    border-radius: 10px;
    border: none;
    background: #1a73e8;
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    width: 100%;
  }

  /* ── Mobile overrides (≤ 640 px) ───────────────────────────────── */
  @media (max-width: 640px) {
    .ca-page {
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
    .ca-card {
      border-radius: 0;
      box-shadow: none;
      border: none;
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      width: 100%;
      max-width: 100%;
      height: 100%;
    }
    .ca-header {
      padding: 0;
      border-bottom: 1px solid #e5e7eb;
      position: sticky;
      top: 0;
      z-index: 10;
      background: #fff;
      flex-shrink: 0;
    }
    .ca-header-mobile-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
    }
    .ca-header-desktop-title {
      display: none;
    }
    .ca-header-title {
      font-size: 17px;
      font-weight: 600;
    }
    .ca-header-icon-btn {
      background: none;
      border: none;
      padding: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      color: #1a73e8;
      border-radius: 50%;
    }
    .ca-api-banner {
      margin: 10px 16px 0;
      font-size: 12px;
      flex-shrink: 0;
    }
    .ca-form-body {
      padding: 16px 16px 20px;
      gap: 14px;
      flex: 1;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }
    .ca-row2 {
      grid-template-columns: 1fr;
      gap: 12px;
    }
    .ca-label {
      font-size: 12px;
      text-align: left;
    }
    .ca-field-wrap {
      align-items: flex-start;
    }
    .ca-input {
      font-size: 13px;
      padding: 10px 10px;
      border-radius: 10px;
      background: #fff;
      border-color: #e2e8f0;
    }

    /* Hide desktop drop zone on mobile */
    .ca-drop-zone {
      display: none;
    }

    /* ── Mobile two-button receipt zone ─────────────────────────── */
    .ca-mobile-receipt-zone {
      display: flex;
      flex-direction: row;
      gap: 10px;
      width: 100%;
      box-sizing: border-box;
    }
    .ca-mobile-receipt-btn {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 5px;
      padding: 16px 10px 14px;
      border-radius: 14px;
      border: 1.5px dashed #c7d2e6;
      background: #f8fafc;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
      transition: border-color 0.18s, background 0.18s;
      min-height: 90px;
    }
    .ca-mobile-receipt-btn:active {
      border-color: #1a73e8;
      background: #eff6ff;
    }
    .ca-mobile-receipt-btn-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #e8f0fd;
      margin-bottom: 2px;
    }
    .ca-mobile-receipt-btn-label {
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
      text-align: center;
      line-height: 1.3;
    }
    .ca-mobile-receipt-btn-sub {
      font-size: 10px;
      color: #94a3b8;
      text-align: center;
    }
    /* Hidden native input sits over the entire button */
    .ca-mobile-hidden-input {
      position: absolute;
      inset: 0;
      opacity: 0;
      cursor: pointer;
      z-index: 2;
      width: 100%;
      height: 100%;
      font-size: 0;
    }

    .ca-action-bar {
      flex-direction: row;
      gap: 10px;
      flex-shrink: 0;
      padding: 12px 16px 16px;
      border-top: 1px solid #e5e7eb;
      background: #fff;
      box-shadow: 0 -2px 12px rgba(0,0,0,0.06);
    }
    .ca-btn-cancel,
    .ca-btn-draft,
    .ca-btn-submit {
      flex: 1;
      text-align: center;
      justify-content: center;
      padding: 13px 10px;
      font-size: 14px;
      border-radius: 10px;
      min-height: 46px;
    }
    .ca-divider { display: none; }
  }

  /* ── Tablet overrides (641 px – 900 px) ────────────────────────── */
  @media (min-width: 641px) and (max-width: 900px) {
    .ca-page {
      padding: 20px 16px;
    }
    .ca-header {
      padding: 20px 24px 18px;
    }
    .ca-header-title {
      font-size: 22px;
    }
    .ca-api-banner {
      margin: 0 24px 4px;
    }
    .ca-form-body {
      padding: 20px 24px 28px;
    }
    .ca-row2 {
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .ca-action-bar {
      flex-wrap: wrap;
    }
    .ca-btn-cancel,
    .ca-btn-draft,
    .ca-btn-submit {
      flex: 1;
      min-width: 120px;
    }
  }
`;

/* ─── Field wrapper ────────────────────────────────────────────────── */
function Field({ label, required, error, children }) {
  return (
    <div className="ca-field-wrap">
      <label className="ca-label">
        {label}{required && <span className="ca-required"> *</span>}
      </label>
      {children}
      {error && <span className="ca-error-msg">{error}</span>}
    </div>
  );
}

/* ─── Main component ───────────────────────────────────────────────── */
export default function MobileResponsiveClaimsAdd({ onSuccess, onCancel }) {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [departments, setDepartments] = useState([{ value: "", label: "Select Department" }]);
  const [deptLoading, setDeptLoading] = useState(true);

  // Desktop file input ref
  const fileInputRef = useRef();
  // Mobile: separate refs for camera capture and file picker
  const cameraInputRef = useRef();
  const mobileFileInputRef = useRef();

  /* Inject responsive CSS once */
  useEffect(() => {
    const id = "ca-responsive-styles";
    if (!document.getElementById(id)) {
      const tag = document.createElement("style");
      tag.id = id;
      tag.textContent = RESPONSIVE_CSS;
      document.head.appendChild(tag);
    }
    return () => {
      const tag = document.getElementById(id);
      if (tag) tag.remove();
    };
  }, []);

  /* Fetch departments */
  useEffect(() => {
    async function loadDepartments() {
      try {
        const data = await apiFetch(DEPARTMENTS_API_URL, {
          headers: authHeaders(),
        });
        const results = data?.results ?? data;
        if (Array.isArray(results)) {
          setDepartments([
            { value: "", label: "Select Department" },
            ...results.map((d) => ({ value: d.department_id, label: d.department })),
          ]);
        }
      } catch (err) {
        console.error("Department fetch error:", err);
      } finally {
        setDeptLoading(false);
      }
    }
    loadDepartments();
  }, []);

  /* Validation */
  const validate = (isDraftSave = false) => {
    const e = {};
    if (!form.expenseType) e.expenseType = "Expense type is required.";
    if (!form.department) e.department = "Department is required.";
    if (!isDraftSave) {
      if (!form.clientName.trim()) e.clientName = "Client name is required.";
      if (!form.purpose.trim()) e.purpose = "Purpose is required.";
      if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0)
        e.amount = "Enter a valid amount.";
    }
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
    if (apiError) setApiError("");
  };

  /* ── Image compression helper (mobile camera 413 fix) ───────────
     Resizes image to max 1280px on longest side and re-encodes as
     JPEG at 75% quality. Typical 8 MP photo: 6 MB → ~300 KB.
  ─────────────────────────────────────────────────────────────── */
  const compressImage = (file, maxWidthPx = 1280, qualityJpeg = 0.75) =>
    new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const scale = Math.min(1, maxWidthPx / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            const compressed = new File(
              [blob],
              file.name.replace(/\.[^.]+$/, ".jpg"),
              { type: "image/jpeg", lastModified: Date.now() }
            );
            resolve(compressed);
          },
          "image/jpeg",
          qualityJpeg
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file); // fallback: use original if load fails
      };
      img.src = objectUrl;
    });

  /* ── Shared file handler used by all three inputs ────────────── */
  const handleFile = async (file) => {
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      setErrors((prev) => ({ ...prev, receipt: "Only JPG, PNG, WEBP or PDF allowed." }));
      return;
    }

    let finalFile = file;

    // Compress images before upload to avoid 413 from high-res camera shots
    if (file.type.startsWith("image/")) {
      try {
        finalFile = await compressImage(file);
      } catch {
        finalFile = file;
      }
    }

    if (finalFile.size > 2 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, receipt: "File size must be under 2 MB." }));
      return;
    }

    setForm((prev) => ({ ...prev, receipt: finalFile }));
    setErrors((prev) => ({ ...prev, receipt: undefined }));

    if (finalFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setReceiptPreview(ev.target.result);
      reader.readAsDataURL(finalFile);
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
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (mobileFileInputRef.current) mobileFileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    const validationErrors = validate(false);
    if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }
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
    if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }
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

  /* ── Success screen ─────────────────────────────────────────────── */
  if (submitted) {
    return (
      <div className="ca-success-container">
        <div className="ca-success-card">
          <div
            className="ca-success-icon"
            style={{ background: isDraft ? "#64748b" : "#10b981" }}
          >
            {isDraft ? "📋" : "✓"}
          </div>
          <h2 className="ca-success-title">{isDraft ? "Draft Saved!" : "Claim Submitted!"}</h2>
          <p className="ca-success-msg">
            {isDraft
              ? "Your claim draft has been saved."
              : `₹${Number(form.amount).toLocaleString("en-IN")} submitted successfully`}
          </p>
          <button className="ca-success-close" onClick={() => onCancel?.()}>Close</button>
        </div>
      </div>
    );
  }

  /* ── Shared receipt preview card ────────────────────────────────── */
  const ReceiptPreviewCard = () => (
    <div className="ca-receipt-card">
      <div className="ca-receipt-inner">
        {receiptPreview === "pdf" ? (
          <>
            <span>📄</span>
            <span className="ca-receipt-name">{form.receipt?.name}</span>
          </>
        ) : (
          <>
            <img src={receiptPreview} alt="Preview" className="ca-thumb-img" />
            <span className="ca-receipt-name">{form.receipt?.name}</span>
          </>
        )}
      </div>
      <button className="ca-remove-btn" onClick={removeReceipt}>
        <CloseIcon style={{ fontSize: 16 }} />
      </button>
    </div>
  );

  /* ── Receipt upload zone ────────────────────────────────────────── */
  const ReceiptZone = () => {
    // After a file is selected, show the same preview card on both desktop & mobile
    if (receiptPreview) return <ReceiptPreviewCard />;

    return (
      <>
        {/* ── DESKTOP: drag-and-drop (hidden on mobile via CSS) ──────── */}
        <div
          className={`ca-drop-zone${dragOver ? " ca-drop-zone-active" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <CameraswitchOutlinedIcon style={{ fontSize: 26, color: "#64748b", pointerEvents: "none" }} />
          <div className="ca-drop-text" style={{ pointerEvents: "none" }}>
            Click or drag to upload receipt
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", zIndex: 1 }}
            onChange={(e) => handleFile(e.target.files[0])}
          />
        </div>

        {/* ── MOBILE: Camera + Upload File buttons (hidden on desktop via CSS) ── */}
        <div className="ca-mobile-receipt-zone">

          {/* Camera button – opens rear camera directly */}
          <button
            type="button"
            className="ca-mobile-receipt-btn"
            onClick={() => cameraInputRef.current?.click()}
          >
            <span className="ca-mobile-receipt-btn-icon">
              <CameraAltOutlinedIcon style={{ fontSize: 22, color: "#1a73e8" }} />
            </span>
            <span className="ca-mobile-receipt-btn-label">Camera</span>
            <span className="ca-mobile-receipt-btn-sub">Take a photo</span>
            {/*
              capture="environment" → opens the rear (back) camera on Android/iOS.
              No gallery, straight to camera shutter.
            */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="ca-mobile-hidden-input"
              onChange={(e) => handleFile(e.target.files[0])}
            />
          </button>

          {/* Upload File button – opens file browser / gallery */}
          <button
            type="button"
            className="ca-mobile-receipt-btn"
            onClick={() => mobileFileInputRef.current?.click()}
          >
            <span className="ca-mobile-receipt-btn-icon">
              <UploadFileOutlinedIcon style={{ fontSize: 22, color: "#1a73e8" }} />
            </span>
            <span className="ca-mobile-receipt-btn-label">Upload File</span>
            <span className="ca-mobile-receipt-btn-sub">JPG, PNG, PDF</span>
            {/*
              No capture attribute → opens the system file picker / gallery.
            */}
            <input
              ref={mobileFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="ca-mobile-hidden-input"
              onChange={(e) => handleFile(e.target.files[0])}
            />
          </button>

        </div>
      </>
    );
  };

  /* ── Main form (single layout, CSS handles breakpoints) ─────────── */
  return (
    <div className="ca-page">
      <div className="ca-card">

        {/* Header */}
        <div className="ca-header">
          {/* Mobile header row – hidden on desktop via CSS */}
          <div className="ca-header-mobile-row">
            <h1 className="ca-header-title">New Claim</h1>
          </div>
          {/* Desktop title – hidden on mobile via CSS */}
          <h1 className="ca-header-title ca-header-desktop-title">Add New Claim</h1>
        </div>

        {/* API error banner */}
        {apiError && (
          <div className="ca-api-banner">⚠️ {apiError}</div>
        )}

        {/* Form body */}
        <div className="ca-form-body">

          {/* Row: Department + Expense Type */}
          <div className="ca-row2">
            <Field label="Department" required error={errors.department}>
              <select
                name="department"
                value={form.department}
                onChange={handleChange}
                className={`ca-input${errors.department ? " ca-input-error" : ""}`}
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
                className={`ca-input${errors.expenseType ? " ca-input-error" : ""}`}
              >
                {expenseTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Row: Client Name + Amount */}
          <div className="ca-row2">
            <Field label="Client Name" required error={errors.clientName}>
              <input
                type="text"
                name="clientName"
                placeholder="Enter client name"
                value={form.clientName}
                onChange={handleChange}
                className={`ca-input${errors.clientName ? " ca-input-error" : ""}`}
              />
            </Field>

            <Field label="Amount (₹)" required error={errors.amount}>
              <input
                type="number"
                name="amount"
                placeholder="0.00"
                value={form.amount}
                onChange={handleChange}
                inputMode="decimal"
                className={`ca-input${errors.amount ? " ca-input-error" : ""}`}
              />
            </Field>
          </div>

          {/* Row: Purpose + Receipt */}
          <div className="ca-row2">
            <Field label="Purpose" required error={errors.purpose}>
              <input
                type="text"
                name="purpose"
                placeholder="Briefly describe the purpose"
                value={form.purpose}
                onChange={handleChange}
                className={`ca-input${errors.purpose ? " ca-input-error" : ""}`}
              />
            </Field>

            <Field label="Receipt" error={errors.receipt}>
              <ReceiptZone />
            </Field>
          </div>

          {/* Notes */}
          <Field label="Notes">
            <textarea
              name="notes"
              placeholder="Additional notes (optional)"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              className="ca-input ca-textarea"
            />
          </Field>

          <div className="ca-divider" />

          {/* Actions */}
          <div className="ca-action-bar">
            <button className="ca-btn-cancel" onClick={() => onCancel?.()} disabled={loading}>
              Cancel
            </button>

            <button className="ca-btn-submit" onClick={handleSubmit} disabled={loading}>
              {loading ? "Submitting…" : "Submit Claim"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}