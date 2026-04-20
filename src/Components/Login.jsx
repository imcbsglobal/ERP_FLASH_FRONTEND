import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, ArrowRight, User, Lock } from 'lucide-react';
import logo from '../assets/logo.png';
import whitelogo from '../assets/whitelogo.png';
import { authService } from '../service/log';
import { getUserPermissions } from '../service/useracess';

/* ─── Inline SVG hero: company operations scene ─── */
const OperationsHero = () => (
  <svg width="100%" viewBox="0 0 680 400" role="img" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', borderRadius: '0.75rem' }}>
    <defs>
      <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#0a1628"/>
        <stop offset="100%" stopColor="#0d2040"/>
      </linearGradient>
      <linearGradient id="floorGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#0c1e35"/>
        <stop offset="100%" stopColor="#091525"/>
      </linearGradient>
      <linearGradient id="screenGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#0d2137"/>
        <stop offset="100%" stopColor="#071525"/>
      </linearGradient>
      <linearGradient id="glowBlue" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#1d6fe8" stopOpacity="0.18"/>
        <stop offset="100%" stopColor="#1d6fe8" stopOpacity="0"/>
      </linearGradient>
      <linearGradient id="glowGreen" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#22c55e" stopOpacity="0.18"/>
        <stop offset="100%" stopColor="#22c55e" stopOpacity="0"/>
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
        <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="softGlow">
        <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
        <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <clipPath id="mainClip">
        <rect width="680" height="400" rx="12"/>
      </clipPath>
    </defs>

    {/* Background */}
    <rect width="680" height="400" fill="url(#bgGrad)" clipPath="url(#mainClip)"/>

    {/* Subtle grid */}
    {[...Array(14)].map((_, i) => (
      <line key={`v${i}`} x1={i*50} y1="0" x2={i*50} y2="400" stroke="#ffffff" strokeOpacity="0.025" strokeWidth="1"/>
    ))}
    {[...Array(9)].map((_, i) => (
      <line key={`h${i}`} x1="0" y1={i*50} x2="680" y2={i*50} stroke="#ffffff" strokeOpacity="0.025" strokeWidth="1"/>
    ))}

    {/* Ambient glow circles */}
    <ellipse cx="160" cy="200" rx="130" ry="100" fill="#1d6fe8" opacity="0.06"/>
    <ellipse cx="520" cy="180" rx="110" ry="90" fill="#22c55e" opacity="0.06"/>

    {/* ── FLOOR LINE ── */}
    <rect x="0" y="298" width="680" height="102" fill="url(#floorGrad)"/>
    <line x1="0" y1="298" x2="680" y2="298" stroke="#1e3a5f" strokeWidth="1.5"/>

    {/* ── LEFT WORKSTATION ── */}
    {/* Desk surface */}
    <rect x="40" y="270" width="220" height="14" rx="4" fill="#162840"/>
    <rect x="52" y="284" width="8" height="28" rx="3" fill="#0f1e30"/>
    <rect x="238" y="284" width="8" height="28" rx="3" fill="#0f1e30"/>

    {/* Large monitor */}
    <rect x="65" y="170" width="148" height="100" rx="6" fill="url(#screenGrad)" filter="url(#glow)"/>
    <rect x="65" y="170" width="148" height="100" rx="6" fill="none" stroke="#1e4a7a" strokeWidth="1.5"/>
    {/* Screen bezel top */}
    <rect x="65" y="170" width="148" height="14" rx="6" fill="#0a1c30"/>
    <rect x="65" y="176" width="148" height="8" fill="#0a1c30"/>
    {/* Monitor stand */}
    <rect x="130" y="270" width="18" height="12" rx="2" fill="#0f1e30"/>
    <rect x="118" y="280" width="42" height="5" rx="2" fill="#0f1e30"/>

    {/* Screen content - analytics dashboard */}
    <rect x="70" y="188" width="138" height="6" rx="2" fill="#0f2a45"/>
    <rect x="72" y="190" width="60" height="3" rx="1" fill="#3b82f6" opacity="0.7"/>

    {/* Line chart on monitor */}
    <rect x="70" y="198" width="138" height="56" rx="3" fill="#071828"/>
    <line x1="70" y1="214" x2="208" y2="214" stroke="#1a3050" strokeWidth="0.8"/>
    <line x1="70" y1="228" x2="208" y2="228" stroke="#1a3050" strokeWidth="0.8"/>
    <line x1="70" y1="242" x2="208" y2="242" stroke="#1a3050" strokeWidth="0.8"/>
    <polyline points="74,248 90,238 106,242 122,224 138,228 154,212 170,216 186,202 202,205" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)"/>
    <polygon points="74,254 74,248 90,238 106,242 122,224 138,228 154,212 170,216 186,202 202,205 202,254" fill="url(#glowGreen)"/>
    <circle cx="154" cy="212" r="3.5" fill="#22c55e" filter="url(#glow)"/>
    <circle cx="186" cy="202" r="3.5" fill="#22c55e" filter="url(#glow)"/>

    {/* Keyboard */}
    <rect x="85" y="256" width="100" height="12" rx="3" fill="#0e1e2e"/>
    <rect x="87" y="258" width="96" height="8" rx="2" fill="#122030"/>
    {[...Array(8)].map((_, i) => (
      <rect key={i} x={89 + i*11} y="260" width="8" height="4" rx="1" fill="#0a1828" opacity="0.8"/>
    ))}
    {/* Mouse */}
    <rect x="192" y="255" width="22" height="15" rx="7" fill="#0e1e2e"/>
    <line x1="203" y1="255" x2="203" y2="262" stroke="#1a3050" strokeWidth="1"/>

    {/* Person at left desk */}
    <rect x="110" y="278" width="58" height="6" rx="3" fill="#162840"/>
    <rect x="130" y="284" width="18" height="28" rx="4" fill="#1a3a6a"/>
    {/* Torso */}
    <rect x="106" y="248" width="66" height="36" rx="10" fill="#1d4ed8"/>
    {/* Head */}
    <circle cx="139" cy="232" r="20" fill="#f0c8a0"/>
    <path d="M120 229 Q120 212 139 210 Q158 212 158 229" fill="#2c1810"/>
    <ellipse cx="139" cy="214" rx="20" ry="9" fill="#2c1810"/>
    {/* Eyes */}
    <ellipse cx="133" cy="233" rx="2.5" ry="3" fill="#3d2010" opacity="0.75"/>
    <ellipse cx="145" cy="233" rx="2.5" ry="3" fill="#3d2010" opacity="0.75"/>
    {/* Smile */}
    <path d="M134 241 Q139 245 144 241" fill="none" stroke="#b07855" strokeWidth="1.5" strokeLinecap="round"/>
    {/* Arms */}
    <path d="M106 262 Q95 265 88 258" fill="none" stroke="#1d4ed8" strokeWidth="10" strokeLinecap="round"/>
    <circle cx="88" cy="258" r="7" fill="#f0c8a0"/>
    <path d="M172 262 Q182 265 186 258" fill="none" stroke="#1d4ed8" strokeWidth="10" strokeLinecap="round"/>
    <circle cx="186" cy="258" r="7" fill="#f0c8a0"/>

    {/* ── CENTER LARGE DASHBOARD PANEL ── */}
    <rect x="230" y="30" width="220" height="200" rx="8" fill="#081625" filter="url(#softGlow)"/>
    <rect x="230" y="30" width="220" height="200" rx="8" fill="none" stroke="#1e4070" strokeWidth="1.5"/>
    {/* Panel title bar */}
    <rect x="230" y="30" width="220" height="26" rx="8" fill="#0a1e35"/>
    <rect x="230" y="46" width="220" height="10" fill="#0a1e35"/>
    <circle cx="244" cy="43" r="4" fill="#ef4444" opacity="0.8"/>
    <circle cx="258" cy="43" r="4" fill="#f59e0b" opacity="0.8"/>
    <circle cx="272" cy="43" r="4" fill="#22c55e" opacity="0.8"/>
    <rect x="288" y="38" width="80" height="10" rx="3" fill="#1a3050"/>

    {/* KPI row */}
    <rect x="238" y="62" width="60" height="44" rx="5" fill="#0d2035"/>
    <rect x="306" y="62" width="60" height="44" rx="5" fill="#0d2035"/>
    <rect x="374" y="62" width="68" height="44" rx="5" fill="#0d2035"/>
    {/* KPI labels */}
    <rect x="242" y="67" width="32" height="5" rx="2" fill="#22c55e" opacity="0.6"/>
    <rect x="242" y="75" width="48" height="8" rx="2" fill="#22c55e"/>
    <rect x="242" y="86" width="24" height="5" rx="2" fill="#22c55e" opacity="0.4"/>
    <rect x="310" y="67" width="32" height="5" rx="2" fill="#3b82f6" opacity="0.6"/>
    <rect x="310" y="75" width="48" height="8" rx="2" fill="#3b82f6"/>
    <rect x="310" y="86" width="24" height="5" rx="2" fill="#3b82f6" opacity="0.4"/>
    <rect x="378" y="67" width="32" height="5" rx="2" fill="#f59e0b" opacity="0.6"/>
    <rect x="378" y="75" width="48" height="8" rx="2" fill="#f59e0b"/>
    <rect x="378" y="86" width="24" height="5" rx="2" fill="#f59e0b" opacity="0.4"/>

    {/* Bar chart in panel */}
    <rect x="238" y="114" width="98" height="60" rx="4" fill="#071525"/>
    <rect x="238" y="114" width="98" height="60" rx="4" fill="none" stroke="#1a3050" strokeWidth="0.8"/>
    <line x1="238" y1="134" x2="336" y2="134" stroke="#1a3050" strokeWidth="0.6"/>
    <line x1="238" y1="154" x2="336" y2="154" stroke="#1a3050" strokeWidth="0.6"/>
    <rect x="244" y="148" width="12" height="20" rx="2" fill="#3b82f6" opacity="0.7"/>
    <rect x="260" y="138" width="12" height="30" rx="2" fill="#3b82f6" opacity="0.85"/>
    <rect x="276" y="130" width="12" height="38" rx="2" fill="#3b82f6"/>
    <rect x="292" y="142" width="12" height="26" rx="2" fill="#60a5fa"/>
    <rect x="308" y="125" width="12" height="43" rx="2" fill="#3b82f6" opacity="0.9" filter="url(#glow)"/>

    {/* Donut chart in panel */}
    <circle cx="388" cy="144" r="26" fill="#071525"/>
    <circle cx="388" cy="144" r="26" fill="none" stroke="#22c55e" strokeWidth="8" strokeDasharray="68 95" strokeDashoffset="0" opacity="0.9" filter="url(#glow)"/>
    <circle cx="388" cy="144" r="26" fill="none" stroke="#3b82f6" strokeWidth="8" strokeDasharray="48 95" strokeDashoffset="-68" opacity="0.85"/>
    <circle cx="388" cy="144" r="26" fill="none" stroke="#f59e0b" strokeWidth="8" strokeDasharray="46 95" strokeDashoffset="-116" opacity="0.8"/>
    <circle cx="388" cy="144" r="14" fill="#071525"/>
    <rect x="381" y="139" width="14" height="4" rx="2" fill="#fff" opacity="0.5"/>
    <rect x="383" y="146" width="10" height="3" rx="1" fill="#fff" opacity="0.3"/>

    {/* ── RIGHT WORKSTATION ── */}
    <rect x="420" y="270" width="220" height="14" rx="4" fill="#162840"/>
    <rect x="432" y="284" width="8" height="28" rx="3" fill="#0f1e30"/>
    <rect x="618" y="284" width="8" height="28" rx="3" fill="#0f1e30"/>

    {/* Right monitor */}
    <rect x="460" y="168" width="148" height="102" rx="6" fill="url(#screenGrad)" filter="url(#glow)"/>
    <rect x="460" y="168" width="148" height="102" rx="6" fill="none" stroke="#1e4a7a" strokeWidth="1.5"/>
    <rect x="460" y="168" width="148" height="14" rx="6" fill="#0a1c30"/>
    <rect x="460" y="174" width="148" height="8" fill="#0a1c30"/>
    <rect x="525" y="270" width="18" height="12" rx="2" fill="#0f1e30"/>
    <rect x="513" y="280" width="42" height="5" rx="2" fill="#0f1e30"/>

    {/* Kanban board on right monitor */}
    <rect x="464" y="186" width="140" height="72" rx="3" fill="#071828"/>
    <rect x="466" y="188" width="42" height="66" rx="3" fill="#0d2035"/>
    <rect x="512" y="188" width="42" height="66" rx="3" fill="#0d2035"/>
    <rect x="558" y="188" width="42" height="66" rx="3" fill="#0d2035"/>
    {/* Kanban cards */}
    <rect x="468" y="192" width="38" height="12" rx="2" fill="#22c55e" opacity="0.7"/>
    <rect x="468" y="207" width="38" height="12" rx="2" fill="#22c55e" opacity="0.5"/>
    <rect x="468" y="222" width="38" height="12" rx="2" fill="#22c55e" opacity="0.35"/>
    <rect x="514" y="192" width="38" height="12" rx="2" fill="#f59e0b" opacity="0.75"/>
    <rect x="514" y="207" width="38" height="12" rx="2" fill="#f59e0b" opacity="0.5"/>
    <rect x="560" y="192" width="38" height="12" rx="2" fill="#3b82f6" opacity="0.75"/>
    <rect x="560" y="207" width="38" height="12" rx="2" fill="#3b82f6" opacity="0.5"/>
    <rect x="560" y="222" width="38" height="12" rx="2" fill="#3b82f6" opacity="0.3"/>
    {/* Column labels */}
    <rect x="468" y="248" width="22" height="4" rx="1" fill="#22c55e" opacity="0.6"/>
    <rect x="514" y="248" width="22" height="4" rx="1" fill="#f59e0b" opacity="0.6"/>
    <rect x="560" y="248" width="22" height="4" rx="1" fill="#3b82f6" opacity="0.6"/>

    {/* Right person */}
    <rect x="500" y="278" width="60" height="6" rx="3" fill="#162840"/>
    <rect x="521" y="284" width="18" height="28" rx="4" fill="#7c3aed"/>
    <rect x="497" y="248" width="66" height="36" rx="10" fill="#7c3aed"/>
    <circle cx="530" cy="232" r="20" fill="#d4956a"/>
    <path d="M511 229 Q511 212 530 210 Q549 212 549 229" fill="#1a0f08"/>
    <ellipse cx="530" cy="214" rx="20" ry="9" fill="#1a0f08"/>
    <ellipse cx="524" cy="233" rx="2.5" ry="3" fill="#3d2010" opacity="0.75"/>
    <ellipse cx="536" cy="233" rx="2.5" ry="3" fill="#3d2010" opacity="0.75"/>
    <path d="M525 241 Q530 245 535 241" fill="none" stroke="#a07050" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M497 263 Q486 266 480 259" fill="none" stroke="#7c3aed" strokeWidth="10" strokeLinecap="round"/>
    <circle cx="480" cy="259" r="7" fill="#d4956a"/>
    <path d="M563 263 Q574 266 578 259" fill="none" stroke="#7c3aed" strokeWidth="10" strokeLinecap="round"/>
    <circle cx="578" cy="259" r="7" fill="#d4956a"/>

    {/* ── FLOATING NOTIFICATION CARDS ── */}
    {/* Top left card */}
    <rect x="22" y="42" width="140" height="56" rx="8" fill="#0d2035" opacity="0.96" filter="url(#softGlow)"/>
    <rect x="22" y="42" width="140" height="56" rx="8" fill="none" stroke="#1e4070" strokeWidth="1"/>
    <rect x="32" y="52" width="22" height="22" rx="5" fill="#052a18"/>
    <polygon points="43,56 47,64 39,64" fill="#22c55e" filter="url(#glow)"/>
    <rect x="62" y="52" width="90" height="6" rx="2" fill="#1e3a55"/>
    <rect x="62" y="62" width="60" height="5" rx="2" fill="#22c55e" opacity="0.6"/>
    <rect x="32" y="78" width="120" height="12" rx="3" fill="#071525"/>
    <rect x="34" y="80" width="52" height="8" rx="2" fill="#22c55e" opacity="0.65"/>
    <rect x="90" y="80" width="36" height="8" rx="2" fill="#1e3a55"/>
    {/* Connector line */}
    <line x1="162" y1="70" x2="190" y2="115" stroke="#1e3a55" strokeWidth="0.8" strokeDasharray="3,3"/>

    {/* Top right card */}
    <rect x="518" y="32" width="140" height="56" rx="8" fill="#0d2035" opacity="0.96" filter="url(#softGlow)"/>
    <rect x="518" y="32" width="140" height="56" rx="8" fill="none" stroke="#1e4070" strokeWidth="1"/>
    <rect x="528" y="42" width="22" height="22" rx="5" fill="#0a1e3a"/>
    <rect x="531" y="45" width="16" height="16" rx="3" fill="none" stroke="#60a5fa" strokeWidth="1.5"/>
    <line x1="531" y1="51" x2="547" y2="51" stroke="#60a5fa" strokeWidth="1" filter="url(#glow)"/>
    <line x1="531" y1="55" x2="543" y2="55" stroke="#60a5fa" strokeWidth="1" opacity="0.6"/>
    <rect x="558" y="42" width="90" height="6" rx="2" fill="#1e3a55"/>
    <rect x="558" y="52" width="60" height="5" rx="2" fill="#3b82f6" opacity="0.6"/>
    <rect x="528" y="68" width="120" height="12" rx="3" fill="#071525"/>
    <rect x="530" y="70" width="52" height="8" rx="2" fill="#60a5fa" opacity="0.65"/>
    <rect x="586" y="70" width="36" height="8" rx="2" fill="#1e3a55"/>
    <line x1="518" y1="60" x2="490" y2="95" stroke="#1e3a55" strokeWidth="0.8" strokeDasharray="3,3"/>

    {/* ── BOTTOM STATUS BAR ── */}
    <rect x="0" y="352" width="680" height="48" fill="#061018"/>
    <line x1="0" y1="352" x2="680" y2="352" stroke="#1e3a5f" strokeWidth="1"/>
    {/* Status chips */}
    <rect x="24" y="362" width="80" height="22" rx="11" fill="#052a18"/>
    <circle cx="40" cy="373" r="4" fill="#22c55e" filter="url(#glow)"/>
    <rect x="50" y="368" width="46" height="10" rx="3" fill="#22c55e" opacity="0.5"/>
    <rect x="116" y="362" width="80" height="22" rx="11" fill="#0a1e3a"/>
    <circle cx="132" cy="373" r="4" fill="#3b82f6" filter="url(#glow)"/>
    <rect x="142" y="368" width="46" height="10" rx="3" fill="#3b82f6" opacity="0.5"/>
    <rect x="208" y="362" width="80" height="22" rx="11" fill="#1c1200"/>
    <circle cx="224" cy="373" r="4" fill="#f59e0b" filter="url(#glow)"/>
    <rect x="234" y="368" width="46" height="10" rx="3" fill="#f59e0b" opacity="0.5"/>
    {/* Right side metrics */}
    <rect x="440" y="362" width="100" height="22" rx="4" fill="#0d2035"/>
    <rect x="442" y="367" width="30" height="6" rx="2" fill="#1e3a55"/>
    <rect x="442" y="376" width="50" height="5" rx="2" fill="#22c55e" opacity="0.6"/>
    <rect x="552" y="362" width="100" height="22" rx="4" fill="#0d2035"/>
    <rect x="554" y="367" width="30" height="6" rx="2" fill="#1e3a55"/>
    <rect x="554" y="376" width="50" height="5" rx="2" fill="#3b82f6" opacity="0.6"/>
  </svg>
);
/* ─── Styles ─── */
const styles = {
  page: {
    height: '100vh',
    width: '100vw',
    display: 'flex',
    backgroundColor: '#f0f7f0',
    fontFamily: "'Google Sans', sans-serif",
    overflow: 'hidden',
    margin: 0,
    padding: 0,
    boxSizing: 'border-box',
    position: 'fixed',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerCard: {
    display: 'flex',
    flexDirection: 'row',
    width: '82%',
    maxWidth: '1100px',
    height: '76vh',
    minHeight: '560px',
    borderRadius: '1.5rem',
    overflow: 'hidden',
    boxShadow: '0 24px 80px rgba(0,0,0,0.14)',
  },
  leftPanel: {
    width: '42%',
    backgroundColor: 'rgb(24 93 195)',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
    padding: '2.25rem 2rem 2rem',
    boxSizing: 'border-box',
  },
  leftBlob: {
    position: 'absolute',
    top: '-5rem',
    right: '-5rem',
    width: '18rem',
    height: '18rem',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: '50%',
    pointerEvents: 'none',
  },
  leftBlobBottom: {
    position: 'absolute',
    bottom: '-4rem',
    left: '-4rem',
    width: '14rem',
    height: '14rem',
    backgroundColor: 'rgba(0,0,0,0.12)',
    borderRadius: '50%',
    pointerEvents: 'none',
  },
  leftContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    zIndex: 1,
  },
  heroImageWrap: {
    borderRadius: '1rem',
    overflow: 'hidden',
    marginBottom: '1.5rem',
  },
  tagline: {
    color: '#fff',
    fontSize: '0.82rem',
    fontWeight: 800,
    lineHeight: 1.25,
    marginBottom: '0.75rem',
    letterSpacing: '-0.5px',
  },
  taglineDesc: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: '0.82rem',
    lineHeight: 1.6,
  },
  rightPanel: {
    width: '58%',
    backgroundColor: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2.5rem 3rem',
    boxSizing: 'border-box',
    overflowY: 'auto',
  },
  formBox: {
    width: '100%',
    maxWidth: '22rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  logoWrap: { marginBottom: '1.25rem' },
  logoImg: { height: '4rem', width: 'auto', objectFit: 'contain' },
  heading: {
    fontSize: '1.35rem',
    fontWeight: 800,
    color: '#111827',
    marginBottom: '0.3rem',
    textAlign: 'center',
    letterSpacing: '-0.3px',
  },
  subheading: {
    fontSize: '0.82rem',
    color: '#9ca3af',
    marginBottom: '1.75rem',
    textAlign: 'center',
  },
  fieldGroup: { marginBottom: '0.9rem', width: '100%' },
  label: {
    display: 'block',
    fontSize: '0.72rem',
    fontWeight: 700,
    color: '#6b7280',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: '0.4rem',
    textAlign: 'left',
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.4rem',
  },
  inputWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  inputIcon: {
    position: 'absolute',
    left: '0.85rem',
    color: '#d1d5db',
    display: 'flex',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  input: (disabled, focused) => ({
    width: '100%',
    padding: '0.7rem 1rem 0.7rem 2.6rem',
    borderRadius: '0.6rem',
    border: `1.5px solid ${focused ? '#1a5c35' : '#e5e7eb'}`,
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
    color: '#111827',
    backgroundColor: disabled ? '#f9fafb' : '#fff',
    cursor: disabled ? 'not-allowed' : 'auto',
    transition: 'border-color 0.15s',
  }),
  eyeBtn: {
    position: 'absolute',
    right: '0.75rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#1a73e8',
    display: 'flex',
    alignItems: 'center',
    padding: 0,
  },
  submitBtn: (loading) => ({
    width: '100%',
    backgroundColor: '#1a73e8',
    color: '#fff',
    padding: '0.8rem 1rem',
    borderRadius: '0.6rem',
    fontWeight: 800,
    fontSize: '0.95rem',
    border: 'none',
    cursor: loading ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    marginTop: '1.1rem',
    marginBottom: '1.1rem',
    opacity: loading ? 0.8 : 1,
    letterSpacing: '-0.2px',
  }),
  errorBox: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '0.5rem',
    padding: '0.65rem 0.9rem',
    marginBottom: '1rem',
    color: '#dc2626',
    fontSize: '0.82rem',
    textAlign: 'left',
    width: '100%',
  },
};

/* ─── Component ─── */
export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername]         = useState('');
  const [password, setPassword]         = useState('');
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [focusedField, setFocusedField] = useState('');

  useEffect(() => {
    if (authService.isAuthenticated()) {
      window.location.href = '/';
      return;
    }
    document.body.style.margin   = '0';
    document.body.style.padding  = '0';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.margin  = '0';
    document.documentElement.style.padding = '0';
    return () => {
      document.body.style.margin   = '';
      document.body.style.padding  = '';
      document.body.style.overflow = '';
      document.documentElement.style.margin  = '';
      document.documentElement.style.padding = '';
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }
    setLoading(true);
    try {
      const data = await authService.login(username.trim(), password);
      if (data?.user?.id) {
        try {
          const menuPermissions = await getUserPermissions(data.user.id);
          localStorage.setItem('menu_permissions', JSON.stringify(menuPermissions));
        } catch {
          localStorage.setItem('menu_permissions', JSON.stringify({}));
        }
      }
      window.location.href = '/';
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.non_field_errors?.[0] ||
        err?.message ||
        'Login failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.outerCard}>

        {/* ── Left Panel ── */}
        <div style={styles.leftPanel}>
          <div style={styles.leftBlob} />
          <div style={styles.leftBlobBottom} />

          <div style={{ zIndex: 1, marginBottom: '1rem' }}>
            <img src={whitelogo} alt="Brand" style={{ height: '2rem', width: 'auto', objectFit: 'contain' }} />
          </div>

          <div style={styles.leftContent}>
            <div style={styles.tagline}>Operations,<br />beautifully managed.</div>
            <div style={styles.heroImageWrap}>
              <OperationsHero />
            </div>
            
            <div style={styles.taglineDesc}>
              Real-time dashboards, team workflows and analytics —
              everything your business needs in one place.
            </div>
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div style={styles.rightPanel}>
          <div style={styles.formBox}>
            <div style={styles.logoWrap}>
              <img src={logo} alt="Logo" style={styles.logoImg} />
            </div>

            <div style={styles.heading}>Sign in to your account</div>
            <div style={styles.subheading}>Access your dashboard</div>

            {error && <div style={styles.errorBox}>{error}</div>}

            <form onSubmit={handleSubmit} noValidate style={{ width: '100%' }}>

              {/* Username */}
              <div style={styles.fieldGroup}>
                <label style={styles.label} htmlFor="username">Username</label>
                <div style={styles.inputWrap}>
                  <span style={styles.inputIcon}><User size={15} /></span>
                  <input
                    id="username"
                    type="text"
                    placeholder="maitre_james"
                    style={styles.input(loading, focusedField === 'username')}
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setError(''); }}
                    onFocus={() => setFocusedField('username')}
                    onBlur={() => setFocusedField('')}
                    disabled={loading}
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>

              {/* Password */}
              <div style={styles.fieldGroup}>
                <label style={styles.label} htmlFor="password">Password</label>
                <div style={styles.inputWrap}>
                  <span style={styles.inputIcon}><Lock size={15} /></span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    style={{ ...styles.input(loading, focusedField === 'password'), paddingRight: '2.75rem' }}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField('')}
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <button type="submit" style={styles.submitBtn(loading)} disabled={loading}>
                {loading && (
                  <span style={{
                    width: 16, height: 16,
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                    display: 'inline-block',
                  }} />
                )}
                {loading ? 'Signing in…' : 'Sign In'}
                {!loading && <ArrowRight size={16} />}
              </button>

            </form>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700;800&display=swap');
      `}</style>
    </div>
  );
}