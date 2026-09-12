export const API_BASE = (import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000").replace(/\/$/, "");

export const getDeviceToken = (): string => {
  let token = localStorage.getItem("SURAKH_DEVICE_TOKEN");
  if (!token) {
    // Default pre-seeded authorized workstation for the main machine
    token = "MHA-SECURE-STATION-DEV-001";
    localStorage.setItem("SURAKH_DEVICE_TOKEN", token);
  }
  return token;
};

export const setDeviceToken = (token: string) => {
  localStorage.setItem("SURAKH_DEVICE_TOKEN", token);
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem("SURAKH_AUTH_TOKEN");
};

export const setAuthToken = (token: string) => {
  localStorage.setItem("SURAKH_AUTH_TOKEN", token);
};

export const clearAuthToken = () => {
  localStorage.removeItem("SURAKH_AUTH_TOKEN");
};

const getHeaders = (isMultipart = false): HeadersInit => {
  const headers: Record<string, string> = {
    "X-Device-Token": getDeviceToken(),
  };
  if (!isMultipart) {
    headers["Content-Type"] = "application/json";
  }
  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  // Device & Terminal
  checkDeviceStatus: async (token: string) => {
    const res = await fetch(`${API_BASE}/api/auth/device-status`, {
      headers: { "X-Device-Token": token },
    });
    return res.json();
  },

  enrollDevice: async (payload: { device_id: string; asset_tag: string; assigned_station: string; assigned_role: string }) => {
    const res = await fetch(`${API_BASE}/api/auth/device-enroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // Auth 3FA
  loginStep1: async (badge_id: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/login-step1`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ badge_id, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail?.reason || "Authentication failed.");
    }
    return res.json();
  },

  loginStep2Face: async (payload: { temp_token: string; face_match_confidence: number; liveness_verified: boolean }) => {
    const res = await fetch(`${API_BASE}/api/auth/login-step2-face`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail?.reason || "Face verification failed.");
    }
    return res.json();
  },

  getMe: async () => {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Session expired.");
    return res.json();
  },

  logoutSession: async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: getHeaders(),
      });
    } catch {
      // ignore network errors during exit
    }
  },

  // Admin
  getUsers: async () => {
    const res = await fetch(`${API_BASE}/api/admin/users`, { headers: getHeaders() });
    return res.json();
  },

  createUser: async (formData: FormData) => {
    const headers: Record<string, string> = {
      "X-Device-Token": getDeviceToken(),
      "Authorization": `Bearer ${getAuthToken()}`,
    };
    const res = await fetch(`${API_BASE}/api/admin/users`, {
      method: "POST",
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "User creation failed.");
    }
    return res.json();
  },

  terminateUser: async (payload: { badge_id: string; reason: string; permanent_delete?: boolean }) => {
    const res = await fetch(`${API_BASE}/api/admin/users/terminate`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "User termination failed.");
    }
    return res.json();
  },

  getDevices: async () => {
    const res = await fetch(`${API_BASE}/api/admin/devices`, { headers: getHeaders() });
    return res.json();
  },

  revokeDevice: async (device_id: string, reason: string) => {
    const res = await fetch(`${API_BASE}/api/admin/devices/revoke`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ device_id, reason }),
    });
    return res.json();
  },

  getLocations: async () => {
    const res = await fetch(`${API_BASE}/api/admin/locations`);
    return res.json();
  },

  getAuditLogs: async () => {
    const res = await fetch(`${API_BASE}/api/admin/audit-logs`, { headers: getHeaders() });
    return res.json();
  },

  getSystemHealth: async () => {
    const res = await fetch(`${API_BASE}/api/admin/health`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch system health.");
    return res.json();
  },

  runTamperScan: async () => {
    const res = await fetch(`${API_BASE}/api/admin/tamper-watchdog/scan`, {
      method: "POST",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Tamper watchdog scan failed.");
    return res.json();
  },

  lookupHash: async (query_hash_or_id: string) => {
    const res = await fetch(`${API_BASE}/api/admin/verify-hash`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query_hash_or_id }),
    });
    return res.json();
  },

  // Cases (Jurisdiction Scoped)
  getCases: async () => {
    const res = await fetch(`${API_BASE}/api/cases`, { headers: getHeaders() });
    return res.json();
  },

  createCase: async (payload: { fir_number: string; title: string; incident_date: string; sensitivity_level: string }) => {
    const res = await fetch(`${API_BASE}/api/cases`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Case registration failed.");
    }
    return res.json();
  },

  getCaseDetails: async (caseId: string) => {
    const res = await fetch(`${API_BASE}/api/cases/${caseId}`, { headers: getHeaders() });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Access Denied.");
    }
    return res.json();
  },

  verifyCaseTamper: async (caseId: string) => {
    const res = await fetch(`${API_BASE}/api/cases/${caseId}/verify-tamper`, { headers: getHeaders() });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Tamper audit failed.");
    }
    return res.json();
  },

  // Documents & Cryptographic Vault
  uploadDocument: async (formData: FormData) => {
    const headers: Record<string, string> = {
      "X-Device-Token": getDeviceToken(),
      "Authorization": `Bearer ${getAuthToken()}`,
    };
    const res = await fetch(`${API_BASE}/api/documents/upload`, {
      method: "POST",
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Document upload failed.");
    }
    return res.json();
  },

  viewDocument: async (docId: string) => {
    const res = await fetch(`${API_BASE}/api/documents/${docId}/view`, { headers: getHeaders() });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to decrypt document.");
    }
    return res.json();
  },

  verifyDocument: async (docId: string) => {
    const res = await fetch(`${API_BASE}/api/documents/${docId}/verify`, { headers: getHeaders() });
    return res.json();
  },

  tamperSimulate: async (docId: string) => {
    const res = await fetch(`${API_BASE}/api/documents/${docId}/tamper-simulate`, {
      method: "POST",
      headers: getHeaders(),
    });
    return res.json();
  },

  getBsaCertificate: async (docId: string) => {
    const res = await fetch(`${API_BASE}/api/documents/${docId}/certificate`, { headers: getHeaders() });
    return res.json();
  },

  // Targeted Sharing
  grantSharing: async (payload: { case_id: string; document_id?: string; recipient_dept: string; permission: string; validity_days: number }) => {
    const res = await fetch(`${API_BASE}/api/sharing/grant`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Targeted sharing failed.");
    }
    return res.json();
  },

  getInboundShares: async () => {
    const res = await fetch(`${API_BASE}/api/sharing/inbound`, { headers: getHeaders() });
    return res.json();
  },

  // Sovereign Consortium Blockchain
  getLedgerBlocks: async () => {
    const res = await fetch(`${API_BASE}/api/ledger/blocks`);
    return res.json();
  },

  getLedgerStats: async () => {
    const res = await fetch(`${API_BASE}/api/ledger/stats`);
    return res.json();
  },
};
