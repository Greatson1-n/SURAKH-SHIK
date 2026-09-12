import React, { useState, useEffect } from "react";
import { ShieldCheck, AlertTriangle, FileText, Award, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { api } from "../services/api";

interface WatermarkViewerProps {
  docId: string;
  onClose: () => void;
}

export const WatermarkViewer: React.FC<WatermarkViewerProps> = ({ docId, onClose }) => {
  const [docData, setDocData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"REDACTED" | "ORIGINAL">("REDACTED");
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [tampering, setTampering] = useState(false);
  const [certificateData, setCertificateData] = useState<any>(null);
  const [showCertificate, setShowCertificate] = useState(false);

  const fetchDoc = async () => {
    setLoading(true);
    try {
      const data = await api.viewDocument(docId);
      setDocData(data);
      if (data.is_redacted) {
        setViewMode("REDACTED");
      }
    } catch (err: any) {
      alert(err.message || "Failed to view document.");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoc();
  }, [docId]);

  const handleVerifyIntegrity = async () => {
    setVerifying(true);
    try {
      const res = await api.verifyDocument(docId);
      setVerificationResult(res);
    } catch (err: any) {
      alert("Verification check failed.");
    } finally {
      setVerifying(false);
    }
  };

  const handleTamperSimulate = async () => {
    if (!confirm("This will flip a byte in the cryptographic vault to demonstrate the Tamper Watchdog. Proceed?")) return;
    setTampering(true);
    try {
      const res = await api.tamperSimulate(docId);
      alert(res.message);
      // Immediately run verification to show the red alarm!
      handleVerifyIntegrity();
    } catch (err: any) {
      alert("Tamper simulation failed.");
    } finally {
      setTampering(false);
    }
  };

  const handleLoadCertificate = async () => {
    try {
      const cert = await api.getBsaCertificate(docId);
      setCertificateData(cert);
      setShowCertificate(true);
    } catch (err: any) {
      alert("Certificate generation failed.");
    }
  };

  if (loading) {
    return (
      <div className="modal-backdrop">
        <div className="modal-content" style={{ padding: "40px", textAlign: "center" }}>
          <RefreshCw className="animate-spin" size={32} color="#38bdf8" style={{ margin: "0 auto 16px" }} />
          <p>Decrypting from AES-256-GCM Vault into memory...</p>
        </div>
      </div>
    );
  }

  const wm = docData?.viewer_watermark;
  const watermarkString = wm 
    ? `OFFICER: ${wm.officer_badge} | TERMINAL: ${wm.device_id} | JURISDICTION: ${wm.station} | ${wm.timestamp}`
    : "SURAKH-SHIK CONFIDENTIAL";

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: "880px", maxHeight: "92vh", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{
          padding: "16px 24px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(7, 19, 36, 0.9)"
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <FileText size={20} color="#38bdf8" />
              <h3 style={{ fontSize: "1.1rem", color: "#f8fafc" }}>
                {docData.file_name}
              </h3>
              <span className="gov-badge badge-blue">{docData.file_type}</span>
              {docData.is_redacted && (
                <span className="gov-badge badge-gold">BNS Sec 72 Redacted</span>
              )}
            </div>
            <div className="mono" style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
              SHA-256: {docData.content_hash}
            </div>
          </div>

          <button className="btn btn-secondary" style={{ padding: "6px 12px" }} onClick={onClose}>
            Close
          </button>
        </div>

        {/* Action Toolbar */}
        <div style={{
          padding: "12px 24px",
          background: "#081628",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px"
        }}>
          {/* Toggle Redacted / Full */}
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              className={`btn ${viewMode === "REDACTED" ? "btn-primary" : "btn-secondary"}`}
              style={{ padding: "6px 12px", fontSize: "0.78rem" }}
              onClick={() => setViewMode("REDACTED")}
            >
              Protected View (Redacted)
            </button>
            <button
              className={`btn ${viewMode === "ORIGINAL" ? "btn-primary" : "btn-secondary"}`}
              style={{ padding: "6px 12px", fontSize: "0.78rem" }}
              onClick={() => setViewMode("ORIGINAL")}
            >
              Full Evidence Text
            </button>
          </div>

          {/* Verification & Tamper Buttons */}
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="btn btn-secondary"
              style={{ padding: "6px 12px", fontSize: "0.78rem", borderColor: "#f59e0b", color: "#fef08a" }}
              onClick={handleLoadCertificate}
            >
              <Award size={14} />
              Sec 63 BSA Certificate
            </button>

            <button
              className="btn btn-primary"
              style={{ padding: "6px 12px", fontSize: "0.78rem" }}
              onClick={handleVerifyIntegrity}
              disabled={verifying}
            >
              {verifying ? <RefreshCw className="animate-spin" size={14} /> : <ShieldCheck size={14} />}
              Verify Ledger Integrity
            </button>

            <button
              className="btn btn-danger"
              style={{ padding: "6px 12px", fontSize: "0.78rem" }}
              onClick={handleTamperSimulate}
              disabled={tampering}
              title="Flip 1 byte in storage to demonstrate tamper watchdog"
            >
              <AlertTriangle size={14} />
              Simulate Vault Tamper
            </button>
          </div>
        </div>

        {/* Verification Result Banner */}
        {verificationResult && (
          <div style={{
            padding: "10px 24px",
            background: verificationResult.verified ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.2)",
            borderBottom: `1px solid ${verificationResult.verified ? "#10b981" : "#ef4444"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "0.82rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {verificationResult.verified ? (
                <CheckCircle2 size={18} color="#10b981" />
              ) : (
                <XCircle size={18} color="#ef4444" />
              )}
              <div>
                <strong style={{ color: verificationResult.verified ? "#6ee7b7" : "#fca5a5" }}>
                  {verificationResult.verified ? "EVIDENCE INTEGRITY VERIFIED (100% AUTHENTIC)" : "CRITICAL ALERT: HASH MISMATCH / TAMPER DETECTED"}
                </strong>
                <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)" }}>
                  {verificationResult.verified
                    ? `Live SHA-256 matches Block #${verificationResult.block_number} on Sovereign Consortium Ledger.`
                    : `Live file hash does NOT match anchored ledger block! Storage tampering confirmed.`}
                </div>
              </div>
            </div>
            <span className="mono" style={{ fontSize: "0.74rem" }}>
              Status: {verificationResult.status}
            </span>
          </div>
        )}

        {/* Document Content with In-Memory Watermarking */}
        <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
          <div className="watermark-wrapper">
            {/* Background Watermark */}
            <div className="watermark-overlay-text">
              {watermarkString}
            </div>

            {/* Document Content */}
            <div style={{ position: "relative", zIndex: 10, fontSize: "0.9rem", color: "#f8fafc", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
              {viewMode === "REDACTED" ? (
                docData.redacted_text || docData.extracted_text
              ) : (
                docData.extracted_text
              )}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div style={{
          padding: "10px 24px",
          background: "#061120",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.74rem",
          color: "var(--text-muted)"
        }}>
          <span>In-Memory Decrypted View (Zero-Disk Footprint)</span>
          <span>Author Badge: {docData.author_badge} &bull; Case: {docData.case_id}</span>
        </div>
      </div>

      {/* Section 63 BSA Certificate Modal */}
      {showCertificate && certificateData && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: "700px" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <Award size={20} color="#eab308" />
                Section 63 BSA 2023 Electronic Certificate
              </h3>
              <button className="btn btn-secondary" style={{ padding: "4px 10px" }} onClick={() => setShowCertificate(false)}>
                Close
              </button>
            </div>
            <div style={{ padding: "20px 24px", maxHeight: "70vh", overflowY: "auto" }}>
              <pre style={{
                background: "#020617",
                border: "1px solid var(--border-bright)",
                padding: "16px",
                borderRadius: "var(--radius-md)",
                fontSize: "0.78rem",
                color: "#e2e8f0",
                lineHeight: 1.5,
                whiteSpace: "pre-wrap"
              }}>
                {certificateData.full_certificate_text}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
