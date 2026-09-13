from datetime import datetime, timezone
from fastapi import Header, HTTPException, status
from app.models.database import get_db_connection, save_device_to_registry, update_device_in_registry

def verify_departmental_device(
    x_device_token: str = Header(None),
    x_device_asset: str = Header(None)
) -> str:
    """
    Validates that the incoming HTTP request originates from an authorized,
    registered departmental workstation/laptop.
    If a terminal is marked REVOKED, access is immediately blocked via Kill Switch.
    """
    if not x_device_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "status": "ACCESS_DENIED",
                "code": "SEC_ERR_DEVICE_MISSING",
                "message": "Hardware Binding Violation: No departmental device token presented. Access to SURAKH-SHIK is strictly prohibited from unauthorized machines."
            }
        )

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT status, asset_tag FROM authorized_devices WHERE device_id = ?;", (x_device_token,))
    row = cursor.fetchone()

    # Remote Kill Switch enforcement
    if row and row["status"] == "REVOKED":
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "status": "ACCESS_DENIED",
                "code": "SEC_ERR_DEVICE_REVOKED",
                "message": f"KILL SWITCH ACTIVATED: Terminal '{x_device_token}' has been remotely revoked by Departmental IT Administration under Section 66 IT Act."
            }
        )

    now_str = datetime.now(timezone.utc).isoformat()

    if not row:
        # Auto-enroll new departmental laptop with detected OS/browser asset tag
        asset_name = x_device_asset or "Departmental Laptop Terminal"
        cursor.execute(
            """INSERT INTO authorized_devices 
            (device_id, asset_tag, assigned_station, assigned_role, status, enrolled_at, last_seen_at)
            VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?);""",
            (x_device_token, asset_name, "Field Operations", "FIELD_OFFICER", now_str, now_str)
        )
        conn.commit()
        save_device_to_registry({
            "device_id": x_device_token,
            "asset_tag": asset_name,
            "assigned_station": "Field Operations",
            "assigned_role": "FIELD_OFFICER",
            "status": "ACTIVE",
            "enrolled_at": now_str,
            "last_seen_at": now_str
        })
    else:
        cursor.execute("UPDATE authorized_devices SET last_seen_at = ? WHERE device_id = ?;", (now_str, x_device_token))
        conn.commit()
        update_device_in_registry(x_device_token, {"last_seen_at": now_str})

    conn.close()
    return x_device_token
