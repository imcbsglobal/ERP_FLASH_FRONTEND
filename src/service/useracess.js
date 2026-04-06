// src/service/useracess.js
// Called by user_acess.jsx → handleSave()
// PATCH /api/users/<userId>/permissions/
// Payload: { dashboard, col_reports, vm_trips, vm_service, um_users, um_roles, mm_vehicle }

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

/**
 * Save menu permissions for a single user.
 * @param {number} userId  - login.User PK
 * @param {object} perms   - { dashboard, col_reports, vm_trips, vm_service, um_users, um_roles, mm_vehicle }
 */
export async function saveUserPermissions(userId, perms) {
  const token = localStorage.getItem("access_token");

  const payload = {
    dashboard:   !!perms.dashboard,
    col_reports: !!perms.col_reports,
    vm_trips:    !!perms.vm_trips,
    vm_service:  !!perms.vm_service,
    um_users:    !!perms.um_users,
    um_roles:    !!perms.um_roles,
    mm_vehicle:  !!perms.mm_vehicle,
  };

  console.log(`Saving permissions for user ${userId}:`, payload);

  const res = await fetch(`${API_BASE}/users/${userId}/permissions/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let errBody;
    try { 
      errBody = await res.json(); 
      console.error("Error response from server:", errBody);
    } catch { 
      errBody = { error: res.statusText }; 
    }
    
    const errorMessage = errBody?.error || 
                        errBody?.detail || 
                        (typeof errBody === 'object' ? JSON.stringify(errBody) : errBody) ||
                        "Failed to save permissions.";
    
    const err = new Error(errorMessage);
    err.detail = errBody;
    err.status = res.status;
    throw err;
  }

  const responseData = await res.json();
  console.log(`Successfully saved permissions for user ${userId}:`, responseData);
  return responseData;
}

/**
 * Bulk save permissions for multiple users
 * @param {Array} permissionsList - Array of { user_id, dashboard, col_reports, vm_trips, vm_service, um_users, um_roles, mm_vehicle }
 */
export async function bulkSaveUserPermissions(permissionsList) {
  const token = localStorage.getItem("access_token");

  const payload = {
    permissions: permissionsList.map(item => ({
      user_id:     item.user_id,
      dashboard:   !!item.dashboard,
      col_reports: !!item.col_reports,
      vm_trips:    !!item.vm_trips,
      vm_service:  !!item.vm_service,
      um_users:    !!item.um_users,
      um_roles:    !!item.um_roles,
      mm_vehicle:  !!item.mm_vehicle,
    }))
  };

  console.log("Bulk saving permissions:", payload);

  const res = await fetch(`${API_BASE}/users/permissions/bulk/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let errBody;
    try { 
      errBody = await res.json(); 
      console.error("Bulk save error response:", errBody);
    } catch { 
      errBody = { error: res.statusText }; 
    }
    
    const errorMessage = errBody?.detail || errBody?.error || "Failed to bulk save permissions.";
    const err = new Error(errorMessage);
    err.detail = errBody;
    err.status = res.status;
    throw err;
  }

  const responseData = await res.json();
  console.log("Bulk save response:", responseData);
  return responseData;
}