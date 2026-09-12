import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel
from app.core.security import decode_access_token
from app.core.device import verify_departmental_device
from app.models.database import get_db_connection

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

    # Judicial Magistrates can see cases within their court jurisdiction
    if role in ["JUDICIAL_MAGISTRATE", "PUBLIC_PROSECUTOR"]:
        cursor.execute("""
        SELECT * FROM cases 
        WHERE state = ? OR case_id IN (
            SELECT case_id FROM targeted_shares WHERE recipient_dept = ? AND status = 'ACTIVE'
        ) ORDER BY created_at DESC;
        """, (user_state, user_station))
    elif role == "FORENSIC_ANALYST":
        # FSL Analysts only see cases where evidence was explicitly dispatched to their lab!
        cursor.execute("""
        SELECT * FROM cases 
        WHERE case_id IN (
            SELECT case_id FROM targeted_shares WHERE recipient_dept = ? AND status = 'ACTIVE'
        ) ORDER BY created_at DESC;
        """, (user_station,))
    else:
        # Police Officers (IO / SHO): Scoped strictly to their State AND Police Station
        cursor.execute("""
        SELECT * FROM cases 
        WHERE (state = ? AND station_id = ?) 
           OR case_id IN (
               SELECT case_id FROM targeted_shares WHERE recipient_dept = ? AND status = 'ACTIVE'
           )
        ORDER BY created_at DESC;
        """, (user_state, user_station, user_station))

    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return {"cases": rows}

@router.post("")
def create_case(payload: CaseCreateRequest, user: dict = Depends(get_current_user_token), device: str = Depends(verify_departmental_device)):
    """
    Register a new criminal investigation case / FIR.
    Automatically assigns State, District, Station, and Branch from the logged-in officer's verified profile.
    """
    if user.get("role") not in ["INVESTIGATING_OFFICER", "STATION_HOUSE_OFFICER"]:
        raise HTTPException(status_code=403, detail="Only Investigating Officers (IO) or SHOs can register cases.")

    conn = get_db_connection()
    cursor = conn.cursor()

    case_id = f"CASE-{uuid.uuid4().hex[:10].upper()}"
    now_str = datetime.now(timezone.utc).isoformat()

    cursor.execute(
        """INSERT INTO cases 
        (case_id, fir_number, title, incident_date, state, district, station_id, branch, assigned_io_id, status, sensitivity_level, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'UNDER_INVESTIGATION', ?, ?);""",
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
        "station": user.get("station_id")
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
        case_data["state"] == user.get("state") and case_data["station_id"] == user.get("station_id")
    )
    if not is_authorized and user.get("role") != "SYSTEM_ADMIN":
        # Check targeted shares
        cursor.execute(
            "SELECT COUNT(*) FROM targeted_shares WHERE case_id = ? AND recipient_dept = ? AND status = 'ACTIVE';",
            (case_id, user.get("station_id"))
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
