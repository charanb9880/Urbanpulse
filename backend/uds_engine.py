"""
UrbanPulse AI — Urban Decision Simulator (UDS) Engine
An additive module to run hypothetical city simulations, evaluate multi-dimensional impact scores,
recommend alternative strategies, compare decisions, and query city organizational memory.
"""

import json
import sqlite3
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

from database import get_conn, now_iso

# Default Mock Historical Memory Data to seed
MOCK_HISTORICAL_DECISIONS = [
    {
        "scenario_type": "Road Closure",
        "title": "Mysore Road Flyover Maintenance",
        "location": "Mysore Road",
        "duration_hours": 8,
        "affected_area": "Major Connector",
        "parameters_json": json.dumps({"lane_closure": 100, "detour_quality": "low"}),
        "mobility_score": 78,
        "citizen_score": 65,
        "emergency_score": 72,
        "risk_score": 72,
        "results_json": json.dumps({
            "traffic": "Gridlock at toll gates. Alternate routes over-capacitated.",
            "citizen": "Disrupted daily commute for 24,000+ citizens. Transit delay +20m.",
            "emergency": "Response corridor blockage. St. John's ambulance routes delayed by 8m.",
            "resource": "Requires 8 traffic units and 4 signboards."
        }),
        "alternative_strategy": "Perform partial closure (50% lanes) or schedule night shift (10 PM to 5 AM).",
        "ai_reasoning": "This road closure acts as a major link between CBD and south-west zones. Complete shutdown induces massive spillover.",
        "creator": "System Archival Seeder",
        "created_at": (datetime.utcnow() - timedelta(days=90)).isoformat()
    },
    {
        "scenario_type": "Event Impact",
        "title": "Bengaluru Marathon 2026",
        "location": "Koramangala 100ft Road",
        "duration_hours": 6,
        "affected_area": "Koramangala CBD Corridor",
        "parameters_json": json.dumps({"crowd_size": 15000, "peak_hours": True}),
        "mobility_score": 75,
        "citizen_score": 82,
        "emergency_score": 50,
        "risk_score": 69,
        "results_json": json.dumps({
            "traffic": "Heavy residential lane blockages. Core speeds down to 11km/h.",
            "citizen": "High pedestrian accessibility but extreme local retail transit blocks.",
            "emergency": "Normal medical access, local clinics bypass route active.",
            "resource": "Requires 12 traffic personnel and 3 medical response stands."
        }),
        "alternative_strategy": "Move event start time to 5:00 AM and open major bypass corridors by 9:00 AM.",
        "ai_reasoning": "Holding the marathon during standard morning peak hours triggers extensive congestion at key residential exits.",
        "creator": "System Archival Seeder",
        "created_at": (datetime.utcnow() - timedelta(days=60)).isoformat()
    },
    {
        "scenario_type": "Infrastructure Maintenance",
        "title": "Silk Board Junction Metro Pier Work",
        "location": "Silk Board Junction",
        "duration_hours": 12,
        "affected_area": "Major Intersection Grid",
        "parameters_json": json.dumps({"lane_width_reduction": 30, "heavy_machinery": True}),
        "mobility_score": 85,
        "citizen_score": 78,
        "emergency_score": 80,
        "risk_score": 81,
        "results_json": json.dumps({
            "traffic": "Spillover queues extending 2.4km along Hosur Road and ORR.",
            "citizen": "Severe bus rapid transit corridor delays (+28m average commute).",
            "emergency": "Critical. Level 1 Trauma Center ambulance ingress restricted.",
            "resource": "Requires 15 traffic officers and dynamic signal override timers."
        }),
        "alternative_strategy": "Impose peak-hour commercial vehicle ban and schedule concrete pouring during weekends only.",
        "ai_reasoning": "Silk Board Junction operates at 92% capacity. Reducing lane width by 30% during weekdays triggers systemic gridlock.",
        "creator": "System Archival Seeder",
        "created_at": (datetime.utcnow() - timedelta(days=30)).isoformat()
    },
    {
        "scenario_type": "Emergency Scenario",
        "title": "Whitefield Lake Overflow & Waterlogging",
        "location": "Whitefield ITPL Road",
        "duration_hours": 4,
        "affected_area": "Tech Corridor Arterial",
        "parameters_json": json.dumps({"water_depth_cm": 40, "impassable": True}),
        "mobility_score": 90,
        "citizen_score": 88,
        "emergency_score": 95,
        "risk_score": 91,
        "results_json": json.dumps({
            "traffic": "Total standstill along ITPL main road. Vehicles stranded.",
            "citizen": "Widespread office transit suspension. 45,000+ tech park commuters stranded.",
            "emergency": "Severe responder delays. Alternate emergency corridors inundated.",
            "resource": "Requires 6 emergency rescue rafts and 18 police diversion units."
        }),
        "alternative_strategy": "Activate dynamic signal wave preemption on Outer Ring Road bypass and deploy high-capacity pump units.",
        "ai_reasoning": "Waterlogging at ITPL Road cuts off the main route to Hope Farm. Spillover locks up Kadugodi and Hoodi.",
        "creator": "System Archival Seeder",
        "created_at": (datetime.utcnow() - timedelta(days=15)).isoformat()
    }
]

def init_uds():
    """Seed sample simulations if simulated_decisions is empty."""
    conn = get_conn()
    count = conn.execute("SELECT COUNT(*) FROM simulated_decisions").fetchone()[0]
    if count == 0:
        for item in MOCK_HISTORICAL_DECISIONS:
            conn.execute(
                "INSERT INTO simulated_decisions "
                "(scenario_type, title, location, duration_hours, affected_area, parameters_json, "
                " mobility_score, citizen_score, emergency_score, risk_score, results_json, "
                " alternative_strategy, ai_reasoning, creator, created_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    item["scenario_type"], item["title"], item["location"], item["duration_hours"],
                    item["affected_area"], item["parameters_json"], item["mobility_score"],
                    item["citizen_score"], item["emergency_score"], item["risk_score"],
                    item["results_json"], item["alternative_strategy"], item["ai_reasoning"],
                    item["creator"], item["created_at"]
                )
            )
        conn.commit()

# Seed database on module load
try:
    init_uds()
except Exception as e:
    print("[UDS Engine Seeding Failed]", e)


def calculate_simulation(
    scenario_type: str,
    title: str,
    location: str,
    duration_hours: int,
    affected_area: str,
    parameters: Dict[str, Any],
    creator: str = "Administrator"
) -> Dict[str, Any]:
    """
    Simulates decision consequences dynamically based on type, location, and parameters.
    Does not write directly to DB - allows sandboxed preview.
    """
    # 1. Base Score Multipliers based on Scenario Type
    if scenario_type == "Road Closure":
        base_mob = 60
        base_cit = 50
        base_emg = 55
        traffic_desc = f"Significant congestion at detour choke points. Alternate routes near {location} will experience traffic volume surges (+35%)."
        citizen_desc = "Public transport schedules disrupted. Local business pedestrian access restricted."
        emergency_desc = "Emergency ambulance routing through primary grid obstructed. Alternate corridors add 5-10m delay."
        resource_desc = "Requires 6 traffic officers and 3 diversion signs."
    elif scenario_type == "Event Impact":
        base_mob = 50
        base_cit = 65
        base_emg = 40
        traffic_desc = "Localized gridlock around event perimeter. Parking spillovers block side streets."
        citizen_desc = "High pedestrian density. Disrupted access for local commuters but positive recreational engagement."
        emergency_desc = "Low-to-moderate delay for emergency vehicles. Local clinics notified of bypass route."
        resource_desc = "Requires 10 traffic personnel, crowd control barriers, and standby paramedics."
    elif scenario_type == "Infrastructure Maintenance":
        base_mob = 55
        base_cit = 55
        base_emg = 60
        traffic_desc = "Lane width reduction causes slow-moving queues. Slower travel speeds extend bottleneck wave."
        citizen_desc = "Moderate delay for commuters. No public transport route suspension expected, but ETAs increased."
        emergency_desc = "Emergency vehicles must utilize shared lanes, reducing response speeds by 15-20%."
        resource_desc = "Requires 4 traffic personnel, safety cones, and night signal flags."
    else:  # Emergency Scenario
        base_mob = 75
        base_cit = 80
        base_emg = 85
        traffic_desc = "Hazard area isolated. Impassable roads trigger complete blockage. Gridlock spreading."
        citizen_desc = "Severe commuter displacement. Access to local services suspended. Stranded travelers likely."
        emergency_desc = "Critical priority emergency routing engaged. High threat to life-saving operations if corridors fail."
        resource_desc = "Requires 12 emergency response personnel, 4 rescue assets, and full police barricading."

    # 2. Scaling Factors (Duration, Radius/Impact scale)
    # Duration scaling: longer duration increases risk
    duration_factor = min(1.5, 0.7 + (duration_hours / 12.0))
    
    # Custom slider parameters scale the scores
    param_factor = 1.0
    if scenario_type == "Road Closure":
        # Check lane closure ratio (0-100)
        lane_closure = float(parameters.get("lane_closure", 100))
        param_factor = 0.5 + (lane_closure / 150.0)
    elif scenario_type == "Event Impact":
        # Check crowd size
        crowd_size = float(parameters.get("crowd_size", 10000))
        param_factor = 0.6 + (crowd_size / 25000.0)
    elif scenario_type == "Infrastructure Maintenance":
        # Check lane reduction
        lane_red = float(parameters.get("lane_width_reduction", 50))
        param_factor = 0.7 + (lane_red / 130.0)
    elif scenario_type == "Emergency Scenario":
        # Check water/hazard depth or severity index
        severity_idx = float(parameters.get("severity_index", 5)) # 1 to 10
        param_factor = 0.5 + (severity_idx / 8.0)

    # 3. Compute final scores (Bounded between 10 and 100)
    mob_score = max(10, min(100, int(base_mob * duration_factor * param_factor)))
    cit_score = max(10, min(100, int(base_cit * duration_factor * param_factor)))
    emg_score = max(10, min(100, int(base_emg * duration_factor * param_factor)))
    
    # Weighted overall risk score
    risk_score = int((mob_score * 0.4) + (cit_score * 0.3) + (emg_score * 0.3))
    
    # 4. Alternative Strategy Engine
    alt_strategy = ""
    reduction_pct = 0
    if scenario_type == "Road Closure":
        if duration_hours > 4:
            alt_strategy = f"Reschedule closure window to night hours (10 PM to 5 AM) or reduce duration to 4 hours."
            reduction_pct = 35
        else:
            alt_strategy = "Apply partial lane closures (50% flow) with a priority dynamic detour corridor."
            reduction_pct = 22
    elif scenario_type == "Event Impact":
        alt_strategy = "Shift event start time to off-peak slots (e.g. 11:00 AM) and construct remote park-and-ride shuttle terminals."
        reduction_pct = 27
    elif scenario_type == "Infrastructure Maintenance":
        alt_strategy = "Execute heavy construction exclusively during weekends with dynamic signal prioritization overlays."
        reduction_pct = 30
    else:  # Emergency Scenario
        alt_strategy = "Activate dynamic Green Corridor preemption waves on neighboring arterials and issue geofenced citizen routing advisory alert feeds."
        reduction_pct = 40

    # 5. AI Reasoning Generation
    reasoning = (
        f"This decision will impact mobility around {location} due to the local grid capacity constraints. "
        f"A duration of {duration_hours} hours creates a delay compounding wave that spreads to connecting intersections. "
        f"We expect increased queue lengths during standard commute slots. Emergency services access must be monitored closely."
    )
    if risk_score >= 76:
        reasoning = (
            f"CRITICAL SYSTEM WARNING: The simulated decision presents extreme risks to the urban grid near {location}. "
            f"A complete bottleneck wave is forecast to lock up 3 adjacent traffic sectors, delaying emergency responders by over 12 minutes. "
            f"Immediate alternative routing or off-peak scheduling is required."
        )

    # Compile result dict
    results = {
        "traffic": traffic_desc,
        "citizen": citizen_desc,
        "emergency": emergency_desc,
        "resource": resource_desc,
        "affected_commuters": int(duration_hours * 3500 * param_factor),
        "avg_delay_increase_mins": int(duration_hours * 3 * param_factor)
    }

    return {
        "scenario_type": scenario_type,
        "title": title,
        "location": location,
        "duration_hours": duration_hours,
        "affected_area": affected_area,
        "parameters_json": json.dumps(parameters),
        "mobility_score": mob_score,
        "citizen_score": cit_score,
        "emergency_score": emg_score,
        "risk_score": risk_score,
        "results_json": json.dumps(results),
        "alternative_strategy": alt_strategy,
        "alternative_reduction_pct": reduction_pct,
        "ai_reasoning": reasoning,
        "creator": creator,
        "created_at": now_iso()
    }


def save_simulated_decision(sim_data: dict) -> dict:
    """Saves simulated decision to SQLite history database."""
    conn = get_conn()
    cur = conn.execute(
        "INSERT INTO simulated_decisions "
        "(scenario_type, title, location, duration_hours, affected_area, parameters_json, "
        " mobility_score, citizen_score, emergency_score, risk_score, results_json, "
        " alternative_strategy, ai_reasoning, creator, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            sim_data["scenario_type"], sim_data["title"], sim_data["location"], sim_data["duration_hours"],
            sim_data["affected_area"], sim_data["parameters_json"], sim_data["mobility_score"],
            sim_data["citizen_score"], sim_data["emergency_score"], sim_data["risk_score"],
            json.dumps(sim_data.get("results") or json.loads(sim_data["results_json"])),
            sim_data["alternative_strategy"], sim_data["ai_reasoning"], sim_data["creator"], sim_data["created_at"]
        )
    )
    conn.commit()
    inserted_id = cur.lastrowid
    
    # Return saved record
    row = conn.execute("SELECT * FROM simulated_decisions WHERE id = ?", (inserted_id,)).fetchone()
    d = dict(row)
    d["results"] = json.loads(d["results_json"])
    d["parameters"] = json.loads(d["parameters_json"]) if d.get("parameters_json") else {}
    return d


def get_simulated_decisions_history() -> List[dict]:
    """Retrieves all previous simulations from SQLite."""
    conn = get_conn()
    rows = conn.execute("SELECT * FROM simulated_decisions ORDER BY created_at DESC").fetchall()
    history = []
    for r in rows:
        d = dict(r)
        d["results"] = json.loads(d["results_json"])
        d["parameters"] = json.loads(d["parameters_json"]) if d.get("parameters_json") else {}
        history.append(d)
    return history


def get_simulated_decision_by_id(sim_id: int) -> Optional[dict]:
    """Retrieves a single simulation details by its ID."""
    conn = get_conn()
    row = conn.execute("SELECT * FROM simulated_decisions WHERE id = ?", (sim_id,)).fetchone()
    if not row:
        return None
    d = dict(row)
    d["results"] = json.loads(d["results_json"])
    d["parameters"] = json.loads(d["parameters_json"]) if d.get("parameters_json") else {}
    return d


def compare_decisions(id1: int, id2: int) -> dict:
    """Compares two simulated decisions side-by-side and returns recommendations."""
    sim1 = get_simulated_decision_by_id(id1)
    sim2 = get_simulated_decision_by_id(id2)
    if not sim1 or not sim2:
        return {"error": "One or both simulations not found."}
        
    # Determine the preferred decision based on lower overall risk score
    if sim1["risk_score"] < sim2["risk_score"]:
        preferred_id = id1
        preferred_title = sim1["title"]
        diff_score = sim2["risk_score"] - sim1["risk_score"]
        rationale = f"Scenario '{sim1['title']}' is preferred as it presents a risk index {diff_score}% lower than Scenario '{sim2['title']}', preserving better emergency corridor speeds."
    elif sim2["risk_score"] < sim1["risk_score"]:
        preferred_id = id2
        preferred_title = sim2["title"]
        diff_score = sim1["risk_score"] - sim2["risk_score"]
        rationale = f"Scenario '{sim2['title']}' is preferred as it presents a risk index {diff_score}% lower than Scenario '{sim1['title']}', inducing less commuter delay."
    else:
        preferred_id = id1
        preferred_title = sim1["title"]
        rationale = f"Both scenarios present identical risk profiles ({sim1['risk_score']}%). '{sim1['title']}' is selected by default."

    return {
        "scenario_a": sim1,
        "scenario_b": sim2,
        "preferred_scenario_id": preferred_id,
        "preferred_title": preferred_title,
        "rationale": rationale
    }


def find_similar_simulations(scenario_type: str, location: str) -> List[dict]:
    """Searches history for similar past simulations (City Memory Engine)."""
    conn = get_conn()
    # Simple query matching either the location prefix or type
    loc_wildcard = f"%{location.split(' ')[0]}%"
    rows = conn.execute(
        "SELECT * FROM simulated_decisions "
        "WHERE scenario_type = ? OR location LIKE ? "
        "ORDER BY created_at DESC LIMIT 3",
        (scenario_type, loc_wildcard)
    ).fetchall()
    
    matches = []
    for r in rows:
        d = dict(r)
        d["results"] = json.loads(d["results_json"])
        d["parameters"] = json.loads(d["parameters_json"]) if d.get("parameters_json") else {}
        matches.append(d)
    return matches
