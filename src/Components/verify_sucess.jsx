import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";

/* ─────────────────────────────────────────────
   Inline Leaflet map — same tile + marker style
   as Image_capture.jsx LeafletMap
───────────────────────────────────────────── */
function VerifyMap({ lat, lng }) {
  const mapRef      = useRef(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    /* inject Leaflet CSS once */
    if (!document.getElementById("leaflet-css")) {
      const link = Object.assign(document.createElement("link"), {
        id: "leaflet-css", rel: "stylesheet",
        href: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css",
      });
      document.head.appendChild(link);
    }
    /* pulse keyframe */
    if (!document.getElementById("vm-pulse-style")) {
      const s = document.createElement("style");
      s.id = "vm-pulse-style";
      s.textContent = `@keyframes vm-pulse{0%{transform:scale(0.4);opacity:.8}70%{transform:scale(1.8);opacity:0}100%{transform:scale(.4);opacity:0}}`;
      document.head.appendChild(s);
    }

    const initMap = () => {
      if (!mapRef.current || instanceRef.current) return;
      const L   = window.L;
      const map = L.map(mapRef.current, {
        zoomControl: false, scrollWheelZoom: false,
        attributionControl: false, dragging: true,
      }).setView([lat, lng], 16);

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        { maxZoom: 19, subdomains: "abcd" }
      ).addTo(map);

      L.control.attribution({ position: "bottomleft", prefix: false })
        .addAttribution('© <a href="https://www.openstreetmap.org/copyright" style="color:#0990eb">OSM</a>')
        .addTo(map);

      /* accuracy circle */
      L.circle([lat, lng], {
        radius: 40, color: "#4285F4", fillColor: "#4285F4",
        fillOpacity: 0.15, weight: 1.5, opacity: 0.6,
      }).addTo(map);

      /* dot marker with pulse ring */
      const dotIcon = L.divIcon({
        className: "",
        html: `<div style="position:relative;width:22px;height:22px;">
          <div style="position:absolute;inset:0;background:#4285F4;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(66,133,244,0.6);"></div>
          <div style="position:absolute;top:50%;left:50%;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(66,133,244,0.18);animation:vm-pulse 2s ease-out infinite;"></div>
        </div>`,
        iconSize: [22, 22], iconAnchor: [11, 11],
      });
      L.marker([lat, lng], { icon: dotIcon }).addTo(map);

      /* wire up custom control buttons */
      const btn = (id) => document.getElementById(id);
      if (btn("vm-zoom-in"))  btn("vm-zoom-in").onclick  = () => map.setZoom(map.getZoom() + 1);
      if (btn("vm-zoom-out")) btn("vm-zoom-out").onclick = () => map.setZoom(map.getZoom() - 1);
      if (btn("vm-recenter")) btn("vm-recenter").onclick = () => map.flyTo([lat, lng], 16, { duration: 0.8 });

      instanceRef.current = map;
    };

    if (window.L) { initMap(); }
    else {
      const script = document.createElement("script");
      script.src   = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
      script.onload = initMap;
      document.head.appendChild(script);
    }

    return () => {
      if (instanceRef.current) { instanceRef.current.remove(); instanceRef.current = null; }
    };
  }, [lat, lng]);

  const ctrlBtn = (id, children, extra = {}) => (
    <button id={id} style={{
      width:32, height:32, background:"white", border:"none", cursor:"pointer",
      display:"flex", alignItems:"center", justifyContent:"center",
      boxShadow:"0 2px 6px rgba(0,0,0,0.28)", ...extra,
    }}>{children}</button>
  );

  return (
    <div style={{ position:"relative", width:"100%", overflow:"hidden", borderRadius:"11px 11px 0 0" }}>
      {/* Map canvas */}
      <div ref={mapRef} style={{ width:"100%", height:"220px", background:"#e8f4f8" }} />

      {/* Controls */}
      <div style={{ position:"absolute", right:10, bottom:12, zIndex:1000, display:"flex", flexDirection:"column", gap:2 }}>
        {ctrlBtn("vm-recenter",
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3.5" fill="#4285F4"/>
            <circle cx="12" cy="12" r="3.5" stroke="white" strokeWidth="1.5" fill="none"/>
            <line x1="12" y1="2"  x2="12" y2="6"  stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/>
            <line x1="12" y1="18" x2="12" y2="22" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/>
            <line x1="2"  y1="12" x2="6"  y2="12" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/>
            <line x1="18" y1="12" x2="22" y2="12" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/>
          </svg>,
          { borderRadius:4, marginBottom:6 }
        )}
        {ctrlBtn("vm-zoom-in",  <span style={{fontSize:22,color:"#555",lineHeight:1}}>+</span>,  { borderRadius:"4px 4px 0 0", borderBottom:"1px solid #e0e0e0" })}
        {ctrlBtn("vm-zoom-out", <span style={{fontSize:26,fontWeight:300,color:"#555",lineHeight:.9}}>−</span>, { borderRadius:"0 0 4px 4px" })}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   VERIFICATION SUCCESS PAGE
═══════════════════════════════════════════════════════════════ */
export default function VerificationSuccess({ overrideState }) {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    customerName,
    phone,
    preview,
    address,
    lat,
    lng,
    verifiedAt,
    fileName,
    fileSize,
    gpsSource,
  } = overrideState || location.state || {};

  useEffect(() => {
    console.log("VerificationSuccess mounted with:", {
      customerName, phone, hasPreview: !!preview,
      address, lat, lng, verifiedAt, fileName, fileSize, gpsSource,
    });
  }, []);

  /* helpers */
  const formatDate = (raw) => {
    const d = raw ? new Date(raw) : new Date();
    const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${M[d.getMonth()]} ${String(d.getDate()).padStart(2,"0")}, ${d.getFullYear()} - ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
  };

  const formatSize = (b) => {
    if (!b && b !== 0) return null;
    if (b < 1024)    return `${b} B`;
    if (b < 1048576) return `${(b/1024).toFixed(1)} KB`;
    return `${(b/1048576).toFixed(2)} MB`;
  };

  const hasLocation  = !!(lat && lng);
  const fLat         = hasLocation ? Number(lat).toFixed(6) : null;
  const fLng         = hasLocation ? Number(lng).toFixed(6) : null;
  const mapsUrl      = hasLocation ? `https://www.google.com/maps?q=${lat},${lng}&z=15` : null;
  const osmUrl       = hasLocation ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}` : null;

  const isExif         = gpsSource === "exif";
  const srcBadgeBg     = isExif ? "#7c3aed"  : "#0ea5e9";
  const srcBadgeLabel  = isExif ? "📌 EXIF GPS" : "📡 Live GPS";
  const barColor       = isExif ? "#7c3aed"  : "#16a34a";
  const barBg          = isExif ? "#f5f3ff"  : "#f0fdf4";
  const barBorder      = isExif ? "#ddd6fe"  : "#bbf7d0";
  const barLabel       = isExif
    ? "Location read from image EXIF data"
    : "Live location captured at submission";

  /* ── Fallback ── */
  if (!customerName && !phone && !preview) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&display=swap');
          *{font-family:'Google Sans',sans-serif!important;}
          .ep{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#fff;}
          .ec{background:#fff;border-radius:20px;padding:40px;max-width:460px;text-align:center;box-shadow:0 8px 40px rgba(0,0,0,.1);}
          .eb{margin-top:24px;padding:12px 24px;background:#0990eb;color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:600;}
        `}</style>
        <div className="ep"><div className="ec">
          <div style={{fontSize:48,marginBottom:16}}>⚠️</div>
          <h2 style={{marginBottom:12}}>No Verification Data</h2>
          <p style={{color:"#6b7280",marginBottom:24}}>Please complete the image capture process first.</p>
          <button className="eb" onClick={() => navigate(-1)}>Go Back</button>
        </div></div>
      </>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;font-family:'Google Sans',sans-serif!important;}
        @keyframes slideIn{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes popIn  {0%{transform:scale(.3);opacity:0}70%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
        @keyframes fadeUp {from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}

        .vs-page{min-height:100vh;min-height:-webkit-fill-available;display:flex;align-items:center;justify-content:center;padding:16px;background:#fff;}
        .vs-card{background:#fff;border-radius:20px;padding:36px 32px 28px;width:100%;max-width:460px;box-shadow:0 12px 48px rgba(0,0,0,.14);display:flex;flex-direction:column;align-items:center;animation:slideIn .35s ease both;box-sizing:border-box;}

        .vs-check{width:68px;height:68px;border-radius:50%;background:#0990eb;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 20px rgba(9,144,235,.45);margin-bottom:18px;animation:popIn .5s cubic-bezier(.34,1.56,.64,1) both;}
        .vs-title{font-size:22px;font-weight:700;color:#0990eb;margin-bottom:8px;text-align:center;}
        .vs-subtitle{font-size:13px;color:#6b7280;text-align:center;line-height:1.65;margin-bottom:22px;max-width:320px;}

        .vs-thumb-wrap{width:160px;height:130px;border-radius:14px;border:2.5px solid #2eb85c;overflow:hidden;margin-bottom:26px;animation:fadeUp .4s .15s ease both;background:#f3f4f6;display:flex;align-items:center;justify-content:center;}
        .vs-thumb-wrap img{width:100%;height:100%;object-fit:cover;}
        .vs-thumb-ph{font-size:36px;}

        .vs-rows{width:100%;display:flex;flex-direction:column;animation:fadeUp .4s .2s ease both;}
        .vs-row{display:flex;align-items:flex-start;gap:14px;padding:14px 0;border-bottom:1px solid #f0f0f0;}
        .vs-row:last-child{border-bottom:none;}
        .vs-icon{width:38px;height:38px;border-radius:10px;background:#0990eb;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px;}
        .vs-rc{flex:1;}
        .vs-rl{font-size:10px;font-weight:700;letter-spacing:.8px;color:#9ca3af;text-transform:uppercase;margin-bottom:3px;}
        .vs-rv{font-size:15px;font-weight:600;color:#1f2937;word-break:break-word;}

        .vs-fname{font-size:13.5px;font-weight:600;color:#1f2937;word-break:break-all;line-height:1.45;}
        .vs-fmeta{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:5px;}
        .vs-pill{display:inline-block;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:20px;padding:2px 10px;font-size:11.5px;font-weight:600;color:#374151;}

        .loc-badge{display:inline-flex;align-items:center;gap:6px;background:#e6f4ff;border:1.5px solid #7ecbf7;color:#0990eb;font-size:13px;font-weight:700;padding:5px 14px;border-radius:30px;margin-bottom:10px;}
        .loc-dot{width:8px;height:8px;border-radius:50%;background:#0990eb;}
        .loc-box{width:100%;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;display:flex;flex-direction:column;}
        .loc-details{padding:12px 14px;display:flex;flex-direction:column;gap:7px;}
        .loc-addr{display:flex;align-items:flex-start;gap:7px;font-size:13px;font-weight:600;color:#1f2937;line-height:1.5;}
        .loc-coords{display:flex;align-items:center;gap:7px;font-size:11.5px;color:#6b7280;font-weight:500;}
        .loc-src{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;color:#fff;align-self:flex-start;}
        .loc-links{display:flex;border-top:1px solid #e5e7eb;}
        .loc-link{flex:1;display:flex;align-items:center;justify-content:center;gap:5px;padding:8px 6px;font-size:12px;font-weight:600;color:#0990eb;text-decoration:none;background:#f9fafb;transition:background .15s;}
        .loc-link:first-child{border-right:1px solid #e5e7eb;}
        .loc-link:hover{background:#e6f4ff;}
        .loc-bar{display:flex;align-items:center;justify-content:center;gap:7px;padding:9px 14px;border-top:1.5px solid;font-size:12.5px;font-weight:600;}

        @media(max-width:480px){
          .vs-page{align-items:flex-start;padding:12px;}
          .vs-card{padding:24px 16px 20px;border-radius:16px;margin:8px 0;}
          .vs-title{font-size:19px;}
          .vs-subtitle{font-size:12px;margin-bottom:16px;}
          .vs-thumb-wrap{width:130px;height:110px;margin-bottom:18px;}
          .vs-row{padding:11px 0;gap:10px;}
          .vs-icon{width:32px;height:32px;border-radius:8px;}
          .vs-rv{font-size:14px;}
          .loc-addr{font-size:12px;}
          .loc-coords{font-size:11px;}
          .loc-link{font-size:11px;padding:7px 4px;}
        }
        @media(max-width:360px){
          .vs-card{padding:20px 12px 16px;}
          .vs-title{font-size:17px;}
          .vs-rl{font-size:9px;}
          .vs-rv{font-size:13px;}
        }
      `}</style>

      <div className="vs-page">
        <div className="vs-card">

          {/* checkmark */}
          <div className="vs-check">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>

          <p className="vs-title">Verification Successful!</p>
          <p className="vs-subtitle">
            Thank you for completing the verification process. Your information has been successfully recorded.
          </p>

          {/* thumbnail */}
          <div className="vs-thumb-wrap">
            {preview
              ? <img src={preview} alt="Captured verification photo"/>
              : <span className="vs-thumb-ph">📷</span>}
          </div>

          <div className="vs-rows">

            {/* customer name */}
            <div className="vs-row">
              <div className="vs-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                </svg>
              </div>
              <div className="vs-rc">
                <p className="vs-rl">Customer Name</p>
                <p className="vs-rv">{customerName || "—"}</p>
              </div>
            </div>

            {/* phone */}
            <div className="vs-row">
              <div className="vs-icon">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="white">
                  <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C9.61 21 3 14.39 3 6a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.46.57 3.58a1 1 0 0 1-.25 1.01l-2.2 2.2z"/>
                </svg>
              </div>
              <div className="vs-rc">
                <p className="vs-rl">Phone Number</p>
                <p className="vs-rv">{phone || "—"}</p>
              </div>
            </div>

            {/* file info */}
            {(fileName || fileSize) && (
              <div className="vs-row">
                <div className="vs-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="white">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                  </svg>
                </div>
                <div className="vs-rc">
                  <p className="vs-rl">File Info</p>
                  {fileName && <p className="vs-fname">{fileName}</p>}
                  <div className="vs-fmeta">
                    {fileSize && <span className="vs-pill">{formatSize(fileSize)}</span>}
                    <span className="vs-pill">JPEG</span>
                    <span style={{color:"#9ca3af",fontSize:11}}>Uploaded {formatDate(verifiedAt)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* location with embedded map */}
            <div className="vs-row">
              <div className="vs-icon">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
              </div>
              <div className="vs-rc">
                <p className="vs-rl">Location</p>

                {hasLocation ? (
                  <>
                    <div className="loc-badge">
                      <div className="loc-dot"/>
                      Location Detected ✓
                    </div>

                    <div className="loc-box">

                      {/* ── EMBEDDED MAP ── */}
                      <VerifyMap lat={Number(lat)} lng={Number(lng)} />

                      {/* address + coords */}
                      <div className="loc-details">
                        {address && (
                          <div className="loc-addr">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="#0990eb" style={{flexShrink:0,marginTop:2}}>
                              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                            </svg>
                            <span>{address}</span>
                          </div>
                        )}

                        <div className="loc-coords">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="2" y1="12" x2="22" y2="12"/>
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                          </svg>
                          <span>{fLat}° N &nbsp;|&nbsp; {fLng}° E</span>
                        </div>

                        <span className="loc-src" style={{background:srcBadgeBg}}>
                          {srcBadgeLabel}
                        </span>
                      </div>

                      {/* open-in-maps links */}
                      <div className="loc-links">
                        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="loc-link">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                          </svg>
                          Google Maps
                        </a>
                        <a href={osmUrl} target="_blank" rel="noopener noreferrer" className="loc-link">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                            <line x1="8" y1="2" x2="8" y2="18"/>
                            <line x1="16" y1="6" x2="16" y2="22"/>
                          </svg>
                          OpenStreetMap
                        </a>
                      </div>

                      {/* GPS source bar */}
                      <div className="loc-bar"
                        style={{background:barBg, borderTopColor:barBorder, color:barColor}}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                          stroke={barColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        {barLabel}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="vs-rv" style={{color:"#ef4444"}}>⚠️ Location Not Available</p>
                )}
              </div>
            </div>

            {/* verified at */}
            <div className="vs-row">
              <div className="vs-icon">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                  stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div className="vs-rc">
                <p className="vs-rl">Verified At</p>
                <p className="vs-rv">{formatDate(verifiedAt)}</p>
              </div>
            </div>

          </div>{/* end rows */}
        </div>
      </div>
    </>
  );
}