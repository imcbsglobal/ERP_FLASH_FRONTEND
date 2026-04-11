// Dashboard.jsx — Self-contained, wired to erp.flashinnovations.in

import { useState, useEffect } from "react";

// ── Base URL ─────────────────────────────────────────────────────
// All Django REST routes live under /api/ on the backend.
// Set VITE_API_BASE_URL in your .env to override (e.g. for local dev).
const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://erp.flashinnovations.in').replace(/\/$/, '');
const API = `${BASE_URL}/api`;

// ── Auth helpers ─────────────────────────────────────────────────
function authHeaders(extra = {}) {
  const token = localStorage.getItem('access_token');
  const headers = { 'Accept': 'application/json', ...extra };
  if (token) {
    headers['Authorization'] = `Bearer ${token.replace(/^Bearer\s+/i, '')}`;
  }
  return headers;
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return null;
  try {
    const response = await fetch(`${API}/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('access_token', data.access);
      if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
      return data.access;
    }
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      return null;
    }
    throw new Error(`Token refresh server error (${response.status}).`);
  } catch (error) {
    if (error.message.startsWith('Token refresh server error')) throw error;
    return null;
  }
}

class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthError';
  }
}

// ── Safe fetch ───────────────────────────────────────────────────
// Handles 401 token refresh, and guards against HTML error pages
// (which would cause "Unexpected token '<'" if passed to .json()).
async function apiFetch(url, options = {}) {
  let res = await fetch(url, options);

  if (res.status === 401) {
    let newToken = null;
    try { newToken = await refreshAccessToken(); } catch (e) { throw new Error(e.message); }
    if (newToken) {
      res = await fetch(url, {
        ...options,
        headers: { ...options.headers, 'Authorization': `Bearer ${newToken}` },
      });
    } else {
      throw new AuthError('Session expired. Please log in again.');
    }
  }

  if (res.status === 204) return null;

  // If the server returns HTML instead of JSON (nginx 404/500 page),
  // skip .json() to avoid the "Unexpected token '<'" crash.
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (!res.ok) {
      if (res.status === 401) throw new AuthError('Session expired. Please log in again.');
      throw new Error(`Server returned status ${res.status}. Check the API base URL in your .env file.`);
    }
    return null;
  }

  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401) throw new AuthError('Session expired. Please log in again.');
    const msg = data?.detail
      || Object.entries(data).map(([f, e]) => `${f}: ${Array.isArray(e) ? e.join(', ') : e}`).join(' | ');
    throw new Error(msg || `Error ${res.status}`);
  }
  return data;
}

// ── Normalize a raw payment record ───────────────────────────────
// Handles both camelCase and snake_case field names from Django REST.
function normalizePayment(p) {
  return {
    id:     p.id,
    date:   p.date || p.payment_date || p.created_at || null,
    amount: parseFloat(p.amount || p.total_amount || p.paid_amount || 0),
    status: p.status || '',
    method: p.payment_method || p.method || '',
    note:   p.note || p.remarks || '',
  };
}

// ── Normalize a raw trip record ───────────────────────────────────
function normalizeTrip(t) {
  return {
    id:                  t.id,
    date:                t.date || t.trip_date || t.created_at || null,
    status:              t.status || '',
    vehicle:             t.vehicle_name || t.vehicle || t.vehicle_number || '—',
    registration_number: t.registration_number || t.vehicle_reg || t.reg_no || '',
    traveled_by:         t.traveled_by || t.driver || t.created_by_name || '—',
    start_time:          t.start_time || t.startTime || '',
    end_time:            t.end_time   || t.endTime   || '',
  };
}

// ── Process payments into chart data ─────────────────────────────
function processPaymentData(payments) {
  if (!payments.length) return {
    yearlyData: [], monthlyData: [], salesOverviewData: [],
    totalYearly: 0, avgMonthly: 0, lastMonthEarning: 0, allMonthly: [],
  };

  const yearlyMap  = new Map();
  const monthlyMap = new Map();

  payments.forEach(p => {
    if (!p.date) return;
    const date      = new Date(p.date);
    const year      = date.getFullYear();
    const yearMonth = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthName = date.toLocaleString('default', { month: 'short' });
    const amount    = p.amount || 0;

    if (!yearlyMap.has(year)) yearlyMap.set(year, { total: 0, year });
    yearlyMap.get(year).total += amount;

    if (!monthlyMap.has(yearMonth)) {
      monthlyMap.set(yearMonth, { total: 0, monthName, year, month: date.getMonth(), yearMonth });
    }
    monthlyMap.get(yearMonth).total += amount;
  });

  const yearlyData = Array.from(yearlyMap.values())
    .sort((a, b) => a.year - b.year)
    .map(y => ({ label: y.year.toString(), value: Math.round(y.total) }));

  const allMonthly = Array.from(monthlyMap.values())
    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);

  const monthlyData = allMonthly.slice(-6).map(m => ({
    label: m.monthName, value: Math.round(m.total), yearMonth: m.yearMonth,
  }));

  const salesOverviewData = allMonthly.slice(-8).map(m => ({
    label: m.monthName, value: Math.round(m.total), year: m.year, month: m.month,
  }));

  const totalYearly      = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const avgMonthly       = monthlyData.length ? Math.round(monthlyData.reduce((s, m) => s + m.value, 0) / monthlyData.length) : 0;
  const lastMonthEarning = monthlyData.length ? monthlyData[monthlyData.length - 1].value : 0;

  return { yearlyData, monthlyData, salesOverviewData, totalYearly, avgMonthly, lastMonthEarning, allMonthly };
}

// ── Build daily totals for a specific "Mon YYYY" month ────────────
function buildDailyData(payments, selectedMonth) {
  const monthNames     = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const monthNamesFull = ['january','february','march','april','may','june','july','august','september','october','november','december'];

  const parts      = selectedMonth.trim().split(' ');
  const monthInput = parts[0].toLowerCase();

  let monthIdx = monthNames.findIndex(m => monthInput === m || monthInput.startsWith(m));
  if (monthIdx === -1) monthIdx = monthNamesFull.findIndex(m => monthInput === m || monthInput.startsWith(m));

  const year = parseInt(parts[1], 10);
  if (monthIdx === -1 || isNaN(year)) return [];

  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const dayMap = {};

  payments.forEach(p => {
    if (!p.date) return;
    const d = new Date(p.date);
    if (d.getFullYear() === year && d.getMonth() === monthIdx) {
      const day = d.getDate();
      dayMap[day] = (dayMap[day] || 0) + (p.amount || 0);
    }
  });

  return Array.from({ length: daysInMonth }, (_, i) => ({
    label: String(i + 1),
    value: Math.round(dayMap[i + 1] || 0),
  }));
}

// ── Line Chart ────────────────────────────────────────────────────
function LineChart({ data }) {
  if (!data.length) return (
    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>
      No data for this month
    </div>
  );
  if (!data.some(d => d.value > 0)) return (
    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>
      No collections recorded this month
    </div>
  );

  const W = 600, H = 160;
  const padL = 8, padR = 8, padT = 12, padB = 28;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const max    = Math.max(...data.map(d => d.value), 1);

  const xPos = (i) => padL + (i / (data.length - 1)) * chartW;
  const yPos = (v) => padT + chartH - (v / max) * chartH;
  const showLabel = (label) => { const n = parseInt(label); return n === 1 || n % 5 === 0; };

  const points     = data.map((d, i) => `${xPos(i)},${yPos(d.value)}`).join(' ');
  const firstX     = xPos(0), lastX = xPos(data.length - 1);
  const areaPoints = `${firstX},${padT + chartH} ${points} ${lastX},${padT + chartH}`;
  const peakIdx    = data.reduce((best, d, i) => d.value > data[best].value ? i : best, 0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a90d9" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#4a90d9" stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
        <line key={i} x1={padL} y1={padT + chartH - t * chartH} x2={W - padR} y2={padT + chartH - t * chartH} stroke="#f0f0f0" strokeWidth={1} />
      ))}
      <polygon points={areaPoints} fill="url(#lineGrad)" />
      <polyline points={points} fill="none" stroke="#4a90d9" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => d.value > 0 && (
        <circle key={i} cx={xPos(i)} cy={yPos(d.value)}
          r={i === peakIdx ? 4.5 : 3}
          fill={i === peakIdx ? '#4a90d9' : '#fff'}
          stroke="#4a90d9" strokeWidth={i === peakIdx ? 0 : 2} />
      ))}
      {data.map((d, i) => showLabel(d.label) && (
        <text key={i} x={xPos(i)} y={H - 4} fontSize="8.5" fill="#9ca3af" textAnchor="middle">{d.label}</text>
      ))}
    </svg>
  );
}

// ── Donut Chart ───────────────────────────────────────────────────
function DonutChart({ yearlyData }) {
  if (!yearlyData.length) return <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#e5e7eb' }} />;

  const total = yearlyData.reduce((s, y) => s + y.value, 0);
  const colors = ['#4a90d9', '#a8cff0', '#1a56a0', '#c8e0f8'];
  const r = 28, cx = 36, cy = 36, stroke = 10;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const segments = yearlyData.map((y, i) => {
    const pct = total ? y.value / total : 0;
    const dash = pct * circumference;
    const seg  = { offset, dash, color: colors[i % colors.length] };
    offset += dash;
    return seg;
  });

  return (
    <svg width={72} height={72} viewBox="0 0 72 72">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0f4f8" strokeWidth={stroke} />
      {segments.map((s, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={s.color} strokeWidth={stroke}
          strokeDasharray={`${s.dash} ${circumference - s.dash}`}
          strokeDashoffset={-s.offset + circumference * 0.25}
          style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      ))}
    </svg>
  );
}

// ── Sparkline ─────────────────────────────────────────────────────
function Sparkline({ data, color = '#4a90d9' }) {
  if (!data.length) return null;
  const w = 220, h = 50;
  const max = Math.max(...data.map(d => d.value), 1);
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (d.value / max) * (h - 8) - 4;
    return `${x},${y}`;
  });
  const polyline = pts.join(' ');
  const area = `0,${h} ${polyline} ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 50 }}>
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#sparkGrad)" />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Recent Trips Section ──────────────────────────────────────────
// NOTE: If your trips endpoint uses a different path, update the URL below.
// Common Django REST paths: /api/trips/, /api/vehicle-management/trips/
function RecentTripsSection() {
  const [trips, setTrips]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch(`${API}/vehicle-management/trips/`, {
          headers: authHeaders(),
        });
        const raw = Array.isArray(data) ? data : (data?.results ?? []);
        setTrips(raw.map(normalizeTrip));
      } catch (err) {
        setError(err.message || 'Failed to load trips.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const thStyle = {
    fontSize: 11, fontWeight: 700, color: '#6b7280',
    padding: '10px 16px', background: '#f7f8fa',
    borderBottom: '1px solid #eaecef', textAlign: 'left',
    whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.5px',
  };
  const tdStyle = {
    padding: '11px 16px', fontSize: 13,
    borderBottom: '1px solid #f3f4f6',
    color: '#374151', verticalAlign: 'middle', textAlign: 'left',
  };

  return (
    <div style={{ maxWidth: 1280, margin: '20px auto 0' }}>
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1f2937' }}>Active Trips</h2>
            <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>Currently ongoing trips</p>
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', fontSize: 13 }}>Loading trips…</div>
        )}
        {error && (
          <div style={{ background: '#fdecea', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: '#c62828', fontSize: 13 }}>⚠️ {error}</div>
        )}
        {!loading && !error && trips.length === 0 && (
          <div style={{ textAlign: 'center', padding: '36px 0', color: '#9ca3af', fontSize: 13 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🚗</div>No trips recorded yet.
          </div>
        )}

        {!loading && !error && trips.length > 0 && (() => {
          const ongoing = trips.filter(t => t.status !== 'completed');
          if (ongoing.length === 0) return (
            <div style={{ textAlign: 'center', padding: '36px 0', color: '#9ca3af', fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>No ongoing trips right now.
            </div>
          );
          return (
            <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #eaecef' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Sl.No</th>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Vehicle</th>
                    <th style={thStyle}>Created By</th>
                    <th style={thStyle}>Start Time</th>
                    <th style={thStyle}>End Time</th>
                  </tr>
                </thead>
                <tbody>
                  {ongoing.map((row, idx) => {
                    const dateFmt = row.date
                      ? new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—';
                    const hasEnd  = !!row.end_time;
                    const initial = (row.traveled_by || '?')[0]?.toUpperCase();
                    return (
                      <tr key={row.id || idx}
                        onMouseEnter={e => e.currentTarget.style.background = '#f7f8fa'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        style={{ transition: 'background 0.15s' }}>
                        <td style={{ ...tdStyle, color: '#9ca3af', fontWeight: 600, width: 48 }}>{idx + 1}</td>
                        <td style={tdStyle}><span style={{ fontWeight: 600, color: '#1f2937' }}>{dateFmt}</span></td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontWeight: 700, color: '#1f2937', fontSize: 13 }}>{row.vehicle}</span>
                            {row.registration_number && (
                              <span style={{ color: '#1a6fdb', fontSize: 11, fontWeight: 600, letterSpacing: '0.4px' }}>
                                {row.registration_number}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e8f0fe', color: '#1a6fdb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                              {initial}
                            </div>
                            <span style={{ fontWeight: 600, color: '#1f2937' }}>{row.traveled_by}</span>
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#2e7d32', fontWeight: 600 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2e7d32', flexShrink: 0, display: 'inline-block' }} />
                            {row.start_time || '—'}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: hasEnd ? '#b71c1c' : '#9ca3af', fontWeight: hasEnd ? 600 : 400, fontStyle: hasEnd ? 'normal' : 'italic' }}>
                            {hasEnd
                              ? <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#b71c1c', flexShrink: 0, display: 'inline-block' }} />
                              : <span style={{ width: 8, height: 8, borderRadius: '50%', border: '2px solid #9ca3af', flexShrink: 0, display: 'inline-block' }} />
                            }
                            {hasEnd ? row.end_time : 'Ongoing'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────
const card = {
  background: '#fff',
  borderRadius: 16,
  padding: '20px 22px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  border: '1px solid #eaecef',
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

// ── Main Dashboard ────────────────────────────────────────────────
export default function Dashboard() {
  const [payments, setPayments]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [isAuthError, setIsAuthError] = useState(false);
  const [stats, setStats] = useState({
    yearlyData: [], monthlyData: [], salesOverviewData: [],
    totalYearly: 0, avgMonthly: 0, lastMonthEarning: 0,
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.toLocaleString('default', { month: 'short' })} ${now.getFullYear()}`;
  });

  const months = (() => {
    const list = [];
    const now  = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      list.push(`${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`);
    }
    return list;
  })();

  const loadPayments = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      setIsAuthError(true);
      setError('Please log in to view the dashboard.');
      return;
    }

    setLoading(true);
    setError(null);
    setIsAuthError(false);

    try {
      // Fetches up to 1000 records for complete chart data.
      // NOTE: Update the path below to match your Django router exactly.
      // Common patterns: /api/payments/, /api/collection/payments/, /api/collections/
      const data = await apiFetch(`${API}/payments/?page_size=1000`, {
        headers: authHeaders(),
      });

      const raw            = Array.isArray(data) ? data : (data?.results ?? []);
      const normalizedList = raw.map(normalizePayment);

      setPayments(normalizedList);
      setStats(processPaymentData(normalizedList));
    } catch (err) {
      if (err.name === 'AuthError') {
        setIsAuthError(true);
        setError(err.message);
      } else {
        setError(err.message || 'Failed to load payments.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPayments(); }, []);

  // ── Loading ──
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", background: '#f7f8fa' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #e5e7eb', borderTopColor: '#4a90d9', borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 14px' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: '#9ca3af', fontSize: 14 }}>Loading dashboard…</p>
      </div>
    </div>
  );

  // ── Error ──
  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", background: '#f7f8fa' }}>
      <div style={{ textAlign: 'center', padding: 28, background: '#fff1f1', borderRadius: 14, border: '1px solid #fecaca', maxWidth: 360 }}>
        <p style={{ color: '#dc2626', marginBottom: 14, fontSize: 14 }}>{error}</p>
        {isAuthError ? (
          <button style={btnStyle('#4a90d9')} onClick={() => { localStorage.removeItem('access_token'); localStorage.removeItem('refresh_token'); window.location.href = '/login'; }}>
            Go to Login
          </button>
        ) : (
          <button style={btnStyle('#4a90d9')} onClick={loadPayments}>Retry</button>
        )}
      </div>
    </div>
  );

  // ── Empty State ──
  if (payments.length === 0) return (
    <div style={{ minHeight: '100vh', background: '#f7f8fa', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', background: '#fff', borderRadius: 20, padding: '48px 40px', maxWidth: 440, border: '1px solid #eaecef' }}>
        <div style={{ fontSize: 44, marginBottom: 14 }}>📊</div>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1f2937', marginBottom: 8 }}>No payment data yet</h2>
        <p style={{ color: '#9ca3af', marginBottom: 22, fontSize: 14 }}>Add payments to see analytics and charts.</p>
        <button style={btnStyle('#4a90d9')} onClick={() => window.location.href = '/collections'}>Go to Collections</button>
      </div>
    </div>
  );

  const { yearlyData, monthlyData, totalYearly, avgMonthly, lastMonthEarning } = stats;

  const prevYear  = yearlyData.length > 1 ? yearlyData[yearlyData.length - 2] : null;
  const currYear  = yearlyData.length > 0 ? yearlyData[yearlyData.length - 1] : null;
  const yoyChange = prevYear && currYear ? ((currYear.value - prevYear.value) / prevYear.value * 100).toFixed(0) : 0;

  return (
    <div style={{ minHeight: '100vh', background: '#f7f8fa', fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif", padding: '28px 32px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .dash-select { appearance: none; -webkit-appearance: none; background: #f0f4f8; border: 1px solid #dde3ea; border-radius: 8px; padding: 6px 28px 6px 12px; font-size: 13px; font-weight: 500; color: #374151; cursor: pointer; outline: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 8px center; font-family: inherit; }
        .dash-select:hover { border-color: #4a90d9; }
        .stat-badge-up   { display: inline-flex; align-items: center; gap: 3px; background: #e8f5e9; color: #2e7d32; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        .stat-badge-down { display: inline-flex; align-items: center; gap: 3px; background: #fdecea; color: #c62828; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        .icon-circle  { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
        .legend-dot   { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
      `}</style>

      {/* ── Main 2-column Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, maxWidth: 1280, margin: '0 auto' }}>

        {/* LEFT: Collection Overview */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1f2937' }}>Collection Overview</h2>
            <select className="dash-select" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
              {months.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minHeight: 180 }}>
            {(() => {
              const dailyData  = buildDailyData(payments, selectedMonth);
              const monthTotal = dailyData.reduce((s, d) => s + d.value, 0);
              return (
                <>
                  <div style={{ marginBottom: 8, display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <span style={{ fontSize: 22, fontWeight: 700, color: '#1f2937', letterSpacing: '-0.5px' }}>
                      {formatCurrency(monthTotal)}
                    </span>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>total for {selectedMonth}</span>
                  </div>
                  <LineChart data={dailyData} />
                </>
              );
            })()}
          </div>
        </div>

        {/* RIGHT: Stacked cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Yearly Breakup */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>Yearly Breakup</p>
                <div style={{ fontSize: 26, fontWeight: 700, color: '#1f2937', letterSpacing: '-0.5px' }}>
                  {formatCurrency(totalYearly)}
                </div>
                {yoyChange !== 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <span className={yoyChange >= 0 ? 'stat-badge-up' : 'stat-badge-down'}>
                      {yoyChange >= 0 ? '▲' : '▼'} {Math.abs(yoyChange)}%
                    </span>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>vs last year</span>
                  </div>
                )}
              </div>
              <DonutChart yearlyData={yearlyData} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8 }}>
              {yearlyData.slice(-2).map((y, i) => (
                <div key={y.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div className="legend-dot" style={{ background: i === 0 ? '#a8cff0' : '#4a90d9' }} />
                  <span style={{ fontSize: 11, color: '#070707' }}>{y.label}</span>
                  <span style={{ fontSize: 11, color: '#374151', fontWeight: 600, marginLeft: 'auto' }}>{formatCurrency(y.value)}</span>
                </div>
              ))}
              {yearlyData.length === 0 && <span style={{ fontSize: 12, color: '#c4c9d4' }}>No yearly data</span>}
            </div>
          </div>

          {/* Monthly Earnings */}
          <div style={{ ...card, overflow: 'hidden', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>Monthly Earnings</p>
                <div style={{ fontSize: 26, fontWeight: 700, color: '#1f2937', letterSpacing: '-0.5px' }}>
                  {formatCurrency(lastMonthEarning || avgMonthly)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <span className="stat-badge-up">▲ +9%</span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>vs last year</span>
                </div>
              </div>
              <div className="icon-circle" style={{ background: '#4a90d9' }}>
                <span style={{ fontSize: 16 }}>₹</span>
              </div>
            </div>
            <div style={{ marginTop: 10, marginLeft: -22, marginRight: -22, marginBottom: -20 }}>
              <Sparkline data={monthlyData} color="#4a90d9" />
            </div>
          </div>

        </div>
      </div>

      {/* Recent Trips */}
      <RecentTripsSection />
    </div>
  );
}

function btnStyle(bg) {
  return { padding: '8px 22px', borderRadius: 8, border: 'none', background: bg, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' };
}