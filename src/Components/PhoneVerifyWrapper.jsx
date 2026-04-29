import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PhoneVerification from "./phoneverify";
import { getCaptureLinkByUuid } from "../service/Api";

export default function PhoneVerifyWrapper() {
  const { uuid } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [linkData, setLinkData] = useState(null);

  useEffect(() => {
    const fetchLinkData = async () => {
      if (!uuid) {
        setError("Invalid link - no UUID provided");
        setLoading(false);
        return;
      }

      try {
        const data = await getCaptureLinkByUuid(uuid);
        setLinkData(data);
      } catch (err) {
        console.error("Error fetching link data:", err);
        setError(err.message || "Failed to load verification link. The link may have expired.");
      } finally {
        setLoading(false);
      }
    };

    fetchLinkData();
  }, [uuid]);

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Loading verification link...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.errorIcon}>⚠️</div>
          <h2 style={styles.errorTitle}>Link Error</h2>
          <p style={styles.errorText}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <PhoneVerification
      uuid={uuid}
      customerName={linkData?.customer_name || "Customer"}
      prefillPhone={linkData?.phone || ""}
    />
  );
}

const styles = {
  page: {
    background: "#EFF2F7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
    padding: "16px",
    minHeight: "100vh",
    boxSizing: "border-box",
  },
  card: {
    background: "#FFFFFF",
    borderRadius: "20px",
    padding: "44px 40px 32px",
    width: "100%",
    maxWidth: "420px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
    boxSizing: "border-box",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #E5E7EB",
    borderTop: "4px solid #2563EB",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    marginBottom: "16px",
  },
  loadingText: {
    fontSize: "14px",
    color: "#6B7280",
    margin: 0,
  },
  errorIcon: {
    fontSize: "48px",
    marginBottom: "16px",
  },
  errorTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#DC2626",
    margin: "0 0 12px 0",
    textAlign: "center",
  },
  errorText: {
    fontSize: "14px",
    color: "#6B7280",
    textAlign: "center",
    lineHeight: "1.6",
    margin: 0,
  },
};
