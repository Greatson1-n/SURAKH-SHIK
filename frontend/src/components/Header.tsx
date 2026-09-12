import React, { useState } from "react";
import { Shield, Laptop, LogOut, UserCheck, ShieldCheck } from "lucide-react";
import { clearAuthToken } from "../services/api";
import { UniversalHashVerifierModal } from "./UniversalHashVerifierModal";

interface HeaderProps {
  user: any;
  deviceToken: string;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, deviceToken, onLogout }) => {
  const [showVerifier, setShowVerifier] = useState(false);

  return (
    <header className="mha-header">
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <div style={{
          width: "42px",
          height: "42px",
          background: "linear-gradient(135deg, #1e3a8a, #0f172a)",
          border: "2px solid #eab308",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 15px rgba(234, 179, 8, 0.3)"
        }}>
          <Shield size={24} color="#eab308" />
        </div>
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

        {/* Logout */}
        {user && (
          <button 
            className="btn btn-secondary" 
            style={{ padding: "8px 12px", fontSize: "0.82rem" }}
            onClick={() => {
              clearAuthToken();
              onLogout();
            }}
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
    </header>
  );
};
