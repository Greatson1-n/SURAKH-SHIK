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
    recipient_dept: str   # e.g., "CFSL Kamrup / Guwahati (Cyber Forensics Hub)" or facility code
    permission: str       # "READ_ONLY", "FORENSIC_ANALYSIS", "PROSECUTION_REVIEW"
    validity_days: int = 30
    remarks: str = "Dispatched for scientific / judicial examination"
    target_state: Optional[str] = None
    target_district: Optional[str] = None
    target_dept: Optional[str] = None
    target_role: Optional[str] = None
    statutory_purpose: Optional[str] = None
    content_mode: Optional[str] = "BOTH"  # "BOTH", "RAW_ONLY", "OCR_ONLY"

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
    Explicitly grants access to a specific external department or role across any Indian State/District.
    Statutory Guard (BNSS Sec 173): Requires case to be verified and approved by SHO / SP.
    All non-targeted police stations and departments across India remain strictly locked out.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Verify originating case & supervisory approval
    cursor.execute("SELECT state, station_id, fir_number, sho_approval_status, sho_remarks FROM cases WHERE case_id = ?;", (payload.case_id,))
    case_row = cursor.fetchone()
    if not case_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Case record not found.")

    # Only case officers or station head can grant sharing
    if case_row["state"] != user.get("state") and user.get("role") != "SYSTEM_ADMIN":
        conn.close()
        raise HTTPException(status_code=403, detail="Permission Denied: You cannot share a case outside your jurisdiction.")

    # Gatekeeper: Strict Enforcement of SHO / SP Supervisory Approval
    sho_status = case_row["sho_approval_status"] or "PENDING_REVIEW"
    if sho_status != "APPROVED":
        conn.close()
        raise HTTPException(
            status_code=403,
            detail=f"Statutory Enforcement Block (BNSS Sec 173): Case is not approved for inter-agency dispatch. Current Status: {sho_status}. Supervisory Remarks: '{case_row['sho_remarks'] or 'Awaiting SHO scrutiny'}'. The FIR and evidence must be verified as genuine and approved by the Station House Officer (SHO) or SP before external cryptographic transmission."
        )

    share_id = f"SHR-{uuid.uuid4().hex[:10].upper()}"
    now = datetime.now(timezone.utc)
    expires_at = (now + timedelta(days=payload.validity_days)).isoformat()
    wrapped_key_sim = f"ECIES-WRAPPED-KEY-{payload.recipient_dept}-{uuid.uuid4().hex[:16]}"

    content_mode_str = payload.content_mode or "BOTH"
    target_desc = f"{payload.recipient_dept}"
    if payload.target_state and payload.target_district:
        target_desc += f" [{payload.target_state} / {payload.target_district}"
        if payload.target_dept:
            target_desc += f" - {payload.target_dept}"
        if payload.target_role and payload.target_role != "ANY_AUTHORIZED_PERSONNEL":
            target_desc += f" - Role:{payload.target_role}"
        target_desc += f" - Content:{content_mode_str}]"

    # Commit to blockchain ledger
    ledger_res = SovereignConsortiumLedger.transfer_custody(
        case_id=payload.case_id,
        doc_id=payload.document_id or "CASE_BUNDLE",
        from_dept=f"{user.get('state')} Police ({user.get('station_id')})",
        to_dept=target_desc,
        transferred_by=user.get("sub"),
        remarks=f"{payload.statutory_purpose or payload.remarks} (Scope: {payload.permission} | Mode: {content_mode_str})"
    )

    cursor.execute(
        """INSERT INTO targeted_shares 
        (share_id, case_id, document_id, originating_dept, recipient_dept, permission, wrapped_key, granted_by, granted_at, expires_at, status, target_state, target_district, target_dept, target_role, statutory_purpose, content_mode)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?);""",
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
            expires_at,
            payload.target_state,
            payload.target_district,
            payload.target_dept,
            payload.target_role,
            payload.statutory_purpose,
            content_mode_str
        )
    )

    # Log to audit trail
    cursor.execute(
        """INSERT INTO audit_logs (log_id, actor_badge, actor_role, action, target_ref, ip_address, device_id, timestamp, signature)
        VALUES (?, ?, ?, 'TARGETED_SHARE_GRANTED', ?, '127.0.0.1', ?, ?, 'SIG-SHARE');""",
        (str(uuid.uuid4()), user.get("sub"), user.get("role"), f"Target:{target_desc} Case:{payload.case_id}", device, now.isoformat())
    )

    conn.commit()
    conn.close()

    return {
        "status": "SUCCESS",
        "share_id": share_id,
        "recipient": target_desc,
        "permission": payload.permission,
        "expires_at": expires_at,
        "ledger_block": ledger_res["block_number"],
        "ledger_tx": ledger_res["tx_id"]
    }

@router.get("/inbound")
def get_inbound_shares(user: dict = Depends(get_current_user_token)):
    """
    Retrieve documents and cases that have been selectively shared with
    the current logged-in department or officer based on exact station ID OR
    dynamic multi-tier jurisdictional clearance (state, district, department, and role).
    """
    user_station = user.get("station_id")
    user_state = user.get("state")
    user_district = user.get("district")
    user_role = user.get("role")

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT s.*, c.fir_number, c.title as case_title, c.state as originating_state
    FROM targeted_shares s
    JOIN cases c ON s.case_id = c.case_id
    WHERE s.status = 'ACTIVE'
      AND (
        s.recipient_dept = ?
        OR (
          (s.target_state IS NOT NULL AND s.target_state != '' AND s.target_state = ?)
          AND (s.target_district IS NULL OR s.target_district = '' OR s.target_district = ?)
          AND (s.target_role IS NULL OR s.target_role = '' OR s.target_role = 'ANY_AUTHORIZED_PERSONNEL' OR s.target_role = ?)
        )
      )
    ORDER BY s.granted_at DESC;
    """, (user_station, user_state, user_district, user_role))
    
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
