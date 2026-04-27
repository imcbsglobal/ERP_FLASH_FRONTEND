import React, { useState } from 'react';
import ImageCaptureLinkGenerator from './Image_link';

const ImageCaptureList = ({ onGenerateLink }) => {
  // Google Sans font
  const fontStyle = { fontFamily: "'Google Sans', sans-serif" };

  // Inject Google Fonts
  if (typeof document !== "undefined" && !document.getElementById("google-sans-font")) {
    const link = document.createElement("link");
    link.id = "google-sans-font";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }
  
  // Sample data for demonstration
  const [captureData, setCaptureData] = useState([
    {
      id: 1,
      clientDetails: {
        name: 'Rajesh Constructions',
        contact: 'rajesh@constructions.com',
        phone: '+91 98765 43210',
      },
      image: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=100&h=100&fit=crop',
      location: 'Mumbai, Maharashtra',
      coordinate: '19.0760° N, 72.8777° E',
      verificationTime: '2024-02-15 10:30:00',
      status: 'Verified',
      manualStatus: 'Approved',
    },
    {
      id: 2,
      clientDetails: {
        name: 'Greenfield Projects',
        contact: 'info@greenfield.com',
        phone: '+91 87654 32109',
      },
      image: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=100&h=100&fit=crop',
      location: 'Bangalore, Karnataka',
      coordinate: '12.9716° N, 77.5946° E',
      verificationTime: '2024-02-15 11:45:00',
      status: 'Pending',
      manualStatus: 'Under Review',
    },
    {
      id: 3,
      clientDetails: {
        name: 'Shakti Developers',
        contact: 'contact@shakti.com',
        phone: '+91 76543 21098',
      },
      image: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=100&h=100&fit=crop',
      location: 'Delhi, NCR',
      coordinate: '28.6139° N, 77.2090° E',
      verificationTime: '2024-02-14 09:15:00',
      status: 'Failed',
      manualStatus: 'Rejected',
    },
    {
      id: 4,
      clientDetails: {
        name: 'Coastal Residency',
        contact: 'admin@coastal.com',
        phone: '+91 65432 10987',
      },
      image: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=100&h=100&fit=crop',
      location: 'Chennai, Tamil Nadu',
      coordinate: '13.0827° N, 80.2707° E',
      verificationTime: '2024-02-14 14:20:00',
      status: 'Verified',
      manualStatus: 'Approved',
    },
    {
      id: 5,
      clientDetails: {
        name: 'Urban Nest',
        contact: 'hello@urbannest.com',
        phone: '+91 54321 09876',
      },
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=100&h=100&fit=crop',
      location: 'Hyderabad, Telangana',
      coordinate: '17.3850° N, 78.4867° E',
      verificationTime: '2024-02-13 16:00:00',
      status: 'Pending',
      manualStatus: 'Pending',
    },
  ]);

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

  const handleDelete = (id) => {
    setDelId(id);
  };

  const doDelete = () => {
    setCaptureData(captureData.filter((item) => item.id !== delId));
    setDelId(null);
  };

  const handleDownload = (item) => {
    const text = [
      `Client: ${item.clientDetails.name}`,
      `Email: ${item.clientDetails.contact}`,
      `Phone: ${item.clientDetails.phone}`,
      `Location: ${item.location}`,
      `Coordinate: ${item.coordinate}`,
      `Verification Time: ${item.verificationTime}`,
      `Status: ${item.status}`,
      `Manual Status: ${item.manualStatus}`,
    ].join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.clientDetails.name.replace(/\s+/g, '_')}_record.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
    table: { width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 1000 },
    theadRow: { background: "#0990eb" },
    th: {
      padding: "8px 16px",
      textAlign: "left",
      fontWeight: 600,
      color: "#fbfbfc",
      fontSize: 15,
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
      padding: "5px 16px",
      color: "#0d0d0e",
      borderBottom: "1px solid #f0f0f0",
      whiteSpace: "nowrap",
      verticalAlign: "middle",
      textAlign: "left",
      fontSize: 14,
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

  return (
    <div className="p-6 bg-white min-h-screen" style={{ fontFamily: "'Google Sans', sans-serif" }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 25, fontWeight: 600,textAlign: 'left', color: "#0d0d0e", fontFamily: "'Google Sans', sans-serif" }}>Verified Customers</h2>
           
          </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
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

        {/* Table Container */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table style={tableStyles.table}>
              <thead>
                <tr style={tableStyles.theadRow}>
                  <th style={tableStyles.th}>Sl. No</th>
                  <th style={tableStyles.th}>Client Details</th>
                  <th style={tableStyles.th}>Image</th>
                  <th style={tableStyles.th}>Location</th>
                  <th style={tableStyles.th}>Coordinate</th>
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
                        style={{ width: 28, height: 28, borderRadius: 4, objectFit: "cover", border: "1px solid #e5e7eb", cursor: "zoom-in" }}
                        onClick={() => setPreviewImg({ src: item.image, name: item.clientDetails.name })}
                      />
                    </td>
                    <td style={tableStyles.td}>{item.location}</td>
                    <td style={tableStyles.td} className="font-mono">{item.coordinate}</td>
                    <td style={tableStyles.td}>{item.verificationTime}</td>
                    <td style={tableStyles.td}>
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td style={tableStyles.td}>
                      <select
                        value={item.manualStatus}
                        onChange={(e) => {
                          setCaptureData(captureData.map(d =>
                            d.id === item.id ? { ...d, manualStatus: e.target.value } : d
                          ));
                        }}
                        style={{
                          padding: "4px 6px",
                          borderRadius: 6,
                          border: "1.5px solid #d1d5db",
                          fontSize: 11,
                          fontWeight: 600,
                          fontFamily: "'Google Sans', sans-serif",
                          cursor: "pointer",
                          outline: "none",
                          width: "90px",
                          background: item.manualStatus === "Verified" ? "#10973f" : "rgb(247,170,4) ",
                          color: item.manualStatus === "Verified" ? "#fafdfb" : "#f7f6f4",
                        }}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Verified">Verified</option>
                      </select>
                    </td>
                    <td style={tableStyles.td}>
                      <div style={{ display: "flex", gap: 6 }}>
                        {/* Edit */}
                        <button
                          onClick={() => handleEdit(item)}
                          title="Edit"
                          style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: "#1a73e8", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "'Google Sans', sans-serif" }}
                        >
                          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
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
                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(item.id)}
                          title="Delete"
                          style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: "#d93025", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "'Google Sans', sans-serif" }}
                        >
                          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
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
      </div>

      {/* Image Preview Modal */}
      {previewImg && (
        <div
          onClick={() => setPreviewImg(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 4000, backgroundColor: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
            <img
              src={previewImg.src}
              alt={previewImg.name}
              style={{ maxWidth: '80vw', maxHeight: '80vh', borderRadius: 12, boxShadow: '0 8px 40px rgba(0,0,0,0.5)', display: 'block' }}
            />
            <p style={{ color: '#fff', marginTop: 10, fontSize: 14, fontFamily: "'Google Sans', sans-serif", fontWeight: 600, textAlign: 'center' }}>{previewImg.name}</p>
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
          onClick={() => setDelId(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 3000,
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
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
        <div style={modalStyles.overlay} onClick={() => setIsEditModalOpen(false)}>
          <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
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
          onClick={() => setModalMode(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
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
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageCaptureList;