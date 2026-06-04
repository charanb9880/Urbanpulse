import sqlite3
import json
from datetime import datetime

DB_PATH = "urbanpulse.db"

def now_iso():
    return datetime.utcnow().isoformat() + "Z"

def add_incident():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    
    # Critical incident
    ai_analysis_1 = {
        "incident_type": "Accident",
        "severity": "Critical",
        "confidence": 0.98,
        "urgency": "Immediate",
        "traffic_impact": "Severe bottleneck likely, expanding to 2km radius",
        "accessibility_impact": "Complete road blockage",
        "priority": "Critical",
        "suggested_action": "Dispatch emergency services & reroute traffic"
    }
    
    # High priority incident
    ai_analysis_2 = {
        "incident_type": "Road Blockage",
        "severity": "High",
        "confidence": 0.88,
        "urgency": "High",
        "traffic_impact": "Significant delays, 15 min added to commute",
        "accessibility_impact": "Pedestrian pathway obstructed",
        "priority": "High",
        "suggested_action": "Dispatch traffic police / clearing team"
    }

    conn.execute(
        """INSERT INTO incidents
           (title, description, category, location, lat, lng, severity, status, image_url, verified, verification_count, ai_analysis_json, user_id, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,0,0,?,?,?,?)""",
        ("Major Multi-Vehicle Crash", "Severe accident involving 3 cars blocking all lanes.", "Accident", "Silk Board Junction", 12.9172, 77.6228, "Critical", "Reported", "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&q=80&w=800", json.dumps(ai_analysis_1), 1, now_iso(), now_iso()),
    )
    
    conn.execute(
        """INSERT INTO incidents
           (title, description, category, location, lat, lng, severity, status, image_url, verified, verification_count, ai_analysis_json, user_id, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,0,0,?,?,?,?)""",
        ("Fallen Tree on Arterial Road", "Large tree fell due to heavy rain, blocking two lanes.", "Road Blockage", "Koramangala 100ft Road", 12.9345, 77.6265, "High", "AI Verified", "https://images.unsplash.com/photo-1515525547614-7221e35a133b?auto=format&fit=crop&q=80&w=800", json.dumps(ai_analysis_2), 1, now_iso(), now_iso()),
    )
    
    conn.commit()
    print("Dummy incidents added!")

if __name__ == "__main__":
    add_incident()
