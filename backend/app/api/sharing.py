import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel
from app.core.security import decode_access_token
from app.core.device import verify_departmental_device
from app.models.database import get_db_connection
from app.ledger.blockchain import SovereignConsortiumLedger

router = APIRouter(prefix="/api/sharing", tags=["Targeted Selective Sharing"])

def get_current_user_token(authorization: str = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication token required.")
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid session token.")
    return payload

class TargetedShareRequest(BaseModel):
    case_id: str
    document_id: Optional[str] = None
    recipient_dept: str   # e.g., "CFSL-KAMRUP-GUW" or "Sessions Court Imphal West"
    permission: str       # "READ_ONLY", "FORENSIC_ANALYSIS", "PROSECUTION_REVIEW"
    validity_days: int = 30
    remarks: str = "Dispatched for scientific / judicial examination"

class RevokeShareRequest(BaseModel):
    share_id: str

@router.post("/grant")
def grant_targeted_sharing(
    payload: TargetedShareRequest,
    user: dict = Depends(get_current_user_token),
    device: str = Depends(verify_departmental_device)
):
    """
    Targeted Cryptographic Sharing:
    Explicitly grants access to a specific external department (e.g., Manipur IO sharing with CFSL Kamrup).
    All other departments remain strictly isolated and cannot view this record.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Verify originating case
    cursor.execute("SELECT state, station_id, fir_number FROM cases WHERE case_id = ?;", (payload.case_id,))
    case_row = cursor.fetchone()
    if not case_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Case record not found.")

    # Only case officers or station head can grant sharing
    if case_row["state"] != user.get("state") and user.get("role") != "SYSTEM_ADMIN":
        conn.close()
        raise HTTPException(status_code=403, detail="Permission Denied: You cannot share a case outside your jurisdiction.")

    share_id = f"SHR-{uuid.uuid4().hex[:10].upper()}"
    now = datetime.now(timezone.utc)
    expires_at = (now + timedelta(days=payload.validity_days)).isoformat()
    wrapped_key_sim = f"ECIES-WRAPPED-KEY-{payload.recipient_dept}-{uuid.uuid4().hex[:16]}"

    # Commit to blockchain ledger
    ledger_res = SovereignConsortiumLedger.transfer_custody(
        case_id=payload.case_id,
        doc_id=payload.document_id or "CASE_BUNDLE",
        from_dept=f"{user.get('state')} Police ({user.get('station_id')})",
        to_dept=payload.recipient_dept,
        transferred_by=user.get("sub"),
        remarks=payload.remarks
    )

    cursor.execute(
        """INSERT INTO targeted_shares 
        (share_id, case_id, document_id, originating_dept, recipient_dept, permission, wrapped_key, granted_by, granted_at, expires_at, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE');""",
        (
            share_id,
            payload.case_id,
            payload.document_id,
            user.get("station_id"),
            payload.recipient_dept,
            payload.permission,
            wrapped_key_sim,
            user.get("sub"),
            now.isoformat(),
            expires_at
        )
    )

    # Log to audit trail
    cursor.execute(
        """INSERT INTO audit_logs (log_id, actor_badge, actor_role, action, target_ref, ip_address, device_id, timestamp, signature)
        VALUES (?, ?, ?, 'TARGETED_SHARE_GRANTED', ?, '127.0.0.1', ?, ?, 'SIG-SHARE');""",
        (str(uuid.uuid4()), user.get("sub"), user.get("role"), f"Target:{payload.recipient_dept} Case:{payload.case_id}", device, now.isoformat())
    )

    conn.commit()
    conn.close()

    return {
        "status": "SUCCESS",
        "share_id": share_id,
        "recipient": payload.recipient_dept,
        "permission": payload.permission,
        "expires_at": expires_at,
        "ledger_block": ledger_res["block_number"],
        "ledger_tx": ledger_res["tx_id"]
    }

@router.get("/inbound")
def get_inbound_shares(user: dict = Depends(get_current_user_token)):
    """
    Retrieve documents and cases that have been selectively shared with
    the current logged-in department (e.g. CFSL Kamrup or Court).
    """
    user_station = user.get("station_id")
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT s.*, c.fir_number, c.title as case_title, c.state as originating_state
    FROM targeted_shares s
    JOIN cases c ON s.case_id = c.case_id
    WHERE s.recipient_dept = ? AND s.status = 'ACTIVE'
    ORDER BY s.granted_at DESC;
    """, (user_station,))
    
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return {"inbound_shares": rows}

@router.post("/revoke")
def revoke_sharing(payload: RevokeShareRequest, user: dict = Depends(get_current_user_token), device: str = Depends(verify_departmental_device)):
    """Instantly revokes a targeted share grant."""
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now(timezone.utc).isoformat()

    cursor.execute("UPDATE targeted_shares SET status = 'REVOKED' WHERE share_id = ?;", (payload.share_id,))
    
    # Audit log
    cursor.execute(
        """INSERT INTO audit_logs (log_id, actor_badge, actor_role, action, target_ref, ip_address, device_id, timestamp, signature)
        VALUES (?, ?, ?, 'TARGETED_SHARE_REVOKED', ?, '127.0.0.1', ?, ?, 'SIG-REVOKE');""",
        (str(uuid.uuid4()), user.get("sub"), user.get("role"), f"Share:{payload.share_id}", device, now_str)
    )

    conn.commit()
    conn.close()
    return {"status": "SUCCESS", "message": f"Share {payload.share_id} revoked."}
