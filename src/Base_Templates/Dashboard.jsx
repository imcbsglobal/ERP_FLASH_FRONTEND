// Dashboard.jsx - Updated version with improved authentication handling
// Active Trips now displays as TABLE on desktop and CARDS on mobile
// All th/td cells properly aligned to the left

import { useState, useEffect } from "react";
import { fetchPayments, normalizePayment, fetchTrips } from '../service/Api';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// ── Auth helpers ────────────────────────────────────────────────
function authHeaders(extra = {}) {
  const token = localStorage.getItem('access') || localStorage.getItem('access_token');
  const headers = { 'Accept': 'application/json', ...extra };
  if (token) {
    const rawToken = token.replace(/^Bearer\s+/i, '');
    headers['Authorization'] = `Bearer ${rawToken}`;
  }
  return headers;
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refresh') || localStorage.getItem('refresh_token');
  if (!refreshToken) return null;
  
  try {
    const response = await fetch(`${BASE_URL}/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });
    
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('access', data.access);
      localStorage.setItem('access_token', data.access);
      if (data.refresh) {
        localStorage.setItem('refresh', data.refresh);
        localStorage.setItem('refresh_token', data.refresh);
      }
      return data.access;
    }
    
    if (response.status === 401 || response.status === 403) {
      clearAuthTokens();
      return null;
    }
    
    console.warn(`Token refresh failed with status ${response.status}`);
    return null;
  } catch (error) {
    console.warn('Token refresh network error:', error.message);
    return null;
  }
}

function clearAuthTokens() {
  ['access', 'access_token', 'refresh', 'refresh_token'].forEach(k => localStorage.removeItem(k));
}

function isTokenExpired() {
  const token = localStorage.getItem('access') || localStorage.getItem('access_token');
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch (e) {
    return true;
  }
}

class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthError';
  }
}

async function apiFetch(url, options = {}) {
  let res = await fetch(url, options);
  
  if (res.status === 401) {
    let newToken = null;
    try { 
      newToken = await refreshAccessToken(); 
    } catch (e) { 
      throw new Error(e.message); 
    }
    
    if (newToken) {
      const newOptions = {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${newToken}`
        }
      };
      res = await fetch(url, newOptions);
    } else {
      throw new AuthError('Session expired. Please log in again.');
    }
  }
  
  if (res.status === 204) return null;
  
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401) throw new AuthError('Session expired. Please log in again.');
    const msg = data?.detail || Object.entries(data).map(([f, e]) => `${f}: ${Array.isArray(e) ? e.join(', ') : e}`).join(' | ');
    throw new Error(msg || `Error ${res.status}`);
  }
  return data;
}

// ── Process payments into chart data ───────────────────────────
function processPaymentData(payments) {
  console.log('Processing payments:', payments.length);
  
  if (!payments.length) return { 
    yearlyData: [], 
    monthlyData: [], 
    salesOverviewData: [], 
    totalYearly: 0, 
    avgMonthly: 0, 
    lastMonthEarning: 0,
    allMonthlyData: []
  };

  const yearlyMap = new Map();
  const monthlyMap = new Map();

  payments.forEach(p => {
    if (!p.date) return;
    const date = new Date(p.date);
    const year = date.getFullYear();
    const yearMonth = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthName = date.toLocaleString('default', { month: 'short' });
    const amount = p.amount || 0;

    if (!yearlyMap.has(year)) yearlyMap.set(year, { total: 0, year });
    yearlyMap.get(year).total += amount;

    if (!monthlyMap.has(yearMonth)) {
      monthlyMap.set(yearMonth, { 
        total: 0, 
        monthName, 
        year, 
        month: date.getMonth(),
        yearMonth 
      });
    }
    monthlyMap.get(yearMonth).total += amount;
  });

  const yearlyData = Array.from(yearlyMap.values())
    .sort((a, b) => a.year - b.year)
    .map(y => ({ label: y.year.toString(), value: Math.round(y.total) }));

  const allMonthly = Array.from(monthlyMap.values())
    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);

  const monthlyData = allMonthly.slice(-6).map(m => ({ 
    label: m.monthName, 
    value: Math.round(m.total),
    yearMonth: m.yearMonth
  }));

  const salesOverviewData = allMonthly.slice(-8).map(m => ({ 
    label: m.monthName, 
    value: Math.round(m.total),
    year: m.year,
    month: m.month
  }));

  const totalYearly = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const avgMonthly = monthlyData.length ? Math.round(monthlyData.reduce((s, m) => s + m.value, 0) / monthlyData.length) : 0;
  const lastMonthEarning = monthlyData.length ? monthlyData[monthlyData.length - 1].value : 0;

  console.log('Processed stats:', { yearlyData, monthlyData, totalYearly, lastMonthEarning });

  return { yearlyData, monthlyData, salesOverviewData, totalYearly, avgMonthly, lastMonthEarning, allMonthly };
}

// ── Build daily totals for a specific "Mon YYYY" month ──────────
function buildDailyData(payments, selectedMonth) {
  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const monthNamesFull = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  
  const parts = selectedMonth.trim().split(' ');
  const monthInput = parts[0].toLowerCase();
  
  let monthIdx = monthNames.findIndex(m => monthInput === m || monthInput.startsWith(m));
  if (monthIdx === -1) {
    monthIdx = monthNamesFull.findIndex(m => monthInput === m || monthInput.startsWith(m));
  }
  
  const year = parseInt(parts[1], 10);
  
  if (monthIdx === -1 || isNaN(year)) {
    console.warn('Invalid month parsing:', selectedMonth);
    return [];
  }

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

// ── Line Chart (Collection Overview) ───────────────────────────
function LineChart({ data }) {
  if (!data.length) return (
    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>
      No data for this month
    </div>
  );

  const hasAnyValue = data.some(d => d.value > 0);
  if (!hasAnyValue) return (
    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>
      No collections recorded this month
    </div>
  );

  const W = 600, H = 160;
  const padL = 8, padR = 8, padT = 12, padB = 28;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const max = Math.max(...data.map(d => d.value), 1);

  const xPos = (i) => padL + (i / (data.length - 1)) * chartW;
  const yPos = (v) => padT + chartH - (v / max) * chartH;

  const showLabel = (label) => {
    const n = parseInt(label);
    return n === 1 || n % 5 === 0;
  };

  const points = data.map((d, i) => `${xPos(i)},${yPos(d.value)}`).join(' ');
  const firstX = xPos(0), lastX = xPos(data.length - 1);
  const areaPoints = `${firstX},${padT + chartH} ${points} ${lastX},${padT + chartH}`;
  const peakIdx = data.reduce((best, d, i) => d.value > data[best].value ? i : best, 0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a90d9" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#4a90d9" stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
        <line key={i}
          x1={padL} y1={padT + chartH - t * chartH}
          x2={W - padR} y2={padT + chartH - t * chartH}
          stroke="#f0f0f0" strokeWidth={1} />
      ))}

      <polygon points={areaPoints} fill="url(#lineGrad)" />

      <polyline
        points={points}
        fill="none"
        stroke="#4a90d9"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {data.map((d, i) => d.value > 0 && (
        <circle key={i}
          cx={xPos(i)} cy={yPos(d.value)}
          r={i === peakIdx ? 4.5 : 3}
          fill={i === peakIdx ? '#4a90d9' : '#fff'}
          stroke="#4a90d9"
          strokeWidth={i === peakIdx ? 0 : 2}
        />
      ))}

      {data.map((d, i) => showLabel(d.label) && (
        <text key={i}
          x={xPos(i)} y={H - 4}
          fontSize="8.5" fill="#9ca3af" textAnchor="middle">
          {d.label}
        </text>
      ))}
    </svg>
  );
}

// ── Donut Chart (Yearly Breakup) ────────────────────────────────
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
    const seg = { offset, dash, color: colors[i % colors.length] };
    offset += dash;
    return seg;
  });

  return (
    <svg width={72} height={72} viewBox="0 0 72 72">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0f4f8" strokeWidth={stroke} />
      {segments.map((s, i) => (
        <circle
          key={i}
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={s.color}
          strokeWidth={stroke}
          strokeDasharray={`${s.dash} ${circumference - s.dash}`}
          strokeDashoffset={-s.offset + circumference * 0.25}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      ))}
    </svg>
  );
}

// ── Sparkline (Monthly Earnings) ────────────────────────────────
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

// ── Recent Trips Section (UPDATED: Table on Desktop, Cards on Mobile, All Left-Aligned) ──
function RecentTripsSection() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      const token = localStorage.getItem('access') || localStorage.getItem('access_token');
      if (!token) {
        setError('Not authenticated.');
        setLoading(false);
        return;
      }
      try {
        const data = await fetchTrips();
        const list = Array.isArray(data) ? data : (data.results || []);
        setTrips(list);
      } catch (err) {
        setError(err.message || 'Failed to load trips.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Converts "HH:MM" or "HH:MM:SS" to "h:MM AM/PM"
  const formatTime = (time) => {
    if (!time || time === '—') return '—';
    const [hStr, mStr] = time.split(':');
    const h = parseInt(hStr, 10);
    const m = mStr || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${m} ${ampm}`;
  };

  // Filter only active (ongoing) trips
  const ongoingTrips = trips.filter(t => t.status !== 'completed');

  return (
    <div style={{ maxWidth: 1280, margin: '16px auto 0' }}>
      <div style={{ ...card, padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1f2937' }}>Active Trips</h2>
            <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>Currently ongoing trips</p>
          </div>
          <div style={{ fontSize: 12, fontWeight: 500, background: '#e8f0fe', padding: '4px 10px', borderRadius: 20, color: '#1a6fdb' }}>
            {ongoingTrips.length} active
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', fontSize: 13 }}>Loading trips…</div>
        )}
        {error && (
          <div style={{ background: '#fdecea', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: '#c62828', fontSize: 13 }}>⚠️ {error}</div>
        )}
        {!loading && !error && ongoingTrips.length === 0 && (
          <div style={{ textAlign: 'center', padding: '36px 0', color: '#9ca3af', fontSize: 13 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🚗</div>
            No active trips at the moment.
          </div>
        )}

        {!loading && !error && ongoingTrips.length > 0 && (
          <>
            {/* DESKTOP VIEW: Table format (visible on screens >= 768px) - ALL CELLS LEFT-ALIGNED */}
            <div className="trips-table-container">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #eaecef', background: '#f8f9fa' }}>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600, color: '#5f6b7a' }}>#</th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600, color: '#5f6b7a' }}>Vehicle</th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600, color: '#5f6b7a' }}>Reg No.</th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600, color: '#5f6b7a' }}>Driver</th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600, color: '#5f6b7a' }}>Date</th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600, color: '#5f6b7a' }}>Start Time</th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600, color: '#5f6b7a' }}>End Time</th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600, color: '#5f6b7a' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ongoingTrips.map((trip, idx) => {
                    const dateFmt = trip.date
                      ? new Date(trip.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—';
                    const hasEnd = trip.endTime || trip.end_time;
                    const vehicleName = trip.vehicle || trip.vehicle_name || '—';
                    const regNo = trip.vehicleReg || trip.registration_number || '—';
                    const driver = trip.traveledBy || trip.traveled_by || '—';
                    const startTime = formatTime(trip.startTime || trip.start_time);
                    const endTime = hasEnd ? formatTime(trip.endTime || trip.end_time) : null;
                    
                    return (
                      <tr key={trip.id || idx} style={{ borderBottom: '1px solid #f0f2f5', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ textAlign: 'left', padding: '12px 8px', color: '#6c757d', fontWeight: 500 }}>#{idx + 1}</td>
                        <td style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 600, color: '#1f2937' }}>{vehicleName}</td>
                        <td style={{ textAlign: 'left', padding: '12px 8px', color: '#1a6fdb', fontWeight: 500 }}>{regNo}</td>
                        <td style={{ textAlign: 'left', padding: '12px 8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%',
                              background: '#e8f0fe', color: '#1a6fdb',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 700
                            }}>
                              {(driver !== '—' ? driver[0] : '?').toUpperCase()}
                            </div>
                            <span>{driver}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'left', padding: '12px 8px', color: '#4b5563' }}>{dateFmt}</td>
                        <td style={{ textAlign: 'left', padding: '12px 8px', color: '#2e7d32', fontWeight: 500 }}>🕘 {startTime}</td>
                        <td style={{ textAlign: 'left', padding: '12px 8px', color: hasEnd ? '#b71c1c' : '#9ca3af', fontStyle: hasEnd ? 'normal' : 'italic' }}>
                          {hasEnd ? `⏱️ ${endTime}` : '—'}
                        </td>
                        <td style={{ textAlign: 'left', padding: '12px 8px' }}>
                          <span style={{
                            display: 'inline-block',
                            background: hasEnd ? '#fdecea' : '#e8f5e9',
                            color: hasEnd ? '#b71c1c' : '#2e7d32',
                            padding: '4px 12px',
                            borderRadius: 30,
                            fontSize: 11,
                            fontWeight: 600
                          }}>
                            {hasEnd ? 'Ending' : 'Active'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
               </table>
            </div>

            {/* MOBILE VIEW: Card format (visible on screens < 768px) */}
            <div className="trips-cards-container">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {ongoingTrips.map((trip, idx) => {
                  const dateFmt = trip.date
                    ? new Date(trip.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '—';
                  const hasEnd = trip.endTime || trip.end_time;
                  const vehicleName = trip.vehicle || trip.vehicle_name || '—';
                  const regNo = trip.vehicleReg || trip.registration_number;
                  const driver = trip.traveledBy || trip.traveled_by || '—';
                  const startTime = formatTime(trip.startTime || trip.start_time);
                  const endTime = hasEnd ? formatTime(trip.endTime || trip.end_time) : null;
                  const initial = (driver !== '—' ? driver[0] : '?').toUpperCase();

                  return (
                    <div key={trip.id || idx} style={{
                      background: '#fff',
                      border: '1px solid #eaecef',
                      borderRadius: 14,
                      padding: '14px 16px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: '#e8f0fe', color: '#1a6fdb',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 700, flexShrink: 0,
                          }}>#{idx + 1}</div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#1f2937', fontSize: 14 }}>{vehicleName}</div>
                            {regNo && (
                              <div style={{ color: '#1a6fdb', fontSize: 11, fontWeight: 600, letterSpacing: '0.4px', marginTop: 1 }}>{regNo}</div>
                            )}
                          </div>
                        </div>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          background: hasEnd ? '#fdecea' : '#e8f5e9',
                          color: hasEnd ? '#b71c1c' : '#2e7d32',
                          padding: '3px 10px', borderRadius: 20,
                          fontSize: 11, fontWeight: 600, flexShrink: 0,
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: hasEnd ? '#b71c1c' : '#2e7d32', display: 'inline-block' }} />
                          {hasEnd ? 'Ending' : 'Active'}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
                        <div>
                          <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2 }}>Date</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937' }}>{dateFmt}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2 }}>Driver</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{
                              width: 22, height: 22, borderRadius: '50%',
                              background: '#e8f0fe', color: '#1a6fdb',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 10, fontWeight: 700, flexShrink: 0,
                            }}>{initial}</div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#1f2937' }}>{driver}</span>
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2 }}>Start Time</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#2e7d32', fontWeight: 600, fontSize: 13 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2e7d32', display: 'inline-block', flexShrink: 0 }} />
                            {startTime}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2 }}>End Time</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: hasEnd ? '#b71c1c' : '#9ca3af', fontWeight: hasEnd ? 600 : 400, fontStyle: hasEnd ? 'normal' : 'italic', fontSize: 13 }}>
                            {hasEnd
                              ? <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#b71c1c', display: 'inline-block', flexShrink: 0 }} />
                              : <span style={{ width: 7, height: 7, borderRadius: '50%', border: '2px solid #9ca3af', display: 'inline-block', flexShrink: 0 }} />
                            }
                            {hasEnd ? endTime : 'Ongoing'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Responsive CSS: Hide table on mobile, hide cards on desktop */}
      <style>{`
        @media (max-width: 767px) {
          .trips-table-container {
            display: none !important;
          }
          .trips-cards-container {
            display: block !important;
          }
        }
        @media (min-width: 768px) {
          .trips-table-container {
            display: block !important;
          }
          .trips-cards-container {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

// ── Shared styles ──
const card = {
  background: '#fff',
  borderRadius: 16,
  padding: '20px 22px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  border: '1px solid #eaecef',
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

// ── Main Dashboard ──
export default function Dashboard() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthError, setIsAuthError] = useState(false);
  const [stats, setStats] = useState({ 
    yearlyData: [], 
    monthlyData: [], 
    salesOverviewData: [], 
    totalYearly: 0, 
    avgMonthly: 0, 
    lastMonthEarning: 0 
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const m = now.toLocaleString('default', { month: 'short' });
    return `${m} ${now.getFullYear()}`;
  });

  const months = (() => {
    const list = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      list.push(`${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`);
    }
    return list;
  })();

  const loadPayments = async () => {
    const token = localStorage.getItem('access') || localStorage.getItem('access_token');
    
    // Check if token exists
    if (!token) { 
      setLoading(false); 
      setIsAuthError(true); 
      setError('Please log in to view dashboard.'); 
      return; 
    }
    
    // Check if token is expired
    if (isTokenExpired()) {
      console.log('Token expired, attempting refresh...');
      const newToken = await refreshAccessToken();
      if (!newToken) {
        setLoading(false);
        setIsAuthError(true);
        setError('Session expired. Please log in again.');
        return;
      }
    }
    
    setLoading(true); 
    setError(null); 
    setIsAuthError(false);
    
    try {
      const params = new URLSearchParams();
      const data = await apiFetch(`${BASE_URL}/payments/?${params}`, { 
        headers: authHeaders({ Accept: 'application/json' }) 
      });
      
      const list = Array.isArray(data) ? data : (data.results ?? []);
      console.log('Raw payments fetched:', list.length);
      
      const normalizedList = list.map(normalizePayment);
      console.log('Normalized payments:', normalizedList.length);
      
      setPayments(normalizedList);
      const processedStats = processPaymentData(normalizedList);
      setStats(processedStats);
    } catch (err) {
      console.error('Error loading payments:', err);
      if (err.name === 'AuthError') { 
        setIsAuthError(true); 
        setError(err.message);
        clearAuthTokens();
      } else {
        setError(err.message || 'Failed to load payments.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    loadPayments(); 
  }, []);

  // Auto-refresh token every 10 minutes if user is active
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!isTokenExpired()) {
        const newToken = await refreshAccessToken();
        if (!newToken && !isAuthError) {
          setIsAuthError(true);
          setError('Session expired. Please log in again.');
        }
      }
    }, 10 * 60 * 1000); // 10 minutes
    
    return () => clearInterval(interval);
  }, [isAuthError]);

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

  // ── Error with better logout handling ──
  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", background: '#f7f8fa' }}>
      <div style={{ textAlign: 'center', padding: 28, background: '#fff1f1', borderRadius: 14, border: '1px solid #fecaca', maxWidth: 360 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔐</div>
        <p style={{ color: '#dc2626', marginBottom: 14, fontSize: 14, fontWeight: 500 }}>{error}</p>
        {isAuthError ? (
          <>
            <button 
              style={btnStyle('#4a90d9')} 
              onClick={() => {
                clearAuthTokens();
                window.location.href = '/login';
              }}
            >
              Go to Login
            </button>
            <button 
              style={{ ...btnStyle('#6b7280'), marginLeft: 10 }} 
              onClick={() => {
                clearAuthTokens();
                window.location.reload();
              }}
            >
              Clear & Retry
            </button>
          </>
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
  
  const prevYear = yearlyData.length > 1 ? yearlyData[yearlyData.length - 2] : null;
  const currYear = yearlyData.length > 0 ? yearlyData[yearlyData.length - 1] : null;
  const yoyChange = prevYear && currYear ? ((currYear.value - prevYear.value) / prevYear.value * 100).toFixed(0) : 0;

  return (
    <div style={{ minHeight: '100vh', background: '#f7f8fa', fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif", padding: '16px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .dash-select { appearance: none; -webkit-appearance: none; background: #f0f4f8; border: 1px solid #dde3ea; border-radius: 8px; padding: 6px 28px 6px 12px; font-size: 13px; font-weight: 500; color: #374151; cursor: pointer; outline: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 8px center; font-family: inherit; max-width: 100%; }
        .dash-select:hover { border-color: #4a90d9; }
        .stat-badge-up { display: inline-flex; align-items: center; gap: 3px; background: #e8f5e9; color: #2e7d32; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        .stat-badge-down { display: inline-flex; align-items: center; gap: 3px; background: #fdecea; color: #c62828; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        .icon-circle { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
        .legend-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
        @media (max-width: 640px) {
          .dash-grid { grid-template-columns: 1fr !important; }
          .dash-right-stack { flex-direction: row !important; flex-wrap: wrap; }
          .dash-right-stack > div { flex: 1 1 calc(50% - 8px); min-width: 140px; }
        }
      `}</style>

      {/* ── Main 2-column Grid ── */}
      <div className="dash-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 16, maxWidth: 1280, margin: '0 auto' }}>

        {/* ── LEFT: Sales Overview ── */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1f2937' }}>Collection Overview</h2>
            <select className="dash-select" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
              {months.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div style={{ flex: 1, minHeight: 180 }}>
            {(() => {
              const dailyData = buildDailyData(payments, selectedMonth);
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

        {/* ── RIGHT: Stacked cards ── */}
        <div className="dash-right-stack" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

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
                    <span className={yoyChange >= 0 ? "stat-badge-up" : "stat-badge-down"}>
                      {yoyChange >= 0 ? "▲" : "▼"} {Math.abs(yoyChange)}%
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
              {yearlyData.length === 0 && (
                <span style={{ fontSize: 12, color: '#c4c9d4' }}>No yearly data</span>
              )}
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

      {/* ── Active Trips Section ── */}
      <RecentTripsSection />

    </div>
  );
}

// ── Helper ──
function btnStyle(bg) {
  return { padding: '8px 22px', borderRadius: 8, border: 'none', background: bg, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' };
}