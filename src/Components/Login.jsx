import { useState } from "react";
import axios from "axios";
import loginBg from "./6909.jpg";
import brandLogo from "../assets/logo.png";

// ── API base (matches your Django dev server) ─────────────────
const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
  @import url('https://fonts.cdnfonts.com/css/nohemi');
  
  * { 
    margin: 0; 
    padding: 0; 
    box-sizing: border-box; 
  }
  
  html, body, #root {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
  }
  
  body { 
    font-family: 'Nohemi', 'Plus Jakarta Sans', 'Segoe UI', sans-serif; 
    margin: 0; 
    padding: 0; 
    overflow: hidden;
  }

  .login-root {
    width: 100vw;
    height: 100vh;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    overflow: hidden;
  }

  .login-card {
    display: grid;
    grid-template-columns: 1fr 1fr;
    width: 100%;
    height: 100%;
    overflow: hidden;
    animation: cardIn 0.6s cubic-bezier(0.22,1,0.36,1) both;
  }

  @keyframes cardIn {
    from { opacity: 0; transform: translateY(32px) scale(0.97); }
    to   { opacity: 1; transform: none; }
  }

  /* ── LEFT: full-screen image ── */
  .login-left-img {
    position: relative;
    overflow: hidden;
  }

  .login-left-img img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    display: block;
  }

  /* ── RIGHT: login form ── */
  .login-right-form {
    background: white;
    padding: 60px 56px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    overflow-y: auto;
  }

  .form-inner {
    width: 100%;
    max-width: 460px;
  }

  .logo-wrap {
    
    border-radius: 12px;
    display: inline-block;
    padding: 12px 20px;
    margin-bottom: 20px;
    
  }

  .brand-logo {
    width: 500px;
    height: auto;
    display: block;
    object-fit: contain;
    margin-bottom:20px;
    margin-top:20px;
  }

  .login-title {
    font-family: 'Nohemi', 'Plus Jakarta Sans', sans-serif;
    font-size: 2.2rem;
    font-weight: 800;
    color: #1a73e8;
    margin-bottom: 20px;
    letter-spacing: -0.5px;
  }

  .login-subtitle {
    font-size: 0.9rem;
    color: #070707;
    line-height: 1.5;
    margin-bottom: 32px;
    font-family: 'Nohemi', 'Plus Jakarta Sans', sans-serif;
  }

  .field-group { margin-bottom: 16px; }

  .field-label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
  }

  .field-label {
    font-size:1rem;
    font-weight: 600;
    color: #2d3e50;
    letter-spacing: 0.02em;
    font-family: 'Nohemi', 'Plus Jakarta Sans', sans-serif;
  }

  .required { color: #e8344e; margin-left: 2px; }

  .input-wrap { position: relative; width: 100%; }

  .field-input {
    width: 120%;
    padding: 14px 18px;
    background: #f8f9fa;
    border: 1.5px solid #e9ecef;
    border-radius: 10px;
    font-family: 'Nohemi', 'Plus Jakarta Sans', sans-serif;
    font-size:1rem;
    color: #2d3e50;
    outline: none;
    transition: all 0.25s;
  }

  .field-input::placeholder { color: #adb5bd; }

  .field-input:focus {
    background: #fff;
    border-color: #1a3a2a;
    box-shadow: 0 0 0 4px rgba(26,58,42,0.08);
  }

  .field-input.error-border { border-color: #e8344e; }

  .toggle-btn {
    position: absolute;
    right: 20px; top: 50%;
    transform: translateY(-50%);
    background: none; border: none;
    cursor: pointer; color: #8a95a3;
    display: flex; align-items: center;
    padding: 6px;
    transition: color 0.2s;
  }
  .toggle-btn:hover { color: #2d3e50; }

  .login-btn {
    width: 120%;
    padding: 12px;
    background:#1a73e8;
    color: #fff;
    border: none;
    border-radius: 10px;
    font-family: 'Nohemi', 'Plus Jakarta Sans', sans-serif;
    font-size: 1rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    cursor: pointer;
    margin-top: 20px;
    transition: transform 0.18s, box-shadow 0.18s, opacity 0.18s;
    box-shadow: 0 6px 18px rgba(26,58,42,0.25);
  }
  .login-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 12px 28px rgba(26,58,42,0.35);
  }
  .login-btn:disabled { opacity: 0.65; cursor: not-allowed; }

  .forgot-link {
    text-align: right;
    margin-top: 8px;
  }
  .forgot-link a {
    font-size: 0.8rem;
    color: #1a3a2a;
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s;
  }
  .forgot-link a:hover {
    color: #c9a84c;
    text-decoration: underline;
  }

  .error-msg {
    font-size: 0.75rem;
    color: #e8344e;
    margin-top: 6px;
    padding-left: 2px;
    animation: fadeIn 0.2s;
    font-family: 'Nohemi', 'Plus Jakarta Sans', sans-serif;
  }

  .api-error {
    font-size: 0.85rem;
    color: #e8344e;
    background: #fdecea;
    border: 1px solid #f5c6cb;
    border-radius: 12px;
    padding: 12px 16px;
    margin-bottom: 24px;
    text-align: center;
    animation: fadeIn 0.2s;
    font-family: 'Nohemi', 'Plus Jakarta Sans', sans-serif;
  }

  .success-msg {
    font-size: 0.85rem;
    color: #1a73e8;
    background: #e1ebf8;
    border: 1px solid #c1cbda;
    border-radius: 12px;
    padding: 12px 16px;
    margin-bottom: 24px;
    text-align: center;
    animation: fadeIn 0.2s;
    font-family: 'Nohemi', 'Plus Jakarta Sans', sans-serif;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: none; }
  }

  .spinner {
    display: inline-block;
    width: 16px; 
    height: 16px;
    border: 2px solid rgba(255,255,255,0.4);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    vertical-align: middle;
    margin-right: 8px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 768px) {
    .login-card { 
      grid-template-columns: 1fr; 
      max-width: 100%;
    }
    .login-left-img { display: none; }
    .login-right-form { 
      padding: 40px 28px; 
      justify-content: flex-start;
    }
    .login-title { font-size: 2rem; }
    .login-subtitle { font-size: 0.9rem; margin-bottom: 32px; }
  }

  @media (max-width: 480px) {
    .login-right-form { padding: 32px 20px; }
    .login-title { font-size: 1.75rem; }
    .field-input { padding: 12px 16px; }
    .login-btn { padding: 12px; }
  }
`;

const EyeIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeOffIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

// ── Default permissions (all false) used as fallback ─────────────────────────
const DEFAULT_PERMS = {
  dashboard:   false,
  col_reports: false,
  vm_trips:    false,
  vm_service:  false,
  um_users:    false,
  um_roles:    false,
  mm_vehicle:  false,
};

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [errors,   setErrors]   = useState({});
  const [apiError, setApiError] = useState("");
  const [success,  setSuccess]  = useState("");
  const [loading,  setLoading]  = useState(false);

  const validate = () => {
    const e = {};
    if (!username) e.username = "Username is required.";
    if (!password) e.password = "Password is required.";
    return e;
  };

  // ── Fetch permissions for a user ID and store in localStorage ────────────────
  const fetchAndStorePermissions = async (userId, accessToken) => {
    try {
      const res = await fetch(
        `${API_BASE}/users/${userId}/permissions/`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (res.ok) {
        const perms = await res.json();
        // Store all 7 permission keys (drop updated_at etc.)
        const permissionsToStore = {
          dashboard:   !!perms.dashboard,
          col_reports: !!perms.col_reports,
          vm_trips:    !!perms.vm_trips,
          vm_service:  !!perms.vm_service,
          um_users:    !!perms.um_users,
          um_roles:    !!perms.um_roles,
          mm_vehicle:  !!perms.mm_vehicle,
        };
        localStorage.setItem(
          "menu_permissions",
          JSON.stringify(permissionsToStore)
        );
        
        // Dispatch custom event to notify sidebar
        window.dispatchEvent(new CustomEvent('permissionsUpdated', { 
          detail: permissionsToStore 
        }));
        
        console.log("Permissions stored in localStorage:", permissionsToStore);
      } else {
        // Fallback: store all-false so sidebar still works without crashing
        localStorage.setItem("menu_permissions", JSON.stringify(DEFAULT_PERMS));
        window.dispatchEvent(new CustomEvent('permissionsUpdated', { 
          detail: DEFAULT_PERMS 
        }));
      }
    } catch (error) {
      console.error("Error fetching permissions:", error);
      localStorage.setItem("menu_permissions", JSON.stringify(DEFAULT_PERMS));
      window.dispatchEvent(new CustomEvent('permissionsUpdated', { 
        detail: DEFAULT_PERMS 
      }));
    }
  };

  const handleLogin = async () => {
    setApiError("");
    setSuccess("");

    const fieldErrors = validate();
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setLoading(true);
    try {
      const { data } = await axios.post(`${API_BASE}/auth/login/`, {
        username,
        password,
      });

      localStorage.setItem("access_token",  data.access);
      localStorage.setItem("refresh_token", data.refresh);
      localStorage.setItem("user",          JSON.stringify(data.user));

      // ── Fetch and persist permissions right after login ──────────────────────
      await fetchAndStorePermissions(data.user.id, data.access);

      setSuccess(`Welcome back, ${data.user.full_name || data.user.username}!`);

      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 900);

    } catch (err) {
      const d = err.response?.data;
      const msg =
        d?.detail ||
        d?.non_field_errors?.[0] ||
        d?.username?.[0] ||
        d?.password?.[0] ||
        (typeof d === "string" ? d : null) ||
        (err.response?.status === 401 ? "Invalid username or password." : null) ||
        (err.response?.status === 400 ? "Invalid credentials. Please check your details." : null) ||
        "Login failed. Please try again.";
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <>
      <style>{styles}</style>
      <div className="login-root">
        <div className="login-card">

          {/* LEFT: login form */}
          <div className="login-right-form">
            <div className="form-inner">
              <div>
                <div className="logo-wrap">
                  <img src={brandLogo} alt="Flosh Innovations" className="brand-logo" />
                </div>
                
              </div>

              {apiError && <div className="api-error">{apiError}</div>}
              {success  && <div className="success-msg">{success}</div>}

              {/* Username */}
              <div className="field-group">
                <div className="field-label-row">
                  <label className="field-label">
                    Username<span className="required">*</span>
                  </label>
                </div>
                <div className="input-wrap">
                  <input
                    className={`field-input ${errors.username ? "error-border" : ""}`}
                    type="text"
                    placeholder="Enter Username"
                    value={username}
                    onKeyDown={handleKeyDown}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setErrors((p) => ({ ...p, username: "" }));
                      setApiError("");
                    }}
                  />
                </div>
                {errors.username && <p className="error-msg">{errors.username}</p>}
              </div>

              {/* Password */}
              <div className="field-group">
                <div className="field-label-row">
                  <label className="field-label">
                    Password<span className="required">*</span>
                  </label>
                </div>
                <div className="input-wrap">
                  <input
                    className={`field-input ${errors.password ? "error-border" : ""}`}
                    type={showPass ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    style={{ paddingRight: "48px" }}
                    onKeyDown={handleKeyDown}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrors((p) => ({ ...p, password: "" }));
                      setApiError("");
                    }}
                  />
                  <button
                    className="toggle-btn"
                    onClick={() => setShowPass((v) => !v)}
                    type="button"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeIcon /> : <EyeOffIcon />}
                  </button>
                </div>
                {errors.password && <p className="error-msg">{errors.password}</p>}
              </div>

              <button
                className="login-btn"
                onClick={handleLogin}
                disabled={loading}
              >
                {loading && <span className="spinner" />}
                {loading ? "Signing In…" : "Login"}
              </button>
            </div>
          </div>

          {/* RIGHT: illustration image */}
          <div className="login-left-img">
            <img
              src={loginBg}
              alt="Team brainstorming"
            />
          </div>

        </div>
      </div>
    </>
  );
}