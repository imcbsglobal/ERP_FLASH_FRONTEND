import { useState } from "react";
import OtpVerification from "./Otp_verification";
import ImageCaptureFlow from "./Image_capture"; // Import the ImageCaptureFlow

export default function PhoneVerification({ onBack, onVerified, customerName, prefillPhone, uuid, API_BASE, skipVerification }) {
  const [phone, setPhone] = useState(prefillPhone || "");
  const [showOtp, setShowOtp] = useState(false);
  const [showImageCapture, setShowImageCapture] = useState(false); // New state for image capture
  const [demoMode, setDemoMode] = useState(false); // Track if we're in demo mode

  const handleSend = () => {
    if (!phone.trim()) return;
    
    // Check for demo mode (phone number 1234567890)
    if (phone.trim() === "1234567890") {
      setDemoMode(true);
      // For demo mode, skip OTP and go directly to image capture
      setShowImageCapture(true);
      if (onVerified) {
        onVerified(phone);
      }
    } else {
      setDemoMode(false);
      setShowOtp(true);
    }
  };

  const handleOtpVerified = () => {
    // OTP verified successfully - now show image capture
    setShowOtp(false);
    setShowImageCapture(true);
    
    // Also call onVerified if provided (for parent components)
    if (onVerified) {
      onVerified(phone);
    }
  };

  const handleBackToPhone = () => {
    setShowOtp(false);
  };

  const handleImageCaptureSuccess = (photoData) => {
    // Handle successful image capture if needed
    console.log("Image captured successfully", photoData);
  };

  // Show Image Capture component after OTP verification or demo mode
  if (showImageCapture) {
    return (
      <ImageCaptureFlow
        uuid={uuid}
        phone={phone}
        customerName={customerName}
        API_BASE={API_BASE}
        onSuccess={handleImageCaptureSuccess}
        skipVerification={skipVerification || true} // Skip phone/OTP verification since we already did it
      />
    );
  }

  // Show OTP component
  if (showOtp) {
    return (
      <OtpVerification
        phone={phone}
        uuid={uuid}
        customerName={customerName}
        onVerified={handleOtpVerified}
        onBack={handleBackToPhone}
      />
    );
  }

  // Show phone verification screen
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {onBack && (
          <button onClick={onBack} style={styles.backBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back
          </button>
        )}
        <div style={styles.iconWrapper}>
          <ShieldIcon />
        </div>

        <h1 style={styles.title}>Phone Verification</h1>
        <p style={styles.subtitle}>
          Enter your phone number to receive an OTP via WhatsApp
        </p>

        {/* Demo mode hint */}
        <div style={{
          width: "100%",
          marginBottom: "16px",
          background: "#fef3c7",
          borderRadius: "12px",
          padding: "10px 16px",
          textAlign: "center",
          fontSize: "12px",
          color: "#92400e",
        }}>
          <strong>Demo Mode:</strong> Use phone number <strong>1234567890</strong> to skip OTP verification
        </div>

        <div style={styles.userBadge}>
          <UserIcon />
          <span style={styles.userText}>{customerName || "Customer"}</span>
        </div>

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

        <button
          onClick={handleSend}
          disabled={!phone.trim()}
          style={{
            ...styles.button,
            opacity: !phone.trim() ? 0.6 : 1,
            cursor: !phone.trim() ? "not-allowed" : "pointer",
          }}
          onMouseEnter={(e) => {
            if (phone.trim()) {
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
            <SendIcon />
            <span>Send OTP / Demo Mode</span>
          </span>
        </button>

        <div style={styles.securityNote}>
          <LockIcon />
          <span style={styles.securityText}>Your information is secure and encrypted</span>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// Keep the icon components as they were...
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

const styles = {
  page: {
   
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
    padding: "16px",
    minHeight: "100vh",
    minHeight: "-webkit-fill-available",
    boxSizing: "border-box",
  },
  card: {
    background: "#FFFFFF",
    borderRadius: "20px",
    padding: "clamp(28px, 6vw, 44px) clamp(20px, 6vw, 40px) 32px",
    width: "100%",
    maxWidth: "420px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
    animation: "fadeIn 0.45s ease both",
    boxSizing: "border-box",
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
    marginBottom: "20px",
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
    padding: "15px 18px",
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
    minHeight: "48px",
  },
  buttonInner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    pointerEvents: "none",
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
};