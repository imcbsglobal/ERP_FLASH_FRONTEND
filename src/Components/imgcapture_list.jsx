import React, { useState, useEffect, useCallback } from 'react';
import ImageCaptureLinkGenerator from './Image_link';
import ImageCaptureFlow from './Image_capture';
import { getAllCaptures, updateCaptureManualStatus, deleteCapture } from '../service/Api';
import API_BASE_URL from '../service/apiConfig';

const API_ORIGIN = API_BASE_URL.replace(/\/api$/, '');
const CAPTURE_BASE = `${API_ORIGIN}/image_capture/api/captures`;

const ImageCaptureList = ({ onGenerateLink }) => {
  // ── Mobile detection ──────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Top-level screen routing ──────────────────────────────────
  const [screen, setScreen]             = useState(null);
  const [flowPhone, setFlowPhone]       = useState("");
  const [flowCustomer, setFlowCustomer] = useState("");

  // ── Role detection ────────────────────────────────────────────
  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem("user")) || {}; } catch { return {}; }
  })();
  const isSuperAdmin = currentUser?.role === "Super Admin";
  const isAdmin = currentUser?.role === "Admin" || isSuperAdmin;

  // ── API data ──────────────────────────────────────────────────
  const [captureData, setCaptureData] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");

  const normalizeImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const normalize = (item) => {
    // Raw lat/lng from API (detail endpoint exposes them; list endpoint may not)
    let lat = item.latitude  != null ? parseFloat(item.latitude)  : null;
    let lng = item.longitude != null ? parseFloat(item.longitude) : null;

    // Fallback: parse from the "11.123456° N, 75.123456° E" coordinate string
    if ((lat == null || lng == null) && item.coordinate) {
      const m = item.coordinate.match(
        /([-\d.]+)[°\s]*([NS])[,\s]+([-\d.]+)[°\s]*([EW])/i
      );
      if (m) {
        lat = parseFloat(m[1]) * (m[2].toUpperCase() === 'S' ? -1 : 1);
        lng = parseFloat(m[3]) * (m[4].toUpperCase() === 'W' ? -1 : 1);
      }
    }

    return {
      id:               item.id,
      clientDetails: {
        name:    item.client_details?.name    || '',
        contact: item.client_details?.contact || '',
        phone:   item.client_details?.phone   || '',
      },
      image:            normalizeImageUrl(item.image),
      location:         item.location         || '',
      coordinate:       item.coordinate       || '',
      latitude:         lat,
      longitude:        lng,
      verificationTime: item.verification_time || '',
      status:           item.status           || 'pending',
      manualStatus:     toDisplayStatus(item.manual_status || 'pending'),
    };
  };

  // Map backend lowercase values to display labels
  const toDisplayStatus = (v) => {
    const map = { pending: 'Pending', approved: 'Approved', under_review: 'Under Review', rejected: 'Rejected', verified: 'Verified' };
    return map[v] || v;
  };
  const toApiStatus = (v) => {
    const map = { Pending: 'pending', Approved: 'approved', 'Under Review': 'under_review', Rejected: 'rejected', Verified: 'approved' };
    return map[v] || v.toLowerCase();
  };

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await getAllCaptures();
      const list = Array.isArray(data) ? data : (data?.results ?? []);
      setCaptureData(list.map(normalize));
    } catch (e) {
      setError(e.message || 'Failed to load records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // null | "generateLink" | "manualCapture"
  const [modalMode, setModalMode] = useState(null);
  const [previewImg, setPreviewImg] = useState(null);

  // Delete confirmation modal state
  const [delId, setDelId] = useState(null);

  // State for edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    contact: '',
    phone: '',
    location: '',
    coordinate: '',
    verificationTime: '',
    status: '',
    manualStatus: '',
  });

  // Status badge styling
  const getStatusBadge = (status) => {
    const statusStyles = {
      Verified: 'bg-green-100 text-green-800',
      Pending: 'bg-yellow-100 text-yellow-800',
      Failed: 'bg-red-100 text-red-800',
    };
    return statusStyles[status] || 'bg-gray-100 text-gray-800';
  };

  const getManualStatusBadge = (manualStatus) => {
    const statusStyles = {
      Approved: 'bg-green-100 text-green-800',
      'Under Review': 'bg-blue-100 text-blue-800',
      Rejected: 'bg-red-100 text-red-800',
      Pending: 'bg-gray-100 text-gray-800',
    };
    return statusStyles[manualStatus] || 'bg-gray-100 text-gray-800';
  };

  const handleView = (id) => {
    console.log('View details for ID:', id);
    alert(`View details for record ${id}`);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setEditFormData({
      name: item.clientDetails.name,
      contact: item.clientDetails.contact,
      phone: item.clientDetails.phone,
      location: item.location,
      coordinate: item.coordinate,
      verificationTime: item.verificationTime,
      status: item.status,
      manualStatus: item.manualStatus,
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = () => {
    const updatedData = captureData.map(item => 
      item.id === editingItem.id 
        ? {
            ...item,
            clientDetails: {
              name: editFormData.name,
              contact: editFormData.contact,
              phone: editFormData.phone,
            },
            location: editFormData.location,
            coordinate: editFormData.coordinate,
            verificationTime: editFormData.verificationTime,
            status: editFormData.status,
            manualStatus: editFormData.manualStatus,
          }
        : item
    );
    setCaptureData(updatedData);
    setIsEditModalOpen(false);
    setEditingItem(null);
    alert('Record updated successfully!');
  };

  const handleDelete = (id) => { setDelId(id); };

  const doDelete = async () => {
    try {
      await deleteCapture(delId);
      setCaptureData(prev => prev.filter(item => item.id !== delId));
    } catch (e) {
      alert(e.message || 'Delete failed.');
    } finally {
      setDelId(null);
    }
  };

  // ── GPS EXIF helper ───────────────────────────────────────────
  // Converts a decimal degree value to EXIF rational format:
  // [[degrees, 1], [minutes, 1], [seconds*100, 100]]
  const toExifRational = (decimal) => {
    const d = Math.abs(decimal);
    const deg = Math.floor(d);
    const minFull = (d - deg) * 60;
    const min = Math.floor(minFull);
    const sec = Math.round((minFull - min) * 60 * 100);
    return [[deg, 1], [min, 1], [sec, 100]];
  };

  // ── Download with GPS EXIF embedded ──────────────────────────
  const handleDownload = async (item) => {
    try {
      const response = await fetch(`${CAPTURE_BASE}/${item.id}/download/`);
      const blob = await response.blob();

      // Convert blob → base64 data URL (piexifjs requires this format)
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      let finalDataUrl = dataUrl;

      // Embed GPS EXIF only when coordinates are available
      if (item.latitude != null && item.longitude != null) {
        const piexif = (await import('piexifjs')).default;

        const exifObj = piexif.load(dataUrl);

        exifObj['GPS'] = {
          [piexif.GPSIFD.GPSLatitudeRef]:  item.latitude  >= 0 ? 'N' : 'S',
          [piexif.GPSIFD.GPSLatitude]:     toExifRational(item.latitude),
          [piexif.GPSIFD.GPSLongitudeRef]: item.longitude >= 0 ? 'E' : 'W',
          [piexif.GPSIFD.GPSLongitude]:    toExifRational(item.longitude),
        };

        const exifBytes  = piexif.dump(exifObj);
        finalDataUrl     = piexif.insert(exifBytes, dataUrl);
      }

      // Trigger browser download
      const a      = document.createElement('a');
      a.href       = finalDataUrl;
      a.download   = `${item.clientDetails.name.replace(/\s+/g, '_')}_image.jpg`;
      a.click();

    } catch (err) {
      console.error(err);
      alert('Failed to download image.');
    }
  };

  // ── Download from preview modal (also embeds GPS) ─────────────
  const handlePreviewDownload = async (previewItem) => {
    try {
      const response = await fetch(`${CAPTURE_BASE}/${previewItem.id}/download/`);
      const blob = await response.blob();

      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      let finalDataUrl = dataUrl;

      if (previewItem.latitude != null && previewItem.longitude != null) {
        const piexif = (await import('piexifjs')).default;

        const exifObj = piexif.load(dataUrl);

        exifObj['GPS'] = {
          [piexif.GPSIFD.GPSLatitudeRef]:  previewItem.latitude  >= 0 ? 'N' : 'S',
          [piexif.GPSIFD.GPSLatitude]:     toExifRational(previewItem.latitude),
          [piexif.GPSIFD.GPSLongitudeRef]: previewItem.longitude >= 0 ? 'E' : 'W',
          [piexif.GPSIFD.GPSLongitude]:    toExifRational(previewItem.longitude),
        };

        const exifBytes = piexif.dump(exifObj);
        finalDataUrl    = piexif.insert(exifBytes, dataUrl);
      }

      const a    = document.createElement('a');
      a.href     = finalDataUrl;
      a.download = `${previewItem.name.replace(/\s+/g, '_')}_image.jpg`;
      a.click();

    } catch (err) {
      console.error(err);
      alert('Failed to download image.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Table styles
  const tableStyles = {
    table: { width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 1000 },
    theadRow: { background: "#0990eb" },
    th: {
      padding: "8px 12px",
      textAlign: "left",
      fontWeight: 600,
      color: "#fbfbfc",
      fontSize: 12,
      letterSpacing: "0.04em",
      textTransform: "capitalize",
      whiteSpace: "nowrap",
      borderBottom: "1.5px solid #dde1ec",
      background: "#0990eb",
      position: "sticky",
      top: 0,
      zIndex: 10,
    },
    td: {
      padding: "4px 12px",
      color: "#0d0d0e",
      borderBottom: "1px solid #f0f0f0",
      whiteSpace: "nowrap",
      verticalAlign: "middle",
      textAlign: "left",
      fontSize: 11,
      lineHeight: 1.3,
    },
  };

  // Modal styles
  const modalStyles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    modal: {
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      width: '90%',
      maxWidth: '600px',
      maxHeight: '90vh',
      overflowY: 'auto',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    },
    input: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '14px',
      marginTop: '4px',
    },
    label: {
      display: 'block',
      marginBottom: '16px',
      fontWeight: '500',
      fontSize: '14px',
    },
    button: {
      padding: '8px 16px',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      border: 'none',
    },
  };

  if (screen === "captureFlow") {
    return (
      <ImageCaptureFlow
        customerName={flowCustomer}
        phone={flowPhone}
        skipVerification={true}
        onSuccess={() => { setScreen(null); fetchData(); }}
      />
    );
  }

  /* ── GPS Detected badge with hoverable coordinate tooltip ── */
  const GpsBadge = ({ item }) => {
    const [copied, setCopied] = React.useState(false);

    if (!item.coordinate) {
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: '#fef2f2', border: '1px solid #fecaca',
          color: '#dc2626', fontSize: 11, fontWeight: 700,
          padding: '3px 9px', borderRadius: 20,
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          No GPS
        </span>
      );
    }

    const lat = item.latitude  != null ? Number(item.latitude).toFixed(6)  : null;
    const lng = item.longitude != null ? Number(item.longitude).toFixed(6) : null;
    const combined = (lat && lng) ? `${lat}, ${lng}` : (lat || lng || '');

    const copyAll = (e) => {
      e.stopPropagation();
      if (!combined) return;
      navigator.clipboard?.writeText(combined).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }).catch(() => {});
    };

    return (
      <span className="gps-badge-wrap">
        <span className="gps-badge-pill">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="#15803d"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          GPS Detected
        </span>

        {/* Tooltip panel */}
        <span className="gps-tooltip-panel" onClick={e => e.stopPropagation()}>
          <span className="gps-tooltip-arrow" />

          {/* Title row */}
          <span className="gps-tooltip-title">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="#15803d"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            Coordinates
          </span>

          {/* Single selectable line: lat, lng */}
          <span className="gps-coord-row">
            <span
              className="gps-coord-combined"
              style={{
                userSelect: 'text',
                WebkitUserSelect: 'text',
                MozUserSelect: 'text',
                msUserSelect: 'text',
              }}
            >
              {combined || '—'}
            </span>
            {combined && (
              <button
                className={`gps-copy-btn${copied ? ' gps-copy-btn--ok' : ''}`}
                onClick={copyAll}
                title={copied ? 'Copied!' : 'Copy coordinates'}
              >
                {copied
                  ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                }
              </button>
            )}
          </span>
        </span>
      </span>
    );
  };

  return (
    <div className="bg-white" style={{ fontFamily: "'Google Sans', sans-serif", display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Styles */}
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @media (max-width: 600px) {
          .imgcap-page-title { font-size: 20px !important; }
          .imgcap-header-wrap { flex-direction: column !important; align-items: flex-start !important; gap: 12px; }
          .imgcap-btn-group { width: 100%; flex-direction: row !important; }
          .imgcap-btn-group button { flex: 1; justify-content: center; }
        }
        .imcb-footer { text-align: center; padding: 14px 16px; border-top: 1.5px solid #e8eaed; font-size: 12px; color: #9aa0a6; font-family: 'Google Sans', sans-serif; letter-spacing: 0.01em; flex-shrink: 0; background: #fff; width: 100%; box-sizing: border-box; position: fixed; bottom: 0; left: 0; right: 0; z-index: 10; }
        @media (max-width: 600px) { .imcb-footer { padding: 10px 12px; font-size: 11px; } }

        /* ── GPS Badge + Tooltip ── */
        .gps-badge-wrap {
          position: relative;
          display: inline-block;
        }
        .gps-badge-pill {
          display: inline-flex; align-items: center; gap: 4px;
          background: #f0fdf4; border: 1px solid #bbf7d0;
          color: #15803d; font-size: 11px; font-weight: 700;
          padding: 3px 9px; border-radius: 20px;
          cursor: default;
          user-select: none;
          transition: background .15s, box-shadow .15s;
        }
        .gps-badge-wrap:hover .gps-badge-pill {
          background: #dcfce7;
          box-shadow: 0 0 0 3px rgba(21,128,61,0.12);
        }
        /* Tooltip panel — hidden by default, shown on hover */
        .gps-tooltip-panel {
          position: absolute;
          bottom: calc(100% + 9px);
          left: 50%; transform: translateX(-50%);
          background: #fff;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          padding: 9px 12px 10px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.14);
          min-width: 190px;
          display: flex; flex-direction: column; gap: 6px;
          opacity: 0; pointer-events: none;
          transition: opacity .15s, transform .15s;
          transform: translateX(-50%) translateY(4px);
          z-index: 9999;
        }
        .gps-badge-wrap:hover .gps-tooltip-panel {
          opacity: 1; pointer-events: auto;
          transform: translateX(-50%) translateY(0);
        }
        .gps-tooltip-arrow {
          position: absolute;
          top: 100%; left: 50%; transform: translateX(-50%);
          border: 6px solid transparent;
          border-top-color: #e2e8f0;
        }
        .gps-tooltip-arrow::after {
          content: '';
          position: absolute;
          top: -7px; left: -5px;
          border: 5px solid transparent;
          border-top-color: #fff;
        }
        .gps-tooltip-title {
          display: flex; align-items: center; gap: 5px;
          font-size: 10px; font-weight: 700; color: #15803d;
          text-transform: uppercase; letter-spacing: 0.06em;
          border-bottom: 1px solid #f0f0f0;
          padding-bottom: 6px; margin-bottom: 2px;
        }
        .gps-coord-row {
          display: flex; align-items: center; gap: 6px;
        }
        .gps-coord-combined {
          font-size: 12.5px; font-weight: 600; color: #1e293b;
          font-variant-numeric: tabular-nums; letter-spacing: 0.01em;
          flex: 1;
          cursor: text;
          user-select: text !important;
          -webkit-user-select: text !important;
          -moz-user-select: text !important;
          -ms-user-select: text !important;
          line-height: 1.5;
        }
        .gps-copy-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 22px; height: 22px; border-radius: 5px;
          border: 1px solid #e5e7eb; background: #f8fafc;
          color: #64748b; cursor: pointer; flex-shrink: 0;
          transition: background .12s, border-color .12s, color .12s;
          padding: 0;
        }
        .gps-copy-btn:hover { background: #e8f3ff; border-color: #93c5fd; color: #0990eb; }
        .gps-copy-btn--ok   { background: #f0fdf4; border-color: #86efac; color: #16a34a; }
      `}</style>
      <div className="max-w-7xl mx-auto p-6" style={{ flex: 1, width: '100%', paddingBottom: '60px' }}>
        {/* Header */}
        <div className="imgcap-header-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 className="imgcap-page-title" style={{ margin: 0, fontSize: 25, fontWeight: 600,textAlign: 'left', color: "#0d0d0e", fontFamily: "'Google Sans', sans-serif" }}>Verified Customers</h2>
          </div>

        {/* Action Buttons */}
        <div className="imgcap-btn-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setModalMode('generateLink')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#0990eb',
              color: '#fff',
              padding: '9px 18px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(9,144,235,0.15)',
              fontFamily: "'Google Sans', sans-serif",
            }}
          >
            <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Generate New Link
          </button>

          <button
            onClick={() => setModalMode('manualCapture')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#fff',
              color: '#0990eb',
              padding: '9px 18px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              border: '1.5px solid #0990eb',
              cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(9,144,235,0.08)',
              fontFamily: "'Google Sans', sans-serif",
            }}
          >
            <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Manual Capture
          </button>
        </div>
        </div>

        {/* Loading / Error */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#6b7280', fontFamily: "'Google Sans', sans-serif" }}>
            <div style={{ width: 36, height: 36, border: '3px solid #e5e7eb', borderTopColor: '#0990eb', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />

            Loading records…
          </div>
        )}
        {!loading && error && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#d93025', fontSize: 14, fontFamily: "'Google Sans', sans-serif" }}>
            {error}
            <button onClick={fetchData} style={{ marginLeft: 12, color: '#0990eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Retry</button>
          </div>
        )}

        {/* ── DESKTOP: Table Container (unchanged) ── */}
        {!loading && !error && !isMobile && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table style={tableStyles.table}>
                <thead>
                  <tr style={tableStyles.theadRow}>
                    <th style={tableStyles.th}>Sl. No</th>
                    <th style={tableStyles.th}>Client Details</th>
                    <th style={tableStyles.th}>Image</th>
                    <th style={tableStyles.th}>Location</th>
                    <th style={tableStyles.th}>Verification Time</th>
                    <th style={tableStyles.th}>Status</th>
                    <th style={tableStyles.th}>Manual Status</th>
                    <th style={tableStyles.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {captureData.map((item, index) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td style={tableStyles.td}>{index + 1}</td>
                      <td style={tableStyles.td}>
                        <div className="font-medium text-gray-900">{item.clientDetails.name}</div>
                        
                        <div className="text-gray-500 text-xs">{item.clientDetails.phone}</div>
                      </td>
                      <td style={tableStyles.td}>
                        <img
                          src={item.image}
                          alt={`Client ${item.clientDetails.name}`}
                          style={{ width: 24, height: 24, borderRadius: 4, objectFit: "cover", border: "1px solid #e5e7eb", cursor: "zoom-in" }}
                          onClick={() => setPreviewImg({ id: item.id, src: item.image, name: item.clientDetails.name, latitude: item.latitude, longitude: item.longitude })}
                        />
                      </td>
                      <td style={{...tableStyles.td, whiteSpace: 'normal', wordWrap: 'break-word', maxWidth: '200px'}}>{item.location}</td>
                      <td style={tableStyles.td}>{item.verificationTime}</td>
                      <td style={tableStyles.td}>
                        <GpsBadge item={item} />
                      </td>
                      <td style={tableStyles.td}>
                        <select
                          value={item.manualStatus}
                          onChange={async (e) => {
                            const displayStatus = e.target.value;
                            try {
                              await updateCaptureManualStatus(item.id, toApiStatus(displayStatus));
                              setCaptureData(prev => prev.map(d =>
                                d.id === item.id ? { ...d, manualStatus: displayStatus } : d
                              ));
                            } catch (err) {
                              alert(err.message || 'Failed to update status.');
                            }
                          }}
                          disabled={!isAdmin}
                          style={{
                            padding: "4px 6px",
                            borderRadius: 6,
                            border: "1.5px solid #d1d5db",
                            fontSize: 11,
                            fontWeight: 600,
                            fontFamily: "'Google Sans', sans-serif",
                            cursor: isAdmin ? "pointer" : "not-allowed",
                            outline: "none",
                            width: "90px",
                            background: item.manualStatus === "Approved" ? "#10973f" : "rgb(247,170,4)",
                            color: item.manualStatus === "Approved" ? "#fafdfb" : "#f7f6f4",
                            opacity: isAdmin ? 1 : 0.7,
                          }}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Approved">Approved</option>
                        </select>
                      </td>
                      <td style={tableStyles.td}>
                        <div style={{ display: "flex", gap: 6 }}>
                          {/* Download */}
                          <button
                            onClick={() => handleDownload(item)}
                            title="Download"
                            style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: "#09832d", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "'Google Sans', sans-serif" }}
                          >
                            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>
                          {/* Delete — Super Admin only */}
                          {isSuperAdmin && (
                            <button
                              onClick={() => handleDelete(item.id)}
                              title="Delete"
                              style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: "#d93025", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "'Google Sans', sans-serif" }}
                            >
                              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Empty State */}
            {captureData.length === 0 && (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="mt-2 text-gray-500">No image capture records found</p>
              </div>
            )}

            {/* Footer with pagination (optional) */}
            
          </div>
        )}

        {/* ── MOBILE: Card View ── */}
        {!loading && !error && isMobile && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {captureData.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af' }}>
                <svg style={{ margin: '0 auto 8px', display: 'block' }} width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p style={{ fontSize: 14 }}>No image capture records found</p>
              </div>
            )}

            {captureData.map((item, index) => (
              <div
                key={item.id}
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  border: '1px solid #e8eaed',
                  boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
                  overflow: 'hidden',
                  fontFamily: "'Google Sans', sans-serif",
                }}
              >
                {/* Card Header: serial + image + name + status badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 10px' }}>
                  <div style={{ minWidth: 26, height: 26, borderRadius: '50%', background: '#0990eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                    {index + 1}
                  </div>
                  <img
                    src={item.image}
                    alt={item.clientDetails.name}
                    onClick={() => setPreviewImg({ id: item.id, src: item.image, name: item.clientDetails.name, latitude: item.latitude, longitude: item.longitude })}
                    style={{ width: 42, height: 42, borderRadius: 8, objectFit: 'cover', border: '1px solid #e5e7eb', cursor: 'zoom-in', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0d0d0e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.clientDetails.name}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{item.clientDetails.phone}</div>
                  </div>
                  <GpsBadge item={item} />
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: '#f0f0f0' }} />

                {/* Card Body: info rows */}
                <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Location */}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <svg width="13" height="13" style={{ marginTop: 1, flexShrink: 0 }} fill="none" stroke="#6b7280" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500, minWidth: 70, flexShrink: 0 }}>Location:</span>
                    <span style={{ fontSize: 12, color: '#111827' }}>{item.location}</span>
                  </div>

                  {/* Verification Time */}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <svg width="13" height="13" style={{ marginTop: 1, flexShrink: 0 }} fill="none" stroke="#6b7280" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500, minWidth: 70, flexShrink: 0 }}>Verified At:</span>
                    <span style={{ fontSize: 12, color: '#111827' }}>{item.verificationTime}</span>
                  </div>
                  {/* Manual Status */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                    <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>Manual Status</span>
                    <select
                      value={item.manualStatus}
                      onChange={async (e) => {
                            const displayStatus = e.target.value;
                            try {
                              await updateCaptureManualStatus(item.id, toApiStatus(displayStatus));
                              setCaptureData(prev => prev.map(d =>
                                d.id === item.id ? { ...d, manualStatus: displayStatus } : d
                              ));
                            } catch (err) {
                              alert(err.message || 'Failed to update status.');
                            }
                          }}
                      disabled={!isAdmin}
                      style={{
                        padding: "4px 8px",
                        borderRadius: 6,
                        border: "1.5px solid #d1d5db",
                        fontSize: 11,
                        fontWeight: 600,
                        fontFamily: "'Google Sans', sans-serif",
                        cursor: isAdmin ? "pointer" : "not-allowed",
                        outline: "none",
                        minWidth: 90,
                        background: item.manualStatus === "Approved" ? "#10973f" : "rgb(247,170,4)",
                        color: item.manualStatus === "Approved" ? "#fafdfb" : "#f7f6f4",
                        opacity: isAdmin ? 1 : 0.7,
                      }}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                    </select>
                  </div>
                </div>

                {/* Card Footer: action buttons */}
                <div style={{ borderTop: '1px solid #f0f0f0', padding: '10px 14px', display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                  <button onClick={() => handleDownload(item)} title="Download"
                    style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: "#09832d", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "'Google Sans', sans-serif" }}>
                    <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                  {isSuperAdmin && (
                    <button onClick={() => handleDelete(item.id)} title="Delete"
                      style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: "#d93025", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "'Google Sans', sans-serif" }}>
                      <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewImg && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 4000, backgroundColor: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div style={{ position: 'relative', textAlign: 'center' }}>
            <img
              src={previewImg.src}
              alt={previewImg.name}
              style={{ maxWidth: '80vw', maxHeight: '80vh', borderRadius: 12, boxShadow: '0 8px 40px rgba(0,0,0,0.5)', display: 'block', margin: '0 auto' }}
            />
            <p style={{ color: '#fff', marginTop: 10, fontSize: 14, fontFamily: "'Google Sans', sans-serif", fontWeight: 600 }}>{previewImg.name}</p>
            <button
              onClick={() => handlePreviewDownload(previewImg)}
              style={{ marginTop: 10, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#0990eb', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Google Sans', sans-serif" }}
            >
              Download Image
            </button>
            <button
              onClick={() => setPreviewImg(null)}
              style={{ position: 'absolute', top: -12, right: -12, width: 30, height: 30, borderRadius: '50%', background: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {delId !== null && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 3000,
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: '32px 28px 24px',
              width: 380,
              boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
              fontFamily: "'Google Sans', sans-serif",
            }}
          >
            {/* Icon */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#fce8e6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="26" height="26" fill="none" stroke="#d93025" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
            </div>
            <h3 style={{ textAlign: 'center', fontSize: 17, fontWeight: 700, color: '#202124', marginBottom: 8 }}>Delete Record?</h3>
            <p style={{ textAlign: 'center', fontSize: 14, color: '#5f6368', marginBottom: 24, lineHeight: 1.5 }}>
              This action cannot be undone. The record will be permanently removed.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #e8eaed", background: "#fff", color: "#5f6368", fontFamily: "'Google Sans', sans-serif", fontSize: ".86rem", cursor: "pointer" }}
                onClick={() => setDelId(null)}>Cancel</button>
              <button
                style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "#d93025", color: "#fff", fontFamily: "'Google Sans', sans-serif", fontWeight: 700, fontSize: ".86rem", cursor: "pointer" }}
                onClick={doDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div style={modalStyles.overlay}>
          <div style={modalStyles.modal}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>Edit Record</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={modalStyles.label}>
                  Client Name
                  <input
                    type="text"
                    name="name"
                    value={editFormData.name}
                    onChange={handleInputChange}
                    style={modalStyles.input}
                  />
                </label>
              </div>
              <div>
                <label style={modalStyles.label}>
                  Contact Email
                  <input
                    type="email"
                    name="contact"
                    value={editFormData.contact}
                    onChange={handleInputChange}
                    style={modalStyles.input}
                  />
                </label>
              </div>
              <div>
                <label style={modalStyles.label}>
                  Phone
                  <input
                    type="text"
                    name="phone"
                    value={editFormData.phone}
                    onChange={handleInputChange}
                    style={modalStyles.input}
                  />
                </label>
              </div>
              <div>
                <label style={modalStyles.label}>
                  Location
                  <input
                    type="text"
                    name="location"
                    value={editFormData.location}
                    onChange={handleInputChange}
                    style={modalStyles.input}
                  />
                </label>
              </div>
              <div>
                <label style={modalStyles.label}>
                  Coordinate
                  <input
                    type="text"
                    name="coordinate"
                    value={editFormData.coordinate}
                    onChange={handleInputChange}
                    style={modalStyles.input}
                  />
                </label>
              </div>
              <div>
                <label style={modalStyles.label}>
                  Verification Time
                  <input
                    type="datetime-local"
                    name="verificationTime"
                    value={editFormData.verificationTime.replace(' ', 'T')}
                    onChange={handleInputChange}
                    style={modalStyles.input}
                  />
                </label>
              </div>
              <div>
                <label style={modalStyles.label}>
                  Status
                  <select
                    name="status"
                    value={editFormData.status}
                    onChange={handleInputChange}
                    style={modalStyles.input}
                  >
                    <option value="Verified">Verified</option>
                    <option value="Pending">Pending</option>
                    <option value="Failed">Failed</option>
                  </select>
                </label>
              </div>
              <div>
                <label style={modalStyles.label}>
                  Manual Status
                  <select
                    name="manualStatus"
                    value={editFormData.manualStatus}
                    onChange={handleInputChange}
                    style={modalStyles.input}
                  >
                    <option value="Approved">Approved</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Pending">Pending</option>
                  </select>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={() => setIsEditModalOpen(false)}
                style={{ ...modalStyles.button, backgroundColor: '#e5e7eb', color: '#374151' }}
              >
                Cancel
              </button>
              <button
                onClick={handleEditSubmit}
                style={{ ...modalStyles.button, backgroundColor: '#1a73e8', color: 'white' }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Unified modal — Generate Link or Manual Capture */}
      {modalMode && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '20px',
              width: '90%',
              maxWidth: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              position: 'relative',
            }}
          >
            {/* Close ✕ */}
            <button
              onClick={() => setModalMode(null)}
              style={{
                position: 'absolute', top: '14px', right: '14px',
                background: '#f3f4f6', border: 'none', borderRadius: '50%',
                width: '32px', height: '32px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 20,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            <ImageCaptureLinkGenerator
              isModal={true}
              modalMode={modalMode}
              onBack={() => setModalMode(null)}
              onLinkClick={({ customerName, phone }) => {
                setFlowCustomer(customerName || "");
                setFlowPhone(phone || "");
                setModalMode(null);
                setScreen("captureFlow");
              }}
              onManualCapture={({ customerName, phone }) => {
                setFlowCustomer(customerName || "");
                setFlowPhone(phone || "");
                setModalMode(null);
                setScreen("captureFlow");
              }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="imcb-footer">
        Powered by <span style={{ fontWeight: 600, color: "#1a73e8" }}>IMCB Solutions LLP</span>
      </div>
    </div>
  );
};

export default ImageCaptureList;