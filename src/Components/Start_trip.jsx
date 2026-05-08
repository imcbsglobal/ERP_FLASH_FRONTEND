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
import { getVehicles } from '../service/Api';

const StartTrip = ({ onClose, onStart, refreshKey }) => {
  // Mobile detection utility
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth <= 768;
  };
  const getLoggedInUserName = () => {
    // IMPORTANT: must return the JWT `username` claim (login name), NOT the
    // display name. The backend stamps traveled_by from the JWT username, and
    // the GET filter uses traveled_by__iexact=username. Storing a display name
    // ("John Doe") while filtering by login name ("johndoe") causes a blank
    // page after refresh because no rows match the filter.
    try {
      const userJson = localStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        // Prefer username (login name) over display names
        return user.username || user.email || user.name || user.full_name || '';
      }
      return (
        localStorage.getItem('username') ||
        localStorage.getItem('user_name') ||
        localStorage.getItem('name') ||
        localStorage.getItem('full_name') ||
        ''
      );
    } catch {
      return '';
    }
  };

  const _now   = new Date();
  const _today = _now.toISOString().slice(0, 10);
  const _time  = _now.toTimeString().slice(0, 5);

  const [form, setForm] = useState({
    vehicleId:          '',
    vehicleName:        '',
    registrationNumber: '',
    date:               _today,
    time:               _time,
    purposeOfTrip:      '',
    maintenanceCost:    '',
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

  // Camera states
  const [cameraActive,   setCameraActive]   = useState(false);
  const [cameraStream,   setCameraStream]   = useState(null);
  const [capturedPhoto,  setCapturedPhoto]  = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchVehicles = async () => {
      setVehicleLoading(true);
      setVehicleError('');
      try {
        const res = await getVehicles({ status: "Active", exclude_ongoing: "true" });
        const list = Array.isArray(res) ? res : (res?.results || []);
        setVehicles(list);
        if (!list.length) {
          // no error — just empty list, handled by the "No vehicles found" option
        }
      } catch (err) {
        if (err._status === 401 || err.message?.toLowerCase().includes('unauthorized')) {
          setVehicleError('Your session has expired. Please log out and log back in.');
        } else {
          setVehicleError('Failed to load vehicles. Please try again.');
        }
      } finally {
        setVehicleLoading(false);
      }
    };
    fetchVehicles();
  }, [refreshKey]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
  };

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

  // Open camera
  const openCamera = async () => {
    try {
      setCapturedPhoto(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      setCameraStream(stream);
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error("Camera error:", err);
      setErrors(prev => ({ ...prev, odometerImage: "Failed to access camera. Check permissions." }));
    }
  };

  // Take photo from video stream
  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      const video = videoRef.current;
      canvasRef.current.width = video.videoWidth;
      canvasRef.current.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      canvasRef.current.toBlob(blob => {
        if (blob) {
          const file = new File([blob], `odometer-${Date.now()}.jpg`, { type: "image/jpeg" });
          setCapturedPhoto({ blob, file, preview: canvasRef.current.toDataURL() });
        }
      }, "image/jpeg", 0.9);
    }
  };

  // Retake photo
  const retakePhoto = () => {
    setCapturedPhoto(null);
  };

  // Confirm and save photo
  const confirmPhoto = () => {
    if (!capturedPhoto) return;

    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (capturedPhoto.blob.size > MAX_FILE_SIZE) {
      setErrors(prev => ({
        ...prev,
        odometerImage: `Photo is too large (${(capturedPhoto.blob.size / 1024 / 1024).toFixed(2)}MB). Maximum 5MB.`
      }));
      return;
    }

    setForm(prev => ({
      ...prev,
      odometerImage: capturedPhoto.file,
      odometerImagePreview: capturedPhoto.preview,
    }));
    closeCamera();
  };

  // Close camera
  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
    setCapturedPhoto(null);
  };

  const validate = () => {
    const errs = {};
    if (!form.vehicleId)            errs.vehicleId     = 'Please select a vehicle.';
    if (!form.date)                 errs.date          = 'Date is required.';
    if (!form.time)                 errs.time          = 'Time is required.';
    if (!form.purposeOfTrip.trim()) errs.purposeOfTrip = 'Purpose of trip is required.';
    return errs;
  };

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
        traveled_by:         getLoggedInUserName(),
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

  const serviceOptions = [
    { key: 'washing',     label: 'Washing',      Icon: LocalCarWashOutlinedIcon },
    { key: 'alignment',   label: 'Alignment',    Icon: TuneOutlinedIcon         },
    { key: 'airChecking', label: 'Air Checking', Icon: AirOutlinedIcon          },
    { key: 'greaseOil',   label: 'Grease / Oil', Icon: OilBarrelOutlinedIcon    },
  ];

  const S = {
    page: {
      height: '100%', minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      overflow: 'hidden', background: '#f0f4f8',
      fontFamily: "'Google Sans', sans-serif",
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
    title: { fontSize: 20, fontWeight: 700, color: '#202124', margin: '0 0 14px 0', letterSpacing: '0.5px', lineHeight: 1.3 },
    body:   { flex: 1, overflowY: 'auto', padding: '12px', boxSizing: 'border-box', width: '100%', minHeight: 0, WebkitOverflowScrolling: 'touch' },
    card:   {
      background: '#fff', borderRadius: 14,
      boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
      padding: '16px', maxWidth: 860, margin: '0 auto', width: '100%', boxSizing: 'border-box',
    },
    sectionLabel: {
      fontSize: '13px', fontWeight: 700, letterSpacing: '1px',
      textTransform: 'uppercase', color: '#1a73e8',
      marginBottom: 10, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6,
      borderBottom: '1.5px solid #e8f0fe',
      paddingBottom: '6px',
    },
    sectionDivider: { border: 'none', borderTop: '1px solid #f0f0f0', margin: '14px 0' },
    grid2: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 },
    grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 },
    formGroup: { display: 'flex', flexDirection: 'column', marginBottom: 4 },
    label: {
      fontSize: '12px', fontWeight: 600, color: '#374151',
      marginBottom: 5, letterSpacing: '0.4px', textTransform: 'capitalize', textAlign: 'left',
    },
    required: { color: '#e74c3c', marginLeft: 3 },
    input: {
      padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8,
      fontSize: 13, fontFamily: "'Google Sans', sans-serif",
      outline: 'none', width: '100%', boxSizing: 'border-box',
      background: '#fff', color: '#202124',
      transition: 'border-color 0.2s, box-shadow 0.2s',
    },
    inputReadonly: {
      background: '#f8f9fa', color: '#e1e4e6', cursor: 'default',
    },
    select: {
      padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8,
      fontSize: 13, fontFamily: "'Google Sans', sans-serif",
      background: '#fff', color: '#202124', outline: 'none',
      width: '100%', cursor: 'pointer', boxSizing: 'border-box',
      transition: 'border-color 0.2s, box-shadow 0.2s', appearance: 'auto',
    },
    inputError: { borderColor: '#d93025', boxShadow: '0 0 0 2px rgba(217,48,37,0.08)' },
    errorMsg:   { color: '#d93025', fontSize: 11, marginTop: 4 },
    serviceGrid:  { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 },
    serviceCard:  (checked) => ({
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 6, padding: '12px 8px', borderRadius: 10, cursor: 'pointer',
      border: `1.5px solid ${checked ? '#1a73e8' : '#e0e0e0'}`,
      background: checked ? '#e8f0fe' : '#fafafa',
      transition: 'all 0.18s', userSelect: 'none',
    }),
    serviceIcon:  (checked) => ({ fontSize: 20, color: checked ? '#1a73e8' : '#9aa0a6' }),
    serviceLabel: (checked) => ({
      fontSize: 10, fontWeight: 700, letterSpacing: '0.4px',
      color: checked ? '#1a73e8' : '#5f6368', textAlign: 'center',
    }),
    odometerBox: {
      borderRadius: 10, padding: '16px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 8, cursor: 'pointer', minHeight: 80,
      border: '1.5px dashed #c8d8e8', background: '#f8fafc',
      transition: 'border-color 0.2s, background 0.2s',
      width: '100%', boxSizing: 'border-box',
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
      display: 'flex', gap: 10, justifyContent: 'flex-end',
      marginTop: 20, paddingTop: 14, borderTop: '1px solid #e8eaed',
    },
    cancelBtn: {
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      padding: '11px 20px', borderRadius: 8,
      border: '1px solid #e8eaed', background: '#fff',
      color: '#5f6368', fontWeight: 700, fontSize: 13, cursor: 'pointer',
      fontFamily: "'Google Sans', sans-serif", transition: 'all 0.18s',
      whiteSpace: 'nowrap', minWidth: 100,
    },
    startBtn: {
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      padding: '11px 24px', borderRadius: 8, border: 'none',
      background: loading ? '#93b8f4' : '#1a73e8',
      color: '#fff', fontWeight: 700, fontSize: 13,
      cursor: loading ? 'not-allowed' : 'pointer',
      fontFamily: "'Google Sans', sans-serif",
      boxShadow: '0 2px 8px rgba(26,115,232,0.28)',
      transition: 'all 0.18s', minWidth: 130,
    },
  };

  const fieldStyle  = (key) => ({ ...S.input,  ...(errors[key] ? S.inputError : {}) });
  const selectStyle = (key) => ({ ...S.select, ...(errors[key] ? S.inputError : {}) });

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .st-input:focus  { border-color: #1a73e8 !important; box-shadow: 0 0 0 2px rgba(26,115,232,0.12) !important; }
        .st-select:focus { border-color: #1a73e8 !important; box-shadow: 0 0 0 2px rgba(26,115,232,0.12) !important; }
        .st-input::placeholder { color: #bdc1c6; font-size: 12px; }
        .st-cancel:hover { background: #f8f9fa !important; color: #202124 !important; }
        .st-start:hover  { background: #1557b0 !important; }
        .st-odometer-box:hover { border-color: #1a73e8 !important; }

        /* Desktop: show inline actions, hide bottom bar */
        .st-actions-bar { display: none !important; }
        .st-actions     { display: flex !important; }

        /* Mobile overrides */
        @media (max-width: 640px) {
          /* Show bottom bar on mobile */
          .st-actions-bar { display: flex !important; }
          .st-actions     { display: none !important; }

          /* Layout — extra bottom padding so content clears the fixed action bar */
          .st-body-scroll   { padding: 10px 10px 100px 10px !important; }
          .st-card          { padding: 14px 12px !important; border-radius: 12px !important; max-width: 100% !important; margin: 0 !important; box-shadow: none !important; border: 1px solid #e8eaed !important; }

          /* Title */
          .st-title         { font-size: 17px !important; margin-bottom: 12px !important; }

          /* Section labels */
          .st-section-label { font-size: 11px !important; margin-bottom: 8px !important; padding-bottom: 5px !important; letter-spacing: 0.8px !important; }

          /* Dividers */
          .st-divider       { margin: 12px 0 !important; }

          /* Grids — all single column on mobile */
          .st-grid3         { grid-template-columns: 1fr !important; gap: 10px !important; }
          .st-grid2         { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }

          /* Vehicle row full width */
          .st-vehicle-row     { width: 100% !important; }

          /* Form fields */
          .st-input, .st-select { font-size: 13px !important; padding: 9px 10px !important; }
          .st-form-group    { margin-bottom: 2px !important; }

          /* Services — 2 per row on mobile */
          .st-service-grid  { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }

          /* Odometer */
          .st-odometer-box  { padding: 14px !important; min-height: 72px !important; }
          .st-odo-img       { max-width: 100% !important; max-height: 160px !important; }
          .st-preview-wrap  { flex-direction: column !important; align-items: flex-start !important; }

          /* Actions bar — fixed at bottom on mobile */
          .st-actions-bar {
            display: flex !important;
            flex-direction: row !important;
            gap: 10px !important;
            padding: 12px 16px !important;
            padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px)) !important;
            background: #fff !important;
            border-top: 1.5px solid #e8eaed !important;
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            z-index: 100 !important;
            box-shadow: 0 -2px 12px rgba(0,0,0,0.08) !important;
          }
          .st-cancel {
            flex: 1 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 5px !important;
            padding: 13px 8px !important;
            font-size: 14px !important;
            font-weight: 600 !important;
            border-radius: 8px !important;
            min-width: 0 !important;
            white-space: nowrap !important;
          }
          .st-start {
            flex: 2 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 5px !important;
            padding: 13px 8px !important;
            font-size: 14px !important;
            font-weight: 700 !important;
            border-radius: 8px !important;
            min-width: 0 !important;
            white-space: nowrap !important;
          }
        }
      `}</style>
      <div style={S.body} className="st-body-scroll">
        <div style={S.card} className="st-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
            <div style={S.headerLeft}>
              <h1 style={S.title} className='st-title'>Start New Trip</h1>
            </div>
          </div>
          <div style={S.sectionLabel} className='st-section-label'>
            <DirectionsCarOutlinedIcon style={{ fontSize: 16 }} />
            Basic Information
          </div>
          <div className="st-vehicle-row" style={{ marginBottom: 12 }}>
            <div style={S.formGroup} className='st-form-group'>
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
          </div>
          <div className="st-grid2" style={{ ...S.grid2, marginBottom: 12 }}>
            <div style={S.formGroup} className='st-form-group'>
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
            <div style={S.formGroup} className='st-form-group'>
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
          <div className="st-grid3" style={{ ...S.grid3, marginTop: 16 }}>
            <div style={S.formGroup} className='st-form-group'>
              <label style={S.label}>
                Purpose of Trip <span style={S.required}>*</span>
              </label>
              <input
                type="text"
                name="purposeOfTrip"
                value={form.purposeOfTrip}
                onChange={handleChange}
                placeholder="e.g., Client visit, Delivery"
                className="st-input"
                style={fieldStyle('purposeOfTrip')}
              />
              {errors.purposeOfTrip && <span style={S.errorMsg}>{errors.purposeOfTrip}</span>}
            </div>
            <div style={S.formGroup} className='st-form-group'>
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
            <div style={S.formGroup} className='st-form-group'>
              <label style={S.label}>Odometer Start (km)</label>
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
          <hr style={S.sectionDivider} className='st-divider' />
          <div style={S.sectionLabel} className='st-section-label'>
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
          <hr style={S.sectionDivider} className='st-divider' />
          <div style={S.sectionLabel} className='st-section-label'>
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
            isMobileDevice() ? (
              <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                <button
                  type="button"
                  onClick={openCamera}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: '1.5px solid #e0e0e0',
                    background: '#fff',
                    color: '#1a73e8',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: "'Google Sans', sans-serif",
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#f0f8ff'}
                  onMouseLeave={(e) => e.target.style.background = '#fff'}
                >
                  <AddAPhotoOutlinedIcon style={{ fontSize: 18 }} />
                  Camera
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: '1.5px solid #e0e0e0',
                    background: '#fff',
                    color: '#1a73e8',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: "'Google Sans', sans-serif",
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#f0f8ff'}
                  onMouseLeave={(e) => e.target.style.background = '#fff'}
                >
                  📁
                  Upload
                </button>
              </div>
            ) : (
              <div
                className="st-odometer-box"
                style={S.odometerBox}
                onClick={() => fileInputRef.current?.click()}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <AddAPhotoOutlinedIcon style={{ fontSize: 26, color: '#1a73e8' }} />
                </div>
                <span style={{ fontSize: 12, color: '#9aa0a6', fontWeight: 500 }}>Click to upload odometer image</span>
              </div>
            )
          ) : (
            <div style={{ display: 'flex', alignItems: isMobileDevice() ? 'stretch' : 'flex-start', gap: 16, flexDirection: isMobileDevice() ? 'column' : 'row' }} className="st-preview-wrap">
              <div style={S.odometerPreviewWrap}>
                <img
                  src={form.odometerImagePreview}
                  alt="Odometer"
                  style={S.odometerPreviewImg}
                  className="st-odo-img"
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
              {isMobileDevice() ? (
                <button
                  type="button"
                  onClick={openCamera}
                  style={{
                    padding: '12px 16px', borderRadius: 8, border: '1.5px solid #e0e0e0',
                    background: '#fff', color: '#1a73e8', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', fontFamily: "'Google Sans', sans-serif",
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%',
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#f0f8ff'}
                  onMouseLeave={(e) => e.target.style.background = '#fff'}
                >
                  <AddAPhotoOutlinedIcon style={{ fontSize: 16 }} />
                  Retake Photo
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: '7px 16px', borderRadius: 8, border: '1px solid #e0e0e0',
                    background: '#fff', color: '#5f6368', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', fontFamily: "'Google Sans', sans-serif",
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  <AddAPhotoOutlinedIcon style={{ fontSize: 14 }} />
                  Change Image
                </button>
              )}
            </div>
          )}
          {errors.odometerImage && (
            <span style={{ ...S.errorMsg, display: 'block', marginTop: 6 }}>
              {errors.odometerImage}
            </span>
          )}
          {/* Desktop inline actions */}
          <div className="st-actions" style={S.actions}>
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
      {/* Fixed bottom action bar for mobile */}
      <div className="st-actions-bar">
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

      {/* Camera Modal */}
      {cameraActive && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.95)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
        }}>
          <canvas ref={canvasRef} style={{ display: "none" }} />

          {!capturedPhoto ? (
            <>
              <div style={{
                position: "relative",
                width: "100%",
                maxWidth: "600px",
                aspectRatio: "4/3",
                background: "#000",
                borderRadius: "12px",
                overflow: "hidden",
                marginBottom: "16px",
              }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>
              <p style={{ color: "#fff", marginBottom: "16px", fontSize: "14px", textAlign: "center" }}>
                📊 Position odometer in frame and tap capture
              </p>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                <button
                  onClick={closeCamera}
                  style={{
                    padding: "12px 24px",
                    background: "#666",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={takePhoto}
                  style={{
                    padding: "12px 32px",
                    background: "#1a73e8",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                  }}
                >
                  📷 Capture
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{
                position: "relative",
                width: "100%",
                maxWidth: "600px",
                aspectRatio: "4/3",
                background: "#000",
                borderRadius: "12px",
                overflow: "hidden",
                marginBottom: "16px",
              }}>
                <img
                  src={capturedPhoto.preview}
                  alt="Captured odometer"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>
              <p style={{ color: "#fff", marginBottom: "16px", fontSize: "14px", textAlign: "center" }}>
                {capturedPhoto.blob.size > 5 * 1024 * 1024
                  ? "⚠ Photo is too large (Max 5MB)"
                  : "✓ Photo ready. Confirm to upload?"}
              </p>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                <button
                  onClick={retakePhoto}
                  style={{
                    padding: "12px 24px",
                    background: "#666",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                  }}
                >
                  Retake
                </button>
                <button
                  onClick={confirmPhoto}
                  disabled={capturedPhoto.blob.size > 5 * 1024 * 1024}
                  style={{
                    padding: "12px 32px",
                    background: capturedPhoto.blob.size > 5 * 1024 * 1024 ? "#999" : "#16a34a",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    cursor: capturedPhoto.blob.size > 5 * 1024 * 1024 ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                  }}
                >
                  ✓ Confirm
                </button>
              </div>
            </>
          )}
        </div>
      )}
      {/* ── IMCB Footer ── */}
      <div style={{ flexShrink:0, padding:"10px 20px", borderTop:"1px solid #e8eaed", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", gap:"6px", marginTop:"auto" }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <span style={{ fontSize:"11px", color:"#9ca3af", fontWeight:500 }}>Powered by</span>
        <span style={{ fontSize:"11px", fontWeight:700, color:"#1a73e8" }}>IMCB Solutions LLP</span>
      </div>
    </div>
  );
};

export default StartTrip;