import { useState, useEffect, useCallback } from "react";
import { apiFetch, authHeaders, ENDPOINTS } from "../service/Api";

// ─── Palette ────────────────────────────────────────────────────────────────
const C = {
  primary:   "#1a73e8",
  primaryLt: "#dbeafe",
  green:     "#71DD37",
  greenLt:   "#EAFCD5",
  orange:    "#FF7043",
  orangeLt:  "#FFF0EB",
  cyan:      "#03C3EC",
  cyanLt:    "#E0F8FF",
  red:       "#FF4C51",
  redLt:     "#FFE9EA",
  amber:     "#FFAB00",
  amberLt:   "#FFF3CD",
  text:      "#566A7F",
  textDark:  "#2B2C40",
  textMid:   "#697A8D",
  textLight: "#A8B8CC",
  border:    "#ECEEF1",
  bg:        "#F4F5FA",
  white:     "#FFFFFF",
};

// ─── SVG Sparkline (pure, no deps) ──────────────────────────────────────────
function Sparkline({ data, color, width = 80, height = 32, fill = false }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });
  const polyline = pts.join(" ");
  const fillPath = `M${pts[0]} L${pts.slice(1).join(" L")} L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
      {fill && (
        <path d={fillPath} fill={color} opacity={0.12} />
      )}
      <polyline points={polyline} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── SVG Area Chart (dynamic labels + data) ─────────────────────────────────
function AreaChart({ data, labels, color = C.primary, width = 320, height = 120 }) {
  if (!data || data.length < 2) return null;
  const maxVal = Math.max(...data);
  const max = maxVal * 1.2 || 1;
  const min = 0;
  const range = max - min;
  const padL = 28, padB = 20, padR = 8, padT = 8;
  const W = width - padL - padR;
  const H = height - padT - padB;

  const xs = data.map((_, i) => padL + (i / (data.length - 1)) * W);
  const ys = data.map(v => padT + H - ((v - min) / range) * H);

  const areaPath = `M${xs[0]},${ys[0]} L${xs.map((x, i) => `${x},${ys[i]}`).join(" L ")} L${xs[xs.length-1]},${padT+H} L${xs[0]},${padT+H} Z`;

  // Dynamic y-ticks: 5 evenly spaced from 0 to ceil(maxVal)
  const topTick = Math.max(maxVal, 1);
  const step = Math.ceil(topTick / 4) || 1;
  const yTicks = [0, step, step*2, step*3, step*4].filter(t => t <= topTick * 1.3);

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {yTicks.map(t => {
        const y = padT + H - ((t - min) / range) * H;
        return (
          <g key={t}>
            <line x1={padL} y1={y} x2={padL + W} y2={y} stroke="#F1F5F9" strokeWidth={1} />
            <text x={padL - 4} y={y + 3.5} textAnchor="end" fontSize={9} fill={C.textLight}>{t}</text>
          </g>
        );
      })}
      <path d={areaPath} fill="url(#areaGrad)" />
      <polyline points={xs.map((x, i) => `${x},${ys[i]}`).join(" ")} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      {xs.map((x, i) => (
        <circle key={i} cx={x} cy={ys[i]} r={3} fill={C.white} stroke={color} strokeWidth={1.8} />
      ))}
      {labels && labels.map((m, i) => (
        <text key={m+i} x={xs[i]} y={height - 4} textAnchor="middle" fontSize={9} fill={C.textLight}>{m}</text>
      ))}
    </svg>
  );
}

// ─── SVG Radial / Arc Gauge ──────────────────────────────────────────────────
function ArcGauge({ value = 78, size = 160, color = C.primary }) {
  const cx = size / 2, cy = size / 2;
  const r = size * 0.36;
  const stroke = size * 0.11;
  // Arc goes from 210° to 330° (240° sweep)
  const startAngle = 210;
  const sweep = 240;
  const endAngle = startAngle + sweep * (value / 100);

  const toRad = deg => (deg - 90) * (Math.PI / 180);
  const arc = (angle) => ({
    x: cx + r * Math.cos(toRad(angle)),
    y: cy + r * Math.sin(toRad(angle)),
  });

  const bg1 = arc(startAngle);
  const bg2 = arc(startAngle + sweep);
  const fg2 = arc(endAngle);

  const largeArcBg = sweep > 180 ? 1 : 0;
  const largeArcFg = sweep * (value / 100) > 180 ? 1 : 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Track */}
      <path
        d={`M${bg1.x},${bg1.y} A${r},${r} 0 ${largeArcBg},1 ${bg2.x},${bg2.y}`}
        fill="none" stroke="#EEF0FF" strokeWidth={stroke} strokeLinecap="round"
      />
      {/* Value arc */}
      <path
        d={`M${bg1.x},${bg1.y} A${r},${r} 0 ${largeArcFg},1 ${fg2.x},${fg2.y}`}
        fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
      />
      {/* Center text */}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize={size * 0.16} fontWeight="800" fill={C.textDark}>{value}%</text>
      <text x={cx} y={cy + size * 0.1} textAnchor="middle" fontSize={size * 0.075} fill={C.textLight}>Growth</text>
    </svg>
  );
}

// ─── SVG Bar Chart (weekly) ──────────────────────────────────────────────────
function BarChart({ data, color = C.primary, width = 260, height = 80 }) {
  const max = Math.max(...data.map(d => d.v)) || 1;
  const barW = 18;
  const gap = (width - data.length * barW) / (data.length + 1);
  const padTop = 8;
  const chartH = height - padTop;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMax meet" style={{ display: "block" }}>
      {data.map((d, i) => {
        const barH = Math.max(4, (d.v / max) * chartH);
        const x = gap + i * (barW + gap);
        const y = padTop + chartH - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={4} fill={d.v > 0 ? color : "#E2E8F0"} opacity={d.v > 0 ? 0.85 : 1} />
          </g>
        );
      })}
    </svg>
  );
}

// ─── Tiny components ─────────────────────────────────────────────────────────
function Card({ style = {}, children }) {
  return (
    <div style={{
      background: C.white, borderRadius: 16,
      boxShadow: "0 2px 10px rgba(43,44,64,0.06), 0 0 1px rgba(43,44,64,0.08)",
      padding: "20px 22px", ...style,
    }}>
      {children}
    </div>
  );
}

function StatBox({ icon, iconBg, value, label, dotColor, labelColor }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
      <div style={{ width: 42, height: 42, borderRadius: 10, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.textDark, lineHeight: 1.1 }}>{value}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
          {dotColor && <span style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor, flexShrink: 0, display: "inline-block" }} />}
          <span style={{ fontSize: 11, color: labelColor || C.textLight, fontWeight: 600, lineHeight: 1.3 }}>{label}</span>
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ label, pct, color }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: C.textMid }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.textDark }}>{pct}%</span>
      </div>
      <div style={{ height: 7, borderRadius: 10, background: "#EEF0FF" }}>
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 10, background: color }} />
      </div>
    </div>
  );
}

function TabBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer",
      fontSize: 13, fontWeight: 600, fontFamily: "inherit",
      background: active ? C.primary : "transparent",
      color: active ? C.white : C.textLight,
      transition: "all .15s",
    }}>{label}</button>
  );
}


// ─── Service status config (labels exact from ServiceList.jsx STATUSES + STATUS_PILL hex) ─
const SERVICE_STATUS_CONFIG = [
  { label: "Assigned",               icon: "", bg: "", color: "#92400e", dot: "#f59e0b", stage: "New Entry"             },
  { label: "Submitted for Service",  icon: "", bg: "", color: "#1e40af", dot: "#1d73e8", stage: "Pre Service"           },
  { label: "Sent to Supplier",       icon: "", bg: "", color: "#5b21b6", dot: "#7c3aed", stage: "Dispatch to Supplier"  },
  { label: "Sent to Replace",        icon: "", bg: "", color: "#5b21b6", dot: "#7c3aed", stage: "Replacement"           },
  { label: "Received Back",          icon: "", bg: "", color: "#9a3412", dot: "#ea580c", stage: "Receive from Supplier" },
  { label: "Submitted After Service",icon: "", bg: "", color: "#115e59", dot: "#0d9488", stage: "Post Service"          },
  { label: "Delivered",              icon: "", bg: "", color: "#14532d", dot: "#188038", stage: "Final Stage"           },
];

// ─── Standby status config (labels + colors exact from standby_list.jsx STATUS_META) ──────
const STANDBY_STATUS_CONFIG = [
  { label: "Assigned",  icon: "", iconBg: "", dotColor: "#5f6368", labelColor: "#5f6368" },
  { label: "Issued",    icon: "", iconBg: "", dotColor: "#f7aa04", labelColor: "#7a5700" },
  { label: "Collected", icon: "", iconBg: "", dotColor: "#d35741", labelColor: "#7a1c0d" },
  { label: "Returned",  icon: "", iconBg: "", dotColor: "#188038", labelColor: "#137333" },
];

const weekBars = [
  { d: "S", v: 0 }, { d: "M", v: 60 }, { d: "T", v: 40 },
  { d: "W", v: 90 }, { d: "T", v: 55 }, { d: "F", v: 75 }, { d: "S", v: 35 },
];

// ─── Main ────────────────────────────────────────────────────────────────────
export default function SneatDashboard() {
  const [incomeTab, setIncomeTab]       = useState("Income");
  const [periodTab, setPeriodTab]       = useState("Week");

  // ── Live data from APIs ──────────────────────────────────────────────────
  const [serviceData,  setServiceData]  = useState([]);
  const [standbyData,  setStandbyData]  = useState([]);
  const [loadingSvc,   setLoadingSvc]   = useState(true);
  const [loadingStb,   setLoadingStb]   = useState(true);

  const fetchServiceData = useCallback(async () => {
    setLoadingSvc(true);
    try {
      const json = await apiFetch(ENDPOINTS.services, { headers: authHeaders() });
      const rows = Array.isArray(json) ? json : (json.results ?? []);
      setServiceData(rows);
    } catch (err) {
      console.error("Dashboard: failed to load services", err);
    } finally {
      setLoadingSvc(false);
    }
  }, []);

  const fetchStandbyData = useCallback(async () => {
    setLoadingStb(true);
    try {
      const rows = await apiFetch(ENDPOINTS.standbys, { headers: authHeaders() });
      setStandbyData(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error("Dashboard: failed to load standbys", err);
    } finally {
      setLoadingStb(false);
    }
  }, []);

  useEffect(() => {
    fetchServiceData();
    fetchStandbyData();
  }, [fetchServiceData, fetchStandbyData]);

  // ── Computed counts ──────────────────────────────────────────────────────
  // Service: count per status using raw r.status field
  const svcCount = (label) => serviceData.filter(r => r.status === label).length;

  // Standby: count per status using raw r.status field
  const stbCount = (label) => standbyData.filter(r => r.status === label).length;

  // Totals
  const totalServices = serviceData.length;
  const totalStandbys = standbyData.length;
  const totalDelivered = svcCount("Delivered");
  const totalReturned  = stbCount("Returned");

  // ── Monthly standby chart data (built from standbyData.created_at) ──────
  const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthlyStandby = (() => {
    const now = new Date();
    const counts = {};
    // Last 7 months
    const monthKeys = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthKeys.push({ key, label: MONTHS_SHORT[d.getMonth()], year: d.getFullYear(), month: d.getMonth() });
      counts[key] = 0;
    }
    standbyData.forEach(r => {
      const raw = r.created_at || r.createdAt || r.date_created || r.date;
      if (!raw) return;
      const d = new Date(raw);
      if (isNaN(d)) return;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (counts[key] !== undefined) counts[key]++;
    });
    return {
      values: monthKeys.map(m => counts[m.key]),
      labels: monthKeys.map(m => m.label),
    };
  })();

  const stbThisMonth = monthlyStandby.values[monthlyStandby.values.length - 1] ?? 0;
  const stbLastMonth = monthlyStandby.values[monthlyStandby.values.length - 2] ?? 0;
  const stbDiff = stbThisMonth - stbLastMonth;

  return (
    <div style={{
      fontFamily: "'Nunito', 'Segoe UI', -apple-system, sans-serif",
      background: C.bg, minHeight: "100vh",
      display: "flex", flexDirection: "column",
      overflowX: "hidden",
      width: "100%",
      boxSizing: "border-box",
    }}>

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:none; } }
        .dc { animation: fadeUp .35s ease both; }
        .dc:nth-child(1){animation-delay:.04s}
        .dc:nth-child(2){animation-delay:.08s}
        .dc:nth-child(3){animation-delay:.12s}
        .dc:nth-child(4){animation-delay:.16s}
        .dc:nth-child(5){animation-delay:.20s}
        .dc:nth-child(6){animation-delay:.24s}
        .hvr:hover{transform:translateY(-2px);box-shadow:0 6px 22px rgba(43,44,64,0.12)!important;transition:all .2s;}
        .pulse { animation: pulse 1.4s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        .imcb-footer {
          text-align: center;
          padding: 14px 0 16px;
          font-size: 12px;
          color: #A8B8CC;
          border-top: 1px solid #ECEEF1;
          background: #F4F5FA;
          letter-spacing: 0.01em;
        }
        *, *::before, *::after { box-sizing: border-box; }
        @media (max-width: 600px) {
          html, body { overflow-x: hidden; max-width: 100vw; }
        }

        /* ── Desktop grid layouts (unchanged) ── */
        .row1-grid {
          display: grid;
          grid-template-columns: 1fr 220px 220px;
          gap: 20px;
          margin-bottom: 20px;
        }
        .row2-grid {
          display: grid;
          grid-template-columns: 1.45fr 1fr 1fr 1.2fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        .standby-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        .service-status-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
        }
        .dash-padding {
          flex: 1;
          padding: 24px 28px 20px;
        }

        /* ── Mobile: single column, top-to-bottom scroll ── */
        @media (max-width: 600px) {
          .dash-padding {
            padding: 12px 12px 16px;
            width: 100%;
            overflow-x: hidden;
          }
          .row1-grid,
          .row2-grid {
            grid-template-columns: 1fr;
            gap: 12px;
            margin-bottom: 12px;
            width: 100%;
          }
          .standby-stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          .service-status-grid {
            grid-template-columns: 1fr !important;
            gap: 8px;
          }
          .service-status-grid > div {
            flex-direction: row !important;
            align-items: center !important;
            gap: 0 !important;
            padding: 12px 14px !important;
            border-top: none !important;
            border-left: 4px solid transparent;
          }
          .service-status-grid > div > div:nth-child(1) {
            flex: 1;
            min-width: 0;
          }
          .service-status-grid > div > div:nth-child(1) span:last-child {
            white-space: normal !important;
          }
          .service-status-grid > div > div:nth-child(2) {
            font-size: 12px !important;
            white-space: normal !important;
            flex: 2;
            padding: 0 8px;
          }
          .service-status-grid > div > div:nth-child(3) {
            font-size: 24px !important;
            margin-top: 0 !important;
            flex-shrink: 0;
            min-width: 40px;
            text-align: right;
          }
          .service-status-grid > div > div:nth-child(4),
          .service-status-grid > div > div:nth-child(5) {
            display: none !important;
          }
          .barchart-bleed {
            margin-left: 0 !important;
            margin-right: 0 !important;
          }
        }
      `}</style>

      <div className="dash-padding">

      {/* ══ ROW 1 ═══════════════════════════════════════════════════════════ */}
      <div className="row1-grid">

        {/* ── Standby Statistics (live from standbys API) ── */}
        <Card className="dc hvr">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: C.textDark }}>Standby Product</span>
            {loadingStb
              ? <span className="pulse" style={{ fontSize: 11, color: C.textLight }}>Loading…</span>
              : <span style={{ fontSize: 11, color: C.textLight }}>Total: {totalStandbys} &nbsp;⋮</span>
            }
          </div>
          <div className="standby-stats-grid">
            {STANDBY_STATUS_CONFIG.map(s => (
              <StatBox
                key={s.label}
                icon={s.icon}
                iconBg={s.iconBg}
                dotColor={s.dotColor}
                labelColor={s.labelColor}
                value={loadingStb ? "—" : stbCount(s.label)}
                label={s.label === "Collected" ? "Collected " : s.label}
              />
            ))}
          </div>
        </Card>

        {/* ── Total Services ── */}
        <Card className="dc hvr" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.textDark, marginBottom: 10 }}>Total Services</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: C.primary, lineHeight: 1 }}>
            {loadingSvc ? <span className="pulse">—</span> : totalServices}
          </div>
          <div style={{ fontSize: 12, color: C.textLight, marginTop: 8 }}>All service entries</div>
        </Card>

        {/* ── Delivered ── */}
        <Card className="dc hvr" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.textDark, marginBottom: 10 }}>Delivered</div>
          <div style={{ fontSize: 34, fontWeight: 900, color: "#188038", lineHeight: 1 }}>
            {loadingSvc ? <span className="pulse">—</span> : totalDelivered}
          </div>
          <div style={{ fontSize: 12, color: C.textLight, marginTop: 8 }}>Completed service jobs</div>
        </Card>
      </div>

      {/* ══ ROW 2 ═══════════════════════════════════════════════════════════ */}
      <div className="row2-grid">

        {/* ── Monthly Standby Items — live area chart ── */}
        <Card className="dc" style={{ padding: "18px 20px" }}>
          {/* Header row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: C.textDark }}>Monthly Standby</span>
              {loadingStb
                ? <span className="pulse" style={{ fontSize: 10, color: C.textLight }}>Loading…</span>
                : <span style={{ fontSize: 10, background: C.bg, color: C.textLight, borderRadius: 20, padding: "2px 10px", fontWeight: 600 }}>Live</span>
              }
            </div>
            <span style={{ fontSize: 10, color: C.textLight, background: C.bg, borderRadius: 20, padding: "3px 10px", fontWeight: 600 }}>Last 7 months</span>
          </div>

          {/* Total + diff */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: C.textLight, marginBottom: 2 }}>Total Standbys:</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: C.primary, lineHeight: 1 }}>
                {loadingStb ? <span className="pulse" style={{ fontSize: 18 }}>—</span> : totalStandbys}
              </div>
            </div>
            {!loadingStb && (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: C.textLight }}>This month</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: stbDiff >= 0 ? "#188038" : C.red, lineHeight: 1 }}>
                  {stbDiff >= 0 ? "+" : ""}{stbDiff}
                </div>
                <div style={{ fontSize: 10, color: C.textLight }}>vs last month</div>
              </div>
            )}
          </div>

          {/* Area chart */}
          <div style={{ width: "100%", height: 120 }}>
            {loadingStb
              ? <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="pulse" style={{ fontSize: 12, color: C.textLight }}>Building chart…</span>
                </div>
              : <AreaChart
                  data={monthlyStandby.values}
                  labels={monthlyStandby.labels}
                  color={C.primary}
                  width={320}
                  height={110}
                />
            }
          </div>

          {/* Footer row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.textDark }}>Standbys This Month</div>
              <div style={{ fontSize: 11, color: C.textLight }}>
                {loadingStb ? "…" : stbDiff === 0 ? "Same as last month" : stbDiff > 0 ? `${stbDiff} more than last month` : `${Math.abs(stbDiff)} fewer than last month`}
              </div>
            </div>
            <div style={{
              minWidth: 36, height: 36, borderRadius: "50%",
              background: C.primaryLt,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 800, color: C.primary,
              padding: "0 8px",
            }}>
              {loadingStb ? "—" : stbThisMonth}
            </div>
          </div>
        </Card>

        {/* ── Service Summary counts ── */}
        <Card className="dc" style={{ padding: "20px 22px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.textDark, marginBottom: 16 }}>Service Summary</div>
          {loadingSvc ? (
            <div style={{ fontSize: 13, color: C.textLight }} className="pulse">Loading…</div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: C.textMid }}>Total Entries</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: C.textDark }}>{totalServices}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: C.textMid }}>Delivered</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#188038" }}>{totalDelivered}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <span style={{ fontSize: 13, color: C.textMid }}>In Progress</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#1d73e8" }}>{totalServices - totalDelivered}</span>
              </div>
              <ProgressBar
                label="Delivery Rate"
                pct={totalServices ? Math.round((totalDelivered / totalServices) * 100) : 0}
                color="#188038"
              />
              <ProgressBar
                label="In Progress"
                pct={totalServices ? Math.round(((totalServices - totalDelivered) / totalServices) * 100) : 0}
                color={C.primary}
              />
            </>
          )}
        </Card>

        {/* ── Standby Summary ── */}
        <Card className="dc" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 16px" }}>
          <div style={{ alignSelf: "flex-start", fontSize: 13, fontWeight: 700, color: C.textDark, marginBottom: 8 }}>Standby Summary</div>
          {loadingStb ? (
            <div style={{ fontSize: 13, color: C.textLight }} className="pulse">Loading…</div>
          ) : (
            <>
              <div style={{ fontSize: 48, fontWeight: 900, color: C.primary, lineHeight: 1, margin: "12px 0 4px" }}>{totalStandbys}</div>
              <div style={{ fontSize: 12, color: C.textLight, marginBottom: 20 }}>Total Standby Items</div>
              <div style={{ width: "100%" }}>
                <ProgressBar
                  label="Returned"
                  pct={totalStandbys ? Math.round((totalReturned / totalStandbys) * 100) : 0}
                  color="#188038"
                />
                <ProgressBar
                  label="In Use"
                  pct={totalStandbys ? Math.round(((totalStandbys - totalReturned) / totalStandbys) * 100) : 0}
                  color="#1a73e8"
                />
              </div>
            </>
          )}
        </Card>

        {/* ── Total Service Entries (bar chart) ── */}
        <Card className="dc" style={{ padding: "18px 22px 0 22px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: C.textDark, lineHeight: 1 }}>
            {loadingSvc ? <span className="pulse" style={{ fontSize: 20, color: C.textLight }}>—</span> : totalServices}
          </div>
          <div style={{ fontSize: 12, color: C.textLight, marginTop: 4, marginBottom: 12 }}>Total Service Entries</div>
          <div className="barchart-bleed" style={{ marginLeft: -22, marginRight: -22, overflow: "hidden" }}>
            <BarChart
              data={loadingSvc ? weekBars : SERVICE_STATUS_CONFIG.map((s, i) => ({
                d: ["As","Su","Sp","Re","Rb","Sa","De"][i],
                v: svcCount(s.label),
              }))}
              color={C.primary}
              width={260}
              height={80}
            />
          </div>
        </Card>
      </div>

      {/* ══ ROW 3 ═══════════════════════════════════════════════════════════ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>

        {/* ── Service Status live breakdown (card grid) ── */}
        <Card className="dc" style={{ padding: "16px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: C.textDark }}>Service Management</span>
            {loadingSvc
              ? <span className="pulse" style={{ fontSize: 10, color: C.textLight }}>Loading…</span>
              : <span style={{ fontSize: 10, color: C.textLight, background: C.bg, borderRadius: 20, padding: "3px 10px", fontWeight: 600 }}>Live</span>
            }
          </div>
          <div className="service-status-grid">
            {SERVICE_STATUS_CONFIG.map((s) => {
              const count = svcCount(s.label);
              const pct = totalServices ? Math.round((count / totalServices) * 100) : 0;
              return (
                <div key={s.label} style={{
                  background: C.bg,
                  borderRadius: 10,
                  padding: "10px 10px 8px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  borderTop: `3px solid ${s.dot}`,
                  transition: "box-shadow .2s, transform .2s",
                  cursor: "default",
                  minWidth: 0,
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(43,44,64,0.10)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
                >
                  {/* Dot + stage */}
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, flexShrink: 0, display: "inline-block" }} />
                    <span style={{ fontSize: 8.5, color: C.textLight, fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.stage}</span>
                  </div>
                  {/* Status label */}
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.textDark, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={s.label}>{s.label}</div>
                  {/* Count */}
                  <div style={{ fontSize: 20, fontWeight: 900, color: s.color, lineHeight: 1, marginTop: 2 }}>
                    {loadingSvc ? "—" : count}
                  </div>
                  {/* Mini progress bar */}
                  <div style={{ height: 3, borderRadius: 4, background: "#E2E8F0", marginTop: 4, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: loadingSvc ? "0%" : `${pct}%`,
                      borderRadius: 4,
                      background: s.dot,
                      transition: "width 0.6s ease",
                    }} />
                  </div>
                  <div style={{ fontSize: 8.5, color: C.textLight, textAlign: "right" }}>{loadingSvc ? "" : `${pct}%`}</div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* ── Standby status summary cards ── */}
        
      </div>
      </div>

      <div className="imcb-footer">
        Powered by <span style={{ fontWeight: 600, color: "#1a73e8" }}>IMCB Solutions LLP</span>
      </div>
    </div>
  );
}