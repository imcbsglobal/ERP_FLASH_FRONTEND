import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PhoneVerification from "./phoneverify";
import { getCaptureLinkByUuid } from "../service/Api";

export default function PhoneVerifyWrapper() {
  const { uuid } = useParams();
  const [loading,  setLoading]  = useState(true);
  const [expired,  setExpired]  = useState(false);
  const [error,    setError]    = useState(null);
  const [linkData, setLinkData] = useState(null);

  useEffect(() => {
    const fetchLinkData = async () => {
      if (!uuid) {
        setError("Invalid link — no UUID provided.");
        setLoading(false);
        return;
      }
      try {
        const data = await getCaptureLinkByUuid(uuid);
        setLinkData(data);
      } catch (err) {
        if (err._status === 410) {
          setExpired(true);
        } else {
          setError(err.message || "Failed to load verification link.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchLinkData();
  }, [uuid]);

  if (loading) {
    return (
      <>
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
        <div style={s.page}>
          <div style={s.card}>
            <div style={s.spinner} />
            <p style={s.sub}>Loading verification link…</p>
          </div>
        </div>
      </>
    );
  }

  if (expired) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.iconWrap}>⏰</div>
          <h2 style={s.title}>Link Expired</h2>
          <p style={s.body}>
            This verification link has expired. Links are only valid for{" "}
            <strong>10 minutes</strong> after they are created.
          </p>
          <p style={s.body}>
            Please ask the staff to generate a new link for you.
          </p>
          <div style={s.badge}>Link is no longer valid</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.iconWrap}>⚠️</div>
          <h2 style={{ ...s.title, color: "#DC2626" }}>Link Error</h2>
          <p style={s.body}>{error}</p>
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

const s = {
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
    padding: "44px 40px 36px",
    width: "100%",
    maxWidth: "420px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
    boxSizing: "border-box",
    textAlign: "center",
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
  iconWrap: {
    fontSize: "56px",
    marginBottom: "20px",
    lineHeight: 1,
  },
  title: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#111827",
    margin: "0 0 14px 0",
  },
  body: {
    fontSize: "14px",
    color: "#6B7280",
    lineHeight: "1.7",
    margin: "0 0 10px 0",
  },
  sub: {
    fontSize: "14px",
    color: "#6B7280",
    margin: 0,
  },
  badge: {
    marginTop: "20px",
    padding: "8px 20px",
    borderRadius: "20px",
    background: "#FEF2F2",
    color: "#DC2626",
    fontSize: "13px",
    fontWeight: "600",
    border: "1px solid #FECACA",
  },
};
