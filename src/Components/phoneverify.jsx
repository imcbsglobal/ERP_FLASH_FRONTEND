import { useState } from "react";

const ShieldIcon = () => (
  <svg width="48" height="56" viewBox="0 0 48 56" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M24 0L0 10V28C0 41.25 10.32 53.74 24 56C37.68 53.74 48 41.25 48 28V10L24 0Z"
      fill="#2563EB"
    />
    <path
      d="M24 4L4 13V28C4 39.6 12.88 50.52 24 52.9C35.12 50.52 44 39.6 44 28V13L24 4Z"
      fill="#3B82F6"
    />
  </svg>
);

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z"/>
    <path d="M12 14C6.47715 14 2 17.134 2 21V22H22V21C22 17.134 17.5228 14 12 14Z"/>
  </svg>
);

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);

const LockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="#9CA3AF" strokeWidth="1.5"/>
    <path d="M12 8v4M12 16h.01" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export default function PhoneVerification({ onBack, onVerified }) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!phone.trim()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    setSent(true);
  };

  const handleProceed = () => {
    if (onVerified) onVerified(phone);
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Back button */}
        {onBack && (
          <button onClick={onBack} style={styles.backBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back
          </button>
        )}
        {/* Shield Icon */}
        <div style={styles.iconWrapper}>
          <ShieldIcon />
        </div>

        {/* Title */}
        <h1 style={styles.title}>Phone Verification</h1>
        <p style={styles.subtitle}>
          Enter your phone number to receive an OTP via WhatsApp
        </p>

        {/* User Badge */}
        <div style={styles.userBadge}>
          <UserIcon />
          <span style={styles.userText}>Demo Customer</span>
        </div>

        {/* Phone Input */}
        <div style={styles.inputWrapper}>
          <input
            type="tel"
            placeholder="Enter your phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={styles.input}
            onFocus={(e) => {
              e.target.style.borderColor = "#2563EB";
              e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.12)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#E5E7EB";
              e.target.style.boxShadow = "none";
            }}
          />
        </div>

        {/* Send OTP Button */}
        <button
          onClick={handleSend}
          disabled={loading || sent}
          style={{
            ...styles.button,
            opacity: loading || (!phone.trim()) ? 0.85 : 1,
            cursor: loading || (!phone.trim()) ? "not-allowed" : "pointer",
          }}
          onMouseEnter={(e) => {
            if (!loading && phone.trim()) {
              e.target.style.background = "#1D4ED8";
              e.target.style.transform = "translateY(-1px)";
              e.target.style.boxShadow = "0 6px 20px rgba(37,99,235,0.4)";
            }
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "#2563EB";
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "0 4px 14px rgba(37,99,235,0.3)";
          }}
        >
          <span style={styles.buttonInner}>
            {loading ? (
              <span style={styles.spinner} />
            ) : sent ? (
              "✓ OTP Sent!"
            ) : (
              <>
                <SendIcon />
                <span>Send OTP</span>
              </>
            )}
          </span>
        </button>

        {/* Security Note */}
        <div style={styles.securityNote}>
          <LockIcon />
          <span style={styles.securityText}>Your information is secure and encrypted</span>
        </div>

        {/* Proceed button — shown only after OTP is sent */}
        {sent && onVerified && (
          <button
            onClick={handleProceed}
            style={styles.proceedButton}
            onMouseEnter={(e) => {
              e.target.style.background = "#15803d";
              e.target.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "#16a34a";
              e.target.style.transform = "translateY(0)";
            }}
          >
            Proceed to OTP Verification →
          </button>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#EFF2F7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
    padding: "24px",
  },
  card: {
    background: "#FFFFFF",
    borderRadius: "20px",
    padding: "44px 40px 36px",
    width: "100%",
    maxWidth: "420px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
    animation: "fadeIn 0.45s ease both",
  },
  iconWrapper: {
    marginBottom: "22px",
  },
  title: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#2563EB",
    margin: "0 0 8px 0",
    textAlign: "center",
    letterSpacing: "-0.3px",
  },
  subtitle: {
    fontSize: "13.5px",
    color: "#6B7280",
    margin: "0 0 24px 0",
    textAlign: "center",
    lineHeight: "1.5",
  },
  userBadge: {
    width: "100%",
    background: "#2563EB",
    borderRadius: "10px",
    padding: "14px 18px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "12px",
    boxSizing: "border-box",
  },
  userText: {
    color: "#FFFFFF",
    fontSize: "14px",
    fontWeight: "600",
    letterSpacing: "0.1px",
  },
  inputWrapper: {
    width: "100%",
    marginBottom: "12px",
    boxSizing: "border-box",
  },
  input: {
    width: "100%",
    padding: "13px 16px",
    border: "1.5px solid #E5E7EB",
    borderRadius: "10px",
    fontSize: "14px",
    color: "#374151",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxSizing: "border-box",
    background: "#FAFAFA",
  },
  button: {
    width: "100%",
    padding: "14px 18px",
    background: "#2563EB",
    border: "none",
    borderRadius: "10px",
    color: "#FFFFFF",
    fontSize: "15px",
    fontWeight: "600",
    transition: "background 0.2s, transform 0.15s, box-shadow 0.2s",
    boxShadow: "0 4px 14px rgba(37,99,235,0.3)",
    marginBottom: "16px",
    boxSizing: "border-box",
  },
  buttonInner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    pointerEvents: "none",
  },
  spinner: {
    display: "inline-block",
    width: "16px",
    height: "16px",
    border: "2px solid rgba(255,255,255,0.4)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
  },
  securityNote: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  securityText: {
    fontSize: "12px",
    color: "#9CA3AF",
  },
  backBtn: {
    alignSelf: "flex-start",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    background: "none",
    border: "none",
    color: "#2563EB",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    padding: "0 0 12px 0",
  },
  proceedButton: {
    width: "100%",
    marginTop: "12px",
    padding: "13px 18px",
    background: "#16a34a",
    border: "none",
    borderRadius: "10px",
    color: "#FFFFFF",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background 0.2s, transform 0.15s",
    boxShadow: "0 4px 14px rgba(22,163,74,0.3)",
    boxSizing: "border-box",
  },
};