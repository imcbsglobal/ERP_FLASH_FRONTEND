import React, { useState, useEffect } from 'react';
import './Licensing.scss';
import { Lock, ExternalLink } from 'lucide-react';
import imcLogo from '../assets/imclogo_new.jpeg';

const LICENSE_API_ENDPOINT = 'https://activate.imcbs.com/mobileapp/api/project/flasherp/';


const CURRENT_CLIENT_ID = "UV8FT8AALK7KL"; // FLASH INNOVATIONS
const CUSTOMER_LABEL = "FLASH INNOVATIONS";
const POLL_INTERVAL = 3000;

const DEFAULT_LICENSE_DATA = {
  "success": true,
  "project_name": "Flash ERP",
  "customers": [
    {
      "customer_name": "FLASH  INNOVATIONS",
      "client_id": "UV8FT8AALK7KL",
      "license_key": "3IQZ-41MY-THVJ-IGDX",
      "package": "FLASHERP",
      "modules": [{ "module_name": "FLASHERP", "module_code": "MOD072" }],
      "license_summary": { "registered_devices": 0, "max_devices": 0 },
      "license_validity": { "expiry_date": "2027-06-22", "remaining_days": 364, "is_expired": false },
      "registered_devices": [],
      "status": "Active"
    }
  ]
};

// ───────────────────────── Occult sigil ─────────────────────────
const Sigil = () => (
  <svg className="lg-sigil" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="lg-bloodglow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3.5" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>

    <g className="lg-ring-slow" filter="url(#lg-bloodglow)" stroke="#ff2d2d" strokeWidth="1.5" fill="none">
      <circle cx="100" cy="100" r="92" opacity="0.55" />
      <circle cx="100" cy="100" r="78" opacity="0.35" />
    </g>

    <g className="lg-ring-rev" filter="url(#lg-bloodglow)" stroke="#ff4a4a" strokeWidth="2" fill="none">
      {/* pentagram */}
      <path d="M100 26 L123 152 L24 74 L176 74 L77 152 Z" opacity="0.9" />
      <circle cx="100" cy="100" r="64" opacity="0.5" />
    </g>

    {/* rune ticks around the circle */}
    <g className="lg-ring-slow" stroke="#ff6a6a" strokeWidth="2" opacity="0.6">
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const x1 = 100 + Math.cos(a) * 84, y1 = 100 + Math.sin(a) * 84;
        const x2 = 100 + Math.cos(a) * 92, y2 = 100 + Math.sin(a) * 92;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
      })}
    </g>

    <circle className="lg-core" cx="100" cy="100" r="9" fill="#ff2d2d" />
  </svg>
);

const Embers = () => (
  <div className="lg-embers">
    {Array.from({ length: 14 }).map((_, i) => <span key={i} />)}
  </div>
);

// ───────────────────────── Blocking screen ─────────────────────────
const BlockShell = ({ statusCode, headline, message, customer, onRefresh, showButton }) => (
  <div className="lg-overlay">
    <div className="lg-smoke" />
    <Embers />
    <div className="lg-flicker" />
    <div className="lg-vignette" />

    <div className="lg-hud lg-hud-tl">RITE {statusCode}</div>
    <div className="lg-hud lg-hud-tr">SANCTUM — IMCBS</div>
    <div className="lg-hud lg-hud-bl">SEAL BROKEN</div>
    <div className="lg-hud lg-hud-br">✦ ✦ ✦</div>

    <div className="lg-stage">
      <div className="lg-statusline">
        <span className="lg-dot" /> THE SEAL IS BROKEN — ENTRY FORBIDDEN
      </div>

      <Sigil />

      <h1 className="lg-glitch" data-text={headline}>{headline}</h1>
      <p className="lg-sub">{message}</p>

      {customer && (
        <div className="lg-panel">
          <span className="lg-drip lg-drip-1" />
          <span className="lg-drip lg-drip-2" />
          <span className="lg-drip lg-drip-3" />
          <div className="lg-row">
            <span className="lg-label">CUSTOMER</span>
            <span className="lg-value">{customer.customer_name}</span>
          </div>
          <div className="lg-row">
            <span className="lg-label">LICENSE KEY</span>
            <span className="lg-value lg-mono">{customer.license_key}</span>
          </div>
          <div className="lg-row">
            <span className="lg-label">STATUS</span>
            <span className="lg-value lg-pill">{customer.status}</span>
          </div>
          {customer.license_validity?.expiry_date && (
            <div className="lg-row">
              <span className="lg-label">EXPIRY DATE</span>
              <span className="lg-value">{customer.license_validity.expiry_date}</span>
            </div>
          )}
          {customer.license_validity?.remaining_days !== null &&
            customer.license_validity?.remaining_days !== undefined && (
            <div className="lg-row">
              <span className="lg-label">REMAINING DAYS</span>
              <span className="lg-value">{customer.license_validity.remaining_days}</span>
            </div>
          )}
        </div>
      )}

      {showButton && <button onClick={onRefresh} className="lg-cta">Retry Connection</button>}

      <div className="lg-provider">
        <span className="lg-provider-label">System Provided By</span>
        <a href="https://imcbs.com" target="_blank" rel="noopener noreferrer" className="lg-provider-card">
          <span className="lg-logo-box">
            <img src={imcLogo} alt="IMCBS Logo" />
          </span>
          <span className="lg-provider-meta">
            <span className="lg-provider-name">IMCBS</span>
            <span className="lg-provider-link">Visit Website <ExternalLink size={12} /></span>
          </span>
        </a>
      </div>

      <div className="lg-secure">
        <Lock size={13} />
        <span>Secure License Management System</span>
      </div>
    </div>
  </div>
);

const Licensing = ({ children }) => {
  const [licenseData, setLicenseData] = useState(null);
  const [error, setError] = useState(null);
  const [forceRefreshCount, setForceRefreshCount] = useState(0);

  const fetchLicenseData = async () => {
    try {
      const response = await fetch(LICENSE_API_ENDPOINT, {
        method: 'GET',
        mode: 'cors',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`API returned ${response.status}: ${response.statusText}`);
      const data = await response.json();
      setLicenseData(data);
      setError(null);
    } catch (err) {
      setLicenseData(DEFAULT_LICENSE_DATA);
      setError(err.message);
    }
  };

  const handleManualRefresh = () => {
    setForceRefreshCount(prev => prev + 1);
    fetchLicenseData();
  };

  useEffect(() => {
    fetchLicenseData();
    const pollInterval = setInterval(fetchLicenseData, POLL_INTERVAL);
    return () => clearInterval(pollInterval);
  }, [forceRefreshCount]);

  // First check still resolving -> show app silently. NO loading screen.
  if (!licenseData) {
    return children;
  }

  const customer = licenseData?.customers?.find(c => c.client_id === CURRENT_CLIENT_ID);

  if (!customer || customer.client_id !== CURRENT_CLIENT_ID) {
    return (
      <BlockShell
        statusCode="ERR 403"
        headline="ACCESS DENIED"
        message={`This application is licensed for ${CUSTOMER_LABEL} only. Please contact support@imcbs.com.`}
        customer={null}
        onRefresh={handleManualRefresh}
        showButton={false}
      />
    );
  }

  const isExpired = customer.license_validity.is_expired === true;
  const status = (customer.status || "").toLowerCase().trim();
  const isActive = status === "active";

  if (isExpired || !isActive) {
    const statusCode = isExpired ? "ERR 410" : "ERR 423";
    const headline = isExpired ? "LICENSE EXPIRED" : "LICENSE INACTIVE";
    const message = isExpired
      ? "Your application license has expired. Please renew your subscription to continue."
      : "Your application license is currently inactive. Please contact your system administrator to activate it.";

    return (
      <BlockShell
        statusCode={statusCode}
        headline={headline}
        message={message}
        customer={customer}
        onRefresh={handleManualRefresh}
        showButton={false}
      />
    );
  }

  return children;
};

export default Licensing;