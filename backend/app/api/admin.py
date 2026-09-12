import uuid
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, UploadFile, File, Form, status
from pydantic import BaseModel
from app.core.config import PHOTOS_DIR
from app.core.security import hash_password, decode_access_token
from app.core.device import verify_departmental_device
from app.models.database import get_db_connection

router = APIRouter(prefix="/api/admin", tags=["IT Administration"])

def require_admin(authorization: str = Header(None)) -> dict:
    """Ensure the requester is the authenticated SYSTEM_ADMIN."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication token required.")
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload or payload.get("role") != "SYSTEM_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Only the System Administrator can perform this action."
        )
    return payload

@router.get("/users")
def list_users(admin: dict = Depends(require_admin)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT id, badge_id, full_name, role, branch, state, district, station_id, is_active, created_at, photo_path 
    FROM users ORDER BY id DESC;
    """)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return {"users": rows}

@router.post("/users")
async def create_user(
    badge_id: str = Form(...),
    full_name: str = Form(...),
    password: str = Form(...),
    role: str = Form(...),
    branch: str = Form(...),
    state: str = Form(...),
    district: str = Form(...),
    station_id: str = Form(...),
    photo: UploadFile = File(...),
    admin: dict = Depends(require_admin),
    device_token: str = Depends(verify_departmental_device)
):
    """
    Admin onboards a verified departmental user (IO, SHO, Forensic Analyst, Judge, Prosecutor)
    with their official photo for 2FA Face Biometrics.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Check unique badge_id
    cursor.execute("SELECT id FROM users WHERE badge_id = ?;", (badge_id,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Badge / Departmental ID already exists.")

    # Save official photo
    file_ext = Path(photo.filename).suffix or ".jpg"
    photo_filename = f"{badge_id}_{uuid.uuid4().hex[:8]}{file_ext}"
    target_photo_path = PHOTOS_DIR / photo_filename

    with open(target_photo_path, "wb") as buffer:
        shutil.copyfileobj(photo.file, buffer)

    now_str = datetime.now(timezone.utc).isoformat()
    hashed_pw = hash_password(password)

    cursor.execute(
        """INSERT INTO users 
        (badge_id, full_name, password_hash, role, branch, state, district, station_id, photo_path, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?);""",
        (badge_id, full_name, hashed_pw, role, branch, state, district, station_id, photo_filename, now_str)
    )

    # Log action to audit trail
    cursor.execute(
        """INSERT INTO audit_logs (log_id, actor_badge, actor_role, action, target_ref, ip_address, device_id, timestamp, signature)
        VALUES (?, ?, 'SYSTEM_ADMIN', 'USER_PROVISIONED', ?, '127.0.0.1', ?, ?, 'SIG-ADMIN-ACT');""",
        (str(uuid.uuid4()), admin["sub"], f"NewUser:{badge_id}({role})", device_token, now_str)
    )

    conn.commit()
    conn.close()

    return {
        "status": "SUCCESS",
        "message": f"Departmental User '{full_name}' ({badge_id}) created with Face 2FA enrolled.",
        "badge_id": badge_id
    }

class TerminateUserRequest(BaseModel):
    badge_id: str
    reason: str
    permanent_delete: bool = False

@router.post("/users/terminate")
def terminate_user(
    payload: TerminateUserRequest, 
    admin: dict = Depends(require_admin), 
    device_token: str = Depends(verify_departmental_device)
):
    """
    Terminates / revokes or permanently deletes a user under conditions
    such as illegal use, security violations, or disciplinary actions.
    """
    if payload.badge_id == "ADM-IT-SURAKH":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Operation Denied: The root System Administrator account cannot be revoked or deleted."
        )

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT full_name, role FROM users WHERE badge_id = ?;", (payload.badge_id,))
    target_user = cursor.fetchone()
    if not target_user:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found.")

    now_str = datetime.now(timezone.utc).isoformat()
    action_name = "USER_PERMANENTLY_DELETED" if payload.permanent_delete else "USER_REVOKED_ILLEGAL_USE"

    if payload.permanent_delete:
        cursor.execute("DELETE FROM users WHERE badge_id = ?;", (payload.badge_id,))
    else:
        cursor.execute("UPDATE users SET is_active = 0 WHERE badge_id = ?;", (payload.badge_id,))

    # Log to immutable audit logs
    cursor.execute(
        """INSERT INTO audit_logs (log_id, actor_badge, actor_role, action, target_ref, ip_address, device_id, timestamp, signature)
        VALUES (?, ?, 'SYSTEM_ADMIN', ?, ?, '127.0.0.1', ?, ?, 'SIG-TERM');""",
        (str(uuid.uuid4()), admin["sub"], action_name, f"User:{payload.badge_id} Reason:{payload.reason}", device_token, now_str)
    )

    conn.commit()
    conn.close()

    status_str = "permanently deleted" if payload.permanent_delete else "suspended & revoked"
    return {
        "status": "SUCCESS",
        "message": f"User '{target_user['full_name']}' ({payload.badge_id}) has been {status_str}.",
        "reason": payload.reason
    }

@router.get("/devices")
def list_devices(admin: dict = Depends(require_admin)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM authorized_devices ORDER BY enrolled_at DESC;")
    devices = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return {"devices": devices}

class DeviceRevokeRequest(BaseModel):
    device_id: str
    reason: str

@router.post("/devices/revoke")
def revoke_device(payload: DeviceRevokeRequest, admin: dict = Depends(require_admin), device_token: str = Depends(verify_departmental_device)):
    """Remote Kill Switch: Immediately revokes an authorized laptop."""
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now(timezone.utc).isoformat()

    cursor.execute("UPDATE authorized_devices SET status = 'REVOKED' WHERE device_id = ?;", (payload.device_id,))
    
    # Audit log the revocation
    cursor.execute(
        """INSERT INTO audit_logs (log_id, actor_badge, actor_role, action, target_ref, ip_address, device_id, timestamp, signature)
        VALUES (?, ?, 'SYSTEM_ADMIN', 'DEVICE_REVOKED_KILL_SWITCH', ?, '127.0.0.1', ?, ?, 'SIG-KILL');""",
        (str(uuid.uuid4()), admin["sub"], f"Device:{payload.device_id} Reason:{payload.reason}", device_token, now_str)
    )

    conn.commit()
    conn.close()
    return {"status": "SUCCESS", "message": f"Device {payload.device_id} is permanently REVOKED."}

@router.get("/locations")
def get_locations():
    """Returns Indian administrative hierarchy for police and forensic jurisdictions."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT type, state, district, name, code FROM locations ORDER BY state, district, name;")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return {"locations": rows}

@router.get("/audit-logs")
def get_audit_logs(admin: dict = Depends(require_admin)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100;")
    logs = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return {"audit_logs": logs}
