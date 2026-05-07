import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";

export default function VerificationSuccess({ overrideState }) {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    customerName,
    phone,
    preview,        // base64 or object-URL of the captured image
    address,        // reverse-geocoded address string
    lat,
    lng,
    verifiedAt,     // ISO string or Date; falls back to now
  } = overrideState || location.state || {};

  // Debug logging
  useEffect(() => {
    console.log("VerificationSuccess mounted with:", {
      customerName,
      phone,
      hasPreview: !!preview,
      address,
      lat,
      lng,
      verifiedAt,
    });
  }, []);

  /* ── Format timestamp ── */
  const formatDate = (raw) => {
    const d = raw ? new Date(raw) : new Date();
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const mon  = months[d.getMonth()];
    const day  = String(d.getDate()).padStart(2, "0");
    const yr   = d.getFullYear();
    const hh   = String(d.getHours()).padStart(2, "0");
    const mm   = String(d.getMinutes()).padStart(2, "0");
    const ss   = String(d.getSeconds()).padStart(2, "0");
    return `${mon} ${day}, ${yr} - ${hh}:${mm}:${ss}`;
  };

  const hasLocation = lat && lng;

  // Fallback if no data is passed
  if (!customerName && !phone && !preview) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&display=swap');
          * { font-family: 'Google Sans', sans-serif !important; }
          .error-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background: white;
          }
          .error-card {
            background: white;
            border-radius: 20px;
            padding: 40px;
            max-width: 460px;
            text-align: center;
            box-shadow: 0 8px 40px rgba(0,0,0,0.1);
          }
          .error-btn {
            margin-top: 24px;
            padding: 12px 24px;
            background: #0990eb;
            color: white;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-weight: 600;
          }
        `}</style>
        <div className="error-page">
          <div className="error-card">
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ marginBottom: 12 }}>No Verification Data</h2>
            <p style={{ color: "#6b7280", marginBottom: 24 }}>
              Please complete the image capture process first.
            </p>
            <button className="error-btn" onClick={() => navigate(-1)}>
              Go Back
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after {
          box-sizing: border-box; margin: 0; padding: 0;
          font-family: 'Google Sans', sans-serif !important;
        }
        @keyframes slideIn { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes popIn   { 0%{transform:scale(0.3);opacity:0} 70%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }

        .vs-page {
          min-height: 100vh;
          min-height: -webkit-fill-available;
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          background: white;
        }
        .vs-card {
          background: #ffffff;
          border-radius: 20px;
          padding: 36px 32px 28px;
          width: 100%; max-width: 460px;
          box-shadow: 0 12px 48px rgba(0,0,0,0.14);
          display: flex; flex-direction: column; align-items: center;
          animation: slideIn 0.35s ease both;
          box-sizing: border-box;
        }

        /* ── Checkmark circle ── */
        .vs-check {
          width: 68px; height: 68px; border-radius: 50%;
          background: #0990eb;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 6px 20px rgba(9,144,235,0.45);
          margin-bottom: 18px;
          animation: popIn 0.5s cubic-bezier(.34,1.56,.64,1) both;
        }

        /* ── Title block ── */
        .vs-title {
          font-size: 22px; font-weight: 700; color: #0990eb;
          margin-bottom: 8px; text-align: center;
        }
        .vs-subtitle {
          font-size: 13px; color: #6b7280; text-align: center;
          line-height: 1.65; margin-bottom: 22px; max-width: 320px;
        }

        /* ── Captured image thumbnail ── */
        .vs-thumb-wrap {
          width: 160px; height: 130px;
          border-radius: 14px;
          border: 2.5px solid #2eb85c;
          overflow: hidden;
          margin-bottom: 26px;
          animation: fadeUp 0.4s 0.15s ease both;
          background: #f3f4f6;
          display: flex; align-items: center; justify-content: center;
        }
        .vs-thumb-wrap img {
          width: 100%; height: 100%; object-fit: cover;
        }
        .vs-thumb-placeholder {
          font-size: 36px;
        }

        /* ── Info rows ── */
        .vs-rows {
          width: 100%;
          display: flex; flex-direction: column; gap: 0;
          animation: fadeUp 0.4s 0.2s ease both;
        }
        .vs-row {
          display: flex; align-items: flex-start; gap: 14px;
          padding: 14px 0;
          border-bottom: 1px solid #f0f0f0;
        }
        .vs-row:last-child { border-bottom: none; }

        .vs-icon-wrap {
          width: 38px; height: 38px; border-radius: 10px;
          background: #0990eb;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; margin-top: 2px;
        }

        .vs-row-content { flex: 1; }
        .vs-row-label {
          font-size: 10px; font-weight: 700; letter-spacing: 0.8px;
          color: #9ca3af; text-transform: uppercase; margin-bottom: 3px;
        }
        .vs-row-value {
          font-size: 15px; font-weight: 600; color: #1f2937;
          word-break: break-word;
        }

        /* ── Location badge ── */
        .loc-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: #e6f4ff; border: 1.5px solid #7ecbf7;
          color: #0990eb; font-size: 13px; font-weight: 700;
          padding: 5px 14px; border-radius: 30px;
          margin-bottom: 10px;
        }
        .loc-badge-dot {
          width: 8px; height: 8px; border-radius: 50%; background: #0990eb;
        }

        /* ── Location detail box ── */
        .loc-box {
          width: 100%;
          background: #f9fafb; border: 1px solid #e5e7eb;
          border-radius: 10px; padding: 12px 14px;
          display: flex; flex-direction: column; gap: 6px;
        }
        .loc-box-addr {
          display: flex; align-items: flex-start; gap: 7px;
          font-size: 13px; font-weight: 600; color: #1f2937; line-height: 1.5;
        }
        .loc-box-coords {
          display: flex; align-items: center; gap: 7px;
          font-size: 11.5px; color: #6b7280; font-weight: 500;
          letter-spacing: 0.2px;
        }

        /* ── Close button ── */
        .vs-close-btn {
          margin-top: 24px;
          padding: 11px 32px;
          background: #f3f4f6; border: none; border-radius: 10px;
          font-size: 14px; font-weight: 600; color: #374151;
          cursor: pointer; display: flex; align-items: center; gap: 7px;
          transition: background 0.18s, transform 0.15s;
          animation: fadeUp 0.4s 0.3s ease both;
          min-height: 46px;
        }
        .vs-close-btn:hover { background: #e5e7eb; transform: translateY(-1px); }
        .vs-close-btn:active { transform: translateY(0); }

        @media (max-width: 480px) {
          .vs-page { align-items: flex-start; padding: 12px; }
          .vs-card { padding: 24px 16px 20px; border-radius: 16px; margin-top: 8px; margin-bottom: 8px; }
          .vs-title { font-size: 19px; }
          .vs-subtitle { font-size: 12px; margin-bottom: 16px; }
          .vs-thumb-wrap { width: 130px; height: 110px; margin-bottom: 18px; }
          .vs-row { padding: 11px 0; gap: 10px; }
          .vs-icon-wrap { width: 32px; height: 32px; border-radius: 8px; }
          .vs-row-value { font-size: 14px; }
          .vs-close-btn { width: 100%; justify-content: center; padding: 13px 24px; }
          .loc-box { padding: 10px 12px; }
          .loc-box-addr { font-size: 12px; }
          .loc-box-coords { font-size: 11px; }
        }
        @media (max-width: 360px) {
          .vs-card { padding: 20px 12px 16px; }
          .vs-title { font-size: 17px; }
          .vs-row-label { font-size: 9px; }
          .vs-row-value { font-size: 13px; }
        }
      `}</style>

      <div className="vs-page">
        <div className="vs-card">

          {/* ── Checkmark ── */}
          <div className="vs-check">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>

          {/* ── Title ── */}
          <p className="vs-title">Verification Successful!</p>
          <p className="vs-subtitle">
            Thank you for completing the verification process. Your information has been successfully recorded.
          </p>

          {/* ── Thumbnail ── */}
          <div className="vs-thumb-wrap">
            {preview
              ? <img src={preview} alt="Captured verification photo" />
              : <span className="vs-thumb-placeholder">📷</span>
            }
          </div>

          {/* ── Info rows ── */}
          <div className="vs-rows">

            {/* Customer Name */}
            <div className="vs-row">
              <div className="vs-icon-wrap">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                </svg>
              </div>
              <div className="vs-row-content">
                <p className="vs-row-label">Customer Name</p>
                <p className="vs-row-value">{customerName || "—"}</p>
              </div>
            </div>

            {/* Phone Number */}
            <div className="vs-row">
              <div className="vs-icon-wrap">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="white">
                  <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C9.61 21 3 14.39 3 6a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.46.57 3.58a1 1 0 0 1-.25 1.01l-2.2 2.2z"/>
                </svg>
              </div>
              <div className="vs-row-content">
                <p className="vs-row-label">Phone Number</p>
                <p className="vs-row-value">{phone || "—"}</p>
              </div>
            </div>

            {/* Location Status */}
            <div className="vs-row">
              <div className="vs-icon-wrap">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
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
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="#0990eb" style={{ flexShrink:0, marginTop:2 }}>
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                          </svg>
                          <span>{address}</span>
                        </div>
                      )}
                      <div className="loc-box-coords">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="2" y1="12" x2="22" y2="12"/>
                          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                        </svg>
                        <span>Lat: {lat} | Lng: {lng}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="vs-row-value" style={{ color: "#ef4444" }}>
                    ⚠️ Location Not Available
                  </p>
                )}
              </div>
            </div>

            {/* Verified At */}
            <div className="vs-row">
              <div className="vs-icon-wrap">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                  stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div className="vs-row-content">
                <p className="vs-row-label">Verified At</p>
                <p className="vs-row-value">{formatDate(verifiedAt)}</p>
              </div>
            </div>

          </div>{/* end rows */}

          
          

        </div>
      </div>
    </>
  );
}