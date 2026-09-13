import React, { useState, useEffect } from "react";
import { 
  Users, UserPlus, Laptop, ShieldAlert, History, RefreshCw, Layers, UserX, AlertTriangle, 
  Activity, ShieldCheck, Search, HardDrive, Cpu, CheckCircle2, XCircle, AlertCircle,
  MapPin, Building2, Award, KeyRound, Camera, Sparkles
} from "lucide-react";
import { api, API_BASE } from "../services/api";
import { BlockExplorer } from "../components/BlockExplorer";
import { 
  INDIA_STATES, 
  INDIA_DISTRICTS, 
  DEPARTMENTS, 
  generateBadgeId, 
  formatNameSlug,
  getDepartmentFacilities 
} from "../data/indiaLocations";

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"USERS" | "DEVICES" | "HEALTH" | "WATCHDOG" | "BLOCKCHAIN" | "AUDIT">("USERS");
  const [users, setUsers] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Health Telemetry State
  const [healthData, setHealthData] = useState<any | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // Watchdog Scan State
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [scanning, setScanning] = useState(false);

  // Hash Inspector State
  const [hashQuery, setHashQuery] = useState("");
  const [hashResult, setHashResult] = useState<any | null>(null);
  const [hashSearching, setHashSearching] = useState(false);

  // Dynamic User Form State
  const [selectedState, setSelectedState] = useState("Manipur");
  const [selectedDistrict, setSelectedDistrict] = useState("Imphal West");
  const [selectedDeptId, setSelectedDeptId] = useState("POLICE");
  const [selectedRankId, setSelectedRankId] = useState("IO");
  const [fullName, setFullName] = useState("");
  const [badgeId, setBadgeId] = useState("POL-IO-IMP");
  const [isManualBadge, setIsManualBadge] = useState(false);
  const [password, setPassword] = useState("");
  const [stationId, setStationId] = useState("City / Headquarters Police Station (Imphal West)");
  const [isCustomStation, setIsCustomStation] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [formMsg, setFormMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // User Termination Modal State
  const [terminatingUser, setTerminatingUser] = useState<any | null>(null);
  const [terminationReason, setTerminationReason] = useState("Illegal system access / Violation of Section 66 IT Act");
  const [isPermanentDelete, setIsPermanentDelete] = useState(false);
  const [terminatingLoading, setTerminatingLoading] = useState(false);

  const revokeReason = "Field Laptop Lost / Suspected Breach";

  const loadData = async () => {
    try {
      const [uRes, dRes, aRes] = await Promise.all([
        api.getUsers(),
        api.getDevices(),
        api.getAuditLogs(),
      ]);
      let currentUsers = uRes.users || [];

      // Auto-reconciliation: ensure provisioned officers are preserved across cloud container cold restarts
      try {
        const savedRaw = localStorage.getItem("SURAKH_SAVED_OFFICERS");
        if (savedRaw) {
          const savedOfficers = JSON.parse(savedRaw);
          if (Array.isArray(savedOfficers) && savedOfficers.length > 0) {
            const missing = savedOfficers.filter(
              (so: any) => !currentUsers.some((u: any) => u.badge_id === so.badge_id)
            );
            if (missing.length > 0) {
              await api.reconcileUsers(missing);
              const refreshed = await api.getUsers();
              currentUsers = refreshed.users || currentUsers;
            }
          }
        }
      } catch (recErr) {
        console.warn("Officer auto-reconcile error:", recErr);
      }

      setUsers(currentUsers);
      setDevices(dRes.devices || []);
      setAuditLogs(aRes.audit_logs || []);
    } catch (err) {
      console.error("Admin data load error:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const currentDept = DEPARTMENTS.find((d) => d.id === selectedDeptId) || DEPARTMENTS[0];
  const currentRank = currentDept.ranks.find((r) => r.id === selectedRankId) || currentDept.ranks[0];
  const districtList = INDIA_DISTRICTS[selectedState] || [];
  const currentDistObj = districtList.find((d) => d.name === selectedDistrict) || districtList[0] || { name: selectedDistrict, code: "IMP" };
  const currentDistCode = currentDistObj.code;
  const currentRole = currentRank.role;
  const currentBranch = currentDept.name;
  const suggestedFacilities = getDepartmentFacilities(selectedState, selectedDistrict, selectedDeptId);

  // Real-time Badge ID / Username Auto-generation
  useEffect(() => {
    if (!isManualBadge) {
      const generated = generateBadgeId(currentDept.code, currentRank.code, currentDistCode, fullName);
      setBadgeId(generated);
    }
  }, [selectedDeptId, selectedRankId, currentDistCode, fullName, isManualBadge]);

  const handleStateChange = (newState: string) => {
    setSelectedState(newState);
    const newDistList = INDIA_DISTRICTS[newState] || [];
    const newDistrict = newDistList.length > 0 ? newDistList[0].name : "";
    setSelectedDistrict(newDistrict);
    if (!isCustomStation) {
      const facs = getDepartmentFacilities(newState, newDistrict, selectedDeptId);
      if (facs.length > 0) setStationId(facs[0].name);
    }
  };

  const handleDistrictChange = (newDistrict: string) => {
    setSelectedDistrict(newDistrict);
    if (!isCustomStation) {
      const facs = getDepartmentFacilities(selectedState, newDistrict, selectedDeptId);
      if (facs.length > 0) setStationId(facs[0].name);
    }
  };

  const handleDeptChange = (newDeptId: string) => {
    setSelectedDeptId(newDeptId);
    const dept = DEPARTMENTS.find((d) => d.id === newDeptId) || DEPARTMENTS[0];
    if (dept.ranks.length > 0) {
      setSelectedRankId(dept.ranks[0].id);
    }
    if (!isCustomStation) {
      const facs = getDepartmentFacilities(selectedState, selectedDistrict, newDeptId);
      if (facs.length > 0) setStationId(facs[0].name);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setPhotoFile(f);
    if (f) {
      const r = new FileReader();
      r.onload = () => setPhotoPreview(r.result as string);
      r.readAsDataURL(f);
    } else {
      setPhotoPreview(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!badgeId.trim()) {
      setFormMsg({ text: "Badge ID / Username is required.", type: "error" });
      return;
    }
    if (!fullName.trim()) {
      setFormMsg({ text: "Official full name is required.", type: "error" });
      return;
    }
    if (!password.trim()) {
      setFormMsg({ text: "Temporary password is required.", type: "error" });
      return;
    }

    setSubmitting(true);
    setFormMsg(null);
    try {
      const fd = new FormData();
      fd.append("badge_id", badgeId.trim());
      fd.append("full_name", fullName.trim());
      fd.append("password", password);
      fd.append("role", currentRole);
      fd.append("branch", currentBranch);
      fd.append("state", selectedState);
      fd.append("district", selectedDistrict);
      fd.append("station_id", stationId);
      if (photoFile) {
        fd.append("photo", photoFile);
      }

      await api.createUser(fd);
      const enrollmentNote = photoFile 
        ? "with official photo template." 
        : "with webcam live enrollment on first login (TOFU).";
      setFormMsg({ 
        text: `Departmental user '${fullName}' (${badgeId.trim()}) successfully onboarded ${enrollmentNote}`, 
        type: "success" 
      });
      
      // Sync to local backup so user never vanishes across container cold restarts
      try {
        const savedRaw = localStorage.getItem("SURAKH_SAVED_OFFICERS");
        const list = savedRaw ? JSON.parse(savedRaw) : [];
        const newOfficer = {
          badge_id: badgeId.trim(),
          full_name: fullName.trim(),
          role: currentRole,
          branch: currentBranch,
          state: selectedState,
          district: selectedDistrict,
          station_id: stationId,
          is_biometric_enrolled: photoFile ? 1 : 0,
          is_active: 1
        };
        const updated = [...list.filter((x: any) => x.badge_id !== badgeId.trim()), newOfficer];
        localStorage.setItem("SURAKH_SAVED_OFFICERS", JSON.stringify(updated));
      } catch (e) {
        console.warn("Failed to backup officer locally:", e);
      }

      // Reset form
      setFullName("");
      setPassword("");
      setPhotoFile(null);
      setPhotoPreview(null);
      setIsManualBadge(false);
      loadData();
    } catch (err: any) {
      setFormMsg({ text: err.message || "Failed to create user.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeDevice = async (deviceId: string) => {
    if (!confirm(`Are you sure you want to trigger the Remote Kill Switch for ${deviceId}? This laptop will be immediately blocked from accessing SURAKH-SHIK.`)) return;
    try {
      await api.revokeDevice(deviceId, revokeReason);
      alert(`Terminal ${deviceId} is now REVOKED via Remote Kill Switch.`);
      loadData();
    } catch (err: any) {
      alert("Revoke failed.");
    }
  };

  const handleReinstateDevice = async (deviceId: string) => {
    if (!confirm(`Restore access for terminal ${deviceId}? This will lift the kill switch lockout.`)) return;
    try {
      await api.reinstateDevice(deviceId, "Reinstated by Departmental IT Admin");
      alert(`Terminal ${deviceId} has been reinstated to ACTIVE status.`);
      loadData();
    } catch (err: any) {
      alert("Failed to reinstate device.");
    }
  };

  const handleTerminateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminatingUser) return;
    setTerminatingLoading(true);
    try {
      const res = await api.terminateUser({
        badge_id: terminatingUser.badge_id,
        reason: terminationReason,
        permanent_delete: isPermanentDelete,
      });

      if (isPermanentDelete) {
        try {
          const savedRaw = localStorage.getItem("SURAKH_SAVED_OFFICERS");
          if (savedRaw) {
            const list = JSON.parse(savedRaw);
            const filtered = list.filter((x: any) => x.badge_id !== terminatingUser.badge_id);
            localStorage.setItem("SURAKH_SAVED_OFFICERS", JSON.stringify(filtered));
          }
        } catch (e) {
          console.warn("Failed to update local officer backup:", e);
        }
      }

      alert(res.message);
      setTerminatingUser(null);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to terminate user.");
    } finally {
      setTerminatingLoading(false);
    }
  };

  const handleReinstateUser = async (u: any) => {
    if (!confirm(`Restore full access for officer '${u.full_name}' (${u.badge_id})? This will unfreeze their credentials and allow them to log in.`)) {
      return;
    }
    try {
      const res = await api.reinstateUser({
        badge_id: u.badge_id,
        reason: "Access clearance granted and reinstated by IT Administration"
      });
      alert(res.message);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to reinstate user.");
    }
  };

  const fetchHealth = async () => {
    setHealthLoading(true);
    try {
      const data = await api.getSystemHealth();
      setHealthData(data);
    } catch (err) {
      console.error("Health fetch error:", err);
    } finally {
      setHealthLoading(false);
    }
  };

  const handleTamperScan = async () => {
    setScanning(true);
    try {
      const res = await api.runTamperScan();
      setScanResult(res);
    } catch (err: any) {
      alert(err.message || "Watchdog scan failed.");
    } finally {
      setScanning(false);
    }
  };

  const handleLookupHash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hashQuery.trim()) return;
    setHashSearching(true);
    try {
      const res = await api.lookupHash(hashQuery.trim());
      setHashResult(res);
    } catch (err: any) {
      alert("Hash query failed.");
    } finally {
      setHashSearching(false);
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
              National Crime Records Bureau &bull; Infrastructure Health, Device Binding &amp; Tamper Watchdog
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
      <div style={{ display: "flex", gap: "10px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
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
          className={`btn ${activeTab === "HEALTH" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => {
            setActiveTab("HEALTH");
            fetchHealth();
          }}
        >
          <Activity size={16} />
          System Health &amp; Telemetry
        </button>
        <button 
          className={`btn ${activeTab === "WATCHDOG" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("WATCHDOG")}
        >
          <ShieldAlert size={16} color="#f87171" />
          Global Tamper Watchdog
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
              {/* STEP 1: JURISDICTION & LOCATION */}
              <div style={{
                background: "rgba(15, 23, 42, 0.6)",
                padding: "12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid rgba(56, 189, 248, 0.2)",
                marginBottom: "14px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px", color: "#38bdf8", fontSize: "0.82rem", fontWeight: 600 }}>
                  <MapPin size={14} />
                  <span>1. Location Jurisdiction (Mandatory)</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label className="gov-label" style={{ fontSize: "0.75rem" }}>State / Union Territory</label>
                    <select 
                      className="gov-select" 
                      value={selectedState} 
                      onChange={(e) => handleStateChange(e.target.value)}
                      required
                    >
                      {INDIA_STATES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="gov-label" style={{ fontSize: "0.75rem" }}>
                      District / Zone ({districtList.length} in {selectedState})
                    </label>
                    <select 
                      className="gov-select" 
                      value={selectedDistrict} 
                      onChange={(e) => handleDistrictChange(e.target.value)}
                      required
                    >
                      {districtList.map((dst) => (
                        <option key={dst.name} value={dst.name}>
                          {dst.name} ({dst.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* STEP 2: DEPARTMENT & RANK */}
              <div style={{
                background: "rgba(15, 23, 42, 0.6)",
                padding: "12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid rgba(56, 189, 248, 0.2)",
                marginBottom: "14px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px", color: "#38bdf8", fontSize: "0.82rem", fontWeight: 600 }}>
                  <Building2 size={14} />
                  <span>2. Department &amp; Rank Assignment (Mandatory)</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label className="gov-label" style={{ fontSize: "0.75rem" }}>Department / Wing</label>
                    <select 
                      className="gov-select" 
                      value={selectedDeptId} 
                      onChange={(e) => handleDeptChange(e.target.value)}
                      required
                    >
                      {DEPARTMENTS.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.code} - {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="gov-label" style={{ fontSize: "0.75rem" }}>Rank / Official Designation</label>
                    <select 
                      className="gov-select" 
                      value={selectedRankId} 
                      onChange={(e) => setSelectedRankId(e.target.value)}
                      required
                    >
                      {currentDept.ranks.map((r) => (
                        <option key={r.id} value={r.id}>
                          {currentDept.code}-{r.code}: {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* STEP 3: OFFICER NAME & SMART USERNAME GENERATION */}
              <div style={{
                background: "rgba(15, 23, 42, 0.6)",
                padding: "12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                marginBottom: "14px"
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#10b981", fontSize: "0.82rem", fontWeight: 600 }}>
                    <Award size={14} />
                    <span>3. Officer Identity &amp; Sovereign Username</span>
                  </div>
                  {isManualBadge && (
                    <button
                      type="button"
                      onClick={() => setIsManualBadge(false)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#38bdf8",
                        fontSize: "0.7rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      <Sparkles size={12} />
                      Reset to Auto
                    </button>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "8px" }}>
                  <div>
                    <label className="gov-label" style={{ fontSize: "0.75rem" }}>Officer Full Name</label>
                    <input
                      type="text"
                      className="gov-input"
                      placeholder="e.g. Klinton"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="gov-label" style={{ fontSize: "0.75rem" }}>
                      Assigned Username / Badge ID
                    </label>
                    <input
                      type="text"
                      className="gov-input mono"
                      placeholder="e.g. POL-IO-IMP-KLNTON"
                      value={badgeId}
                      onChange={(e) => {
                        setBadgeId(e.target.value);
                        setIsManualBadge(true);
                      }}
                      style={{
                        color: "#38bdf8",
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                        border: isManualBadge ? "1px solid #f59e0b" : "1px solid rgba(56, 189, 248, 0.4)"
                      }}
                      required
                    />
                  </div>
                </div>

                {/* Live Breakdown Badges */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "6px",
                  fontSize: "0.7rem",
                  background: "rgba(2, 6, 23, 0.6)",
                  padding: "6px 10px",
                  borderRadius: "4px",
                  border: "1px dashed rgba(148, 163, 184, 0.2)"
                }}>
                  <span style={{ color: "var(--text-muted)" }}>Format Breakdown:</span>
                  <span className="mono" style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", padding: "1px 5px", borderRadius: "3px" }}>
                    {currentDept.code} ({currentDept.id})
                  </span>
                  <span style={{ color: "var(--text-muted)" }}>-</span>
                  <span className="mono" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "1px 5px", borderRadius: "3px" }}>
                    {currentRank.code} ({currentRank.id})
                  </span>
                  <span style={{ color: "var(--text-muted)" }}>-</span>
                  <span className="mono" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", padding: "1px 5px", borderRadius: "3px" }}>
                    {currentDistCode} ({selectedDistrict})
                  </span>
                  <span style={{ color: "var(--text-muted)" }}>-</span>
                  <span className="mono" style={{ background: "rgba(168, 85, 247, 0.15)", color: "#c084fc", padding: "1px 5px", borderRadius: "3px" }}>
                    {formatNameSlug(fullName) || "NAME"}
                  </span>
                </div>
              </div>

              {/* STEP 4: STATION / UNIT & PASSWORD */}
              <div style={{
                background: "rgba(15, 23, 42, 0.6)",
                padding: "12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid rgba(56, 189, 248, 0.2)",
                marginBottom: "14px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px", color: "#38bdf8", fontSize: "0.82rem", fontWeight: 600 }}>
                  <KeyRound size={14} />
                  <span>4. Posting Unit &amp; Authentication</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <label className="gov-label" style={{ fontSize: "0.75rem", marginBottom: 0 }}>
                        Assigned Unit / Lab / Court Bench
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsCustomStation(!isCustomStation)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#38bdf8",
                          fontSize: "0.7rem",
                          cursor: "pointer",
                          textDecoration: "underline"
                        }}
                      >
                        {isCustomStation ? "Pick Suggested Unit" : "+ Custom Unit"}
                      </button>
                    </div>

                    {isCustomStation ? (
                      <input
                        type="text"
                        className="gov-input"
                        placeholder="e.g. Special Cyber Cell or SFSL Pangei"
                        value={stationId}
                        onChange={(e) => setStationId(e.target.value)}
                        required
                      />
                    ) : (
                      <select
                        className="gov-select"
                        value={stationId}
                        onChange={(e) => {
                          if (e.target.value === "__CUSTOM__") {
                            setIsCustomStation(true);
                            setStationId("");
                          } else {
                            setStationId(e.target.value);
                          }
                        }}
                        required
                      >
                        {suggestedFacilities.map((fac) => (
                          <option key={fac.code} value={fac.name}>
                            {fac.name}
                          </option>
                        ))}
                        <option value="__CUSTOM__">Other / Enter Custom Unit...</option>
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="gov-label" style={{ fontSize: "0.75rem" }}>Temporary Password</label>
                    <input
                      type="password"
                      className="gov-input"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="gov-label" style={{ fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Camera size={14} />
                    Official Photo (Optional — Live Webcam Enrollment Available)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    className="gov-input"
                    onChange={handlePhotoSelect}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "8px" }}>
                    {photoPreview && (
                      <div style={{
                        width: "46px",
                        height: "56px",
                        borderRadius: "4px",
                        overflow: "hidden",
                        border: "1px solid #10b981",
                        flexShrink: 0
                      }}>
                        <img src={photoPreview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    )}
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      {photoFile ? (
                        <span style={{ color: "#34d399" }}>Photo attached ({photoFile.name}): Pre-seeding biometric template.</span>
                      ) : (
                        <span>No photo uploaded? The officer can 1-click register their live face via webcam upon first login (TOFU).</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "12px" }} disabled={submitting}>
                {submitting ? <RefreshCw className="animate-spin" size={16} /> : <UserPlus size={16} />}
                Provision Credential ({badgeId || "USER"}) &amp; Enable Sovereign Access
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

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                    <span className={`gov-badge ${u.is_active === 1 ? "badge-green" : "badge-red"}`} style={{ fontSize: "0.68rem" }}>
                      {u.is_active === 1 ? "ACTIVE (2FA)" : "SUSPENDED / LOCKED"}
                    </span>
                    {u.badge_id !== "ADM-IT-SURAKH" && (
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                        {u.is_active === 0 ? (
                          <button
                            className="btn btn-primary"
                            style={{ 
                              padding: "4px 10px", 
                              fontSize: "0.72rem", 
                              background: "#059669", 
                              borderColor: "#10b981", 
                              color: "#ecfdf5",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                            onClick={() => handleReinstateUser(u)}
                            title="Restore access for this suspended account"
                          >
                            <CheckCircle2 size={12} />
                            Grant Re-Access
                          </button>
                        ) : (
                          <button
                            className="btn btn-secondary"
                            style={{ 
                              padding: "4px 8px", 
                              fontSize: "0.72rem", 
                              color: "#fde68a", 
                              borderColor: "rgba(245, 158, 11, 0.4)",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                            onClick={() => {
                              setTerminatingUser(u);
                              setIsPermanentDelete(false);
                              setTerminationReason("Temporary disciplinary suspension / Under review");
                            }}
                            title="Temporarily freeze access for this officer"
                          >
                            <AlertTriangle size={12} />
                            Suspend
                          </button>
                        )}
                        <button
                          className="btn btn-secondary"
                          style={{ 
                            padding: "4px 8px", 
                            fontSize: "0.72rem", 
                            color: "#fca5a5", 
                            borderColor: "rgba(239, 68, 68, 0.4)",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                          onClick={() => {
                            setTerminatingUser(u);
                            setIsPermanentDelete(true);
                            setTerminationReason("Permanent departure / Record expunged");
                          }}
                          title="Permanently delete this user from database and registry"
                        >
                          <UserX size={12} />
                          Delete
                        </button>
                      </div>
                    )}
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
                      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", alignItems: "center" }}>
                        <span style={{ fontSize: "0.76rem", color: "#fca5a5" }}>Revoked / Quarantined</span>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: "3px 8px", fontSize: "0.72rem", borderColor: "#10b981", color: "#6ee7b7" }}
                          onClick={() => handleReinstateDevice(d.device_id)}
                          title="Lift Remote Kill lockout and reinstate terminal"
                        >
                          Reinstate
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: SYSTEM HEALTH & TELEMETRY */}
      {activeTab === "HEALTH" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Top Status & Controls */}
          <div className="gov-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                background: "rgba(16, 185, 129, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(16, 185, 129, 0.3)"
              }}>
                <Activity size={24} color="#10b981" />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <h3 style={{ fontSize: "1.25rem", color: "#f8fafc", margin: 0 }}>System Telemetry &amp; Node Health</h3>
                  <span className="gov-badge badge-green" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981" }}></span>
                    ALL SYSTEMS NOMINAL
                  </span>
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                  Real-time cryptographic heartbeat, database storage metrics &amp; consortium peer synchronization
                </p>
              </div>
            </div>

            <button 
              className="btn btn-secondary" 
              onClick={fetchHealth} 
              disabled={healthLoading}
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              <RefreshCw size={14} className={healthLoading ? "animate-spin" : ""} />
              {healthLoading ? "Syncing Telemetry..." : "Refresh Health"}
            </button>
          </div>

          {healthData && (
            <>
              {/* Telemetry Metric Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
                {/* Database Metrics */}
                <div className="gov-card">
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                    <HardDrive size={18} color="#38bdf8" />
                    <strong style={{ fontSize: "0.95rem", color: "#f8fafc" }}>Relational Database</strong>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.82rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Engine:</span>
                      <strong style={{ color: "#e2e8f0" }}>{healthData.database.engine}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Journaling:</span>
                      <span className="gov-badge badge-blue">{healthData.database.journal_mode}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Storage Size:</span>
                      <span className="mono" style={{ color: "#38bdf8", fontWeight: 700 }}>{healthData.database.size_kb} KB</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Total Users:</span>
                      <span className="mono" style={{ fontWeight: 600 }}>{healthData.database.total_users} accounts</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Active Bound Laptops:</span>
                      <span className="mono" style={{ color: "#10b981", fontWeight: 600 }}>{healthData.database.active_devices} online</span>
                    </div>
                  </div>
                </div>

                {/* Vault Metrics */}
                <div className="gov-card">
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                    <ShieldCheck size={18} color="#10b981" />
                    <strong style={{ fontSize: "0.95rem", color: "#f8fafc" }}>Cryptographic Storage Vault</strong>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.82rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Cipher Mode:</span>
                      <strong style={{ color: "#10b981" }}>AES-256-GCM (DEK/KEK)</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Encrypted Artifacts:</span>
                      <span className="mono" style={{ color: "#38bdf8", fontWeight: 700 }}>{healthData.vault.encrypted_files} .enc files</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Vault Size on Disk:</span>
                      <span className="mono" style={{ fontWeight: 600 }}>{healthData.vault.vault_size_kb} KB</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>HSM Emulation:</span>
                      <span className="gov-badge badge-green" style={{ fontSize: "0.7rem" }}>FIPS 140-2 Level 3</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Disk Leak Protection:</span>
                      <strong style={{ color: "#6ee7b7" }}>100% In-Memory Decryption</strong>
                    </div>
                  </div>
                </div>

                {/* Blockchain Consensus Metrics */}
                <div className="gov-card">
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                    <Layers size={18} color="#eab308" />
                    <strong style={{ fontSize: "0.95rem", color: "#f8fafc" }}>Consortium Blockchain</strong>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.82rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Consensus Protocol:</span>
                      <strong style={{ color: "#eab308" }}>Raft CFT (Crash Fault Tolerant)</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Ledger Block Height:</span>
                      <span className="mono" style={{ color: "#38bdf8", fontWeight: 800 }}>#{healthData.consortium_ledger.total_blocks}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Sync Status:</span>
                      <span className="gov-badge badge-green">{healthData.consortium_ledger.status}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Latest Block Hash:</span>
                      <span className="mono" style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                        {healthData.consortium_ledger.latest_hash ? healthData.consortium_ledger.latest_hash.slice(0, 16) + "..." : "Genesis"}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Block Latency:</span>
                      <span className="mono" style={{ color: "#10b981" }}>&lt; 2.5 ms</span>
                    </div>
                  </div>
                </div>

                {/* Zero Trust Security Gateways */}
                <div className="gov-card">
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                    <Cpu size={18} color="#a855f7" />
                    <strong style={{ fontSize: "0.95rem", color: "#f8fafc" }}>Zero Trust Policy Gateways</strong>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.82rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Hardware Token Gate:</span>
                      <span className="gov-badge badge-blue">ACTIVE ENFORCEMENT</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Face Biometric 2FA:</span>
                      <span className="gov-badge badge-green">LIVE VERIFIED</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Anti-Spoof Liveness:</span>
                      <span className="gov-badge badge-green">ENABLED</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Jurisdiction Compartment:</span>
                      <span className="gov-badge badge-gold">ISOLATED (STRICT)</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Blind Admin Boundary:</span>
                      <strong style={{ color: "#38bdf8" }}>CRYPTOGRAPHICALLY SEALED</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sovereign 4-Node Topology */}
              <div className="gov-card">
                <h3 style={{ fontSize: "1.1rem", color: "#f8fafc", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Layers size={18} color="#38bdf8" />
                  National Sovereign Consortium Ledger &bull; 4-Node CFT Cluster
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
                  {(healthData.consortium_ledger.nodes || []).map((node: any, idx: number) => (
                    <div 
                      key={idx} 
                      style={{ 
                        background: "#061120", 
                        border: "1px solid var(--border-subtle)", 
                        borderRadius: "var(--radius-md)", 
                        padding: "14px" 
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <strong style={{ fontSize: "0.9rem", color: "#f8fafc" }}>{node.name}</strong>
                        <span className="gov-badge badge-green" style={{ fontSize: "0.68rem" }}>{node.status}</span>
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
                        Consensus Role: <strong style={{ color: "#38bdf8" }}>{node.role}</strong>
                      </div>
                      <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                        Scope: {node.jurisdiction} &bull; Latency: 1.{idx + 2}ms
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 4: GLOBAL TAMPER WATCHDOG & CRYPTOGRAPHIC HASH INSPECTOR */}
      {activeTab === "WATCHDOG" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* SECTION 1: SYSTEM-WIDE TAMPER WATCHDOG */}
          <div className="gov-card" style={{ borderTop: "4px solid #ef4444" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "14px", marginBottom: "16px" }}>
              <div>
                <h3 style={{ fontSize: "1.25rem", color: "#f87171", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                  <ShieldAlert size={22} color="#ef4444" />
                  Global Cryptographic Tamper Watchdog
                </h3>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                  Continuous background integrity verification. Automatically recomputes the SHA-256 hash of all encrypted vault artifacts 
                  and compares against the immutable Sovereign Consortium Ledger blocks.
                </p>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleTamperScan}
                disabled={scanning}
                style={{ display: "flex", alignItems: "center", gap: "8px", background: "linear-gradient(135deg, #b91c1c, #991b1b)" }}
              >
                {scanning ? <RefreshCw className="animate-spin" size={16} /> : <ShieldAlert size={16} />}
                {scanning ? "Scanning System Vault..." : "Initiate System-Wide Tamper Scan"}
              </button>
            </div>

            {/* Scan Results */}
            {scanResult ? (
              <div style={{ marginTop: "16px" }}>
                {/* Summary Metrics Banner */}
                <div style={{
                  background: scanResult.compromised_count > 0 ? "rgba(239, 68, 68, 0.12)" : "rgba(16, 185, 129, 0.12)",
                  border: `1px solid ${scanResult.compromised_count > 0 ? "#ef4444" : "#10b981"}`,
                  borderRadius: "var(--radius-md)",
                  padding: "16px 20px",
                  marginBottom: "20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "14px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    {scanResult.compromised_count > 0 ? (
                      <XCircle size={28} color="#ef4444" />
                    ) : (
                      <CheckCircle2 size={28} color="#10b981" />
                    )}
                    <div>
                      <strong style={{ fontSize: "1rem", color: scanResult.compromised_count > 0 ? "#fca5a5" : "#6ee7b7" }}>
                        {scanResult.compromised_count > 0 
                          ? `CRITICAL INTEGRITY ALERT: ${scanResult.compromised_count} evidence artifact(s) tampered or corrupted!`
                          : "100% CRYPTOGRAPHIC INTEGRITY VERIFIED: Zero Tampering Detected Across Entire System"}
                      </strong>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                        Scanned at: {new Date(scanResult.scanned_at).toLocaleString()} &bull; Audit Signature recorded
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "16px", textAlign: "right" }}>
                    <div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>TOTAL SCANNED</div>
                      <div className="mono" style={{ fontSize: "1.2rem", fontWeight: 800, color: "#f8fafc" }}>
                        {scanResult.total_scanned}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>COMPROMISED</div>
                      <div className="mono" style={{ fontSize: "1.2rem", fontWeight: 800, color: scanResult.compromised_count > 0 ? "#f87171" : "#10b981" }}>
                        {scanResult.compromised_count}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>INTEGRITY SCORE</div>
                      <div className="mono" style={{ fontSize: "1.2rem", fontWeight: 800, color: "#38bdf8" }}>
                        {scanResult.system_integrity_percent}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scanned Items Table */}
                {scanResult.results?.length > 0 ? (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                      <thead>
                        <tr style={{ background: "#061120", textAlign: "left", borderBottom: "1px solid var(--border-subtle)" }}>
                          <th style={{ padding: "10px" }}>Document ID</th>
                          <th style={{ padding: "10px" }}>File Name</th>
                          <th style={{ padding: "10px" }}>Case FIR</th>
                          <th style={{ padding: "10px" }}>State Jurisdiction</th>
                          <th style={{ padding: "10px" }}>Anchored Hash (Ledger)</th>
                          <th style={{ padding: "10px" }}>Live Computed Hash</th>
                          <th style={{ padding: "10px" }}>Ledger Block</th>
                          <th style={{ padding: "10px", textAlign: "right" }}>Watchdog Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scanResult.results.map((r: any) => (
                          <tr key={r.document_id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                            <td className="mono" style={{ padding: "10px", color: "#38bdf8", fontWeight: 600 }}>{r.document_id}</td>
                            <td style={{ padding: "10px", fontWeight: 500 }}>{r.file_name}</td>
                            <td className="mono" style={{ padding: "10px" }}>{r.case_fir}</td>
                            <td style={{ padding: "10px" }}>{r.state}</td>
                            <td className="mono" style={{ padding: "10px", fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                              {r.anchored_hash ? r.anchored_hash.slice(0, 16) + "..." : "N/A"}
                            </td>
                            <td className="mono" style={{ padding: "10px", fontSize: "0.72rem", color: r.is_compromised ? "#f87171" : "#38bdf8" }}>
                              {r.live_hash ? r.live_hash.slice(0, 16) + "..." : "N/A"}
                            </td>
                            <td className="mono" style={{ padding: "10px" }}>
                              {r.ledger_block !== "N/A" ? `#${r.ledger_block}` : "N/A"}
                            </td>
                            <td style={{ padding: "10px", textAlign: "right" }}>
                              {r.is_compromised ? (
                                <span className="gov-badge badge-red" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                  <AlertTriangle size={12} /> TAMPER DETECTED
                                </span>
                              ) : (
                                <span className="gov-badge badge-green" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                  <CheckCircle2 size={12} /> VERIFIED AUTHENTIC
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    No evidence files registered in system yet.
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: "30px", textAlign: "center", background: "#061120", borderRadius: "var(--radius-md)", color: "var(--text-muted)" }}>
                Click <strong>"Initiate System-Wide Tamper Scan"</strong> above to perform real-time cryptographic audit across all state evidence vaults.
              </div>
            )}
          </div>

          {/* SECTION 2: CRYPTOGRAPHIC HASH & BLOCK INSPECTOR */}
          <div className="gov-card">
            <h3 style={{ fontSize: "1.2rem", color: "#f8fafc", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Search size={18} color="#38bdf8" />
              Cryptographic Hash &amp; Block Inspector
            </h3>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "16px" }}>
              Verify any SHA-256 Hash, Document ID, Merkle Root, or Block Hash directly against the Sovereign Consortium Blockchain.
            </p>

            <form onSubmit={handleLookupHash} style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
              <input
                type="text"
                className="gov-input mono"
                placeholder="Enter SHA-256 Hash (64 hex), Document ID (e.g. DOC-...), or Block Hash..."
                value={hashQuery}
                onChange={(e) => setHashQuery(e.target.value)}
                style={{ flex: 1 }}
                required
              />
              <button type="submit" className="btn btn-primary" disabled={hashSearching}>
                {hashSearching ? <RefreshCw className="animate-spin" size={16} /> : <Search size={16} />}
                Inspect on Ledger
              </button>
            </form>

            {/* Lookup Result Display */}
            {hashResult && (
              <div style={{
                background: hashResult.found ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
                border: `1px solid ${hashResult.found ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                borderRadius: "var(--radius-md)",
                padding: "20px"
              }}>
                {hashResult.found ? (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                      <CheckCircle2 size={22} color="#10b981" />
                      <strong style={{ fontSize: "1.05rem", color: "#6ee7b7" }}>
                        Anchored to Sovereign Consortium Block #{hashResult.block_number}
                      </strong>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px", fontSize: "0.82rem", marginBottom: "16px" }}>
                      <div>
                        <span style={{ color: "var(--text-muted)" }}>Block Number:</span>
                        <span className="mono" style={{ color: "#38bdf8", fontWeight: 700, marginLeft: "8px" }}>#{hashResult.block_number}</span>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)" }}>Consensus Timestamp:</span>
                        <span className="mono" style={{ marginLeft: "8px" }}>{new Date(hashResult.timestamp).toLocaleString()}</span>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)" }}>Block Hash:</span>
                        <div className="mono" style={{ fontSize: "0.74rem", color: "#cbd5e1", marginTop: "2px" }}>
                          {hashResult.block_hash}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)" }}>Merkle Tree Root:</span>
                        <div className="mono" style={{ fontSize: "0.74rem", color: "#cbd5e1", marginTop: "2px" }}>
                          {hashResult.merkle_root}
                        </div>
                      </div>
                    </div>

                    {hashResult.transaction && (
                      <div style={{ background: "#061120", padding: "12px 16px", borderRadius: "var(--radius-sm)", fontSize: "0.8rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                          <span style={{ color: "var(--text-muted)" }}>Transaction ID:</span>
                          <span className="mono" style={{ color: "#38bdf8" }}>{hashResult.transaction.tx_id}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                          <span style={{ color: "var(--text-muted)" }}>Transaction Type:</span>
                          <span className="gov-badge badge-blue">{hashResult.transaction.tx_type}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--text-muted)" }}>Endorsing Authority:</span>
                          <span style={{ fontWeight: 600, color: "#f8fafc" }}>{hashResult.transaction.endorsing_peer || "Consortium Node"}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#fca5a5" }}>
                    <AlertCircle size={22} color="#ef4444" />
                    <div>
                      <strong>No Ledger Anchor Found</strong>
                      <p style={{ fontSize: "0.82rem", margin: "2px 0 0", color: "#e2e8f0" }}>
                        {hashResult.message || "The queried hash or ID is not recorded on any block of the Sovereign Consortium Ledger."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: BLOCKCHAIN EXPLORER */}
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
      {/* USER TERMINATION / REVOCATION MODAL */}
      {terminatingUser && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: "540px", borderTop: isPermanentDelete ? "4px solid #ef4444" : "4px solid #f59e0b" }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {isPermanentDelete ? <UserX size={22} color="#ef4444" /> : <AlertTriangle size={22} color="#f59e0b" />}
                <h3 style={{ fontSize: "1.15rem", color: isPermanentDelete ? "#f87171" : "#fde68a" }}>
                  {isPermanentDelete ? "Permanently Expunge Officer Account" : "Suspend Officer Access (Temporary Lockout)"}
                </h3>
              </div>
              <button className="btn btn-secondary" style={{ padding: "4px 8px" }} onClick={() => setTerminatingUser(null)}>
                Cancel
              </button>
            </div>

            <form onSubmit={handleTerminateUser} style={{ padding: "20px 24px" }}>
              <div className="gov-card" style={{ 
                background: isPermanentDelete ? "rgba(239, 68, 68, 0.12)" : "rgba(245, 158, 11, 0.12)", 
                border: `1px solid ${isPermanentDelete ? "rgba(239, 68, 68, 0.4)" : "rgba(245, 158, 11, 0.4)"}`, 
                marginBottom: "16px", 
                padding: "12px" 
              }}>
                <p style={{ fontSize: "0.85rem", color: "#e2e8f0" }}>
                  Target Account: <strong>{terminatingUser.full_name}</strong> (<span className="mono" style={{ color: "#38bdf8" }}>{terminatingUser.badge_id}</span>) &bull; {terminatingUser.role}
                </p>
                <div style={{ fontSize: "0.78rem", marginTop: "6px", color: isPermanentDelete ? "#fca5a5" : "#fef08a" }}>
                  {isPermanentDelete ? (
                    <span>⚠️ <strong>PERMANENT DELETION:</strong> This account will be completely expunged from the database, the persistent JSON registry, and photo storage. It will never show up again.</span>
                  ) : (
                    <span>🔒 <strong>TEMPORARY SUSPENSION:</strong> This account will be locked out from logging in. You can restore access at any time by clicking <strong>'Grant Re-Access'</strong> in the user list.</span>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label className="gov-label">Mandatory Reason (Recorded in Audit Trail)</label>
                <select
                  className="gov-select"
                  value={terminationReason}
                  onChange={(e) => setTerminationReason(e.target.value)}
                  style={{ marginBottom: "8px" }}
                >
                  <option value="Temporary disciplinary suspension / Under review">
                    Temporary disciplinary suspension / Under review
                  </option>
                  <option value="Compromised credentials / Suspected security breach">
                    Compromised credentials / Suspected security breach
                  </option>
                  <option value="Unauthorized evidence extraction / Attempted data leak">
                    Unauthorized evidence extraction / Attempted data leak
                  </option>
                  <option value="Illegal system access / Violation of Section 66 IT Act">
                    Illegal system access / Violation of Section 66 IT Act
                  </option>
                  <option value="Officer transferred / Departed jurisdiction">
                    Officer transferred / Departed jurisdiction
                  </option>
                  <option value="Permanent departure / Record expunged">
                    Permanent departure / Record expunged
                  </option>
                </select>
                <input
                  type="text"
                  className="gov-input"
                  placeholder="Or enter custom specific violation remarks..."
                  value={terminationReason}
                  onChange={(e) => setTerminationReason(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label className="gov-label">Action Enforcement Type</label>
                <div style={{ display: "flex", gap: "12px", marginTop: "6px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.84rem", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="delType"
                      checked={!isPermanentDelete}
                      onChange={() => setIsPermanentDelete(false)}
                    />
                    <span><strong>Temporary Suspension</strong> (Can be reinstated with 'Grant Re-Access')</span>
                  </label>
                </div>
                <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.84rem", cursor: "pointer", color: "#fca5a5" }}>
                    <input
                      type="radio"
                      name="delType"
                      checked={isPermanentDelete}
                      onChange={() => setIsPermanentDelete(true)}
                    />
                    <span><strong>Permanent Deletion</strong> (Completely deletes from database &amp; registry)</span>
                  </label>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setTerminatingUser(null)}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className={isPermanentDelete ? "btn btn-danger" : "btn btn-secondary"} 
                  style={!isPermanentDelete ? { background: "rgba(245, 158, 11, 0.2)", borderColor: "#f59e0b", color: "#fde68a" } : {}}
                  disabled={terminatingLoading}
                >
                  {terminatingLoading ? <RefreshCw className="animate-spin" size={16} /> : (isPermanentDelete ? <UserX size={16} /> : <AlertTriangle size={16} />)}
                  {isPermanentDelete ? "Permanently Delete Record" : "Enforce Suspension"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
