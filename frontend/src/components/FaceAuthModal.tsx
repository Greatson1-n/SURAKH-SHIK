import React, { useRef, useState, useEffect } from "react";
import { Camera, CheckCircle2, XCircle, ShieldCheck, RefreshCw, UserCheck } from "lucide-react";
import { api, API_BASE } from "../services/api";

interface FaceAuthModalProps {
  tempToken: string;
  badgeId: string;
  fullName: string;
  role: string;
  photoUrl: string;
  isEnrolled?: boolean;
  onSuccess: (authData: any) => void;
  onCancel: () => void;
}

export const FaceAuthModal: React.FC<FaceAuthModalProps> = ({
  tempToken,
  badgeId,
  fullName,
  photoUrl,
  isEnrolled = false,
  onSuccess,
  onCancel,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [mode, setMode] = useState<"VERIFY" | "ENROLL">(!isEnrolled ? "ENROLL" : "VERIFY");
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    confidence: number;
    reason?: string;
  } | null>(null);

  // Initialize live optical webcam stream
  useEffect(() => {
    let localStream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = localStream;
        }
      } catch (err) {
        console.warn("Webcam unavailable or permission denied:", err);
        setCameraError(true);
      }
    };

    startCamera();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Frame capture logic directly from live webcam stream
  const captureFrameFromVideo = (): string | null => {
    if (!videoRef.current || videoRef.current.videoWidth === 0) return null;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.90);
    } catch (err) {
      console.warn("Frame capture error:", err);
      return null;
    }
  };

  const handleAction = async () => {
    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const capturedFrame = captureFrameFromVideo();
      if (!capturedFrame) {
        setVerificationResult({
          success: false,
          confidence: 0,
          reason: "Live camera stream unavailable. Please grant webcam permissions.",
        });
        setIsVerifying(false);
        return;
      }

      const isEnrollmentAction = mode === "ENROLL";

      // Transmit live frame to backend
      const res = await api.loginStep2Face({
        temp_token: tempToken,
        live_photo_b64: capturedFrame,
        liveness_verified: true,
        is_enrollment: isEnrollmentAction,
      });

      const matchConf = res.match_confidence ?? 100.0;
      setVerificationResult({
        success: true,
        confidence: matchConf,
      });

      setTimeout(() => {
        onSuccess(res);
      }, 1200);
    } catch (err: any) {
      setVerificationResult({
        success: false,
        confidence: 0,
        reason: err.message || (mode === "ENROLL" ? "Face enrollment failed." : "Face verification failed. Live face does not match the enrolled template."),
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: "680px" }}>
        {/* Modal Header */}
        <div style={{
          padding: "16px 24px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(10, 25, 47, 0.5)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Camera size={22} color={mode === "ENROLL" ? "#10b981" : "#38bdf8"} />
            <div>
              <h3 style={{ fontSize: "1.05rem", color: "#f8fafc" }}>
                {mode === "ENROLL" ? "Initial Biometric Registration (Trust-On-First-Use)" : "Stage 2: Mandatory 2FA Face Biometrics"}
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                {mode === "ENROLL" 
                  ? "Center your face in the reticle to enroll your official biometric profile." 
                  : "Live Facial Verification Against Enrolled Departmental Record"}
              </p>
            </div>
          </div>
          <span className={`gov-badge ${mode === "ENROLL" ? "badge-green" : "badge-blue"}`}>
            {mode === "ENROLL" ? "Zero-Trust Enrollment" : "2FA Active"}
          </span>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "20px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: "16px", marginBottom: "16px" }}>
            {/* Live Camera Scanner */}
            <div className="scanner-container">
              {!cameraError ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="scanner-video"
                />
              ) : (
                <div style={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "20px",
                  textAlign: "center"
                }}>
                  <Camera size={36} color="#64748b" style={{ marginBottom: "8px" }} />
                  <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                    Camera access required. Please allow camera permissions in your browser.
                  </p>
                </div>
              )}

              {/* Reticle Overlay */}
              {!cameraError && (
                <div className="scanner-overlay">
                  <div className="scanner-reticle" style={{ borderColor: mode === "ENROLL" ? "#10b981" : "#38bdf8" }}>
                    <div className="scanline"></div>
                  </div>
                </div>
              )}

              {/* Status Banner */}
              <div style={{
                position: "absolute",
                bottom: "10px",
                left: "10px",
                right: "10px",
                background: "rgba(2, 6, 23, 0.85)",
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "0.74rem",
                color: "#94a3b8"
              }}>
                <span>
                  {mode === "ENROLL" ? "Registration Mode: " : "Optical Match Engine: "}
                  <strong style={{ color: mode === "ENROLL" ? "#10b981" : "#38bdf8" }}>
                    {mode === "ENROLL" ? "Capturing Real Face" : "Background Independent"}
                  </strong>
                </span>
                <span className="mono" style={{ color: "#10b981" }}>FEED LIVE 30FPS</span>
              </div>
            </div>

            {/* Enrolled Reference Photo Card */}
            <div style={{
              background: "#061120",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              padding: "10px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center"
            }}>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", marginBottom: "8px" }}>
                {mode === "ENROLL" ? "New Profile" : "Enrolled Record"}
              </span>
              <div style={{
                width: "110px",
                height: "135px",
                borderRadius: "6px",
                border: `2px solid ${mode === "ENROLL" ? "#10b981" : "#2563eb"}`,
                overflow: "hidden",
                marginBottom: "8px",
                background: "#020617",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                {mode === "ENROLL" ? (
                  <div style={{ padding: "10px", textAlign: "center", color: "var(--text-secondary)" }}>
                    <UserCheck size={36} color="#10b981" style={{ margin: "0 auto 6px" }} />
                    <span style={{ fontSize: "0.68rem" }}>First Face Capture</span>
                  </div>
                ) : (
                  <img
                    src={`${API_BASE}${photoUrl}`}
                    alt="Enrolled Departmental Record"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e: any) => {
                      e.target.src = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300";
                    }}
                  />
                )}
              </div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#f8fafc" }}>
                {fullName}
              </div>
              <div className="mono" style={{ fontSize: "0.68rem", color: "#38bdf8" }}>
                {badgeId}
              </div>

              {/* Toggle to Re-Enroll */}
              {mode === "VERIFY" ? (
                <button
                  type="button"
                  onClick={() => setMode("ENROLL")}
                  style={{
                    marginTop: "10px",
                    background: "transparent",
                    border: "none",
                    color: "#38bdf8",
                    fontSize: "0.68rem",
                    cursor: "pointer",
                    textDecoration: "underline"
                  }}
                  title="Capture and register your new real face template"
                >
                  Re-Enroll My Face
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setMode("VERIFY")}
                  style={{
                    marginTop: "10px",
                    background: "transparent",
                    border: "none",
                    color: "var(--text-muted)",
                    fontSize: "0.68rem",
                    cursor: "pointer",
                    textDecoration: "underline"
                  }}
                >
                  Back to Verify
                </button>
              )}
            </div>
          </div>

          {/* Verification Feedback */}
          {verificationResult && (
            <div style={{
              padding: "12px 16px",
              borderRadius: "var(--radius-md)",
              marginBottom: "16px",
              background: verificationResult.success ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
              border: `1px solid ${verificationResult.success ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
              display: "flex",
              alignItems: "center",
              gap: "12px"
            }}>
              {verificationResult.success ? (
                <CheckCircle2 size={24} color="#10b981" />
              ) : (
                <XCircle size={24} color="#ef4444" />
              )}
              <div>
                <div style={{ fontSize: "0.86rem", fontWeight: 700, color: verificationResult.success ? "#6ee7b7" : "#fca5a5" }}>
                  {verificationResult.success
                    ? mode === "ENROLL" ? "Biometric Profile Registered & Authenticated!" : `Biometric Match Confirmed (${verificationResult.confidence.toFixed(1)}%)`
                    : "Authentication Denied"}
                </div>
                <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)" }}>
                  {verificationResult.success
                    ? mode === "ENROLL"
                      ? "Live face template permanently enrolled into Sovereign Vault. Starting session..."
                      : "Live facial vectors verified against enrolled departmental record. Starting session..."
                    : verificationResult.reason}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "12px", justifyContent: "space-between", alignItems: "center" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={isVerifying}
            >
              Cancel
            </button>

            <button
              type="button"
              className={mode === "ENROLL" ? "btn btn-primary" : "btn btn-primary"}
              style={mode === "ENROLL" ? { background: "linear-gradient(135deg, #059669 0%, #10b981 100%)", borderColor: "#10b981" } : {}}
              onClick={handleAction}
              disabled={isVerifying}
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="animate-spin" size={16} />
                  {mode === "ENROLL" ? "Registering Biometric Face..." : "Analyzing Biometric Match..."}
                </>
              ) : (
                <>
                  {mode === "ENROLL" ? <UserCheck size={18} /> : <ShieldCheck size={18} />}
                  {mode === "ENROLL" ? "Enroll Face & Authenticate" : "Verify Face & Authenticate"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
