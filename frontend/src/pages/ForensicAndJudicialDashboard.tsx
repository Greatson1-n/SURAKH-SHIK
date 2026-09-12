import React, { useState, useEffect } from "react";
import { ShieldCheck, Microscope, Gavel, RefreshCw, Upload, Award } from "lucide-react";
import { api } from "../services/api";
import { WatermarkViewer } from "../components/WatermarkViewer";
import { BlockExplorer } from "../components/BlockExplorer";

interface ForensicAndJudicialDashboardProps {
  user: any;
}

export const ForensicAndJudicialDashboard: React.FC<ForensicAndJudicialDashboardProps> = ({ user }) => {
  const isJudge = user.role === "JUDICIAL_MAGISTRATE" || user.role === "PUBLIC_PROSECUTOR";
  const [inboundShares, setInboundShares] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"INBOX" | "BLOCKCHAIN">("INBOX");

  // Upload Forensic Report Modal
  const [uploadingCaseId, setUploadingCaseId] = useState<string | null>(null);
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const loadData = async () => {
    try {
      if (isJudge) {
        const cRes = await api.getCases();
        setCases(cRes.cases || []);
      } else {
        const sRes = await api.getInboundShares();
        setInboundShares(sRes.inbound_shares || []);
      }
    } catch (err) {
      console.error("Dashboard load error:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleUploadReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportFile || !uploadingCaseId) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("case_id", uploadingCaseId);
      fd.append("file_type", "FORENSIC_REPORT");
      fd.append("file", reportFile);

      const res = await api.uploadDocument(fd);
      alert(`Scientific Analysis Report securely signed and committed to Blockchain Block #${res.ledger_block}!`);
      setUploadingCaseId(null);
      setReportFile(null);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to upload forensic report.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {isJudge ? <Gavel size={26} color="#eab308" /> : <Microscope size={26} color="#06b6d4" />}
            <h1 style={{ fontSize: "1.6rem", color: "#f8fafc" }}>
              {isJudge ? "Judicial Trial Bench & Evidence Admissibility Console" : "Forensic Science Laboratory (FSL) Scientific Workbench"}
            </h1>
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>
            Assigned Unit: <strong style={{ color: "#38bdf8" }}>{user.station_id}</strong> &bull; Clearance: <strong>{user.role}</strong>
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button 
            className={`btn ${activeTab === "INBOX" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setActiveTab("INBOX")}
          >
            {isJudge ? "Court Docket Cases" : "Inbound Evidence Dispatches"}
          </button>
          <button 
            className={`btn ${activeTab === "BLOCKCHAIN" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setActiveTab("BLOCKCHAIN")}
          >
            Consortium Ledger
          </button>
        </div>
      </div>

      {activeTab === "INBOX" && (
        <>
          {/* Forensic Analyst View: Inbound Dispatches */}
          {!isJudge ? (
            <div className="gov-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Microscope size={18} color="#06b6d4" />
                  Selectively Shared Evidence Dispatches ({inboundShares.length})
                </h3>
                <button className="btn btn-secondary" onClick={loadData}>
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>

              {inboundShares.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", background: "#061120", borderRadius: "var(--radius-md)" }}>
                  <p style={{ fontSize: "0.9rem" }}>No active evidence dispatches received by {user.station_id} yet.</p>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "6px" }}>
                    When an Investigating Officer (e.g. from Manipur Police) grants targeted access to your lab, the case will appear here.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {inboundShares.map((s) => (
                    <div
                      key={s.share_id}
                      style={{
                        background: "#061120",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--radius-md)",
                        padding: "16px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <span className="mono" style={{ fontSize: "0.95rem", fontWeight: 800, color: "#38bdf8" }}>
                            {s.fir_number}
                          </span>
                          <span className="gov-badge badge-gold">{s.permission}</span>
                          <span className="gov-badge badge-blue">Origin: {s.originating_state} Police</span>
                        </div>
                        <div style={{ fontSize: "0.92rem", fontWeight: 600, color: "#f8fafc" }}>
                          {s.case_title}
                        </div>
                        <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "4px" }}>
                          Dispatched By: <strong>{s.granted_by}</strong> &bull; Received: {new Date(s.granted_at).toLocaleString()}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "10px" }}>
                        <button
                          className="btn btn-primary"
                          style={{ padding: "6px 14px", fontSize: "0.82rem" }}
                          onClick={() => setUploadingCaseId(s.case_id)}
                        >
                          <Upload size={14} />
                          Upload Certified Scientific Report
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Judicial Magistrate View: Trial Courtroom Console */
            <div className="gov-card">
              <h3 style={{ fontSize: "1.15rem", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Gavel size={20} color="#eab308" />
                Active Court Docket Files ({cases.length})
              </h3>

              {cases.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", background: "#061120", borderRadius: "var(--radius-md)" }}>
                  No case filings awaiting judicial examination in this district.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {cases.map((c) => (
                    <div
                      key={c.case_id}
                      style={{
                        background: "#061120",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--radius-md)",
                        padding: "16px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <span className="mono" style={{ fontSize: "0.95rem", fontWeight: 800, color: "#38bdf8" }}>
                            {c.fir_number}
                          </span>
                          <span className="gov-badge badge-gold">{c.status}</span>
                          <span className="gov-badge badge-blue">{c.state} Police ({c.station_id})</span>
                        </div>
                        <div style={{ fontSize: "0.92rem", fontWeight: 600, color: "#f8fafc" }}>
                          {c.title}
                        </div>
                        <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "4px" }}>
                          Case ID: <span className="mono">{c.case_id}</span> &bull; Assigned IO: {c.assigned_io_id}
                        </div>
                      </div>

                      <button
                        className="btn btn-primary"
                        style={{ padding: "6px 14px", fontSize: "0.82rem" }}
                        onClick={async () => {
                          const det = await api.getCaseDetails(c.case_id);
                          if (det.documents?.length > 0) {
                            setViewingDocId(det.documents[0].document_id);
                          } else {
                            alert("No documents attached to this case yet.");
                          }
                        }}
                      >
                        <ShieldCheck size={16} />
                        Inspect &amp; Verify Admissibility
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Consortium Ledger Tab */}
      {activeTab === "BLOCKCHAIN" && (
        <BlockExplorer />
      )}

      {/* Upload Forensic Report Modal */}
      {uploadingCaseId && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: "540px" }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <Microscope size={18} color="#06b6d4" />
                Upload Certified FSL Scientific Report
              </h3>
              <button className="btn btn-secondary" style={{ padding: "4px 8px" }} onClick={() => setUploadingCaseId(null)}>
                Cancel
              </button>
            </div>

            <form onSubmit={handleUploadReport} style={{ padding: "20px 24px" }}>
              <div style={{ marginBottom: "16px" }}>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  Once uploaded, this scientific report will be cryptographically signed with your analyst key 
                  and permanently anchored to the <strong>Sovereign Consortium Ledger</strong>. Neither police nor IT admins can alter or retract the findings.
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label className="gov-label">Attach Certified Report (PDF / Image / Text)</label>
                <input
                  type="file"
                  className="gov-input"
                  onChange={(e) => setReportFile(e.target.files?.[0] || null)}
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setUploadingCaseId(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={uploading}>
                  {uploading ? <RefreshCw className="animate-spin" size={16} /> : <Award size={16} />}
                  Sign &amp; Anchor Forensic Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-Memory Document Viewer */}
      {viewingDocId && (
        <WatermarkViewer
          docId={viewingDocId}
          onClose={() => setViewingDocId(null)}
        />
      )}
    </div>
  );
};
