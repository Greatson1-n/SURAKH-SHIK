import React, { useState, useEffect } from "react";
import { Lock, Camera, AlertTriangle, RefreshCw } from "lucide-react";
import { api, getDeviceToken, getAuthToken, setAuthToken, clearAuthToken } from "./services/api";
import { Header } from "./components/Header";
import { DeviceGateModal } from "./components/DeviceGateModal";
import { FaceAuthModal } from "./components/FaceAuthModal";
import { AdminDashboard } from "./pages/AdminDashboard";
import { OfficerDashboard } from "./pages/OfficerDashboard";
import { ForensicAndJudicialDashboard } from "./pages/ForensicAndJudicialDashboard";

export const App: React.FC = () => {
  const [deviceToken, setDeviceTokenState] = useState<string>(getDeviceToken());
  const [isDeviceAuthorized, setIsDeviceAuthorized] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Login Form States
  const [badgeId, setBadgeId] = useState("ADM-IT-SURAKH");
  const [password, setPassword] = useState("A0M-1T-SRKSK");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState<boolean>(false);

  // 2FA Face Biometrics State
  const [face2faData, setFace2faData] = useState<{
    tempToken: string;
    badgeId: string;
    fullName: string;
    role: string;
    photoUrl: string;
  } | null>(null);

  // Initial check: Device verification + Active Session verification
  const checkInitialState = async () => {
    setLoading(true);
    try {
      // 1. Check Hardware Device Binding
      const devRes = await api.checkDeviceStatus(deviceToken);
      setIsDeviceAuthorized(devRes.authorized);

      // 2. If token exists and device is valid, fetch user
      const token = getAuthToken();
      if (token && devRes.authorized) {
        try {
          const u = await api.getMe();
          setUser(u);
        } catch {
          clearAuthToken();
          setUser(null);
        }
      }
    } catch (err) {
      console.error("Initial load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkInitialState();
  }, [deviceToken]);

  const handleDeviceUpdated = (newToken: string) => {
    setDeviceTokenState(newToken);
  };

  // Step 1: Submit Credentials
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      const res = await api.loginStep1(badgeId, password);
      if (res.status === "NEED_FACE_2FA") {
        setFace2faData({
          tempToken: res.temp_token,
          badgeId: res.badge_id,
          fullName: res.full_name,
          role: res.role,
          photoUrl: res.photo_url,
        });
      }
    } catch (err: any) {
      setLoginError(err.message || "Invalid Departmental ID or Password.");
    } finally {
      setLoginLoading(false);
    }
  };

  // Step 2: 2FA Face Verification Success
  const handleFaceSuccess = (authData: any) => {
    setAuthToken(authData.access_token);
    setUser(authData.user);
    setFace2faData(null);
  };

  const handleLogout = () => {
    clearAuthToken();
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg-darkest)" }}>
        <RefreshCw className="animate-spin" size={36} color="#38bdf8" style={{ marginBottom: "16px" }} />
        <h2 style={{ fontSize: "1.1rem", color: "#f8fafc" }}>SURAKH-SHIK (सुरक्षा-साक्ष्य)</h2>
        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Verifying hardware cryptographic bindings...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top Institutional Header */}
      <Header 
        user={user} 
        deviceToken={deviceToken} 
        onLogout={handleLogout} 
      />

      {/* Main Area */}
      <main style={{ flex: 1 }}>
        {/* If User is NOT authenticated, display Login Portal */}
        {!user ? (
          <div style={{
            maxWidth: "460px",
            margin: "50px auto",
            padding: "0 20px"
          }}>
            <div className="gov-card" style={{ borderTop: "4px solid #2563eb", padding: "32px 28px" }}>
              {/* Emblem & Portal Title */}
              <div style={{ textAlign: "center", marginBottom: "24px" }}>
                <img 
                  src="/surakh_shik_logo.svg" 
                  alt="SURAKH-SHIK Official Emblem" 
                  style={{ 
                    width: "72px", 
                    height: "72px", 
                    margin: "0 auto 12px",
                    borderRadius: "50%",
                    boxShadow: "0 0 24px rgba(234, 179, 8, 0.4)",
                    display: "block"
                  }} 
                />
                <h2 style={{ fontSize: "1.4rem", color: "#f8fafc", fontWeight: 800, letterSpacing: "0.02em" }}>
                  SURAKH-SHIK (सुरक्षा-साक्ष्य)
                </h2>
                <p style={{ fontSize: "0.84rem", color: "#93c5fd", marginTop: "2px", fontWeight: 600 }}>
                  National Secure Case &amp; Evidence Portal
                </p>
                <p style={{ fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                  Ministry of Home Affairs &bull; National Crime Records Bureau &bull; PS 26190
                </p>
                <div style={{ display: "inline-block", marginTop: "10px" }}>
                  <span className="gov-badge badge-blue">
                    Triple-Factor Authentication (3FA)
                  </span>
                </div>
              </div>

              {loginError && (
                <div style={{
                  padding: "10px 14px",
                  borderRadius: "var(--radius-md)",
                  marginBottom: "16px",
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  color: "#fca5a5",
                  fontSize: "0.82rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  <AlertTriangle size={16} />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit}>
                <div style={{ marginBottom: "16px" }}>
                  <label className="gov-label">Departmental / Badge ID</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      className="gov-input mono"
                      placeholder="e.g. ADM-IT-SURAKH"
                      value={badgeId}
                      onChange={(e) => setBadgeId(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label className="gov-label">Authorized Password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="password"
                      className="gov-input"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{
                  background: "#061120",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "10px 14px",
                  marginBottom: "20px",
                  fontSize: "0.76rem",
                  color: "var(--text-secondary)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#38bdf8", fontWeight: 700, marginBottom: "2px" }}>
                    <Camera size={14} /> Stage 2: Face Biometrics Required
                  </div>
                  Credentials will be verified against the departmental record, followed by live webcam biometric matching.
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: "100%", padding: "12px" }}
                  disabled={loginLoading}
                >
                  {loginLoading ? (
                    <>
                      <RefreshCw className="animate-spin" size={16} />
                      Authenticating Credentials...
                    </>
                  ) : (
                    <>
                      <Lock size={16} />
                      Proceed to Face 2FA
                    </>
                  )}
                </button>
              </form>

              <div style={{
                marginTop: "24px",
                paddingTop: "16px",
                borderTop: "1px solid var(--border-subtle)",
                textAlign: "center",
                fontSize: "0.74rem",
                color: "var(--text-muted)",
                lineHeight: 1.5
              }}>
                <strong>Notice:</strong> Unauthorized access attempts are actively monitored under Section 66 of the Information Technology Act. 
                Zero public registration. Accounts provisioned exclusively by IT Administration.
              </div>
            </div>
          </div>
        ) : (
          /* If User IS authenticated, render the Adaptive Dashboard based on Role! */
          <div>
            {user.role === "SYSTEM_ADMIN" && <AdminDashboard />}
            
            {(user.role === "INVESTIGATING_OFFICER" || user.role === "STATION_HOUSE_OFFICER") && (
              <OfficerDashboard user={user} />
            )}

            {(user.role === "FORENSIC_ANALYST" || user.role === "JUDICIAL_MAGISTRATE" || user.role === "PUBLIC_PROSECUTOR") && (
              <ForensicAndJudicialDashboard user={user} />
            )}
          </div>
        )}
      </main>

      {/* Device Hardware Binding Modal (Handles Unauthorized Laptop Detection & Switcher) */}
      <DeviceGateModal 
        deviceToken={deviceToken}
        isAuthorized={isDeviceAuthorized}
        onDeviceUpdated={handleDeviceUpdated}
      />

      {/* Mandatory Face 2FA Modal */}
      {face2faData && (
        <FaceAuthModal
          tempToken={face2faData.tempToken}
          badgeId={face2faData.badgeId}
          fullName={face2faData.fullName}
          role={face2faData.role}
          photoUrl={face2faData.photoUrl}
          onSuccess={handleFaceSuccess}
          onCancel={() => setFace2faData(null)}
        />
      )}
    </div>
  );
};

export default App;
