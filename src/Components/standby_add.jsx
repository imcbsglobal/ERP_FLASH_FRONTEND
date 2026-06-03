import { useState, useRef, useEffect } from "react";
import { apiFetch, authHeaders, ENDPOINTS, getUsers, getAllDebtors } from "../service/Api";

function getLoggedUserName() {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    const name = u.full_name || u.name || u.first_name || u.username || u.email || "";
    if (name && name.trim()) return name.trim();
    const token = localStorage.getItem("access_token") || "";
    if (token) {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.username || payload.name || payload.email || "";
    }
    return "";
  } catch { return ""; }
}

const initialForm = {
  receivedDate: "",
  personName: "",
  phoneNumber: "",
  employee1: getLoggedUserName(),
  employee2: "",
  // Customer
  customerName: "",
  customerPlace: "",
  customerPhone: "",
  // Product
  product: "",
  model: "",
  serialNo: "",
  // Notes
  notes: "",
};

export default function StandbyAdd({ onBack, editRow }) {
  const [form, setForm] = useState(() => ({ ...initialForm, employee1: getLoggedUserName() }));
  const [images, setImages] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [userOptions, setUserOptions] = useState([]);
  const [debtors, setDebtors] = useState([]);       // [{ name, place, phone }]
  const [debtorsLoading, setDebtorsLoading] = useState(true);

  useEffect(() => {
    getUsers({ status: "Active" })
      .then((data) => {
        const results = data?.results ?? [];
        setUserOptions(results.map((u) => u.username).filter(Boolean));
      })
      .catch(() => setUserOptions([]));
  }, []);

  useEffect(() => {
    setDebtorsLoading(true);
    getAllDebtors()
      .then((list) => setDebtors(list))
      .catch(() => setDebtors([]))
      .finally(() => setDebtorsLoading(false));
  }, []);

  // Populate form when editing an existing record
  useEffect(() => {
    if (editRow) {
      const r = editRow;
      setForm({
        receivedDate:  r.received_date   || "",
        personName:    r.person_name     || "",
        phoneNumber:   r.phone_number    || "",
        employee1:     r.employee1       || "",
        employee2:     r.employee2       || "",
        customerName:  r.customer_name   || "",
        customerPlace: r.customer_place  || "",
        customerPhone: r.customer_phone  || "",
        product:       r.product         || "",
        model:         r.model           || "",
        serialNo:      r.serial_no       || "",
        notes:         r.notes           || "",
      });
      // Load existing images as previews (no File object — won't be re-uploaded)
      if (Array.isArray(r.images) && r.images.length > 0) {
        setImages(
          r.images.map((img) => ({
            id:   img.id,
            name: img.name || `image-${img.id}`,
            url:  img.image_url,
            file: null, // null = already saved, skip on upload
          }))
        );
      } else {
        setImages([]);
      }
    }
  }, [editRow]);
  const fileInputRef = useRef(null);

  const productSelected = form.product.trim() !== "";

  // ── Image helpers ───────────────────────────────────────────
  const handleImageFiles = (files) => {
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (e) =>
        setImages((prev) => [
          ...prev,
          { id: Date.now() + Math.random(), name: file.name, url: e.target.result, file },
        ]);
      reader.readAsDataURL(file);
    });
  };

  const handleImageDrop = (e) => {
    e.preventDefault();
    handleImageFiles(e.dataTransfer.files);
  };

  const removeImage = (id) => setImages((prev) => prev.filter((img) => img.id !== id));

  // ── Form helpers ────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((er) => ({ ...er, [name]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.receivedDate) e.receivedDate = "Required";
    if (!form.personName.trim()) e.personName = "Required";
    if (!form.customerName.trim()) e.customerName = "Required";
    if (!form.customerPhone.trim()) e.customerPhone = "Required";
    else if (!/^\+?[\d\s\-()]{7,15}$/.test(form.customerPhone))
      e.customerPhone = "Invalid number";
    if (!form.product.trim()) e.product = "Required";
    if (!form.serialNo.trim()) e.serialNo = "Required";
    return e;
  };

  // When a customer is picked, auto-fill place & phone
  const handleCustomerSelect = (e) => {
    const selectedName = e.target.value;
    const match = debtors.find((d) => d.name === selectedName);
    setForm((f) => ({
      ...f,
      customerName:  selectedName,
      customerPlace: match ? match.place : f.customerPlace,
      customerPhone: match ? match.phone : f.customerPhone,
    }));
    setErrors((er) => ({ ...er, customerName: undefined, customerPhone: undefined }));
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    setSaving(true);
    setSaveError("");

    const payload = {
      received_date:   form.receivedDate,
      person_name:     form.personName,
      phone_number:    form.phoneNumber,
      employee1:       form.employee1,
      employee2:       form.employee2,
      customer_name:   form.customerName,
      customer_place:  form.customerPlace,
      customer_phone:  form.customerPhone,
      product:         form.product,
      model:           form.model,
      serial_no:       form.serialNo,
      notes:           form.notes,
    };

    const uploadImages = async (standbyId) => {
      const pendingImages = images.filter((img) => img.file instanceof File);
      await Promise.all(pendingImages.map((img) => {
        const imagePayload = new FormData();
        imagePayload.append("image", img.file);
        imagePayload.append("name", img.name);
        return apiFetch(ENDPOINTS.standbyImages(standbyId), {
          method: "POST",
          headers: authHeaders(),
          body: imagePayload,
        });
      }));
    };

    try {
      let savedStandby = null;
      if (editRow) {
        savedStandby = await apiFetch(ENDPOINTS.standby(editRow.id), {
          method: "PATCH",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        savedStandby = await apiFetch(ENDPOINTS.standbys, {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      if (savedStandby?.id) {
        await uploadImages(savedStandby.id);
      }
      setSubmitted(true);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({ ...initialForm, employee1: getLoggedUserName() });
    setImages([]);
    setErrors({});
    setSubmitted(false);
    if (onBack) onBack();
  };

  // ── Success screen ──────────────────────────────────────────
  if (submitted) {
    return (
      <div style={styles.page}>
        <div style={styles.successCard}>
          <div style={styles.successIcon}>✓</div>
          <h2 style={styles.successTitle}>{editRow ? "Standby Record Updated" : "Standby Request Submitted"}</h2>
          <p style={styles.successSub}>
            Entry for <strong>{form.customerName}</strong> has been recorded.
          </p>
          <div style={styles.successDetails}>
            {[
              ["Customer", form.customerName],
              ["Place", form.customerPlace || "—"],
              ["Phone", form.customerPhone],
              ["Product", form.product],
              ["Model", form.model || "—"],
              ["Serial No", form.serialNo],
              ["Images", images.length + " attached"],
            ].map(([k, v]) => (
              <div key={k} style={styles.successRow}>
                <span style={styles.successLabel}>{k}</span>
                <span style={styles.successValue}>{v}</span>
              </div>
            ))}
          </div>
          <button style={styles.newBtn} onClick={handleCancel}>OK</button>
        </div>
      </div>
    );
  }

  // ── Main form ───────────────────────────────────────────────
  return (
    <div style={styles.page} className="standby-page">
      <style>{`
        @media (max-width: 600px) {
          .standby-page {
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
            height: auto !important;
            min-height: 100% !important;
            padding: 8px 8px 32px !important;
            align-items: flex-start !important;
          }
          .standby-card {
            border-radius: 12px !important;
            overflow: visible !important;
            min-height: auto !important;
          }
          .standby-body {
            padding: 12px 14px 16px !important;
            overflow: visible !important;
          }
          .standby-row3 {
            display: flex !important;
            flex-direction: column !important;
            gap: 10px !important;
            margin-bottom: 6px !important;
          }
          .standby-row3 > * {
            width: 100% !important;
            min-width: 0 !important;
          }
          .standby-conditional {
            overflow: visible !important;
            margin-top: 8px !important;
          }
          .standby-two-col {
            display: flex !important;
            flex-direction: column !important;
            gap: 0 !important;
          }
          .standby-col-box {
            padding: 12px !important;
            border-bottom: 1px solid #f1f5f9 !important;
          }
          .standby-textarea-mobile {
            height: 100px !important;
            resize: vertical !important;
            flex: none !important;
          }
          .standby-actions {
            flex-direction: column-reverse !important;
            gap: 8px !important;
          }
          .standby-actions button {
            width: 100% !important;
            text-align: center !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>
      <div style={styles.card} className="standby-card">

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerAccent} />
          <div style={styles.headerContent}>
            <h1 style={styles.headerTitle}>{editRow ? "Edit Standby" : "Standby Product"}</h1>
          </div>
        </div>

        <div style={styles.body} className="standby-body">

          {/* ── Intake Info ── */}
          <SectionLabel label="Intake Information" />
          <div style={styles.row3} className="standby-row3">
            <Field label="Received Date" name="receivedDate" type="date"
              value={form.receivedDate} onChange={handleChange} error={errors.receivedDate} required />
            <Field label="Person Name" name="personName" placeholder="Who received the item"
              value={form.personName} onChange={handleChange} error={errors.personName} required />
            <Field label="Phone Number" name="phoneNumber" placeholder="+91 98765 43210"
              value={form.phoneNumber} onChange={handleChange} error={errors.phoneNumber} />
          </div>

          <div style={styles.row3} className="standby-row3">
            <Field label="Employee 1" name="employee1" placeholder="Primary technician"
              value={form.employee1} onChange={handleChange} />
            <SelectField label="Employee 2" name="employee2"
              value={form.employee2} onChange={handleChange}
              placeholder="— Select User —"
              options={userOptions} />
          </div>

          {/* ── Customer Information ── */}
          <SectionLabel label="Customer Information" />
          <div style={styles.row3} className="standby-row3">
            <SearchableSelect label="Customer Name" name="customerName"
              value={form.customerName} onChange={handleCustomerSelect}
              error={errors.customerName} required
              placeholder="Type customer name…"
              options={debtors.map((d) => d.name)}
              loading={debtorsLoading} />
            <Field label="Place" name="customerPlace" placeholder="City / Area"
              value={form.customerPlace} onChange={handleChange} />
            <Field label="Phone Number" name="customerPhone" placeholder="+91 98765 43210"
              value={form.customerPhone} onChange={handleChange} error={errors.customerPhone} required />
          </div>

          {/* ── Product Details ── */}
          <SectionLabel label="Product Details" />
          <div style={styles.row3} className="standby-row3">
            <SelectField label="Product" name="product"
              value={form.product} onChange={handleChange}
              error={errors.product} required
              placeholder="— Select product —"
              options={[
                "Laptop",
                "Desktop PC",
                "AC Unit",
                "Refrigerator",
                "Washing Machine",
                "Television",
                "Microwave",
                "Printer",
                "Mobile Phone",
                "Tablet",
              ]} />
            <Field label="Model" name="model" placeholder="Model number / name"
              value={form.model} onChange={handleChange} />
            <Field label="Serial No" name="serialNo" placeholder="Serial / IMEI"
              value={form.serialNo} onChange={handleChange} error={errors.serialNo} required />
          </div>

          {/* ── Conditional section: shown only when product is filled ── */}
          {productSelected && (
            <div style={styles.conditionalSection} className="standby-conditional">
              <div style={styles.twoColRow} className="standby-two-col">

                {/* Images */}
                <div style={styles.colBox} className="standby-col-box">
                  <div style={styles.colLabel}>Images</div>
                  <div style={styles.colContent}>
                    <div
                      style={styles.dropZone}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleImageDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        style={{ display: "none" }}
                        onChange={(e) => handleImageFiles(e.target.files)}
                      />
                      <div style={styles.dropPrompt}>
                        <span style={styles.chooseLbl}>Choose files</span>
                        <span style={styles.dropHint}>{images.length === 0 ? "No file chosen" : `${images.length} file(s) chosen`}</span>
                      </div>
                    </div>
                    {images.length > 0 && (
                      <div style={styles.imageGrid}>
                        {images.map((img) => (
                          <div key={img.id} style={styles.imageThumb}>
                            <img src={img.url} alt={img.name} style={styles.thumbImg} />
                            <div style={styles.thumbOverlay}>
                              <span style={styles.thumbName}>{img.name}</span>
                              <button style={styles.thumbRemove} onClick={() => removeImage(img.id)}>✕</button>
                            </div>
                          </div>
                        ))}
                        <div style={styles.addMoreThumb} onClick={() => fileInputRef.current?.click()}>
                          <span style={{ fontSize: 20, color: "#94a3b8" }}>+</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div style={styles.colBox} className="standby-col-box">
                  <div style={styles.colLabel}>Customer Notes</div>
                  <div style={{ ...styles.colContent, flex: 1 }}>
                    <textarea
                      name="notes"
                      value={form.notes}
                      onChange={handleChange}
                      placeholder="Any additional notes or observations for this item..."
                    style={{ ...styles.textarea, flex: 1, resize: "none", height: "50%" }}
                      className="standby-textarea-mobile"
                    />
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* Actions */}
          <div style={styles.actions} className="standby-actions">
            {saveError && (
              <span style={{ fontSize: 12, color: "#ef4444", marginRight: "auto" }}>
                ⚠ {saveError}
              </span>
            )}
            <button style={styles.cancelBtn} onClick={handleCancel} disabled={saving}>✕ Cancel</button>
            <button style={{ ...styles.submitBtn, opacity: saving ? 0.6 : 1 }} onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving…" : editRow ? "Update" : "Submit"}
            </button>
          </div>

        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span style={styles.footerPowered}>Powered by</span>
          <span style={styles.footerBrand}>IMCB Solutions LLP</span>
        </div>

      </div>
    </div>
  );
}

function SectionLabel({ label }) {
  return (
    <div style={styles.sectionLabel}>
      <span style={styles.sectionText}>{label}</span>
      <div style={styles.sectionLine} />
    </div>
  );
}

function Field({ label, name, type = "text", placeholder, value, onChange, error, required }) {
  return (
    <div style={styles.fieldWrap}>
      <label style={styles.label}>
        {label}{required && <span style={styles.required}>*</span>}
      </label>
      <input
        type={type} name={name} value={value} onChange={onChange} placeholder={placeholder}
        style={{
          ...styles.input,
          borderColor: error ? "#ef4444" : "#e2e8f0",
          backgroundColor: error ? "#fff5f5" : "#fff",
        }}
      />
      {error && <span style={styles.error}>{error}</span>}
    </div>
  );
}

function SelectField({ label, name, value, onChange, error, required, options, placeholder }) {
  return (
    <div style={styles.fieldWrap}>
      <label style={styles.label}>
        {label}{required && <span style={styles.required}>*</span>}
      </label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        style={{
          ...styles.input,
          ...styles.select,
          borderColor: error ? "#ef4444" : "#e2e8f0",
          backgroundColor: error ? "#fff5f5" : "#fff",
        }}
      >
        <option value="">{placeholder || `Select ${label}`}</option>
        {options.map((opt) =>
          typeof opt === "string"
            ? <option key={opt} value={opt}>{opt}</option>
            : <option key={opt.value} value={opt.value}>{opt.label}</option>
        )}
      </select>
      {error && <span style={styles.error}>{error}</span>}
    </div>
  );
}

function SearchableSelect({ label, name, value, onChange, error, required, options, placeholder, loading }) {
  const [inputVal, setInputVal] = useState(value || "");
  const [open, setOpen]         = useState(false);
  const wrapRef  = useRef(null);
  const inputRef = useRef(null);

  // Keep inputVal in sync when parent resets the value (e.g. form reset)
  useEffect(() => { setInputVal(value || ""); }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        // If user typed something but didn't pick — revert to last confirmed value
        setInputVal(value || "");
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [value]);

  // Filter: starts-with has priority, then contains
  const q = inputVal.trim().toLowerCase();
  const filtered = q.length === 0 ? [] : (() => {
    const starts   = options.filter(o => o.toLowerCase().startsWith(q));
    const contains = options.filter(o => !o.toLowerCase().startsWith(q) && o.toLowerCase().includes(q));
    return [...starts, ...contains].slice(0, 100);
  })();

  const handleInput = (e) => {
    setInputVal(e.target.value);
    setOpen(true);
    // Clear the confirmed selection while user is typing
    if (value) onChange({ target: { name, value: "" } });
  };

  const handleSelect = (opt) => {
    setInputVal(opt);
    setOpen(false);
    onChange({ target: { name, value: opt } });
  };

  const handleClear = (e) => {
    e.preventDefault();
    setInputVal("");
    setOpen(false);
    onChange({ target: { name, value: "" } });
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") { setInputVal(value || ""); setOpen(false); }
  };
  return (
    <div style={{ ...styles.fieldWrap, position: "relative" }} ref={wrapRef}>
      <label style={styles.label}>
        {label}{required && <span style={styles.required}>*</span>}
      </label>
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={handleInput}
          onFocus={() => { if (inputVal.trim()) setOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder={loading ? "Loading customers…" : (placeholder || "Type to search…")}
          disabled={loading}
          autoComplete="off"
          style={{
            ...styles.input,
            borderColor: error ? "#ef4444" : open ? "#1e3a5f" : "#e2e8f0",
            backgroundColor: error ? "#fff5f5" : loading ? "#f8fafc" : "#fff",
            boxShadow: open ? "0 0 0 3px rgba(30,58,95,0.1)" : "none",
            paddingRight: inputVal ? 28 : 11,
          }}
        />
        {inputVal && !loading && (
          <button
            onMouseDown={handleClear}
            tabIndex={-1}
            style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer",
              color: "#94a3b8", fontSize: 14, lineHeight: 1, padding: 2,
            }}
          >✕</button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 9999,
          background: "#fff", border: "1.5px solid #1e3a5f", borderRadius: 8,
          boxShadow: "0 8px 24px rgba(0,0,0,0.13)", marginTop: 2,
          maxHeight: 220, overflowY: "auto",
        }}>
          {filtered.map(opt => (
            <div
              key={opt}
              onMouseDown={() => handleSelect(opt)}
              style={{
                padding: "8px 12px", fontSize: 13, cursor: "pointer", textAlign: "left",
                borderBottom: "1px solid #f1f5f9",
                color: "#000",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#f0f7ff"}
              onMouseLeave={e => e.currentTarget.style.background = "#fff"}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
      {error && <span style={styles.error}>{error}</span>}
    </div>
  );
}


const styles = {
  page: {
    background: "linear-gradient(135deg, #f0f4f8 0%, #e8edf3 100%)",
    display: "flex", alignItems: "flex-start", justifyContent: "center",
    padding: "12px 16px 16px",
    fontFamily: "'Google Sans', sans-serif",
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
    minHeight: "100%",
    boxSizing: "border-box",
  },
  card: {
    width: "100%", maxWidth: 900,
    background: "#fff", borderRadius: 16,
    boxShadow: "0 8px 48px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)",
    overflow: "visible", animation: "fadeUp 0.4s ease both",
  },
  header: { position: "relative", background: "#2c84f7", padding: "14px 28px 12px", overflow: "hidden" },
  headerAccent: { position: "absolute", right: -40, top: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(44, 123, 214, 0.05)" },
  headerContent: { position: "relative", zIndex: 1 },
  headerTag: { fontSize: 10, fontWeight: 600, letterSpacing: "0.18em", color: "#7eb8f7", display: "block", marginBottom: 3 },
  headerTitle: { fontFamily: "'Google Sans', sans-serif", fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" },
  body: { padding: "16px 28px 16px", overflow: "visible" },

  sectionLabel: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10, marginTop: 14 },
  sectionIcon: { fontSize: 15 },
  sectionText: { fontSize: 11, fontWeight: 600, color: "#000", letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap" },
  sectionLine: { flex: 1, height: 1, background: "linear-gradient(to right, #cbd5e1, transparent)", marginLeft: 4 },

  row3: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px 16px", marginBottom: 4, overflow: "visible" },
  fieldWrap: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 12, fontWeight: 500, color: "#000", textAlign: "left" },
  required: { color: "#ef4444", marginLeft: 3 },
  input: { padding: "7px 11px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, color: "#000", width: "100%" },
  select: {
    appearance: "none",
    WebkitAppearance: "none",
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 10px center",
    paddingRight: 30,
    cursor: "pointer",
  },
  error: { fontSize: 11.5, color: "#ef4444", marginTop: 2 },

  // Conditional section
  conditionalSection: {
    marginTop: 10,
    background: "#fff",
    borderRadius: 10,
    animation: "slideDown 0.3s ease both",
    overflow: "hidden",
  },
  condHeader: {
    background: "#fff",
    borderBottom: "1.5px solid rgb(195, 224, 245)",
    padding: "8px 16px",
    textAlign: "center",
  },
  condHeaderTitle: {
    fontSize: 13, fontWeight: 700, color: "#1565a0", letterSpacing: "0.03em",
  },

  // Two column row
  twoColRow: {
    display: "grid", gridTemplateColumns: "1fr 1fr",
    gap: "0 1px", alignItems: "stretch",
    background: "#fff",
  },
  colBox: {
    display: "flex", flexDirection: "column",
    background: "#fff", padding: "12px 14px",
  },
  colLabel: {
    fontSize: 12, fontWeight: 600, color: "#333",
    marginBottom: 8, textAlign: "left",
  },
  colContent: {
    display: "flex", flexDirection: "column", flex: 1, gap: 8,
  },

  // Drop zone
  dropZone: {
    border: "1.5px solid #e2e8f0", borderRadius: 6,
    padding: "8px 10px", cursor: "pointer",
    background: "#fff", display: "flex", alignItems: "center", gap: 8,
  },
  dropPrompt: { display: "flex", alignItems: "center", gap: 8 },
  chooseLbl: {
    padding: "4px 10px", border: "1.5px solid #bbb", borderRadius: 4,
    background: "#f5f5f5", fontSize: 12, color: "#333",
    fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap",
  },
  dropHint: { fontSize: 12, color: "#888" },

  textarea: {
    width: "100%", padding: "7px 11px",
    border: "1.5px solid #e2e8f0", borderRadius: 8,
    fontSize: 13, color: "#000", resize: "vertical", lineHeight: 1.5,
    display: "block", background: "#fff",
  },

  // Image grid
  imageGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
    gap: 8, marginTop: 10,
  },
  imageThumb: {
    position: "relative", borderRadius: 8,
    overflow: "hidden", aspectRatio: "1",
    border: "1.5px solid #e2e8f0",
    animation: "fadeIn 0.25s ease both",
  },
  thumbImg: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  thumbOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    background: "linear-gradient(transparent, rgba(0,0,0,0.65))",
    padding: "16px 5px 5px",
    display: "flex", alignItems: "flex-end", justifyContent: "space-between",
  },
  thumbName: { fontSize: 9, color: "#fff", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  thumbRemove: {
    background: "rgba(255,255,255,0.25)", border: "none",
    color: "#fff", borderRadius: 4, fontSize: 9,
    cursor: "pointer", padding: "2px 4px", flexShrink: 0,
  },
  addMoreThumb: {
    border: "2px dashed #cbd5e1", borderRadius: 8,
    aspectRatio: "1", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    cursor: "pointer", background: "#f8fafc",
  },

  // Actions
  actions: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16, paddingTop: 14, borderTop: "1px solid #f1f5f9" },
  cancelBtn: { padding: "8px 18px", border: "1.5px solid #e2e8f0", borderRadius: 8, background: "#fff", color: "#000", fontSize: 13, fontWeight: 500, cursor: "pointer" },
  submitBtn: { padding: "8px 22px", border: "none", borderRadius: 8, background: "#1e73e2", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", letterSpacing: "0.01em" },

  // Success
  successCard: { background: "#fff", borderRadius: 20, padding: "44px 40px", maxWidth: 460, width: "100%", textAlign: "center", boxShadow: "0 8px 48px rgba(0,0,0,0.10)", animation: "fadeUp 0.4s ease both" },
  successIcon: { width: 56, height: 56, borderRadius: "50%", background: "#1e3a5f", color: "#fff", fontSize: 24, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" },
  successTitle: { fontFamily: "'Google Sans', sans-serif", fontSize: 20, fontWeight: 800, color: "#1e3a5f", marginBottom: 6 },
  successSub: { color: "#000", fontSize: 13, marginBottom: 20 },
  successDetails: { background: "#f8fafc", borderRadius: 10, padding: "14px 18px", marginBottom: 20, textAlign: "left" },
  successRow: { display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #e2e8f0", fontSize: 13 },
  successLabel: { color: "#000", fontWeight: 500 },
  successValue: { color: "#000", fontWeight: 500 },
  newBtn: { padding: "10px 26px", background: "#1e3a5f", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" },

  // Footer
  footer: {
    width: "100%", padding: "10px 16px",
    borderTop: "1px solid #e8eaed",
    background: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: 6,
    borderRadius: "0 0 16px 16px",
  },
  footerPowered: { fontSize: 11, color: "#9ca3af", fontWeight: 500 },
  footerBrand: { fontSize: 11, fontWeight: 700, color: "#1a73e8" },
};