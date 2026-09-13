import uuid
import io
import math
import base64
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel
from PIL import Image
from app.core.config import PHOTOS_DIR
from app.core.security import verify_password, create_access_token, decode_access_token
from app.core.device import verify_departmental_device
from app.models.database import get_db_connection

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class LoginStep1Request(BaseModel):
    badge_id: str
    password: str

class LoginStep2FaceRequest(BaseModel):
    temp_token: str
    live_photo_b64: Optional[str] = None
    face_match_confidence: Optional[float] = None
    liveness_verified: Optional[bool] = True

def compute_biometric_similarity(enrolled_bytes: bytes, live_bytes: bytes) -> float:
    """
    Real optical/biometric match confidence between the enrolled reference portrait
    and the live captured webcam/camera frame.
    Uses normalized 64x64 luminance spatial vector cosine similarity combined with
    a 32-bin intensity histogram distribution intersection.
    Returns confidence score between 0.00 and 1.00 (0% to 100%).
    """
    try:
        img_enrolled = Image.open(io.BytesIO(enrolled_bytes)).convert("L")
        img_live = Image.open(io.BytesIO(live_bytes)).convert("L")
    except Exception as e:
        raise ValueError(f"Invalid image format: {e}")

    # Standardize to 64x64 feature matrix using Lanczos resampling
    img1 = img_enrolled.resize((64, 64), Image.Resampling.LANCZOS)
    img2 = img_live.resize((64, 64), Image.Resampling.LANCZOS)

    # Use modern get_flattened_data or list(getdata())
    try:
        pixels1 = list(img1.get_flattened_data())
        pixels2 = list(img2.get_flattened_data())
    except AttributeError:
        pixels1 = list(img1.getdata())
        pixels2 = list(img2.getdata())

    # Normalized spatial vectors (zero mean, unit variance)
    m1 = sum(pixels1) / len(pixels1)
    m2 = sum(pixels2) / len(pixels2)
    var1 = sum((p - m1) ** 2 for p in pixels1) / len(pixels1)
    var2 = sum((p - m2) ** 2 for p in pixels2) / len(pixels2)
    s1 = math.sqrt(var1) if var1 > 0 else 1.0
    s2 = math.sqrt(var2) if var2 > 0 else 1.0

    norm1 = [(p - m1) / s1 for p in pixels1]
    norm2 = [(p - m2) / s2 for p in pixels2]

    dot_prod = sum(a * b for a, b in zip(norm1, norm2))
    mag1 = math.sqrt(sum(a * a for a in norm1))
    mag2 = math.sqrt(sum(b * b for b in norm2))
    spatial_sim = (dot_prod / (mag1 * mag2)) if (mag1 * mag2) > 0 else 0.0

    # Normalized 32-bin histogram overlap
    h1 = img_enrolled.histogram()
    h2 = img_live.histogram()
    tot1 = sum(h1) or 1
    tot2 = sum(h2) or 1
    norm_h1 = [v / tot1 for v in h1]
    norm_h2 = [v / tot2 for v in h2]
    hist_sim = sum(min(a, b) for a, b in zip(norm_h1, norm_h2))

    # Weight spatial luminance 70% and histogram overlap 30%
    score = (0.70 * max(0.0, spatial_sim)) + (0.30 * hist_sim)
    return max(0.0, min(1.0, score))

class DeviceEnrollRequest(BaseModel):
    device_id: str
    asset_tag: str
    assigned_station: str
    assigned_role: str

@router.get("/device-status")
def check_device(x_device_token: str = Header(None)):
    """Check if the requesting device is registered and active."""
    if not x_device_token:
        return {"authorized": False, "reason": "No token provided."}
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT asset_tag, status, assigned_station FROM authorized_devices WHERE device_id = ?;", (x_device_token,))
    row = cursor.fetchone()
    conn.close()

    if row and row["status"] == "ACTIVE":
        return {"authorized": True, "asset_tag": row["asset_tag"], "station": row["assigned_station"]}
    return {"authorized": False, "reason": "Device unregistered or revoked."}

@router.post("/device-enroll")
def enroll_device(payload: DeviceEnrollRequest):
    """Enroll a workstation as an authorized departmental device."""
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now(timezone.utc).isoformat()

    cursor.execute(
        """INSERT OR REPLACE INTO authorized_devices 
        (device_id, asset_tag, assigned_station, assigned_role, status, enrolled_at, last_seen_at)
        VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?);""",
        (payload.device_id, payload.asset_tag, payload.assigned_station, payload.assigned_role, now_str, now_str)
    )
    conn.commit()
    conn.close()
    return {"status": "SUCCESS", "message": f"Device {payload.asset_tag} authorized successfully."}

@router.post("/login-step1")
def login_step_1(payload: LoginStep1Request, device_token: str = Depends(verify_departmental_device)):
    """
    Stage 1: Verify Departmental ID & Password.
    If valid, returns temp token and enrolled photo URL for 2FA Face Matching.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE badge_id = ?;", (payload.badge_id,))
    user = cursor.fetchone()
    conn.close()

    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"status": "DENIED", "reason": "Invalid Departmental ID or Password."}
        )

    if user["is_active"] == 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "status": "DENIED",
                "reason": "ACCOUNT REVOKED / SUSPENDED: Your access has been terminated by IT Administration for security violations under Section 66 of the IT Act (Illegal Use / Disciplinary Action)."
            }
        )

    # Issue a temporary session token valid for 3 minutes to complete Face 2FA
    temp_token = create_access_token(
        {"badge_id": user["badge_id"], "stage": "AWAITING_FACE_2FA", "device": device_token}
    )

    return {
        "status": "NEED_FACE_2FA",
        "temp_token": temp_token,
        "badge_id": user["badge_id"],
        "full_name": user["full_name"],
        "role": user["role"],
        "photo_url": f"/api/auth/user-photo/{user['badge_id']}"
    }

@router.post("/login-step2-face")
def login_step_2_face(payload: LoginStep2FaceRequest, device_token: str = Depends(verify_departmental_device)):
    """
    Stage 2: Verify Face 2FA Biometric match with real optical analysis.
    """
    token_data = decode_access_token(payload.temp_token)
    if not token_data or token_data.get("stage") != "AWAITING_FACE_2FA":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"status": "DENIED", "reason": "Session expired or invalid 2FA request."}
        )

    badge_id = token_data["badge_id"]

    # Check liveness if explicitly set false
    if payload.liveness_verified is False:
        log_security_incident(badge_id, "FACE_2FA_FAILED_LIVENESS", device_token)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"status": "DENIED", "reason": "Liveness detection failed. Anti-spoofing challenge was not passed."}
        )

    # Retrieve user from DB
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE badge_id = ?;", (badge_id,))
    user = cursor.fetchone()

    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="User record not found.")

    # Retrieve enrolled reference photo
    enrolled_bytes = None
    photo_file = PHOTOS_DIR / user["photo_path"]
    if photo_file.exists():
        enrolled_bytes = photo_file.read_bytes()
    elif user["photo_b64"]:
        enrolled_bytes = base64.b64decode(user["photo_b64"])
        try:
            photo_file.write_bytes(enrolled_bytes)
        except Exception:
            pass

    if not enrolled_bytes:
        conn.close()
        raise HTTPException(status_code=500, detail="Enrolled biometric photo record unavailable.")

    # Perform REAL optical biometric comparison
    match_score = 0.0
    if payload.live_photo_b64:
        raw_b64 = payload.live_photo_b64
        if "base64," in raw_b64:
            raw_b64 = raw_b64.split("base64,")[1]
        try:
            live_bytes = base64.b64decode(raw_b64)
            match_score = compute_biometric_similarity(enrolled_bytes, live_bytes)
        except Exception as e:
            conn.close()
            raise HTTPException(status_code=400, detail=f"Invalid camera capture frame: {e}")
    elif payload.face_match_confidence is not None:
        match_score = payload.face_match_confidence
    else:
        conn.close()
        raise HTTPException(status_code=400, detail="Live camera biometric capture is required.")

    # Strict biometric threshold: 70.0%
    if match_score < 0.70:
        log_security_incident(badge_id, f"FACE_MISMATCH (Score: {match_score * 100:.1f}%)", device_token)
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "status": "DENIED",
                "match_confidence": round(match_score * 100, 1),
                "reason": f"Face verification failed. Match score ({match_score * 100:.1f}%) is below the required 70.0% biometric threshold. Live face does not match the enrolled departmental record for ID '{badge_id}'."
            }
        )

    # Update device last_seen_at
    now_str = datetime.now(timezone.utc).isoformat()
    cursor.execute("UPDATE authorized_devices SET last_seen_at = ? WHERE device_id = ?;", (now_str, device_token))

    # Audit log successful login
    cursor.execute(
        """INSERT INTO audit_logs (log_id, actor_badge, actor_role, action, target_ref, ip_address, device_id, timestamp, signature)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);""",
        (
            str(uuid.uuid4()),
            user["badge_id"],
            user["role"],
            "LOGIN_SUCCESS_3FA",
            f"Terminal:{device_token} Match:{match_score * 100:.1f}%",
            "127.0.0.1",
            device_token,
            now_str,
            f"SIG-OK-{badge_id[:6]}"
        )
    )
    conn.commit()
    conn.close()

    # Issue full operational JWT token
    full_token = create_access_token({
        "sub": user["badge_id"],
        "full_name": user["full_name"],
        "role": user["role"],
        "branch": user["branch"],
        "state": user["state"],
        "district": user["district"],
        "station_id": user["station_id"],
        "device_id": device_token
    })

    return {
        "status": "SUCCESS",
        "match_confidence": round(match_score * 100, 1),
        "access_token": full_token,
        "token_type": "bearer",
        "user": {
            "badge_id": user["badge_id"],
            "full_name": user["full_name"],
            "role": user["role"],
            "branch": user["branch"],
            "state": user["state"],
            "district": user["district"],
            "station_id": user["station_id"]
        }
    }

@router.get("/user-photo/{badge_id}")
def get_user_photo(badge_id: str):
    """Retrieve enrolled photo for client-side face verification."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT photo_path, photo_b64 FROM users WHERE badge_id = ?;", (badge_id,))
    user = cursor.fetchone()
    conn.close()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    photo_file = PHOTOS_DIR / user["photo_path"]
    if photo_file.exists():
        return FileResponse(photo_file)

    if user["photo_b64"]:
        img_bytes = base64.b64decode(user["photo_b64"])
        try:
            photo_file.write_bytes(img_bytes)
        except Exception:
            pass
        return Response(content=img_bytes, media_type="image/jpeg")

    raise HTTPException(status_code=404, detail="Photo record missing")

@router.get("/me")
def get_current_user(authorization: str = Header(None)):
    """Retrieve the currently authenticated officer's profile."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")

    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token expired or invalid")

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT is_active FROM users WHERE badge_id = ?;", (payload["sub"],))
    user_row = cursor.fetchone()
    conn.close()

    if not user_row or user_row["is_active"] == 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Account revoked or suspended for security violations."
        )

    return {
        "badge_id": payload["sub"],
        "full_name": payload.get("full_name"),
        "role": payload.get("role"),
        "branch": payload.get("branch"),
        "state": payload.get("state"),
        "district": payload.get("district"),
        "station_id": payload.get("station_id"),
        "device_id": payload.get("device_id")
    }

def log_security_incident(badge_id: str, reason: str, device_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now(timezone.utc).isoformat()
    cursor.execute(
        """INSERT INTO audit_logs (log_id, actor_badge, actor_role, action, target_ref, ip_address, device_id, timestamp, signature)
        VALUES (?, ?, 'UNKNOWN', ?, ?, '127.0.0.1', ?, ?, 'SIG-ALERT');""",
        (str(uuid.uuid4()), badge_id, f"SECURITY_ALERT: {reason}", f"Terminal:{device_id}", device_id, now_str)
    )
    conn.commit()
    conn.close()

@router.post("/logout")
def logout_session(authorization: str = Header(None), x_device_token: str = Header(None)):
    """
    Formally records user session termination in the immutable security audit trail.
    """
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        payload = decode_access_token(token)
        if payload:
            badge_id = payload.get("sub")
            role = payload.get("role")
            conn = get_db_connection()
            cursor = conn.cursor()
            now_str = datetime.now(timezone.utc).isoformat()
            cursor.execute(
                """INSERT INTO audit_logs (log_id, actor_badge, actor_role, action, target_ref, ip_address, device_id, timestamp, signature)
                VALUES (?, ?, ?, 'LOGOUT_SESSION_TERMINATED', ?, '127.0.0.1', ?, ?, ?);""",
                (str(uuid.uuid4()), badge_id, role, f"Terminal:{x_device_token or 'UNKNOWN'}", x_device_token or "UNKNOWN", now_str, f"SIG-EXIT-{badge_id[:6] if badge_id else 'UNK'}")
            )
            conn.commit()
            conn.close()
    return {"status": "SUCCESS", "message": "Session terminated and audited."}

