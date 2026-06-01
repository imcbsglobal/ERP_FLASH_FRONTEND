import { useState, useRef } from "react";
import { apiFetch, authHeaders, ENDPOINTS, getCurrentUser } from "../service/Api";

const getLoggedUserName = () => {
  const user = getCurrentUser();
  if (!user) return "";
  return user.full_name || user.name || user.username || "";
};

const makeBlankForm = () => ({
  receivedDate: "",
  personName: "",
  phoneNumber: "",
  employee1: getLoggedUserName(),
  employee2: "",
  customerName: "",
  customerPlace: "",
  customerPhone: "",
  product: "",
  model: "",
  serialNo: "",
  notes: "",
  standbyIssued: "no",
  hasWarranty: "no",
});

export default function ServiceAdd({ onBack, editRow }) {
  const isEdit = Boolean(editRow?.id);

  // Build initial form state — either blank (new) or pre-filled (edit)
  const buildForm = (row) => {
    if (!row) return makeBlankForm();
    return {
      receivedDate:  row.receivedDate  || "",
      personName:    row.personName    || "",
      phoneNumber:   row.phoneNumber   || "",
      employee1:     row.employee1     || "",
      employee2:     row.employee2     || "",
      customerName:  row.customerName  || "",
      customerPlace: row.customerPlace || "",
      customerPhone: row.customerPhone || "",
      product:       row.product       || "",
      model:         row.model         || "",
      serialNo:      row.serialNo      || "",
      notes:         row.notes         || "",
      standbyIssued: row.standbyItem   ? "yes" : "no",
      hasWarranty:   row.warranty      ? "yes" : "no",
    };
  };

  const buildComplaints = (row) => {
    if (!row || !Array.isArray(row.complaints) || row.complaints.length === 0)
      return [{ id: Date.now(), text: "" }];
    return row.complaints.map((text, i) => ({ id: i, text }));
  };

  const [form, setForm] = useState(() => buildForm(editRow));
  const [complaints, setComplaints] = useState(() => buildComplaints(editRow));
  // Existing server images (edit mode only)
  const [existingImages, setExistingImages] = useState(() =>
    isEdit && Array.isArray(editRow?.imageUrls) ? editRow.imageUrls : []
  );
  const [images, setImages] = useState([]);       // newly added local files
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  const productSelected = form.product.trim() !== "";

  const addComplaint = () =>
    setComplaints((c) => [...c, { id: Date.now(), text: "" }]);

  const updateComplaint = (id, text) =>
    setComplaints((c) => c.map((item) => (item.id === id ? { ...item, text } : item)));

  const removeComplaint = (id) =>
    setComplaints((c) => c.filter((item) => item.id !== id));

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

  const removeExistingImage = async (id) => {
    try {
      await apiFetch(ENDPOINTS.serviceImage(id), {
        method: "DELETE",
      });
    } catch { /* best-effort */ }
    setExistingImages((prev) => prev.filter((img) => img.id !== id));
  };

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
    if (productSelected && complaints.every((c) => !c.text.trim()))
      e.complaints = "At least one complaint required";
    return e;
  };

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    setSubmitting(true);
    setSubmitError("");

    try {
      // Build payload matching Django serializer field names
      const payload = {
        received_date:  form.receivedDate,
        person_name:    form.personName,
        phone_number:   form.phoneNumber,
        employee1:      form.employee1,
        employee2:      form.employee2,
        customer_name:  form.customerName,
        customer_place: form.customerPlace,
        customer_phone: form.customerPhone,
        product:        form.product,
        model:          form.model,
        serial_no:      form.serialNo,
        notes:          form.notes,
        standby_issued: form.standbyIssued === "yes",
        has_warranty:   form.hasWarranty === "yes",
        complaint_texts: complaints.map((c) => c.text).filter((t) => t.trim()),
      };

      // PUT for edit, POST for new
      const url = isEdit ? ENDPOINTS.service(editRow.id) : ENDPOINTS.services;
      const method = isEdit ? "PUT" : "POST";

      const saved = await apiFetch(url, {
        method,
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });

      // Upload any newly added images
      if (images.length > 0) {
        const fd = new FormData();
        images.forEach((img) => { if (img.file) fd.append("images", img.file); });
        await apiFetch(ENDPOINTS.serviceImages(saved.id), {
          method: "POST",
          headers: authHeaders(),
          body: fd,
        });
      }

      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.message || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setForm(makeBlankForm());
    setComplaints([{ id: Date.now(), text: "" }]);
    setImages([]);
    setErrors({});
    setSubmitted(false);
    if (onBack) onBack();
  };

  if (submitted) {
    return (
      <div className="sa-page">
        <style>{css}</style>
        <div className="sa-success-card">
          <div className="sa-success-icon">✓</div>
          <h2 className="sa-success-title">{isEdit ? "Service Entry Updated" : "Service Request Submitted"}</h2>
          <p className="sa-success-sub">
            {isEdit ? "Changes have been saved." : <>Entry for <strong>{form.customerName}</strong> has been recorded.</>}
          </p>
          <div className="sa-success-details">
            {[
              ["Customer", form.customerName],
              ["Place", form.customerPlace || "—"],
              ["Phone", form.customerPhone],
              ["Product", form.product],
              ["Model", form.model || "—"],
              ["Serial No", form.serialNo],
              ["Complaints", complaints.filter((c) => c.text.trim()).length + " logged"],
              ["Images", images.length + " attached"],
            ].map(([k, v]) => (
              <div key={k} className="sa-success-row">
                <span className="sa-success-label">{k}</span>
                <span className="sa-success-value">{v}</span>
              </div>
            ))}
          </div>
          <button className="sa-new-btn" onClick={handleCancel}>OK</button>
        </div>
      </div>
    );
  }

  return (
    <div className="sa-page">
      <style>{css}</style>
      <div className="sa-card">

        {/* Header */}
        <div className="sa-header">
          <div className="sa-header-accent" />
          <div className="sa-header-content">
            <h1 className="sa-header-title">{isEdit ? `Edit Service Entry #${editRow.id}` : "New Service Entry"}</h1>
          </div>
        </div>

        <div className="sa-body">

          {/* Intake Info */}
          <SectionLabel label="Intake Information" />
          <div className="sa-row3">
            <Field label="Received Date" name="receivedDate" type="date"
              value={form.receivedDate} onChange={handleChange} error={errors.receivedDate} required />
            <Field label="Person Name" name="personName" placeholder="Who received the item"
              value={form.personName} onChange={handleChange} error={errors.personName} required />
            <Field label="Phone Number" name="phoneNumber" placeholder="+91 98765 43210"
              value={form.phoneNumber} onChange={handleChange} error={errors.phoneNumber} />
          </div>

          <div className="sa-row2">
            <Field label="Employee 1" name="employee1" placeholder="Primary technician"
              value={form.employee1} onChange={handleChange} />
            <SelectField label="Employee 2" name="employee2"
              value={form.employee2} onChange={handleChange}
              placeholder="— Select technician —"
              options={[
                "Alice Johnson",
                "Bob Smith",
                "Charlie Davis",
                "Diana Lee",
                "Ethan Brown",
              ]} />
          </div>

          {/* Customer Information */}
          <SectionLabel label="Customer Information" />
          <div className="sa-row3">
            <SelectField label="Customer Name" name="customerName"
              value={form.customerName} onChange={handleChange}
              error={errors.customerName} required
              placeholder="— Select customer —"
              options={[
                "Rahul Menon",
                "Priya Nair",
                "Suresh Kumar",
                "Anitha Thomas",
                "Vijay Krishnan",
              ]} />
            <Field label="Place" name="customerPlace" placeholder="City / Area"
              value={form.customerPlace} onChange={handleChange} />
            <Field label="Phone Number" name="customerPhone" placeholder="+91 98765 43210"
              value={form.customerPhone} onChange={handleChange} error={errors.customerPhone} required />
          </div>

          {/* Product Details */}
          <SectionLabel label="Product Details" />
          <div className="sa-row3">
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

          {/* Conditional section */}
          {productSelected && (
            <div className="sa-cond-section">
              <div className="sa-cond-header">
                <span className="sa-cond-header-title">Complaint Details</span>
              </div>

              <div className="sa-three-col-row">

                {/* Complaints */}
                <div className="sa-col-box">
                  <div className="sa-col-label">Complaint Descriptions</div>
                  <div className="sa-col-content">
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {complaints.map((item, idx) => (
                        <div key={item.id} className="sa-complaint-row">
                          <div className="sa-complaint-badge">{idx + 1}:</div>
                          <div style={{ flex: 1 }}>
                            <input
                              type="text"
                              value={item.text}
                              onChange={(e) => updateComplaint(item.id, e.target.value)}
                              placeholder="Complaint description..."
                              className="sa-input"
                              style={{
                                borderColor: errors.complaints && !item.text.trim() ? "#ef4444" : "#e2e8f0",
                                backgroundColor: errors.complaints && !item.text.trim() ? "#fff5f5" : "#fff",
                              }}
                            />
                          </div>
                          {complaints.length > 1 && (
                            <button className="sa-remove-btn" onClick={() => removeComplaint(item.id)} title="Remove">✕</button>
                          )}
                        </div>
                      ))}
                      {errors.complaints && <span className="sa-error">{errors.complaints}</span>}
                    </div>
                    <button className="sa-add-complaint-btn" onClick={addComplaint}>+ Add New Complaint</button>
                  </div>
                </div>

                {/* Images */}
                <div className="sa-col-box">
                  <div className="sa-col-label">Images</div>
                  <div className="sa-col-content">
                    {/* Existing server images (edit mode) */}
                    {existingImages.length > 0 && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "#64748b", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Saved images</div>
                        <div className="sa-image-grid">
                          {existingImages.map((img) => (
                            <div key={img.id} className="sa-image-thumb">
                              <img src={img.url} alt={img.name} className="sa-thumb-img" />
                              <div className="sa-thumb-overlay">
                                <span className="sa-thumb-name">{img.name}</span>
                                <button className="sa-thumb-remove" onClick={() => removeExistingImage(img.id)}>✕</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div
                      className="sa-drop-zone"
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
                      <div className="sa-drop-prompt">
                        <span className="sa-choose-lbl">
                          {existingImages.length > 0 ? "Add more" : "Choose files"}
                        </span>
                        <span className="sa-drop-hint">
                          {images.length === 0 ? "No new file chosen" : `${images.length} new file(s)`}
                        </span>
                      </div>
                    </div>
                    {images.length > 0 && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "#64748b", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>New images</div>
                        <div className="sa-image-grid">
                          {images.map((img) => (
                            <div key={img.id} className="sa-image-thumb">
                              <img src={img.url} alt={img.name} className="sa-thumb-img" />
                              <div className="sa-thumb-overlay">
                                <span className="sa-thumb-name">{img.name}</span>
                                <button className="sa-thumb-remove" onClick={() => removeImage(img.id)}>✕</button>
                              </div>
                            </div>
                          ))}
                          <div className="sa-add-more-thumb" onClick={() => fileInputRef.current?.click()}>
                            <span style={{ fontSize: 20, color: "#94a3b8" }}>+</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div className="sa-col-box">
                  <div className="sa-col-label">Additional Notes</div>
                  <div className="sa-col-content">
                    <textarea
                      name="notes"
                      value={form.notes}
                      onChange={handleChange}
                      placeholder="Any additional notes or observations..."
                      className="sa-textarea"
                    />
                  </div>
                </div>

              </div>

              {/* Yes/No Questions */}
              <div className="sa-yesno-row">
                <YesNo label="Whether Standby issued?" name="standbyIssued" value={form.standbyIssued} onChange={handleChange} />
                <YesNo label="Is the Product has Warranty?" name="hasWarranty" value={form.hasWarranty} onChange={handleChange} />
              </div>

            </div>
          )}

          {/* Actions */}
          <div className="sa-actions">
            {submitError && (
              <span style={{ color: "#ef4444", fontSize: 12, alignSelf: "center", flex: 1 }}>
                ⚠ {submitError}
              </span>
            )}
            <button className="sa-cancel-btn" onClick={handleCancel} disabled={submitting}>✕ Cancel</button>
            <button className="sa-submit-btn" onClick={handleSubmit} disabled={submitting}>
              {submitting ? (isEdit ? "Saving…" : "Submitting…") : (isEdit ? "Save Changes" : "Submit")}
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="sa-footer">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span className="sa-footer-powered">Powered by</span>
          <span className="sa-footer-brand">IMCB Solutions LLP</span>
        </div>

      </div>
    </div>
  );
}

function SectionLabel({ label }) {
  return (
    <div className="sa-section-label">
      <span className="sa-section-text">{label}</span>
      <div className="sa-section-line" />
    </div>
  );
}

function Field({ label, name, type = "text", placeholder, value, onChange, error, required }) {
  return (
    <div className="sa-field-wrap">
      <label className="sa-label">
        {label}{required && <span className="sa-required">*</span>}
      </label>
      <input
        type={type} name={name} value={value} onChange={onChange} placeholder={placeholder}
        className="sa-input"
        style={{
          borderColor: error ? "#ef4444" : "#e2e8f0",
          backgroundColor: error ? "#fff5f5" : "#fff",
        }}
      />
      {error && <span className="sa-error">{error}</span>}
    </div>
  );
}

function SelectField({ label, name, value, onChange, error, required, options, placeholder }) {
  return (
    <div className="sa-field-wrap">
      <label className="sa-label">
        {label}{required && <span className="sa-required">*</span>}
      </label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="sa-input sa-select"
        style={{
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
      {error && <span className="sa-error">{error}</span>}
    </div>
  );
}

function YesNo({ label, name, value, onChange }) {
  return (
    <div className="sa-yesno-item">
      <span className="sa-yesno-label">{label}</span>
      <div className="sa-yesno-btns">
        <button
          type="button"
          className={`sa-yesno-btn${value === "yes" ? " sa-yesno-btn--active" : ""}`}
          onClick={() => onChange({ target: { name, value: "yes" } })}
        >Yes</button>
        <button
          type="button"
          className={`sa-yesno-btn${value === "no" ? " sa-yesno-btn--active" : ""}`}
          onClick={() => onChange({ target: { name, value: "no" } })}
        >No</button>
      </div>
    </div>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@300;400;500;600;700&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; color: #000; }
  input, textarea, button { font-family: 'Google Sans', sans-serif !important; transition: border-color 0.2s, box-shadow 0.2s, background 0.2s; }
  input:focus, textarea:focus { outline: none; border-color: #1e3a5f !important; box-shadow: 0 0 0 3px rgba(30,58,95,0.1); }
  button:hover { filter: brightness(0.93); transform: translateY(-1px); }
  button:active { transform: translateY(0); }

  @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn { from { opacity:0; transform:scale(0.97); } to { opacity:1; transform:scale(1); } }
  @keyframes slideDown { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }

  /* ── Layout ── */
  .sa-page {
    background: linear-gradient(135deg, #f0f4f8 0%, #e8edf3 100%);
    display: flex; align-items: flex-start; justify-content: center;
    padding: 12px 16px 16px;
    font-family: 'Google Sans', sans-serif;
    overflow-y: auto;
    min-height: 100%;
  }
  .sa-card {
    width: 100%; max-width: 900px;
    background: #fff; border-radius: 16px;
    box-shadow: 0 8px 48px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06);
    overflow: hidden; animation: fadeUp 0.4s ease both;
  }

  /* ── Header ── */
  .sa-header {
    position: relative; background: #2c84f7;
    padding: 14px 28px 12px; overflow: hidden;
  }
  .sa-header-accent {
    position: absolute; right: -40px; top: -40px;
    width: 180px; height: 180px; border-radius: 50%;
    background: rgba(44,123,214,0.05);
  }
  .sa-header-content { position: relative; z-index: 1; }
  .sa-header-title {
    font-family: 'Google Sans', sans-serif;
    font-size: 20px; font-weight: 800; color: #fff; letter-spacing: -0.02em;
  }

  /* ── Body ── */
  .sa-body { padding: 16px 28px 16px; }

  /* ── Section Label ── */
  .sa-section-label {
    display: flex; align-items: center; gap: 8px;
    margin-bottom: 10px; margin-top: 14px;
  }
  .sa-section-text {
    font-size: 11px; font-weight: 600; color: #000;
    letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap;
  }
  .sa-section-line {
    flex: 1; height: 1px;
    background: linear-gradient(to right, #cbd5e1, transparent); margin-left: 4px;
  }

  /* ── Grid rows ── */
  .sa-row3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px 16px;
    margin-bottom: 4px;
  }
  .sa-row2 {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px 16px;
    margin-bottom: 4px;
  }

  /* ── Fields ── */
  .sa-field-wrap { display: flex; flex-direction: column; gap: 4px; }
  .sa-label { font-size: 12px; font-weight: 500; color: #000; text-align: left; }
  .sa-required { color: #ef4444; margin-left: 3px; }
  .sa-input {
    padding: 7px 11px; border: 1.5px solid #e2e8f0; border-radius: 8px;
    font-size: 13px; color: #000; width: 100%;
  }
  .sa-error { font-size: 11.5px; color: #ef4444; margin-top: 2px; }

  /* ── Conditional Section ── */
  .sa-cond-section {
    margin-top: 10px;
    background: rgb(229,242,251);
    border-radius: 10px;
    border: 1.5px solid rgb(229,242,251);
    animation: slideDown 0.3s ease both;
    overflow: hidden;
  }
  .sa-cond-header {
    background: #fff;
    border-bottom: 1.5px solid rgb(195,224,245);
    padding: 8px 16px;
    text-align: center;
  }
  .sa-cond-header-title { font-size: 13px; font-weight: 700; color: #1565a0; letter-spacing: 0.03em; }

  /* ── Three-col Row ── */
  .sa-three-col-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0;
    align-items: start;
    background: rgb(229,242,251);
  }
  .sa-col-box {
    display: flex; flex-direction: column;
    background: rgb(229,242,251); padding: 12px 14px;
    border-right: 1px solid rgb(195,224,245);
  }
  .sa-col-box:last-child { border-right: none; }
  .sa-col-label { font-size: 12px; font-weight: 600; color: #333; margin-bottom: 8px; }
  .sa-col-content { display: flex; flex-direction: column; flex: 1; gap: 8px; }

  /* ── Complaints ── */
  .sa-complaint-row { display: flex; align-items: center; gap: 8px; }
  .sa-complaint-badge { font-size: 12px; font-weight: 600; color: #555; flex-shrink: 0; min-width: 20px; }
  .sa-remove-btn {
    width: 22px; height: 22px; border-radius: 50%;
    background: #e74c3c; border: none;
    color: #fff; font-size: 11px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; padding: 0;
  }
  .sa-add-complaint-btn {
    align-self: flex-start; padding: 7px 16px;
    border: none; border-radius: 6px;
    background: #1e73e2; color: #fff;
    font-size: 12px; font-weight: 600; cursor: pointer;
    margin-top: 4px;
  }

  /* ── Drop Zone ── */
  .sa-drop-zone {
    border: 1.5px solid #e2e8f0; border-radius: 6px;
    padding: 8px 10px; cursor: pointer;
    background: #fff; display: flex; align-items: center; gap: 8px;
  }
  .sa-drop-prompt { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .sa-choose-lbl {
    padding: 4px 10px; border: 1.5px solid #bbb; border-radius: 4px;
    background: #f5f5f5; font-size: 12px; color: #333;
    font-weight: 500; cursor: pointer; white-space: nowrap;
  }
  .sa-drop-hint { font-size: 12px; color: #888; }

  /* ── Image Grid ── */
  .sa-image-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 6px; margin-top: 6px;
  }
  .sa-image-thumb {
    position: relative; border-radius: 6px;
    overflow: hidden; width: 52px; height: 52px; flex-shrink: 0;
    border: 1.5px solid #e2e8f0;
    animation: fadeIn 0.25s ease both;
  }
  .sa-thumb-img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .sa-thumb-overlay {
    position: absolute; bottom: 0; left: 0; right: 0;
    background: linear-gradient(transparent, rgba(0,0,0,0.65));
    padding: 16px 5px 5px;
    display: flex; align-items: flex-end; justify-content: space-between;
  }
  .sa-thumb-name { font-size: 9px; color: #fff; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sa-thumb-remove {
    background: rgba(255,255,255,0.25); border: none;
    color: #fff; border-radius: 4px; font-size: 9px;
    cursor: pointer; padding: 2px 4px; flex-shrink: 0;
  }
  .sa-add-more-thumb {
    border: 2px dashed #cbd5e1; border-radius: 6px;
    width: 52px; height: 52px; display: flex; flex-direction: column;
    align-items: center; justify-content: center; flex-shrink: 0;
    cursor: pointer; background: #f8fafc;
  }

  .sa-select {
    appearance: none;
    -webkit-appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 10px center;
    padding-right: 30px !important;
    cursor: pointer;
  }
  .sa-select:focus { outline: none; border-color: #1e3a5f !important; box-shadow: 0 0 0 3px rgba(30,58,95,0.1); }
  .sa-textarea {
    width: 100%; padding: 7px 11px;
    border: 1.5px solid #e2e8f0; border-radius: 8px;
    font-size: 13px; color: #000; resize: vertical; line-height: 1.5;
    display: block; background: #fff;
    min-height: 100px; flex: 1;
  }

  /* ── Yes/No ── */
  .sa-yesno-row {
    display: flex; flex-wrap: wrap; gap: 12px;
    padding: 12px 14px;
    border-top: 1.5px solid rgb(195,224,245);
    background: rgb(229,242,251);
  }
  .sa-yesno-item { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .sa-yesno-label { font-size: 13px; font-weight: 500; color: #000; }
  .sa-yesno-btns { display: flex; gap: 6px; }
  .sa-yesno-btn {
    padding: 5px 18px; border-radius: 7px; font-size: 13px; font-weight: 500;
    border: 1.5px solid #e2e8f0; background: #fff; color: #64748b; cursor: pointer;
  }
  .sa-yesno-btn--active { background: #1e73e2; color: #fff; border-color: #1e73e2; }

  /* ── Footer ── */
  .sa-footer {
    width: 100%;
    padding: 10px 16px;
    border-top: 1px solid #e8eaed;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border-radius: 0 0 16px 16px;
  }
  .sa-footer-powered { font-size: 11px; color: #9ca3af; font-weight: 500; }
  .sa-footer-brand { font-size: 11px; font-weight: 700; color: #1a73e8; }

  /* ── Actions ── */
  .sa-actions {
    display: flex; justify-content: flex-end; gap: 10px;
    margin-top: 16px; padding-top: 14px; border-top: 1px solid #f1f5f9;
  }
  .sa-cancel-btn {
    padding: 8px 18px; border: 1.5px solid #e2e8f0; border-radius: 8px;
    background: #fff; color: #000; font-size: 13px; font-weight: 500; cursor: pointer;
  }
  .sa-submit-btn {
    padding: 8px 22px; border: none; border-radius: 8px;
    background: #1e73e2; color: #fff; font-size: 13px; font-weight: 600;
    cursor: pointer; letter-spacing: 0.01em;
  }

  /* ── Success ── */
  .sa-success-card {
    background: #fff; border-radius: 20px; padding: 44px 40px;
    max-width: 460px; width: 100%; text-align: center;
    box-shadow: 0 8px 48px rgba(0,0,0,0.10);
    animation: fadeUp 0.4s ease both;
  }
  .sa-success-icon {
    width: 56px; height: 56px; border-radius: 50%;
    background: #1e3a5f; color: #fff; font-size: 24px;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 16px;
  }
  .sa-success-title {
    font-family: 'Google Sans', sans-serif;
    font-size: 20px; font-weight: 800; color: #1e3a5f; margin-bottom: 6px;
  }
  .sa-success-sub { color: #000; font-size: 13px; margin-bottom: 20px; }
  .sa-success-details {
    background: #f8fafc; border-radius: 10px;
    padding: 14px 18px; margin-bottom: 20px; text-align: left;
  }
  .sa-success-row {
    display: flex; justify-content: space-between;
    padding: 5px 0; border-bottom: 1px solid #e2e8f0; font-size: 13px;
  }
  .sa-success-label { color: #000; font-weight: 500; }
  .sa-success-value { color: #000; font-weight: 500; }
  .sa-new-btn {
    padding: 10px 26px; background: #1e3a5f; color: #fff;
    border: none; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer;
  }

  /* ════════════════════════════════════════
     MOBILE RESPONSIVE — ≤ 640px
  ════════════════════════════════════════ */
  @media (max-width: 640px) {
    .sa-page {
      padding: 0;
      align-items: stretch;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      min-height: 100%;
      height: auto;
    }
    .sa-card {
      border-radius: 0;
      box-shadow: none;
      min-height: 100vh;
      overflow: visible;
    }
    .sa-footer { border-radius: 0; }

    .sa-header { padding: 14px 16px 12px; }
    .sa-header-title { font-size: 17px; }

    .sa-body { padding: 12px 14px 20px; overflow: visible; }

    /* Stack all grid rows to single column on mobile */
    .sa-row3,
    .sa-row2 {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    /* Complaint section stacks vertically */
    .sa-three-col-row {
      grid-template-columns: 1fr;
    }
    .sa-col-box {
      padding: 12px 12px;
      border-bottom: 1.5px solid rgb(195,224,245);
    }
    .sa-col-box:last-child { border-bottom: none; }

    /* Textarea full height on mobile */
    .sa-textarea { min-height: 80px; resize: vertical; }

    /* Yes/No stack vertically */
    .sa-yesno-row {
      flex-direction: column;
      gap: 12px;
      padding: 12px 12px;
    }
    .sa-yesno-item { gap: 8px; }

    /* Action buttons full width */
    .sa-actions {
      flex-direction: column-reverse;
      gap: 8px;
    }
    .sa-cancel-btn,
    .sa-submit-btn {
      width: 100%;
      padding: 11px;
      font-size: 14px;
      text-align: center;
    }

    /* Success card */
    .sa-success-card {
      padding: 32px 20px;
      border-radius: 16px;
    }
  }

  /* ════════════════════════════════════════
     TABLET — 641px – 768px (2-col grids)
  ════════════════════════════════════════ */
  @media (min-width: 641px) and (max-width: 768px) {
    .sa-row3 {
      grid-template-columns: repeat(2, 1fr);
    }
    .sa-three-col-row {
      grid-template-columns: 1fr 1fr;
    }
    /* Notes col spans full width on tablet */
    .sa-three-col-row .sa-col-box:last-child {
      grid-column: 1 / -1;
    }

    .sa-body { padding: 14px 20px 16px; }
    .sa-header { padding: 14px 20px 12px; }
  }
`;
