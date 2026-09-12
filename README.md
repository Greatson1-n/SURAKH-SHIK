# SURAKH-SHIK (सुरक्षा-साक्ष्य)
### Secure Digital Evidence & Legal Document Management System
**Ministry of Home Affairs (MHA) &bull; National Crime Records Bureau (NCRB - Women Safety Division)**  
*Smart India Hackathon | Problem Statement ID: 26190 | Theme: Blockchain & Cybersecurity*

---

## 📌 Overview

**SURAKH-SHIK (सुरक्षा-साक्ष्य)** is an institutional-grade, zero-trust digital evidence docket and document management platform engineered to resolve the vulnerabilities of traditional paper and fragmented police file systems.

The platform provides end-to-end chain of custody tracking, mathematical tamper-proofing via a sovereign consortium blockchain, automated victim personal identity (PII) masking under **Section 72 of the Bharatiya Nyaya Sanhita (BNS) 2023**, and automated electronic evidence certification under **Section 63 of the Bharatiya Sakshya Adhiniyam (BSA) 2023**.

---

## 🛡️ Core Security Architecture

### 1. Triple-Factor Authentication (3FA)
* **Factor 1 (What you have)**: **Hardware-Bound Device Binding**. Only verified, departmentally enrolled laptops (carrying cryptographic device tokens) can communicate with the platform. Unregistered terminals are immediately blocked under Section 66 of the IT Act.
* **Factor 2 (What you know)**: Departmental Badge ID + FIPS-compliant PBKDF2-HMAC-SHA256 password hashing.
* **Factor 3 (Who you are)**: **Mandatory 2FA Face Biometrics**. Real-time camera capture with 68-point facial landmark tracking and active anti-spoofing liveness challenge, mathematically matched against the officer's enrolled photograph ($>85\%$ confidence threshold).

### 2. Jurisdictional Compartmentalization ("The Iron Wall")
* Criminal cases registered in a state or police station (e.g., **Manipur &bull; Imphal West**) are strictly isolated.
* Officers in other states (Delhi, Maharashtra, etc.) have **zero visibility** into these records unless explicit targeted access is granted.

### 3. Targeted Cryptographic Sharing (ECIES Key Wrapping)
* Investigating Officers (IO) can selectively dispatch evidence files to external authorities (e.g., **CFSL Kamrup / Guwahati** for cyber analysis or District Sessions Court).
* The file's Data Encryption Key (DEK) is asymmetrically wrapped specifically for the recipient department's public key. All other departments across India remain mathematically locked out.

### 4. Sovereign Consortium Blockchain Ledger
* 4-Node distributed ledger framework:
  1. **NCRB / MHA Root Orderer Node** (Raft CFT consensus lead)
  2. **State Police Peer Node** (FIR & seizure memo endorser)
  3. **CFSL / DFSS Forensic Peer Node** (Scientific lab analysis endorser)
  4. **e-Courts Judicial Peer Node** (Judicial scrutiny & legal hold endorser)
* Anchors immutable document hashes, chain-of-custody handshakes, and Section 63 BSA certificates.

### 5. Automated Legal PII Redaction & In-Memory Watermarking
* Automatically detects and masks victim identities, contact numbers, and Aadhaar numbers (POCSO / BNS Sec 72 compliance).
* Renders documents purely in browser memory on an HTML5 canvas overlaid with dynamic forensic watermarks (`Officer ID | Terminal | Station | Timestamp`), leaving zero trace in browser disk cache.

### 6. The "Showstopper" Tamper Watchdog
* Includes an interactive tamper simulation mode. Flipping a single byte in the encrypted storage vault triggers an immediate flashing red alarm (**`CRITICAL ALERT: HASH MISMATCH / TAMPER DETECTED`**), demonstrating why blockchain verification guarantees court admissibility.

---

## 🏗️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend UI** | React 18, Vite, TypeScript, Lucide Icons, Institutional Gov CSS |
| **Backend API** | Python 3.11+, FastAPI (Async), Pydantic v2, Uvicorn |
| **Database** | SQLite (WAL Mode, ACID compliant) / PostgreSQL compatible |
| **Cryptographic Engine** | AES-256-GCM envelope encryption, PBKDF2-SHA256, PyJWT, SHA-256 |
| **Ledger Engine** | Sovereign Consortium Merkle-DAG & Raft CFT Consensus Engine |
| **Document Pipeline** | OCR/HTR text extraction & Legal NER PII Redaction Pipeline |

---

## 🚀 Quick Start (Local Setup)

### 1. Prerequisites
* Python 3.11 or higher
* Node.js v18 or higher & npm

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
* Backend API: `http://127.0.0.1:8000`
* Interactive API Docs (Swagger): `http://127.0.0.1:8000/docs`

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```
* Frontend Portal: `http://127.0.0.1:5173`

---

## 🔑 Pre-Seeded Institutional Credentials

The system initializes in a clean state with **zero demo accounts or dummy case files**, containing only the master Administrator:

| Field | Value |
| :--- | :--- |
| **Departmental / Badge ID** | `ADM-IT-SURAKH` |
| **Authorized Password** | `A0M-1T-SRKSK` |
| **Clearance / Role** | `SYSTEM_ADMIN` (*Governed by the "Blind Admin" Rule*) |
| **Default Terminal Asset** | `MHA-SECURE-STATION-DEV-001` |

---

## ☁️ Cloud Deployment (Render + Vercel)

### Backend (Render.com)
* **Root Directory**: `backend`
* **Runtime**: `Python 3`
* **Build Command**: `pip install -r requirements.txt`
* **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Frontend (Vercel.com)
* **Root Directory**: `frontend`
* **Framework**: `Vite`
* **Environment Variable**: `VITE_API_BASE=https://<your-render-backend-url>.onrender.com`

---

## 📜 Statutory & Legal Compliance
* **Bharatiya Sakshya Adhiniyam (BSA) 2023** — Section 63 (Electronic Evidence Admissibility)
* **Bharatiya Nyaya Sanhita (BNS) 2023** — Section 72 (Victim Confidentiality & Non-Disclosure)
* **Digital Personal Data Protection (DPDP) Act 2023** — Purpose Limitation & Data Minimization
* **Information Technology Act 2000** — Section 66 (Anti-Hacking & Device Access Control)
