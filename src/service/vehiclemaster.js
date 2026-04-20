// src/service/vehiclemaster.js

// ── Base URL ──────────────────────────────────────────────────────────────────
const BASE_URL = "http://127.0.0.1:8000/api";

// ── Media URL helper ──────────────────────────────────────────────────────────
export const resolveMediaUrl = (url) => {
  if (!url) return null;
  try {
    const backendOrigin = new URL(BASE_URL).origin;
    const parsed        = new URL(url);
    if (
      parsed.origin === backendOrigin ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "localhost"
    ) {
      parsed.protocol = new URL(BASE_URL).protocol;
      parsed.hostname = new URL(BASE_URL).hostname;
      parsed.port     = new URL(BASE_URL).port;
      return parsed.toString();
    }
    return url;
  } catch {
    return url;
  }
};

// ── Helper: build headers with auth token ────────────────────────────────────
const authHeaders = (isMultipart = false) => {
  const headers = {
    Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
  };
  if (!isMultipart) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
};

// ── Helper: refresh access token ─────────────────────────────────────────────
const refreshAccessToken = async () => {
  const refresh = localStorage.getItem("refresh_token");
  if (!refresh) throw new Error("No refresh token");

  const res = await fetch(`${BASE_URL}/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  if (!res.ok) throw new Error("Refresh failed");
  const data = await res.json();
  localStorage.setItem("access_token", data.access);
  return data.access;
};

// ── Helper: handle response (with auto-refresh on 401) ───────────────────────
const handleResponse = async (res, retryFn) => {
  if (res.status === 401 && retryFn) {
    try {
      await refreshAccessToken();
      const retryRes = await retryFn();
      return handleResponse(retryRes, null);
    } catch {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      window.location.href = "/login";
      return;
    }
  }

  if (!res.ok) {
    let errBody = {};
    try { errBody = await res.json(); } catch { /* non-JSON body */ }

    const error = new Error(
      errBody.detail || errBody.message || `Request failed (${res.status})`
    );
    error._status = res.status;
    error.data = errBody;
    throw error;
  }

  if (res.status === 204) return null;
  return res.json();
};

// ── Helper: map camelCase frontend fields → snake_case backend ────────────────
const toSnakeCase = (data) => {
  const map = {
    vehicleName:          "vehicle_name",
    companyBrand:         "company_brand",
    registrationNumber:   "registration_number",
    vehicleType:          "vehicle_type",
    fuelType:             "fuel_type",
    vehiclePhoto:         "vehicle_photo",
    ownerName:            "owner_name",
    insuranceNo:          "insurance_no",
    insuranceExpiredDate: "insurance_expired_date",
    pollutionExpiredDate: "pollution_expired_date",
    lastServiceDate:      "last_service_date",
    nextServiceDate:      "next_service_date",
    currentOdometer:      "current_odometer",
    chassisNumber:        "chassis_number",
    engineNumber:         "engine_number",
    status:               "status",               // ✅ FIX: explicitly mapped
  };
  const result = {};
  for (const [key, value] of Object.entries(data)) {
    result[map[key] || key] = value;
  }
  return result;
};

// ── Helper: flatten nested Add-form state into a flat object ──────────────────
const flattenFormState = ({ basicInfo, ownershipInsurance, maintenance, technical, additionalDetails }) => ({
  vehicleName:          basicInfo.vehicleName,
  companyBrand:         basicInfo.companyBrand,
  registrationNumber:   basicInfo.registrationNumber,
  vehicleType:          basicInfo.vehicleType,
  ownership:            basicInfo.ownership,
  fuelType:             basicInfo.fuelType,
  vehiclePhoto:         basicInfo.vehiclePhoto,
  ownerName:            ownershipInsurance.ownerName,
  insuranceNo:          ownershipInsurance.insuranceNo,
  insuranceExpiredDate: ownershipInsurance.insuranceExpiredDate,
  pollutionExpiredDate: ownershipInsurance.pollutionExpiredDate,
  lastServiceDate:      maintenance.lastServiceDate,
  nextServiceDate:      maintenance.nextServiceDate,
  currentOdometer:      maintenance.currentOdometer,
  chassisNumber:        technical.chassisNumber,
  engineNumber:         technical.engineNumber,
  note:                 additionalDetails.note,
  status:               additionalDetails.status,  // ✅ FIX: was missing — status never reached the API
});

// ── Helper: build FormData from flat data (handles photo upload) ──────────────
const buildFormData = (flat) => {
  const snake = toSnakeCase(flat);
  const fd = new FormData();
  for (const [key, value] of Object.entries(snake)) {
    if (key === "vehicle_photo") {
      if (value instanceof File) fd.append("vehicle_photo", value);
    } else if (value !== null && value !== undefined && value !== "") {
      fd.append(key, value);
    }
  }
  return fd;
};

// ════════════════════════════════════════════════════════════════════════════
//  VEHICLE MASTER APIs
// ════════════════════════════════════════════════════════════════════════════

export const getVehicles = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.search)                                              query.set("search",       params.search);
  if (params.status       && params.status !== "All")             query.set("status",       params.status);
  if (params.vehicle_type && params.vehicle_type !== "All Types") query.set("vehicle_type", params.vehicle_type);
  if (params.ownership)                                           query.set("ownership",    params.ownership);
  if (params.fuel_type)                                           query.set("fuel_type",    params.fuel_type);
  if (params.ordering)                                            query.set("ordering",     params.ordering);
  if (params.page)                                                query.set("page",         params.page);

  const url = `${BASE_URL}/vehicles/${query.toString() ? `?${query.toString()}` : ""}`;
  const doFetch = () => fetch(url, { method: "GET", headers: authHeaders() });
  return handleResponse(await doFetch(), doFetch);
};

export const getVehicleById = async (id) => {
  const doFetch = () =>
    fetch(`${BASE_URL}/vehicles/${id}/`, { method: "GET", headers: authHeaders() });
  return handleResponse(await doFetch(), doFetch);
};

export const createVehicle = async (formState) => {
  const fd = buildFormData(flattenFormState(formState));
  const doFetch = () =>
    fetch(`${BASE_URL}/vehicles/`, {
      method:  "POST",
      headers: authHeaders(true),
      body:    fd,
    });
  return handleResponse(await doFetch(), doFetch);
};

export const updateVehicle = async (id, formState) => {
  const fd = buildFormData(flattenFormState(formState));
  const doFetch = () =>
    fetch(`${BASE_URL}/vehicles/${id}/`, {
      method:  "PATCH",
      headers: authHeaders(true),
      body:    fd,
    });
  return handleResponse(await doFetch(), doFetch);
};

export const deleteVehicle = async (id) => {
  const doFetch = () =>
    fetch(`${BASE_URL}/vehicles/${id}/`, { method: "DELETE", headers: authHeaders() });
  return handleResponse(await doFetch(), doFetch);
};

export const updateOdometer = async (id, newOdometer) => {
  const doFetch = () =>
    fetch(`${BASE_URL}/vehicles/${id}/update_odometer/`, {
      method:  "POST",
      headers: authHeaders(),
      body:    JSON.stringify({ current_odometer: newOdometer }),
    });
  return handleResponse(await doFetch(), doFetch);
};

export const updateVehicleStatus = async (id, newStatus) => {
  const doFetch = () =>
    fetch(`${BASE_URL}/vehicles/${id}/update_status/`, {
      method:  "POST",
      headers: authHeaders(),
      body:    JSON.stringify({ status: newStatus }),
    });
  return handleResponse(await doFetch(), doFetch);
};

export const getExpiringInsurance = async () => {
  const doFetch = () =>
    fetch(`${BASE_URL}/vehicles/expiring_insurance/`, { method: "GET", headers: authHeaders() });
  return handleResponse(await doFetch(), doFetch);
};

export const getExpiringPollution = async () => {
  const doFetch = () =>
    fetch(`${BASE_URL}/vehicles/expiring_pollution/`, { method: "GET", headers: authHeaders() });
  return handleResponse(await doFetch(), doFetch);
};

export const getServiceDue = async () => {
  const doFetch = () =>
    fetch(`${BASE_URL}/vehicles/service_due/`, { method: "GET", headers: authHeaders() });
  return handleResponse(await doFetch(), doFetch);
};

export const getVehicleTripHistory = async (id) => {
  const doFetch = () =>
    fetch(`${BASE_URL}/vehicles/${id}/trip_history/`, { method: "GET", headers: authHeaders() });
  return handleResponse(await doFetch(), doFetch);
};