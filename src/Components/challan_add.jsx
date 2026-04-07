import { useState, useRef, useEffect, useCallback } from "react";
import { getVehicles } from "../service/vehiclemaster";
import { createChallan, updateChallan } from "../service/challan";

const offenceTypes = [
  "Signal Jumping","Over Speeding","Drunk Driving","Wrong Parking",
  "No Helmet","No Seatbelt","Using Mobile While Driving","Overloading",
  "No License","No Insurance","Triple Riding","Lane Violation","Other",
];

const today = new Date().toISOString().split("T")[0];

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

  // Re-populate form whenever initialData changes (e.g. switching between edit records)
  useEffect(() => {
    setForm(buildInitial());
    setChallanDoc(null);
    setPaymentReceipt(null);
    setErrors({});
    setError(null);
  }, [initialData?.id]);

  const validate = () => {
    const e = {};
    if (!form.vehicle || form.vehicle === "")
      e.vehicle = "Required";
    if (!form.challanNo)   e.challanNo   = "Required";
    if (!form.challanDate) e.challanDate = "Required";
    if (!form.offenceType) e.offenceType = "Required";
    if (!form.location)    e.location    = "Required";
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
    if (f) setter(f);
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
        location:      form.location,
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
      const messages = Object.entries(err)
        .filter(([k]) => k !== "_status")
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
        .join(" | ");
      setError(messages || "Failed to submit challan. Please try again.");
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
        @import url('https://api.fontshare.com/v2/css?f[]=nohemi@300,400,500,600,700,800&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        body { background:#f0f4f8; }
        
        input[type=date]::-webkit-calendar-picker-indicator { cursor:pointer; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; }

        .ci, .cs, .ct {
          width:100%;
          background:#fff;
          border:1px solid #e6e1e1;
          border-radius:8px;
          color:black;
          font-family:'Nohemi',sans-serif;
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
          font-family:'Nohemi',sans-serif;
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
          font-family:'Nohemi',sans-serif;
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
          font-family:'Nohemi',sans-serif;
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
      `}</style>

      <div style={s.root}>
        <div style={s.container}>
          <div style={s.card}>
            <h4 style={{ textAlign:"left", fontSize:"20px", fontWeight:"bold" }}>
              {isEdit ? "Edit Challan" : "Add New Challan"}
            </h4>
            <Section title="Basic Info" />

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
                <label style={s.inlineLabel}>Location <span style={s.req}>*</span></label>
                <input type="text" name="location"
                  className={`ci${errors.location?" err":""}`}
                  placeholder="e.g. NH 766, Kalpetta Bypass"
                  value={form.location} onChange={handleChange} />
                {errors.location && <div style={s.errText}>{errors.location}</div>}
              </div>
              <div style={s.inlineField}>
                <label style={s.inlineLabel}>Fine Amount (₹) <span style={s.req}>*</span></label>
                <input type="number" name="fineAmount" min="1"
                  className={`ci${errors.fineAmount?" err":""}`}
                  placeholder="0.00"
                  value={form.fineAmount} onChange={handleChange} />
                {errors.fineAmount && <div style={s.errText}>{errors.fineAmount}</div>}
              </div>
              <div style={s.inlineField}>
                <label style={s.inlineLabel}>Payment Status</label>
                <Sel>
                  <select name="paymentStatus" className="cs"
                    value={form.paymentStatus} onChange={handleChange}>
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Waived">Waived</option>
                  </select>
                </Sel>
              </div>
            </div>

            <Sep />
            <Section title="Documents" />

            <div style={s.inlineRow}>
              <div style={s.inlineField}>
                <label style={s.inlineLabel}>Challan Document</label>
                <button type="button" className="cfile"
                  onClick={()=>challanDocRef.current.click()}>
                  <span style={{color:challanDoc?"#2563eb":"inherit", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                    {challanDoc
                      ? challanDoc.name
                      : initialData?.challan_doc_url
                        ? "📄 Replace existing file"
                        : "Upload Challan Doc"}
                  </span>
                </button>
                <input ref={challanDocRef} type="file" accept=".pdf,.jpg,.jpeg,.png"
                  style={{display:"none"}} onChange={e=>handleFile(e,setChallanDoc)} />
              </div>
              <div style={s.inlineField}>
                <label style={s.inlineLabel}>Payment Receipt</label>
                <button type="button" className="cfile"
                  onClick={()=>receiptRef.current.click()}>
                  <span style={{color:paymentReceipt?"#2563eb":"inherit", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                    {paymentReceipt
                      ? paymentReceipt.name
                      : initialData?.payment_receipt_url
                        ? "📄 Replace existing file"
                        : "Upload Payment Receipt"}
                  </span>
                </button>
                <input ref={receiptRef} type="file" accept=".pdf,.jpg,.jpeg,.png"
                  style={{display:"none"}} onChange={e=>handleFile(e,setPaymentReceipt)} />
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

            <div style={s.actions}>
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
    </>
  );
}

const s = {
  root: {
    minHeight:"100vh",
    overflowY:"auto",
    background:"#f0f4f8",
    fontFamily:"'Nohemi',sans-serif",
    color:"#1e293b",
    padding:"28px 28px 40px",
    width:"100%",
    boxSizing:"border-box",
  },
  container: { 
    maxWidth:820, 
    margin:"0 auto", 
    boxSizing:"border-box",
    padding: "0 16px",
  },
  card: {
    background:"#ffffff",
    border:"1px solid #e2e8f0",
    borderRadius:16,
    padding:"28px 32px",
    boxShadow:"0 2px 12px rgba(0,0,0,.06)",
  },
  section: {
    fontFamily:"'Nohemi',sans-serif",
    fontWeight:600,
    fontSize:"15px",
    letterSpacing:"0.18em",
    textTransform:"capitalize",
    color:"#2563eb",
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
    gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))",
    gap:"12px 20px",
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
    color:"#0a0a0a",
    fontWeight:600,
    fontFamily:"'Nohemi',sans-serif",
    textAlign:"left",
  },
  sep: { border:"none", borderTop:"1px solid #e2e8f0", margin:"16px 0" },
  actions: {
    display:"flex",
    justifyContent:"flex-end",
    gap:12,
    marginTop:24,
    paddingTop:20,
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