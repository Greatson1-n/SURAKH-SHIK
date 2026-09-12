import React, { useState } from "react";
import { Search, ShieldCheck, CheckCircle2, XCircle, RefreshCw, X } from "lucide-react";
import { api } from "../services/api";

interface UniversalHashVerifierModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UniversalHashVerifierModal: React.FC<UniversalHashVerifierModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setResult(null);
    try {
      const res = await api.lookupHash(query.trim());
      setResult(res);
    } catch (err: any) {
      alert("Hash verification query failed.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }}>
      <div className="modal-content" style={{ maxWidth: "640px", borderTop: "4px solid #38bdf8" }}>
        {/* Header */}
        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "rgba(56, 189, 248, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <ShieldCheck size={20} color="#38bdf8" />
            </div>
            <div>
              <h3 style={{ fontSize: "1.15rem", color: "#f8fafc", margin: 0 }}>
                Universal Cryptographic Hash &amp; Tamper Verifier
              </h3>
              <p style={{ fontSize: "0.76rem", color: "var(--text-secondary)", margin: "2px 0 0" }}>
                Section 63 BSA &bull; Public Blockchain Anchor &amp; Tamper Verification
              </p>
            </div>
          </div>
          <button 
            className="btn btn-secondary" 
            style={{ padding: "6px 8px" }} 
            onClick={() => {
              setResult(null);
              setQuery("");
              onClose();
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px" }}>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "16px", lineHeight: 1.5 }}>
            Any officer, forensic scientist, or judicial magistrate can verify the authenticity of an evidence file or seizure memo by querying its <strong>SHA-256 hash</strong> or <strong>Document ID</strong>.
          </p>

          <form onSubmit={handleSearch} style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
            <input
              type="text"
              className="gov-input mono"
              placeholder="Paste SHA-256 Hash (64 hex) or Document ID (DOC-...)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ flex: 1, fontSize: "0.84rem" }}
              required
              autoFocus
            />
            <button type="submit" className="btn btn-primary" disabled={searching}>
              {searching ? <RefreshCw className="animate-spin" size={15} /> : <Search size={15} />}
              Verify
            </button>
          </form>

          {/* Results */}
          {result && (
            <div style={{
              background: result.found ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
              border: `1px solid ${result.found ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
              borderRadius: "var(--radius-md)",
              padding: "18px"
            }}>
              {result.found ? (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                    <CheckCircle2 size={22} color="#10b981" />
                    <div>
                      <strong style={{ fontSize: "1rem", color: "#6ee7b7" }}>
                        100% CRYPTOGRAPHIC INTEGRITY VERIFIED
                      </strong>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        Permanently anchored to Sovereign Consortium Block #{result.block_number}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.8rem", marginBottom: "12px" }}>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Block Height:</span>
                      <strong className="mono" style={{ color: "#38bdf8", marginLeft: "6px" }}>#{result.block_number}</strong>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Consensus Time:</span>
                      <span className="mono" style={{ marginLeft: "6px" }}>{new Date(result.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <span style={{ color: "var(--text-muted)" }}>Block Hash:</span>
                      <div className="mono" style={{ fontSize: "0.72rem", color: "#cbd5e1", wordBreak: "break-all" }}>
                        {result.block_hash}
                      </div>
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <span style={{ color: "var(--text-muted)" }}>Merkle Tree Root:</span>
                      <div className="mono" style={{ fontSize: "0.72rem", color: "#cbd5e1", wordBreak: "break-all" }}>
                        {result.merkle_root}
                      </div>
                    </div>
                  </div>

                  {result.transaction && (
                    <div style={{ background: "#061120", padding: "10px 14px", borderRadius: "var(--radius-sm)", fontSize: "0.76rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ color: "var(--text-muted)" }}>Transaction ID:</span>
                        <span className="mono" style={{ color: "#38bdf8" }}>{result.transaction.tx_id}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-muted)" }}>Anchored By:</span>
                        <span style={{ fontWeight: 600, color: "#f8fafc" }}>{result.transaction.endorsing_peer || "Consortium Node"}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#fca5a5" }}>
                  <XCircle size={26} color="#ef4444" />
                  <div>
                    <strong style={{ fontSize: "0.95rem" }}>TAMPER / INVALIDITY ALERT</strong>
                    <p style={{ fontSize: "0.8rem", margin: "2px 0 0", color: "#e2e8f0" }}>
                      The queried hash or ID is <strong>NOT registered</strong> on the Sovereign Consortium Blockchain.
                      Evidence may have been modified, corrupted, or not properly seized.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
