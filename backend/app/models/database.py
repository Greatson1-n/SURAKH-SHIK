import sqlite3
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from app.core.config import DB_PATH, ADMIN_USER_ID, ADMIN_RAW_PASS, ADMIN_PHOTO_NAME
from app.core.security import hash_password, compute_sha256

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        badge_id TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        branch TEXT NOT NULL,
        state TEXT NOT NULL,
        district TEXT NOT NULL,
        station_id TEXT NOT NULL,
        photo_path TEXT NOT NULL,
        device_token TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL
    );
    """)

    # 2. Authorized Departmental Devices (Hardware Binding)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS authorized_devices (
        device_id TEXT PRIMARY KEY,
        asset_tag TEXT NOT NULL,
        assigned_station TEXT NOT NULL,
        assigned_role TEXT NOT NULL,
        status TEXT NOT NULL,
        enrolled_at TEXT NOT NULL,
        last_seen_at TEXT
    );
    """)

    # 3. Cases Table (Jurisdiction Scoped)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cases (
        case_id TEXT PRIMARY KEY,
        fir_number TEXT NOT NULL,
        title TEXT NOT NULL,
        incident_date TEXT NOT NULL,
        state TEXT NOT NULL,
        district TEXT NOT NULL,
        station_id TEXT NOT NULL,
        branch TEXT NOT NULL,
        assigned_io_id TEXT NOT NULL,
        status TEXT NOT NULL,
        sensitivity_level TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    """)

    # 4. Documents Table (AES-256-GCM Encrypted & Hashed)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS documents (
        document_id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_path_enc TEXT NOT NULL,
        nonce_b64 TEXT NOT NULL,
        dek_hex TEXT NOT NULL,
        content_hash_sha256 TEXT NOT NULL,
        author_badge TEXT NOT NULL,
        author_role TEXT NOT NULL,
        ledger_tx_id TEXT,
        is_redacted INTEGER DEFAULT 0,
        redacted_text TEXT,
        extracted_text TEXT,
        is_sealed INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (case_id) REFERENCES cases (case_id)
    );
    """)

    # 5. Targeted Selective Sharing (Compartmentalization)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS targeted_shares (
        share_id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        document_id TEXT,
        originating_dept TEXT NOT NULL,
        recipient_dept TEXT NOT NULL,
        permission TEXT NOT NULL,
        wrapped_key TEXT NOT NULL,
        granted_by TEXT NOT NULL,
        granted_at TEXT NOT NULL,
        expires_at TEXT,
        status TEXT NOT NULL,
        FOREIGN KEY (case_id) REFERENCES cases (case_id)
    );
    """)

    # 6. Sovereign Consortium Ledger Blocks
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ledger_blocks (
        block_number INTEGER PRIMARY KEY,
        prev_hash TEXT NOT NULL,
        merkle_root TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        transactions_json TEXT NOT NULL,
        block_hash TEXT NOT NULL
    );
    """)

    # 7. Immutable Audit Logs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        log_id TEXT PRIMARY KEY,
        actor_badge TEXT NOT NULL,
        actor_role TEXT NOT NULL,
        action TEXT NOT NULL,
        target_ref TEXT NOT NULL,
        ip_address TEXT NOT NULL,
        device_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        signature TEXT NOT NULL
    );
    """)

    # 8. Locations Reference Table (Indian Police & FSL Hierarchy)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        state TEXT NOT NULL,
        district TEXT NOT NULL,
        name TEXT NOT NULL,
        code TEXT NOT NULL
    );
    """)

    conn.commit()
    seed_initial_data(conn)
    conn.close()

def seed_initial_data(conn: sqlite3.Connection):
    cursor = conn.cursor()

    # Check if locations already populated
    cursor.execute("SELECT COUNT(*) FROM locations;")
    if cursor.fetchone()[0] == 0:
        locations_data = [
            # Manipur Jurisdictions
            ("POLICE_STATION", "Manipur", "Imphal West", "City Police Station", "MN-IW-CITY-PS"),
            ("POLICE_STATION", "Manipur", "Imphal West", "Lamphel Police Station", "MN-IW-LMP-PS"),
            ("POLICE_STATION", "Manipur", "Imphal East", "Porompat Police Station", "MN-IE-PRM-PS"),
            ("POLICE_STATION", "Manipur", "Bishnupur", "Bishnupur Police Station", "MN-BN-BSH-PS"),
            ("POLICE_STATION", "Manipur", "Churachandpur", "Churachandpur Police Station", "MN-CP-CCP-PS"),
            ("FORENSIC_LAB", "Manipur", "Imphal West", "State Forensic Science Laboratory, Pangei", "MN-SFSL-IMPHAL"),
            ("COURT", "Manipur", "Imphal West", "Sessions Court Imphal West", "MN-CRT-IW-SESS"),

            # Delhi Jurisdictions
            ("POLICE_STATION", "Delhi", "New Delhi", "Tughlak Road Police Station", "DL-ND-TUG-PS"),
            ("POLICE_STATION", "Delhi", "South Delhi", "Hauz Khas Police Station", "DL-SD-HAUZ-PS"),
            ("POLICE_STATION", "Delhi", "Cyber Crime Unit", "Cyber Police Station Dwarka", "DL-CY-DWRK-PS"),
            ("FORENSIC_LAB", "Delhi", "Rohini", "FSL Rohini Delhi", "DL-SFSL-ROH"),
            ("FORENSIC_LAB", "National", "New Delhi", "CFSL New Delhi (CBI HQ)", "CFSL-NEW-DELHI"),
            ("COURT", "Delhi", "New Delhi", "Patiala House Courts", "DL-CRT-PATIALA"),

            # Maharashtra Jurisdictions
            ("POLICE_STATION", "Maharashtra", "Mumbai City", "Colaba Police Station", "MH-MUM-COL-PS"),
            ("POLICE_STATION", "Maharashtra", "Mumbai Suburban", "Bandra Police Station", "MH-MUM-BND-PS"),
            ("FORENSIC_LAB", "Maharashtra", "Mumbai", "FSL Kalina Mumbai", "MH-SFSL-KALINA"),
            ("FORENSIC_LAB", "National", "Pune", "CFSL Pune (Cyber Forensics)", "CFSL-PUNE"),
            ("COURT", "Maharashtra", "Mumbai City", "City Civil and Sessions Court Mumbai", "MH-CRT-MUM-SESS"),

            # Assam & North East Hubs (CFSL Kamrup/Guwahati)
            ("FORENSIC_LAB", "Assam", "Kamrup", "CFSL Kamrup (Guwahati)", "CFSL-KAMRUP-GUW"),
            ("POLICE_STATION", "Assam", "Kamrup Metropolitan", "Paltan Bazar Police Station", "AS-KM-PLT-PS"),

            # National Central CFSLs
            ("FORENSIC_LAB", "National", "Telangana", "CFSL Hyderabad (Digital Forensics)", "CFSL-HYDERABAD"),
            ("FORENSIC_LAB", "National", "Chandigarh", "CFSL Chandigarh (DNA & Cyber)", "CFSL-CHANDIGARH"),
            ("FORENSIC_LAB", "National", "West Bengal", "CFSL Kolkata", "CFSL-KOLKATA"),
        ]
        cursor.executemany(
            "INSERT INTO locations (type, state, district, name, code) VALUES (?, ?, ?, ?, ?);",
            locations_data
        )

    # Check if primary authorized device is enrolled
    cursor.execute("SELECT COUNT(*) FROM authorized_devices WHERE device_id = 'MHA-SECURE-STATION-DEV-001';")
    if cursor.fetchone()[0] == 0:
        now_str = datetime.now(timezone.utc).isoformat()
        cursor.execute(
            """INSERT INTO authorized_devices 
            (device_id, asset_tag, assigned_station, assigned_role, status, enrolled_at, last_seen_at)
            VALUES (?, ?, ?, ?, ?, ?, ?);""",
            (
                "MHA-SECURE-STATION-DEV-001",
                "MHA-NIC-DELL-SECURE-TERMINAL",
                "MHA-HQ",
                "SYSTEM_ADMIN",
                "ACTIVE",
                now_str,
                now_str
            )
        )

    # Check and Seed ONLY the Master Admin User
    cursor.execute("SELECT COUNT(*) FROM users WHERE badge_id = ?;", (ADMIN_USER_ID,))
    if cursor.fetchone()[0] == 0:
        now_str = datetime.now(timezone.utc).isoformat()
        hashed_pw = hash_password(ADMIN_RAW_PASS)
        cursor.execute(
            """INSERT INTO users 
            (badge_id, full_name, password_hash, role, branch, state, district, station_id, photo_path, device_token, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);""",
            (
                ADMIN_USER_ID,
                "Chief IT Administrator (NCRB)",
                hashed_pw,
                "SYSTEM_ADMIN",
                "Administration",
                "National",
                "NCRB HQ",
                "MHA-HQ",
                ADMIN_PHOTO_NAME,
                "MHA-SECURE-STATION-DEV-001",
                1,
                now_str
            )
        )

    # Genesis Block for Consortium Ledger if empty
    cursor.execute("SELECT COUNT(*) FROM ledger_blocks;")
    if cursor.fetchone()[0] == 0:
        now_str = datetime.now(timezone.utc).isoformat()
        genesis_tx = [{
            "tx_id": "TX-GENESIS-MHA-00000",
            "type": "CONSORTIUM_GENESIS",
            "endorsers": ["NCRB_MHA_ROOT_NODE", "STATE_POLICE_PEER", "CFSL_FORENSIC_PEER", "ECOURTS_JUDICIAL_PEER"],
            "payload": {
                "system": "SURAKH-SHIK (सुरक्षा-साक्ष्य)",
                "mandate": "MHA Problem Statement 26190",
                "authority": "National Crime Records Bureau (Women Safety Division)",
                "statutory_framework": "BSA 2023 Sec 63 / BNS 2023 Sec 72 / DPDP Act 2023",
                "status": "INITIALIZED"
            }
        }]
        tx_str = json.dumps(genesis_tx, sort_keys=True)
        merkle_root = compute_sha256(tx_str.encode("utf-8"))
        genesis_hash = compute_sha256(f"0#00000000000000000000000000000000#{merkle_root}#{now_str}".encode("utf-8"))

        cursor.execute(
            """INSERT INTO ledger_blocks 
            (block_number, prev_hash, merkle_root, timestamp, transactions_json, block_hash)
            VALUES (?, ?, ?, ?, ?, ?);""",
            (0, "0" * 64, merkle_root, now_str, tx_str, genesis_hash)
        )

    conn.commit()
