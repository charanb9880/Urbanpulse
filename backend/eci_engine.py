"""
UrbanPulse AI — Emergency Chain Intelligence (ECI) & Golden Hour Optimizer.
Additive module for coordinating emergency response workflows.
"""

import os
import json
import sqlite3
import math
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from database import get_conn, now_iso, row_to_dict, get_incident

# ── Mock Hospitals in Bengaluru ──────────────────────────────────
HOSPITALS = [
    {
        "id": "city_trauma",
        "name": "City Trauma Center",
        "lat": 12.9719,
        "lng": 77.5946,  # Central Majestic/MG Road
        "trauma_capability": 1.0,  # Level 1 Trauma
        "icu_capability": 0.9,
        "emergency_capability": 1.0,
        "description": "Fastest emergency response capability with trauma support."
    },
    {
        "id": "st_johns",
        "name": "St. John's Hospital",
        "lat": 12.9345,
        "lng": 77.6265,  # Koramangala
        "trauma_capability": 0.9,
        "icu_capability": 0.9,
        "emergency_capability": 0.9,
        "description": "Comprehensive tertiary care hospital in South Bengaluru."
    },
    {
        "id": "manipal",
        "name": "Manipal Hospital",
        "lat": 12.9784,
        "lng": 77.6408,  # Indiranagar / Old Airport Rd
        "trauma_capability": 0.85,
        "icu_capability": 0.95,
        "emergency_capability": 0.9,
        "description": "Specialized cardiac and neurological ICU capabilities."
    },
    {
        "id": "columbia_asia",
        "name": "Columbia Asia Hospital",
        "lat": 12.9698,
        "lng": 77.7499,  # Whitefield
        "trauma_capability": 0.7,
        "icu_capability": 0.8,
        "emergency_capability": 0.8,
        "description": "Local multi-specialty care in Whitefield tech hub."
    },
    {
        "id": "hsr_medical",
        "name": "HSR Medical Center",
        "lat": 12.9172,
        "lng": 77.6228,  # HSR Layout
        "trauma_capability": 0.65,
        "icu_capability": 0.75,
        "emergency_capability": 0.8,
        "description": "Community emergency facility with standard trauma support."
    }
]

# Configurable Weights for Hospital Recommendation Engine
# Can be updated at runtime.
HOSPITAL_WEIGHTS = {
    "distance": 0.3,
    "trauma": 0.4,
    "icu": 0.3
}


def init_eci_db():
    """Create additional tables for ECI if not exists."""
    conn = get_conn()
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS emergency_chains (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        incident_id INTEGER UNIQUE NOT NULL,
        status TEXT NOT NULL DEFAULT 'Active',
        severity TEXT NOT NULL,
        potential_casualties TEXT NOT NULL,
        response_priority TEXT NOT NULL,
        hospital_id TEXT,
        hospital_name TEXT,
        hospital_reason TEXT,
        hospital_eta INTEGER,
        corridor_primary TEXT,
        corridor_alt TEXT,
        corridor_eta INTEGER,
        golden_hour_score INTEGER,
        golden_hour_explanation TEXT,
        ambulances INTEGER,
        traffic_officers INTEGER,
        emergency_units INTEGER,
        resource_reason TEXT,
        timeline_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (incident_id) REFERENCES incidents(id)
    );

    CREATE TABLE IF NOT EXISTS emergency_readiness_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        incident_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        eta_minutes INTEGER,
        priority TEXT NOT NULL,
        prep_recommendation TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (incident_id) REFERENCES incidents(id)
    );
    """)
    conn.commit()


# Initialize database tables on import
init_eci_db()


def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Standard Euclidean distance mapped roughly to kilometers in Bengaluru."""
    # 1 degree lat is ~111 km, 1 degree lng is ~108 km at 12.9 N
    dlat = (lat1 - lat2) * 111.0
    dlng = (lng1 - lng2) * 108.0
    return math.sqrt(dlat * dlat + dlng * dlng)


def get_active_emergency_chains() -> List[dict]:
    conn = get_conn()
    rows = conn.execute(
        "SELECT ec.*, inc.title as incident_title, inc.location as incident_location, inc.category as incident_category "
        "FROM emergency_chains ec "
        "JOIN incidents inc ON ec.incident_id = inc.id "
        "WHERE ec.status = 'Active' ORDER BY ec.created_at DESC"
    ).fetchall()
    
    result = []
    for r in rows:
        d = dict(r)
        if d.get("timeline_json"):
            try:
                d["timeline"] = json.loads(d["timeline_json"])
            except:
                d["timeline"] = []
        result.append(d)
    return result


def get_emergency_chain_by_incident(incident_id: int) -> Optional[dict]:
    conn = get_conn()
    row = conn.execute(
        "SELECT ec.*, inc.title as incident_title, inc.location as incident_location, inc.category as incident_category, inc.created_at as incident_created_at "
        "FROM emergency_chains ec "
        "JOIN incidents inc ON ec.incident_id = inc.id "
        "WHERE ec.incident_id = ?", (incident_id,)
    ).fetchone()
    if not row:
        return None
    d = dict(row)
    if d.get("timeline_json"):
        try:
            d["timeline"] = json.loads(d["timeline_json"])
        except:
            d["timeline"] = []
    return d


def get_emergency_readiness_alerts() -> List[dict]:
    conn = get_conn()
    rows = conn.execute(
        "SELECT era.*, inc.location as incident_location "
        "FROM emergency_readiness_alerts era "
        "JOIN incidents inc ON era.incident_id = inc.id "
        "ORDER BY era.created_at DESC LIMIT 15"
    ).fetchall()
    return [dict(r) for r in rows]


def configure_hospital_weights(distance: float, trauma: float, icu: float):
    global HOSPITAL_WEIGHTS
    total = distance + trauma + icu
    if total > 0:
        HOSPITAL_WEIGHTS = {
            "distance": distance / total,
            "trauma": trauma / total,
            "icu": icu / total
        }
    return HOSPITAL_WEIGHTS


def resolve_emergency_chain(incident_id: int):
    conn = get_conn()
    now = now_iso()
    chain = get_emergency_chain_by_incident(incident_id)
    if not chain:
        return False
        
    timeline = chain.get("timeline", [])
    timeline.append({
        "stage": "Resolved",
        "timestamp": now,
        "label": "Emergency Resolved",
        "description": "Situation cleared and response concluded successfully."
    })
    
    conn.execute(
        "UPDATE emergency_chains SET status='Resolved', timeline_json=?, updated_at=? WHERE incident_id=?",
        (json.dumps(timeline), now, incident_id)
    )
    conn.commit()
    return True


def should_activate_eci(incident: dict) -> bool:
    """Check if incident meets emergency activation parameters."""
    cat = (incident.get("category") or "").lower()
    desc = (incident.get("description") or "").lower()
    title = (incident.get("title") or "").lower()
    severity = (incident.get("severity") or "Medium")
    
    # ECI activation keywords
    emergency_categories = ["accident", "road accident", "disaster", "fire", "medical", "collision", "crash", "flood", "flooding", "hazard"]
    
    is_emergency_category = any(ec in cat or ec in title or ec in desc for ec in emergency_categories)
    is_high_severity = severity in ["High", "Critical"]
    
    return is_emergency_category or is_high_severity


def activate_emergency_chain(incident_id: int) -> Optional[dict]:
    """Automatically assess, optimize, and orchestrate ECI workflow for verified incident."""
    inc = get_incident(incident_id)
    if not inc:
        return None
        
    # Check if already has an ECI record
    existing = get_emergency_chain_by_incident(incident_id)
    if existing:
        return existing
        
    now = now_iso()
    
    # Coordinate coordinates (fallback if lat/lng missing)
    lat = inc.get("lat") or 12.9716
    lng = inc.get("lng") or 77.5946
    
    # ── Step 1: Emergency Assessment ──────────────────────────────────
    cat = (inc.get("category") or "").lower()
    title = (inc.get("title") or "").lower()
    severity = inc.get("severity") or "Medium"
    
    # Severity assessment
    if severity == "Critical" or "major" in title or "fatal" in title or "disaster" in cat:
        eci_severity = "Critical"
        casualty_risk = "Severe Risk"
        priority = "Emergency"
    elif severity == "High" or "accident" in cat or "fire" in cat or "medical" in cat:
        eci_severity = "High"
        casualty_risk = "Moderate Risk"
        priority = "Urgent"
    else:
        eci_severity = "Medium"
        casualty_risk = "Low Risk"
        priority = "Standard"
        
    # ── Step 3: Hospital Intelligence Engine ──────────────────────────
    # Rank hospitals based on composite score:
    # Score = w_dist * Normalised_Proximity + w_trauma * trauma_capability + w_icu * icu_capability
    scored_hospitals = []
    for hosp in HOSPITALS:
        dist = calculate_distance(lat, lng, hosp["lat"], hosp["lng"])
        # Avoid distance divided by zero, baseline at 0.5km
        dist = max(0.5, dist)
        # Normalised proximity score: closer hospital yields score closer to 1
        proximity = 1.0 / (1.0 + (dist / 5.0))
        
        score = (
            HOSPITAL_WEIGHTS["distance"] * proximity +
            HOSPITAL_WEIGHTS["trauma"] * hosp["trauma_capability"] +
            HOSPITAL_WEIGHTS["icu"] * hosp["icu_capability"]
        )
        
        scored_hospitals.append({
            "hosp": hosp,
            "distance": round(dist, 1),
            "eta": max(3, int(dist * 2.5)),  # Approx 2.5 min per km for emergency vehicles
            "score": score
        })
        
    # Pick top scoring hospital
    scored_hospitals.sort(key=lambda x: x["score"], reverse=True)
    best = scored_hospitals[0]
    best_hosp = best["hosp"]
    
    # Generate configurable rationale
    reason = f"Fastest response path ({best['distance']} km, {best['eta']} min ETA) with optimal capabilities for this incident profile."
    if best_hosp["id"] == "city_trauma":
        reason = "Fastest emergency response capability with Level 1 trauma team ready."
    elif best_hosp["id"] == "st_johns":
        reason = "South Bengaluru proximity corridor with excellent surgical teams."
    elif best_hosp["id"] == "manipal":
        reason = "Advanced ICU capacity and cardiovascular support synchronization."
        
    # ── Step 5: Smart Green Corridor Planner ──────────────────────────
    loc_name = inc.get("location") or "Incident Site"
    corridor_primary = f"Priority Corridor A via HAL Road & Old Airport Road to {best_hosp['name']}"
    corridor_alt = f"Alternative Corridor B via Inner Ring Road bypass to {best_hosp['name']}"
    corridor_eta = best["eta"]
    
    # ── Step 6: Golden Hour Optimizer™ ────────────────────────────────
    # Golden Hour Efficiency calculates remaining time for critical intervention.
    # Total delay = detection_delay (assume 2m) + dispatch_delay (assume 3m) + transit (corridor_eta) + prep_time (assume 5m)
    dispatch_delay = 3
    prep_time = 5
    total_latency = 2 + dispatch_delay + corridor_eta + prep_time
    
    # Score is 100 - latency penalty (e.g. subtracting from 60 minutes)
    golden_score = max(20, min(100, int((60 - total_latency) / 60 * 100 + 40)))
    
    if golden_score >= 80:
        golden_explanation = f"Excellent response strategy expected to preserve {golden_score}% of the critical Golden Hour window."
    elif golden_score >= 60:
        golden_explanation = f"Good response window. Green light preemption yields a {golden_score}% Golden Hour preservation."
    elif golden_score >= 40:
        golden_explanation = f"Needs Improvement. Response latency cuts Golden Hour preservation to {golden_score}%. Speed dispatch."
    else:
        golden_explanation = f"Critical delay detected. Golden Hour preservation index falls below 40% ({golden_score}%). Reroute units immediately."

    # ── Step 7: Emergency Resource Coordination ─────────────────────
    if eci_severity == "Critical":
        ambulances = 2
        traffic_officers = 3
        emergency_units = 1
        res_reason = "Critical level incident requires multiple medical units and traffic corridor preemption."
    elif eci_severity == "High":
        ambulances = 1
        traffic_officers = 2
        emergency_units = 1
        res_reason = "High severity incident requires standard ambulance response and dynamic routing officers."
    else:
        ambulances = 1
        traffic_officers = 1
        emergency_units = 0
        res_reason = "Routine response coordination sufficient."

    # ── Step 9: Incident Timeline Intelligence ───────────────────────
    inc_created_dt = inc.get("created_at") or now
    timeline = [
        {"stage": "Reported", "timestamp": inc_created_dt, "label": "Incident Reported", "description": "Citizen emergency ticket received by UrbanPulse Network."},
        {"stage": "Verified", "timestamp": now, "label": "Incident Verified", "description": "AI Computer Vision & location corroboration completed verification."},
        {"stage": "Emergency Assessed", "timestamp": now, "label": "Emergency Assessment", "description": f"Incident classified as {eci_severity} severity. Response Priority: {priority}."},
        {"stage": "Resources Recommended", "timestamp": now, "label": "Resource Coordination", "description": f"Recommended dispatching {ambulances} ambulances and {traffic_officers} traffic officers."},
        {"stage": "Hospital Recommended", "timestamp": now, "label": "Hospital Intelligence Sync", "description": f"Recommended transport to {best_hosp['name']} ({reason})."},
        {"stage": "Route Generated", "timestamp": now, "label": "Green Corridor Active", "description": f"Green Wave signal synchronization activated along {corridor_primary}."}
    ]

    # Insert into database
    conn = get_conn()
    try:
        conn.execute(
            "INSERT INTO emergency_chains "
            "(incident_id, status, severity, potential_casualties, response_priority, "
            " hospital_id, hospital_name, hospital_reason, hospital_eta, "
            " corridor_primary, corridor_alt, corridor_eta, "
            " golden_hour_score, golden_hour_explanation, "
            " ambulances, traffic_officers, emergency_units, resource_reason, timeline_json, created_at, updated_at) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (
                incident_id, "Active", eci_severity, casualty_risk, priority,
                best_hosp["id"], best_hosp["name"], reason, corridor_eta,
                corridor_primary, corridor_alt, corridor_eta,
                golden_score, golden_explanation,
                ambulances, traffic_officers, emergency_units, res_reason,
                json.dumps(timeline), now, now
            )
        )
        
        # ── Step 4: Emergency Readiness Alerts ────────────────────────
        # Automatically generate readiness alert for the emergency dashboard
        alert_title = f"Emergency Incident: {inc['title']}"
        conn.execute(
            "INSERT INTO emergency_readiness_alerts "
            "(incident_id, title, eta_minutes, priority, prep_recommendation, created_at) "
            "VALUES (?,?,?,?,?,?)",
            (
                incident_id, alert_title, corridor_eta, eci_severity,
                "Trauma Team Standby & ICU Bed Allocation requested" if eci_severity in ["Critical", "High"] else "Emergency Room Standby",
                now
            )
        )
        
        conn.commit()
    except sqlite3.IntegrityError:
        # If record already exists, just return existing
        pass
        
    return get_emergency_chain_by_incident(incident_id)
