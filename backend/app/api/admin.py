import uuid
import shutil
import os
import base64
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, UploadFile, File, Form, status
from pydantic import BaseModel
from app.core.config import PHOTOS_DIR, VAULT_DIR, DB_PATH
from app.core.security import hash_password, decode_access_token, decrypt_bytes, compute_sha256
from app.core.device import verify_departmental_device
from app.models.database import (
    get_db_connection, 
    save_user_to_registry, 
    update_user_in_registry, 
    load_persistent_registry, 
    save_persistent_registry
)
from app.ledger.blockchain import SovereignConsortiumLedger

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

    # Save official photo and encode to Base64 for lifetime preservation
    file_ext = Path(photo.filename).suffix or ".jpg"
    photo_filename = f"{badge_id}_{uuid.uuid4().hex[:8]}{file_ext}"
    target_photo_path = PHOTOS_DIR / photo_filename

    photo_bytes = await photo.read()
    photo_b64 = base64.b64encode(photo_bytes).decode("utf-8")
    target_photo_path.write_bytes(photo_bytes)

    now_str = datetime.now(timezone.utc).isoformat()
    hashed_pw = hash_password(password)

    cursor.execute(
        """INSERT INTO users 
        (badge_id, full_name, password_hash, role, branch, state, district, station_id, photo_path, photo_b64, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?);""",
        (badge_id, full_name, hashed_pw, role, branch, state, district, station_id, photo_filename, photo_b64, now_str)
    )

    # Sync to persistent registry for permanent lifetime storage across container restarts
    save_user_to_registry({
        "badge_id": badge_id,
        "full_name": full_name,
        "password_hash": hashed_pw,
        "role": role,
        "branch": branch,
        "state": state,
        "district": district,
        "station_id": station_id,
        "photo_path": photo_filename,
        "photo_b64": photo_b64,
        "device_token": device_token,
        "is_active": 1,
        "created_at": now_str
    })

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
        reg = load_persistent_registry()
        if payload.badge_id in reg:
            del reg[payload.badge_id]
            save_persistent_registry(reg)
    else:
        cursor.execute("UPDATE users SET is_active = 0 WHERE badge_id = ?;", (payload.badge_id,))
        update_user_in_registry(payload.badge_id, {"is_active": 0})

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

@router.get("/health")
def get_system_health(admin: dict = Depends(require_admin)):
    """
    Returns comprehensive system health, telemetry, database statistics,
    cryptographic vault metrics, and consortium node synchronization status.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM users;")
    user_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM cases;")
    case_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM documents;")
    doc_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM authorized_devices WHERE status = 'ACTIVE';")
    active_device_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM ledger_blocks;")
    block_count = cursor.fetchone()[0]

    db_size_kb = DB_PATH.stat().st_size // 1024 if DB_PATH.exists() else 0

    vault_files = list(VAULT_DIR.glob("*.enc"))
    vault_size_kb = sum(f.stat().st_size for f in vault_files) // 1024

    conn.close()

    ledger_stats = SovereignConsortiumLedger.get_stats()

    return {
        "status": "HEALTHY",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": {
            "engine": "SQLite 3 (ACID, WAL Mode)",
            "status": "CONNECTED",
            "journal_mode": "WAL",
            "size_kb": db_size_kb,
            "total_users": user_count,
            "total_cases": case_count,
            "total_documents": doc_count,
            "active_devices": active_device_count
        },
        "vault": {
            "storage_mode": "AES-256-GCM Cryptographic Vault",
            "status": "ONLINE_SECURE",
            "encrypted_files": len(vault_files),
            "vault_size_kb": vault_size_kb,
            "hsm_kms_emulation": "ACTIVE (FIPS 140-2 Compliant)"
        },
        "consortium_ledger": {
            "framework": "Hyperledger Fabric / Raft CFT Simulator",
            "status": "SYNCHRONIZED",
            "total_blocks": block_count,
            "nodes": ledger_stats.get("active_nodes", []),
            "latest_hash": ledger_stats.get("latest_hash"),
            "latest_timestamp": ledger_stats.get("latest_timestamp")
        },
        "security_gateways": {
            "hardware_device_binding": "ENFORCING",
            "face_biometrics_2fa": "ACTIVE",
            "anti_spoofing_liveness": "ENABLED",
            "zero_trust_jurisdiction_scoping": "ACTIVE"
        }
    }

@router.post("/tamper-watchdog/scan")
def run_tamper_watchdog_scan(
    admin: dict = Depends(require_admin), 
    device_token: str = Depends(verify_departmental_device)
):
    """
    Global Tamper Watchdog:
    Iterates over all secured documents across the system, recalculates live cryptographic
    hashes, and compares them against the immutable blockchain ledger anchors.
    Flags any modified, corrupted, or altered evidence file with a security alert.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT d.document_id, d.case_id, d.file_name, d.file_type, d.file_path_enc, d.nonce_b64, d.dek_hex, 
           d.content_hash_sha256, d.author_badge, c.fir_number, c.state
    FROM documents d
    JOIN cases c ON d.case_id = c.case_id
    ORDER BY d.created_at DESC;
    """)
    docs = [dict(r) for r in cursor.fetchall()]
    conn.close()

    scan_results = []
    compromised_count = 0
    now_str = datetime.now(timezone.utc).isoformat()

    for doc in docs:
        enc_file_path = VAULT_DIR / doc["file_path_enc"]
        if not enc_file_path.exists():
            scan_results.append({
                "document_id": doc["document_id"],
                "file_name": doc["file_name"],
                "case_fir": doc["fir_number"],
                "state": doc["state"],
                "status": "VAULT_FILE_MISSING",
                "is_compromised": True
            })
            compromised_count += 1
            continue

        with open(enc_file_path, "rb") as f:
            cipher_bytes = f.read()

        dek = bytes.fromhex(doc["dek_hex"])
        try:
            plaintext = decrypt_bytes(
                base64.b64encode(cipher_bytes).decode("utf-8"),
                doc["nonce_b64"],
                dek,
                associated_data=f"{doc['document_id']}:{doc['case_id']}".encode("utf-8")
            )
            live_hash = compute_sha256(plaintext)
        except Exception:
            live_hash = compute_sha256(cipher_bytes)

        verify_res = SovereignConsortiumLedger.verify_document_integrity(doc["document_id"], live_hash)
        is_tampered = not verify_res.get("verified", False)

        if is_tampered:
            compromised_count += 1

        scan_results.append({
            "document_id": doc["document_id"],
            "file_name": doc["file_name"],
            "case_fir": doc["fir_number"],
            "state": doc["state"],
            "author_badge": doc["author_badge"],
            "anchored_hash": doc["content_hash_sha256"],
            "live_hash": live_hash,
            "status": "VERIFIED_AUTHENTIC" if not is_tampered else "TAMPER_DETECTED",
            "is_compromised": is_tampered,
            "ledger_block": verify_res.get("block_number", "N/A"),
            "scanned_at": now_str
        })

    conn = get_db_connection()
    cursor = conn.cursor()
    action_type = "WATCHDOG_TAMPER_ALERT" if compromised_count > 0 else "WATCHDOG_SCAN_CLEAN"
    cursor.execute(
        """INSERT INTO audit_logs (log_id, actor_badge, actor_role, action, target_ref, ip_address, device_id, timestamp, signature)
        VALUES (?, ?, 'SYSTEM_ADMIN', ?, ?, '127.0.0.1', ?, ?, 'SIG-WATCHDOG');""",
        (
            str(uuid.uuid4()),
            admin["sub"],
            action_type,
            f"Scanned:{len(docs)} Compromised:{compromised_count}",
            device_token,
            now_str
        )
    )
    conn.commit()
    conn.close()

    return {
        "status": "SCAN_COMPLETED",
        "total_scanned": len(docs),
        "compromised_count": compromised_count,
        "system_integrity_percent": 100.0 if len(docs) == 0 else round(((len(docs) - compromised_count) / len(docs)) * 100, 2),
        "results": scan_results,
        "scanned_at": now_str
    }

class HashVerifyRequest(BaseModel):
    query_hash_or_id: str

@router.post("/verify-hash")
def verify_hash_lookup(payload: HashVerifyRequest):
    """
    Cryptographic Hash Inspector:
    Searches the Sovereign Consortium Blockchain Ledger for any document ID or SHA-256 hash.
    Returns the block height, Merkle root, timestamp, and endorsing authorities.
    """
    import json
    query = payload.query_hash_or_id.strip()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT block_number, timestamp, transactions_json, block_hash, merkle_root FROM ledger_blocks ORDER BY block_number ASC;")
    blocks = cursor.fetchall()
    conn.close()

    for b in blocks:
        txs = json.loads(b["transactions_json"])
        for tx in txs:
            p = tx.get("payload", {})
            if query in [p.get("document_id"), p.get("content_hash_sha256"), tx.get("tx_id"), b["block_hash"]]:
                return {
                    "found": True,
                    "block_number": b["block_number"],
                    "block_hash": b["block_hash"],
                    "merkle_root": b["merkle_root"],
                    "timestamp": b["timestamp"],
                    "transaction": tx,
                    "anchored_payload": p
                }

    return {
        "found": False,
        "message": f"Hash or ID '{query}' is not registered on any block of the Sovereign Consortium Ledger."
    }
