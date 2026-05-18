import { useState, useEffect, useRef } from "react";
import ImageCaptureFlow from "./Image_capture";
import {
  getBranches,
  fetchDebtors,
  generateCaptureLink,
} from "../service/Api";

// FIX 1: Single constant controls both the API call and the WhatsApp message
const EXPIRES_IN_HOURS = 10 / 60; // 10 minutes

export default function ImageCaptureLinkGenerator({ onBack, isModal = false, modalMode = "generateLink", onLinkClick, onManualCapture }) {
  const [selectedBranch, setSelectedBranch]     = useState("");          // "" = All Branches
  const [mode, setMode]                         = useState("select");
  const [searchQuery, setSearchQuery]           = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [manualName, setManualName]             = useState("");
  const [phone, setPhone]                       = useState("");
  const [showDropdown, setShowDropdown]         = useState(false);
  const [isGenerating, setIsGenerating]         = useState(false);
  const [successData, setSuccessData]           = useState(null);
  const [copied, setCopied]                     = useState(false);
  const [msgQueued, setMsgQueued]               = useState(false);
  const [customers, setCustomers]               = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [branches, setBranches]                 = useState([]);          // [{id, name}]
  const [loadingBranches, setLoadingBranches]   = useState(false);

  const debounceRef = useRef(null);
  const wrapperRef  = useRef(null);

  // Fetch branches from backend on mount
  useEffect(() => {
    const fetchBranches = async () => {
      setLoadingBranches(true);
      try {
        const data = await getBranches();
        const list = Array.isArray(data) ? data : (data.results || []);
        setBranches(list);
      } catch (error) {
        console.error('Error fetching branches:', error);
      } finally {
        setLoadingBranches(false);
      }
    };
    fetchBranches();
  }, []);

  // Close dropdown on outside click — mirrors collection.jsx wrapperRef pattern
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch debtors with 300ms debounce — fires only when user is typing
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setCustomers([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoadingCustomers(true);
      try {
        const list = await fetchDebtors(searchQuery.trim());
        setCustomers(list);
      } catch (error) {
        console.error('Error fetching customers:', error);
        setCustomers([]);
      } finally {
        setLoadingCustomers(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  const cleanName = (name) => (name || "").replace(/\d+$/, "").trim();

  const q = searchQuery.trim().toLowerCase();
  const filteredCustomers = q
    ? customers.filter(c => cleanName(c.name).toLowerCase().startsWith(q))
    : customers;

  const handleGenerate = async () => {
    const name = mode === "select" ? cleanName(selectedCustomer?.name) : manualName;
    if (!name || !phone) return;
    setIsGenerating(true);
    
    try {
      const data = await generateCaptureLink({
        customerId:     null,                                              // debtors have no local DB id
        customerName:   mode === "select" ? cleanName(selectedCustomer?.name) : manualName,
        phone:          phone,
        expiresInHours: EXPIRES_IN_HOURS,                                 // FIX 1: use constant
      });
      setSuccessData({
        linkPath: data.link_path,
        linkFull: data.link_full,
        phone:    phone,
        uuid:     data.uuid,
      });
    } catch (error) {
      console.error('Error generating link:', error);
      alert(error.message || 'Failed to generate link. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const getNormalizedLink = () => {
    if (!successData) return "";
    // Use VITE_PUBLIC_BASE_URL if set (needed for WhatsApp clickable links — localhost is not clickable)
    const baseUrl = import.meta.env.VITE_PUBLIC_BASE_URL?.replace(/\/$/, "") || window.location.origin;
    if (successData.linkPath && successData.linkPath.startsWith("/")) {
      return `${baseUrl}${successData.linkPath}`;
    }
    if (successData.linkFull) {
      try {
        const parsed = new URL(successData.linkFull, window.location.origin);
        return `${baseUrl}${parsed.pathname}${parsed.search}`;
      } catch {
        return successData.linkFull;
      }
    }
    return "";
  };

  const normalizedLink = getNormalizedLink();

  const handleCopy = () => {
    navigator.clipboard.writeText(normalizedLink || successData.linkFull || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenLink = (e) => {
    e.preventDefault();
    const customerName = mode === "select" ? cleanName(selectedCustomer?.name) : manualName;
    onLinkClick?.({ customerName, phone: successData?.phone || phone });
  };

  const handleReset = () => {
    setSuccessData(null);
    setCopied(false);
    setMsgQueued(false);
    setPhone("");
    setManualName("");
    setSelectedCustomer(null);
    setSearchQuery("");
  };

  const isDisabled = isGenerating || !phone || (mode === "select" ? !selectedCustomer : !manualName);

  const customerName = mode === "select" ? cleanName(selectedCustomer?.name) : manualName;

  const handleContinueToUpload = () => {
    if (!customerName || !phone) return;
    onManualCapture?.({ customerName, phone });
  };

  const isContinueDisabled = !phone || (mode === "select" ? !selectedCustomer : !manualName);

  return (
    <div
      className={isModal ? "img-link-modal-fullscreen" : ""}
      style={isModal ? { ...s.page, minHeight: 'unset', padding: '24px 16px 32px' } : s.page}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { font-family: 'Google Sans', sans-serif !important; }
        @keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)} }
        @keyframes popIn { 0%{transform:scale(0.3);opacity:0}70%{transform:scale(1.18)}100%{transform:scale(1);opacity:1} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)} }
        .gen-btn:hover:not(:disabled){filter:brightness(1.09);transform:translateY(-1px)}
        .gen-btn:active:not(:disabled){transform:translateY(0)}
        .abtn:hover{filter:brightness(0.94)}
        .link-text-clickable { color:#098ae1; text-decoration:underline; cursor:pointer; word-break:break-all; }
        .link-text-clickable:hover { color:#0770b8; }
        /* Close (×) button: desktop hidden, mobile visible */
        .clear-btn-mobile { display: none !important; }
        /* Modal close button: desktop hidden, mobile visible */
        .modal-close-btn { display: none !important; }
        @media (max-width: 540px) {
          .clear-btn-mobile { display: flex !important; }
          .modal-close-btn { display: flex !important; }
          .img-link-header { flex-direction: column !important; gap: 10px !important; align-items: flex-start !important; }
          .img-link-header h1 { font-size: 20px !important; }
          .img-link-card { padding: 20px 16px !important; border-radius: 14px !important; }
          .img-link-action-row { flex-direction: column !important; }
          .img-link-action-row button, .img-link-action-row a { width: 100% !important; justify-content: center !important; min-height: 46px !important; }
          .gen-btn { min-height: 48px !important; }

          /* Mobile full-screen modal */
          .img-link-modal-fullscreen {
            position: fixed !important;
            inset: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            height: -webkit-fill-available !important;
            max-width: 100vw !important;
            max-height: 100vh !important;
            border-radius: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow-y: auto !important;
            display: flex !important;
            flex-direction: column !important;
            z-index: 9999 !important;
          }
          .img-link-modal-inner {
            flex: 1 !important;
            display: flex !important;
            flex-direction: column !important;
            padding: 20px 16px 32px !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
            position: relative !important;
          }
          .img-link-card {
            flex: 1 !important;
            border-radius: 12px !important;
          }
        }
        @media (max-width: 380px) {
          .img-link-header h1 { font-size: 17px !important; }
        }
      `}</style>

      <div className={isModal ? "img-link-modal-inner" : ""} style={isModal ? {} : { width: '100%', maxWidth: '520px', display: 'flex', flexDirection: 'column' }}>

      {/* Mobile-only modal close button */}
      {isModal && onBack && (
        <button
          className="modal-close-btn"
          onClick={onBack}
          title="Close"
          style={s.modalCloseBtn}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}

      <div style={s.header} className="img-link-header">
        <div style={s.iconWrap}>
          {/* FIX 2: corrected SVG path (0 0 1 2-2 instead of 0 0 0 2-2) */}
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#098ae1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </div>
        <div>
          <h1 style={s.title}>{modalMode === "manualCapture" ? "Manual Image Capture" : "Image Capture Link Generator"}</h1>
          <p style={s.subtitle}>{modalMode === "manualCapture" ? "Select a customer and proceed to capture their image" : "Create secure verification links for your customers"}</p>
        </div>
      </div>

      {successData ? (
        <div style={s.card} className="img-link-card">
          <div style={{ animation: "fadeSlideUp 0.4s ease both" }}>
            <div style={s.circleWrap}>
              <div style={s.circle}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            </div>

            <div style={{ ...s.greenBlock, animation: "fadeIn 0.35s 0.05s ease both" }}>
              <div style={s.blockHead}>
                <CircleCheck />
                <strong>Link Generated Successfully!</strong>
              </div>
              <div style={s.linkBox}>
                <a
                  href={normalizedLink || successData.linkFull}
                  className="link-text-clickable"
                  onClick={handleOpenLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 13, lineHeight: "1.6" }}
                >
                  {normalizedLink || successData.linkFull}
                </a>
              </div>
            </div>

            <div style={s.shareRow}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              <span style={s.shareLabel}>Share with customer:</span>
            </div>

            <div style={s.actionRow} className="img-link-action-row">
              <a
                className="abtn"
                href={`https://wa.me/91${successData.phone}?text=${encodeURIComponent(`Hello! Please click the link below to complete your image verification:

${normalizedLink || successData.linkFull}

This link is valid for ${Math.round(EXPIRES_IN_HOURS * 60)} minutes.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...s.msgBtn, background: "#25D366", textDecoration: "none" }}
              >
                {/* WhatsApp icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Share Link
              </a>

              <button className="abtn" onClick={handleCopy} style={s.copyBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#098ae1" strokeWidth="2" strokeLinecap="round">
                  <rect x="9" y="9" width="13" height="13" rx="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>

            <button onClick={handleReset} style={s.resetBtn}>
              ← Generate another link
            </button>
          </div>
        </div>
      ) : (
        <div style={s.card} className="img-link-card">
          <div style={s.fieldGroup}>
            <label style={s.label}>
              <span style={{ color: "#098ae1", fontSize: 12 }}>▼</span> Filter by Branch:
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => { setSelectedBranch(e.target.value); setSelectedCustomer(null); setSearchQuery(""); }}
              style={s.select}
              disabled={loadingBranches}
            >
              <option value="">
                {loadingBranches ? "Loading branches…" : "All Branches"}
              </option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#098ae1"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Customer:
            </label>

            <div style={s.tabRow}>
              {["select", "manual"].map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setSelectedCustomer(null); setManualName(""); setSearchQuery(""); }}
                  style={{ ...s.tab, ...(mode === m ? s.tabActive : {}) }}
                >
                  {m === "select" ? "Select Customer" : "Enter Manually"}
                </button>
              ))}
            </div>

            {mode === "select" ? (
              // wrapperRef = outside-click closes dropdown (collection.jsx pattern)
              <div style={{ position: "relative" }} ref={wrapperRef}>
                <input
                  type="text"
                  autoComplete="off"
                  placeholder="Type at least 2 characters to search..."
                  // collection.jsx pattern: show searchQuery while typing, show selected name when idle
                  value={searchQuery !== "" ? searchQuery : (selectedCustomer ? cleanName(selectedCustomer.name) : "")}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchQuery(val);
                    setSelectedCustomer(null);
                    setPhone("");
                    setShowDropdown(val.length >= 2);
                  }}
                  onFocus={() => {
                    if (selectedCustomer) {
                      // re-open search pre-filled with their name so they can change
                      setSearchQuery(cleanName(selectedCustomer.name));
                      setShowDropdown(true);
                    }
                  }}
                  style={{
                    ...s.input,
                    paddingRight: "40px",
                    ...(selectedCustomer && searchQuery === ""
                      ? { background: "#f0f7ff", borderColor: "#098ae1", color: "#111827", fontWeight: "600" }
                      : {})
                  }}
                />

                {/* ✕ clear when selected & not actively searching, 🔍 otherwise */}
                {selectedCustomer && searchQuery === "" ? (
                  <button
                    className="clear-btn-mobile"
                    style={s.clearBtn}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { setSelectedCustomer(null); setSearchQuery(""); setPhone(""); }}
                    title="Clear selection"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                ) : (
                  <span style={s.searchIcon}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                  </span>
                )}

                {showDropdown && searchQuery.trim().length >= 2 && (
                  <div style={s.dropdown}>
                    {loadingCustomers ? (
                      <div style={s.dropEmpty}>Searching customers...</div>
                    ) : filteredCustomers.length === 0 ? (
                      <div style={s.dropEmpty}>No customers found</div>
                    ) : (
                      filteredCustomers.map((c) => (
                        <div
                          key={c.code}
                          style={s.dropItem}
                          // collection.jsx: onMouseDown + e.preventDefault() — no blur race
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSelectedCustomer(c);
                            // Extract phone number from customer object
                            const customerPhone = c.phone ?? c.mobile ?? c.phone_number ?? "";
                            setPhone(customerPhone);
                            setSearchQuery("");        // clear search → input now shows selectedCustomer.name
                            setShowDropdown(false);
                          }}
                        >
                          {/* Display only customer name without phone number */}
                          <span style={s.dropName}>{cleanName(c.name)}</span>
                          <span style={s.dropBranch}>{c.place || "—"}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
                {showDropdown && searchQuery.trim().length > 0 && searchQuery.trim().length < 2 && (
                  <div style={s.dropdown}>
                    <div style={s.dropEmpty}>Type at least 2 characters…</div>
                  </div>
                )}
              </div>
            ) : (
              <input
                type="text"
                placeholder="Enter customer name"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                style={s.input}
              />
            )}
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#098ae1"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>
              Phone Number:
            </label>
            <input
              type="tel"
              placeholder="Enter phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{
                ...s.input,
                ...(mode === "select" && selectedCustomer && phone
                  ? { background: "#f0f7ff", borderColor: "#098ae1", color: "#0770b8", fontWeight: "600" }
                  : {})
              }}
            />
          </div>

          {modalMode === "generateLink" && (
            <button
              className="gen-btn"
              onClick={handleGenerate}
              disabled={isDisabled}
              style={{ ...s.genBtn, opacity: isDisabled ? 0.55 : 1, cursor: isDisabled ? "not-allowed" : "pointer" }}
            >
              {isGenerating
                ? <span style={s.btnRow}><Spinner /> Generating...</span>
                : <span style={s.btnRow}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                    Generate Link
                  </span>
              }
            </button>
          )}

          {modalMode === "manualCapture" && (
            <button
              className="gen-btn"
              onClick={handleContinueToUpload}
              disabled={isContinueDisabled}
              style={{ ...s.genBtn, opacity: isContinueDisabled ? 0.55 : 1, cursor: isContinueDisabled ? "not-allowed" : "pointer" }}
            >
              <span style={s.btnRow}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                Image Upload
              </span>
            </button>
          )}
        </div>
      )}
      </div>

      {/* ── IMCB Footer ── */}
      <div style={{ flexShrink:0, padding:"10px 20px", borderTop:"1px solid #e8eaed", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", gap:"6px", marginTop:"auto" }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <span style={{ fontSize:"11px", color:"#9ca3af", fontWeight:500 }}>Powered by</span>
        <span style={{ fontSize:"11px", fontWeight:700, color:"#1a73e8" }}>IMCB Solutions LLP</span>
      </div>

    </div>
  );
}

function CircleCheck() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#098ae1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
      style={{ animation: "spin 0.8s linear infinite" }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  );
}

const s = {
  page: {
    minHeight: "100vh", minHeight: "-webkit-fill-available",
    background: "white", fontFamily: "'Google Sans', sans-serif",
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "24px 16px 56px", position: "relative",
    boxSizing: "border-box",
  },
  header: { display: "flex", alignItems: "center", gap: "16px", marginBottom: "28px", width: "100%", maxWidth: "520px" },
  iconWrap: {
    width: "56px", height: "56px", background: "#e8f0fe", borderRadius: "16px",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    border: "1px solid #c5d8fb",
  },
  title:    { margin: 0, fontSize: "26px", fontWeight: "700", color: "#111827", letterSpacing: "-0.3px" },
  subtitle: { margin: "4px 0 0", fontSize: "14px", color: "#4b5563" },
  card: {
    background: "white", borderRadius: "20px", padding: "32px", width: "100%", maxWidth: "520px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 24px rgba(26,115,232,0.08),0 1px 4px rgba(0,0,0,0.04)", position: "relative", zIndex: 1,
  },
  circleWrap: { display: "flex", justifyContent: "center", marginBottom: "24px" },
  circle: {
    width: "62px", height: "62px",
    background: "linear-gradient(135deg,#098ae1,#0770b8)",
    borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 6px 20px rgba(26,115,232,0.45)",
    animation: "popIn 0.5s cubic-bezier(.34,1.56,.64,1) both",
  },
  greenBlock: {
    background: "linear-gradient(135deg,#e8f0fe,#d2e3fc)",
    border: "1px solid #a8c7fa", borderRadius: "12px", padding: "14px 16px",
  },
  blockHead:   { display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: "600", color: "#0770b8", marginBottom: "10px" },
  linkBox:     { background: "white", borderRadius: "8px", padding: "10px 12px", border: "1px solid #a8c7fa" },
  deliveryRow: { display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#4b5563", marginTop: "2px" },
  shareRow:    { display: "flex", alignItems: "center", gap: "6px", margin: "18px 0 10px" },
  shareLabel:  { fontSize: "13px", fontWeight: "600", color: "#374151" },
  actionRow:   { display: "flex", gap: "12px" },
  msgBtn: {
    display: "flex", alignItems: "center", gap: "7px", padding: "11px 20px",
    border: "none", borderRadius: "10px", color: "white", fontWeight: "600", fontSize: "14px",
    cursor: "pointer", boxShadow: "0 4px 12px rgba(26,115,232,0.35)", transition: "filter 0.15s",
  },
  copyBtn: {
    display: "flex", alignItems: "center", gap: "7px", padding: "11px 20px",
    border: "2px solid #098ae1", borderRadius: "10px", background: "white",
    color: "#098ae1", fontWeight: "600", fontSize: "14px", cursor: "pointer", transition: "filter 0.15s",
  },
  resetBtn: {
    marginTop: "20px", background: "none", border: "none", color: "#098ae1",
    fontSize: "13px", fontWeight: "600", cursor: "pointer", padding: 0,
    textDecoration: "underline", display: "block",
  },
  fieldGroup: { marginBottom: "22px", position: "relative" },
  label:      { display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "10px" },
  select: {
    width: "100%", padding: "11px 14px", border: "1.5px solid #d1d5db", borderRadius: "10px",
    fontSize: "14px", color: "#374151", background: "white", outline: "none", cursor: "pointer", boxSizing: "border-box",
  },
  totalText: { margin: "6px 0 0", fontSize: "12px", color: "#6b7280" },
  tabRow:    { display: "flex", border: "1.5px solid #d1d5db", borderRadius: "10px", overflow: "hidden", marginBottom: "12px" },
  tab:       { flex: 1, padding: "11px", border: "none", background: "white", color: "#6b7280", fontWeight: "500", fontSize: "14px", cursor: "pointer" },
  tabActive: { background: "#098ae1", color: "white", fontWeight: "600" },
  input: {
    width: "100%", padding: "11px 40px 11px 14px", border: "1.5px solid #d1d5db",
    borderRadius: "10px", fontSize: "14px", color: "#374151", background: "white", outline: "none", boxSizing: "border-box",
  },
  searchIcon: { position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" },
  dropdown: {
    position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
    background: "white", border: "1.5px solid #e5e7eb", borderRadius: "10px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 100, maxHeight: "200px", overflowY: "auto",
  },
  dropItem:   { padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", background: "white", borderBottom: "1px solid #f0f0f0" },
  dropName:   { fontSize: "14px", color: "#111827", fontWeight: "500" },
  dropBranch: { fontSize: "12px", color: "#6b7280" },
  dropEmpty:  { padding: "14px", textAlign: "center", color: "#9ca3af", fontSize: "14px" },
  genBtn: {
    width: "100%", padding: "14px", background: "#098ae1", color: "white",
    border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: "600",
    boxShadow: "0 4px 14px rgba(26,115,232,0.4)", transition: "filter 0.2s,transform 0.15s",
  },
  btnRow:  { display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" },
  overlay: { position: "fixed", inset: 0, zIndex: 50 },
  clearBtn: {
    position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
    background: "none", border: "none", cursor: "pointer",
    color: "#9ca3af", lineHeight: 1, padding: "4px 6px",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2,
    minWidth: "28px", minHeight: "28px",
  },
  modalCloseBtn: {
    position: "absolute", top: "14px", right: "14px",
    width: "36px", height: "36px", borderRadius: "50%",
    background: "#f3f4f6", border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#6b7280", zIndex: 10, flexShrink: 0,
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  },
};