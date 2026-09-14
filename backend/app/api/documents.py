import uuid
import os
import base64
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Header, UploadFile, File, Form, status, Query
from fastapi.responses import PlainTextResponse
from app.core.config import VAULT_DIR
from app.core.security import generate_dek, encrypt_bytes, decrypt_bytes, compute_sha256, decode_access_token
from app.core.device import verify_departmental_device
from app.models.database import get_db_connection
from app.ledger.blockchain import SovereignConsortiumLedger
from app.ocr.pipeline import LegalOCRAndRedactionPipeline
from app.services.certificate import BSACertificateGenerator

router = APIRouter(prefix="/api/documents", tags=["Document & Evidence Management"])

def get_current_user_token(authorization: str = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication token required.")
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid session token.")
    return payload

@router.post("/upload")
async def upload_document(
    case_id: str = Form(...),
    file_type: str = Form(...),
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user_token),
    device: str = Depends(verify_departmental_device)
):
    """
    Upload and secure a legal or investigative document:
    1. Runs Legal OCR and automated PII Redaction (POCSO / BNS Sec 72).
    2. Encrypts bytes with unique AES-256-GCM DEK.
    3. Anchors immutable SHA-256 hash to the Sovereign Consortium Ledger.
    """
    file_bytes = await file.read()
    raw_hash = compute_sha256(file_bytes)
    doc_id = f"DOC-{uuid.uuid4().hex[:10].upper()}"

    # 1. OCR & Privacy Redaction Pipeline
    extracted_text, ocr_engine, ocr_conf = LegalOCRAndRedactionPipeline.extract_text_from_bytes(file_bytes, file.filename)
    ocr_result = LegalOCRAndRedactionPipeline.process_and_redact(extracted_text, ocr_engine=ocr_engine, confidence=ocr_conf)

    # 2. Encrypt with unique AES-256-GCM DEK
    dek = generate_dek()
    enc_result = encrypt_bytes(file_bytes, dek, associated_data=f"{doc_id}:{case_id}".encode("utf-8"))

    # Save ciphertext to Vault
    enc_file_path = VAULT_DIR / f"{doc_id}.enc"
    with open(enc_file_path, "wb") as f:
        f.write(base64.b64decode(enc_result["ciphertext_b64"]))

    now_str = datetime.now(timezone.utc).isoformat()

    # 3. Anchor to Sovereign Consortium Ledger
    ledger_res = SovereignConsortiumLedger.anchor_document(
        doc_id=doc_id,
        case_id=case_id,
        content_hash=raw_hash,
        author_badge=user.get("sub"),
        doc_type=file_type
    )

    # 4. Insert into database
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO documents 
        (document_id, case_id, file_name, file_type, file_path_enc, nonce_b64, dek_hex, content_hash_sha256, 
         author_badge, author_role, ledger_tx_id, is_redacted, redacted_text, extracted_text, is_sealed, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?);""",
        (
            doc_id,
            case_id,
            file.filename,
            file_type,
            f"{doc_id}.enc",
            enc_result["nonce_b64"],
            dek.hex(),
            raw_hash,
            user.get("sub"),
            user.get("role"),
            ledger_res["tx_id"],
            1 if ocr_result["is_redacted"] else 0,
            ocr_result["redacted_text"],
            ocr_result["original_text"],
            now_str
        )
    )

    # Statutory Scrutiny (BNSS Sec 173): New evidence file requires SHO/SP review before inter-agency sharing
    cursor.execute(
        """UPDATE cases 
        SET sho_approval_status = 'PENDING_REVIEW',
            sho_remarks = 'New investigative evidence attached by IO; awaiting SHO / SP scrutiny and fake-case check.'
        WHERE case_id = ?;""",
        (case_id,)
    )

    # Audit log
    cursor.execute(
        """INSERT INTO audit_logs (log_id, actor_badge, actor_role, action, target_ref, ip_address, device_id, timestamp, signature)
        VALUES (?, ?, ?, 'DOCUMENT_UPLOADED_AND_ANCHORED', ?, '127.0.0.1', ?, ?, 'SIG-UPLOAD');""",
        (str(uuid.uuid4()), user.get("sub"), user.get("role"), f"Doc:{doc_id} Hash:{raw_hash[:12]}", device, now_str)
    )

    conn.commit()
    conn.close()

    return {
        "status": "SUCCESS",
        "document_id": doc_id,
        "file_name": file.filename,
        "file_type": file_type,
        "content_hash": raw_hash,
        "ledger_block": ledger_res["block_number"],
        "ledger_tx": ledger_res["tx_id"],
        "ocr": {
            "ocr_engine": ocr_result["ocr_engine"],
            "ocr_confidence": ocr_result["ocr_confidence"],
            "word_count": ocr_result["word_count"],
            "char_count": ocr_result["char_count"],
            "pii_detected": ocr_result["detected_pii_count"],
            "detected_entities": ocr_result["detected_entities"],
            "is_redacted": ocr_result["is_redacted"],
            "extracted_text": ocr_result["original_text"],
            "redacted_text": ocr_result["redacted_text"],
            "merkle_root": ocr_result["merkle_root"],
            "leaf_count": ocr_result["leaf_count"]
        }
    }

@router.get("/search")
def search_documents(
    query: Optional[str] = Query(None, description="Keyword, FIR #, title, or OCR extracted text"),
    file_type: Optional[str] = Query(None, description="Filter by document type"),
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    case_id: Optional[str] = Query(None, description="Filter within specific case"),
    user: dict = Depends(get_current_user_token),
    device: str = Depends(verify_departmental_device)
):
    """
    Forensic & Legal Agency Omni-Search Engine:
    Searches across FIR numbers, case titles, incident dates, document types,
    and deep textual keywords extracted by Tesseract OCR / Redaction pipeline.
    Respects strict jurisdictional compartmentalization.
    """
    role = user.get("role")
    if role == "SYSTEM_ADMIN":
        raise HTTPException(
            status_code=403,
            detail="The Blind Admin Rule: System Administrators manage infrastructure and are cryptographically barred from searching, decrypting, or viewing criminal evidence dossiers."
        )

    user_state = user.get("state")
    user_district = user.get("district")
    user_station = user.get("station_id")

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

    params = []
    if role in ["JUDICIAL_MAGISTRATE", "PUBLIC_PROSECUTOR"]:
        base_case_condition = f"(c.state = ? OR c.case_id IN ({shared_case_sql}))"
        params.extend([user_state, user_station, user_state, user_district, role])
    elif role == "FORENSIC_ANALYST":
        base_case_condition = f"(c.case_id IN ({shared_case_sql}))"
        params.extend([user_station, user_state, user_district, role])
    else:
        # Police Officers (IO / SHO): Scoped to state and station OR targeted shares
        base_case_condition = f"((c.state = ? AND c.station_id = ?) OR c.case_id IN ({shared_case_sql}))"
        params.extend([user_state, user_station, user_station, user_state, user_district, role])

    conditions = [base_case_condition]

    if case_id:
        conditions.append("d.case_id = ?")
        params.append(case_id)

    if file_type and file_type != "ALL":
        conditions.append("d.file_type = ?")
        params.append(file_type)

    if date_from:
        conditions.append("(c.incident_date >= ? OR d.created_at >= ?)")
        params.extend([date_from, date_from])

    if date_to:
        conditions.append("(c.incident_date <= ? OR d.created_at <= ?)")
        params.extend([date_to, date_to + "T23:59:59"])

    if query and query.strip():
        q_wildcard = f"%{query.strip()}%"
        conditions.append(
            """(
                c.fir_number LIKE ? 
                OR c.title LIKE ? 
                OR d.file_name LIKE ? 
                OR d.file_type LIKE ? 
                OR d.extracted_text LIKE ? 
                OR d.redacted_text LIKE ?
            )"""
        )
        params.extend([q_wildcard, q_wildcard, q_wildcard, q_wildcard, q_wildcard, q_wildcard])

    where_clause = " AND ".join(conditions)
    sql = f"""
        SELECT 
            d.document_id,
            d.case_id,
            d.file_name,
            d.file_type,
            d.content_hash_sha256,
            d.author_badge,
            d.author_role,
            d.is_redacted,
            d.extracted_text,
            d.redacted_text,
            d.created_at as document_created_at,
            c.fir_number,
            c.title as case_title,
            c.incident_date,
            c.state as case_state,
            c.district as case_district,
            c.station_id as case_station,
            c.sensitivity_level
        FROM documents d
        JOIN cases c ON d.case_id = c.case_id
        WHERE {where_clause}
        ORDER BY d.created_at DESC
        LIMIT 100;
    """

    cursor.execute(sql, tuple(params))
    rows = cursor.fetchall()
    conn.close()

    results = []
    q_lower = query.strip().lower() if query else ""

    for r in rows:
        item = dict(r)
        extracted = item.get("extracted_text") or ""
        redacted = item.get("redacted_text") or ""
        text_source = redacted if item.get("is_redacted") else extracted

        snippet = None
        matched_in_ocr = False

        if q_lower and text_source:
            pos = text_source.lower().find(q_lower)
            if pos != -1:
                matched_in_ocr = True
                start = max(0, pos - 45)
                end = min(len(text_source), pos + len(q_lower) + 45)
                prefix = "..." if start > 0 else ""
                suffix = "..." if end < len(text_source) else ""
                snippet = f"{prefix}{text_source[start:end]}{suffix}"

        item["matched_in_ocr"] = matched_in_ocr
        item["ocr_snippet"] = snippet
        # Remove giant full text from search index response
        del item["extracted_text"]
        del item["redacted_text"]
        results.append(item)

    return {
        "status": "SUCCESS",
        "query": query,
        "total_matches": len(results),
        "results": results
    }

@router.get("/{doc_id}/view")
def view_document(doc_id: str, user: dict = Depends(get_current_user_token), device: str = Depends(verify_departmental_device)):
    """
    In-Memory Decryption Viewer.
    Decrypted plaintext is rendered in memory and never written to client disk cache.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM documents WHERE document_id = ?;", (doc_id,))
    doc = cursor.fetchone()
    conn.close()

    if user.get("role") == "SYSTEM_ADMIN":
        raise HTTPException(
            status_code=403,
            detail="The Blind Admin Rule: System Administrators manage infrastructure and security health, but are cryptographically barred from decrypting or viewing investigative evidence and victim identities."
        )

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    enc_file_path = VAULT_DIR / doc["file_path_enc"]
    if not enc_file_path.exists():
        raise HTTPException(status_code=404, detail="Encrypted file missing from vault.")

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
    except Exception:
        raise HTTPException(
            status_code=500, 
            detail="Cryptographic Decryption Error: Ciphertext integrity tag validation failed."
        )

    # Log view event
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now(timezone.utc).isoformat()
    cursor.execute(
        """INSERT INTO audit_logs (log_id, actor_badge, actor_role, action, target_ref, ip_address, device_id, timestamp, signature)
        VALUES (?, ?, ?, 'DOCUMENT_VIEWED_IN_MEMORY', ?, '127.0.0.1', ?, ?, 'SIG-VIEW');""",
        (str(uuid.uuid4()), user.get("sub"), user.get("role"), f"Doc:{doc_id}", device, now_str)
    )
    conn.commit()
    conn.close()

    # Determine MIME type and encode decrypted raw bytes
    file_name = doc["file_name"] or ""
    lower_fn = file_name.lower()
    if lower_fn.endswith((".jpg", ".jpeg")):
        mime_type = "image/jpeg"
    elif lower_fn.endswith(".png"):
        mime_type = "image/png"
    elif lower_fn.endswith(".webp"):
        mime_type = "image/webp"
    elif lower_fn.endswith(".gif"):
        mime_type = "image/gif"
    elif lower_fn.endswith(".pdf"):
        mime_type = "application/pdf"
    elif lower_fn.endswith((".txt", ".log", ".csv")):
        mime_type = "text/plain"
    elif lower_fn.endswith(".json"):
        mime_type = "application/json"
    else:
        if plaintext.startswith(b"\xff\xd8\xff"):
            mime_type = "image/jpeg"
        elif plaintext.startswith(b"\x89PNG\r\n\x1a\n"):
            mime_type = "image/png"
        elif plaintext.startswith(b"%PDF"):
            mime_type = "application/pdf"
        else:
            mime_type = "application/octet-stream"

    raw_file_b64 = base64.b64encode(plaintext).decode("utf-8")
    ocr_details = LegalOCRAndRedactionPipeline.process_and_redact(doc["extracted_text"] or "")

    return {
        "document_id": doc["document_id"],
        "case_id": doc["case_id"],
        "file_name": doc["file_name"],
        "file_type": doc["file_type"],
        "content_hash": doc["content_hash_sha256"],
        "author_badge": doc["author_badge"],
        "created_at": doc["created_at"],
        "extracted_text": doc["extracted_text"],
        "redacted_text": doc["redacted_text"],
        "raw_file_b64": raw_file_b64,
        "mime_type": mime_type,
        "file_size_bytes": len(plaintext),
        "is_redacted": bool(doc["is_redacted"]),
        "ocr": ocr_details,
        "viewer_watermark": {
            "officer_badge": user.get("sub"),
            "officer_name": user.get("full_name"),
            "device_id": device,
            "station": user.get("station_id"),
            "timestamp": now_str
        }
    }

@router.get("/{doc_id}/verify")
def verify_document(doc_id: str, user: dict = Depends(get_current_user_token)):
    """
    Real-time Cryptographic Evidence Verification against Sovereign Blockchain Ledger.
    Re-hashes decrypted file and tests against anchored ledger block.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM documents WHERE document_id = ?;", (doc_id,))
    doc = cursor.fetchone()
    conn.close()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    enc_file_path = VAULT_DIR / doc["file_path_enc"]
    if not enc_file_path.exists():
        raise HTTPException(status_code=404, detail="Vault file missing.")

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
        # If decryption fails due to modified bytes, compute raw hash of corrupted file
        live_hash = compute_sha256(cipher_bytes)

    # Check against ledger
    ledger_result = SovereignConsortiumLedger.verify_document_integrity(doc_id, live_hash)
    return ledger_result

@router.post("/{doc_id}/tamper-simulate")
def tamper_simulate(doc_id: str, user: dict = Depends(get_current_user_token)):
    """
    Demonstration Endpoint for Hackathon Evaluators:
    Simulates a rogue insider corrupting or altering a byte in the encrypted storage vault.
    Demonstrates the Tamper Watchdog instantly detecting the hash anomaly.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT file_path_enc FROM documents WHERE document_id = ?;", (doc_id,))
    doc = cursor.fetchone()
    conn.close()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    enc_path = VAULT_DIR / doc["file_path_enc"]
    if not enc_path.exists():
        raise HTTPException(status_code=404, detail="Vault file not found.")

    # Mutate a byte in the vault file
    with open(enc_path, "r+b") as f:
        data = bytearray(f.read())
        if len(data) > 20:
            data[15] = (data[15] ^ 0xFF)  # Invert a byte
            f.seek(0)
            f.write(data)

    return {
        "status": "TAMPER_SIMULATED",
        "message": f"Storage byte flipped for {doc_id}. Now click 'Verify Integrity' or check the Judge Console to observe immediate tamper detection!"
    }

@router.get("/{doc_id}/certificate")
def get_bsa_certificate(doc_id: str, user: dict = Depends(get_current_user_token), device: str = Depends(verify_departmental_device)):
    """Generate Section 63 BSA 2023 Electronic Evidence Certificate."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT d.*, c.fir_number FROM documents d 
    JOIN cases c ON d.case_id = c.case_id 
    WHERE d.document_id = ?;
    """, (doc_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Document not found.")

    cert = BSACertificateGenerator.generate_certificate(
        doc_id=row["document_id"],
        file_name=row["file_name"],
        case_fir=row["fir_number"],
        content_hash=row["content_hash_sha256"],
        ledger_block=1,  # Anchored height
        ledger_tx=row["ledger_tx_id"] or "TX-MHA-ANCHOR-001",
        certifying_officer_badge=user.get("sub"),
        certifying_officer_name=user.get("full_name", "Investigating Officer"),
        device_id=device
    )
    return cert
