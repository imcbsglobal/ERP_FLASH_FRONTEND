import React, { useState, useRef, useEffect } from 'react';
import AddAPhotoOutlinedIcon    from '@mui/icons-material/AddAPhotoOutlined';
import FlagOutlinedIcon         from '@mui/icons-material/FlagOutlined';
import DirectionsCarOutlinedIcon from '@mui/icons-material/DirectionsCarOutlined';
import SpeedOutlinedIcon        from '@mui/icons-material/SpeedOutlined';
import LocalGasStationOutlinedIcon from '@mui/icons-material/LocalGasStationOutlined';
import AccessTimeOutlinedIcon   from '@mui/icons-material/AccessTimeOutlined';
import CloseOutlinedIcon        from '@mui/icons-material/CloseOutlined';
import CheckCircleOutlinedIcon  from '@mui/icons-material/CheckCircleOutlined';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import RouteOutlinedIcon        from '@mui/icons-material/RouteOutlined';

/**
 * EndTrip
 * Props:
 *  - onClose()           : called on Cancel
 *  - onComplete(data)    : called with end-trip data on Complete
 *  - tripData            : object from StartTrip containing trip start info
 *    {
 *      vehicle_name, date, time, purpose_of_trip,
 *      odometer_start   (number, km at trip start)
 *    }
 */
const EndTrip = ({ onClose, onComplete, tripData = {} }) => {

  // ── End-trip editable state ───────────────────────────────────
  const [form, setForm] = useState({
    fuelCost:        '',
    endTime:         new Date().toTimeString().slice(0, 5),
    odometerEnd:     '',
    odometerImage:        null,
    odometerImagePreview: null,
  });

  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef(null);

  // ── Live clock: sync endTime every second ──
  useEffect(() => {
    const tick = () => setForm(prev => ({ ...prev, endTime: new Date().toTimeString().slice(0, 5) }));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Derived: distance covered ─────────────────────────────────
  const odometerStart  = tripData.odometer_start ?? null;
  const odometerEndVal = parseFloat(form.odometerEnd) || null;
  const distanceCovered =
    odometerStart !== null && odometerEndVal !== null
      ? Math.max(0, odometerEndVal - odometerStart)
      : null;

  // ── Handlers ──────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
  };

  const handleOdometerImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm(prev => ({
        ...prev,
        odometerImage:        file,
        odometerImagePreview: reader.result,
      }));
    };
    reader.readAsDataURL(file);
    setErrors(prev => { const n = { ...prev }; delete n.odometerImage; return n; });
  };

  const removeOdometerImage = () => {
    setForm(prev => ({ ...prev, odometerImage: null, odometerImagePreview: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Validation ────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!form.endTime)                errs.endTime     = 'End time is required.';
    if (!form.odometerEnd)            errs.odometerEnd = 'Odometer end reading is required.';
    if (
      odometerStart !== null &&
      form.odometerEnd &&
      parseFloat(form.odometerEnd) < odometerStart
    ) {
      errs.odometerEnd = `End reading must be ≥ start reading (${odometerStart} km).`;
    }
    return errs;
  };

  // ── Submit ─────────────────────────────────────────────────────
  const handleComplete = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      const endData = {
        // start info echoed back
        vehicle_name:    tripData.vehicle_name   || '',
        start_date:      tripData.date           || '',
        start_time:      tripData.time           || '',
        purpose_of_trip: tripData.purpose_of_trip || '',
        odometer_start:  odometerStart,
        // end info
        fuel_cost:       form.fuelCost    ? parseFloat(form.fuelCost)    : null,
        end_time:        form.endTime,
        odometer_end:    parseFloat(form.odometerEnd),
        distance_covered: distanceCovered,
        odometer_image:  form.odometerImage || null,
      };
      onComplete && onComplete(endData);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => onClose && onClose();

  // ── Styles ────────────────────────────────────────────────────
  const S = {
    page: {
      height: '100%', display: 'flex', flexDirection: 'column',
      overflow: 'hidden', background: '#f8f9fa',
      fontFamily: "'Nohemi', 'Segoe UI', sans-serif",
    },
    header: {
      flexShrink: 0, display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', padding: '0 16px', height: 56,
      background: '#fff', borderBottom: '1px solid #e8eaed', gap: 8, flexWrap: 'wrap',
    },
    headerLeft: { display: 'flex', flexDirection: 'column', justifyContent: 'center' },
    tag: {
      fontSize: 10, fontWeight: 700, letterSpacing: '1.6px',
      textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 2,
    },
    title: { fontSize: 18, fontWeight: 600, color: '#0c0c0c', margin: 0, lineHeight: 1.2,letterSpacing: '1.2px' },

    // green status badge in header
    statusBadge: {
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 14px', borderRadius: 20,
      background: '#ffffff', border: '1px solid #a8d5b5',
      fontSize: 12, fontWeight: 700, color: 'var(--accent)',
    },

    body: { flex: 1, overflowY: 'auto', padding: '16px' },

    card: {
      background: '#fff', borderRadius: 14,
      boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
      padding: '20px 16px', maxWidth: 860, margin: '0 auto', width: '100%', boxSizing: 'border-box',
    },

    // ── Section headers with bottom border only ──
    sectionHeader: (color) => ({
      fontSize: 14, fontWeight:'bold', letterSpacing: '1.4px',
      textTransform: 'capitalize', color: 'var(--accent)',
      marginBottom: 16, display: 'flex', alignItems: 'center', gap: 7,
      borderBottom: '2px solid #e0e0e0', // Only bottom border
      paddingBottom: '8px',               // Space between text and border
    }),
    sectionDivider: {
      border: 'none', borderTop: '1.5px solid #f0f0f0', margin: '24px 0',
    },

    // ── Read-only trip start info banner ──
    infoBanner: {
      background: '#ffff', 
      borderRadius: 10, padding: '18px 20px',
    },
    infoGrid: {
      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', columnGap: 16, rowGap: 16,
    },  // overridden to 1-col on mobile via <style>
    infoItem: { display: 'flex', flexDirection: 'column', gap: 6 },
    infoItemLabel: {
      fontSize: 13, fontWeight: 700, letterSpacing: '0.8px',
      textTransform: 'capitalize', color: 'rgb(12, 12, 12)',
      display: 'flex', alignItems: 'center', gap: 4,
    },
    infoItemValue: {
      fontSize: 12, fontWeight: 600, color: '#202124',
      padding: '9px 13px', background: 'transparent',
      border: '1px solid #d5d6da', borderRadius: 8,
      width: '100%', boxSizing: 'border-box',
      minHeight: 38, display: 'flex', alignItems: 'center',
    },

    // ── Distance computed badge ──
    distanceBadge: {
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 12px', borderRadius: 20,
      background: '#e8f0fe', border: '1px solid #c5d8fc',
      fontSize: 12, fontWeight: 700, color: 'var(--accent)',
    },

    // ── Editable form ──
    grid2: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 },
    grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 },  // overridden on mobile

    formGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
    label: {
      fontSize: 13, fontWeight:'bold', color: 'rgb(7, 7, 7)',
      marginBottom: 0, letterSpacing: '0.5px', textTransform: 'capitalize',
      display: 'flex', alignItems: 'center', gap: 5,
    },
    required: { color: '#e74c3c', marginLeft: 3 },

    input: {
      padding: '10px 13px', border: '1px solid #e2dfdf', borderRadius: 8,
      fontSize: 13, fontFamily: "'Nohemi', 'Segoe UI', sans-serif",
      outline: 'none', width: '100%', boxSizing: 'border-box',
      background: '#fff', color: '#202124',
      transition: 'border-color 0.2s, box-shadow 0.2s',
    },
    inputError: { borderColor: '#d93025', boxShadow: '0 0 0 2px rgba(217,48,37,0.08)' },
    inputReadonly: {
      background: '#f8f9fa', color: '#5f6368', cursor: 'not-allowed',
      border: '1px solid #e8eaed',
    },
    errorMsg: { color: '#d93025', fontSize: 11, marginTop: 4 },

    // ── Odometer upload ──
    odometerBox: {
      border: 'none', padding: 0,
      display: 'flex', alignItems: 'center',
      cursor: 'pointer', background: 'transparent',
    },
    odometerPreviewWrap: { position: 'relative', display: 'inline-block', marginTop: 4 },
    odometerPreviewImg: {
      maxWidth: 260, maxHeight: 160, borderRadius: 10,
      border: '2px solid #e8eaed', display: 'block',
    },
    removeImgBtn: {
      position: 'absolute', top: -10, right: -10,
      background: '#d93025', color: '#fff', border: 'none',
      borderRadius: '50%', width: 26, height: 26,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', fontSize: 13,
    },

    // ── Footer ──
    actions: {
      display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap',
      marginTop: 24, paddingTop: 20, 
    },
    cancelBtn: {
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '10px 24px', borderRadius: 8,
      border: '1px solid #e8eaed', background: '#fff',
      color: '#5f6368', fontWeight: 700, fontSize: 13, cursor: 'pointer',
      fontFamily: "'Nohemi', 'Segoe UI', sans-serif", transition: 'all 0.18s',
    },
    completeBtn: {
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '10px 28px', borderRadius: 8, border: 'none',
      background: loading ? 'var(--accent)' : 'var(--accent)',
      color: '#fff', fontWeight: 700, fontSize: 13,
      cursor: loading ? 'not-allowed' : 'pointer',
      fontFamily: "'Nohemi', 'Segoe UI', sans-serif",
      boxShadow: '0 2px 8px rgba(24,128,56,0.28)',
      transition: 'all 0.18s', minWidth: 150,
    },
  };

  const fieldStyle = (key) => ({
    ...S.input,
    ...(errors[key] ? S.inputError : {}),
  });

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nohemi:wght@400;500;600;700;800&display=swap');
        .et-input:focus  { border-color: #188038 !important; box-shadow: 0 0 0 2px rgba(24,128,56,0.12) !important; }
        .et-input::placeholder { color: #bdc1c6; font-size: 12px; }
        .et-cancel:hover  { background: #f8f9fa !important; color: #202124 !important; }
        .et-complete:hover { background: #1a73e8 !important; transform: translateY(-1px); }
        @media (max-width: 600px) {
          .et-info-grid  { grid-template-columns: 1fr 1fr !important; }
          .et-grid3      { grid-template-columns: 1fr !important; }
          .et-grid2      { grid-template-columns: 1fr !important; }
          .et-cancel, .et-complete { flex: 1; justify-content: center; }
        }
      `}</style>

      {/* ── Header ── */}
      

      {/* ── Body ── */}
      <div style={S.body}>
        <div style={S.card}>
         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          <div style={S.headerLeft}>
           
            <h1 style={S.title}>End Trip</h1>
          </div>
          {/* In-progress badge */}
          <div style={S.statusBadge}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--accent)', display: 'inline-block',
            boxShadow: '0 0 0 3px rgba(24,128,56,0.2)',
            animation: 'pulse 1.6s infinite',
          }} />
            Trip In Progress
          </div>
         </div>
        <style>{`
          @keyframes pulse {
            0%,100% { box-shadow: 0 0 0 3px rgba(24,128,56,0.2); }
            50%      { box-shadow: 0 0 0 6px rgba(24,128,56,0.05); }
          }
        `}</style>
          {/* ══ Section 1: Trip Start Info (read-only) ══ */}
          <div style={S.sectionHeader('var(--accent)')}>
            <DirectionsCarOutlinedIcon style={{ fontSize: 16 }} />
            Trip Start Info
          </div>

          <div style={S.infoBanner}>
            <div className="et-info-grid" style={S.infoGrid}>

              {/* Date */}
              <div style={S.infoItem}>
                <div style={S.infoItemLabel}>
                  <CalendarTodayOutlinedIcon style={{ fontSize: 11 }} /> Date
                </div>
                <div style={S.infoItemValue}>
                  {tripData.date
                    ? new Date(tripData.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '—'}
                </div>
              </div>

              {/* Start Time */}
              <div style={S.infoItem}>
                <div style={S.infoItemLabel}>
                  <AccessTimeOutlinedIcon style={{ fontSize: 11 }} /> Start Time
                </div>
                <div style={S.infoItemValue}>{tripData.time || '—'}</div>
              </div>

              {/* Purpose */}
              <div style={S.infoItem}>
                <div style={S.infoItemLabel}>
                  <RouteOutlinedIcon style={{ fontSize: 11 }} /> Purpose
                </div>
                <div style={S.infoItemValue}>{tripData.purpose_of_trip || '—'}</div>
              </div>

              {/* Vehicle */}
              <div style={S.infoItem}>
                <div style={S.infoItemLabel}>
                  <DirectionsCarOutlinedIcon style={{ fontSize: 11 }} /> Vehicle
                </div>
                <div style={S.infoItemValue}>{tripData.vehicle_name || '—'}</div>
              </div>

              {/* Odometer Start */}
              <div style={S.infoItem}>
                <div style={S.infoItemLabel}>
                  <SpeedOutlinedIcon style={{ fontSize: 11 }} /> Odometer Start
                </div>
                <div style={S.infoItemValue}>
                  {odometerStart !== null ? `${Number(odometerStart).toLocaleString('en-IN')} km` : '—'}
                </div>
              </div>

              {/* Distance covered (live computed) */}
              <div style={S.infoItem}>
                <div style={S.infoItemLabel}>
                  <RouteOutlinedIcon style={{ fontSize: 11 }} /> Distance Covered
                </div>
                <div style={S.infoItemValue}>
                  {distanceCovered !== null
                    ? <span style={S.distanceBadge}>{Number(distanceCovered).toLocaleString('en-IN')} km</span>
                    : <span style={{ color: '#bdc1c6', fontSize: 13 }}>— (fill odometer end)</span>}
                </div>
              </div>

            </div>
          </div>

          <hr style={S.sectionDivider} />

          {/* ══ Section 2: Trip End Info (editable) ══ */}
          <div style={S.sectionHeader('#188038')}>
            <FlagOutlinedIcon style={{ fontSize: 16 }} />
            Trip End Info
          </div>

          {/* Row 1: Fuel Cost + Odometer Start (readonly) + End Time */}
          <div className="et-grid3" style={S.grid3}>

            {/* Fuel Cost */}
            <div style={S.formGroup}>
              <label style={S.label}>
                <LocalGasStationOutlinedIcon style={{ fontSize: 13 }} />
                Fuel Cost (₹)
              </label>
              <input
                type="number"
                name="fuelCost"
                value={form.fuelCost}
                onChange={handleChange}
                placeholder="e.g., 800"
                className="et-input"
                style={fieldStyle('fuelCost')}
                min="0"
                step="0.01"
              />
              {errors.fuelCost && <span style={S.errorMsg}>{errors.fuelCost}</span>}
            </div>

            {/* Odometer Start (read-only echo) */}
            <div style={S.formGroup}>
              <label style={S.label}>
                <SpeedOutlinedIcon style={{ fontSize: 13 }} />
                Odometer Start (km)
              </label>
              <input
                type="text"
                value={odometerStart !== null ? odometerStart : ''}
                readOnly
                placeholder="—"
                style={{ ...S.input, ...S.inputReadonly }}
                tabIndex={-1}
              />
            </div>

            {/* End Time */}
            <div style={S.formGroup}>
              <label style={S.label}>
                <AccessTimeOutlinedIcon style={{ fontSize: 13 }} />
                End Time <span style={S.required}>*</span>
              </label>
              <input
                type="time"
                name="endTime"
                value={form.endTime}
                onChange={handleChange}
                className="et-input"
                style={fieldStyle('endTime')}
              />
              {errors.endTime && <span style={S.errorMsg}>{errors.endTime}</span>}
            </div>

          </div>

          {/* Row 2: Odometer End (full width on its own row for emphasis) */}
          <div style={{ marginTop: 16 }}>
            <div style={{ maxWidth: 320, width: "100%" }}>
              <div style={S.formGroup}>
                <label style={S.label}>
                  <SpeedOutlinedIcon style={{ fontSize: 13 }} />
                  Odometer End (km) <span style={S.required}>*</span>
                </label>
                <input
                  type="number"
                  name="odometerEnd"
                  value={form.odometerEnd}
                  onChange={handleChange}
                  placeholder="e.g., 15450"
                  className="et-input"
                  style={fieldStyle('odometerEnd')}
                  min={odometerStart ?? 0}
                  step="1"
                />
                {errors.odometerEnd && <span style={S.errorMsg}>{errors.odometerEnd}</span>}
              </div>
            </div>
          </div>

          <hr style={S.sectionDivider} />

          {/* ══ Section 3: Odometer End Image ══ */}
          <div style={S.sectionHeader('#1a73e8')}>
            <SpeedOutlinedIcon style={{ fontSize: 16 }} />
            Odometer End Image
          </div>

          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleOdometerImage}
            style={{ display: 'none' }}
          />

          {!form.odometerImagePreview ? (
            <div
              className="et-odometer-box"
              style={S.odometerBox}
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
            >
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: '#e6f4ea', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <AddAPhotoOutlinedIcon style={{ fontSize: 26, color: '#1a73e8' }} />
              </div>
              
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={S.odometerPreviewWrap}>
                <img
                  src={form.odometerImagePreview}
                  alt="Odometer End"
                  style={S.odometerPreviewImg}
                />
                <button
                  type="button"
                  style={S.removeImgBtn}
                  onClick={removeOdometerImage}
                  title="Remove image"
                >
                  <CloseOutlinedIcon style={{ fontSize: 14 }} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                style={{
                  padding: '7px 16px', borderRadius: 8, border: '1px solid #e0e0e0',
                  background: '#fff', color: '#5f6368', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: "'Nohemi', 'Segoe UI', sans-serif",
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                <AddAPhotoOutlinedIcon style={{ fontSize: 14 }} />
                Change Photo
              </button>
            </div>
          )}

          {errors.odometerImage && (
            <span style={{ ...S.errorMsg, display: 'block', marginTop: 6 }}>
              {errors.odometerImage}
            </span>
          )}

          {/* ══ Actions ══ */}
          <div style={S.actions}>
            <button
              type="button"
              className="et-cancel"
              style={S.cancelBtn}
              onClick={handleCancel}
              disabled={loading}
            >
              <CloseOutlinedIcon style={{ fontSize: 16 }} />
              Cancel
            </button>
            <button
              type="button"
              className="et-complete"
              style={S.completeBtn}
              onClick={handleComplete}
              disabled={loading}
            >
              <CheckCircleOutlinedIcon style={{ fontSize: 18 }} />
              {loading ? 'Completing…' : 'Complete Trip'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default EndTrip;