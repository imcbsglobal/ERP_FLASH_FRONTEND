import React, { useState, useRef, useEffect } from 'react';
import AddAPhotoOutlinedIcon from '@mui/icons-material/AddAPhotoOutlined';
import DirectionsCarOutlinedIcon from '@mui/icons-material/DirectionsCarOutlined';
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined';
import LocalCarWashOutlinedIcon from '@mui/icons-material/LocalCarWashOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import AirOutlinedIcon from '@mui/icons-material/AirOutlined';
import OilBarrelOutlinedIcon from '@mui/icons-material/OilBarrelOutlined';
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import { getVehicles } from '../service/vehiclemaster';

/**
 * StartTrip
 * Props:
 *  - onClose()        : called on Cancel
 *  - onStart(data)    : called with trip data on Start
 *
 * Vehicles are fetched directly from the API on mount.
 * traveled_by is auto-populated from the logged-in user's name in localStorage.
 */
const StartTrip = ({ onClose, onStart }) => {

  // ── Resolve logged-in user name ────────────────────────────────
  // Tries common keys written by most JWT auth setups.
  const getLoggedInUserName = () => {
    try {
      // 1. Try a dedicated "user" object stored as JSON
      const userJson = localStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        return user.name || user.full_name || user.username || user.email || '';
      }
      // 2. Try individual flat keys
      return (
        localStorage.getItem('user_name') ||
        localStorage.getItem('full_name') ||
        localStorage.getItem('username') ||
        localStorage.getItem('name') ||
        ''
      );
    } catch {
      return '';
    }
  };

  // ── State ─────────────────────────────────────────────────────
  const _now   = new Date();
  const _today = _now.toISOString().slice(0, 10);   // "YYYY-MM-DD"
  const _time  = _now.toTimeString().slice(0, 5);   // "HH:MM"

  const [form, setForm] = useState({
    vehicleId:          '',
    vehicleName:        '',
    registrationNumber: '',
    date:               _today,
    time:               _time,
    purposeOfTrip:      '',
    maintenanceCost:    '',
    // FIX 1: auto-fill traveled_by from logged-in user
    traveledBy:         getLoggedInUserName(),
    // FIX 2: capture odometer start reading so backend can compute distance
    odometerStart:      '',
    services: {
      washing:     false,
      alignment:   false,
      airChecking: false,
      greaseOil:   false,
    },
    odometerImage:        null,
    odometerImagePreview: null,
  });

  const [errors,         setErrors]         = useState({});
  const [loading,        setLoading]        = useState(false);
  const [vehicles,       setVehicles]       = useState([]);
  const [vehicleLoading, setVehicleLoading] = useState(true);
  const [vehicleError,   setVehicleError]   = useState('');

  const fileInputRef = useRef(null);

  // ── Fetch all vehicles from API on mount ──────────────────────
  useEffect(() => {
    const fetchVehicles = async () => {
      setVehicleLoading(true);
      setVehicleError('');
      try {
        const data = await getVehicles({ status: "Active" });
        const list = Array.isArray(data) ? data : (data.results || []);
        setVehicles(list);
      } catch (err) {
        setVehicleError('Failed to load vehicles. Please try again.');
      } finally {
        setVehicleLoading(false);
      }
    };
    fetchVehicles();
  }, []);

  // ── Handlers ──────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
  };

  // Selecting a vehicle stores id + name + registration separately
  const handleVehicleSelect = (e) => {
    const selectedId = e.target.value;
    const selected = vehicles.find(v => String(v.id) === String(selectedId));
    setForm(prev => ({
      ...prev,
      vehicleId:          selectedId,
      vehicleName:        selected ? selected.vehicle_name        : '',
      registrationNumber: selected ? selected.registration_number : '',
    }));
    setErrors(prev => { const n = { ...prev }; delete n.vehicleId; return n; });
  };

  const handleServiceChange = (e) => {
    const { name, checked } = e.target;
    setForm(prev => ({
      ...prev,
      services: { ...prev.services, [name]: checked },
    }));
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
    if (!form.vehicleId)            errs.vehicleId     = 'Please select a vehicle.';
    if (!form.date)                 errs.date          = 'Date is required.';
    if (!form.time)                 errs.time          = 'Time is required.';
    if (!form.purposeOfTrip.trim()) errs.purposeOfTrip = 'Purpose of trip is required.';
    return errs;
  };

  // ── Submit ─────────────────────────────────────────────────────
  const handleStart = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      const selectedServices = Object.entries(form.services)
        .filter(([, v]) => v)
        .map(([k]) => k);

      const tripData = {
        vehicle_id:          form.vehicleId,
        vehicle_name:        form.vehicleName,
        registration_number: form.registrationNumber,
        date:                form.date,
        time:                form.time,
        purpose_of_trip:     form.purposeOfTrip,
        maintenance_cost:    form.maintenanceCost ? parseFloat(form.maintenanceCost) : null,
        services:            selectedServices,
        odometer_image:      form.odometerImage || null,
        // FIX 1: send traveled_by (logged-in user name)
        traveled_by:         form.traveledBy,
        // FIX 2: send odometer start so backend can compute distance on end
        odometer_start:      form.odometerStart ? parseFloat(form.odometerStart) : null,
      };

      onStart && onStart(tripData);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onClose && onClose();
  };

  // ── Service options config ────────────────────────────────────
  const serviceOptions = [
    { key: 'washing',     label: 'Washing',      Icon: LocalCarWashOutlinedIcon },
    { key: 'alignment',   label: 'Alignment',    Icon: TuneOutlinedIcon         },
    { key: 'airChecking', label: 'Air Checking', Icon: AirOutlinedIcon          },
    { key: 'greaseOil',   label: 'Grease / Oil', Icon: OilBarrelOutlinedIcon    },
  ];

  // ── Styles ─────────────────────────────────────────────────────
  const S = {
    page: {
      height: '100%', display: 'flex', flexDirection: 'column',
      overflow: 'hidden', background: '#f8f9fa',
      fontFamily: "'Nohemi', 'Segoe UI', sans-serif",
    },
    header: {
      flexShrink: 0, display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', padding: '0 16px', height: 56,
      background: '#fff', borderBottom: '1px solid #e8eaed', gap: 8,
    },
    headerLeft: { display: 'flex', flexDirection: 'column', justifyContent: 'center' },
    tag: {
      fontSize: 10, fontWeight: 700, letterSpacing: '1.6px',
      textTransform: 'uppercase', color: '#1a73e8', marginBottom: 2,
    },
    title: { fontSize: 18, fontWeight: 600, color: '#202124', margin: 0, letterSpacing: '1.2px', lineHeight: 1.5 },

    body:   { flex: 1, overflowY: 'auto', padding: '16px' },
    card:   {
      background: '#fff', borderRadius: 14,
      boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
      padding: '20px 16px', maxWidth: 860, margin: '0 auto', width: '100%', boxSizing: 'border-box',
    },

    sectionLabel: {
      fontSize: '14px', fontWeight: 'bold', letterSpacing: '1.4px',
      textTransform: 'capitalize', color: 'var(--accent)',
      marginBottom: 16, display: 'flex', alignItems: 'center', gap: 7,
      borderBottom: '2px solid #e0e0e0', // Only bottom border
      paddingBottom: '8px',               // Space between text and border
    },
    sectionDivider: { border: 'none', borderTop: '1.5px solid #f0f0f0', margin: '22px 0' },

    grid2: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 },
    grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 },

    formGroup: { display: 'flex', flexDirection: 'column' },
    label: {
      fontSize: '12px',fontWeight: 'bold', color: '#000000',
      marginBottom: 6, letterSpacing: '0.5px', textTransform: 'capitalize', textAlign: 'left',
    },
    required: { color: '#e74c3c', marginLeft: 3 },

    input: {
      padding: '10px 13px', border: '1px solid #f0eeee', borderRadius: 8,
      fontSize: 13, fontFamily: "'Nohemi', 'Segoe UI', sans-serif",
      outline: 'none', width: '100%', boxSizing: 'border-box',
      background: '#fff', color: '#202124',
      transition: 'border-color 0.2s, box-shadow 0.2s',
    },
    inputReadonly: {
      background: '#f8f9fa', color: '#e1e4e6', cursor: 'default',
    },
    select: {
      padding: '10px 13px', border: '1px solid #e0e0e0', borderRadius: 8,
      fontSize: 13, fontFamily: "'Nohemi', 'Segoe UI', sans-serif",
      background: '#fff', color: '#202124', outline: 'none',
      width: '100%', cursor: 'pointer', boxSizing: 'border-box',
      transition: 'border-color 0.2s, box-shadow 0.2s', appearance: 'auto',
    },
    inputError: { borderColor: '#d93025', boxShadow: '0 0 0 2px rgba(217,48,37,0.08)' },
    errorMsg:   { color: '#d93025', fontSize: 11, marginTop: 4 },

    serviceGrid:  { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 },
    serviceCard:  (checked) => ({
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 8, padding: '14px 10px', borderRadius: 10, cursor: 'pointer',
      border: `1.5px solid ${checked ? '#1a73e8' : '#e0e0e0'}`,
      background: checked ? '#e8f0fe' : '#fafafa',
      transition: 'all 0.18s', userSelect: 'none',
    }),
    serviceIcon:  (checked) => ({ fontSize: 22, color: checked ? '#1a73e8' : '#9aa0a6' }),
    serviceLabel: (checked) => ({
      fontSize: 11, fontWeight: 700, letterSpacing: '0.5px',
      color: checked ? '#1a73e8' : '#5f6368', textAlign: 'center',
    }),

    odometerBox: {
      borderRadius: 10, padding: '20px',
      display: 'flex', flexDirection: 'column', alignItems: 'left',
      gap: 10, cursor: 'pointer',
      transition: 'border-color 0.2s, background 0.2s',
    },
    odometerPreviewWrap: { position: 'relative', display: 'inline-block', marginTop: 4 },
    odometerPreviewImg:  {
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

    actions: {
      display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap',
      marginTop: 24, paddingTop: 20, borderTop: '1px solid #e8eaed',
    },
    cancelBtn: {
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '10px 24px', borderRadius: 8,
      border: '1px solid #e8eaed', background: '#fff',
      color: '#5f6368', fontWeight: 700, fontSize: 13, cursor: 'pointer',
      fontFamily: "'Nohemi', 'Segoe UI', sans-serif", transition: 'all 0.18s',
    },
    startBtn: {
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '10px 28px', borderRadius: 8, border: 'none',
      background: loading ? '#93b8f4' : '#1a73e8',
      color: '#fff', fontWeight: 700, fontSize: 13,
      cursor: loading ? 'not-allowed' : 'pointer',
      fontFamily: "'Nohemi', 'Segoe UI', sans-serif",
      boxShadow: '0 2px 8px rgba(26,115,232,0.28)',
      transition: 'all 0.18s', minWidth: 130,
    },
  };

  const fieldStyle  = (key) => ({ ...S.input,  ...(errors[key] ? S.inputError : {}) });
  const selectStyle = (key) => ({ ...S.select, ...(errors[key] ? S.inputError : {}) });

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nohemi:wght@400;500;600;700;800&display=swap');
        .st-input:focus  { border-color: #1a73e8 !important; box-shadow: 0 0 0 2px rgba(26,115,232,0.12) !important; }
        .st-select:focus { border-color: #1a73e8 !important; box-shadow: 0 0 0 2px rgba(26,115,232,0.12) !important; }
        .st-input::placeholder { color: #bdc1c6; font-size: 12px; }
        .st-cancel:hover { background: #f8f9fa !important; color: #202124 !important; }
        .st-start:hover  { background: #1557b0 !important; transform: translateY(-1px); }
        .st-odometer-box:hover { border-color: #1a73e8 !important; }
        @media (max-width: 600px) {
          .st-grid3        { grid-template-columns: 1fr !important; }
          .st-grid2        { grid-template-columns: 1fr !important; }
          .st-service-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .st-cancel, .st-start { flex: 1; justify-content: center; }
        }
      `}</style>

      {/* ── Body ── */}
      <div style={S.body}>
        <div style={S.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={S.headerLeft}>
              <h1 style={S.title}>Start New Trip</h1>
            </div>
          </div>

          {/* ══ Section 1: Basic Information ══ */}
          <div style={S.sectionLabel}>
            <DirectionsCarOutlinedIcon style={{ fontSize: 16 }} />
            Basic Information
          </div>

          {/* Row 1: Vehicle + Date + Time */}
          <div className="st-grid3" style={S.grid3}>

            {/* ── Vehicle Dropdown ── */}
            <div style={S.formGroup}>
              <label style={S.label}>
                Vehicle <span style={S.required}>*</span>
              </label>
              {vehicleLoading && (
                <select disabled style={{ ...S.select, color: '#9aa0a6' }}>
                  <option>Loading vehicles…</option>
                </select>
              )}
              {!vehicleLoading && vehicleError && (
                <select disabled style={{ ...S.select, borderColor: '#d93025', color: '#d93025' }}>
                  <option>{vehicleError}</option>
                </select>
              )}
              {!vehicleLoading && !vehicleError && (
                <select
                  name="vehicleId"
                  value={form.vehicleId}
                  onChange={handleVehicleSelect}
                  className="st-select"
                  style={selectStyle('vehicleId')}
                >
                  <option value="">-- Select Vehicle --</option>
                  {vehicles.length === 0 ? (
                    <option disabled value="">No vehicles found. Add from Vehicle Master.</option>
                  ) : (
                    vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                         {v.registration_number} {v.vehicle_name} 
                      </option>
                    ))
                  )}
                </select>
              )}
              {errors.vehicleId && (
                <span style={S.errorMsg}>{errors.vehicleId}</span>
              )}
            </div>

            {/* Date */}
            <div style={S.formGroup}>
              <label style={S.label}>
                Date <span style={S.required}>*</span>
              </label>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                className="st-input"
                style={fieldStyle('date')}
              />
              {errors.date && <span style={S.errorMsg}>{errors.date}</span>}
            </div>

            {/* Time */}
            <div style={S.formGroup}>
              <label style={S.label}>
                Time <span style={S.required}>*</span>
              </label>
              <input
                type="time"
                name="time"
                value={form.time}
                onChange={handleChange}
                className="st-input"
                style={fieldStyle('time')}
              />
              {errors.time && <span style={S.errorMsg}>{errors.time}</span>}
            </div>
          </div>

          {/* Row 2: Purpose + Maintenance Cost */}
          <div className="st-grid2" style={{ ...S.grid2, marginTop: 16 }}>
            <div style={S.formGroup}>
              <label style={S.label}>
                Purpose of Trip <span style={S.required}>*</span>
              </label>
              <input
                type="text"
                name="purposeOfTrip"
                value={form.purposeOfTrip}
                onChange={handleChange}
                placeholder="e.g., Client visit, Delivery, Office commute"
                className="st-input"
                style={fieldStyle('purposeOfTrip')}
              />
              {errors.purposeOfTrip && <span style={S.errorMsg}>{errors.purposeOfTrip}</span>}
            </div>

            <div style={S.formGroup}>
              <label style={S.label}>Maintenance Cost (₹)</label>
              <input
                type="number"
                name="maintenanceCost"
                value={form.maintenanceCost}
                onChange={handleChange}
                placeholder="e.g., 500"
                className="st-input"
                style={fieldStyle('maintenanceCost')}
                min="0"
                step="0.01"
              />
              {errors.maintenanceCost && <span style={S.errorMsg}>{errors.maintenanceCost}</span>}
            </div>
          </div>

          {/* Row 3: Traveled By (auto-filled, editable) + Odometer Start */}
          <div className="st-grid2" style={{ ...S.grid2, marginTop: 16 }}>
            {/* FIX 1 — Traveled By: auto-filled from logged-in user, still editable */}
            <div style={S.formGroup}>
              <label style={S.label}>Traveled By</label>
              <input
                type="text"
                name="traveledBy"
                value={form.traveledBy}
                onChange={handleChange}
                placeholder="Driver / employee name"
                className="st-input"
                style={fieldStyle('traveledBy')}
              />
            </div>

            {/* FIX 2 — Odometer Start: required to compute distance later */}
            <div style={S.formGroup}>
              <label style={S.label}>
                Odometer Start (km)
              </label>
              <input
                type="number"
                name="odometerStart"
                value={form.odometerStart}
                onChange={handleChange}
                placeholder="e.g., 15200"
                className="st-input"
                style={fieldStyle('odometerStart')}
                min="0"
                step="1"
              />
              {errors.odometerStart && <span style={S.errorMsg}>{errors.odometerStart}</span>}
            </div>
          </div>

          <hr style={S.sectionDivider} />

          {/* ══ Section 2: Select Services ══ */}
          <div style={S.sectionLabel}>
            <TuneOutlinedIcon style={{ fontSize: 16 }} />
            Select Services
          </div>

          <div className="st-service-grid" style={S.serviceGrid}>
            {serviceOptions.map(({ key, label, Icon }) => {
              const checked = form.services[key];
              return (
                <label key={key} style={S.serviceCard(checked)}>
                  <input
                    type="checkbox"
                    name={key}
                    checked={checked}
                    onChange={handleServiceChange}
                    style={{ display: 'none' }}
                  />
                  <Icon style={S.serviceIcon(checked)} />
                  <span style={S.serviceLabel(checked)}>{label}</span>
                  <span style={{
                    width: 16, height: 16, borderRadius: '50%',
                    background: checked ? '#1a73e8' : '#e0e0e0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.18s', flexShrink: 0,
                  }}>
                    {checked && (
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                        <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </span>
                </label>
              );
            })}
          </div>

          <hr style={S.sectionDivider} />

          {/* ══ Section 3: Odometer Image ══ */}
          <div style={S.sectionLabel}>
            <SpeedOutlinedIcon style={{ fontSize: 16 }} />
            Odometer Reading Image
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
              className="st-odometer-box"
              style={S.odometerBox}
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
            >
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <AddAPhotoOutlinedIcon style={{ fontSize: 26, color: '#1a73e8' }} />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={S.odometerPreviewWrap}>
                <img
                  src={form.odometerImagePreview}
                  alt="Odometer"
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
              className="st-cancel"
              style={S.cancelBtn}
              onClick={handleCancel}
              disabled={loading}
            >
              <CloseOutlinedIcon style={{ fontSize: 16 }} />
              Cancel
            </button>
            <button
              type="button"
              className="st-start"
              style={S.startBtn}
              onClick={handleStart}
              disabled={loading}
            >
              <PlayArrowOutlinedIcon style={{ fontSize: 18 }} />
              {loading ? 'Starting…' : 'Start Trip'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default StartTrip;