from fastapi import Header, HTTPException, status
from app.models.database import get_db_connection

def verify_departmental_device(x_device_token: str = Header(None)) -> str:
    """
    Validates that the incoming HTTP request originates from an authorized,
    registered departmental workstation/laptop.
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
    conn.close()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "status": "ACCESS_DENIED",
                "code": "SEC_ERR_DEVICE_UNREGISTERED",
                "message": f"Hardware Binding Violation: Terminal '{x_device_token}' is not an authorized departmental workstation. Intrusion telemetry logged."
            }
        )

    if row["status"] != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "status": "ACCESS_DENIED",
                "code": "SEC_ERR_DEVICE_REVOKED",
                "message": f"Security Violation: Terminal '{x_device_token}' has been REVOKED or marked COMPROMISED by the IT Administrator."
            }
        )

    return x_device_token
