import React, { useState, useEffect } from "react";
import { Database, RefreshCw, ChevronRight, ChevronDown, Layers } from "lucide-react";
import { api } from "../services/api";

export const BlockExplorer: React.FC = () => {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expandedBlock, setExpandedBlock] = useState<number | null>(null);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const [bRes, sRes] = await Promise.all([
        api.getLedgerBlocks(),
        api.getLedgerStats(),
      ]);
      setBlocks(bRes.blocks || []);
      setStats(sRes);
    } catch (err) {
      console.error("Ledger fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
    const interval = setInterval(fetchLedger, 12000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Consortium Overview Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: "1.4rem", color: "#f8fafc", display: "flex", alignItems: "center", gap: "10px" }}>
            <Layers size={24} color="#eab308" />
            Sovereign Consortium Ledger Explorer
          </h2>
          <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)" }}>
            Permissioned Zero-Gas Distributed Ledger (MeitY NBF &bull; Raft CFT Consensus)
          </p>
        </div>
        <button className="btn btn-secondary" onClick={fetchLedger} disabled={loading}>
          <RefreshCw className={loading ? "animate-spin" : ""} size={16} />
          Sync Ledger
        </button>
      </div>

      {/* 4 Consortium Nodes Visualizer */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
        {stats?.active_nodes?.map((node: any, idx: number) => (
          <div key={idx} className="gov-card" style={{ padding: "14px", borderLeft: "4px solid #3b82f6" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                Node #{idx + 1}
              </span>
              <span className="gov-badge badge-green" style={{ fontSize: "0.68rem" }}>
                {node.status}
              </span>
            </div>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#f8fafc", marginBottom: "4px" }}>
              {node.name}
            </div>
            <div style={{ fontSize: "0.78rem", color: "#38bdf8" }}>
              {node.role}
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
              Jurisdiction: {node.jurisdiction}
            </div>
          </div>
        ))}
      </div>

      {/* Telemetry Bar */}
      {stats && (
        <div style={{
          background: "rgba(12, 31, 56, 0.6)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "0.85rem"
        }}>
          <div>
            <span style={{ color: "var(--text-muted)" }}>Total Blocks Anchored:</span>{" "}
            <strong className="mono" style={{ color: "#eab308", fontSize: "1.1rem" }}>{stats.total_blocks}</strong>
          </div>
          <div>
            <span style={{ color: "var(--text-muted)" }}>Consortium Consensus:</span>{" "}
            <strong style={{ color: "#10b981" }}>Raft Crash Fault Tolerance (CFT)</strong>
          </div>
          <div style={{ maxWidth: "340px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <span style={{ color: "var(--text-muted)" }}>Latest Root Hash:</span>{" "}
            <span className="mono" style={{ color: "#38bdf8" }}>{stats.latest_hash}</span>
          </div>
        </div>
      )}

      {/* Block Stream */}
      <div className="gov-card">
        <h3 style={{ fontSize: "1.1rem", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <Database size={18} color="#38bdf8" />
          Immutable Block Sequence
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {blocks.map((block) => {
            const isExpanded = expandedBlock === block.block_number;
            return (
              <div 
                key={block.block_number}
                style={{
                  background: "#061120",
                  border: `1px solid ${isExpanded ? "var(--accent-blue)" : "var(--border-subtle)"}`,
                  borderRadius: "var(--radius-md)",
                  padding: "14px",
                  transition: "all 0.2s ease"
                }}
              >
                <div 
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
                  onClick={() => setExpandedBlock(isExpanded ? null : block.block_number)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "8px",
                      background: "rgba(59, 130, 246, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      color: "#60a5fa"
                    }}>
                      #{block.block_number}
                    </div>
                    <div>
                      <div className="mono" style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc" }}>
                        Block Hash: {block.block_hash.slice(0, 20)}...{block.block_hash.slice(-10)}
                      </div>
                      <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)" }}>
                        Committed: {new Date(block.timestamp).toLocaleString()} &bull; {block.transactions?.length || 0} Transactions
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span className="gov-badge badge-blue">
                      Merkle: {block.merkle_root.slice(0, 8)}...
                    </span>
                    {isExpanded ? <ChevronDown size={18} color="#94a3b8" /> : <ChevronRight size={18} color="#94a3b8" />}
                  </div>
                </div>

                {/* Expanded Transactions */}
                {isExpanded && (
                  <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px dashed var(--border-subtle)" }}>
                    <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>
                      Block Transactions Payload
                    </div>
                    {block.transactions?.map((tx: any, tIdx: number) => (
                      <div 
                        key={tIdx} 
                        style={{
                          background: "#020617",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "var(--radius-sm)",
                          padding: "10px",
                          marginBottom: "8px",
                          fontSize: "0.8rem"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                          <span className="mono" style={{ color: "#eab308", fontWeight: 700 }}>{tx.tx_id}</span>
                          <span className="gov-badge badge-gold" style={{ fontSize: "0.68rem" }}>{tx.type}</span>
                        </div>
                        <pre style={{ margin: 0, padding: "8px", fontSize: "0.74rem", background: "transparent", border: "none" }}>
                          {JSON.stringify(tx.payload, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
