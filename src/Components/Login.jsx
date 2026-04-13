import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Check } from 'lucide-react';
import logo from '../assets/logo.png';
import whitelogo from '../assets/whitelogo.png';

const styles = {
  page: {
    height: '100vh',
    width: '100vw',
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: '#fff',
    fontFamily: 'sans-serif',
    overflow: 'hidden',
    margin: 0,
    padding: 0,
    boxSizing: 'border-box',
    position: 'fixed',
    top: 0,
    left: 0,
  },
  leftPanel: {
    width: '50%',
    backgroundColor: '#0f172a',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    color: '#fff',
    position: 'relative',
    overflow: 'hidden',
  },
  leftInner: {
    padding: '3rem',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    boxSizing: 'border-box',
  },
  illustrationWrap: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  illustrationArea: {
    position: 'relative',
    width: '100%',
    maxWidth: '20rem',
    height: '20rem',
  },
  floatingCard: (top, left) => ({
    position: 'absolute',
    top,
    left,
    width: '3.5rem',
    height: '3.5rem',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: '0.75rem',
    border: '1px solid rgba(255,255,255,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }),
  floatingInner: {
    width: '1.75rem',
    height: '1.75rem',
    borderRadius: '4px',
    backgroundColor: 'rgba(147,197,253,0.3)',
  },
  decoBlobBL: {
    position: 'absolute',
    bottom: '-6rem',
    left: '-6rem',
    width: '16rem',
    height: '16rem',
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderRadius: '50%',
    pointerEvents: 'none',
  },
  decoBlobTR: {
    position: 'absolute',
    top: '-6rem',
    right: '-6rem',
    width: '16rem',
    height: '16rem',
    backgroundColor: 'rgba(96,165,250,0.1)',
    borderRadius: '50%',
    pointerEvents: 'none',
  },
  rightPanel: {
    width: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    overflow: 'hidden',
  },
  formBox: {
    width: '100%',
    maxWidth: '28rem',
  },
  logoWrap: {
    display: 'flex',
    justifyContent: 'flex-start',
    marginBottom: '2rem',
  },
  logoImg: {
    height: '10rem',
    width: 'auto',
    objectFit: 'contain',
  },
  fieldGroup: {
    marginBottom: '1.25rem',
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#334155',
    marginBottom: '0.5rem',
    textAlign: 'left',
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '0.5rem',
    border: '1px solid #e2e8f0',
    fontSize: '1rem',
    outline: 'none',
    boxSizing: 'border-box',
    color: '#0f172a',
  },
  passwordWrap: {
    position: 'relative',
  },
  eyeBtn: {
    position: 'absolute',
    right: '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    padding: 0,
  },
  rememberRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.5rem',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
  },
  checkbox: (checked) => ({
    width: '1.25rem',
    height: '1.25rem',
    borderRadius: '0.25rem',
    border: `1px solid ${checked ? '#0f172a' : '#cbd5e1'}`,
    backgroundColor: checked ? '#0f172a' : 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    cursor: 'pointer',
  }),
  rememberLabel: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#475569',
  },
  submitBtn: {
    width: '100%',
    backgroundColor: '#0f172a',
    color: '#fff',
    padding: '0.875rem 1rem',
    borderRadius: '0.5rem',
    fontWeight: 700,
    fontSize: '1rem',
    border: 'none',
    cursor: 'pointer',
  },
};

const floatingCards = [
  { top: '15%', left: '20%' },
  { top: '20%', left: '75%' },
  { top: '70%', left: '15%' },
  { top: '75%', left: '80%' },
  { top: '45%', left: '10%' },
  { top: '40%', left: '85%' },
];

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.margin = '0';
    document.documentElement.style.padding = '0';
    return () => {
      document.body.style.margin = '';
      document.body.style.padding = '';
      document.body.style.overflow = '';
      document.documentElement.style.margin = '';
      document.documentElement.style.padding = '';
    };
  }, []);

  return (
    <div style={styles.page}>
      {/* Left Panel */}
      <div style={styles.leftPanel}>
        <div style={styles.leftInner}>

          <div style={styles.illustrationWrap}>
            <div style={styles.illustrationArea}>

              {/* White logo above center */}
              <div style={{
                position: 'absolute',
               
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1,
              }}>
                <img
                  src={whitelogo}
                  alt="Flash Innovations"
                  style={{ width: '85%', height: 'auto', objectFit: 'contain' }}
                />
              </div>

              {floatingCards.map((pos, i) => (
                <div key={i} style={styles.floatingCard(pos.top, pos.left)}>
                  <div style={styles.floatingInner} />
                </div>
              ))}

              <svg
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: -1, opacity: 0.2 }}
                viewBox="0 0 400 400"
              >
                <path d="M200,200 L80,80 M200,200 L320,100 M200,200 L80,300 M200,200 L340,320" stroke="white" strokeWidth="2" fill="none" />
              </svg>
            </div>
          </div>
        </div>

        <div style={styles.decoBlobBL} />
        <div style={styles.decoBlobTR} />
      </div>

      {/* Right Panel */}
      <div style={styles.rightPanel}>
        <div style={styles.formBox}>

          {/* Logo above Email */}
          <div style={styles.logoWrap}>
            <img src={logo} alt="Logo" style={styles.logoImg} />
          </div>

          <form onSubmit={(e) => e.preventDefault()}>
            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                placeholder="Enter your username"
                style={styles.input}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="password">Password</label>
              <div style={styles.passwordWrap}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  style={{ ...styles.input, paddingRight: '2.75rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  {showPassword
                    ? <EyeOff style={{ width: 20, height: 20 }} />
                    : <Eye style={{ width: 20, height: 20 }} />}
                </button>
              </div>
            </div>

            <div style={styles.rememberRow}>
              <div
                style={styles.checkboxRow}
                onClick={() => setRememberMe(!rememberMe)}
              >
                <div style={styles.checkbox(rememberMe)}>
                  {rememberMe && <Check style={{ width: 14, height: 14, color: '#fff', strokeWidth: 3 }} />}
                </div>
                <span style={styles.rememberLabel}>Remember me</span>
              </div>
            </div>

            <button type="submit" style={styles.submitBtn}>Sign in</button>
          </form>
        </div>
      </div>
    </div>
  );
}