import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login                     from "./Components/Login";
import Layout                    from "./Base_Templates/Layout";
import PaymentTable              from "./Components/collection_list";
import PaymentForm               from "./Components/collection";
import ImageCaptureLinkGenerator from "./Components/Image_link";
import VerifyPhone               from "./Components/Image_capture";
import OtpVerification           from "./Components/Otp_verification";
import ImageAdd                  from "./Components/Image_add";
import VerificationSuccess       from "./Components/verify_sucess";
import './App.css';

const getToken  = () => localStorage.getItem("access_token");
const clearAuth = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
};

function PrivateRoute({ children }) {
  return getToken() ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  return getToken() ? <Navigate to="/payments" replace /> : children;
}

function App() {
  return (
    <Router>
      <Routes>

        <Route
          path="/"
          element={
            getToken()
              ? <Navigate to="/payments" replace />
              : <Navigate to="/login"    replace />
          }
        />

        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

        {/* Step 1 — Phone verification */}
        <Route path="/image_capture/capture/:uuid" element={<VerifyPhone />} />

        {/* Step 2 — OTP verification */}
        <Route path="/image_capture/verify-otp/:uuid" element={<OtpVerification />} />

        {/* Step 3 — Image capture */}
        <Route path="/image_capture/add-image/:uuid" element={<ImageAdd />} />

        {/* Step 4 — Verification success */}
        <Route path="/image_capture/verification-success" element={<VerificationSuccess />} />

        <Route
          path="/"
          element={<PrivateRoute><Layout onLogout={clearAuth} /></PrivateRoute>}
        >
          <Route path="payments"      element={<PaymentTable />} />
          <Route path="payments/new"  element={<PaymentForm  />} />
          <Route path="image-capture" element={<ImageCaptureLinkGenerator />} />
          <Route index element={<Navigate to="/payments" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </Router>
  );
}

export default App;