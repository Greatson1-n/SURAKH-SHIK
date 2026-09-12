import React, { useState } from "react";
import { AlertTriangle, ShieldCheck, Key, RefreshCw } from "lucide-react";
import { api, setDeviceToken } from "../services/api";

interface DeviceGateModalProps {
  deviceToken: string;
  isAuthorized: boolean;
  onDeviceUpdated: (newToken: string) => void;
}

export const DeviceGateModal: React.FC<DeviceGateModalProps> = ({ deviceToken, isAuthorized, onDeviceUpdated }) => {
  const [showEnroll, setShowEnroll] = useState(false);
  const [assetTag, setAssetTag] = useState("MHA-SECURE-DELL-5420-FIELD");
  const [station, setStation] = useState("City Police Station (Manipur)");
  const role = "INVESTIGATING_OFFICER";
  const [customToken, setCustomToken] = useState(deviceToken);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      const generatedToken = customToken || `DEV-${Date.now()}`;
      await api.enrollDevice({
        device_id: generatedToken,
        asset_tag: assetTag,
        assigned_station: station,
        assigned_role: role,
      });
      setDeviceToken(generatedToken);
      onDeviceUpdated(generatedToken);
      setShowEnroll(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Device enrollment failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToSimulatedUnregistered = () => {
    const untrustedToken = "UNAUTHORIZED-HOME-PC-999";
    setDeviceToken(untrustedToken);
    onDeviceUpdated(untrustedToken);
  };

  const handleRestoreAuthorized = () => {
    const masterToken = "MHA-SECURE-STATION-DEV-001";
    setDeviceToken(masterToken);
    onDeviceUpdated(masterToken);
  };

  if (isAuthorized && !showEnroll) {
    return (
      <div style={{
        position: "fixed",
        bottom: "16px",
        left: "16px",
        zIndex: 50,
        background: "rgba(12, 31, 56, 0.9)",
        border: "1px solid var(--border-bright)",
        borderRadius: "var(--radius-md)",
        padding: "8px 14px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        boxShadow: "var(--shadow-card)",
        backdropFilter: "blur(6px)"
      }}>
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981" }}></div>
        <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
          Hardware Bound: <strong style={{ color: "#38bdf8" }}>{deviceToken}</strong>
        </span>
        <button 
          className="btn btn-secondary" 
          style={{ padding: "3px 8px", fontSize: "0.72rem" }}
          onClick={handleSwitchToSimulatedUnregistered}
          title="Demonstrate security block when accessed from an unregistered personal laptop"
        >
          Simulate Untrusted Laptop
        </button>
      </div>
    );
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: "560px", borderTop: "4px solid #ef4444" }}>
        <div style={{ padding: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <div style={{
              width: "48px",
              height: "48px",
              borderRadius: "10px",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <AlertTriangle size={28} color="#ef4444" />
            </div>
            <div>
              <h2 style={{ fontSize: "1.25rem", color: "#f87171" }}>
                Unauthorized Terminal Detected
              </h2>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                Zero-Trust Hardware Binding Enforcement (Section 66 IT Act)
              </p>
            </div>
          </div>

          <div className="gov-card" style={{ background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.2)", marginBottom: "20px" }}>
            <p style={{ fontSize: "0.86rem", color: "#e2e8f0", lineHeight: 1.6 }}>
              Access to <strong>SURAKH-SHIK</strong> is strictly restricted to departmentally verified, 
              hardware-bound workstations. The device token presented (<code className="mono" style={{ color: "#fca5a5" }}>{deviceToken}</code>) 
              is <strong>NOT AUTHORIZED</strong> in the National Crime Records Bureau directory.
            </p>
          </div>

          {errorMsg && (
            <div style={{ color: "#ef4444", fontSize: "0.84rem", marginBottom: "14px" }}>
              {errorMsg}
            </div>
          )}

          {!showEnroll ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <button 
                className="btn btn-primary"
                onClick={handleRestoreAuthorized}
              >
                <ShieldCheck size={18} />
                Switch to Authorized Pre-Seeded Laptop (MHA-SECURE-STATION-DEV-001)
              </button>
              
              <button 
                className="btn btn-secondary"
                onClick={() => setShowEnroll(true)}
              >
                <Key size={18} />
                Enroll Current Workstation (Admin Provisioning)
              </button>
            </div>
          ) : (
            <form onSubmit={handleEnroll}>
              <div style={{ marginBottom: "14px" }}>
                <label className="gov-label">Asset Tag / Serial Number</label>
                <input 
                  type="text" 
                  className="gov-input" 
                  value={assetTag} 
                  onChange={(e) => setAssetTag(e.target.value)} 
                  required 
                />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label className="gov-label">Assigned Police Station / Unit</label>
                <input 
                  type="text" 
                  className="gov-input" 
                  value={station} 
                  onChange={(e) => setStation(e.target.value)} 
                  required 
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label className="gov-label">Hardware Device Token (UUID)</label>
                <input 
                  type="text" 
                  className="gov-input mono" 
                  value={customToken} 
                  onChange={(e) => setCustomToken(e.target.value)} 
                  required 
                />
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowEnroll(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={loading}
                >
                  {loading ? <RefreshCw className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
                  Authorize Device
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
