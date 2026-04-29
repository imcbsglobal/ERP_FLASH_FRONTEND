import { useState, useRef, useCallback, useEffect } from "react";

function Spinner() {
  return (
    <span style={{
      display: "inline-block", width: 16, height: 16,
      border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white",
      borderRadius: "50%", animation: "spin 0.7s linear infinite",
      verticalAlign: "middle", marginRight: 6,
    }} />
  );
}

export default function OtpVerification({ phone, uuid, customerName, onVerified, onBack }) {
  const API_BASE = window.location.origin;

  // Changed from 6 to 4 digits
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [timer, setTimer] = useState(30);
  const inputRefs = useRef([]);

  // Changed to 4-digit demo OTP
  const CORRECT_OTP = "1234";

  useEffect(() => {
    // phone is required — caller (ImageCaptureFlow) guarantees it
  }, [uuid, phone]);

  useEffect(() => {
    if (timer <= 0) return;
    const id = setTimeout(() => setTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const showError = (msg) => {
    setError(msg);
    setTimeout(() => setError(""), 4000);
  };

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 3) { // Changed from 5 to 3
      inputRefs.current[index + 1]?.focus();
    }
    // Auto-submit when all 4 digits are filled
    if (next.every(digit => digit !== "") && next.length === 4) {
      setTimeout(() => verifyOtpWithCode(next.join("")), 100);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter") verifyOtp();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4); // Changed to 4
    if (!pasted) return;
    const next = [...otp];
    [...pasted].forEach((ch, i) => {
      if (i < 4) next[i] = ch; // Changed to 4
    });
    setOtp(next);
    const nextFocusIndex = Math.min(pasted.length, 3); // Changed from 5 to 3
    if (nextFocusIndex <= 3) {
      inputRefs.current[nextFocusIndex]?.focus();
    }
    // Auto-submit if all digits are filled
    if (next.every(digit => digit !== "") && next.length === 4) {
      setTimeout(() => verifyOtpWithCode(next.join("")), 100);
    }
  };

  const verifyOtpWithCode = async (code) => {
    if (code.length < 4) return; // Changed from 6 to 4
    
    setLoading(true);
    
    setTimeout(() => {
      if (code === CORRECT_OTP) {
        setSuccess("OTP verified successfully!");
        setTimeout(() => {
          onVerified?.();
        }, 500);
      } else {
        showError("Invalid OTP. Please try again.");
        setOtp(["", "", "", ""]); // Changed to 4 empty strings
        inputRefs.current[0]?.focus();
      }
      setLoading(false);
    }, 800);
  };

  const verifyOtp = useCallback(() => {
    const code = otp.join("");
    verifyOtpWithCode(code);
  }, [otp]);

  const resendOtp = useCallback(async () => {
    if (timer > 0) return;
    setResending(true);
    
    setTimeout(() => {
      setSuccess("OTP resent successfully! (Demo OTP: 1234)");
      setTimer(30);
      setOtp(["", "", "", ""]); // Changed to 4 empty strings
      inputRefs.current[0]?.focus();
      setTimeout(() => setSuccess(""), 3000);
      setResending(false);
    }, 500);
  }, [timer]);

  const maskedPhone = phone
    ? phone.replace(/(\+?\d{1,3}[-\s]?)?(\d{2,3})(\d+)(\d{2})$/, (_, cc, a, b, last) =>
        `${cc || ""}${a}${"*".repeat(b.length)}${last}`)
    : "";

  // phone is provided via props — no guard needed

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after {
          box-sizing: border-box; margin: 0; padding: 0;
          font-family: 'Google Sans', sans-serif !important;
        }
        @keyframes spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes slideIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }

        .otp-input {
          width: 60px; height: 70px;
          border: 2px solid #e0e1f0; border-radius: 12px;
          font-size: 24px; font-weight: 700; color: #1a73e8;
          text-align: center; background: white; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
          caret-color: #1a73e8;
        }
        @media (max-width: 400px) {
          .otp-input { width: 56px; height: 64px; font-size: 22px; border-radius: 10px; }
        }
        @media (max-width: 360px) {
          .otp-input { width: 48px; height: 56px; font-size: 20px; }
        }
        .otp-input:focus {
          border-color: #1a73e8;
          box-shadow: 0 0 0 3px rgba(26,115,232,0.15);
          transform: scale(1.06);
        }
        .otp-input:not(:placeholder-shown) {
          border-color: #1a73e8;
          background: #f0f7ff;
        }

        .verify-btn {
          width: 100%; padding: 15px;
          background: #1a73e8;
          color: white; border: none; border-radius: 12px;
          font-size: 15px; font-weight: 600; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 7px;
          box-shadow: 0 4px 18px rgba(26,115,232,0.4);
          transition: filter 0.18s, transform 0.15s;
        }
        .verify-btn:hover:not(:disabled) { filter: brightness(1.08); transform: translateY(-1px); }
        .verify-btn:active:not(:disabled) { transform: translateY(0); }
        .verify-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .resend-btn {
          background: none; border: none; padding: 0;
          font-size: 13px; font-weight: 600; cursor: pointer;
          transition: color 0.2s;
        }
        .resend-btn:disabled { cursor: default; }
      `}</style>

      <div style={{
        display: "flex", justifyContent: "center", alignItems: "center",
        minHeight: "100vh", minHeight: "-webkit-fill-available",
        background: "#f8f9fa", padding: "16px"
      }}>
        <div style={{
          background: "white", borderRadius: 20,
          padding: "clamp(24px, 5vw, 40px) clamp(20px, 5vw, 36px) 28px",
          width: "100%", maxWidth: 460,
          boxShadow: "0 8px 40px rgba(26,115,232,0.1), 0 2px 8px rgba(0,0,0,0.06)",
          display: "flex", flexDirection: "column", alignItems: "center",
          animation: "slideIn 0.3s ease both",
        }}>

          {/* Back button */}
          {onBack && (
            <div style={{ width: "100%", marginBottom: 8 }}>
              <button onClick={onBack} style={{
                display: "flex", alignItems: "center", gap: 4,
                background: "none", border: "none", color: "#1a73e8",
                fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                Back
              </button>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <svg width="54" height="54" viewBox="0 0 24 24">
              <defs>
                <linearGradient id="otpGrad" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#1a73e8"/>
                  <stop offset="1" stopColor="#1557b0"/>
                </linearGradient>
              </defs>
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.63 3.4 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.82a16 16 0 0 0 6 6l.97-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" fill="url(#otpGrad)"/>
            </svg>
          </div>

          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a73e8", marginBottom: 6, textAlign: "center", letterSpacing: -0.3 }}>
            OTP Verification
          </h1>
          <p style={{ fontSize: 13, color: "#6b7280", textAlign: "center", marginBottom: 4, lineHeight: 1.6 }}>
            We sent a 4-digit code via WhatsApp to
          </p>
          {phone && (
            <p style={{ fontSize: 14, fontWeight: 700, color: "#374151", textAlign: "center", marginBottom: 22 }}>
              {maskedPhone}
            </p>
          )}

          <div style={{
            width: "100%", marginBottom: 16,
            background: "#fef3c7", borderRadius: 12, padding: "10px 16px",
            textAlign: "center", fontSize: 12, color: "#92400e"
          }}>
            Demo Mode: Use OTP <strong>1234</strong>
          </div>

          {customerName && (
            <div style={{
              width: "100%", marginBottom: 16,
              background: "#1a73e8", borderRadius: 12, padding: "12px 16px",
              display: "flex", alignItems: "center", gap: 8, color: "white",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{customerName}</span>
            </div>
          )}

          {error && (
            <div style={{
              width: "100%", marginBottom: 14,
              background: "#fef2f2", border: "1px solid #fecaca",
              borderRadius: 10, padding: "10px 14px",
              display: "flex", alignItems: "center", gap: 8,
              fontSize: 13, fontWeight: 500, color: "#dc2626",
              animation: "fadeIn 0.2s ease both",
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              width: "100%", marginBottom: 14,
              background: "#f0fdf4", border: "1px solid #bbf7d0",
              borderRadius: 10, padding: "10px 14px",
              display: "flex", alignItems: "center", gap: 8,
              fontSize: 13, fontWeight: 500, color: "#15803d",
              animation: "fadeIn 0.2s ease both",
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              {success}
            </div>
          )}

          {/* 4-digit OTP input boxes */}
          <div style={{ display: "flex", gap: 12, marginBottom: 24, justifyContent: "center", flexWrap: "wrap" }}
            onPaste={handlePaste}
          >
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                className="otp-input"
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                placeholder="•"
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={loading}
              />
            ))}
          </div>

          {/* Verify button */}
          <button
            className="verify-btn"
            onClick={verifyOtp}
            disabled={loading || otp.join("").length < 4}
          >
            {loading ? (
              <><Spinner />Verifying...</>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Verify OTP
              </>
            )}
          </button>

          {/* Resend */}
          <div style={{ marginTop: 18, fontSize: 13, color: "#6b7280", textAlign: "center" }}>
            Didn't receive the code?{" "}
            {timer > 0 ? (
              <span style={{ color: "#9ca3af" }}>
                Resend in <strong style={{ color: "#1a73e8" }}>{timer}s</strong>
              </span>
            ) : (
              <button
                className="resend-btn"
                style={{ color: resending ? "#9ca3af" : "#1a73e8" }}
                onClick={resendOtp}
                disabled={resending}
              >
                {resending ? "Resending…" : "Resend OTP"}
              </button>
            )}
          </div>

          {/* Security note */}
          <div style={{
            marginTop: 20, display: "flex", alignItems: "center", justifyContent: "center",
            gap: 6, fontSize: 12, color: "#9ca3af",
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Your information is secure and encrypted
          </div>

        </div>
      </div>
    </>
  );
}