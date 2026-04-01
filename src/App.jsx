import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./Components/Login";
import Layout from "./Base_Templates/Layout";
import PaymentTable from "./Components/collection_list";
import PaymentForm  from "./Components/collection";
import './App.css';

// ── Token helpers ─────────────────────────────────────────────
const getToken  = () => localStorage.getItem("access_token");
const clearAuth = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
};

// ── Route Guards ──────────────────────────────────────────────

/** Redirect to /login if not authenticated */
function PrivateRoute({ children }) {
  return getToken() ? children : <Navigate to="/login" replace />;
}

/** Redirect authenticated users away from /login */
function PublicRoute({ children }) {
  return getToken() ? <Navigate to="/payments" replace /> : children;
}

// ── App ───────────────────────────────────────────────────────
function App() {
  return (
    <Router>
      <Routes>

        {/* ── Root redirect ── */}
        <Route
          path="/"
          element={
            getToken()
              ? <Navigate to="/payments" replace />
              : <Navigate to="/login"    replace />
          }
        />

        {/* ── Public ── */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        {/* ── Protected — nested inside Layout ── */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout onLogout={clearAuth} />
            </PrivateRoute>
          }
        >
          {/* /payments → Payment List Table */}
          <Route path="payments"        element={<PaymentTable />} />

          {/* /payments/new → Standalone Payment Form (optional direct URL) */}
          <Route path="payments/new"    element={<PaymentForm  />} />

          {/* Default protected fallback */}
          <Route index element={<Navigate to="/payments" replace />} />
        </Route>

        {/* ── 404 fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </Router>
  );
}

export default App;