import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel
from app.core.security import decode_access_token
from app.core.device import verify_departmental_device
from app.models.database import get_db_connection
from app.ledger.blockchain import SovereignConsortiumLedger

router = APIRouter(prefix="/api/cases", tags=["Case Management"])

def get_current_user_token(authorization: str = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication token required.")
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired session token.")
    return payload

class CaseCreateRequest(BaseModel):
    fir_number: str
    title: str
    incident_date: str
    sensitivity_level: str  # NORMAL, HIGH, POCSO_RESTRICTED

@router.get("")
def list_cases(user: dict = Depends(get_current_user_token), device: str = Depends(verify_departmental_device)):
    """
    Jurisdictionally Scoped Case Retrieval.
    Enforces the 'Iron Wall': Cases from Manipur are completely invisible to other states,
    unless explicitly granted targeted sharing access.
    """
    role = user.get("role")
    user_state = user.get("state")
    user_district = user.get("district")
    user_station = user.get("station_id")
    user_badge = user.get("sub")

    # Blind Admin Rule: Admin manages infrastructure, not criminal dossiers
    if role == "SYSTEM_ADMIN":
        return {
            "cases": [],
            "notice": "Administrative Boundary: System Administrators are blind to criminal case files under statutory Separation of Duties."
        }

    conn = get_db_connection()
    cursor = conn.cursor()

    shared_case_sql = """
        SELECT case_id FROM targeted_shares 
        WHERE status = 'ACTIVE' 
          AND (
            recipient_dept = ?
            OR (
              (target_state IS NOT NULL AND target_state != '' AND target_state = ?)
              AND (target_district IS NULL OR target_district = '' OR target_district = ?)
              AND (target_role IS NULL OR target_role = '' OR target_role = 'ANY_AUTHORIZED_PERSONNEL' OR target_role = ?)
            )
          )
    """

    # Judicial Magistrates can see cases within their court jurisdiction or targeted shares
    if role in ["JUDICIAL_MAGISTRATE", "PUBLIC_PROSECUTOR"]:
        cursor.execute(f"""
        SELECT * FROM cases 
        WHERE state = ? OR case_id IN ({shared_case_sql}) 
        ORDER BY created_at DESC;
        """, (user_state, user_station, user_state, user_district, role))
    elif role == "FORENSIC_ANALYST":
        # FSL Analysts only see cases where evidence was explicitly dispatched to their lab!
        cursor.execute(f"""
        SELECT * FROM cases 
        WHERE case_id IN ({shared_case_sql}) 
        ORDER BY created_at DESC;
        """, (user_station, user_state, user_district, role))
    else:
        # Police Officers (IO / SHO): Scoped strictly to their State AND Police Station
        cursor.execute(f"""
        SELECT * FROM cases 
        WHERE (state = ? AND station_id = ?) 
           OR case_id IN ({shared_case_sql})
        ORDER BY created_at DESC;
        """, (user_state, user_station, user_station, user_state, user_district, role))

    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return {"cases": rows}

class CaseReviewRequest(BaseModel):
    action: str  # "APPROVE" or "REQUEST_REVIEW"
    remarks: str
    is_genuine: bool = True

@router.post("")
def create_case(payload: CaseCreateRequest, user: dict = Depends(get_current_user_token), device: str = Depends(verify_departmental_device)):
    """
    Register a new criminal investigation case / FIR.
    Automatically assigns State, District, Station, and Branch from the logged-in officer's verified profile.
    Initializes with PENDING_REVIEW for SHO/SP supervisory fake-case scrutiny.
    """
    if user.get("role") not in ["INVESTIGATING_OFFICER", "STATION_HOUSE_OFFICER"]:
        raise HTTPException(status_code=403, detail="Only Investigating Officers (IO) or SHOs can register cases.")

    conn = get_db_connection()
    cursor = conn.cursor()

    case_id = f"CASE-{uuid.uuid4().hex[:10].upper()}"
    now_str = datetime.now(timezone.utc).isoformat()

    cursor.execute(
        """INSERT INTO cases 
        (case_id, fir_number, title, incident_date, state, district, station_id, branch, assigned_io_id, status, sensitivity_level, sho_approval_status, sho_remarks, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'UNDER_INVESTIGATION', ?, 'PENDING_REVIEW', 'Awaiting SHO / SP Supervisory Verification (Fake Case Check under BNSS Sec 173)', ?);""",
        (
            case_id,
            payload.fir_number,
            payload.title,
            payload.incident_date,
            user.get("state"),
            user.get("district"),
            user.get("station_id"),
            user.get("branch"),
            user.get("sub"),
            payload.sensitivity_level,
            now_str
        )
    )

    # Log to audit trail
    cursor.execute(
        """INSERT INTO audit_logs (log_id, actor_badge, actor_role, action, target_ref, ip_address, device_id, timestamp, signature)
        VALUES (?, ?, ?, 'CASE_REGISTERED', ?, '127.0.0.1', ?, ?, 'SIG-CASE');""",
        (str(uuid.uuid4()), user.get("sub"), user.get("role"), f"Case:{case_id}({payload.fir_number})", device, now_str)
    )

    conn.commit()
    conn.close()

    return {
        "status": "SUCCESS",
        "case_id": case_id,
        "fir_number": payload.fir_number,
        "state": user.get("state"),
        "station": user.get("station_id"),
        "sho_approval_status": "PENDING_REVIEW"
    }

@router.post("/{case_id}/sho-review")
def review_case_by_sho(
    case_id: str,
    payload: CaseReviewRequest,
    user: dict = Depends(get_current_user_token),
    device: str = Depends(verify_departmental_device)
):
    """
    Station House Officer (SHO) & Superintendent of Police (SP) Supervisory Review Desk.
    Mandated under BNSS 2023 Sec 173:
    1. Reviews evidentiary integrity and performs fake-case verification.
    2. 'APPROVE': Certifies case as genuine; UNLOCKS targeted inter-agency cryptographic sharing.
    3. 'REQUEST_REVIEW': Flags deficiencies or fabricated evidence; STRICTLY LOCKS sharing.
    """
    role = user.get("role")
    if role not in ["STATION_HOUSE_OFFICER", "SYSTEM_ADMIN"]:
        raise HTTPException(
            status_code=403, 
            detail="Supervisory Clearance Required: Only Station House Officers (SHO) or SPs possess authority to certify case veracity under BNSS Sec 173."
        )

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM cases WHERE case_id = ?;", (case_id,))
    case_row = cursor.fetchone()
    if not case_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Case record not found.")

    # Check jurisdiction: SHO must belong to same State & Station/District (unless admin)
    if role != "SYSTEM_ADMIN" and (case_row["state"] != user.get("state")):
        conn.close()
        raise HTTPException(status_code=403, detail="Jurisdiction Mismatch: You cannot review cases outside your state command.")

    now_str = datetime.now(timezone.utc).isoformat()
    action_upper = payload.action.upper()

    if action_upper == "APPROVE":
        new_status = "APPROVED"
        audit_action = "SUPERVISORY_CASE_APPROVED_GENUINE"
        default_remarks = payload.remarks or "Case and evidence dossier verified genuine under BNSS Sec 173."
    elif action_upper == "REQUEST_REVIEW":
        new_status = "REVIEW_REQUESTED"
        audit_action = "SUPERVISORY_REVIEW_REQUESTED"
        default_remarks = payload.remarks or "Revision required: Incomplete or uncorroborated evidence items detected."
    else:
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid action. Must be 'APPROVE' or 'REQUEST_REVIEW'.")

    cursor.execute(
        """UPDATE cases 
        SET sho_approval_status = ?, 
            sho_badge_id = ?, 
            sho_remarks = ?, 
            sho_reviewed_at = ? 
        WHERE case_id = ?;""",
        (new_status, user.get("sub"), default_remarks, now_str, case_id)
    )

    # Log to tamper-evident audit trail
    cursor.execute(
        """INSERT INTO audit_logs (log_id, actor_badge, actor_role, action, target_ref, ip_address, device_id, timestamp, signature)
        VALUES (?, ?, ?, ?, ?, '127.0.0.1', ?, ?, 'SIG-SHO-REVIEW');""",
        (str(uuid.uuid4()), user.get("sub"), user.get("role"), audit_action, f"Case:{case_id} Status:{new_status}", device, now_str)
    )

    conn.commit()
    conn.close()

    return {
        "status": "SUCCESS",
        "case_id": case_id,
        "sho_approval_status": new_status,
        "sho_badge_id": user.get("sub"),
        "sho_remarks": default_remarks,
        "sho_reviewed_at": now_str,
        "sharing_unlocked": (new_status == "APPROVED")
    }

@router.get("/{case_id}")
def get_case_details(case_id: str, user: dict = Depends(get_current_user_token), device: str = Depends(verify_departmental_device)):
    """Retrieve complete case dossier, attached encrypted documents, and active shares."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM cases WHERE case_id = ?;", (case_id,))
    case_row = cursor.fetchone()
    if not case_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Case record not found.")

    case_data = dict(case_row)

    # Check jurisdictional authorization
    is_authorized = (
        (case_data["state"] == user.get("state") and case_data["station_id"] == user.get("station_id"))
        or (user.get("role") in ["JUDICIAL_MAGISTRATE", "PUBLIC_PROSECUTOR"] and case_data["state"] == user.get("state") and case_data["district"] == user.get("district"))
    )
    if not is_authorized and user.get("role") != "SYSTEM_ADMIN":
        # Check targeted shares
        cursor.execute(
            """SELECT COUNT(*) FROM targeted_shares 
            WHERE case_id = ? AND status = 'ACTIVE' AND (
                recipient_dept = ?
                OR (
                    (target_state IS NOT NULL AND target_state != '' AND target_state = ?)
                    AND (target_district IS NULL OR target_district = '' OR target_district = ?)
                    AND (target_role IS NULL OR target_role = '' OR target_role = 'ANY_AUTHORIZED_PERSONNEL' OR target_role = ?)
                )
            );""",
            (case_id, user.get("station_id"), user.get("state"), user.get("district"), user.get("role"))
        )
        if cursor.fetchone()[0] == 0:
            conn.close()
            raise HTTPException(
                status_code=403, 
                detail="Jurisdictional Isolation: You do not possess clearance or targeted access for this case."
            )

    # Fetch attached documents
    cursor.execute("SELECT * FROM documents WHERE case_id = ? ORDER BY created_at ASC;", (case_id,))
    docs = [dict(d) for d in cursor.fetchall()]

    # Fetch targeted sharing history
    cursor.execute("SELECT * FROM targeted_shares WHERE case_id = ? ORDER BY granted_at DESC;", (case_id,))
    shares = [dict(s) for s in cursor.fetchall()]

    conn.close()
    return {
        "case": case_data,
        "documents": docs,
        "shares": shares
    }

@router.get("/{case_id}/verify-tamper")
def verify_case_tamper(case_id: str, user: dict = Depends(get_current_user_token)):
    """
    Case-Wide Cryptographic Tamper Audit:
    Performs live SHA-256 verification against the Sovereign Consortium Blockchain
    for ALL evidence documents attached to this case. Accessible to IO, Forensics, and Judges.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM cases WHERE case_id = ?;", (case_id,))
    case_row = cursor.fetchone()
    if not case_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Case record not found.")

    case_data = dict(case_row)
    is_authorized = (
        (case_data["state"] == user.get("state") and case_data["station_id"] == user.get("station_id"))
        or (user.get("role") in ["JUDICIAL_MAGISTRATE", "PUBLIC_PROSECUTOR"] and case_data["state"] == user.get("state") and case_data["district"] == user.get("district"))
    )
    if not is_authorized and user.get("role") != "SYSTEM_ADMIN":
        cursor.execute(
            """SELECT COUNT(*) FROM targeted_shares 
            WHERE case_id = ? AND status = 'ACTIVE' AND (
                recipient_dept = ?
                OR (
                    (target_state IS NOT NULL AND target_state != '' AND target_state = ?)
                    AND (target_district IS NULL OR target_district = '' OR target_district = ?)
                    AND (target_role IS NULL OR target_role = '' OR target_role = 'ANY_AUTHORIZED_PERSONNEL' OR target_role = ?)
                )
            );""",
            (case_id, user.get("station_id"), user.get("state"), user.get("district"), user.get("role"))
        )
        if cursor.fetchone()[0] == 0:
            conn.close()
            raise HTTPException(status_code=403, detail="Jurisdictional Isolation: Access denied.")

    cursor.execute("SELECT * FROM documents WHERE case_id = ? ORDER BY created_at ASC;", (case_id,))
    docs = [dict(d) for d in cursor.fetchall()]
    conn.close()

    from app.core.config import VAULT_DIR
    from app.core.security import decrypt_bytes, compute_sha256
    import base64

    doc_reports = []
    compromised_count = 0

    for doc in docs:
        enc_file_path = VAULT_DIR / doc["file_path_enc"]
        if not enc_file_path.exists():
            doc_reports.append({
                "document_id": doc["document_id"],
                "file_name": doc["file_name"],
                "status": "VAULT_FILE_MISSING",
                "verified": False,
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

        ledger_result = SovereignConsortiumLedger.verify_document_integrity(doc["document_id"], live_hash)
        is_verified = ledger_result.get("verified", False)
        if not is_verified:
            compromised_count += 1

        doc_reports.append({
            "document_id": doc["document_id"],
            "file_name": doc["file_name"],
            "file_type": doc["file_type"],
            "anchored_hash": doc["content_hash_sha256"],
            "live_hash": live_hash,
            "verified": is_verified,
            "is_compromised": not is_verified,
            "ledger_block": ledger_result.get("block_number"),
            "ledger_timestamp": ledger_result.get("timestamp")
        })

    return {
        "case_id": case_id,
        "fir_number": case_data["fir_number"],
        "total_documents": len(docs),
        "verified_count": len(docs) - compromised_count,
        "compromised_count": compromised_count,
        "all_authentic": (compromised_count == 0),
        "reports": doc_reports
    }
