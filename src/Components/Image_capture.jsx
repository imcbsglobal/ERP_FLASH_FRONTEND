import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import API_BASE_URL from "../service/apiConfig";

/* ═══════════════════════════════════════════════════════════════
   CAPTURE PAGE — rendered at /image_capture/capture/:uuid
   Fetches link details from the API then drops straight into
   ImageCaptureFlow — no phone verify, no OTP screen.
═══════════════════════════════════════════════════════════════ */
export function CapturePage({ API_BASE }) {
  const { uuid } = useParams();
  const [status, setStatus]     = useState("loading"); // "loading" | "ready" | "error"
  const [linkData, setLinkData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!uuid) { setStatus("error"); setErrorMsg("Invalid link."); return; }
    const base = API_BASE || API_BASE_URL.replace(/\/api$/, "");
    fetch(`${base}/image_capture/api/capture-link/${uuid}/`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "Link not found." : "Failed to load link.");
        return r.json();
      })
      .then((data) => {
        if (data.status === "used") {
          setStatus("error"); setErrorMsg("This link has already been used.");
        } else if (data.is_expired || data.status === "expired") {
          setStatus("error"); setErrorMsg("This link has expired. Please request a new one.");
        } else {
          setLinkData(data); setStatus("ready");
        }
      })
      .catch((err) => { setStatus("error"); setErrorMsg(err.message || "Unable to load this link."); });
  }, [uuid]);

  if (status === "loading") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f7fa" }}>
        <div style={{ textAlign: "center", color: "#6b7280", fontFamily: "\'Google Sans\', sans-serif" }}>
          <div style={{ width: 40, height: 40, border: "3px solid #e5e7eb", borderTopColor: "#0990eb", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 16px" }} />
          <style>{"@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}"}</style>
          <p style={{ fontSize: 15, fontWeight: 500 }}>Loading…</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    const isExpired = errorMsg.toLowerCase().includes("expired");
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f7fa", padding: 24 }}>
        <div style={{ background: "white", borderRadius: 20, padding: "40px 32px", maxWidth: 420, width: "100%", textAlign: "center", boxShadow: "0 8px 40px rgba(0,0,0,0.10)", fontFamily: "\'Google Sans\', sans-serif" }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: isExpired ? "#fff7ed" : "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={isExpired ? "#f97316" : "#ef4444"} strokeWidth="2.5" strokeLinecap="round">
              {isExpired ? (
                <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>
              ) : (
                <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>
              )}
            </svg>
          </div>
          <p style={{ fontSize: 18, fontWeight: 700, color: "#1f2937", marginBottom: 8 }}>{isExpired ? "Link Expired" : "Link Unavailable"}</p>
          <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6, marginBottom: isExpired ? 24 : 0 }}>{errorMsg}</p>
          {isExpired && (
            <>
              <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 12, padding: "14px 16px", marginBottom: 20, textAlign: "left" }}>
                <p style={{ fontSize: 13, color: "#0369a1", lineHeight: 1.6, margin: 0 }}>
                  <strong>💡 Need a new link?</strong><br/>
                  Contact the person who sent you this link to generate a fresh verification link.
                </p>
              </div>
              <button
                onClick={() => window.location.reload()}
                style={{
                  width: "100%",
                  padding: "12px 20px",
                  background: "#0990eb",
                  border: "none",
                  borderRadius: 12,
                  color: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "background 0.2s"
                }}
                onMouseOver={(e) => e.currentTarget.style.background = "#0770b8"}
                onMouseOut={(e) => e.currentTarget.style.background = "#0990eb"}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"/>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
                Refresh Page
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // status === "ready" — go straight to capture, no phone/OTP
  return (
    <ImageCaptureFlow
      uuid={uuid}
      phone={linkData?.phone || ""}
      customerName={linkData?.customer_name_resolved || ""}
      API_BASE={API_BASE || API_BASE_URL.replace(/\/api$/, "")}
    />
  );
}


/* ═══════════════════════════════════════════════════════════════
   GOOGLE MAPS-STYLE LEAFLET MAP COMPONENT
═══════════════════════════════════════════════════════════════ */
function LeafletMap({ lat, lng, capturedPhoto }) {
  const mapRef      = useRef(null);
  const instanceRef = useRef(null);
  const markerRef   = useRef(null);
  const circleRef   = useRef(null);

  useEffect(() => {
    // ── Leaflet CSS ──
    if (!document.getElementById("leaflet-css")) {
      const link = Object.assign(document.createElement("link"), {
        id: "leaflet-css", rel: "stylesheet",
        href: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css",
      });
      document.head.appendChild(link);
    }

    const initMap = () => {
      if (!mapRef.current || instanceRef.current) return;
      const L = window.L;

      // ── Map instance (no default zoom control — we add custom) ──
      const map = L.map(mapRef.current, {
        zoomControl: false,
        scrollWheelZoom: true,
        attributionControl: false,
      }).setView([lat, lng], 16);

      // ── Tile layer — Google Maps-like style via CartoDB ──
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        subdomains: "abcd",
      }).addTo(map);

      // ── Attribution (small, bottom-left) ──
      L.control.attribution({ position: "bottomleft", prefix: false })
        .addAttribution('© <a href="https://www.openstreetmap.org/copyright" style="color:#0990eb">OSM</a>')
        .addTo(map);

      // ── Accuracy circle (light blue ring) ──
      circleRef.current = L.circle([lat, lng], {
        radius: 40,
        color: "#4285F4",
        fillColor: "#4285F4",
        fillOpacity: 0.15,
        weight: 1.5,
        opacity: 0.6,
      }).addTo(map);

      // ── Live blue dot marker (Google Maps style) ──
      const dotIcon = L.divIcon({
        className: "",
        html: `
          <div style="position:relative;width:22px;height:22px;">
            <div style="
              position:absolute;inset:0;
              background:#4285F4;
              border:3px solid white;
              border-radius:50%;
              box-shadow:0 2px 8px rgba(66,133,244,0.6);
            "></div>
            <div style="
              position:absolute;top:50%;left:50%;
              width:44px;height:44px;
              margin:-22px 0 0 -22px;
              border-radius:50%;
              background:rgba(66,133,244,0.18);
              animation:gm-pulse 2s ease-out infinite;
            "></div>
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      markerRef.current = L.marker([lat, lng], { icon: dotIcon }).addTo(map);

      // ── Pulse animation injected once ──
      if (!document.getElementById("gm-pulse-style")) {
        const s = document.createElement("style");
        s.id = "gm-pulse-style";
        s.textContent = `
          @keyframes gm-pulse {
            0%   { transform:scale(0.4); opacity:0.8; }
            70%  { transform:scale(1.8); opacity:0; }
            100% { transform:scale(0.4); opacity:0; }
          }
        `;
        document.head.appendChild(s);
      }

      instanceRef.current = map;
    };

    if (window.L) {
      initMap();
    } else {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
      script.onload = initMap;
      document.head.appendChild(script);
    }

    return () => {
      if (instanceRef.current) { instanceRef.current.remove(); instanceRef.current = null; }
    };
  }, [lat, lng]);

  // ── Custom controls ──
  const zoom = (delta) => {
    if (instanceRef.current) instanceRef.current.setZoom(instanceRef.current.getZoom() + delta);
  };
  const recenter = () => {
    if (instanceRef.current) instanceRef.current.flyTo([lat, lng], 16, { duration: 0.8 });
  };

  return (
    <div style={{ position: "relative", width: "100%", borderRadius: "14px 14px 0 0", overflow: "hidden" }}>
      {/* Map canvas */}
      <div ref={mapRef} style={{ width: "100%", height: "260px", background: "#e8f4f8" }} />

      {/* ── Google Maps-style zoom + locate controls (right side) ── */}
      <div style={{
        position: "absolute", right: 10, bottom: 36, zIndex: 1000,
        display: "flex", flexDirection: "column", gap: 2,
      }}>
        {/* Locate / recenter */}
        <button onClick={recenter} title="Your location" style={{
          width: 36, height: 36, background: "white", border: "none",
          borderRadius: 4, boxShadow: "0 2px 6px rgba(0,0,0,0.28)",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 6,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3.5" fill="#4285F4"/>
            <circle cx="12" cy="12" r="3.5" stroke="white" strokeWidth="1.5" fill="none"/>
            <line x1="12" y1="2" x2="12" y2="6"  stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/>
            <line x1="12" y1="18" x2="12" y2="22" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/>
            <line x1="2"  y1="12" x2="6"  y2="12" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/>
            <line x1="18" y1="12" x2="22" y2="12" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
        {/* Zoom + */}
        <button onClick={() => zoom(1)} style={{
          width: 36, height: 36, background: "white", border: "none",
          borderRadius: "4px 4px 0 0", boxShadow: "0 2px 6px rgba(0,0,0,0.28)",
          cursor: "pointer", fontSize: 22, fontWeight: 400, color: "#555",
          lineHeight: 1, borderBottom: "1px solid #e0e0e0",
        }}>+</button>
        {/* Zoom − */}
        <button onClick={() => zoom(-1)} style={{
          width: 36, height: 36, background: "white", border: "none",
          borderRadius: "0 0 4px 4px", boxShadow: "0 2px 6px rgba(0,0,0,0.28)",
          cursor: "pointer", fontSize: 26, fontWeight: 300, color: "#555",
          lineHeight: 0.9,
        }}>−</button>
      </div>

      {/* ── Street-View-style photo thumbnail (bottom-left) ── */}
      {capturedPhoto && (
        <div style={{
          position: "absolute", left: 10, bottom: 36, zIndex: 1000,
          width: 72, height: 72, borderRadius: 8,
          overflow: "hidden", border: "2.5px solid white",
          boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
          cursor: "pointer",
        }}>
          <img src={capturedPhoto} alt="Captured" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          {/* 360° icon overlay */}
          <div style={{
            position: "absolute", bottom: 3, right: 3,
            background: "rgba(0,0,0,0.55)", borderRadius: 3, padding: "1px 4px",
            display: "flex", alignItems: "center", gap: 2,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
              <path d="M12 4C7.58 4 4 7.58 4 12s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" opacity=".4"/>
              <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"/>
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   VERIFICATION SUCCESS SCREEN
═══════════════════════════════════════════════════════════════ */
function VerificationSuccess({ data, onClose }) {
  const { customerName, phone, preview, address, lat, lng, verifiedAt } = data || {};

  const formatDate = (raw) => {
    const d = raw ? new Date(raw) : new Date();
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2,"0")}, ${d.getFullYear()} - ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
  };

  const hasLocation = lat && lng;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Google Sans', sans-serif !important; }
        @keyframes slideIn { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes popIn   { 0%{transform:scale(0.3);opacity:0} 70%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .vs-page { min-height:100vh; min-height:-webkit-fill-available; display:flex; align-items:center; justify-content:center; padding:24px; background:white; }
        .vs-card { background:#ffffff; border-radius:20px; padding:36px 32px 28px; width:100%; max-width:460px; box-shadow:0 12px 48px rgba(0,0,0,0.14); display:flex; flex-direction:column; align-items:center; animation:slideIn 0.35s ease both; }
        .vs-check { width:68px; height:68px; border-radius:50%; background:#0990eb; display:flex; align-items:center; justify-content:center; box-shadow:0 6px 20px rgba(26,115,232,0.45); margin-bottom:18px; animation:popIn 0.5s cubic-bezier(.34,1.56,.64,1) both; }
        .vs-title { font-size:22px; font-weight:700; color:#0990eb; margin-bottom:8px; text-align:center; }
        .vs-subtitle { font-size:13px; color:#6b7280; text-align:center; line-height:1.65; margin-bottom:22px; max-width:320px; }
        .vs-thumb-wrap { width:160px; height:130px; border-radius:14px; border:2.5px solid #2eb85c; overflow:hidden; margin-bottom:26px; animation:fadeUp 0.4s 0.15s ease both; background:#f3f4f6; display:flex; align-items:center; justify-content:center; }
        .vs-thumb-wrap img { width:100%; height:100%; object-fit:cover; }
        .vs-thumb-placeholder { font-size:36px; }
        .vs-rows { width:100%; display:flex; flex-direction:column; gap:0; animation:fadeUp 0.4s 0.2s ease both; }
        .vs-row { display:flex; align-items:flex-start; gap:14px; padding:14px 0; border-bottom:1px solid #f0f0f0; }
        .vs-row:last-child { border-bottom:none; }
        .vs-icon-wrap { width:38px; height:38px; border-radius:10px; background:#0990eb; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:2px; }
        .vs-row-content { flex:1; }
        .vs-row-label { font-size:10px; font-weight:700; letter-spacing:0.8px; color:#9ca3af; text-transform:uppercase; margin-bottom:3px; }
        .vs-row-value { font-size:15px; font-weight:600; color:#1f2937; word-break:break-word; }
        .loc-badge { display:inline-flex; align-items:center; gap:6px; background:#e8f0fe; border:1.5px solid #a8c7fa; color:#0990eb; font-size:13px; font-weight:700; padding:5px 14px; border-radius:30px; margin-bottom:10px; }
        .loc-badge-dot { width:8px; height:8px; border-radius:50%; background:#1a73e8; }
        .loc-box { width:100%; background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; padding:12px 14px; display:flex; flex-direction:column; gap:6px; }
        .loc-box-addr { display:flex; align-items:flex-start; gap:7px; font-size:13px; font-weight:600; color:#1f2937; line-height:1.5; }
        .loc-box-coords { display:flex; align-items:center; gap:7px; font-size:11.5px; color:#6b7280; font-weight:500; letter-spacing:0.2px; }
        .vs-close-btn { margin-top:24px; padding:11px 32px; background:#0990eb; border:none; border-radius:10px; font-size:14px; font-weight:600; color:white; cursor:pointer; display:flex; align-items:center; gap:7px; transition:background 0.18s,transform 0.15s; animation:fadeUp 0.4s 0.3s ease both; }
        .vs-close-btn:hover { background:#e5e7eb; transform:translateY(-1px); }
        .vs-close-btn:active { transform:translateY(0); }
      `}</style>

      <div className="vs-page">
        <div className="vs-card">

          <div className="vs-check">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>

          <p className="vs-title">Verification Successful!</p>
          <p className="vs-subtitle">Thank you for completing the verification process. Your information has been successfully recorded.</p>

          <div className="vs-thumb-wrap">
            {preview ? <img src={preview} alt="Captured verification photo" /> : <span className="vs-thumb-placeholder">📷</span>}
          </div>

          <div className="vs-rows">
            {/* Customer Name */}
            <div className="vs-row">
              <div className="vs-icon-wrap">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
              </div>
              <div className="vs-row-content">
                <p className="vs-row-label">Customer Name</p>
                <p className="vs-row-value">{customerName || "—"}</p>
              </div>
            </div>

            {/* Phone */}
            <div className="vs-row">
              <div className="vs-icon-wrap">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="white"><path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C9.61 21 3 14.39 3 6a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.46.57 3.58a1 1 0 0 1-.25 1.01l-2.2 2.2z"/></svg>
              </div>
              <div className="vs-row-content">
                <p className="vs-row-label">Phone Number</p>
                <p className="vs-row-value">{phone || "—"}</p>
              </div>
            </div>

            {/* Location */}
            <div className="vs-row">
              <div className="vs-icon-wrap">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              </div>
              <div className="vs-row-content">
                <p className="vs-row-label">Location Status</p>
                {hasLocation ? (
                  <>
                    <div className="loc-badge" style={{ marginBottom: 10 }}>
                      <div className="loc-badge-dot"/>
                      Location Detected ✓
                    </div>
                    <div className="loc-box">
                      {address && (
                        <div className="loc-box-addr">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="#1a73e8" style={{ flexShrink:0, marginTop:2 }}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                          <span>{address}</span>
                        </div>
                      )}
                      <div className="loc-box-coords">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                        <span>Lat: {lat} | Lng: {lng}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="vs-row-value" style={{ color: "#ef4444" }}>⚠️ Location Not Available</p>
                )}
              </div>
            </div>

            {/* Verified At */}
            <div className="vs-row">
              <div className="vs-icon-wrap">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div className="vs-row-content">
                <p className="vs-row-label">Verified At</p>
                <p className="vs-row-value">{formatDate(verifiedAt)}</p>
              </div>
            </div>
          </div>

          <button className="vs-close-btn" onClick={onClose}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fcfcfc" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Close
          </button>

        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   IMAGE CAPTURE FLOW
═══════════════════════════════════════════════════════════════ */
export default function ImageCaptureFlow({
  uuid,
  phone: propPhone = "",
  customerName: propCustomerName = "",
  API_BASE,
  onSuccess,
}) {
  /* ── App-level screen state ── */
  const [screen, setScreen] = useState("capture"); // "capture" | "success"
  const [successData, setSuccessData] = useState(null);

  /* ── Flow state ── */
  const [step, setStep] = useState("capture"); // "capture" | "add"

  /* ── Captured image ── */
  const [imgDataUrl, setImgDataUrl] = useState(null);
  const [imgFile,    setImgFile]    = useState(null);

  /* ── Step 1 ── */
  const [phase,      setPhase]      = useState("idle");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [stream,     setStream]     = useState(null);
  const videoRef     = useRef(null);
  const canvasRef    = useRef(null);
  const fileInputRef = useRef(null);

  /* ── GPS ── */
  const [gps,        setGps]        = useState(null);
  const [address,    setAddress]    = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError,   setGpsError]   = useState("");
  const [gpsPulse,   setGpsPulse]   = useState(false);
  const watchIdRef   = useRef(null);

  const reverseGeocode = async (lat, lng) => {
    try {
      const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, { headers: { "Accept-Language": "en" } });
      const data = await res.json();
      setAddress(data.display_name || "");
    } catch { setAddress(""); }
  };

  const startLocation = () => {
    if (!navigator.geolocation) { setGpsError("Geolocation not supported."); return; }
    setGpsLoading(true); setGpsError("");
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setGps({ lat, lng });
        setGpsLoading(false);
        setGpsPulse(true);
        setTimeout(() => setGpsPulse(false), 600);
        reverseGeocode(lat, lng);
      },
      (err) => { setGpsError(err.message || "Unable to get location."); setGpsLoading(false); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  };

  const stopLocation = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  useEffect(() => {
    if (phase === "preview") startLocation();
    else if (phase === "idle") { stopLocation(); setGps(null); setAddress(""); setGpsError(""); }
    return stopLocation;
  }, [phase]);

  const fmt = (n) => Number(n).toFixed(6);

  /* Camera helpers */
  const openCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      setStream(s); setCameraOpen(true);
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = s; }, 100);
    } catch { fileInputRef.current?.click(); }
  };

  const takeSnapshot = () => {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    fetch(dataUrl).then(r => r.blob()).then(blob => {
      setImgFile(new File([blob], "capture.jpg", { type: "image/jpeg" }));
    });
    setImgDataUrl(dataUrl);
    stopStream(); setCameraOpen(false); setPhase("preview");
  };

  const handleFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    setImgFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => { setImgDataUrl(ev.target.result); setPhase("preview"); };
    reader.readAsDataURL(file);
  };

  const stopStream = () => { stream?.getTracks().forEach(t => t.stop()); setStream(null); };

  const retake = () => {
    setImgDataUrl(null); setImgFile(null);
    setPhase("idle"); stopStream(); setCameraOpen(false);
    setGps(null); setAddress(""); setGpsError("");
    setStep("capture");
  };

  const proceedToAdd = () => setStep("add");

  /* ── Step 2 ── */
  const [loading,   setLoading]   = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const [showMap,   setShowMap]   = useState(false);

  const showUploadErr = (msg) => { setUploadErr(msg); setTimeout(() => setUploadErr(""), 4000); };

  /* ── Submit: POST to /api/upload-image/ ── */
  const handleSubmit = useCallback(async () => {
    if (!imgDataUrl && !imgFile) { showUploadErr("No image found. Please retake."); return; }
    setLoading(true);
    try {
      const formData = new FormData();
      // Use imgFile if available (file picker), otherwise convert dataUrl blob
      let fileToUpload = imgFile;
      if (!fileToUpload && imgDataUrl) {
        const res  = await fetch(imgDataUrl);
        const blob = await res.blob();
        fileToUpload = new File([blob], "capture.jpg", { type: "image/jpeg" });
      }
      formData.append("image", fileToUpload);
      if (uuid)               formData.append("uuid",          uuid);
      if (propCustomerName)   formData.append("customer_name", propCustomerName);
      if (propPhone)          formData.append("phone",         propPhone);
      if (gps) {
        formData.append("latitude",  parseFloat(gps.lat.toFixed(7)));
        formData.append("longitude", parseFloat(gps.lng.toFixed(7)));
        formData.append("address",   address);
      }

      const base = API_BASE || API_BASE_URL.replace(/\/api$/, "");
      const r    = await fetch(`${base}/image_capture/api/upload-image/`, {
        method: "POST",
        body:   formData,
      });
      const data = await r.json();

      if (!r.ok) {
        showUploadErr(data?.message || data?.detail || "Upload failed. Please try again.");
        return;
      }

      // Success — show success screen with returned or local data
      setSuccessData({
        customerName: data.customer_name || propCustomerName || "Customer",
        phone:        data.phone         || propPhone        || "",
        preview:      imgDataUrl,
        address:      data.address       || address,
        lat:          data.lat           ?? gps?.lat ?? null,
        lng:          data.lng           ?? gps?.lng ?? null,
        verifiedAt:   data.verified_at   || new Date().toISOString(),
      });
      setScreen("success");
      onSuccess?.(imgDataUrl);
    } catch {
      showUploadErr("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [imgDataUrl, imgFile, uuid, propCustomerName, propPhone, address, gps, API_BASE, onSuccess]);

  const handleClose = () => {
    window.location.href = "https://www.flashinnovations.in/";
  };

  /* ── Show success screen ── */
  if (screen === "success" && successData) {
    return <VerificationSuccess data={successData} onClose={handleClose} />;
  }

  /* ── Capture + Add screens ── */
  return (
    <>
      <style>{css}</style>
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
        style={{ display: "none" }} onChange={handleFile} />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div className="icf-page">
        <div className="icf-card icf-card-anim">

          {/* ── STEP 1: CAPTURE ── */}
          {step === "capture" && (
            <>
              {phase === "idle" && !cameraOpen && (
                <>
                  <div className="icf-icon-wrap">
                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none"
                      stroke="#bbb" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  </div>
                  <h1 className="icf-title">Capture Image</h1>
                  <p className="icf-subtitle">Take a photo using your camera to verify your identity</p>

                  <button className="icf-cam-btn" onClick={openCamera}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                    Open Camera &amp; Capture Photo
                  </button>

                  <div className="icf-notice">
                    <div className="icf-notice-head">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="#c67c00" style={{ flexShrink: 0 }}>
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
                      </svg>
                      <strong>Important: Enable Location Services</strong>
                    </div>
                    <p><strong>Android:</strong> Turn ON GPS and allow location access for your browser (e.g., Chrome).</p>
                    <p><strong>iOS:</strong> Settings → Privacy &amp; Security → Location Services → allow Safari.</p>
                    <p><strong>Note:</strong> Keep location active before capturing the image.</p>
                  </div>
                </>
              )}

              {/* Live camera */}
              {cameraOpen && (
                <div className="icf-camera-wrap">
                  <video ref={videoRef} autoPlay playsInline muted className="icf-video" />
                  <div className="icf-cam-controls">
                    <button className="icf-snap-btn" onClick={takeSnapshot}>
                      <span className="icf-snap-inner" />
                    </button>
                    <button className="icf-cancel-btn" onClick={() => { stopStream(); setCameraOpen(false); }}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Preview */}
              {phase === "preview" && !cameraOpen && (
                <>
                  <div className="icf-icon-wrap">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
                      stroke="#0990eb" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  </div>
                  <h1 className="icf-title">Preview</h1>

                  <img src={imgDataUrl} alt="Captured" className="icf-preview-img" />

                  <div className="icf-loc-block">
                    {gpsLoading && <div className="icf-loc-loading"><span className="icf-spinner" />Getting your GPS coordinates…</div>}
                    {gpsError && !gpsLoading && (
                      <div className="icf-loc-error">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#dc2626"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                        {gpsError}
                      </div>
                    )}
                    {gps && !gpsLoading && (
                      <>
                        <div className={`icf-loc-lines${gpsPulse ? " icf-loc-pulse" : ""}`}>
                          <div className="icf-loc-row"><span className="icf-loc-label">Latitude:</span><span className="icf-loc-val">{fmt(gps.lat)}</span></div>
                          <div className="icf-loc-row"><span className="icf-loc-label">Longitude:</span><span className="icf-loc-val">{fmt(gps.lng)}</span></div>
                          {address && <div className="icf-loc-row"><span className="icf-loc-label">Location:</span><span className="icf-loc-addr">{address}</span></div>}
                          <div className="icf-loc-source-row"><span className="icf-source-badge">Source: live</span></div>
                        </div>
                        <div className="icf-live-bar">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          Live location detected
                        </div>
                      </>
                    )}
                  </div>

                  {/* View Map */}
                  {gps && (
                    <div className="icf-map-section">
                      <button className="icf-map-toggle-btn" onClick={() => setShowMap(p => !p)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                          <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
                        </svg>
                        {showMap ? "Hide Map" : "View Map"}
                      </button>
                      {showMap && (
                        <div className="icf-map-wrap">
                          <LeafletMap lat={gps.lat} lng={gps.lng} capturedPhoto={imgDataUrl} />
                          <a
                            href={`https://www.openstreetmap.org/?mlat=${gps.lat}&mlon=${gps.lng}#map=15/${gps.lat}/${gps.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="icf-map-link"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                            Open in OpenStreetMap
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="icf-btn-row">
                    <button className="icf-retake-btn" onClick={retake}>↩ Retake</button>
                    <button className="icf-next-btn" onClick={proceedToAdd}>Next →</button>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── STEP 2: ADD / SUBMIT ── */}
          {step === "add" && (
            <>
              <div className="icf-add-title-row">
                <span className="icf-cam-emoji">📷</span>
                <h1 className="icf-title">Capture Image</h1>
              </div>
              <p className="icf-subtitle">Take a photo using your camera to verify your identity</p>

              {uploadErr && (
                <div className="icf-error-banner">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {uploadErr}
                </div>
              )}

              <img src={imgDataUrl} alt="Captured" className="icf-preview-img" />

              <div className="icf-loc-block">
                {gpsLoading && <div className="icf-loc-loading"><span className="icf-spinner" />Getting your GPS coordinates…</div>}
                {gpsError && !gpsLoading && (
                  <div className="icf-loc-error">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#dc2626"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                    {gpsError}
                  </div>
                )}
                {gps && !gpsLoading && (
                  <>
                    <div className={`icf-loc-lines${gpsPulse ? " icf-loc-pulse" : ""}`}>
                      <div className="icf-loc-row"><span className="icf-loc-label">Latitude:</span><span className="icf-loc-val">{fmt(gps.lat)}</span></div>
                      <div className="icf-loc-row"><span className="icf-loc-label">Longitude:</span><span className="icf-loc-val">{fmt(gps.lng)}</span></div>
                      {address && <div className="icf-loc-row"><span className="icf-loc-label">Location:</span><span className="icf-loc-addr">{address}</span></div>}
                      <div className="icf-loc-source-row"><span className="icf-source-badge">Source: live</span></div>
                    </div>
                    <div className="icf-live-bar">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      Live location detected
                    </div>
                  </>
                )}
              </div>

              {/* View Map */}
              {gps && (
                <div className="icf-map-section">
                  <button className="icf-map-toggle-btn" onClick={() => setShowMap(p => !p)}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                      <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
                    </svg>
                    {showMap ? "Hide Map" : "View Map"}
                  </button>
                  {showMap && (
                    <div className="icf-map-wrap">
                      <LeafletMap lat={gps.lat} lng={gps.lng} capturedPhoto={imgDataUrl} />
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${gps.lat}&mlon=${gps.lng}#map=15/${gps.lat}/${gps.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="icf-map-link"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        Open in OpenStreetMap
                      </a>
                    </div>
                  )}
                </div>
              )}

              <div className="icf-add-btn-group">
                <button className="icf-submit-btn" onClick={handleSubmit} disabled={loading}>
                  {loading ? (
                    <><span className="icf-spinner icf-spinner-white" />Processing…</>
                  ) : (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                      </svg>
                      Submit Image
                    </>
                  )}
                </button>
                <button className="icf-retake-btn-full" onClick={retake}>Retake Photo</button>
              </div>
            </>
          )}

        </div>
      </div>
      {/* ── IMCB Footer ── */}
      <div style={{ flexShrink:0, padding:"10px 20px", borderTop:"1px solid #e8eaed", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", gap:"6px" }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <span style={{ fontSize:"11px", color:"#9ca3af", fontWeight:500 }}>Powered by</span>
        <span style={{ fontSize:"11px", fontWeight:700, color:"#1a73e8" }}>IMCB Solutions LLP</span>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════════════════════ */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Google Sans', sans-serif !important; }

  @keyframes icf-cardIn  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes icf-fadeUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes icf-popIn   { 0%{transform:scale(0.3);opacity:0} 70%{transform:scale(1.18)} 100%{transform:scale(1);opacity:1} }
  @keyframes icf-spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes icf-locPulse{ 0%{background:#dbeafe} 100%{background:white} }

  .icf-page { min-height:100vh; min-height:-webkit-fill-available; display:flex; align-items:center; justify-content:center; padding:24px 16px;  }
  .icf-card { background:white; border-radius:22px; padding:36px 28px 32px; width:100%; max-width:420px; box-sizing:border-box; box-shadow:0 8px 40px rgba(9,144,235,0.18),0 2px 8px rgba(0,0,0,0.08); display:flex; flex-direction:column; align-items:center; gap:15px; }
  .icf-card-anim { animation: icf-cardIn 0.4s cubic-bezier(.22,1,.36,1) both; }
  .icf-fade-up   { animation: icf-fadeUp 0.4s ease both; }
  .icf-pop-in    { animation: icf-popIn  0.5s cubic-bezier(.34,1.56,.64,1) both; }

  .icf-icon-wrap { width:68px; height:68px; background:#f5f7fa; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-bottom:2px; }
  .icf-title     { font-size:22px; font-weight:700; color:#1a1a2e; letter-spacing:-0.3px; text-align:center; }
  .icf-subtitle  { font-size:13px; color:#6b7280; text-align:center; line-height:1.6; margin-top:-4px; }

  .icf-cam-btn { width:100%; padding:15px 20px; background:white; border:2px solid #e0e1f0; border-radius:14px; font-size:15px; font-weight:600; color:#0990eb; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:9px; transition:border-color .2s,box-shadow .2s,transform .15s; margin-top:4px; }
  .icf-cam-btn:hover { border-color:#0990eb; box-shadow:0 0 0 3px rgba(9,144,235,0.12); transform:translateY(-1px); }

  .icf-notice { width:100%; background:#fffbea; border:1.5px solid #f5c842; border-radius:14px; padding:14px 16px; margin-top:4px; font-size:12.5px; color:#92400e; line-height:1.7; }
  .icf-notice-head { display:flex; align-items:center; gap:7px; margin-bottom:8px; font-size:13px; font-weight:700; color:#92550a; }

  .icf-camera-wrap { width:100%; display:flex; flex-direction:column; align-items:center; gap:16px; }
  .icf-video       { width:100%; border-radius:14px; background:#000; max-height:300px; object-fit:cover; }
  .icf-cam-controls{ display:flex; flex-direction:column; align-items:center; gap:12px; }
  .icf-snap-btn    { width:64px; height:64px; border-radius:50%; background:white; border:4px solid #0990eb; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; transition:transform .12s; }
  .icf-snap-btn:active { transform:scale(.92); }
  .icf-snap-inner  { display:block; width:44px; height:44px; border-radius:50%; background:#0990eb; }
  .icf-cancel-btn  { background:none; border:none; color:#6b7280; font-size:14px; cursor:pointer; }

  .icf-preview-img { width:100%; border-radius:14px; border:2px solid #e0e1f0; max-height:260px; object-fit:cover; }

  .icf-loc-block   { width:100%; border-radius:14px; overflow:hidden; border:1.5px solid #e5e7eb; animation:icf-fadeUp 0.35s ease both; }
  .icf-loc-loading { display:flex; align-items:center; gap:10px; padding:14px 16px; font-size:13px; color:#6b7280; background:white; }
  .icf-loc-error   { display:flex; align-items:center; gap:8px; padding:12px 16px; background:#fef2f2; font-size:12px; color:#b91c1c; }
  .icf-loc-lines   { padding:16px 20px 12px; display:flex; flex-direction:column; gap:5px; background:white; transition:background .3s; }
  .icf-loc-pulse   { animation:icf-locPulse 0.5s ease; }
  .icf-loc-row     { display:flex; align-items:flex-start; gap:5px; font-size:14px; line-height:1.6; }
  .icf-loc-label   { font-weight:700; color:#1a1a2e; white-space:nowrap; flex-shrink:0; }
  .icf-loc-val     { font-weight:500; color:#374151; font-variant-numeric:tabular-nums; }
  .icf-loc-addr    { font-weight:500; color:#374151; line-height:1.55; }
  .icf-loc-source-row { display:flex; justify-content:center; margin-top:8px; }
  .icf-source-badge   { display:inline-block; background:#0ea5e9; color:white; font-size:11.5px; font-weight:700; padding:4px 14px; border-radius:20px; }
  .icf-live-bar    { display:flex; align-items:center; justify-content:center; gap:7px; padding:11px 16px; background:#f0fdf4; border-top:1.5px solid #bbf7d0; font-size:13.5px; font-weight:600; color:#15803d; }

  .icf-btn-row     { display:flex; gap:12px; width:100%; }
  .icf-retake-btn  { flex:1; padding:13px 0; border:1.5px solid #d1d5db; border-radius:12px; background:white; color:#374151; font-weight:600; font-size:14px; cursor:pointer; transition:border-color .15s,color .15s; }
  .icf-retake-btn:hover { border-color:#0990eb; color:#0990eb; }
  .icf-next-btn    { flex:1; padding:13px 0; border:none; border-radius:12px; background:#0990eb; color:white; font-weight:600; font-size:14px; cursor:pointer; box-shadow:0 4px 14px rgba(9,144,235,0.35); transition:filter .15s,transform .15s; }
  .icf-next-btn:hover { filter:brightness(1.08); transform:translateY(-1px); }

  .icf-add-title-row { display:flex; align-items:center; gap:8px; }
  .icf-cam-emoji     { font-size:26px; }

  .icf-error-banner { width:100%; background:#fef2f2; border:1px solid #fecaca; border-radius:10px; padding:10px 14px; display:flex; align-items:center; gap:8px; font-size:13px; font-weight:500; color:#dc2626; }

  .icf-add-btn-group  { width:100%; display:flex; flex-direction:column; gap:10px; }
  .icf-submit-btn     { width:100%; padding:15px; border:none; border-radius:12px; background:#0990eb; color:white; font-size:15px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:7px; box-shadow:0 4px 18px rgba(9,144,235,0.4); transition:filter .18s,transform .15s; }
  .icf-submit-btn:hover:not(:disabled)  { filter:brightness(1.08); transform:translateY(-1px); }
  .icf-submit-btn:active:not(:disabled) { transform:translateY(0); }
  .icf-submit-btn:disabled { opacity:.6; cursor:not-allowed; }
  .icf-retake-btn-full { width:100%; padding:11px; background:none; border:1.5px solid #e0e1f0; border-radius:12px; font-size:14px; font-weight:600; color:#6b7280; cursor:pointer; transition:border-color .2s,color .2s; }
  .icf-retake-btn-full:hover { border-color:#0990eb; color:#0990eb; }

  .icf-spinner       { display:inline-block; width:16px; height:16px; vertical-align:middle; border:2px solid rgba(9,144,235,0.25); border-top-color:#0990eb; border-radius:50%; animation:icf-spin .7s linear infinite; margin-right:6px; }
  .icf-spinner-white { border-color:rgba(255,255,255,.3); border-top-color:white; }

  /* ── Map section ── */
  .icf-map-section { width:100%; display:flex; flex-direction:column; gap:10px; }
  .icf-map-toggle-btn {
    width:100%; padding:11px 16px;
    background:#e6f4ff; border:1.5px solid #7ecbf7; border-radius:12px;
    color:#0990eb; font-size:14px; font-weight:600; cursor:pointer;
    display:flex; align-items:center; justify-content:center; gap:8px;
    transition:background .18s, border-color .18s, transform .15s;
  }
  .icf-map-toggle-btn:hover { background:#d0eaff; border-color:#0990eb; transform:translateY(-1px); }
  .icf-map-toggle-btn:active { transform:translateY(0); }

  .icf-map-wrap {
    width:100%; border-radius:14px; overflow:hidden;
    border:1.5px solid #e5e7eb;
    box-shadow:0 4px 16px rgba(9,144,235,0.12);
    animation:icf-fadeUp 0.3s ease both;
    display:flex; flex-direction:column;
  }
  .icf-map-iframe {
    width:100%; height:220px; border:none; display:block; display:none;
  }
  .icf-map-link {
    display:flex; align-items:center; justify-content:center; gap:6px;
    padding:9px 14px;
    background:#f9fafb; border-top:1px solid #e5e7eb;
    font-size:12px; font-weight:600; color:#0990eb;
    text-decoration:none;
    transition:background .15s;
  }
  .icf-map-link:hover { background:#e6f4ff; }

  /* ── Mobile Responsive ── */
  @media (max-width: 480px) {
    .icf-page { padding: 10px; align-items: flex-start; }
    .icf-card { padding: 24px 16px 24px; border-radius: 16px; gap: 12px; margin-top: 8px; margin-bottom: 8px; }
    .icf-title { font-size: 19px; }
    .icf-cam-emoji { font-size: 22px; }
    .icf-subtitle { font-size: 12px; }
    .icf-cam-btn { padding: 14px 16px; font-size: 14px; min-height: 48px; }
    .icf-snap-btn { width: 56px; height: 56px; }
    .icf-snap-inner { width: 38px; height: 38px; }
    .icf-video { max-height: 260px; }
    .icf-preview-img { max-height: 220px; }
    .icf-next-btn, .icf-retake-btn { padding: 13px 0; font-size: 13px; min-height: 46px; }
    .icf-submit-btn { padding: 14px; font-size: 14px; min-height: 48px; }
    .icf-retake-btn-full { padding: 12px; min-height: 44px; }
    .icf-loc-lines { padding: 12px 14px 10px; }
    .icf-loc-row { font-size: 13px; }
    .icf-notice { font-size: 11.5px; padding: 12px 14px; }
    .icf-notice-head { font-size: 12px; }
    .icf-map-toggle-btn { padding: 10px 14px; font-size: 13px; }
    .vs-page { padding: 12px; align-items: flex-start; }
    .vs-card { padding: 24px 16px 20px; border-radius: 16px; margin-top: 8px; margin-bottom: 8px; }
    .vs-title { font-size: 19px; }
    .vs-subtitle { font-size: 12px; margin-bottom: 16px; }
    .vs-thumb-wrap { width: 130px; height: 110px; margin-bottom: 18px; }
    .vs-row { padding: 11px 0; gap: 10px; }
    .vs-icon-wrap { width: 32px; height: 32px; border-radius: 8px; }
    .vs-row-value { font-size: 14px; }
    .vs-close-btn { padding: 11px 24px; font-size: 14px; min-height: 46px; }
  }
  @media (max-width: 360px) {
    .icf-card { padding: 20px 12px 20px; }
    .vs-card { padding: 20px 12px 16px; }
    .icf-btn-row { gap: 8px; }
    .icf-title { font-size: 17px; }
  }`;