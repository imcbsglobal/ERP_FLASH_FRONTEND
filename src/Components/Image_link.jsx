import { useState } from "react";
import ImageCaptureFlow from "./Image_capture";
import PhoneVerification from "./phoneverify";

const branches = [
  "All Branches",
  "Downtown Branch",
  "North Branch",
  "South Branch",
  "East Branch",
  "West Branch",
];

const customers = [
  { id: 1, name: "Aisha Rahman",       branch: "Downtown Branch" },
  { id: 2, name: "Mohammed Al-Farsi",  branch: "North Branch"    },
  { id: 3, name: "Priya Nair",         branch: "South Branch"    },
  { id: 4, name: "James Okonkwo",      branch: "East Branch"     },
  { id: 5, name: "Sofia Lindqvist",    branch: "West Branch"     },
  { id: 6, name: "Ravi Shankar",       branch: "Downtown Branch" },
  { id: 7, name: "Amina Diallo",       branch: "North Branch"    },
  { id: 8, name: "Chen Wei",           branch: "South Branch"    },
];

export default function ImageCaptureLinkGenerator({ onBack, isModal = false, modalMode = "generateLink" }) {
  const [selectedBranch, setSelectedBranch]     = useState("All Branches");
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
  const [showCaptureFlow, setShowCaptureFlow]   = useState(false);
  const [showPhoneVerify, setShowPhoneVerify]   = useState(false);

  const filteredCustomers = customers.filter((c) => {
    const matchesBranch  = selectedBranch === "All Branches" || c.branch === selectedBranch;
    const matchesSearch  = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesBranch && matchesSearch;
  });

  const totalCustomers = customers.filter(
    (c) => selectedBranch === "All Branches" || c.branch === selectedBranch
  ).length;

  const handleGenerate = async () => {
    const name = mode === "select" ? selectedCustomer?.name : manualName;
    if (!name || !phone) return;
    setIsGenerating(true);
    await new Promise((r) => setTimeout(r, 1000));
    const uuid = [
      Math.random().toString(36).substring(2, 10),
      Math.random().toString(36).substring(2, 6),
      Math.random().toString(36).substring(2, 6),
      Math.random().toString(36).substring(2, 6),
      Math.random().toString(36).substring(2, 14),
    ].join("-");
    // Store only the path; App.jsx router will match it
    const linkPath = `/image_capture/capture/${uuid}/`;
    const linkFull = `${window.location.origin}${linkPath}`;
    setSuccessData({ linkPath, linkFull, phone });
    setIsGenerating(false);
    setMsgQueued(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(successData.linkFull);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /**
   * Navigate in-app instead of doing a full page reload.
   * Dispatches a custom event that App.jsx listens to.
   */
  const handleOpenLink = (e) => {
    e.preventDefault();
    setShowPhoneVerify(true);
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

  const isDisabled =
    isGenerating || !phone || (mode === "select" ? !selectedCustomer : !manualName);

  const customerName = mode === "select" ? selectedCustomer?.name : manualName;

  const handleContinueToUpload = () => {
    if (!customerName || !phone) return;
    setShowCaptureFlow(true);
  };

  const isContinueDisabled = !phone || (mode === "select" ? !selectedCustomer : !manualName);

  // ── If link was clicked, show Phone Verification screen ──────
  if (showPhoneVerify) {
    return <PhoneVerification onBack={() => setShowPhoneVerify(false)} />;
  }

  // ── If "Continue to Image Upload" was clicked, render ImageCaptureFlow ──
  if (showCaptureFlow) {
    return (
      <ImageCaptureFlow
        customerName={customerName}
        phone={phone}
        onSuccess={() => { setShowCaptureFlow(false); onBack?.(); }}
      />
    );
  }

  return (
    <div style={isModal ? { ...s.page, minHeight: 'unset', padding: '24px 16px 32px' } : s.page}>
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
      `}</style>

      

      <div style={s.header}>
        <div style={s.iconWrap}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#098ae1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 0 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </div>
        <div>
          <h1 style={s.title}>{modalMode === "manualCapture" ? "Manual Image Capture" : "Image Capture Link Generator"}</h1>
          <p style={s.subtitle}>{modalMode === "manualCapture" ? "Select a customer and proceed to capture their image" : "Create secure verification links for your customers"}</p>
        </div>
      </div>

      {/* ── SUCCESS VIEW ─────────────────────────────────────────────────── */}
      {successData ? (
        <div style={s.card}>
          <div style={{ animation: "fadeSlideUp 0.4s ease both" }}>

            {/* Green tick circle */}
            <div style={s.circleWrap}>
              <div style={s.circle}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            </div>

            {/* Link block */}
            <div style={{ ...s.greenBlock, animation: "fadeIn 0.35s 0.05s ease both" }}>
              <div style={s.blockHead}>
                <CircleCheck />
                <strong>Link Generated Successfully!</strong>
              </div>
              <div style={s.linkBox}>
                {/*
                  ── KEY CHANGE ──────────────────────────────────────────────
                  Clicking the link fires handleOpenLink which dispatches
                  "app:navigate" → App.jsx swaps to <VerifyPhone /> in-app.
                  The href is kept so right-click → open in new tab still works.
                */}
                <a
                  href={successData.linkFull}
                  className="link-text-clickable"
                  onClick={handleOpenLink}
                  style={{ fontSize: 13, lineHeight: "1.6" }}
                >
                  {successData.linkFull}
                </a>
              </div>
            </div>

            {/* Message queued block */}
            <div style={{ ...s.greenBlock, marginTop: "12px", animation: "fadeIn 0.35s 0.18s ease both" }}>
              <div style={s.blockHead}>
                <CircleCheck />
                <strong>Message queued for delivery to +91 {successData.phone}!</strong>
              </div>
              <div style={s.deliveryRow}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <span>Delivery may take 1–2 minutes</span>
              </div>
            </div>

            {/* Share label */}
            <div style={s.shareRow}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              <span style={s.shareLabel}>Share with customer:</span>
            </div>

            {/* Action buttons */}
            <div style={s.actionRow}>
              <button
                className="abtn"
                onClick={() => setMsgQueued(true)}
                style={{ ...s.msgBtn, background: msgQueued ? "#076fa3" : "#098ae1" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {msgQueued ? "Message Queued" : "Send Message"}
              </button>

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
        /* ── FORM VIEW ───────────────────────────────────────────────────── */
        <div style={s.card}>

          {/* Branch filter */}
          <div style={s.fieldGroup}>
            <label style={s.label}>
              <span style={{ color: "#098ae1", fontSize: 12 }}>▼</span> Filter by Branch:
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => { setSelectedBranch(e.target.value); setSelectedCustomer(null); setSearchQuery(""); }}
              style={s.select}
            >
              {branches.map((b) => <option key={b}>{b}</option>)}
            </select>
           
          </div>

          {/* Customer */}
          <div style={s.fieldGroup}>
            <label style={s.label}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#098ae1"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Customer:
            </label>

            {/* Tab toggle */}
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
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="Search customer..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  style={s.input}
                />
                <span style={s.searchIcon}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </span>
                {showDropdown && (
                  <div style={s.dropdown}>
                    {filteredCustomers.length === 0
                      ? <div style={s.dropEmpty}>No customers found</div>
                      : filteredCustomers.map((c) => (
                          <div
                            key={c.id}
                            style={s.dropItem}
                            onMouseDown={() => { setSelectedCustomer(c); setSearchQuery(c.name); setShowDropdown(false); }}
                          >
                            <span style={s.dropName}>{c.name}</span>
                            <span style={s.dropBranch}>{c.branch}</span>
                          </div>
                        ))
                    }
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

          {/* Phone */}
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
              style={s.input}
            />
          </div>

          {/* Generate btn — shown only when modalMode === "generateLink" */}
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

          {/* Continue to Image Upload — shown only when modalMode === "manualCapture" */}
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

      {showDropdown && <div style={s.overlay} onClick={() => setShowDropdown(false)} />}
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
    minHeight: "100vh", background: "white", fontFamily: "'Google Sans', sans-serif",
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "24px 16px 56px", position: "relative",
  },
  header: { display: "flex", alignItems: "center", gap: "16px", marginBottom: "28px" },
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
    borderRadius: "10px", fontSize: "14px", color: "#374151", outline: "none", boxSizing: "border-box",
  },
  searchIcon: { position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" },
  dropdown: {
    position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
    background: "white", border: "1.5px solid #e5e7eb", borderRadius: "10px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 100, maxHeight: "200px", overflowY: "auto",
  },
  dropItem:   { padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", background: "white" },
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
};