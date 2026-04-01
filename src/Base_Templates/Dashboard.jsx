import { useState, useEffect, useRef } from "react";

// ── Sparkline / Area chart (SVG inline) ──────────────────────────────────────
function MiniArea({ data, color = "#a78bfa", height = 60, fill = true }) {
  if (!data || data.length < 2) return null;
  const w = 260, h = height;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - ((v - min) / range) * (h - 8) - 4,
  ]);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = line + ` L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height }}>
      <defs>
        <linearGradient id={`ag-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#ag-${color.replace("#", "")})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Donut chart ──────────────────────────────────────────────────────────────
function Donut({ segments, size = 110, thickness = 22, label }) {
  const r = (size - thickness) / 2;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      {segments.map((seg, i) => {
        const dash = (seg.value / total) * circ;
        const gap = circ - dash;
        const el = (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={thickness}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset * circ / total}
            strokeLinecap="butt"
            style={{ transition: "stroke-dasharray 0.6s ease" }}
          />
        );
        offset += seg.value;
        return el;
      })}
      {label && (
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
          style={{ fontSize: 13, fontWeight: 700, fill: "#202124", transform: "rotate(90deg)", transformOrigin: `${cx}px ${cy}px` }}>
          {label}
        </text>
      )}
    </svg>
  );
}

// ── Bar chart (SVG) ──────────────────────────────────────────────────────────
function BarChart({ data, highlight = 5 }) {
  const max = Math.max(...data.map(d => d.value));
  const h = 120, bw = 18, gap = 8;
  const total_w = data.length * (bw + gap);
  return (
    <svg viewBox={`0 0 ${total_w} ${h + 20}`} style={{ width: "100%", height: h + 20 }}>
      {data.map((d, i) => {
        const barH = (d.value / max) * h;
        const x = i * (bw + gap);
        const y = h - barH;
        const isHl = i === highlight;
        const color = isHl ? "#a78bfa" : "#c4b5fd";
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={barH} rx={5}
              fill={color} opacity={isHl ? 1 : 0.55} />
            {isHl && (
              <>
                <rect x={x - 4} y={y - 22} width={bw + 8} height={18} rx={5} fill="#7c3aed" />
                <text x={x + bw / 2} y={y - 9} textAnchor="middle" fontSize={9} fill="#fff" fontWeight={700}>
                  ${(d.value / 1000).toFixed(0)}k
                </text>
              </>
            )}
            <text x={x + bw / 2} y={h + 14} textAnchor="middle" fontSize={8} fill="#9ca3af">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Multi-line chart ─────────────────────────────────────────────────────────
function LineChart({ series, labels, height = 130 }) {
  const w = 340, h = height;
  const allVals = series.flatMap(s => s.data);
  const min = Math.min(...allVals), max = Math.max(...allVals);
  const range = max - min || 1;
  const toY = v => h - ((v - min) / range) * (h - 16) - 8;
  const toX = i => (i / (labels.length - 1)) * w;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height }}>
      <defs>
        {series.map(s => (
          <linearGradient key={s.color} id={`lg-${s.color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={s.color} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map(t => (
        <line key={t} x1={0} y1={toY(min + t * range)} x2={w} y2={toY(min + t * range)}
          stroke="#f0f0f0" strokeWidth={1} />
      ))}
      {/* X labels */}
      {labels.map((l, i) => (
        <text key={i} x={toX(i)} y={h} textAnchor="middle" fontSize={8} fill="#9ca3af">{l}</text>
      ))}
      {series.map(s => {
        const pts = s.data.map((v, i) => [toX(i), toY(v)]);
        const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
        const area = line + ` L${w},${h} L0,${h} Z`;
        return (
          <g key={s.color}>
            <path d={area} fill={`url(#lg-${s.color.replace("#","")})`} />
            <path d={line} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );
      })}
    </svg>
  );
}

// ── Data ─────────────────────────────────────────────────────────────────────
const KPI_DATA = [
  { label: "Total Collections", value: "₹11.67M", delta: "+33.4%", pos: true,  icon: "💳", bg: "#eef2ff", ic: "#6366f1" },
  { label: "Total Invoices",    value: "47,403",   delta: "-112.4%", pos: false, icon: "📄", bg: "#fdf4ff", ic: "#a855f7" },
  { label: "Paid Invoices",     value: "55,093",   delta: "+62%",   pos: true,  icon: "✅", bg: "#f0fdf4", ic: "#22c55e" },
  { label: "Total Revenue",     value: "₹12.33B",  delta: "+4.4%",  pos: true,  icon: "📊", bg: "#fff7ed", ic: "#f97316" },
];

const CONTEXTUAL = [
  { label: "Retail",    pct: 40, color: "#6366f1" },
  { label: "Tech",      pct: 30, color: "#22d3ee" },
  { label: "News",      pct: 20, color: "#f97316" },
  { label: "Health",    pct: 5,  color: "#10b981" },
  { label: "Shopping",  pct: 5,  color: "#a3e635" },
];

const DEVICE_TYPE = [
  { label: "Mobile",  value: 45, color: "#6366f1" },
  { label: "Desktop", value: 50, color: "#22d3ee" },
  { label: "Tablet",  value: 5,  color: "#e0e7ff" },
];

const SPEND_BY_CHANNEL = [
  { label: "Meta",     value: 28000 },
  { label: "Google",   value: 35000 },
  { label: "YouTube",  value: 22000 },
  { label: "Amazon",   value: 18000 },
  { label: "Animoco",  value: 12000 },
  { label: "Xandr",    value: 15000 },
  { label: "Twitter",  value: 42246 },  // highlight
  { label: "TCS",      value: 20000 },
  { label: "Reliance", value: 25000 },
  { label: "Apple",    value: 30000 },
  { label: "Motora",   value: 16000 },
  { label: "Xuami",    value: 11000 },
];

const IMPRESSION_SERIES = [
  { color: "#a78bfa", data: [300, 420, 380, 460, 390, 500, 470, 420, 380, 500] },
  { color: "#34d399", data: [200, 260, 300, 240, 320, 280, 350, 290, 310, 270] },
];
const IMP_LABELS = ["Jun 16","Jun 17","Jun 18","Jun 19","Jun 20","Jun 21","Jun 22","Jun 23","Jun 24","Jun 25"];

const RESONANCE = [
  { label: "Creative A", score: 79, color: "#6366f1" },
  { label: "Creative B", score: 82, color: "#22d3ee" },
  { label: "Creative C", score: 94, color: "#a78bfa" },
  { label: "Creative D", score: 67, color: "#34d399" },
];

// ── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [timeFilter, setTimeFilter] = useState("Last week");

  return (
    <>
      <style>{`
        .dash-root {
          min-height: 100vh;
          background: #f4f6fb;
          padding: 28px 28px 40px;
          font-family: 'Nohemi', 'Inter', sans-serif;
        }

        /* ── Header ── */
        .dash-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }
        .dash-title {
          font-size: 22px;
          font-weight: 800;
          color: #1a1a2e;
          letter-spacing: -0.5px;
        }
        .dash-header-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .dash-icon-btn {
          width: 36px; height: 36px;
          border-radius: 50%;
          background: #fff;
          border: 1px solid #e5e7eb;
          display: grid; place-items: center;
          cursor: pointer;
          font-size: 15px;
          transition: box-shadow 0.18s;
        }
        .dash-icon-btn:hover { box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .dash-avatar {
          width: 36px; height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg,#6366f1,#a855f7);
          display: grid; place-items: center;
          color: #fff; font-weight: 700; font-size: 13px;
        }

        /* ── KPI row ── */
        .kpi-row {
          display: grid;
          grid-template-columns: repeat(4,1fr);
          gap: 16px;
          margin-bottom: 20px;
        }
        @media(max-width:1100px){ .kpi-row { grid-template-columns: repeat(2,1fr); } }
        @media(max-width:640px){  .kpi-row { grid-template-columns: 1fr; } }

        .kpi-card2 {
          background: #fff;
          border-radius: 16px;
          padding: 18px 20px 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .kpi-card2:hover { box-shadow: 0 6px 22px rgba(99,102,241,0.12); transform: translateY(-2px); }
        .kpi-card2-top { display: flex; align-items: center; justify-content: space-between; }
        .kpi-card2-icon {
          width: 36px; height: 36px;
          border-radius: 10px;
          display: grid; place-items: center;
          font-size: 17px;
        }
        .kpi-card2-val {
          font-size: 24px; font-weight: 800; color: #1a1a2e;
          letter-spacing: -0.5px; line-height: 1.1;
          margin-top: 8px;
        }
        .kpi-card2-footer { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
        .kpi-badge {
          font-size: 11px; font-weight: 700;
          padding: 2px 8px; border-radius: 20px;
        }
        .kpi-badge.pos { background: #dcfce7; color: #16a34a; }
        .kpi-badge.neg { background: #fee2e2; color: #dc2626; }
        .kpi-card2-lbl { font-size: 11px; color: #9ca3af; font-weight: 500; }

        /* ── Chart grid ── */
        .chart-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1.4fr;
          gap: 16px;
          margin-bottom: 16px;
        }
        @media(max-width:1100px){ .chart-grid { grid-template-columns: 1fr 1fr; } }
        @media(max-width:700px){  .chart-grid { grid-template-columns: 1fr; } }

        .chart-grid-bottom {
          display: grid;
          grid-template-columns: 1.6fr 1fr;
          gap: 16px;
        }
        @media(max-width:900px){ .chart-grid-bottom { grid-template-columns: 1fr; } }

        /* ── Card shell ── */
        .card2 {
          background: #fff;
          border-radius: 16px;
          padding: 18px 20px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);
        }
        .card2-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 14px;
        }
        .card2-title {
          font-size: 13px; font-weight: 700; color: #1a1a2e;
        }
        .card2-filter {
          font-size: 11px; color: #6b7280;
          background: #f3f4f6; border: none;
          border-radius: 20px; padding: 4px 12px;
          cursor: pointer; font-weight: 500;
        }

        /* ── Contextual legend ── */
        .ctx-body { display: flex; align-items: center; gap: 20px; }
        .ctx-legend { display: flex; flex-direction: column; gap: 8px; flex: 1; }
        .ctx-legend-row { display: flex; align-items: center; justify-content: space-between; }
        .ctx-legend-left { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #374151; }
        .ctx-dot { width: 10px; height: 10px; border-radius: 50%; }
        .ctx-pct { font-size: 12px; font-weight: 700; color: #1a1a2e; }

        /* ── Device legend ── */
        .dev-legend { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }
        .dev-legend-row { display: flex; align-items: center; gap: 8px; font-size: 12px; }
        .dev-dot { width: 10px; height: 10px; border-radius: 50%; }
        .dev-label { flex: 1; color: #374151; }
        .dev-pct { font-weight: 700; color: #1a1a2e; }

        /* ── Impression big stat ── */
        .imp-stat { font-size: 22px; font-weight: 800; color: #1a1a2e; letter-spacing: -0.5px; }
        .imp-delta { font-size: 12px; font-weight: 600; }
        .imp-delta.neg { color: #dc2626; }
        .imp-sub-stat {
          position: absolute; right: 28px; top: 58px;
          font-size: 13px; font-weight: 700; color: #1a1a2e;
          background: #fff; padding: 4px 10px; border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        /* ── Spend channel ── */
        .spend-meta { font-size: 11px; color: #22c55e; font-weight: 600; margin-bottom: 12px; }

        /* ── Resonance ── */
        .res-body { display: flex; align-items: center; gap: 20px; }
        .res-list { display: flex; flex-direction: column; gap: 12px; flex: 1; }
        .res-row { display: flex; align-items: center; gap: 10px; }
        .res-dot { width: 10px; height: 10px; border-radius: 50%; }
        .res-label { font-size: 12px; color: #374151; flex: 1; }
        .res-bar-track { height: 5px; flex: 2; background: #f3f4f6; border-radius: 10px; overflow: hidden; }
        .res-bar-fill { height: 5px; border-radius: 10px; transition: width 0.8s ease; }
        .res-score { font-size: 12px; font-weight: 700; color: #1a1a2e; width: 24px; text-align: right; }
      `}</style>

      <div className="dash-root">

        {/* ── Header ── */}
        <div className="dash-header">
          <div className="dash-title">Dashboard</div>
          <div className="dash-header-actions">
            <div className="dash-icon-btn">🔍</div>
            <div className="dash-avatar">A</div>
          </div>
        </div>

        {/* ── KPI Row ── */}
        <div className="kpi-row">
          {KPI_DATA.map((k, i) => (
            <div className="kpi-card2" key={i}>
              <div className="kpi-card2-top">
                <div className="kpi-card2-icon" style={{ background: k.bg }}>{k.icon}</div>
              </div>
              <div className="kpi-card2-val">{k.value}</div>
              <div className="kpi-card2-footer">
                <span className={`kpi-badge ${k.pos ? "pos" : "neg"}`}>{k.delta}</span>
                <span className="kpi-card2-lbl">{k.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Chart Row 1 ── */}
        <div className="chart-grid">

          {/* Contextual */}
          <div className="card2">
            <div className="card2-header">
              <span className="card2-title">Contextual</span>
              <button className="card2-filter">Last week ▾</button>
            </div>
            <div className="ctx-body">
              <div className="ctx-legend">
                {CONTEXTUAL.map((c, i) => (
                  <div className="ctx-legend-row" key={i}>
                    <div className="ctx-legend-left">
                      <div className="ctx-dot" style={{ background: c.color }} />
                      {c.label}
                    </div>
                    <div className="ctx-pct">{c.pct}%</div>
                  </div>
                ))}
              </div>
              <Donut
                segments={CONTEXTUAL.map(c => ({ value: c.pct, color: c.color }))}
                size={100} thickness={20}
              />
            </div>
          </div>

          {/* Device Type */}
          <div className="card2">
            <div className="card2-header">
              <span className="card2-title">Device Type</span>
              <button className="card2-filter">Last week ▾</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Donut
                segments={DEVICE_TYPE.map(d => ({ value: d.value, color: d.color }))}
                size={100} thickness={22}
              />
              <div className="dev-legend">
                {DEVICE_TYPE.map((d, i) => (
                  <div className="dev-legend-row" key={i}>
                    <div className="dev-dot" style={{ background: d.color }} />
                    <span className="dev-label">{d.label}</span>
                    <span className="dev-pct">{d.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Impression measurement */}
          <div className="card2" style={{ position: "relative" }}>
            <div className="card2-header">
              <span className="card2-title">Impression measurement</span>
              <button className="card2-filter">Last week ▾</button>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                <span className="imp-stat">46,557.23</span>
                <span className="imp-delta neg">-33.40% ↓</span>
              </div>
              <span className="imp-sub-stat">12,246.23</span>
              <LineChart series={IMPRESSION_SERIES} labels={IMP_LABELS} height={120} />
            </div>
          </div>
        </div>

        {/* ── Chart Row 2 ── */}
        <div className="chart-grid-bottom">

          {/* Spend by channel */}
          <div className="card2">
            <div className="card2-header">
              <div>
                <div className="card2-title">Spend by channel</div>
                <div className="spend-meta">Compared to last year +28.0% ↑</div>
              </div>
              <button className="card2-filter" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>Export</button>
            </div>
            <BarChart data={SPEND_BY_CHANNEL} highlight={6} />
          </div>

          {/* Resonance score by creative */}
          <div className="card2">
            <div className="card2-header">
              <span className="card2-title">Resonance score by creative</span>
            </div>
            <div className="res-body">
              <div className="res-list">
                {RESONANCE.map((r, i) => (
                  <div className="res-row" key={i}>
                    <div className="res-dot" style={{ background: r.color }} />
                    <span className="res-label">{r.label}</span>
                    <div className="res-bar-track">
                      <div className="res-bar-fill" style={{ width: `${r.score}%`, background: r.color }} />
                    </div>
                    <span className="res-score">{r.score}</span>
                  </div>
                ))}
              </div>
              <Donut
                segments={RESONANCE.map(r => ({ value: r.score, color: r.color }))}
                size={100} thickness={16}
              />
            </div>
          </div>

        </div>
      </div>
    </>
  );
}