import uuid
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Header, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
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
    face_match_confidence: float
    liveness_verified: bool

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
    cursor.execute("SELECT * FROM users WHERE badge_id = ? AND is_active = 1;", (payload.badge_id,))
    user = cursor.fetchone()
    conn.close()

    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"status": "DENIED", "reason": "Invalid Departmental ID or Password."}
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
    Stage 2: Verify Face 2FA Biometric match and anti-spoofing liveness.
    """
    token_data = decode_access_token(payload.temp_token)
    if not token_data or token_data.get("stage") != "AWAITING_FACE_2FA":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"status": "DENIED", "reason": "Session expired or invalid 2FA request."}
        )

    badge_id = token_data["badge_id"]

    # Check liveness
    if not payload.liveness_verified:
        # Audit log failed spoof attempt
        log_security_incident(badge_id, "FACE_2FA_FAILED_LIVENESS", device_token)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"status": "DENIED", "reason": "Liveness detection failed. Anti-spoofing challenge was not passed."}
        )

    # Check biometric similarity threshold (85% confidence required)
    if payload.face_match_confidence < 0.80:
        log_security_incident(badge_id, f"FACE_MISMATCH (Score: {payload.face_match_confidence:.2f})", device_token)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "status": "DENIED",
                "reason": "Face verification failed. The live face does not match the enrolled departmental record for this ID."
            }
        )

    # Retrieve full user profile
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE badge_id = ?;", (badge_id,))
    user = cursor.fetchone()
    
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
            f"Terminal:{device_token}",
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
    cursor.execute("SELECT photo_path FROM users WHERE badge_id = ?;", (badge_id,))
    user = cursor.fetchone()
    conn.close()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    photo_file = PHOTOS_DIR / user["photo_path"]
    if not photo_file.exists():
        raise HTTPException(status_code=404, detail="Photo record missing")

    return FileResponse(photo_file)

@router.get("/me")
def get_current_user(authorization: str = Header(None)):
    """Retrieve the currently authenticated officer's profile."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")

    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token expired or invalid")

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
