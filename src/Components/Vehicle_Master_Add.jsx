import React, { useState, useEffect } from 'react';
import AddAPhotoOutlinedIcon from '@mui/icons-material/AddAPhotoOutlined';
import { createVehicle, updateVehicle } from '../service/vehiclemaster';

/**
 * VehicleMasterAdd
 * Props:
 *  - onClose()          : called on Back / cancel
 *  - onSaved(vehicle)   : called after successful create OR update
 *  - editData           : vehicle object from the list (edit mode); null = add mode
 */
const VehicleMasterAdd = ({ onClose, onSaved, editData = null }) => {
  // ── State ───────────────────────────────────────────────────
  const [basicInfo, setBasicInfo] = useState({
    vehicleName: '',
    companyBrand: '',
    registrationNumber: '',
    vehicleType: '',
    ownership: '',
    fuelType: '',
    vehiclePhoto: null,
    vehiclePhotoPreview: null,
  });

  const [ownershipInsurance, setOwnershipInsurance] = useState({
    ownerName: '',
    insuranceNo: '',
    insuranceExpiredDate: '',
    pollutionExpiredDate: '',
  });

  const [maintenance, setMaintenance] = useState({
    lastServiceDate: '',
    nextServiceDate: '',
    currentOdometer: '',
  });

  const [technical, setTechnical] = useState({
    chassisNumber: '',
    engineNumber: '',
  });

  // ✅ FIX: additionalDetails now holds `status` as a proper string field
  // alongside `isActive` (used only for the checkbox UI).
  // `isActive` drives the checkbox; `status` is what gets sent to the API.
  const [additionalDetails, setAdditionalDetails] = useState({
    note: '',
    isActive: true,
    status: 'Active',   // ✅ FIX: explicit status string for the API
  });

  const [loading, setLoading]   = useState(false);
  const [errors,  setErrors]    = useState({});
  const [apiError, setApiError] = useState('');

  // ── Pre-fill form when in edit mode ─────────────────────────
  useEffect(() => {
    if (!editData) return;
    const d = editData;
    setBasicInfo({
      vehicleName:          d.vehicle_name        || '',
      companyBrand:         d.company_brand        || '',
      registrationNumber:   d.registration_number || '',
      vehicleType:          d.vehicle_type         || '',
      ownership:            d.ownership            || '',
      fuelType:             d.fuel_type            || '',
      vehiclePhoto:         null,
      vehiclePhotoPreview:  d.vehicle_photo_url || null,
    });
    setOwnershipInsurance({
      ownerName:            d.owner_name             || '',
      insuranceNo:          d.insurance_no           || '',
      insuranceExpiredDate: d.insurance_expired_date || '',
      pollutionExpiredDate: d.pollution_expired_date || '',
    });
    setMaintenance({
      lastServiceDate: d.last_service_date || '',
      nextServiceDate: d.next_service_date || '',
      currentOdometer: d.current_odometer !== undefined ? String(d.current_odometer) : '',
    });
    setTechnical({
      chassisNumber: d.chassis_number || '',
      engineNumber:  d.engine_number  || '',
    });
    // ✅ FIX: pre-fill both isActive (checkbox) and status (API value)
    const isActive = d.status !== 'Inactive';
    setAdditionalDetails({
      note:     d.note || '',
      isActive,
      status:   isActive ? 'Active' : 'Inactive',
    });
  }, [editData]);

  // ── Handlers ─────────────────────────────────────────────────
  const handleBasicChange = (e) => {
    const { name, value } = e.target;
    setBasicInfo((prev) => ({ ...prev, [name]: value }));
    clearError(name);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setBasicInfo((prev) => ({
        ...prev,
        vehiclePhoto: file,
        vehiclePhotoPreview: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleOwnershipChange = (e) => {
    const { name, value } = e.target;
    setOwnershipInsurance((prev) => ({ ...prev, [name]: value }));
    clearError(name);
  };

  const handleMaintenanceChange = (e) => {
    const { name, value } = e.target;
    setMaintenance((prev) => ({ ...prev, [name]: value }));
    clearError(name);
  };

  const handleTechnicalChange = (e) => {
    const { name, value } = e.target;
    setTechnical((prev) => ({ ...prev, [name]: value }));
    clearError(name);
  };

  // ✅ FIX: when the checkbox changes, sync both `isActive` and `status`
  const handleAdditionalChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'isActive') {
      setAdditionalDetails((prev) => ({
        ...prev,
        isActive: checked,
        status:   checked ? 'Active' : 'Inactive',  // ✅ keep status in sync
      }));
    } else {
      setAdditionalDetails((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  const clearError = (name) => {
    setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
    setApiError('');
  };

  // ── Map API snake_case errors → camelCase keys ───────────────
  const mapApiErrors = (data) => {
    const keyMap = {
      vehicle_name:           'vehicleName',
      company_brand:          'companyBrand',
      registration_number:    'registrationNumber',
      vehicle_type:           'vehicleType',
      fuel_type:              'fuelType',
      owner_name:             'ownerName',
      insurance_no:           'insuranceNo',
      insurance_expired_date: 'insuranceExpiredDate',
      pollution_expired_date: 'pollutionExpiredDate',
      last_service_date:      'lastServiceDate',
      next_service_date:      'nextServiceDate',
      current_odometer:       'currentOdometer',
      chassis_number:         'chassisNumber',
      engine_number:          'engineNumber',
    };
    const mapped = {};
    for (const [key, val] of Object.entries(data || {})) {
      const camel = keyMap[key] || key;
      mapped[camel] = Array.isArray(val) ? val.join(' ') : val;
    }
    return mapped;
  };

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setApiError('');
    setLoading(true);

    // ✅ FIX: `additionalDetails.status` is already correctly set by
    // handleAdditionalChange — just pass additionalDetails directly.
    // No need to re-derive status here; it's always in sync with the checkbox.
    const formState = {
      basicInfo,
      ownershipInsurance,
      maintenance,
      technical,
      additionalDetails,   // already contains { note, isActive, status }
    };

    try {
      let saved;
      if (editData?.id) {
        saved = await updateVehicle(editData.id, formState);
      } else {
        saved = await createVehicle(formState);
      }
      onSaved && onSaved(saved);
    } catch (err) {
      if (err.data && typeof err.data === 'object') {
        const fieldErrors = mapApiErrors(err.data);
        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors);
        } else {
          setApiError(err.message || 'Something went wrong. Please try again.');
        }
      } else {
        setApiError(err.message || 'Network error. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Reset ─────────────────────────────────────────────────────
  const handleReset = () => {
    setBasicInfo({ vehicleName: '', companyBrand: '', registrationNumber: '', vehicleType: '', ownership: '', fuelType: '', vehiclePhoto: null, vehiclePhotoPreview: null });
    setOwnershipInsurance({ ownerName: '', insuranceNo: '', insuranceExpiredDate: '', pollutionExpiredDate: '' });
    setMaintenance({ lastServiceDate: '', nextServiceDate: '', currentOdometer: '' });
    setTechnical({ chassisNumber: '', engineNumber: '' });
    // ✅ FIX: reset status to 'Active' as well
    setAdditionalDetails({ note: '', isActive: true, status: 'Active' });
    setErrors({});
    setApiError('');
  };

  // ── Styles ────────────────────────────────────────────────────
  const styles = {
    container: { height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Google Sans', sans-serif", background: '#f8f9fa' },
    pageHeader: { flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: 56, background: '#fff', borderBottom: '1px solid #e8eaed', gap: 8, flexWrap: 'wrap' },
    pageHeaderLeft: { display: 'flex', flexDirection: 'column', justifyContent: 'center' },
    pageHeaderTag: { fontSize: 10, fontWeight: 700, letterSpacing: '1.6px', textTransform: 'uppercase', color: '#1a73e8', marginBottom: 2, fontFamily: "'Google Sans', sans-serif" },
    pageHeaderTitle: { fontSize: 18, fontWeight: 600, color: '#202124', margin: 0,letterSpacing:"0.08px", lineHeight: 1.2 },
    pageHeaderActions: { display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 },
    backBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, border: '1px solid #e8eaed', background: 'var(--accent)', color: '#f4f4f5', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: "'Google Sans', sans-serif", transition: 'all 0.2s' },
    scrollBody: { flex: 1, overflowY: 'auto', padding: '12px 16px' },
    form: { backgroundColor: '#fff', borderRadius: '14px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', padding: '20px 16px', maxWidth: '900px', margin: '0 auto', width: '100%', boxSizing: 'border-box' },
    apiError: { background: '#fce8e6', border: '1px solid #f5c2be', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#d93025', fontSize: 13, fontFamily: "'Google Sans', sans-serif" },
    section: { marginBottom: '0', padding: '14px 0', borderBottom: '1px solid #f0f0f0' },
    sectionHeader: { display: 'flex', alignItems: 'center', marginBottom: '14px', paddingBottom: '8px', borderBottom: '2px solid #e6e6e9' },
    sectionTitle: { fontSize: '22px', color: 'var(--accent)', margin: 0, fontWeight: 'bold' },
    grid3cols: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '0' },  // mobile: 1col
    grid2cols: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '0' },  // mobile: 1col
    formGroup: { display: 'flex', flexDirection: 'column' },
    label: { textAlign: 'left', fontSize: '14px', fontWeight: '600', marginBottom: '6px', color: 'black', textTransform: 'proper', letterSpacing: '0.8px' },
    required: { color: '#e74c3c', marginLeft: '4px' },
    input: { padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', fontFamily: "'Google Sans', sans-serif", transition: 'border-color 0.2s', outline: 'none', width: '100%', boxSizing: 'border-box' },
    inputError: { borderColor: '#d93025' },
    errorMsg: { color: '#d93025', fontSize: 11, marginTop: 3, fontFamily: "'Google Sans', sans-serif" },
    select: { padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', fontFamily: "'Google Sans', sans-serif", backgroundColor: '#fff', outline: 'none', width: '100%' },
    textarea: { padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', fontFamily: "'Google Sans', sans-serif", resize: 'vertical', width: '100%', outline: 'none', boxSizing: 'border-box' },
    photoArea: { display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' },
    photoBtn: { padding: '9px 20px', color: '#5f6368', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontFamily: "'Google Sans', sans-serif", fontWeight: '600', background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    photoPreview: { marginTop: '10px', position: 'relative', display: 'inline-block' },
    previewImage: { maxWidth: '240px', maxHeight: '180px', borderRadius: '10px', border: '2px solid #ddd', display: 'block' },
    removePhoto: { position: 'absolute', top: '-10px', right: '-10px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    actions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #e0e0e0' },
    resetBtn: { padding: '9px 24px', backgroundColor: 'var(--accent)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontFamily: "'Google Sans', sans-serif", fontWeight: '600' },
    submitBtn: { padding: '9px 24px', backgroundColor: loading ? '#93b8f4' : 'var(--accent)', color: 'white', border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '13px', fontFamily: "'Google Sans', sans-serif", fontWeight: '600', minWidth: 100 },
  };

  const fieldInput = (name, hasError) => ({
    ...styles.input,
    ...(hasError ? styles.inputError : {}),
  });

  return (
    <div style={styles.container}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&display=swap');
        .vm-add-input::placeholder,
        .vm-add-textarea::placeholder {
          font-size: 11px;
          font-family: 'Google Sans', sans-serif;
          color: #aaa;
        }
        @media (max-width: 600px) {
          .vma-grid3 { grid-template-columns: 1fr !important; }
          .vma-grid2 { grid-template-columns: 1fr !important; }
        }
      `}</style>

      
      

      {/* ── Scrollable Form Body ── */}
      <div style={styles.scrollBody}>
        <form onSubmit={handleSubmit} style={styles.form}>

          {/* Top-level API error banner */}
          {apiError && <div style={styles.apiError}>⚠️ {apiError}</div>}


          <div style={styles.pageHeader}>
        <div style={styles.pageHeaderLeft}>
         
          <h1 style={styles.pageHeaderTitle}>{editData ? 'Edit Vehicle' : 'Add New Vehicle'}</h1>
        </div>
        
      </div>

          {/* ── Section 1: Basic Information ── */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={{ ...styles.sectionTitle, fontSize: '15px' }}>Basic Information</h2>
            </div>
            <div className="vma-grid3" style={styles.grid3cols}>
              {/* Vehicle Name */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Vehicle Name <span style={styles.required}>*</span></label>
                <input type="text" name="vehicleName" value={basicInfo.vehicleName}
                  onChange={handleBasicChange} placeholder="e.g., Swift Dzire, Fortuner"
                  className="vm-add-input" style={fieldInput('vehicleName', errors.vehicleName)} required />
                {errors.vehicleName && <span style={styles.errorMsg}>{errors.vehicleName}</span>}
              </div>

              {/* Company / Brand */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Company / Brand</label>
                <input type="text" name="companyBrand" value={basicInfo.companyBrand}
                  onChange={handleBasicChange} placeholder="e.g., Maruti Suzuki, Toyota"
                  className="vm-add-input" style={fieldInput('companyBrand', errors.companyBrand)} />
                {errors.companyBrand && <span style={styles.errorMsg}>{errors.companyBrand}</span>}
              </div>

              {/* Registration Number */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Registration Number <span style={styles.required}>*</span></label>
                <input type="text" name="registrationNumber" value={basicInfo.registrationNumber}
                  onChange={handleBasicChange} placeholder="e.g., MH 01 AB 1234"
                  className="vm-add-input" style={fieldInput('registrationNumber', errors.registrationNumber)} required />
                {errors.registrationNumber && <span style={styles.errorMsg}>{errors.registrationNumber}</span>}
              </div>

              {/* Vehicle Type */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Vehicle Type</label>
                <select name="vehicleType" value={basicInfo.vehicleType} onChange={handleBasicChange} style={styles.select}>
                  <option value="">Select Type</option>
                  <option>Car</option><option>Bike</option><option>Truck</option>
                  <option>Bus</option><option>Van</option><option>Other</option>
                </select>
              </div>

              {/* Ownership */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Ownership</label>
                <select name="ownership" value={basicInfo.ownership} onChange={handleBasicChange} style={styles.select}>
                  <option value="">Select Ownership</option>
                  <option>Personal</option><option>Company</option>
                  <option>Leased</option><option>Rental</option>
                </select>
              </div>

              {/* Fuel Type */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Fuel Type</label>
                <select name="fuelType" value={basicInfo.fuelType} onChange={handleBasicChange} style={styles.select}>
                  <option value="">Select Fuel Type</option>
                  <option>Petrol</option><option>Diesel</option>
                  <option>Electric</option><option>Hybrid</option><option>CNG</option>
                </select>
              </div>
            </div>

            {/* Vehicle Photo */}
            <div style={{ ...styles.formGroup, marginTop: 14 }}>
              <label style={styles.label}>Vehicle Photo</label>
              <div style={styles.photoArea}>
                <input type="file" id="vehiclePhoto" accept="image/*"
                  onChange={handlePhotoChange} style={{ display: 'none' }} />
                <button type="button" style={styles.photoBtn}
                  onClick={() => document.getElementById('vehiclePhoto').click()}>
                  <AddAPhotoOutlinedIcon style={{ fontSize: 20 }} />
                </button>
                {basicInfo.vehiclePhotoPreview && (
                  <div style={styles.photoPreview}>
                    <img src={basicInfo.vehiclePhotoPreview} alt="Vehicle Preview" style={styles.previewImage} />
                    <button type="button" style={styles.removePhoto}
                      onClick={() => {
                        setBasicInfo((prev) => ({ ...prev, vehiclePhoto: null, vehiclePhotoPreview: null }));
                        const inp = document.getElementById('vehiclePhoto');
                        if (inp) inp.value = '';
                      }}>
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Section 2: Ownership & Insurance ── */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={{ ...styles.sectionTitle, fontSize: '15px' }}>Ownership & Insurance</h2>
            </div>
            <div className="vma-grid2" style={styles.grid2cols}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Owner Name <span style={styles.required}>*</span></label>
                <input type="text" name="ownerName" value={ownershipInsurance.ownerName}
                  onChange={handleOwnershipChange} placeholder="Full name of owner"
                  className="vm-add-input" style={fieldInput('ownerName', errors.ownerName)} required />
                {errors.ownerName && <span style={styles.errorMsg}>{errors.ownerName}</span>}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Insurance Number</label>
                <input type="text" name="insuranceNo" value={ownershipInsurance.insuranceNo}
                  onChange={handleOwnershipChange} placeholder="Policy / Insurance No."
                  className="vm-add-input" style={fieldInput('insuranceNo', errors.insuranceNo)} />
                {errors.insuranceNo && <span style={styles.errorMsg}>{errors.insuranceNo}</span>}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Insurance Expired Date</label>
                <input type="date" name="insuranceExpiredDate" value={ownershipInsurance.insuranceExpiredDate}
                  onChange={handleOwnershipChange}
                  className="vm-add-input" style={fieldInput('insuranceExpiredDate', errors.insuranceExpiredDate)} />
                {errors.insuranceExpiredDate && <span style={styles.errorMsg}>{errors.insuranceExpiredDate}</span>}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Pollution Expired Date</label>
                <input type="date" name="pollutionExpiredDate" value={ownershipInsurance.pollutionExpiredDate}
                  onChange={handleOwnershipChange}
                  className="vm-add-input" style={fieldInput('pollutionExpiredDate', errors.pollutionExpiredDate)} />
                {errors.pollutionExpiredDate && <span style={styles.errorMsg}>{errors.pollutionExpiredDate}</span>}
              </div>
            </div>
          </div>

          {/* ── Section 3: Maintenance ── */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={{ ...styles.sectionTitle, fontSize: '15px' }}>Maintenance Section</h2>
            </div>
            <div className="vma-grid3" style={styles.grid3cols}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Last Service Date</label>
                <input type="date" name="lastServiceDate" value={maintenance.lastServiceDate}
                  onChange={handleMaintenanceChange}
                  className="vm-add-input" style={fieldInput('lastServiceDate', errors.lastServiceDate)} />
                {errors.lastServiceDate && <span style={styles.errorMsg}>{errors.lastServiceDate}</span>}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Next Service Date</label>
                <input type="date" name="nextServiceDate" value={maintenance.nextServiceDate}
                  onChange={handleMaintenanceChange}
                  className="vm-add-input" style={fieldInput('nextServiceDate', errors.nextServiceDate)} />
                {errors.nextServiceDate && <span style={styles.errorMsg}>{errors.nextServiceDate}</span>}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Current Odometer (km)</label>
                <input type="number" name="currentOdometer" value={maintenance.currentOdometer}
                  onChange={handleMaintenanceChange} placeholder="e.g., 15200"
                  className="vm-add-input" style={fieldInput('currentOdometer', errors.currentOdometer)} min="0" step="1" />
                {errors.currentOdometer && <span style={styles.errorMsg}>{errors.currentOdometer}</span>}
              </div>
            </div>
          </div>

          {/* ── Section 4: Technical ── */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={{ ...styles.sectionTitle, fontSize: '15px' }}>Technical Section</h2>
            </div>
            <div className="vma-grid2" style={styles.grid2cols}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Chassis Number</label>
                <input type="text" name="chassisNumber" value={technical.chassisNumber}
                  onChange={handleTechnicalChange} placeholder="Unique chassis identification"
                  className="vm-add-input" style={fieldInput('chassisNumber', errors.chassisNumber)} />
                {errors.chassisNumber && <span style={styles.errorMsg}>{errors.chassisNumber}</span>}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Engine Number</label>
                <input type="text" name="engineNumber" value={technical.engineNumber}
                  onChange={handleTechnicalChange} placeholder="Engine serial number"
                  className="vm-add-input" style={fieldInput('engineNumber', errors.engineNumber)} />
                {errors.engineNumber && <span style={styles.errorMsg}>{errors.engineNumber}</span>}
              </div>
            </div>
          </div>

          {/* ── Section 5: Additional Details ── */}
          <div style={{ ...styles.section, borderBottom: 'none' }}>
            <div style={styles.sectionHeader}>
              <h2 style={{ ...styles.sectionTitle, fontSize: '15px' }}>Additional Details</h2>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Note</label>
              <textarea name="note" value={additionalDetails.note}
                onChange={handleAdditionalChange} rows="4"
                placeholder="Any additional remarks, service history notes, or special instructions..."
                className="vm-add-textarea" style={styles.textarea} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <input type="checkbox" id="isActive" name="isActive"
                checked={additionalDetails.isActive}
                onChange={handleAdditionalChange}
                style={{ width: 15, height: 15, accentColor: '#1a73e8', cursor: 'pointer' }} />

              <span style={{
                borderRadius: 20, fontSize: 11, fontWeight: 700,
                color: additionalDetails.isActive ? '#188038' : '#d93025',
                fontFamily: "'Google Sans', sans-serif",
              }}>
                {/* ✅ FIX: label reads from status string for consistency */}
                {additionalDetails.status}
              </span>
            </div>
          </div>

          {/* ── Form Actions ── */}
          <div style={styles.actions}>
            <div style={styles.pageHeaderActions}>
          <button
            type="button" style={styles.backBtn} onClick={onClose}
            onMouseEnter={e => { e.currentTarget.style.background = '#137ce6'; e.currentTarget.style.color = '#fbfbfc'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#1c67d8'; e.currentTarget.style.color = '#f9fbfd'; }}
          >
            Back
          </button>
        </div>
            
            <button type="button" style={styles.resetBtn} onClick={handleReset} disabled={loading}>
              Reset
            </button>
            <button type="submit" style={styles.submitBtn} disabled={loading}>
              {loading ? (editData ? 'Updating…' : 'Saving…') : (editData ? 'Update' : 'Save')}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default VehicleMasterAdd;