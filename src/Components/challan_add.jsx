import { useState, useRef, useEffect, useCallback } from "react";
import { getVehicles, createChallan, updateChallan } from "../service/Api";

const offenceTypes = [
  "Signal Jumping","Over Speeding","Drunk Driving","Wrong Parking",
  "No Helmet","No Seatbelt","Using Mobile While Driving","Overloading",
  "No License","No Insurance","Triple Riding","Lane Violation","Other",
];

const today = new Date().toISOString().split("T")[0];

// Mobile detection utility
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         window.innerWidth <= 768;
};

function ChallanAdd({ onBack, onSuccess, initialData }) {
  const isEdit = Boolean(initialData?.id);

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchVehicles = useCallback(async () => {
    try {
      const data = await getVehicles({ status: "Active" });
      const list = Array.isArray(data) ? data : (data.results || []);
      setVehicles(list);
    } catch (err) {
      console.error("Failed to load vehicles:", err);
      setError("Failed to load vehicles. Please refresh.");
    }
  }, []);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  const buildInitial = () => ({
    vehicle:       initialData?.vehicle        ?? "",
    date:          initialData?.date           ?? today,
    challanNo:     initialData?.challan_no     ?? "",
    challanDate:   initialData?.challan_date   ?? today,
    offenceType:   initialData?.offence_type   ?? "",
    location:      initialData?.location       ?? "",
    fineAmount:    initialData?.fine_amount     ?? "",
    paymentStatus: initialData?.payment_status ?? "Pending",
    remark:        initialData?.remark         ?? "",
  });

  const [form, setForm]                   = useState(buildInitial);
  const [challanDoc, setChallanDoc]       = useState(null);
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const [submitted, setSubmitted]         = useState(false);
  const [errors, setErrors]               = useState({});
  const challanDocRef = useRef();
  const receiptRef    = useRef();

  // Camera states
  const [cameraMode, setCameraMode]       = useState(null); // null, "challan", or "receipt"
  const [cameraStream, setCameraStream]   = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const videoRef = useRef();
  const canvasRef = useRef();

  // Re-populate form whenever initialData changes (e.g. switching between edit records)
  useEffect(() => {
    setForm(buildInitial());
    setChallanDoc(null);
    setPaymentReceipt(null);
    setErrors({});
    setError(null);
  }, [initialData?.id]);

  // Open camera
  const openCamera = async (mode) => {
    try {
      setCameraMode(mode);
      setCapturedPhoto(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      setCameraStream(stream);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error("Camera error:", err);
      setError("Failed to access camera. Please check permissions.");
      setCameraMode(null);
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
          const file = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
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
  const confirmPhoto = async () => {
    if (!capturedPhoto) return;

    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (capturedPhoto.blob.size > MAX_FILE_SIZE) {
      setError(`Photo is too large (${(capturedPhoto.blob.size / 1024 / 1024).toFixed(2)}MB). Maximum 5MB.`);
      return;
    }

    if (cameraMode === "challan") {
      setChallanDoc(capturedPhoto.file);
    } else if (cameraMode === "receipt") {
      setPaymentReceipt(capturedPhoto.file);
    }

    closeCamera();
  };

  // Close camera
  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
    setCameraMode(null);
    setCapturedPhoto(null);
  };

  const validate = () => {
    const e = {};
    if (!form.vehicle || form.vehicle === "")
      e.vehicle = "Required";
    if (!form.challanNo)   e.challanNo   = "Required";
    if (!form.challanDate) e.challanDate = "Required";
    if (!form.offenceType) e.offenceType = "Required";
    if (!form.fineAmount || isNaN(form.fineAmount) || Number(form.fineAmount) <= 0)
      e.fineAmount = "Enter a valid amount greater than 0";
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    setErrors(err => ({ ...err, [name]: undefined }));
  };

  const handleFile = (e, setter) => {
    const f = e.target.files[0];
    if (!f) return;

    // Maximum 5MB file size
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    
    if (f.size > MAX_FILE_SIZE) {
      setError(`File is too large (${(f.size / 1024 / 1024).toFixed(2)}MB). Maximum allowed size is 5MB.`);
      e.target.value = '';
      return;
    }

    setter(f);
    setError(null);
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        vehicle:       form.vehicle,
        date:          form.date,
        challanNo:     form.challanNo,
        challanDate:   form.challanDate,
        offenceType:   form.offenceType,
        location:      form.location || "N/A",
        fineAmount:    form.fineAmount,
        paymentStatus: form.paymentStatus,
        remark:        form.remark,
        challanDoc:    challanDoc,
        paymentReceipt: paymentReceipt,
      };

      if (isEdit) {
        await updateChallan(initialData.id, payload);
      } else {
        await createChallan(payload);
      }

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        handleReset();
        if (onSuccess) onSuccess();
        else if (onBack) onBack();
      }, 2000);

    } catch (err) {
      console.error("Submission failed:", err);
      // Map backend field errors to inline field errors
      const data = err?.data || {};
      const fieldMap = {
        challan_no:     "challanNo",
        vehicle:        "vehicle",
        challan_date:   "challanDate",
        offence_type:   "offenceType",
        fine_amount:    "fineAmount",
      };
      const fieldErrors = {};
      let hasFieldError = false;
      Object.entries(data).forEach(([k, v]) => {
        const mapped = fieldMap[k];
        if (mapped) {
          fieldErrors[mapped] = Array.isArray(v) ? v.join(", ") : String(v);
          hasFieldError = true;
        }
      });
      if (hasFieldError) {
        setErrors(prev => ({ ...prev, ...fieldErrors }));
      } else {
        setError(err.message || "Failed to submit challan. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm(buildInitial());
    setChallanDoc(null);
    setPaymentReceipt(null);
    setErrors({});
    setError(null);
  };

  const Sel = ({ children }) => (
    <div style={{ position:"relative" }}>
      {children}
      <span style={s.chevron}>▾</span>
    </div>
  );
  const Sep = () => <hr style={s.sep} />;
  const Section = ({ title }) => <div style={s.section}>{title}</div>;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        body { background:#f0f4f8; font-family: 'Google Sans', sans-serif; }
        
        input[type=date]::-webkit-calendar-picker-indicator { cursor:pointer; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; }

        .ci, .cs, .ct {
          width:100%;
          background:#fff;
          border:1px solid #e6e1e1;
          border-radius:8px;
          color:black;
          font-family:'Google Sans', sans-serif;
          font-size:14px;
          padding:9px 13px;
          outline:none;
          appearance:none;
          transition:border-color .2s, box-shadow .2s;
        }
        
        @media (max-width: 768px) {
          .ci, .cs, .ct {
            font-size:16px;
            padding:12px 13px;
          }
        }
        
        .ci:focus,.cs:focus,.ct:focus {
          border-color:#2563eb;
          box-shadow:0 0 0 3px rgba(37,99,235,.13);
        }
        .ci.err,.cs.err { border-color:#ef4444; }
        .cs option { background:#fff; color:#1e293b; }
        .ct { resize:vertical; min-height:84px; }

        .cfile {
          display:flex;
          align-items:center;
          gap:10px;
          width:100%;
          background:#f8fafc;
          border:1px dashed #cbd5e1;
          border-radius:8px;
          padding:9px 14px;
          color:#94a3b8;
          font-family:'Google Sans', sans-serif;
          font-size:14px;
          cursor:pointer;
          transition:all .18s;
          text-align:left;
        }
        
        .cfile:hover { border-color:#2563eb; color:#2563eb; background:#eff6ff; }

        .cbtn-submit {
          padding:11px 34px;
          background:linear-gradient(135deg,#2563eb,#1d4ed8);
          border:none;
          border-radius:9px;
          color:#fff;
          font-family:'Google Sans', sans-serif;
          font-weight:700;
          font-size:.88rem;
          letter-spacing:.04em;
          cursor:pointer;
          box-shadow:0 4px 14px rgba(37,99,235,.3);
          transition:opacity .2s,transform .15s;
        }
        
        @media (max-width: 768px) {
          .cbtn-submit {
            padding:12px 24px;
            font-size:16px;
          }
        }
        
        .cbtn-submit:disabled { opacity:.6; cursor:not-allowed; }
        .cbtn-submit:hover:not(:disabled) { opacity:.88; transform:translateY(-1px); }

        .cbtn-reset, .cbtn-cancel {
          padding:11px 22px;
          background:#fff;
          border:1px solid #d1d9e0;
          border-radius:9px;
          color:#64748b;
          font-family:'Google Sans', sans-serif;
          font-size:.86rem;
          cursor:pointer;
          transition:all .18s;
        }
        
        @media (max-width: 768px) {
          .cbtn-reset, .cbtn-cancel {
            padding:12px 18px;
            font-size:14px;
          }
        }
        
        .cbtn-reset:hover { background:#f1f5f9; color:#1e293b; border-color:#94a3b8; }
        .cbtn-cancel:hover { background:#ffff; color:#757272; border-color:#757272; }

        .ctoast {
          position:fixed;
          bottom:28px;
          left:50%;
          transform:translateX(-50%) translateY(70px);
          background:#fff;
          border:1px solid rgba(34,197,94,.4);
          border-radius:10px;
          padding:12px 22px;
          display:flex;
          align-items:center;
          gap:10px;
          font-size:.86rem;
          color:#16a34a;
          box-shadow:0 8px 30px rgba(0,0,0,.1);
          transition:transform .4s cubic-bezier(.34,1.56,.64,1),opacity .3s;
          opacity:0;
          z-index:999;
          white-space:nowrap;
        }
        
        @media (max-width: 768px) {
          .ctoast {
            font-size:14px;
            padding:10px 18px;
            white-space:nowrap;
          }
        }
        
        .ctoast.show { transform:translateX(-50%) translateY(0); opacity:1; }

        /* ── Mobile fit ── */
        @media (max-width: 600px) {
          .ca-root    { padding: 10px 10px 140px 10px !important; }
          .ca-card    { padding: 14px 12px !important; border-radius: 10px !important; }
          .ca-h4      { font-size: 17px !important; margin-bottom: 10px !important; }
          .ct         { min-height: 100px !important; margin-bottom: 8px !important; }

          /* Pin actions bar to bottom of screen */
          .ca-actions {
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            z-index: 100 !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            gap: 10px !important;
            padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px)) !important;
            background: #fff !important;
            border-top: 1.5px solid #e2e8f0 !important;
            box-shadow: 0 -2px 12px rgba(0,0,0,0.08) !important;
            margin-top: 0 !important;
          }
          .ca-actions button {
            flex: 1 !important;
            min-width: 0 !important;
            justify-content: center !important;
            padding: 13px 8px !important;
            font-size: 14px !important;
            font-weight: 600 !important;
            border-radius: 8px !important;
            white-space: nowrap !important;
          }
          .ca-actions .cbtn-submit {
            flex: 2 !important;
          }
        }`}</style>

      <div style={s.root} className="ca-root">
        <div style={s.container}>
          <div style={s.card} className="ca-card">
            <h4 className="ca-h4" style={{ textAlign:"left", fontSize:"20px", fontWeight:"bold", fontFamily:"'Google Sans', sans-serif", marginBottom: 14 }}>
              {isEdit ? "Edit Challan" : "Add New Challan"}
            </h4>
            <Section title="Basic Information" />

            <div style={s.inlineRow}>
              <div style={s.inlineField}>
                <label style={s.inlineLabel}>Vehicle <span style={s.req}>*</span></label>
                <Sel>
                  <select name="vehicle" className={`cs${errors.vehicle?" err":""}`}
                    value={form.vehicle} onChange={handleChange}>
                    <option value="">— Select Vehicle —</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.registration_number} - {v.vehicle_name || v.model}
                      </option>
                    ))}
                  </select>
                </Sel>
                {errors.vehicle && <div style={s.errText}>{errors.vehicle}</div>}
              </div>
              <div style={s.inlineField}>
                <label style={s.inlineLabel}>Detail Date (Violation Date)</label>
                <input type="date" name="date" className="ci"
                  value={form.date} onChange={handleChange} />
              </div>
            </div>

            <div style={s.inlineRow}>
              <div style={s.inlineField}>
                <label style={s.inlineLabel}>Challan No <span style={s.req}>*</span></label>
                <input type="text" name="challanNo"
                  className={`ci${errors.challanNo?" err":""}`}
                  placeholder="e.g. CH-2024-00123"
                  value={form.challanNo} onChange={handleChange} />
                {errors.challanNo && <div style={s.errText}>{errors.challanNo}</div>}
              </div>
              <div style={s.inlineField}>
                <label style={s.inlineLabel}>Challan Date <span style={s.req}>*</span></label>
                <input type="date" name="challanDate"
                  className={`ci${errors.challanDate?" err":""}`}
                  value={form.challanDate} onChange={handleChange} />
                {errors.challanDate && <div style={s.errText}>{errors.challanDate}</div>}
              </div>
            </div>

            <Sep />
            <Section title="Offence Details" />

            <div style={s.inlineRow}>
              <div style={s.inlineField}>
                <label style={s.inlineLabel}>Offence Type <span style={s.req}>*</span></label>
                <Sel>
                  <select name="offenceType" className={`cs${errors.offenceType?" err":""}`}
                    value={form.offenceType} onChange={handleChange}>
                    <option value="">— Select Offence —</option>
                    {offenceTypes.map(o=><option key={o}>{o}</option>)}
                  </select>
                </Sel>
                {errors.offenceType && <div style={s.errText}>{errors.offenceType}</div>}
              </div>
              <div style={s.inlineField}>
                <label style={s.inlineLabel}>Location</label>
                <input type="text" name="location"
                  className="ci"
                  placeholder="e.g. NH 766, Kalpetta Bypass"
                  value={form.location} onChange={handleChange} />
              </div>
              <div style={s.inlineField}>
                <label style={s.inlineLabel}>Fine Amount (₹) <span style={s.req}>*</span></label>
                <input type="number" name="fineAmount" min="1"
                  className={`ci${errors.fineAmount?" err":""}`}
                  placeholder="0.00"
                  value={form.fineAmount} onChange={handleChange} />
                {errors.fineAmount && <div style={s.errText}>{errors.fineAmount}</div>}
              </div>
              
              
            </div>

            <Sep />
            <Section title="Documents" />

            <div style={s.inlineRow}>
              <div style={s.inlineField}>
                <label style={s.inlineLabel}>Challan Document</label>
                {isMobileDevice() ? (
                  <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                    <button type="button" className="cfile" style={{ flex: 1 }}
                      onClick={()=>openCamera("challan")}>
                      <span style={{color:challanDoc?"#2563eb":"inherit", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                        {challanDoc
                          ? challanDoc.name
                          : "📷 Camera"}
                      </span>
                    </button>
                    <button type="button" className="cfile" style={{ flex: 1 }}
                      onClick={() => challanDocRef.current?.click()}>
                      <span>📁 Upload</span>
                    </button>
                  </div>
                ) : (
                  <input
                    type="file"
                    ref={challanDocRef}
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const MAX_FILE_SIZE = 5 * 1024 * 1024;
                        if (file.size > MAX_FILE_SIZE) {
                          setError(`File is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum 5MB.`);
                          return;
                        }
                        setChallanDoc(file);
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                )}
                <small style={{marginTop:"4px", display:"block", color:"#6b7280", fontSize:"11px"}}>
                  {isMobileDevice() ? "Camera or upload (Max 5MB)" : "Upload file (Max 5MB)"}
                </small>
                {!isMobileDevice() && !challanDoc && !initialData?.challan_doc_url && (
                  <button
                    type="button"
                    className="cfile"
                    onClick={() => challanDocRef.current?.click()}
                    style={{ marginTop: '8px' }}
                  >
                    📁 Choose File
                  </button>
                )}
                {(challanDoc || initialData?.challan_doc_url) && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#2563eb' }}>
                    {challanDoc ? challanDoc.name : "📄 Existing file"}
                  </div>
                )}
              </div>
              <div style={s.inlineField}>
                <label style={s.inlineLabel}>Payment Receipt</label>
                {isMobileDevice() ? (
                  <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                    <button type="button" className="cfile" style={{ flex: 1 }}
                      onClick={()=>openCamera("receipt")}>
                      <span style={{color:paymentReceipt?"#2563eb":"inherit", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                        {paymentReceipt
                          ? paymentReceipt.name
                          : "📷 Camera"}
                      </span>
                    </button>
                    <button type="button" className="cfile" style={{ flex: 1 }}
                      onClick={() => receiptRef.current?.click()}>
                      <span>📁 Upload</span>
                    </button>
                  </div>
                ) : (
                  <input
                    type="file"
                    ref={receiptRef}
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const MAX_FILE_SIZE = 5 * 1024 * 1024;
                        if (file.size > MAX_FILE_SIZE) {
                          setError(`File is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum 5MB.`);
                          return;
                        }
                        setPaymentReceipt(file);
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                )}
                <small style={{marginTop:"4px", display:"block", color:"#6b7280", fontSize:"11px"}}>
                  {isMobileDevice() ? "Camera or upload (Max 5MB)" : "Upload file (Max 5MB)"}
                </small>
                {!isMobileDevice() && !paymentReceipt && !initialData?.payment_receipt_url && (
                  <button
                    type="button"
                    className="cfile"
                    onClick={() => receiptRef.current?.click()}
                    style={{ marginTop: '8px' }}
                  >
                    📁 Choose File
                  </button>
                )}
                {(paymentReceipt || initialData?.payment_receipt_url) && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#2563eb' }}>
                    {paymentReceipt ? paymentReceipt.name : "📄 Existing file"}
                  </div>
                )}
              </div>
            </div>

            <Sep />

            <div style={s.inlineField}>
              <label style={s.inlineLabel}>Remark</label>
              <textarea name="remark" className="ct"
                placeholder="Additional notes about the violation…"
                value={form.remark} onChange={handleChange} />
            </div>

            {error && (
              <div style={{...s.errText, marginTop:16, padding:12, background:"#fee2e2", borderRadius:8, textAlign:"center"}}>
                {error}
              </div>
            )}

            <div style={s.actions} className="ca-actions">
              <button type="button" className="cbtn-reset" onClick={handleReset} disabled={loading}>Reset</button>
              <button type="button" className="cbtn-cancel" onClick={onBack} disabled={loading}>Cancel</button>
              <button type="button" className="cbtn-submit" onClick={handleSubmit} disabled={loading}>
                {loading ? (isEdit ? "Saving..." : "Submitting...") : (isEdit ? "Save Changes" : "Submit")}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={`ctoast${submitted?" show":""}`}>
        <span>✅</span> Challan {isEdit ? "updated" : "submitted"} successfully!
      </div>

      {/* Camera Modal */}
      {cameraMode && (
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
              <p style={{ color: "#fff", marginBottom: "16px", fontSize: "14px" }}>
                Position document in frame and tap capture
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
                    background: "#2563eb",
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
                  alt="Captured"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>
              <p style={{ color: "#fff", marginBottom: "16px", fontSize: "14px" }}>
                {capturedPhoto.blob.size > 5 * 1024 * 1024
                  ? "⚠ Photo is too large"
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
    </>
  );
}

const s = {
  root: {
    minHeight:"100vh",
    overflowY:"auto",
    background:"#f0f4f8",
    fontFamily:"'Google Sans', sans-serif",
    color:"#1e293b",
    padding:"16px",
    width:"100%",
    boxSizing:"border-box",
  },
  container: { 
    maxWidth:820, 
    margin:"0 auto", 
    boxSizing:"border-box",
  },
  card: {
    background:"#ffffff",
    border:"1px solid #e2e8f0",
    borderRadius:14,
    padding:"20px 18px",
    boxShadow:"0 2px 12px rgba(0,0,0,.06)",
  },
  section: {
    fontFamily:"'Google Sans', sans-serif",
    fontWeight:600,
    fontSize:"15px",
    letterSpacing:"0.4px",
    textTransform:"capitalize",
    color:"#000000",
    marginBottom:10,
    textAlign:"left",
  },
  req: { color:"#ef4444", fontSize:"0.75rem", marginLeft:1 },
  errText: { fontSize:"0.7rem", color:"#ef4444", marginTop:4 },
  chevron: {
    position:"absolute",
    right:13,
    top:"50%",
    transform:"translateY(-50%)",
    color:"#2563eb",
    fontSize:"0.8rem",
    pointerEvents:"none",
  },
  inlineRow: {
    display:"grid",
    gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))",
    gap:"12px 16px",
    marginBottom:12,
    alignItems:"start",
  },
  inlineField: { 
    display:"flex", 
    flexDirection:"column", 
    gap:5,
    minWidth:0,
  },
  inlineLabel: {
    fontSize:"12px",
    color:"#000000",
    fontWeight:600,
    fontFamily:"'Google Sans', sans-serif",
    textAlign:"left",
  },
  sep: { border:"none", borderTop:"1px solid #e2e8f0", margin:"16px 0" },
  actions: {
    display:"flex",
    justifyContent:"flex-end",
    gap:10,
    marginTop:20,
    paddingTop:16,
    borderTop:"1px solid #e2e8f0",
    flexWrap:"wrap",
  },
};

// Add responsive styles
const responsiveStyles = `
@media (max-width: 768px) {
  .cbtn-submit, .cbtn-reset, .cbtn-cancel {
    flex: 1;
    min-width: 100px;
  }
  
  .cfile span {
    font-size: 12px;
  }
}
`;

// Inject responsive styles
const styleSheet = document.createElement("style");
styleSheet.textContent = responsiveStyles;
document.head.appendChild(styleSheet);

export default ChallanAdd;