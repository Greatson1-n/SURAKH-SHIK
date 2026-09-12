import React, { useState } from "react";
import { Laptop, LogOut, UserCheck, ShieldCheck, ShieldAlert, Lock, AlertTriangle, RefreshCw, X } from "lucide-react";
import { api, clearAuthToken } from "../services/api";
import { UniversalHashVerifierModal } from "./UniversalHashVerifierModal";

interface HeaderProps {
  user: any;
  deviceToken: string;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, deviceToken, onLogout }) => {
  const [showVerifier, setShowVerifier] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [exitConsent, setExitConsent] = useState(false);
  const [exiting, setExiting] = useState(false);

  const handleConfirmExit = async () => {
    if (!exitConsent) return;
    setExiting(true);
    try {
      await api.logoutSession();
    } catch {
      // ignore
    } finally {
      clearAuthToken();
      setShowExitModal(false);
      setExitConsent(false);
      setExiting(false);
      onLogout();
    }
  };

  return (
    <header className="mha-header">
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <img 
          src="/surakh_shik_logo.svg" 
          alt="SURAKH-SHIK Emblem" 
          style={{ 
            width: "44px", 
            height: "44px", 
            borderRadius: "50%",
            boxShadow: "0 0 16px rgba(234, 179, 8, 0.35)",
            display: "block"
          }} 
        />
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "1.1rem", fontWeight: 800, letterSpacing: "0.02em", color: "#f8fafc" }}>
              SURAKH-SHIK (सुरक्षा-साक्ष्य)
            </span>
            <span className="gov-badge badge-gold">MHA / NCRB</span>
            <span className="gov-badge badge-blue">PS 26190</span>
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
            National Legal &amp; Investigation Document Management System &bull; Zero-Trust Consortium
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* Quick Tamper & Hash Verifier Button for All Roles */}
        {user && (
          <button
            className="btn btn-secondary"
            style={{ 
              padding: "6px 12px", 
              fontSize: "0.78rem", 
              display: "flex", 
              alignItems: "center", 
              gap: "6px",
              borderColor: "rgba(56, 189, 248, 0.4)",
              background: "rgba(15, 33, 55, 0.8)"
            }}
            onClick={() => setShowVerifier(true)}
            title="Inspect SHA-256 hash or Document ID against Sovereign Blockchain"
          >
            <ShieldCheck size={15} color="#38bdf8" />
            <span>Verify Evidence Hash</span>
          </button>
        )}

        {/* Terminal Badge */}
        <div style={{
          background: "rgba(15, 33, 55, 0.8)",
          border: "1px solid var(--border-subtle)",
          padding: "6px 12px",
          borderRadius: "var(--radius-md)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "0.8rem"
        }}>
          <Laptop size={15} color="#06b6d4" />
          <span style={{ color: "var(--text-muted)" }}>Terminal:</span>
          <span className="mono" style={{ color: "#38bdf8", fontWeight: 600 }}>{deviceToken.slice(0, 18)}</span>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981" }}></span>
        </div>

        {/* User Profile */}
        {user && (
          <div style={{
            background: "rgba(15, 33, 55, 0.8)",
            border: "1px solid var(--border-bright)",
            padding: "4px 12px 4px 6px",
            borderRadius: "var(--radius-full)",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}>
            <div style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "var(--border-bright)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden"
            }}>
              <UserCheck size={18} color="#60a5fa" />
            </div>
            <div style={{ textAlign: "left", lineHeight: 1.2 }}>
              <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "#f8fafc" }}>
                {user.full_name}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                {user.role} &bull; <strong style={{ color: "#38bdf8" }}>{user.state}</strong> ({user.station_id})
              </div>
            </div>
          </div>
        )}

        {/* Secure Exit Request Button */}
        {user && (
          <button 
            className="btn btn-secondary" 
            style={{ 
              padding: "8px 12px", 
              fontSize: "0.82rem",
              borderColor: "rgba(239, 68, 68, 0.4)",
              color: "#fca5a5"
            }}
            onClick={() => {
              setExitConsent(false);
              setShowExitModal(true);
            }}
            title="Request secure session termination"
          >
            <LogOut size={15} />
            Exit
          </button>
        )}
      </div>

      <UniversalHashVerifierModal 
        isOpen={showVerifier} 
        onClose={() => setShowVerifier(false)} 
      />

      {/* SECURE EXIT & SESSION TERMINATION PERMISSION MODAL */}
      {showExitModal && (
        <div className="modal-backdrop" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ maxWidth: "560px", borderTop: "4px solid #f59e0b" }}>
            {/* Modal Header */}
            <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "rgba(245, 158, 11, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <ShieldAlert size={20} color="#f59e0b" />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.15rem", color: "#f8fafc", margin: 0 }}>
                    Secure Session Termination Protocol
                  </h3>
                  <p style={{ fontSize: "0.76rem", color: "var(--text-secondary)", margin: "2px 0 0" }}>
                    National Crime Records Bureau &bull; Zero-Trust Terminal Security
                  </p>
                </div>
              </div>
              <button 
                className="btn btn-secondary" 
                style={{ padding: "6px 8px" }} 
                onClick={() => setShowExitModal(false)}
                disabled={exiting}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "20px 24px" }}>
              {/* Operator Identification Card */}
              <div className="gov-card" style={{ background: "#061120", marginBottom: "16px", padding: "14px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.82rem" }}>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Active Operator:</span>
                    <div style={{ fontWeight: 700, color: "#f8fafc", marginTop: "2px" }}>
                      {user.full_name} (<span className="mono" style={{ color: "#38bdf8" }}>{user.badge_id}</span>)
                    </div>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Security Clearance:</span>
                    <div style={{ fontWeight: 600, color: "#e2e8f0", marginTop: "2px" }}>
                      {user.role}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Jurisdiction:</span>
                    <div style={{ color: "#cbd5e1", marginTop: "2px" }}>
                      {user.state} &bull; {user.station_id}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Bound Hardware Terminal:</span>
                    <div className="mono" style={{ fontSize: "0.74rem", color: "#38bdf8", marginTop: "2px" }}>
                      {deviceToken.slice(0, 18)}...
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Warning Notice */}
              <div style={{
                background: "rgba(245, 158, 11, 0.08)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                borderRadius: "var(--radius-md)",
                padding: "14px 16px",
                marginBottom: "18px",
                fontSize: "0.82rem",
                lineHeight: 1.5
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#fbbf24", fontWeight: 700, marginBottom: "6px" }}>
                  <AlertTriangle size={16} />
                  <span>Mandatory Security Notice &bull; Zeroization Protocol</span>
                </div>
                <p style={{ color: "#e2e8f0", margin: 0 }}>
                  Because SURAKH-SHIK manages high-sensitivity legal &amp; investigative evidence, session exit requires explicit user authorization. 
                  Terminating your session will:
                </p>
                <ul style={{ margin: "8px 0 0 16px", padding: 0, color: "#cbd5e1", fontSize: "0.8rem" }}>
                  <li>Immediately zeroize and purge all volatile AES-256 in-memory decryption keys.</li>
                  <li>Evict and wipe all decrypted victim records and evidence previews from memory.</li>
                  <li>Permanently record a <code style={{ color: "#38bdf8" }}>LOGOUT_SESSION_TERMINATED</code> audit event with timestamp.</li>
                  <li>Require full 3FA (Hardware Token + Credentials + Live Face Biometrics) for subsequent login.</li>
                </ul>
              </div>

              {/* Explicit User Consent Checkbox */}
              <div style={{
                background: "rgba(15, 33, 55, 0.6)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "12px 16px",
                marginBottom: "20px"
              }}>
                <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", fontSize: "0.84rem", color: "#f8fafc" }}>
                  <input
                    type="checkbox"
                    checked={exitConsent}
                    onChange={(e) => setExitConsent(e.target.checked)}
                    style={{ marginTop: "3px", width: "16px", height: "16px", accentColor: "#f59e0b", cursor: "pointer" }}
                  />
                  <span>
                    <strong>I explicitly authorize session termination.</strong> I confirm all current work is saved and grant permission to lock this terminal and purge volatile keys.
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowExitModal(false)}
                  disabled={exiting}
                >
                  Cancel &amp; Return to Session
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleConfirmExit}
                  disabled={!exitConsent || exiting}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    opacity: exitConsent ? 1 : 0.5,
                    cursor: exitConsent ? "pointer" : "not-allowed"
                  }}
                >
                  {exiting ? <RefreshCw className="animate-spin" size={16} /> : <Lock size={16} />}
                  {exiting ? "Zeroizing Keys & Exiting..." : "Confirm Secure Exit & Lock"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
