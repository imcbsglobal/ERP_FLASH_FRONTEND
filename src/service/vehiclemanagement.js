/**
 * vehiclemanagement.js
 *
 * API service layer for the Vehicle Management module.
 * Connects:
 *   - Travel_Trip.jsx  → fetchTrips, deleteTrip, fetchTripById
 *   - Start_trip.jsx   → startTrip
 *   - End_trip.jsx     → endTrip
 *
 * Base URL  : /api/trips/
 * Auth      : Bearer token from localStorage (same pattern as vehiclemaster)
 * File uploads: handled via FormData (multipart/form-data)
 */

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem('refresh_token');
        const { data } = await axios.post(`${BASE_URL}/api/auth/token/refresh/`, {
          refresh,
        });
        localStorage.setItem('access_token', data.access);
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

function normaliseTrip(raw) {
  return {
    id:                  raw.id,
    vehicle:             raw.vehicle_name        ?? '',
    traveledBy:          raw.traveled_by         ?? '',
    purpose:             raw.purpose_of_trip     ?? '',
    date:                raw.date                ?? '',
    startTime:           raw.start_time          ?? '',
    endTime:             raw.end_time            ?? '',
    odoStart:            parseFloat(raw.odometer_start)   || 0,
    odoEnd:              parseFloat(raw.odometer_end)     || 0,
    // FIX: distance_covered comes from the backend after end trip;
    // fall back to 0 while the trip is ongoing.
    distance:            parseFloat(raw.distance_covered) || 0,
    fuel:                parseFloat(raw.fuel_cost)        || 0,
    cost:                parseFloat(raw.fuel_cost)        || 0,
    startImg:            raw.start_img_url       ?? null,
    endImg:              raw.end_img_url         ?? null,
    status:              raw.status              ?? 'ongoing',
    vehicle_name:        raw.vehicle_name        ?? '',
    registration_number: raw.registration_number ?? '',
    odometer_start:      parseFloat(raw.odometer_start)  || null,
    maintenanceCost:     parseFloat(raw.maintenance_cost) || 0,
    services:            raw.services_list       ?? [],
  };
}

export async function fetchTrips(params = {}) {
  try {
    const response = await api.get('/api/trips/', { params });
    const raw = Array.isArray(response.data)
      ? response.data
      : (response.data.results ?? []);
    return raw.map(normaliseTrip);
  } catch (error) {
    throw _handleError(error, 'Failed to fetch trips');
  }
}

export async function fetchTripById(id) {
  try {
    const response = await api.get(`/api/trips/${id}/`);
    return normaliseTrip(response.data);
  } catch (error) {
    throw _handleError(error, `Failed to fetch trip #${id}`);
  }
}

export async function fetchOngoingTrips() {
  try {
    const response = await api.get('/api/trips/ongoing/');
    const raw = Array.isArray(response.data)
      ? response.data
      : (response.data.results ?? []);
    return raw.map(normaliseTrip);
  } catch (error) {
    throw _handleError(error, 'Failed to fetch ongoing trips');
  }
}

export async function startTrip(tripData) {
  try {
    const fd = new FormData();

    fd.append('vehicle_name',        tripData.vehicle_name        ?? '');
    fd.append('registration_number', tripData.registration_number ?? '');
    fd.append('date',                tripData.date);
    fd.append('time',                tripData.time);
    fd.append('purpose_of_trip',     tripData.purpose_of_trip);

    // FIX 1: send traveled_by so the backend saves the driver's name
    if (tripData.traveled_by != null && tripData.traveled_by !== '') {
      fd.append('traveled_by', tripData.traveled_by);
    }

    // FIX 2: send odometer_start so distance_covered can be computed on end
    if (tripData.odometer_start != null) {
      fd.append('odometer_start', tripData.odometer_start);
    }

    if (tripData.maintenance_cost != null) {
      fd.append('maintenance_cost', tripData.maintenance_cost);
    }

    const services = Array.isArray(tripData.services) ? tripData.services : [];
    services.forEach((s) => fd.append('services', s));

    if (tripData.odometer_image instanceof File) {
      fd.append('odometer_image', tripData.odometer_image);
    }

    const response = await api.post('/api/trips/', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return normaliseTrip(response.data);
  } catch (error) {
    throw _handleError(error, 'Failed to start trip');
  }
}

export async function endTrip(id, endData) {
  try {
    const fd = new FormData();

    fd.append('end_time',     endData.end_time);
    fd.append('odometer_end', endData.odometer_end);
    if (endData.fuel_cost != null) {
      fd.append('fuel_cost',  endData.fuel_cost);
    }
    if (endData.odometer_image instanceof File) {
      fd.append('odometer_image', endData.odometer_image);
    }

    const response = await api.patch(`/api/trips/${id}/end/`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return normaliseTrip(response.data);
  } catch (error) {
    throw _handleError(error, `Failed to end trip #${id}`);
  }
}

export async function updateTrip(id, fields) {
  try {
    const response = await api.patch(`/api/trips/${id}/`, fields);
    return normaliseTrip(response.data);
  } catch (error) {
    throw _handleError(error, `Failed to update trip #${id}`);
  }
}

export async function deleteTrip(id) {
  try {
    await api.delete(`/api/trips/${id}/`);
  } catch (error) {
    throw _handleError(error, `Failed to delete trip #${id}`);
  }
}

function _handleError(error, fallback) {
  if (error.response) {
    const data = error.response.data;
    if (typeof data === 'string') return new Error(data);
    if (data?.detail) return new Error(data.detail);
    if (typeof data === 'object') {
      const messages = Object.entries(data)
        .map(([field, msgs]) => {
          const text = Array.isArray(msgs) ? msgs.join(', ') : String(msgs);
          return `${field}: ${text}`;
        })
        .join(' | ');
      return new Error(messages || fallback);
    }
  }
  if (error.request) return new Error('No response from server. Check your connection.');
  return new Error(error.message || fallback);
}