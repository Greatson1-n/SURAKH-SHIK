import json
from fastapi import APIRouter
from app.models.database import get_db_connection
from app.ledger.blockchain import SovereignConsortiumLedger

router = APIRouter(prefix="/api/ledger", tags=["Sovereign Consortium Ledger"])

@router.get("/blocks")
def get_blocks():
    """Retrieve complete chain history with decoded transaction payloads."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM ledger_blocks ORDER BY block_number DESC LIMIT 50;")
    rows = cursor.fetchall()
    conn.close()

    blocks = []
    for r in rows:
        b = dict(r)
        try:
            b["transactions"] = json.loads(b["transactions_json"])
        except Exception:
            b["transactions"] = []
        blocks.append(b)

    return {"blocks": blocks}

@router.get("/stats")
def get_stats():
    """Retrieve consortium nodes status and blockchain telemetry."""
    return SovereignConsortiumLedger.get_stats()
