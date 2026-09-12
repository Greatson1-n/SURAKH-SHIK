import React, { useState, useEffect } from "react";
import { Folder, FilePlus, Share2, Shield, Upload, FileText, Lock, Eye, RefreshCw, CheckCircle2 } from "lucide-react";
import { api } from "../services/api";
import { WatermarkViewer } from "../components/WatermarkViewer";
import { BlockExplorer } from "../components/BlockExplorer";

interface OfficerDashboardProps {
  user: any;
}

export const OfficerDashboard: React.FC<OfficerDashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<"CASES" | "NEW_CASE" | "BLOCKCHAIN">("CASES");
  const [cases, setCases] = useState<any[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [caseDetails, setCaseDetails] = useState<any>(null);

  // New Case Form
  const [firNumber, setFirNumber] = useState("");
  const [caseTitle, setCaseTitle] = useState("");
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split("T")[0]);
  const [sensitivity, setSensitivity] = useState("POCSO_RESTRICTED");
  const [caseMsg, setCaseMsg] = useState<string | null>(null);

  // Upload Document Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [fileType, setFileType] = useState("WITNESS_STATEMENT");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Targeted Sharing Modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [recipientDept, setRecipientDept] = useState("CFSL-KAMRUP-GUW");
  const [permission, setPermission] = useState("FORENSIC_ANALYSIS");
  const [validityDays, setValidityDays] = useState(30);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  // View Document in memory
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);

  const fetchCases = async () => {
    try {
      const res = await api.getCases();
      setCases(res.cases || []);
      if (res.cases?.length > 0 && !selectedCaseId) {
        handleSelectCase(res.cases[0].case_id);
      }
    } catch (err) {
      console.error("Cases fetch error:", err);
    }
  };

  const handleSelectCase = async (caseId: string) => {
    setSelectedCaseId(caseId);
    try {
      const res = await api.getCaseDetails(caseId);
      setCaseDetails(res);
    } catch (err: any) {
      alert(err.message || "Failed to load case details.");
    }
  };

  useEffect(() => {
    fetchCases();
  }, [user]);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createCase({
        fir_number: firNumber,
        title: caseTitle,
        incident_date: incidentDate,
        sensitivity_level: sensitivity,
      });
      setCaseMsg(`Case ${res.fir_number} registered under ${res.state} jurisdiction.`);
      setFirNumber("");
      setCaseTitle("");
      fetchCases();
      setActiveTab("CASES");
      handleSelectCase(res.case_id);
    } catch (err: any) {
      alert(err.message || "Case registration failed.");
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !selectedCaseId) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("case_id", selectedCaseId);
      fd.append("file_type", fileType);
      fd.append("file", uploadFile);

      const res = await api.uploadDocument(fd);
      alert(`Evidence secured! SHA-256 anchored to Ledger Block #${res.ledger_block}`);
      setShowUploadModal(false);
      setUploadFile(null);
      handleSelectCase(selectedCaseId);
    } catch (err: any) {
      alert(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleGrantTargetedShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId) return;
    setSharing(true);
    setShareMsg(null);
    try {
      const res = await api.grantSharing({
        case_id: selectedCaseId,
        recipient_dept: recipientDept,
        permission: permission,
        validity_days: validityDays,
      });
      setShareMsg(`Targeted access granted to ${res.recipient}. Digital custody transfer recorded on Ledger Block #${res.ledger_block}.`);
      setTimeout(() => {
        setShowShareModal(false);
        setShareMsg(null);
        handleSelectCase(selectedCaseId);
      }, 2000);
    } catch (err: any) {
      alert(err.message || "Sharing failed.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px" }}>
      {/* Officer Header & Jurisdiction Scope Indicator */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <div>
          <h1 style={{ fontSize: "1.6rem", color: "#f8fafc", display: "flex", alignItems: "center", gap: "10px" }}>
            <Shield size={24} color="#3b82f6" />
            {user.role === "STATION_HOUSE_OFFICER" ? "Station House Officer Scrutiny Desk" : "Active Investigations Desk"}
          </h1>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Jurisdiction: <strong style={{ color: "#38bdf8" }}>{user.state}</strong> &bull; District: <strong>{user.district}</strong> &bull; Station: <strong>{user.station_id}</strong>
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button 
            className={`btn ${activeTab === "CASES" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setActiveTab("CASES")}
          >
            <Folder size={16} />
            Jurisdiction Cases
          </button>
          <button 
            className={`btn ${activeTab === "NEW_CASE" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setActiveTab("NEW_CASE")}
          >
            <FilePlus size={16} />
            Register Case / FIR
          </button>
          <button 
            className={`btn ${activeTab === "BLOCKCHAIN" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setActiveTab("BLOCKCHAIN")}
          >
            Consortium Ledger
          </button>
        </div>
      </div>

      {/* Jurisdictional Isolation Alert Banner */}
      <div className="gov-card" style={{ background: "rgba(12, 31, 56, 0.6)", borderLeft: "4px solid #10b981", marginBottom: "24px", padding: "12px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.84rem", color: "#6ee7b7" }}>
          <CheckCircle2 size={16} />
          <strong>Jurisdictional Compartmentalization Active:</strong>
        </div>
        <p style={{ fontSize: "0.8rem", color: "#cbd5e1", marginTop: "2px" }}>
          All cases listed here are strictly isolated to <strong>{user.state} ({user.station_id})</strong>. 
          Officers in other states (Delhi, Maharashtra, etc.) have <strong>zero visibility</strong> into these files unless you explicitly grant targeted access.
        </p>
      </div>

      {/* TAB 1: CASES & DOSSIER */}
      {activeTab === "CASES" && (
        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "20px" }}>
          {/* Left: Case List */}
          <div className="gov-card" style={{ padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ fontSize: "1rem", color: "#f8fafc" }}>
                Active Case Files ({cases.length})
              </h3>
              <button className="btn btn-secondary" style={{ padding: "4px 8px" }} onClick={fetchCases}>
                <RefreshCw size={14} />
              </button>
            </div>

            {cases.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.84rem" }}>
                No cases registered in {user.station_id} yet. Click "Register Case / FIR" above to create your first case.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "600px", overflowY: "auto" }}>
                {cases.map((c) => (
                  <div
                    key={c.case_id}
                    onClick={() => handleSelectCase(c.case_id)}
                    style={{
                      background: selectedCaseId === c.case_id ? "rgba(59, 130, 246, 0.15)" : "#061120",
                      border: `1px solid ${selectedCaseId === c.case_id ? "var(--accent-blue)" : "var(--border-subtle)"}`,
                      borderRadius: "var(--radius-md)",
                      padding: "12px",
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                      <span className="mono" style={{ fontSize: "0.82rem", fontWeight: 700, color: "#38bdf8" }}>
                        {c.fir_number}
                      </span>
                      <span className="gov-badge badge-gold" style={{ fontSize: "0.65rem" }}>
                        {c.status}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#f8fafc", marginBottom: "4px" }}>
                      {c.title}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      Incident: {c.incident_date} &bull; Sensitivity: <strong style={{ color: "#f87171" }}>{c.sensitivity_level}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Selected Case Dossier & Evidence Vault */}
          {caseDetails ? (
            <div className="gov-card">
              {/* Dossier Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: "16px", borderBottom: "1px solid var(--border-subtle)", marginBottom: "20px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                    <span className="mono" style={{ fontSize: "1.25rem", fontWeight: 800, color: "#38bdf8" }}>
                      {caseDetails.case.fir_number}
                    </span>
                    <span className="gov-badge badge-blue">{caseDetails.case.branch}</span>
                    {caseDetails.case.sensitivity_level === "POCSO_RESTRICTED" && (
                      <span className="gov-badge badge-red">POCSO / BNS Sec 72 Protected</span>
                    )}
                  </div>
                  <h2 style={{ fontSize: "1.15rem", color: "#f8fafc" }}>
                    {caseDetails.case.title}
                  </h2>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                    Case ID: <span className="mono">{caseDetails.case.case_id}</span> &bull; Assigned IO: <strong>{caseDetails.case.assigned_io_id}</strong> &bull; Incident: {caseDetails.case.incident_date}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => setShowShareModal(true)}
                  >
                    <Share2 size={16} color="#eab308" />
                    Targeted Sharing
                  </button>

                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowUploadModal(true)}
                  >
                    <Upload size={16} />
                    Secure Evidence File
                  </button>
                </div>
              </div>

              {/* Attached Evidence & Documents */}
              <div>
                <h3 style={{ fontSize: "1rem", color: "#f8fafc", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Lock size={16} color="#38bdf8" />
                  Encrypted Documents &amp; Evidence Vault ({caseDetails.documents?.length || 0})
                </h3>

                {caseDetails.documents?.length === 0 ? (
                  <div style={{ background: "#061120", border: "1px dashed var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>
                    <FileText size={32} style={{ margin: "0 auto 10px", opacity: 0.5 }} />
                    <p style={{ fontSize: "0.85rem" }}>No evidence documents secured yet in this case dossier.</p>
                    <button className="btn btn-secondary" style={{ marginTop: "12px" }} onClick={() => setShowUploadModal(true)}>
                      Upload First Evidence File (FIR / Statement)
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {caseDetails.documents.map((doc: any) => (
                      <div
                        key={doc.document_id}
                        style={{
                          background: "#061120",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "var(--radius-md)",
                          padding: "14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "8px",
                            background: "rgba(59, 130, 246, 0.15)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}>
                            <FileText size={20} color="#60a5fa" />
                          </div>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <strong style={{ fontSize: "0.92rem", color: "#f8fafc" }}>{doc.file_name}</strong>
                              <span className="gov-badge badge-blue">{doc.file_type}</span>
                              {doc.is_redacted === 1 && (
                                <span className="gov-badge badge-gold">BNS Sec 72 Redacted</span>
                              )}
                            </div>
                            <div className="mono" style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                              SHA-256: {doc.content_hash_sha256} &bull; Author: {doc.author_badge}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: "6px 12px", fontSize: "0.78rem" }}
                            onClick={() => setViewingDocId(doc.document_id)}
                          >
                            <Eye size={14} />
                            View &amp; Verify
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Targeted Shares for this case */}
              {caseDetails.shares?.length > 0 && (
                <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--border-subtle)" }}>
                  <h3 style={{ fontSize: "0.95rem", color: "var(--text-secondary)", marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Share2 size={16} color="#eab308" />
                    Active Targeted Shares ({caseDetails.shares.length})
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {caseDetails.shares.map((s: any) => (
                      <div key={s.share_id} style={{ background: "#061120", padding: "10px 14px", borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem" }}>
                        <div>
                          <span>Shared with: <strong style={{ color: "#38bdf8" }}>{s.recipient_dept}</strong></span>
                          <span style={{ margin: "0 8px", color: "var(--text-muted)" }}>&bull;</span>
                          <span>Scope: <strong>{s.permission}</strong></span>
                        </div>
                        <span className="gov-badge badge-green" style={{ fontSize: "0.68rem" }}>
                          ACTIVE UNTIL {new Date(s.expires_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="gov-card" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
              Select a case from the left to view its dossier and evidence files.
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REGISTER NEW CASE */}
      {activeTab === "NEW_CASE" && (
        <div className="gov-card" style={{ maxWidth: "680px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <FilePlus size={20} color="#38bdf8" />
            Register New Criminal Investigation / FIR
          </h2>

          {caseMsg && (
            <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid #10b981", color: "#6ee7b7", padding: "10px 14px", borderRadius: "var(--radius-md)", marginBottom: "16px", fontSize: "0.84rem" }}>
              {caseMsg}
            </div>
          )}

          <form onSubmit={handleCreateCase}>
            <div style={{ marginBottom: "14px" }}>
              <label className="gov-label">FIR Reference Number (CCTNS Standard)</label>
              <input
                type="text"
                className="gov-input mono"
                placeholder={`e.g. ${user.state.slice(0, 2).toUpperCase()}-${user.district.slice(0, 3).toUpperCase()}-2026-FIR0042`}
                value={firNumber}
                onChange={(e) => setFirNumber(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label className="gov-label">Case Title / Crime Subject</label>
              <input
                type="text"
                className="gov-input"
                placeholder="e.g. State vs. Cyber Extortion & Evidence Seizure Case"
                value={caseTitle}
                onChange={(e) => setCaseTitle(e.target.value)}
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
              <div>
                <label className="gov-label">Date of Incident / Report</label>
                <input
                  type="date"
                  className="gov-input"
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="gov-label">Sensitivity &amp; Legal Protection</label>
                <select className="gov-select" value={sensitivity} onChange={(e) => setSensitivity(e.target.value)}>
                  <option value="POCSO_RESTRICTED">POCSO / Crimes Against Women (BNS Sec 72)</option>
                  <option value="HIGH">High Priority Investigation</option>
                  <option value="NORMAL">Standard Investigation</option>
                </select>
              </div>
            </div>

            <div className="gov-card" style={{ background: "#061120", marginBottom: "20px" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Automatically Bound Jurisdiction: <strong>{user.state} &bull; {user.station_id}</strong> (Assigned IO: {user.badge_id})
              </span>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
              <FilePlus size={16} />
              Commit Case Registration to Secure Registry
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: BLOCKCHAIN CONSORTIUM */}
      {activeTab === "BLOCKCHAIN" && (
        <BlockExplorer />
      )}

      {/* MODAL: UPLOAD EVIDENCE */}
      {showUploadModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: "540px" }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <Upload size={18} color="#38bdf8" />
                Ingest &amp; Secure Document
              </h3>
              <button className="btn btn-secondary" style={{ padding: "4px 8px" }} onClick={() => setShowUploadModal(false)}>
                Cancel
              </button>
            </div>

            <form onSubmit={handleUploadDocument} style={{ padding: "20px 24px" }}>
              <div style={{ marginBottom: "14px" }}>
                <label className="gov-label">Document Category</label>
                <select className="gov-select" value={fileType} onChange={(e) => setFileType(e.target.value)}>
                  <option value="FIR">First Information Report (FIR)</option>
                  <option value="WITNESS_STATEMENT">Witness Statement (Sec 180 BNSS)</option>
                  <option value="SEIZURE_MEMO">Seizure Memo / Panchnama</option>
                  <option value="CASE_DIARY">Daily Case Diary Entry</option>
                  <option value="FORENSIC_REPORT">Forensic Analysis Report</option>
                  <option value="CHARGESHEET">Final Police Report / Chargesheet</option>
                </select>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label className="gov-label">Select File (Text, Scanned PDF, or Image)</label>
                <input
                  type="file"
                  className="gov-input"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  required
                />
                <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                  Will automatically execute OCR, BNS Sec 72 privacy masking, AES-256-GCM encryption, and Blockchain anchoring.
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowUploadModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={uploading}>
                  {uploading ? <RefreshCw className="animate-spin" size={16} /> : <Upload size={16} />}
                  Encrypt &amp; Anchor to Blockchain
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TARGETED SELECTIVE SHARING */}
      {showShareModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: "580px" }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Share2 size={20} color="#eab308" />
                <h3 style={{ fontSize: "1.1rem" }}>
                  Targeted Cryptographic Sharing
                </h3>
              </div>
              <button className="btn btn-secondary" style={{ padding: "4px 8px" }} onClick={() => setShowShareModal(false)}>
                Cancel
              </button>
            </div>

            <div style={{ padding: "14px 24px 0" }}>
              <div className="gov-card" style={{ background: "rgba(234, 179, 8, 0.08)", border: "1px solid rgba(234, 179, 8, 0.2)", padding: "12px", fontSize: "0.82rem" }}>
                <strong>Strict Inter-Departmental Control:</strong> Only the recipient selected below will receive a wrapped decryption key. 
                All other police stations and departments across India will remain 100% locked out.
              </div>
            </div>

            {shareMsg && (
              <div style={{ margin: "14px 24px 0", padding: "10px 14px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid #10b981", color: "#6ee7b7", borderRadius: "var(--radius-md)", fontSize: "0.82rem" }}>
                {shareMsg}
              </div>
            )}

            <form onSubmit={handleGrantTargetedShare} style={{ padding: "16px 24px 24px" }}>
              <div style={{ marginBottom: "14px" }}>
                <label className="gov-label">Target External Department / Forensic Lab</label>
                <select className="gov-select" value={recipientDept} onChange={(e) => setRecipientDept(e.target.value)}>
                  <option value="CFSL-KAMRUP-GUW">CFSL Kamrup / Guwahati (Cyber Forensics Hub)</option>
                  <option value="MN-SFSL-IMPHAL">State Forensic Science Lab (Pangei, Manipur)</option>
                  <option value="MN-CRT-IW-SESS">Sessions Court Imphal West (Judicial Bench)</option>
                  <option value="DL-SFSL-ROH">FSL Rohini Delhi (Cyber &amp; DNA)</option>
                  <option value="CFSL-NEW-DELHI">CFSL New Delhi (CBI Headquarters)</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "20px" }}>
                <div>
                  <label className="gov-label">Permission Scope</label>
                  <select className="gov-select" value={permission} onChange={(e) => setPermission(e.target.value)}>
                    <option value="FORENSIC_ANALYSIS">Forensic Analysis (Raw Bitstream)</option>
                    <option value="PROSECUTION_REVIEW">Prosecution Scrutiny</option>
                    <option value="READ_ONLY">Read-Only (Watermarked)</option>
                  </select>
                </div>

                <div>
                  <label className="gov-label">Access Duration (Days)</label>
                  <input
                    type="number"
                    className="gov-input"
                    min="1"
                    max="90"
                    value={validityDays}
                    onChange={(e) => setValidityDays(parseInt(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowShareModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={sharing}>
                  {sharing ? <RefreshCw className="animate-spin" size={16} /> : <Share2 size={16} />}
                  Grant Wrapped Key &amp; Log Custody
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IN-MEMORY WATERMARKED VIEWER */}
      {viewingDocId && (
        <WatermarkViewer
          docId={viewingDocId}
          onClose={() => setViewingDocId(null)}
        />
      )}
    </div>
  );
};
