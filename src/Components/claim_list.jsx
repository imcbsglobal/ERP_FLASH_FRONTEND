// MobileResponsiveClaimsList.jsx - Enhanced mobile-responsive version with touch optimizations
import { useState, useEffect, useCallback } from "react";
import ClaimsAdd from "./claim_add";
import ClaimsEdit from "./claim_edit";
import { fetchClaims, deleteClaim, updateClaimStatus } from "../service/claims";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import CloseIcon from "@mui/icons-material/Close";
import MenuIcon from "@mui/icons-material/Menu";
import FilterListIcon from "@mui/icons-material/FilterList";
import SearchIcon from "@mui/icons-material/Search";

// ─────────────────────────────────────────────
//  MobileResponsiveClaimsList — with touch optimizations
// ─────────────────────────────────────────────
export default function MobileResponsiveClaimsList() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingClaim, setEditingClaim] = useState(null);
  const [viewingReceipt, setViewingReceipt] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const loadClaims = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      const data = await fetchClaims();
      setClaims(data);
    } catch (err) {
      setFetchError(err.message || "Failed to load claims.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  const handleAddClaim = (newClaim) => {
    const currentTimestamp = new Date().toISOString();
    const claimWithTimestamp = {
      ...newClaim,
      date: currentTimestamp,
      createdAt: currentTimestamp,
      submittedAt: currentTimestamp
    };
    setClaims((prev) => [claimWithTimestamp, ...prev]);
    setShowAddForm(false);
  };

  const handleUpdateClaim = (updatedClaim) => {
    setClaims((prev) =>
      prev.map((c) => (c.id === updatedClaim.id ? updatedClaim : c))
    );
    setEditingClaim(null);
  };

  return (
    <>
      <MobileClaimsListTable
        claims={claims}
        loading={loading}
        fetchError={fetchError}
        setClaims={setClaims}
        onAddNew={() => setShowAddForm(true)}
        onRefresh={loadClaims}
        onEditClaim={(claim) => setEditingClaim(claim)}
        onViewReceipt={(claim) => setViewingReceipt(claim)}
        onDeleteClaim={async (id) => {
          if (!window.confirm("Are you sure you want to delete this claim?"))
            return;
          try {
            await deleteClaim(id);
            setClaims((prev) => prev.filter((c) => c.id !== id));
          } catch (err) {
            alert(`Delete failed: ${err.message}`);
          }
        }}
        isMobile={isMobile}
      />

      {/* Add Claim Modal - Mobile Optimized */}
      {showAddForm && (
        <div style={mobileModalStyles.overlay} onClick={() => setShowAddForm(false)}>
          <div style={mobileModalStyles.modal} onClick={(e) => e.stopPropagation()}>
            <button
              style={mobileModalStyles.closeBtn}
              onClick={() => setShowAddForm(false)}
              aria-label="Close"
            >
              <CloseIcon />
            </button>
            <ClaimsAdd
              onSuccess={handleAddClaim}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        </div>
      )}

      {/* Edit Claim Modal */}
      {editingClaim && (
        <div style={mobileModalStyles.overlay} onClick={() => setEditingClaim(null)}>
          <div style={mobileModalStyles.modal} onClick={(e) => e.stopPropagation()}>
            <button
              style={mobileModalStyles.closeBtn}
              onClick={() => setEditingClaim(null)}
              aria-label="Close"
            >
              <CloseIcon />
            </button>
            <ClaimsEdit
              claim={editingClaim}
              onSuccess={handleUpdateClaim}
              onCancel={() => setEditingClaim(null)}
            />
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {viewingReceipt && (
        <div
          style={receiptModalStyles.overlay}
          onClick={() => setViewingReceipt(null)}
        >
          <div
            style={receiptModalStyles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              style={receiptModalStyles.closeBtn}
              onClick={() => setViewingReceipt(null)}
              aria-label="Close"
            >
              <CloseIcon />
            </button>
            <div style={receiptModalStyles.container}>
              <h2 style={receiptModalStyles.title}>Receipt</h2>
              <div style={receiptModalStyles.imageContainer}>
                {viewingReceipt.receiptUrl || viewingReceipt._localReceiptPreview ? (
                  <img
                    src={
                      viewingReceipt.receiptUrl ||
                      viewingReceipt._localReceiptPreview
                    }
                    alt="Receipt"
                    style={receiptModalStyles.receiptImage}
                    onError={(e) => {
                      e.target.style.display = "none";
                      if (e.target.nextSibling) {
                        e.target.nextSibling.style.display = "block";
                      }
                    }}
                  />
                ) : (
                  <div style={receiptModalStyles.noReceipt}>
                    No receipt attached to this claim
                  </div>
                )}
                <div style={{ display: "none" }}>Failed to load image</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────
//  MobileClaimsListTable - Enhanced mobile version
// ─────────────────────────────────────────────
const STATUS_CONFIG = {
  Approved: { bg: "#04572c", color: "#fbfdfd", dot: "#10b981" },
  Pending: { bg: "rgb(247, 170, 4)", color: "#fcfaf8", dot: "#f59e0b" },
  Rejected: { bg: "#c03030", color: "#faf9f9", dot: "#ef4444" },
 
};

function MobileClaimsListTable({
  claims,
  loading,
  fetchError,
  setClaims,
  onAddNew,
  onRefresh,
  onEditClaim,
  onViewReceipt,
  onDeleteClaim,
  isMobile,
}) {
  const [search, setSearch] = useState("");
  const [statusUpdating, setStatusUpdating] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const handleStatusChange = async (id, newStatus) => {
    setClaims((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
    );
    setStatusUpdating(id);
    try {
      await updateClaimStatus(id, newStatus);
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
      onRefresh();
    } finally {
      setStatusUpdating(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "—";
      if (isMobile) {
        // Shorter date format for mobile
        return date.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
        });
      }
      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
    } catch (error) {
      return "—";
    }
  };

  const formatTime = (dateString) => {
    if (!dateString || isMobile) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      return date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    } catch (error) {
      return "";
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filtered = claims.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch = (
      (c.claimedBy || "").toLowerCase().includes(q) ||
      (c.clientName || "").toLowerCase().includes(q) ||
      (c.department || "").toLowerCase().includes(q) ||
      (c.expense || "").toLowerCase().includes(q)
    );
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filtered.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 whenever filters/search change
  const handleSearchChange = (val) => { setSearch(val); setCurrentPage(1); };
  const handleStatusFilter = (val) => { setStatusFilter(val); setCurrentPage(1); };

  const getVisiblePages = () => {
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    const pages = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  // Mobile card view for small screens
  if (isMobile) {
    return (
      <div style={mobileListStyles.page}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&display=swap');
          .mobile-card:active { background: #f0f4ff !important; }
        `}</style>

        {/* Header - Title and Action Buttons */}
        <div style={mobileListStyles.header}>
          <h1 style={mobileListStyles.title}>Claims</h1>
          <div style={mobileListStyles.headerButtons}>
            <button style={mobileListStyles.refreshBtn} onClick={onRefresh}>
              ↻
            </button>
            <button style={mobileListStyles.addNewBtn} onClick={onAddNew}>
              +
            </button>
          </div>
        </div>

        {fetchError && (
          <div style={mobileListStyles.errorBanner}>
            ⚠️ {fetchError}
            <button style={mobileListStyles.retryBtn} onClick={onRefresh}>
              Retry
            </button>
          </div>
        )}

        {/* Search and Filters - Now in single row with search and filter button */}
        <div style={mobileListStyles.toolbar}>
          <div style={mobileListStyles.searchWrap}>
            <SearchIcon style={{ color: "#9ca3af", fontSize: 18 }} />
            <input
              style={mobileListStyles.searchInput}
              placeholder="Search claims..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <button
            style={mobileListStyles.filterBtn}
            onClick={() => setShowFilters(!showFilters)}
          >
            <FilterListIcon />
          </button>
        </div>

        {/* Filter options */}
        {showFilters && (
          <div style={mobileListStyles.filterBar}>
            {["all", "Approved", "Pending", "Rejected"].map((status) => (
              <button
                key={status}
                style={{
                  ...mobileListStyles.filterChip,
                  background: statusFilter === status ? "#1a73e8" : "#f0f2f5",
                  color: statusFilter === status ? "#fff" : "#333",
                }}
                onClick={() => handleStatusFilter(status)}
              >
                {status === "all" ? "All" : status}
              </button>
            ))}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={mobileListStyles.emptyState}>
            <div style={{ fontSize: 40 }}>⏳</div>
            <div style={{ fontWeight: 600, color: "#374151", marginTop: 12 }}>
              Loading claims...
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filtered.length === 0 && (
          <div style={mobileListStyles.emptyState}>
            <div style={{ fontSize: 48 }}>📋</div>
            <div style={{ fontWeight: 600, color: "#374151", marginTop: 12 }}>
              No claims found
            </div>
            <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>
              {search ? "Try adjusting your search" : "Add your first claim"}
            </div>
          </div>
        )}

        {/* Card List for Mobile */}
        {!loading &&
          paginatedData.map((claim, idx) => {
            const sc = STATUS_CONFIG[claim.status] || STATUS_CONFIG["Pending"];
            const isUpdatingStatus = statusUpdating === claim.id;
            const hasReceipt = claim.receipt || claim.receiptUrl || claim._localReceiptPreview;
            // Calculate serial number based on pagination
            const serialNumber = (currentPage - 1) * itemsPerPage + idx + 1;

            return (
              <div
                key={claim.id}
                className="mobile-card"
                style={mobileListStyles.card}
              >
                <div style={mobileListStyles.cardHeader}>
                  <div style={mobileListStyles.cardUser}>
                    <div style={mobileListStyles.avatar}>
                      {String(claim.claimedBy || "U")
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                    <div>
                      <div style={mobileListStyles.userName}>
                        {claim.claimedBy || "Unknown"}
                      </div>
                      <div style={mobileListStyles.cardDate}>
                        {formatDate(claim.date)} {formatTime(claim.date)}
                      </div>
                    </div>
                  </div>
                  <div style={mobileListStyles.slNoBadge}>
                    #{serialNumber}
                  </div>
                </div>

                <div style={mobileListStyles.cardDetails}>
                  <div style={mobileListStyles.detailRow}>
                    <span style={mobileListStyles.detailLabel}>Client:</span>
                    <span>{claim.clientName || "—"}</span>
                  </div>
                  <div style={mobileListStyles.detailRow}>
                    <span style={mobileListStyles.detailLabel}>Department:</span>
                    <span>{claim.department || "—"}</span>
                  </div>
                  <div style={mobileListStyles.detailRow}>
                    <span style={mobileListStyles.detailLabel}>Expense:</span>
                    <span>{claim.expense || "—"}</span>
                  </div>
                  <div style={mobileListStyles.detailRow}>
                    <span style={mobileListStyles.detailLabel}>Amount:</span>
                    <span style={mobileListStyles.amount}>
                      ₹{claim.amount?.toLocaleString("en-IN") || 0}
                    </span>
                  </div>
                </div>

                <div style={mobileListStyles.cardActions}>
                  <select
                    value={claim.status}
                    onChange={(e) => handleStatusChange(claim.id, e.target.value)}
                    disabled={isUpdatingStatus}
                    style={{
                      ...mobileListStyles.dropdown,
                      background: "white", // Default background color for dropdown
                      color: "black", // Default text color for dropdown
                    }}
                  >
                    {Object.keys(STATUS_CONFIG).map((status) => (
                      <option
                        key={status}
                        value={status}
                        style={
                          claim.status === status
                            ? {
                                backgroundColor: STATUS_CONFIG[status].bg,
                                color: STATUS_CONFIG[status].color,
                              }
                            : {}
                        }
                      >
                        {status}
                      </option>
                    ))}
                  </select>

                  <div style={mobileListStyles.actionButtons}>
                    {hasReceipt && (
                      <button
                        onClick={() => onViewReceipt(claim)}
                        style={mobileListStyles.iconBtn}
                        aria-label="View receipt"
                      >
                        <VisibilityOutlinedIcon style={{ fontSize: 18 }} />
                      </button>
                    )}
                    <button
                      onClick={() => onEditClaim(claim)}
                      style={mobileListStyles.iconBtn}
                      aria-label="Edit"
                    >
                      <EditOutlinedIcon style={{ fontSize: 18 }} />
                    </button>
                    <button
                      onClick={() => onDeleteClaim(claim.id)}
                      style={{ ...mobileListStyles.iconBtn, color: "#d93025" }}
                      aria-label="Delete"
                    >
                      <DeleteOutlineOutlinedIcon style={{ fontSize: 18 }} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

        {/* Mobile Pagination */}
        {!loading && totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, padding: "16px 0 8px", flexWrap: "wrap" }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", fontSize: 13, fontWeight: 600, cursor: currentPage === 1 ? "not-allowed" : "pointer", opacity: currentPage === 1 ? 0.5 : 1, fontFamily: "'Google Sans', sans-serif" }}
            >‹ Prev</button>
            {getVisiblePages()[0] > 1 && (
              <>
                <button onClick={() => setCurrentPage(1)} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", fontSize: 13, cursor: "pointer" }}>1</button>
                {getVisiblePages()[0] > 2 && <span style={{ fontSize: 13, color: "#9ca3af" }}>…</span>}
              </>
            )}
            {getVisiblePages().map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: currentPage === page ? "#1a73e8" : "#fff", color: currentPage === page ? "#fff" : "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Google Sans', sans-serif" }}
              >{page}</button>
            ))}
            {getVisiblePages()[getVisiblePages().length - 1] < totalPages && (
              <>
                {getVisiblePages()[getVisiblePages().length - 1] < totalPages - 1 && <span style={{ fontSize: 13, color: "#9ca3af" }}>…</span>}
                <button onClick={() => setCurrentPage(totalPages)} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", fontSize: 13, cursor: "pointer" }}>{totalPages}</button>
              </>
            )}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", fontSize: 13, fontWeight: 600, cursor: currentPage === totalPages ? "not-allowed" : "pointer", opacity: currentPage === totalPages ? 0.5 : 1, fontFamily: "'Google Sans', sans-serif" }}
            >Next ›</button>
          </div>
        )}
      </div>
    );
  }

  // Desktop Table View
  return (
    <div style={desktopListStyles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&display=swap');
        .row-hover:hover { background: #f0f4ff !important; transition: background 0.15s; }
      `}</style>

      {/* Single top bar: title left, search + buttons right */}
      <div style={desktopListStyles.header}>
        <h1 style={desktopListStyles.title}>Claims Management</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={desktopListStyles.searchWrap}>
            <SearchIcon style={{ color: "#9ca3af", fontSize: 18, marginRight: 8 }} />
            <input
              style={desktopListStyles.searchInput}
              placeholder="Search by name, client, department…"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <button style={desktopListStyles.refreshBtn} onClick={onRefresh}>
            ↻ Refresh
          </button>
          <button style={desktopListStyles.addNewBtn} onClick={onAddNew}>
            + Add New Claim
          </button>
        </div>
      </div>

      {fetchError && (
        <div style={desktopListStyles.errorBanner}>
          ⚠️ {fetchError}{" "}
          <button style={desktopListStyles.retryBtn} onClick={onRefresh}>
            Retry
          </button>
        </div>
      )}

      <div style={desktopListStyles.tableContainer}>
        <div style={desktopListStyles.tableWrap}>
          <table style={desktopListStyles.table}>
            <thead>
              <tr style={desktopListStyles.theadRow}>
                <th style={{ ...desktopListStyles.th, width: "60px", textAlign: "center" }}>Sl. No.</th>
                <th style={desktopListStyles.th}>Date</th>
                <th style={desktopListStyles.th}>Claimed By</th>
                <th style={desktopListStyles.th}>Client Name</th>
                <th style={desktopListStyles.th}>Department</th>
                <th style={desktopListStyles.th}>Expense</th>
                <th style={{ ...desktopListStyles.th, textAlign: "right" }}>Amount</th>
                <th style={desktopListStyles.th}>Receipt</th>
                <th style={desktopListStyles.th}>Status</th>
                <th style={desktopListStyles.th}>Action</th>
               </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={10} style={desktopListStyles.emptyCell}>
                    <div style={desktopListStyles.empty}>
                      <div style={{ fontSize: 25, marginBottom: 8 }}>⏳</div>
                      <div style={{ fontWeight: 600, color: "#374151" }}>
                        Loading claims…
                      </div>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={10} style={desktopListStyles.emptyCell}>
                    <div style={desktopListStyles.empty}>
                      <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
                      <div style={{ fontWeight: 600, color: "#374151" }}>
                        No claims found
                      </div>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                paginatedData.map((claim, idx) => {
                  const sc = STATUS_CONFIG[claim.status] || STATUS_CONFIG["Pending"];
                  const isUpdatingStatus = statusUpdating === claim.id;
                  const hasReceipt = claim.receipt || claim.receiptUrl || claim._localReceiptPreview;
                  // Calculate serial number based on pagination
                  const serialNumber = (currentPage - 1) * itemsPerPage + idx + 1;

                  return (
                    <tr
                      key={claim.id}
                      className="row-hover"
                      style={{ background: idx % 2 === 0 ? "#ffffff" : "#fafafa" }}
                    >
                      <td style={{ ...desktopListStyles.td, textAlign: "center", fontWeight: 600, color: "#64748b" }}>
                        {serialNumber}
                      </td>
                      <td style={desktopListStyles.td}>
                        <div style={desktopListStyles.dateContainer}>
                          <div style={desktopListStyles.dateText}>
                            {formatDate(claim.date)}
                          </div>
                          <div style={desktopListStyles.timeText}>
                            {formatTime(claim.date)}
                          </div>
                        </div>
                      </td>
                      <td style={desktopListStyles.td}>
                        <div style={desktopListStyles.avatar}>
                          {String(claim.claimedBy || "U")
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <span style={{ fontWeight: 500, color: "#111827" }}>
                          {claim.claimedBy || "Unknown"}
                        </span>
                      </td>
                      <td style={desktopListStyles.td}>{claim.clientName}</td>
                      <td style={desktopListStyles.td}>
                        <span style={desktopListStyles.deptTag}>
                          {claim.department || "—"}
                        </span>
                      </td>
                      <td style={desktopListStyles.td}>{claim.expense}</td>
                      <td style={{ ...desktopListStyles.td, fontWeight: 600, color: "#1e3a5f", textAlign: "right" }}>
                        ₹{claim.amount?.toLocaleString("en-IN") || 0}
                      </td>
                      <td style={desktopListStyles.td}>
                        {hasReceipt ? (
                          <button
                            onClick={() => onViewReceipt(claim)}
                            style={desktopListStyles.viewBtn}
                          >
                            <VisibilityOutlinedIcon style={{ fontSize: 13 }} /> View
                          </button>
                        ) : (
                          <span style={{ color: "#9ca3af" }}>—</span>
                        )}
                      </td>
                      <td style={desktopListStyles.td}>
                        <select
                          value={claim.status}
                          onChange={(e) => handleStatusChange(claim.id, e.target.value)}
                          disabled={isUpdatingStatus}
                          style={{
                            ...desktopListStyles.statusSelect,
                            background: sc.bg,
                            color: sc.color,
                            borderColor: sc.dot,
                            opacity: isUpdatingStatus ? 0.6 : 1,
                          }}
                        >
                          <option value="Approved">Approved</option>
                          <option value="Pending">Pending</option>
                          <option value="Rejected">Rejected</option>
                          
                        </select>
                      </td>
                      <td style={desktopListStyles.td}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => onEditClaim(claim)}
                            style={desktopListStyles.editBtn}
                          >
                            <EditOutlinedIcon style={{ fontSize: 13 }} /> Edit
                          </button>
                          <button
                            onClick={() => onDeleteClaim(claim.id)}
                            style={desktopListStyles.deleteBtn}
                          >
                            <DeleteOutlineOutlinedIcon style={{ fontSize: 13 }} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Desktop Pagination */}
      {!loading && totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, flexShrink: 0, flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontSize: 13, color: "#64748b", fontFamily: "'Google Sans', sans-serif" }}>
            Showing {filtered.length > 0 ? startIndex + 1 : 0}–{Math.min(startIndex + itemsPerPage, filtered.length)} of {filtered.length} entries
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", fontSize: 13, fontWeight: 600, cursor: currentPage === 1 ? "not-allowed" : "pointer", opacity: currentPage === 1 ? 0.5 : 1, fontFamily: "'Google Sans', sans-serif", color: "#374151" }}
            >‹ Previous</button>
            {getVisiblePages()[0] > 1 && (
              <>
                <button onClick={() => setCurrentPage(1)} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "'Google Sans', sans-serif" }}>1</button>
                {getVisiblePages()[0] > 2 && <span style={{ fontSize: 14, color: "#9ca3af", padding: "0 4px" }}>…</span>}
              </>
            )}
            {getVisiblePages().map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                style={{ padding: "7px 13px", borderRadius: 8, border: "1px solid #e5e7eb", background: currentPage === page ? "#1a73e8" : "#fff", color: currentPage === page ? "#fff" : "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Google Sans', sans-serif" }}
              >{page}</button>
            ))}
            {getVisiblePages()[getVisiblePages().length - 1] < totalPages && (
              <>
                {getVisiblePages()[getVisiblePages().length - 1] < totalPages - 1 && <span style={{ fontSize: 14, color: "#9ca3af", padding: "0 4px" }}>…</span>}
                <button onClick={() => setCurrentPage(totalPages)} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "'Google Sans', sans-serif" }}>{totalPages}</button>
              </>
            )}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", fontSize: 13, fontWeight: 600, cursor: currentPage === totalPages ? "not-allowed" : "pointer", opacity: currentPage === totalPages ? 0.5 : 1, fontFamily: "'Google Sans', sans-serif", color: "#374151" }}
            >Next ›</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Mobile-specific styles
const mobileListStyles = {
  page: {
    height: "100%",
    minHeight: "100vh",
    background: "#f4f5f7",
    fontFamily: "'Google Sans', sans-serif",
    padding: "16px",
    overflowY: "auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: "#0f172a",
  },
  headerButtons: {
    display: "flex",
    gap: 8,
  },
  refreshBtn: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    background: "#fff",
    fontSize: 18,
    cursor: "pointer",
  },
  addNewBtn: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "none",
    background: "#1a73e8",
    color: "#fff",
    fontSize: 20,
    fontWeight: 700,
    cursor: "pointer",
  },
  errorBanner: {
    marginBottom: 16,
    padding: "10px 12px",
    background: "#fff5f5",
    border: "1px solid #fca5a5",
    borderRadius: 8,
    color: "#b91c1c",
    fontSize: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  retryBtn: {
    padding: "4px 10px",
    borderRadius: 6,
    border: "1px solid #fca5a5",
    background: "#fee2e2",
    color: "#b91c1c",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
  },
  toolbar: {
    display: "flex",
    gap: 8,
    marginBottom: 12,
  },
  searchWrap: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: "8px 12px",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    border: "none",
    outline: "none",
    fontSize: 14,
    fontFamily: "'Google Sans', sans-serif",
    background: "transparent",
  },
  filterBtn: {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    background: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
  },
  filterBar: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    padding: "6px 14px",
    borderRadius: 20,
    border: "none",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
  },
  emptyState: {
    textAlign: "center",
    padding: "60px 20px",
    color: "#6b7280",
  },
  card: {
    background: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    border: "1px solid #e9ecef",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    
  },
  cardUser: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "#0883f5",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 700,
  },
  userName: {
    fontWeight: 600,
    color: "#111827",
    fontSize: 14,
  },
  cardDate: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
  },
  slNoBadge: {
    backgroundColor: "#e2e8f0",
    padding: "4px 10px",
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 600,
    color: "#475569",
  },
  cardDetails: {
    marginBottom: 12,
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    paddingVertical: 6,
    fontSize: 13,
    borderBottom: "1px solid #f0f0f0",
    padding: "8px 0",
  },
  detailLabel: {
    color: "#6b7280",
    fontWeight: 500,
  },
  amount: {
    fontWeight: 700,
    color: "#1e3a5f",
  },
  cardActions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
    paddingTop: 8,
    borderTop: "1px solid #f0f0f0",
  },
  statusSelect: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1.5px solid",
    fontWeight: 600,
    fontSize: 12,
    fontFamily: "'Google Sans', sans-serif",
    background: "#fff",
    cursor: "pointer",
    flex: 1,
  },
  actionButtons: {
    display: "flex",
    gap: 12,
  },
  iconBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 6,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    color: "#1a73e8",
  },
};

// Desktop styles (original)
const desktopListStyles = {
  page: {
    height: "100%",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    padding: "12px 24px 16px",
    overflow: "hidden",
    fontFamily: "'Google Sans', sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    flexShrink: 0,
  },
  title: {
    fontFamily: "'Google Sans', sans-serif",
    fontSize: 25,
    fontWeight: 600,
    color: "#0f172a",
    letterSpacing: "-0.5px",
    whiteSpace: "nowrap",
  },
  refreshBtn: {
    padding: "8px 16px",
    borderRadius: 10,
    border: "1.5px solid #cbd5e1",
    background: "#f8fafc",
    color: "#334155",
    fontSize: 13,
    fontFamily: "'Google Sans', sans-serif",
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  addNewBtn: {
    padding: "8px 20px",
    borderRadius: 10,
    border: "none",
    background: "#1a73e8",
    color: "#fff",
    fontSize: 13,
    fontFamily: "'Google Sans', sans-serif",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(15,39,68,0.25)",
    whiteSpace: "nowrap",
  },
  errorBanner: {
    margin: "0 0 10px",
    padding: "10px 16px",
    background: "#fff5f5",
    border: "1px solid #fca5a5",
    borderRadius: 8,
    color: "#b91c1c",
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  retryBtn: {
    padding: "4px 12px",
    borderRadius: 6,
    border: "1px solid #fca5a5",
    background: "#fee2e2",
    color: "#b91c1c",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  toolbar: {
    display: "none",
  },
  searchWrap: {
    display: "flex",
    alignItems: "center",
    background: "#fff",
    border: "1.5px solid #e5e7eb",
    borderRadius: 10,
    padding: "0 12px",
    width: 280,
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  },
  searchInput: {
    border: "none",
    outline: "none",
    padding: "8px 0",
    fontSize: 13,
    fontFamily: "'Google Sans', sans-serif",
    background: "transparent",
    width: "100%",
    color: "#111827",
  },
  tableContainer: {
    flex: 1,
    minHeight: 0,
    overflowX: "auto",
    overflowY: "auto",
    borderRadius: 16,
    background: "#fff",
    boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
    border: "1px solid #e9ecef",
  },
  tableWrap: {
    minWidth: "100%",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 1000 },
  theadRow: { background: "#0990eb" },
  th: {
    padding: "13px 16px",
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
    padding: "13px 16px",
    color: "#0d0d0e",
    borderBottom: "1px solid #f0f0f0",
    whiteSpace: "nowrap",
    verticalAlign: "middle",
    textAlign: "left",
    fontSize: 14,
  },
  dateContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  dateText: {
    fontSize: 14,
    fontWeight: 600,
    color: "#1e293b",
  },
  timeText: {
    fontSize: 12,
    fontWeight: 500,
    color: "#64748b",
  },
  avatar: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "#0883f5",
    color: "#fff",
    fontSize: 11,
    fontWeight: 700,
    marginRight: 9,
    verticalAlign: "middle",
  },
  deptTag: {
    color: "#070707",
    borderRadius: 6,
    padding: "2px 9px",
    fontSize: 14,
    fontWeight: 500,
    display: "inline-block",
  },
  emptyCell: { padding: "60px 0", textAlign: "center" },
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    color: "#6b7280",
  },
  statusSelect: {
    padding: "5px 10px",
    borderRadius: 6,
    borderWidth: "1.5px",
    fontWeight: 600,
    fontSize: 13,
    fontFamily: "'Google Sans', sans-serif",
    cursor: "pointer",
    outline: "none",
  },
  viewBtn: {
    padding: "5px 12px",
    borderRadius: 6,
    border: "none",
    background: "#1a73e8",
    color: "#fff",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  },
  editBtn: {
    padding: "5px 12px",
    borderRadius: 6,
    border: "none",
    background: "#1a73e8",
    color: "#fff",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  deleteBtn: {
    padding: "5px 12px",
    borderRadius: 6,
    border: "none",
    background: "#d93025",
    color: "#fff",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
};

// Modal styles (mobile-optimized)
const mobileModalStyles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "12px",
  },
  modal: {
    position: "relative",
    width: "50%",
    maxWidth: "95%",
    maxHeight: "90vh",
    overflowY: "auto",
    borderRadius: 20,
    backgroundColor: "#fff",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  },
  closeBtn: {
    position: "sticky",
    top: 12,
    right: 12,
    float: "right",
    width: 36,
    height: 36,
    borderRadius: "50%",
    border: "none",
    background: "rgba(0,0,0,0.5)",
    color: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    margin: "8px 8px 0 0",
  },
};

const receiptModalStyles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.9)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1100,
    padding: "16px",
  },
  modal: {
    position: "relative",
    maxWidth: "95vw",
    maxHeight: "90vh",
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
  },
  closeBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: "50%",
    border: "none",
    background: "rgba(0,0,0,0.6)",
    color: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  container: {
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  title: {
    margin: "0 0 12px 0",
    fontSize: 18,
    fontWeight: 600,
    color: "#1a73e8",
  },
  imageContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minWidth: 200,
    minHeight: 200,
  },
  receiptImage: {
    maxWidth: "100%",
    maxHeight: "70vh",
    objectFit: "contain",
    borderRadius: 8,
  },
  noReceipt: {
    padding: 40,
    textAlign: "center",
    color: "#9ca3af",
    fontSize: 14,
  },
};