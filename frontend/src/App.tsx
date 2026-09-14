import React, { useState, useEffect, useRef } from "react";
import { Lock, Camera, AlertTriangle, RefreshCw, Clock } from "lucide-react";
import { api, getDeviceToken, getAuthToken, setAuthToken, clearAuthToken } from "./services/api";
import { Header } from "./components/Header";
import { DeviceGateModal } from "./components/DeviceGateModal";
import { FaceAuthModal } from "./components/FaceAuthModal";
import { AdminDashboard } from "./pages/AdminDashboard";
import { OfficerDashboard } from "./pages/OfficerDashboard";
import { ForensicAndJudicialDashboard } from "./pages/ForensicAndJudicialDashboard";

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_BEFORE_TIMEOUT_MS = 60 * 1000;   // 60 seconds warning (at 14 mins)

export const App: React.FC = () => {
  const [deviceToken, setDeviceTokenState] = useState<string>(getDeviceToken());
  const [isDeviceAuthorized, setIsDeviceAuthorized] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Login Form States (Blank by default for zero-trust security)
  const [badgeId, setBadgeId] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState<boolean>(false);

  // Inactivity Auto-Logout States
  const [inactivityNotice, setInactivityNotice] = useState<string | null>(null);
  const [warningSeconds, setWarningSeconds] = useState<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // 2FA Face Biometrics State
  const [face2faData, setFace2faData] = useState<{
    tempToken: string;
    badgeId: string;
    fullName: string;
    role: string;
    photoUrl: string;
    isEnrolled?: boolean;
  } | null>(null);

  // Initial check: Device verification + Active Session verification
  const checkInitialState = async () => {
    setLoading(true);
    try {
      // 1. Check Hardware Device Binding
      const devRes = await api.checkDeviceStatus(deviceToken);
      setIsDeviceAuthorized(devRes.authorized);

      // 2. Pre-Login Cloud Cold-Restart Auto-Reconcile
      try {
        const savedRaw = localStorage.getItem("SURAKH_SAVED_OFFICERS");
        if (savedRaw) {
          const savedOfficers = JSON.parse(savedRaw);
          if (Array.isArray(savedOfficers) && savedOfficers.length > 0) {
            await api.reconcileUsers(savedOfficers);
          }
        }
      } catch (recErr) {
        console.warn("Pre-login auto-reconciliation note:", recErr);
      }

      // 3. If token exists and device is valid, fetch user
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

  // 15-Minute Inactivity Session Watchdog
  const resetActivityTimer = () => {
    lastActivityRef.current = Date.now();
    if (warningSeconds !== null) {
      setWarningSeconds(null);
    }
  };

  useEffect(() => {
    if (!user) return;

    lastActivityRef.current = Date.now();

    const activityEvents = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    const onUserInteraction = () => resetActivityTimer();

    activityEvents.forEach((ev) => window.addEventListener(ev, onUserInteraction, { passive: true }));

    const timerInterval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        // Force Auto-Logout
        clearInterval(timerInterval);
        setWarningSeconds(null);
        api.logoutSession();
        clearAuthToken();
        setUser(null);
        setInactivityNotice(
          "SESSION EXPIRED: You were automatically logged out due to 15 minutes of inactivity in compliance with National Cyber Security Standards (RAM keys zeroized)."
        );
      } else if (elapsed >= INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_TIMEOUT_MS) {
        // Show 60-Second Warning Banner
        const remainingSec = Math.max(1, Math.ceil((INACTIVITY_TIMEOUT_MS - elapsed) / 1000));
        setWarningSeconds(remainingSec);
      } else {
        if (warningSeconds !== null) setWarningSeconds(null);
      }
    }, 1000);

    return () => {
      activityEvents.forEach((ev) => window.removeEventListener(ev, onUserInteraction));
      clearInterval(timerInterval);
    };
  }, [user, warningSeconds]);

  const handleDeviceUpdated = (newToken: string) => {
    setDeviceTokenState(newToken);
  };

  // Step 1: Submit Credentials with Auto-Recovery
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    setInactivityNotice(null);

    const cleanBadge = badgeId.trim();

    try {
      let res;
      try {
        res = await api.loginStep1(cleanBadge, password);
      } catch (firstAttemptErr: any) {
        // Cold-Restart Recovery: If login failed, check if account exists in browser backup
        const savedRaw = localStorage.getItem("SURAKH_SAVED_OFFICERS");
        if (savedRaw) {
          try {
            const list = JSON.parse(savedRaw);
            const found = list.find((x: any) => x.badge_id?.toLowerCase() === cleanBadge.toLowerCase());
            if (found) {
              await api.reconcileUsers([found]);
              // Retry login after on-the-fly reconciliation
              res = await api.loginStep1(cleanBadge, password);
            } else {
              throw firstAttemptErr;
            }
          } catch {
            throw firstAttemptErr;
          }
        } else {
          throw firstAttemptErr;
        }
      }

      if (res.status === "NEED_FACE_2FA" || res.status === "NEED_FACE_ENROLLMENT") {
        setFace2faData({
          tempToken: res.temp_token,
          badgeId: res.badge_id,
          fullName: res.full_name,
          role: res.role,
          photoUrl: res.photo_url,
          isEnrolled: res.is_enrolled,
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
    lastActivityRef.current = Date.now();
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

              {/* Inactivity Notice Banner */}
              {inactivityNotice && (
                <div style={{
                  padding: "12px 16px",
                  borderRadius: "var(--radius-md)",
                  marginBottom: "16px",
                  background: "rgba(245, 158, 11, 0.15)",
                  border: "1px solid rgba(245, 158, 11, 0.4)",
                  color: "#fde68a",
                  fontSize: "0.82rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px"
                }}>
                  <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
                  <span>{inactivityNotice}</span>
                </div>
              )}

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
                  <label className="gov-label">Assigned Username / Departmental ID</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      className="gov-input mono"
                      placeholder="Write your assigned username"
                      value={badgeId}
                      onChange={(e) => setBadgeId(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label className="gov-label">Assigned Password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="password"
                      className="gov-input"
                      placeholder="Fill your assigned password"
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

      {/* 60-Second Inactivity Warning Modal */}
      {warningSeconds !== null && (
        <div className="modal-backdrop" style={{ zIndex: 99999 }}>
          <div className="modal-content" style={{ maxWidth: "440px", textAlign: "center", borderTop: "4px solid #f59e0b" }}>
            <div style={{ padding: "28px 24px" }}>
              <Clock size={48} color="#f59e0b" style={{ margin: "0 auto 12px", display: "block" }} />
              <h3 style={{ fontSize: "1.2rem", color: "#f8fafc", fontWeight: 700, marginBottom: "8px" }}>
                Inactivity Lockout Warning
              </h3>
              <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)", marginBottom: "16px", lineHeight: 1.5 }}>
                Your workstation has been idle. In accordance with zero-trust cyber protocols, your active session will terminate and RAM encryption keys will be zeroized in:
              </p>
              <div className="mono" style={{ fontSize: "2.4rem", color: "#f59e0b", fontWeight: 800, marginBottom: "24px" }}>
                00:{warningSeconds < 10 ? `0${warningSeconds}` : warningSeconds}
              </div>
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: "100%", padding: "12px", fontSize: "0.95rem" }}
                onClick={resetActivityTimer}
              >
                I Am Still Working (Keep Session Active)
              </button>
            </div>
          </div>
        </div>
      )}

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
          isEnrolled={face2faData.isEnrolled}
          onSuccess={handleFaceSuccess}
          onCancel={() => setFace2faData(null)}
        />
      )}
    </div>
  );
};

export default App;
