import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/* ═══════════════════════════════════════════════════════════════
   EXIF GPS HELPERS
   Dynamically loads exifr (lite build) from CDN and extracts
   GPS coordinates embedded in JPEG/HEIC files by phone cameras.
═══════════════════════════════════════════════════════════════ */
const loadExifr = () =>
  new Promise((resolve, reject) => {
    if (window.exifr) { resolve(window.exifr); return; }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/exifr/dist/lite.umd.js";
    s.onload  = () => resolve(window.exifr);
    s.onerror = reject;
    document.head.appendChild(s);
  });

/**
 * Returns { lat, lng } from the file's EXIF GPS tags, or null if not present.
 * Works with JPEG files produced by Android / iOS camera apps.
 */
const extractExifGps = async (file) => {
  try {
    const exifr   = await loadExifr();
    const gpsData = await exifr.gps(file);
    if (gpsData && gpsData.latitude != null && gpsData.longitude != null) {
      return { lat: gpsData.latitude, lng: gpsData.longitude };
    }
  } catch (e) {
    console.warn("EXIF GPS extraction failed:", e);
  }
  return null;
};

export default function ImageAdd() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { uuid, phone, customerName, API_BASE } = location.state || {};

  const [image, setImage]     = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);
  const fileInputRef          = useRef();

  /* ── Location ─────────────────────────────────────────────────── */
  const [gps, setGps]               = useState(null);   // { lat, lng }
  const [address, setAddress]       = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError]     = useState("");
  /* NEW: track GPS source */
  const [gpsSource, setGpsSource]   = useState("live"); // "live" | "exif"
  const exifFromFileRef             = useRef(false);
  const watchIdRef                  = useRef(null);

  // Reverse-geocode with Nominatim (free, no key needed)
  const reverseGeocode = async (lat, lng) => {
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      setAddress(data.display_name || "");
    } catch {
      setAddress("");
    }
  };

  const startLocation = () => {
    if (!navigator.geolocation) { setGpsError("Geolocation not supported."); return; }
    setGpsLoading(true);
    setGpsError("");
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setGps({ lat, lng });
        setGpsLoading(false);
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

  // Start watching location once preview is available —
  // but SKIP if EXIF GPS was already extracted from the file.
  useEffect(() => {
    if (preview) {
      if (!exifFromFileRef.current) {
        startLocation();
      }
    } else {
      stopLocation();
      setGps(null); setAddress(""); setGpsError("");
      setGpsSource("live");
      exifFromFileRef.current = false;
    }
    return stopLocation;
  }, [preview]);

  const fmt = (n) => Number(n).toFixed(6);

  /* ── Source badge config ── */
  const sourceBadgeLabel = gpsSource === "exif" ? "Source: EXIF" : "Source: live";
  const sourceBadgeStyle = gpsSource === "exif"
    ? { background: "#7c3aed", color: "white" }
    : { background: "#0ea5e9", color: "white" };
  const liveBarText   = gpsSource === "exif" ? "Location read from image EXIF data" : "Live location detected";
  const liveBarColor  = gpsSource === "exif" ? "#7c3aed" : "#15803d";
  const liveBarBg     = gpsSource === "exif" ? "#f5f3ff" : "#f0fdf4";
  const liveBarBorder = gpsSource === "exif" ? "#ddd6fe" : "#bbf7d0";

  /* ── Upload ───────────────────────────────────────────────────── */
  const showError = (msg) => { setError(msg); setTimeout(() => setError(""), 4000); };

  /* ── FILE PICKER: try EXIF GPS first, fall back to live GPS ── */
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { showError("Please select a valid image file."); return; }
    setImage(file);

    // Build object URL for preview immediately
    const objectUrl = URL.createObjectURL(file);

    // Attempt EXIF extraction then set preview
    extractExifGps(file).then((exifGps) => {
      if (exifGps) {
        // Found GPS in EXIF — use photo's embedded location
        exifFromFileRef.current = true;
        setGpsSource("exif");
        setGps(exifGps);
        setGpsLoading(false);
        reverseGeocode(exifGps.lat, exifGps.lng);
      } else {
        // No EXIF GPS — useEffect will start browser geolocation
        exifFromFileRef.current = false;
        setGpsSource("live");
      }
      setPreview(objectUrl); // triggers useEffect
    }).catch(() => {
      exifFromFileRef.current = false;
      setGpsSource("live");
      setPreview(objectUrl);
    });
  };

  const handleUpload = useCallback(async () => {
    if (!image) { showError("Please capture or select an image first."); return; }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("image", image);
      formData.append("uuid", uuid);
      if (gps) {
        formData.append("latitude",  gps.lat);
        formData.append("longitude", gps.lng);
        formData.append("address",   address);
      }
      const res  = await fetch(`${API_BASE}/image_capture/api/upload-image/`, {
        method: "POST",
        body:   formData,
      });
      const data = await res.json();
      if (res.ok && data.success) { setSuccess(true); }
      else { showError(data.message || "Upload failed. Please try again."); }
    } catch { showError("Network error. Please try again."); }
    finally  { setLoading(false); }
  }, [image, uuid, API_BASE, gps, address]);

  return (
    <>
      <style>{css}</style>

      <div className="ia-page">
        <div className="ia-card">

          {success ? (
            /* ── SUCCESS ── */
            <div className="ia-success">
              <div className="ia-success-circle">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <p className="ia-success-title">Image Uploaded!</p>
              <p className="ia-success-sub">Your image has been submitted successfully.</p>
            </div>

          ) : (
            <>
              {/* Title */}
              <div className="ia-title-row">
                <span className="ia-cam-emoji">📷</span>
                <h1 className="ia-title">Capture Image</h1>
              </div>
              <p className="ia-subtitle">Take a photo using your camera to verify your identity</p>

              {/* Error */}
              {error && (
                <div className="ia-error">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}

              {/* Preview OR Open Camera button */}
              {preview ? (
                <img src={preview} alt="Captured" className="ia-preview" />
              ) : (
                <button className="ia-open-btn" onClick={() => fileInputRef.current.click()}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  Open Camera &amp; Capture Photo
                </button>
              )}

              {/* Hidden file input */}
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
                style={{ display: "none" }} onChange={handleFileChange} />

              {/* ── Location block (shown once preview exists) ── */}
              {preview && (
                <div className="ia-loc-block">

                  {gpsLoading && (
                    <div className="ia-loc-loading">
                      <span className="ia-spinner" />
                      <span>
                        {gpsSource === "exif"
                          ? "Reading EXIF location from image…"
                          : "Getting your GPS coordinates…"}
                      </span>
                    </div>
                  )}

                  {gpsError && !gpsLoading && (
                    <div className="ia-loc-error">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#dc2626">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                      </svg>
                      {gpsError}
                    </div>
                  )}

                  {gps && !gpsLoading && (
                    <>
                      {/* Lat / Lng / Address lines */}
                      <div className="ia-loc-lines">
                        <div className="ia-loc-row">
                          <span className="ia-loc-label">Latitude:</span>
                          <span className="ia-loc-val">{fmt(gps.lat)}</span>
                        </div>
                        <div className="ia-loc-row">
                          <span className="ia-loc-label">Longitude:</span>
                          <span className="ia-loc-val">{fmt(gps.lng)}</span>
                        </div>
                        {address && (
                          <div className="ia-loc-row ia-loc-addr-row">
                            <span className="ia-loc-label">Location:</span>
                            <span className="ia-loc-addr">{address}</span>
                          </div>
                        )}
                        <div className="ia-loc-source-row">
                          <span className="ia-source-badge" style={sourceBadgeStyle}>
                            {sourceBadgeLabel}
                          </span>
                        </div>
                      </div>

                      {/* Status bar */}
                      <div className="ia-live-bar" style={{ background: liveBarBg, borderTop: `1.5px solid ${liveBarBorder}`, color: liveBarColor }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={liveBarColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        {liveBarText}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Submit & Retake */}
              {preview && (
                <div className="ia-btn-group">
                  <button className="ia-submit-btn" onClick={handleUpload} disabled={loading}>
                    {loading ? (
                      <><span className="ia-spinner ia-spinner-white" />Uploading…</>
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
                  <button className="ia-retake-btn" onClick={() => {
                    setImage(null); setPreview(null);
                    setGpsSource("live"); exifFromFileRef.current = false;
                  }}>
                    Retake Photo
                  </button>
                </div>
              )}

              {/* Location warning — only on idle screen */}
              {!preview && (
                <div className="ia-notice">
                  <div className="ia-notice-head">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="#d97706">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                    <strong>Important: Enable Location Services</strong>
                  </div>
                  <p><strong>Android:</strong> Turn ON GPS and allow location access for your browser (e.g., Chrome).</p>
                  <p><strong>iOS (iPhone/iPad):</strong> Go to Settings → Privacy &amp; Security → Location Services, enable it, and allow Safari to access location.</p>
                  <p><strong>Note:</strong> Keep location active before capturing the image.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────────── */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0;
    font-family: 'Google Sans', sans-serif !important; }

  @keyframes spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes slideIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes popIn   { 0%{transform:scale(0.3);opacity:0} 70%{transform:scale(1.18)} 100%{transform:scale(1);opacity:1} }
  @keyframes fadeUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }

  .ia-page {
    min-height: 100vh;
    min-height: -webkit-fill-available;
    display: flex; align-items: center; justify-content: center;
    padding: 24px 16px;
    background: #0990eb;
  }
  .ia-card {
    background: white; border-radius: 20px;
    padding: 36px 28px 32px; width: 100%; max-width: 420px;
    box-shadow: 0 8px 40px rgba(9,144,235,0.18), 0 2px 8px rgba(0,0,0,0.08);
    display: flex; flex-direction: column; align-items: center; gap: 14px;
    animation: slideIn 0.35s ease both;
    box-sizing: border-box;
  }

  .ia-title-row { display:flex; align-items:center; gap:8px; }
  .ia-cam-emoji { font-size: 26px; }
  .ia-title { font-size:22px; font-weight:700; color:#1a1a2e; letter-spacing:-0.3px; }
  .ia-subtitle { font-size:13px; color:#6b7280; text-align:center; line-height:1.6; margin-top:-4px; }

  .ia-error {
    width:100%; background:#fef2f2; border:1px solid #fecaca;
    border-radius:10px; padding:10px 14px;
    display:flex; align-items:center; gap:8px;
    font-size:13px; font-weight:500; color:#dc2626;
  }

  .ia-preview {
    width:100%; border-radius:14px; border:2px solid #e0e1f0;
    max-height:260px; object-fit:cover;
  }

  .ia-open-btn {
    width:100%; padding:15px;
    background:white; color:#0990eb; border:2px solid #e0e1f0; border-radius:12px;
    font-size:15px; font-weight:600; cursor:pointer;
    display:flex; align-items:center; justify-content:center; gap:8px;
    transition:border-color 0.2s, box-shadow 0.2s, transform 0.15s;
  }
  .ia-open-btn:hover {
    border-color:#0990eb; box-shadow:0 0 0 3px rgba(9,144,235,0.12);
    transform:translateY(-1px);
  }

  .ia-loc-block {
    width:100%; border-radius:14px; overflow:hidden;
    border:1.5px solid #e5e7eb;
    animation: fadeUp 0.35s ease both;
  }
  .ia-loc-loading {
    display:flex; align-items:center; gap:10px; padding:16px;
    font-size:13px; color:#6b7280;
    background: white;
  }
  .ia-loc-error {
    display:flex; align-items:center; gap:8px;
    padding:12px 16px; background:#fef2f2;
    font-size:12px; color:#b91c1c;
  }

  .ia-loc-lines {
    padding: 16px 20px 12px;
    display:flex; flex-direction:column; gap:5px;
    background:white;
  }
  .ia-loc-row {
    display:flex; align-items:flex-start; gap:5px;
    font-size:14px; line-height:1.6;
  }
  .ia-loc-label { font-weight:700; color:#1a1a2e; white-space:nowrap; flex-shrink:0; }
  .ia-loc-val   { font-weight:500; color:#374151; font-variant-numeric:tabular-nums; }
  .ia-loc-addr-row { align-items:flex-start; }
  .ia-loc-addr  { font-weight:500; color:#374151; line-height:1.55; }
  .ia-loc-source-row { display:flex; justify-content:center; margin-top:8px; }
  .ia-source-badge {
    display:inline-block;
    font-size:11.5px; font-weight:700;
    padding:4px 14px; border-radius:20px;
    letter-spacing:0.02em;
  }

  .ia-live-bar {
    display:flex; align-items:center; justify-content:center; gap:7px;
    padding:11px 16px;
    font-size:13.5px; font-weight:600;
  }

  .ia-btn-group { width:100%; display:flex; flex-direction:column; gap:10px; }
  .ia-submit-btn {
    width:100%; padding:15px;
    background:#0990eb;
    color:white; border:none; border-radius:12px;
    font-size:15px; font-weight:600; cursor:pointer;
    display:flex; align-items:center; justify-content:center; gap:7px;
    box-shadow:0 4px 18px rgba(9,144,235,0.4);
    transition:filter 0.18s, transform 0.15s;
  }
  .ia-submit-btn:hover:not(:disabled) { filter:brightness(1.08); transform:translateY(-1px); }
  .ia-submit-btn:active:not(:disabled) { transform:translateY(0); }
  .ia-submit-btn:disabled { opacity:0.6; cursor:not-allowed; }

  .ia-retake-btn {
    width:100%; padding:11px;
    background:none; border:1.5px solid #e0e1f0; border-radius:12px;
    font-size:14px; font-weight:600; color:#6b7280; cursor:pointer;
    transition:border-color 0.2s, color 0.2s;
  }
  .ia-retake-btn:hover { border-color:#0990eb; color:#0990eb; }

  .ia-spinner {
    display:inline-block; width:16px; height:16px;
    border:2px solid rgba(9,144,235,0.25); border-top-color:#0990eb;
    border-radius:50%; animation:spin 0.7s linear infinite; margin-right:6px;
    vertical-align: middle;
  }
  .ia-spinner-white { border-color:rgba(255,255,255,0.3); border-top-color:white; }

  .ia-notice {
    width:100%; background:#fffbeb; border:1px solid #fcd34d;
    border-radius:12px; padding:14px 16px;
    font-size:12px; color:#92400e; line-height:1.7;
  }
  .ia-notice-head {
    display:flex; align-items:center; gap:6px; margin-bottom:8px;
    font-size:13px; font-weight:700; color:#b45309;
  }

  .ia-success {
    display:flex; flex-direction:column; align-items:center; gap:14px;
    animation:fadeUp 0.4s ease both;
  }
  .ia-success-circle {
    width:70px; height:70px; border-radius:50%;
    background:linear-gradient(135deg,#22c55e,#16a34a);
    display:flex; align-items:center; justify-content:center;
    box-shadow:0 6px 20px rgba(34,197,94,0.4);
    animation:popIn 0.5s cubic-bezier(.34,1.56,.64,1) both;
  }
  .ia-success-title { font-size:20px; font-weight:700; color:#1a1a2e; text-align:center; }
  .ia-success-sub   { font-size:14px; color:#6b7280; text-align:center; line-height:1.6; }

  @media (max-width: 480px) {
    .ia-page { padding: 12px; background: #0990eb; }
    .ia-card { padding: 24px 18px 24px; border-radius: 16px; gap: 12px; }
    .ia-title { font-size: 19px; }
    .ia-cam-emoji { font-size: 22px; }
    .ia-preview { max-height: 220px; }
    .ia-open-btn { padding: 14px; font-size: 14px; }
    .ia-submit-btn { padding: 14px; font-size: 14px; min-height: 48px; }
    .ia-retake-btn { padding: 12px; min-height: 44px; }
    .ia-loc-lines { padding: 12px 14px 10px; }
    .ia-loc-row { font-size: 13px; }
    .ia-notice { font-size: 11.5px; padding: 12px 14px; }
    .ia-notice-head { font-size: 12px; }
  }
  @media (max-width: 360px) {
    .ia-card { padding: 20px 14px 20px; }
    .ia-title { font-size: 17px; }
    .ia-subtitle { font-size: 12px; }
  }`;