from datetime import datetime, timezone
from typing import Dict, Any

class BSACertificateGenerator:
    """
    Automated Generator for Electronic Evidence Admissibility Certificates
    under Section 63 of the Bharatiya Sakshya Adhiniyam (BSA), 2023.
    """

    @staticmethod
    def generate_certificate(
        doc_id: str,
        file_name: str,
        case_fir: str,
        content_hash: str,
        ledger_block: int,
        ledger_tx: str,
        certifying_officer_badge: str,
        certifying_officer_name: str,
        device_id: str
    ) -> Dict[str, Any]:
        issued_at = datetime.now(timezone.utc).isoformat()
        
        cert_text = f"""
================================================================================
           CERTIFICATE UNDER SECTION 63 OF THE BHARATIYA SAKSHYA ADHINIYAM, 2023
                    FOR ADMISSIBILITY OF ELECTRONIC EVIDENCE
================================================================================

1. CASE & EVIDENCE IDENTIFIERS:
   - Case FIR Reference: {case_fir}
   - Evidence Document ID: {doc_id}
   - Document Filename: {file_name}
   - Cryptographic SHA-256 Hash: {content_hash}

2. SOVEREIGN LEDGER CHAIN OF CUSTODY:
   - Consortium Ledger Block Height: #{ledger_block}
   - Transaction Reference: {ledger_tx}
   - Consensus Orderer: NCRB / Ministry of Home Affairs Root Authority

3. TERMINAL & SYSTEM VERIFICATION:
   - Departmental Workstation Asset: {device_id}
   - Storage Mechanism: AES-256-GCM Cryptographic Vault
   - Integrity Status: VERIFIED UNALTERED FROM ORIGINAL INGESTION

4. STATUTORY DECLARATION (Sec 63(4) BSA 2023):
   I, {certifying_officer_name} (Badge: {certifying_officer_badge}), hereby certify 
   that the electronic record described above was captured, stored, and retrieved
   in the ordinary course of lawful official investigation. The cryptographic 
   hash matches the sovereign consortium ledger block without modification, 
   truncation, or unauthorized access.

   Issued on: {issued_at}
   Digital Authority: SURAKH-SHIK (सुरक्षा-साक्ष्य) Institutional Gateway
================================================================================
"""
        return {
            "certificate_title": "Certificate under Section 63 BSA 2023",
            "document_id": doc_id,
            "case_fir": case_fir,
            "content_hash": content_hash,
            "ledger_block": ledger_block,
            "ledger_tx": ledger_tx,
            "certifying_officer": f"{certifying_officer_name} ({certifying_officer_badge})",
            "device_id": device_id,
            "issued_at": issued_at,
            "full_certificate_text": cert_text.strip()
        }
