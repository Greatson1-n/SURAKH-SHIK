import React, { useState, useEffect } from "react";
import { Users, UserPlus, Laptop, ShieldAlert, History, RefreshCw, Layers } from "lucide-react";
import { api, API_BASE } from "../services/api";
import { BlockExplorer } from "../components/BlockExplorer";

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"USERS" | "DEVICES" | "BLOCKCHAIN" | "AUDIT">("USERS");
  const [users, setUsers] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // New User Form State
  const [badgeId, setBadgeId] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("INVESTIGATING_OFFICER");
  const [branch, setBranch] = useState("Local Police");
  const [state, setState] = useState("Manipur");
  const [district, setDistrict] = useState("Imphal West");
  const [stationId, setStationId] = useState("City Police Station");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [formMsg, setFormMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const revokeReason = "Field Laptop Lost / Suspected Breach";

  const loadData = async () => {
    try {
      const [uRes, dRes, aRes] = await Promise.all([
        api.getUsers(),
        api.getDevices(),
        api.getAuditLogs(),
      ]);
      setUsers(uRes.users || []);
      setDevices(dRes.devices || []);
      setAuditLogs(aRes.audit_logs || []);
    } catch (err) {
      console.error("Admin data load error:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoFile) {
      setFormMsg({ text: "Official departmental photograph is mandatory for 2FA Face Biometrics.", type: "error" });
      return;
    }

    setSubmitting(true);
    setFormMsg(null);
    try {
      const fd = new FormData();
      fd.append("badge_id", badgeId);
      fd.append("full_name", fullName);
      fd.append("password", password);
      fd.append("role", role);
      fd.append("branch", branch);
      fd.append("state", state);
      fd.append("district", district);
      fd.append("station_id", stationId);
      fd.append("photo", photoFile);

      await api.createUser(fd);
      setFormMsg({ text: `Departmental user '${fullName}' (${badgeId}) successfully onboarded with Face 2FA.`, type: "success" });
      
      // Reset form
      setBadgeId("");
      setFullName("");
      setPassword("");
      setPhotoFile(null);
      loadData();
    } catch (err: any) {
      setFormMsg({ text: err.message || "Failed to create user.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeDevice = async (deviceId: string) => {
    if (!confirm(`Are you sure you want to trigger the Remote Kill Switch for ${deviceId}?`)) return;
    try {
      await api.revokeDevice(deviceId, revokeReason);
      alert(`Device ${deviceId} is now REVOKED.`);
      loadData();
    } catch (err: any) {
      alert("Revoke failed.");
    }
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px" }}>
      {/* Admin Title & Blind Admin Rule Banner */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
          <div>
            <h1 style={{ fontSize: "1.7rem", color: "#f8fafc", marginBottom: "4px" }}>
              IT Security &amp; Identity Administration Console
            </h1>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              National Crime Records Bureau &bull; Closed-Loop Identity &amp; Device Provisioning
            </p>
          </div>
          <span className="gov-badge badge-gold" style={{ padding: "6px 14px", fontSize: "0.8rem" }}>
            Supervisory Admin: ADM-IT-SURAKH
          </span>
        </div>

        <div className="gov-card" style={{ background: "rgba(30, 58, 138, 0.15)", borderLeft: "4px solid #3b82f6" }}>
          <strong style={{ color: "#93c5fd", fontSize: "0.88rem" }}>The "Blind Admin" Rule (Separation of Powers):</strong>
          <p style={{ fontSize: "0.82rem", color: "#cbd5e1", marginTop: "4px" }}>
            Under institutional cybersecurity guidelines, the System Administrator manages users, hardware tokens, and consortium nodes,
            but <strong>has ZERO power to view, decrypt, or tamper with confidential criminal case files or victim identities</strong>.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "10px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px", marginBottom: "24px" }}>
        <button 
          className={`btn ${activeTab === "USERS" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("USERS")}
        >
          <UserPlus size={16} />
          User Provisioning
        </button>
        <button 
          className={`btn ${activeTab === "DEVICES" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("DEVICES")}
        >
          <Laptop size={16} />
          Authorized Laptops &amp; Kill Switch
        </button>
        <button 
          className={`btn ${activeTab === "BLOCKCHAIN" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("BLOCKCHAIN")}
        >
          <Layers size={16} />
          Consortium Ledger Explorer
        </button>
        <button 
          className={`btn ${activeTab === "AUDIT" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("AUDIT")}
        >
          <History size={16} />
          Security Audit Logs
        </button>
      </div>

      {/* TAB 1: USER PROVISIONING */}
      {activeTab === "USERS" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "24px" }}>
          {/* Create User Form */}
          <div className="gov-card">
            <h3 style={{ fontSize: "1.15rem", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <UserPlus size={18} color="#38bdf8" />
              Onboard Verified Departmental Officer
            </h3>

            {formMsg && (
              <div style={{
                padding: "10px 14px",
                borderRadius: "var(--radius-md)",
                marginBottom: "16px",
                fontSize: "0.82rem",
                background: formMsg.type === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                border: `1px solid ${formMsg.type === "success" ? "#10b981" : "#ef4444"}`,
                color: formMsg.type === "success" ? "#6ee7b7" : "#fca5a5"
              }}>
                {formMsg.text}
              </div>
            )}

            <form onSubmit={handleCreateUser}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label className="gov-label">Badge / Official ID</label>
                  <input
                    type="text"
                    className="gov-input mono"
                    placeholder="e.g. MN-IO-4091"
                    value={badgeId}
                    onChange={(e) => setBadgeId(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="gov-label">Full Name &amp; Designation</label>
                  <input
                    type="text"
                    className="gov-input"
                    placeholder="e.g. Sub-Inspector R. Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label className="gov-label">Temporary Password</label>
                  <input
                    type="password"
                    className="gov-input"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="gov-label">Assigned Role</label>
                  <select className="gov-select" value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="INVESTIGATING_OFFICER">Investigating Officer (IO)</option>
                    <option value="STATION_HOUSE_OFFICER">Station House Officer (SHO)</option>
                    <option value="FORENSIC_ANALYST">Forensic Science Analyst (FSL)</option>
                    <option value="JUDICIAL_MAGISTRATE">Judicial Magistrate / Judge</option>
                    <option value="PUBLIC_PROSECUTOR">Public Prosecutor</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label className="gov-label">Branch / Cell</label>
                  <select className="gov-select" value={branch} onChange={(e) => setBranch(e.target.value)}>
                    <option value="Local Police">Local Police (Law &amp; Order)</option>
                    <option value="Women Safety Division">Women Safety Division (POCSO/Assault)</option>
                    <option value="Cyber Crime Cell">Cyber Crime Investigation Unit</option>
                    <option value="CFSL Cyber Forensics">CFSL Cyber Forensics Lab</option>
                    <option value="CFSL DNA Division">CFSL Biology &amp; DNA Lab</option>
                    <option value="Judiciary">District &amp; Sessions Judiciary</option>
                  </select>
                </div>
                <div>
                  <label className="gov-label">State / Union Territory</label>
                  <select className="gov-select" value={state} onChange={(e) => setState(e.target.value)}>
                    <option value="Manipur">Manipur</option>
                    <option value="Delhi">Delhi (NCT)</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Assam">Assam</option>
                    <option value="National">National / Central Directorate</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <label className="gov-label">District / Zone</label>
                  <input
                    type="text"
                    className="gov-input"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="gov-label">Police Station / Court Unit</label>
                  <input
                    type="text"
                    className="gov-input"
                    value={stationId}
                    onChange={(e) => setStationId(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label className="gov-label">Official Photo (Mandatory for Face 2FA)</label>
                <input
                  type="file"
                  accept="image/*"
                  className="gov-input"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  required
                />
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                  Used to generate the 128-D cryptographic facial vector during officer login.
                </span>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={submitting}>
                {submitting ? <RefreshCw className="animate-spin" size={16} /> : <UserPlus size={16} />}
                Create Departmental User &amp; Enroll Face 2FA
              </button>
            </form>
          </div>

          {/* Active Users List */}
          <div className="gov-card">
            <h3 style={{ fontSize: "1.15rem", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Users size={18} color="#38bdf8" />
              Enrolled Departmental Personnel ({users.length})
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "560px", overflowY: "auto" }}>
              {users.map((u) => (
                <div
                  key={u.id}
                  style={{
                    background: "#061120",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    padding: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px"
                  }}
                >
                  <div style={{
                    width: "44px",
                    height: "54px",
                    borderRadius: "4px",
                    overflow: "hidden",
                    border: "1px solid var(--border-bright)",
                    background: "#020617"
                  }}>
                    <img
                      src={`${API_BASE}/photos/${u.photo_path}`}
                      alt={u.full_name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e: any) => {
                        e.target.src = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200";
                      }}
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <strong style={{ fontSize: "0.9rem", color: "#f8fafc" }}>{u.full_name}</strong>
                      <span className="mono gov-badge badge-blue" style={{ fontSize: "0.68rem" }}>{u.badge_id}</span>
                    </div>
                    <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                      {u.role} &bull; {u.branch}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      <strong style={{ color: "#38bdf8" }}>{u.state}</strong> &bull; {u.station_id}
                    </div>
                  </div>

                  <div>
                    <span className="gov-badge badge-green" style={{ fontSize: "0.68rem" }}>
                      2FA ENROLLED
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HARDWARE LAPTOPS & REMOTE KILL SWITCH */}
      {activeTab === "DEVICES" && (
        <div className="gov-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h3 style={{ fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <Laptop size={20} color="#38bdf8" />
                Departmental Laptops &amp; Terminals Inventory
              </h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                Cryptographic Hardware Binding &bull; Remote Kill Switch Protection
              </p>
            </div>
            <button className="btn btn-secondary" onClick={loadData}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "#061120", textAlign: "left", borderBottom: "1px solid var(--border-subtle)" }}>
                <th style={{ padding: "12px" }}>Device Token (UUID)</th>
                <th style={{ padding: "12px" }}>Asset Tag / Serial</th>
                <th style={{ padding: "12px" }}>Assigned Station</th>
                <th style={{ padding: "12px" }}>Status</th>
                <th style={{ padding: "12px" }}>Last Seen</th>
                <th style={{ padding: "12px", textAlign: "right" }}>Emergency Control</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => (
                <tr key={d.device_id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td className="mono" style={{ padding: "12px", color: "#38bdf8" }}>{d.device_id}</td>
                  <td style={{ padding: "12px", fontWeight: 600 }}>{d.asset_tag}</td>
                  <td style={{ padding: "12px", color: "var(--text-secondary)" }}>{d.assigned_station}</td>
                  <td style={{ padding: "12px" }}>
                    <span className={`gov-badge ${d.status === "ACTIVE" ? "badge-green" : "badge-red"}`}>
                      {d.status}
                    </span>
                  </td>
                  <td style={{ padding: "12px", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    {new Date(d.last_seen_at || d.enrolled_at).toLocaleString()}
                  </td>
                  <td style={{ padding: "12px", textAlign: "right" }}>
                    {d.status === "ACTIVE" ? (
                      <button
                        className="btn btn-danger"
                        style={{ padding: "4px 10px", fontSize: "0.74rem" }}
                        onClick={() => handleRevokeDevice(d.device_id)}
                        title="Immediately blacklists this machine if lost or stolen"
                      >
                        <ShieldAlert size={14} />
                        Remote Kill
                      </button>
                    ) : (
                      <span style={{ fontSize: "0.76rem", color: "#fca5a5" }}>Revoked / Quarantined</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: BLOCKCHAIN EXPLORER */}
      {activeTab === "BLOCKCHAIN" && (
        <BlockExplorer />
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeTab === "AUDIT" && (
        <div className="gov-card">
          <h3 style={{ fontSize: "1.2rem", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <History size={20} color="#38bdf8" />
            Immutable Security Audit Trail
          </h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ background: "#061120", textAlign: "left", borderBottom: "1px solid var(--border-subtle)" }}>
                <th style={{ padding: "10px" }}>Timestamp</th>
                <th style={{ padding: "10px" }}>Actor Badge</th>
                <th style={{ padding: "10px" }}>Role</th>
                <th style={{ padding: "10px" }}>Action</th>
                <th style={{ padding: "10px" }}>Target Reference</th>
                <th style={{ padding: "10px" }}>Terminal Device</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((a) => (
                <tr key={a.log_id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "10px", color: "var(--text-muted)" }}>{new Date(a.timestamp).toLocaleString()}</td>
                  <td className="mono" style={{ padding: "10px", color: "#38bdf8", fontWeight: 700 }}>{a.actor_badge}</td>
                  <td style={{ padding: "10px" }}>{a.actor_role}</td>
                  <td style={{ padding: "10px", fontWeight: 600, color: a.action.includes("ALERT") ? "#f87171" : "#e2e8f0" }}>
                    {a.action}
                  </td>
                  <td style={{ padding: "10px", color: "var(--text-secondary)" }}>{a.target_ref}</td>
                  <td className="mono" style={{ padding: "10px", fontSize: "0.74rem" }}>{a.device_id.slice(0, 18)}...</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
