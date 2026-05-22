// claim_add.jsx – Fully mobile-responsive (single unified layout + CSS media queries)
import { useState, useRef, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import CameraswitchOutlinedIcon from "@mui/icons-material/CameraswitchOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close"; // used in receipt remove button

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
  { value: "other", label: "Other" },
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


/* ─── Detect real mobile device (touch + UA, evaluated at runtime) ── */
function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  // Check touch support AND mobile UA — both must match to avoid
  // false-positive from DevTools emulation (UA spoofed but not a real device)
  const hasTouchPoints = navigator.maxTouchPoints > 0;
  const mobileUA = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  // On a real mobile device BOTH will be true.
  // On DevTools emulation only one may be true depending on settings.
  // We use UA as the primary signal since capture= only works on real devices.
  return mobileUA;
}

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

  /* ── Expense type combobox ── */
  .ca-combo-wrap { position: relative; width: 100%; }
  .ca-combo-arrow {
    position: absolute; right: 12px; top: 50%;
    transform: translateY(-50%);
    pointer-events: none; color: #64748b; font-size: 11px;
    transition: transform 0.15s;
  }
  .ca-combo-arrow--open { transform: translateY(-50%) rotate(180deg); }
  .ca-combo-input { padding-right: 32px !important; }
  .ca-api-banner {
    margin: 0 40px 4px;
    padding: 10px 16px;
    background: #fff5f5;
    border: 1px solid #fca5a5;
    border-radius: 8px;
    color: #b91c1c;
    font-size: 13px;
  }
  .ca-api-banner--info {
    background: #eff6ff;
    border-color: #bfdbfe;
    color: #1d4ed8;
  }
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
  }
  .ca-receipt-inner {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
  }
  .ca-thumb-img {
    width: 40px;
    height: 40px;
    object-fit: cover;
    border-radius: 8px;
    flex-shrink: 0;
  }
  .ca-receipt-name {
    font-size: 11px;
    color: #1e293b;
    font-weight: 500;
    word-break: break-all;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 180px;
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

  .ca-mobile-receipt-btns {
    display: none;
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
    .ca-drop-zone {
      flex-direction: column;
      padding: 12px 8px;
      gap: 8px;
      justify-content: center;
    }
    .ca-drop-text {
      font-size: 13px;
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
    .ca-drop-zone-desktop {
      display: none !important;
    }
    .ca-mobile-receipt-btns {
      display: flex;
      gap: 10px;
      width: 100%;
    }
    .ca-mobile-receipt-btn {
      flex: 1;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 14px 8px;
      border-radius: 12px;
      font-size: 13px;
      font-family: 'Google Sans', sans-serif;
      font-weight: 600;
      cursor: pointer;
      border: 1.5px solid #e2e8f0;
      background: #f8fafc;
      color: #1e293b;
      transition: background 0.15s, border-color 0.15s;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    }
    .ca-mobile-receipt-btn:active {
      background: #eff6ff;
      border-color: #1a73e8;
    }
    .ca-mobile-receipt-btn--camera {
      border-color: #bfdbfe;
      background: #eff6ff;
      color: #1a73e8;
    }
    .ca-mobile-receipt-btn--upload {
      border-color: #e2e8f0;
      background: #f8fafc;
      color: #334155;
    }
    .ca-mobile-receipt-btn-icon {
      font-size: 22px;
      line-height: 1;
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

  /* ── Webcam modal ───────────────────────────────────────────────── */
  .ca-webcam-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.85);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 16px;
    box-sizing: border-box;
  }
  .ca-webcam-modal {
    background: #1a1a2e;
    border-radius: 16px;
    overflow: hidden;
    width: 100%;
    max-width: 520px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 40px rgba(0,0,0,0.6);
  }
  .ca-webcam-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    background: #0f0f1a;
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    font-family: 'Google Sans', sans-serif;
  }
  .ca-webcam-close {
    background: none;
    border: none;
    color: #aaa;
    font-size: 22px;
    cursor: pointer;
    line-height: 1;
    padding: 2px 6px;
    border-radius: 6px;
  }
  .ca-webcam-close:hover { color: #fff; background: rgba(255,255,255,0.1); }
  .ca-webcam-video-wrap {
    position: relative;
    width: 100%;
    background: #000;
    aspect-ratio: 4/3;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .ca-webcam-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .ca-webcam-canvas { display: none; }
  .ca-webcam-error {
    color: #fca5a5;
    font-size: 13px;
    text-align: center;
    padding: 24px 16px;
    font-family: 'Google Sans', sans-serif;
  }
  .ca-webcam-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 18px;
    background: #0f0f1a;
  }
  .ca-webcam-shutter {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: #fff;
    border: 4px solid #aaa;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    transition: transform 0.1s, background 0.1s;
    box-shadow: 0 0 0 3px rgba(255,255,255,0.2);
  }
  .ca-webcam-shutter:hover { background: #e2e8f0; transform: scale(1.06); }
  .ca-webcam-shutter:active { transform: scale(0.95); }
  .ca-webcam-switch {
    background: rgba(255,255,255,0.1);
    border: none;
    color: #fff;
    font-size: 22px;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .ca-webcam-switch:hover { background: rgba(255,255,255,0.2); }
`;

/* ─── Expense Type Combobox (portal – escapes overflow:hidden) ─── */
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

  const dropdown = open ? ReactDOM.createPortal(
    <div
      ref={dropRef}
      style={{
        position: "absolute",
        top: dropPos.top, left: dropPos.left, width: dropPos.width,
        background: "#fff",
        border: "1.5px solid #1a73e8",
        borderRadius: 10,
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
                padding: "10px 14px", fontSize: 14,
                color: value === t.label ? "#1a73e8" : "#1e293b",
                background: value === t.label ? "#eff6ff" : "transparent",
                cursor: "pointer",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"}
              onMouseLeave={e => e.currentTarget.style.background = value === t.label ? "#eff6ff" : "transparent"}
            >
              {t.label}
            </div>
          ))
        : (
            <div style={{ padding: "10px 14px", fontSize: 13, color: "#94a3b8", fontStyle: "italic" }}>
              Type to add &ldquo;{query}&rdquo; as custom expense type
            </div>
          )
      }
    </div>,
    document.body
  ) : null;

  return (
    <div className="ca-combo-wrap">
      <input
        ref={inputRef}
        type="text"
        name="expenseType"
        placeholder="Select or type expense type"
        value={query}
        onChange={handleInput}
        onFocus={() => setOpen(true)}
        autoComplete="off"
        className={`ca-input ca-combo-input${hasError ? " ca-input-error" : ""}`}
      />
      <span className={`ca-combo-arrow${open ? " ca-combo-arrow--open" : ""}`}>▼</span>
      {dropdown}
    </div>
  );
}

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
  const fileInputRef = useRef();
  const videoRef = useRef();
  const canvasRef = useRef();
  const streamRef = useRef(null);
  const [showWebcam, setShowWebcam] = useState(false);
  const [webcamError, setWebcamError] = useState("");
  const [facingMode, setFacingMode] = useState("environment");


  /* ── Webcam logic ────────────────────────────────────────────────── */
  const startWebcam = useCallback(async (mode) => {
    const facing = mode || facingMode;
    setWebcamError("");
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      setWebcamError("Camera access denied or not available. Please allow camera permission and try again.");
    }
  }, [facingMode]);

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const openWebcam = useCallback(() => {
    setShowWebcam(true);
    setWebcamError("");
    setTimeout(() => startWebcam(facingMode), 150);
  }, [facingMode, startWebcam]);

  const closeWebcam = useCallback(() => {
    stopWebcam();
    setShowWebcam(false);
    setWebcamError("");
  }, [stopWebcam]);

  const switchCamera = useCallback(() => {
    const newMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newMode);
    startWebcam(newMode);
  }, [facingMode, startWebcam]);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" });
      await handleFile(file);
      closeWebcam();
    }, "image/jpeg", 0.92);
  }, [closeWebcam]);

  useEffect(() => () => stopWebcam(), [stopWebcam]);

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
    if (form.expenseType === "other" && !form.customExpenseType.trim())
      e.customExpenseType = "Please specify the expense type.";
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

  /**
   * compressImage: resizes + re-encodes an image file to JPEG ≤ maxSizeBytes.
   * Mobile camera shots can be 4-8 MB; this brings them under the server 413 limit.
   */
  const compressImage = (file, maxSizeBytes = 1 * 1024 * 1024, maxDim = 1920) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          // Calculate new dimensions (maintain aspect, cap at maxDim)
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
            else                { width  = Math.round(width  * maxDim / height); height = maxDim; }
          }
          const canvas = document.createElement("canvas");
          canvas.width  = width;
          canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);

          // Try quality 0.85 first, drop to 0.7 / 0.5 if still too large
          const tryQuality = (quality) => {
            canvas.toBlob((blob) => {
              if (!blob) { resolve(file); return; } // fallback to original
              if (blob.size <= maxSizeBytes || quality <= 0.4) {
                const compressed = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
                resolve(compressed);
              } else {
                tryQuality(Math.max(quality - 0.15, 0.4));
              }
            }, "image/jpeg", quality);
          };
          tryQuality(0.85);
        };
        img.onerror = () => resolve(file); // fallback to original on error
        img.src = ev.target.result;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });

  const handleFile = async (file) => {
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isPDF   = file.type === "application/pdf";

    if (!isImage && !isPDF) {
      setErrors((prev) => ({ ...prev, receipt: "Only JPG, PNG, WEBP or PDF allowed." }));
      return;
    }

    // Hard cap: reject files over 20 MB before even trying to compress
    if (file.size > 20 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, receipt: "File is too large (max 20 MB)." }));
      return;
    }

    let finalFile = file;

    // Compress images that are over 1 MB so the server never sees a 413
    if (isImage && file.size > 1 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, receipt: undefined }));
      // Show a brief "compressing…" note so the user knows something is happening
      setApiError("⏳ Compressing image…");
      finalFile = await compressImage(file, 1 * 1024 * 1024, 1920);
      setApiError("");
    }

    setForm((prev) => ({ ...prev, receipt: finalFile }));
    setErrors((prev) => ({ ...prev, receipt: undefined }));

    if (isImage) {
      const reader = new FileReader();
      reader.onload  = (ev) => setReceiptPreview(ev.target.result);
      reader.onerror = ()   => setReceiptPreview("image_fallback");
      reader.readAsDataURL(finalFile);
    } else {
      setReceiptPreview("pdf");
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) await handleFile(e.dataTransfer.files[0]);
  };

  const removeReceipt = () => {
    setForm((prev) => ({ ...prev, receipt: null }));
    setReceiptPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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

  /* ── Receipt upload zone ────────────────────────────────────────── */
  const ReceiptZone = () =>
    !receiptPreview ? (
      <>
        {/* Desktop: drag-and-drop zone */}
        <div
          className={`ca-drop-zone ca-drop-zone-desktop${dragOver ? " ca-drop-zone-active" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <CameraswitchOutlinedIcon style={{ fontSize: 26, color: "#64748b" }} />
          <div className="ca-drop-text">Tap to upload receipt</div>
        </div>

        {/* Camera & Upload buttons — shown on mobile only (desktop uses drag-drop zone) */}
        <div className="ca-mobile-receipt-btns">

          {/* Take Photo:
              - Real mobile (Android/iOS): native <input capture> opens camera directly
              - Desktop / DevTools emulation: opens webcam modal via getUserMedia      */}
          {isMobileDevice()
            ? (
              /* ── Real mobile: native camera input ── */
              <label
                className="ca-mobile-receipt-btn ca-mobile-receipt-btn--camera"
                style={{ position: "relative", overflow: "hidden", cursor: "pointer" }}
              >
                <span className="ca-mobile-receipt-btn-icon">{"📷"}</span>
                <span>Take Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", fontSize: 0, cursor: "pointer" }}
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) handleFile(file);
                    setTimeout(() => { try { e.target.value = ""; } catch(_){} }, 600);
                  }}
                />
              </label>
            )
            : (
              /* ── Desktop / emulation: open webcam modal ── */
              <button
                type="button"
                className="ca-mobile-receipt-btn ca-mobile-receipt-btn--camera"
                onClick={openWebcam}
              >
                <span className="ca-mobile-receipt-btn-icon">{"📷"}</span>
                <span>Take Photo</span>
              </button>
            )
          }

          {/* Upload File: always a file-picker */}
          <label
            className="ca-mobile-receipt-btn ca-mobile-receipt-btn--upload"
            style={{ position: "relative", overflow: "hidden", cursor: "pointer" }}
          >
            <span className="ca-mobile-receipt-btn-icon">{"📁"}</span>
            <span>Upload File</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", fontSize: 0, cursor: "pointer" }}
              onChange={async (e) => {
                const file = e.target.files[0];
                if (file) await handleFile(file);
                setTimeout(() => { try { e.target.value = ""; } catch(_){} }, 600);
              }}
            />
          </label>

        </div>

        {/* Desktop hidden input (for drag-drop zone) */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          style={{ display: "none" }}
          onChange={async (e) => { if (e.target.files[0]) await handleFile(e.target.files[0]); }}
        />
      </>
    ) : (
      <div className="ca-receipt-card">
        <div className="ca-receipt-inner">
          {receiptPreview === "pdf" || receiptPreview === "image_fallback" ? (
            <>
              <span>{receiptPreview === "pdf" ? "📄" : "🖼️"}</span>
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

  /* ── Main form (single layout, CSS handles breakpoints) ─────────── */
  return (
    <div className="ca-page" onClick={(e) => e.stopPropagation()}>
      <div className="ca-card" onClick={(e) => e.stopPropagation()}>

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
          <div className={apiError.startsWith("⏳") ? "ca-api-banner ca-api-banner--info" : "ca-api-banner"}>
            {apiError.startsWith("⏳") ? apiError : `⚠️ ${apiError}`}
          </div>
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
              <ExpenseTypeCombobox
                value={form.expenseType}
                onChange={handleChange}
                hasError={!!errors.expenseType}
              />
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
      {/* ── Webcam Modal ── */}
      {showWebcam && (
        <div className="ca-webcam-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeWebcam(); }}>
          <div className="ca-webcam-modal">
            <div className="ca-webcam-header">
              <span>📷 Take Photo</span>
              <button className="ca-webcam-close" onClick={closeWebcam} title="Close">✕</button>
            </div>
            <div className="ca-webcam-video-wrap">
              {webcamError
                ? <div className="ca-webcam-error">{webcamError}</div>
                : <video ref={videoRef} className="ca-webcam-video" autoPlay playsInline muted />
              }
            </div>
            <canvas ref={canvasRef} className="ca-webcam-canvas" />
            {!webcamError && (
              <div className="ca-webcam-footer">
                <button className="ca-webcam-switch" onClick={switchCamera} title="Switch camera">🔄</button>
                <button className="ca-webcam-shutter" onClick={capturePhoto} title="Capture photo">📸</button>
                <button className="ca-webcam-switch" onClick={closeWebcam} title="Cancel">✕</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── IMCB Footer ── */}
      <div style={{ flexShrink:0, padding:"10px 20px", borderTop:"1px solid #e8eaed", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", gap:"6px" }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <span style={{ fontSize:"11px", color:"#9ca3af", fontWeight:500 }}>Powered by</span>
        <span style={{ fontSize:"11px", fontWeight:700, color:"#1a73e8" }}>IMCB Solutions LLP</span>
      </div>
    </div>
  );
}