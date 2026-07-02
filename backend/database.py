"""
UrbanPulse AI — SQLite persistence layer.
All tables are created on first import via init_db().
"""

import sqlite3
import os
import json
import hashlib
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

DB_PATH = os.path.join(os.path.dirname(__file__), "urbanpulse.db")

_conn: Optional[sqlite3.Connection] = None


def get_conn() -> sqlite3.Connection:
    global _conn
    if _conn is None:
        _conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        _conn.row_factory = sqlite3.Row
        _conn.execute("PRAGMA journal_mode=WAL")
        _conn.execute("PRAGMA foreign_keys=ON")
    return _conn


def init_db():
    conn = get_conn()
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        hashed_password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'citizen',
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS incidents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        location TEXT NOT NULL,
        lat REAL,
        lng REAL,
        severity TEXT NOT NULL DEFAULT 'Medium',
        status TEXT NOT NULL DEFAULT 'Reported',
        image_url TEXT,
        verified INTEGER NOT NULL DEFAULT 0,
        verification_count INTEGER NOT NULL DEFAULT 0,
        ai_analysis_json TEXT,
        ai_image_verification_json TEXT,
        duplicate_of_id INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (duplicate_of_id) REFERENCES incidents(id)
    );

    CREATE TABLE IF NOT EXISTS predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        data_json TEXT NOT NULL,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS simulations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        parameters_json TEXT NOT NULL,
        results_json TEXT NOT NULL,
        created_by INTEGER,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        read INTEGER NOT NULL DEFAULT 0,
        incident_id INTEGER,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS urban_health (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        score REAL NOT NULL,
        risk_level TEXT NOT NULL,
        factors_json TEXT NOT NULL,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS weather_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        condition TEXT NOT NULL,
        temp REAL NOT NULL,
        humidity REAL,
        wind_speed REAL,
        penalty REAL NOT NULL DEFAULT 0.0,
        fetched_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS simulated_decisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scenario_type TEXT NOT NULL,
        title TEXT NOT NULL,
        location TEXT NOT NULL,
        duration_hours INTEGER NOT NULL,
        affected_area TEXT NOT NULL,
        parameters_json TEXT,
        mobility_score INTEGER NOT NULL,
        citizen_score INTEGER NOT NULL,
        emergency_score INTEGER NOT NULL,
        risk_score INTEGER NOT NULL,
        results_json TEXT NOT NULL,
        alternative_strategy TEXT NOT NULL,
        ai_reasoning TEXT NOT NULL,
        creator TEXT NOT NULL,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS umpn_settings (
        user_id INTEGER PRIMARY KEY REFERENCES users(id),
        smart_journey_enabled INTEGER DEFAULT 0,
        updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS umpn_journeys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        start_area TEXT NOT NULL,
        end_area TEXT NOT NULL,
        route_taken TEXT NOT NULL,
        duration_mins INTEGER NOT NULL,
        delay_mins INTEGER NOT NULL,
        deviation_detected INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
    );
    """)

    # Handle schema updates for existing database instances safely
    try:
        conn.execute("ALTER TABLE incidents ADD COLUMN ai_image_verification_json TEXT")
    except sqlite3.OperationalError:
        pass # Column already exists
    
    try:
        conn.execute("ALTER TABLE incidents ADD COLUMN duplicate_of_id INTEGER REFERENCES incidents(id)")
    except sqlite3.OperationalError:
        pass # Column already exists

    try:
        conn.execute("ALTER TABLE incidents ADD COLUMN ai_analysis_json TEXT")
    except sqlite3.OperationalError:
        pass # already exists

    try:
        conn.execute("ALTER TABLE incidents ADD COLUMN user_id INTEGER")
    except sqlite3.OperationalError:
        pass

    try:
        conn.execute("ALTER TABLE users ADD COLUMN phone TEXT")
    except sqlite3.OperationalError:
        pass

    conn.execute("""
    CREATE TABLE IF NOT EXISTS otps (
        email_or_phone TEXT PRIMARY KEY,
        otp TEXT NOT NULL,
        expires_at TEXT NOT NULL
    );
    """)

    conn.commit()


# ──────────────────────────────────────────────
# Helper
# ──────────────────────────────────────────────
def hash_password(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()


def now_iso() -> str:
    return datetime.utcnow().isoformat()


def row_to_dict(row: sqlite3.Row) -> dict:
    d = dict(row)
    if "ai_analysis_json" in d and d["ai_analysis_json"]:
        try:
            d["ai_analysis"] = json.loads(d["ai_analysis_json"])
        except:
            d["ai_analysis"] = None
    return d


# ──────────────────────────────────────────────
# Users
# ──────────────────────────────────────────────
def create_user(name: str, email: str, password: str, role: str = "citizen", phone: Optional[str] = None) -> dict:
    conn = get_conn()
    ts = now_iso()
    cur = conn.execute(
        "INSERT INTO users (name, email, hashed_password, role, phone, created_at) VALUES (?,?,?,?,?,?)",
        (name, email.strip().lower(), hash_password(password), role, phone, ts),
    )
    conn.commit()
    return get_user_by_id(cur.lastrowid)


def get_user_by_id(uid: int) -> Optional[dict]:
    conn = get_conn()
    row = conn.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    return row_to_dict(row) if row else None


def get_user_by_email(email: str) -> Optional[dict]:
    conn = get_conn()
    row = conn.execute(
        "SELECT * FROM users WHERE email=?", (email.strip().lower(),)
    ).fetchone()
    return row_to_dict(row) if row else None


def verify_password(user: dict, password: str) -> bool:
    return user["hashed_password"] == hash_password(password)


def save_otp(email_or_phone: str, otp: str, expiry_minutes: int = 10) -> None:
    conn = get_conn()
    expires_at = (datetime.utcnow() + timedelta(minutes=expiry_minutes)).isoformat()
    conn.execute(
        "INSERT OR REPLACE INTO otps (email_or_phone, otp, expires_at) VALUES (?, ?, ?)",
        (email_or_phone.strip().lower(), otp.strip(), expires_at),
    )
    conn.commit()


def verify_otp(email_or_phone: str, otp: str) -> bool:
    conn = get_conn()
    row = conn.execute(
        "SELECT * FROM otps WHERE email_or_phone=? AND otp=?",
        (email_or_phone.strip().lower(), otp.strip()),
    ).fetchone()
    if not row:
        return False
    now = datetime.utcnow().isoformat()
    if row["expires_at"] < now:
        return False
    return True


def update_user_password(email: str, new_password: str) -> bool:
    conn = get_conn()
    cur = conn.execute(
        "UPDATE users SET hashed_password=? WHERE email=?",
        (hash_password(new_password), email.strip().lower()),
    )
    conn.commit()
    return cur.rowcount > 0


def get_all_users() -> List[dict]:
    conn = get_conn()
    rows = conn.execute("SELECT * FROM users").fetchall()
    return [row_to_dict(r) for r in rows]


# ──────────────────────────────────────────────
# Incidents
# ──────────────────────────────────────────────
def create_incident(
    title: str,
    description: str,
    category: str,
    location: str,
    severity: str = "Medium",
    image_url: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    ai_analysis_json: Optional[str] = None,
    ai_image_verification_json: Optional[str] = None,
    duplicate_of_id: Optional[int] = None,
    user_id: int = 1,
) -> Dict[str, Any]:
    conn = get_conn()
    now = now_iso()
    cur = conn.execute(
        """INSERT INTO incidents
           (title, description, category, location, severity, status, image_url, lat, lng, ai_analysis_json, ai_image_verification_json, duplicate_of_id, created_at, updated_at, user_id)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (title, description, category, location, severity, "Reported", image_url, lat, lng, ai_analysis_json, ai_image_verification_json, duplicate_of_id, now, now, user_id),
    )
    conn.commit()
    return get_incident(cur.lastrowid)


def get_incident(iid: int) -> Optional[dict]:
    conn = get_conn()
    row = conn.execute("SELECT * FROM incidents WHERE id=?", (iid,)).fetchone()
    return row_to_dict(row) if row else None


def get_incidents(status: Optional[str] = None) -> List[dict]:
    conn = get_conn()
    if status:
        rows = conn.execute(
            "SELECT * FROM incidents WHERE status=? ORDER BY created_at DESC", (status,)
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM incidents ORDER BY created_at DESC").fetchall()
    return [row_to_dict(r) for r in rows]


def get_active_incidents() -> List[dict]:
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM incidents WHERE status IN ('Reported','Under Review','Verified') ORDER BY created_at DESC"
    ).fetchall()
    return [row_to_dict(r) for r in rows]


def get_nearby_incidents(lat: float, lng: float, radius_km: float = 2.0) -> List[dict]:
    """Simple bounding-box filter (good enough for demo)."""
    conn = get_conn()
    dlat = radius_km / 111.0
    dlng = radius_km / (111.0 * 0.7)  # rough cos(13°)
    rows = conn.execute(
        "SELECT * FROM incidents WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ? ORDER BY created_at DESC",
        (lat - dlat, lat + dlat, lng - dlng, lng + dlng),
    ).fetchall()
    return [row_to_dict(r) for r in rows]


def update_incident_status(iid: int, new_status: str) -> Optional[dict]:
    conn = get_conn()
    conn.execute(
        "UPDATE incidents SET status=?, updated_at=? WHERE id=?",
        (new_status, now_iso(), iid),
    )
    conn.commit()
    return get_incident(iid)


def verify_incident(iid: int) -> Optional[dict]:
    conn = get_conn()
    conn.execute(
        "UPDATE incidents SET verification_count = verification_count + 1, updated_at=? WHERE id=?",
        (now_iso(), iid),
    )
    row = conn.execute("SELECT verification_count FROM incidents WHERE id=?", (iid,)).fetchone()
    if row and row["verification_count"] >= 3:
        conn.execute("UPDATE incidents SET verified=1, status='Action Initiated', updated_at=? WHERE id=?", (now_iso(), iid))
    conn.commit()
    return get_incident(iid)

def update_incident_analysis(iid: int, ai_analysis_json: str, new_status: str) -> Optional[dict]:
    conn = get_conn()
    conn.execute(
        "UPDATE incidents SET ai_analysis_json=?, status=?, updated_at=? WHERE id=?",
        (ai_analysis_json, new_status, now_iso(), iid),
    )
    conn.commit()
    return get_incident(iid)


# ──────────────────────────────────────────────
# Notifications
# ──────────────────────────────────────────────
def create_notification(user_id: int, title: str, message: str, incident_id: Optional[int] = None) -> dict:
    conn = get_conn()
    ts = now_iso()
    cur = conn.execute(
        "INSERT INTO notifications (user_id, title, message, read, incident_id, created_at) VALUES (?,?,?,0,?,?)",
        (user_id, title, message, incident_id, ts),
    )
    conn.commit()
    nid = cur.lastrowid
    row = conn.execute("SELECT * FROM notifications WHERE id=?", (nid,)).fetchone()
    return row_to_dict(row)


def get_notifications(user_id: int, unread_only: bool = False) -> List[dict]:
    conn = get_conn()
    if unread_only:
        rows = conn.execute(
            "SELECT * FROM notifications WHERE user_id=? AND read=0 ORDER BY created_at DESC", (user_id,)
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC", (user_id,)
        ).fetchall()
    return [row_to_dict(r) for r in rows]


def mark_notification_read(nid: int):
    conn = get_conn()
    conn.execute("UPDATE notifications SET read=1 WHERE id=?", (nid,))
    conn.commit()


# ──────────────────────────────────────────────
# Urban Health
# ──────────────────────────────────────────────
def save_urban_health(score: float, risk_level: str, factors: dict) -> dict:
    conn = get_conn()
    ts = now_iso()
    cur = conn.execute(
        "INSERT INTO urban_health (score, risk_level, factors_json, created_at) VALUES (?,?,?,?)",
        (score, risk_level, json.dumps(factors), ts),
    )
    conn.commit()
    return {"id": cur.lastrowid, "score": score, "risk_level": risk_level, "factors": factors, "created_at": ts}


def get_urban_health_history(hours: int = 24) -> List[dict]:
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM urban_health ORDER BY created_at DESC LIMIT ?", (hours * 12,)
    ).fetchall()
    result = []
    for r in rows:
        d = row_to_dict(r)
        d["factors"] = json.loads(d["factors_json"])
        result.append(d)
    return result


# ──────────────────────────────────────────────
# Weather
# ──────────────────────────────────────────────
def save_weather(condition: str, temp: float, humidity: float = 50.0, wind_speed: float = 5.0, penalty: float = 0.0) -> dict:
    conn = get_conn()
    ts = now_iso()
    cur = conn.execute(
        "INSERT INTO weather_data (condition, temp, humidity, wind_speed, penalty, fetched_at) VALUES (?,?,?,?,?,?)",
        (condition, temp, humidity, wind_speed, penalty, ts),
    )
    conn.commit()
    return {"id": cur.lastrowid, "condition": condition, "temp": temp, "humidity": humidity, "wind_speed": wind_speed, "penalty": penalty, "fetched_at": ts}


def get_latest_weather() -> Optional[dict]:
    conn = get_conn()
    row = conn.execute("SELECT * FROM weather_data ORDER BY fetched_at DESC LIMIT 1").fetchone()
    return row_to_dict(row) if row else None


# ──────────────────────────────────────────────
# Simulations
# ──────────────────────────────────────────────
def save_simulation(sim_type: str, parameters: dict, results: dict, created_by: int = 1) -> dict:
    conn = get_conn()
    ts = now_iso()
    cur = conn.execute(
        "INSERT INTO simulations (type, parameters_json, results_json, created_by, created_at) VALUES (?,?,?,?,?)",
        (sim_type, json.dumps(parameters), json.dumps(results), created_by, ts),
    )
    conn.commit()
    sid = cur.lastrowid
    return {"id": sid, "type": sim_type, "parameters": parameters, "results": results, "created_at": ts}


def get_simulation(sid: int) -> Optional[dict]:
    conn = get_conn()
    row = conn.execute("SELECT * FROM simulations WHERE id=?", (sid,)).fetchone()
    if not row:
        return None
    d = row_to_dict(row)
    d["parameters"] = json.loads(d["parameters_json"])
    d["results"] = json.loads(d["results_json"])
    return d


def get_simulations(limit: int = 20) -> List[dict]:
    conn = get_conn()
    rows = conn.execute("SELECT * FROM simulations ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
    result = []
    for r in rows:
        d = row_to_dict(r)
        d["parameters"] = json.loads(d["parameters_json"])
        d["results"] = json.loads(d["results_json"])
        result.append(d)
    return result


# ──────────────────────────────────────────────
# Predictions (cache)
# ──────────────────────────────────────────────
def save_prediction(pred_type: str, data: dict) -> dict:
    conn = get_conn()
    ts = now_iso()
    cur = conn.execute(
        "INSERT INTO predictions (type, data_json, created_at) VALUES (?,?,?)",
        (pred_type, json.dumps(data), ts),
    )
    conn.commit()
    return {"id": cur.lastrowid, "type": pred_type, "data": data, "created_at": ts}


def get_latest_prediction(pred_type: str) -> Optional[dict]:
    conn = get_conn()
    row = conn.execute(
        "SELECT * FROM predictions WHERE type=? ORDER BY created_at DESC LIMIT 1", (pred_type,)
    ).fetchone()
    if not row:
        return None
    d = row_to_dict(row)
    d["data"] = json.loads(d["data_json"])
    return d


# ──────────────────────────────────────────────
# Seed data
# ──────────────────────────────────────────────
def seed_demo_users():
    if not get_user_by_email("citizen"):
        create_user("Demo Citizen", "citizen", "citizen123", "citizen")
    if not get_user_by_email("authority"):
        create_user("Demo Authority", "authority", "authority123", "authority")
    if not get_user_by_email("citizen@urbanpulse.ai"):
        create_user("Demo Citizen", "citizen@urbanpulse.ai", "citizen123", "citizen")
    if not get_user_by_email("authority@urbanpulse.ai"):
        create_user("Demo Authority", "authority@urbanpulse.ai", "authority123", "authority")


# Init on import
init_db()
