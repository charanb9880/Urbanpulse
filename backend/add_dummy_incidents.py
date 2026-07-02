import sqlite3
import json
from datetime import datetime

DB_PATH = "urbanpulse.db"

def now_iso():
    return datetime.utcnow().isoformat() + "Z"

def clear_and_seed_realistic_incidents():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    
    # 1. Clear existing incidents and dependent rows
    print("Clearing existing dummy incidents, notifications, and emergency chains...")
    conn.execute("DELETE FROM emergency_readiness_alerts;")
    conn.execute("DELETE FROM emergency_chains;")
    conn.execute("DELETE FROM notifications;")
    conn.execute("DELETE FROM incidents;")
    # Reset autoincrement sequences
    conn.execute("DELETE FROM sqlite_sequence WHERE name IN ('emergency_readiness_alerts', 'emergency_chains', 'notifications', 'incidents');")
    conn.commit()

    # 2. Define realistic incidents and their AI analysis
    incidents_data = [
        {
            "title": "Multi-Vehicle Collision near Silk Board Flyover",
            "description": "A three-car collision on the Outer Ring Road ramp has blocked the left and center lanes, causing severe traffic backlog and vehicle wreckage.",
            "category": "Road Accident",
            "location": "Silk Board Junction",
            "lat": 12.9172,
            "lng": 77.6228,
            "severity": "Critical",
            "status": "Reported",
            "image_url": "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&q=80&w=800",
            "ai_analysis": {
                "incident_type": "Accident",
                "severity": "Critical",
                "confidence": 0.98,
                "urgency": "Immediate",
                "traffic_impact": "Severe bottleneck likely, expanding to 3km radius along Outer Ring Road",
                "accessibility_impact": "Blockage of 2 active lanes, vehicle recovery units dispatched",
                "priority": "Critical",
                "suggested_action": "Deploy traffic police, route diversion warnings, emergency towing vehicles"
            }
        },
        {
            "title": "Severe Waterlogging at HAL Airport Road Underpass",
            "description": "Following the heavy morning downpour, the underpass near Wind Tunnel Road is completely flooded with 2.5 feet of standing water. Small cars are unable to pass.",
            "category": "Flood",
            "location": "HAL Old Airport Road",
            "lat": 12.9598,
            "lng": 77.6499,
            "severity": "High",
            "status": "AI Verified",
            "image_url": "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&q=80&w=800",
            "ai_analysis": {
                "incident_type": "Flood",
                "severity": "High",
                "confidence": 0.94,
                "urgency": "High",
                "traffic_impact": "Total blockage of underpass. Average delay of +25m on HAL Road.",
                "accessibility_impact": "Impassable for hatchbacks/sedans. Buses and trucks passing slowly.",
                "priority": "High",
                "suggested_action": "Deploy high-capacity water pump units, set up physical barricades and detour signs."
            }
        },
        {
            "title": "Dangerous Pothole Cluster on Indiranagar 100ft Road",
            "description": "A cluster of three deep potholes has opened up in the middle lane near the Indiranagar Metro Station. Two-wheelers are losing balance trying to swerve around them.",
            "category": "Pothole",
            "location": "Indiranagar 100ft Road",
            "lat": 12.9712,
            "lng": 77.6412,
            "severity": "Medium",
            "status": "Under Review",
            "image_url": "https://images.unsplash.com/photo-1621293954908-907141447fc9?auto=format&fit=crop&q=80&w=800",
            "ai_analysis": {
                "incident_type": "Pothole",
                "severity": "Medium",
                "confidence": 0.88,
                "urgency": "Medium",
                "traffic_impact": "Drivers swerving unexpectedly, causing sudden decelerations in middle lane.",
                "accessibility_impact": "Extreme hazard for two-wheelers and cyclists.",
                "priority": "Medium",
                "suggested_action": "Deploy maintenance crew for immediate cold-mix pothole filling."
            }
        },
        {
            "title": "Fallen Tree Blocking Sarjapur Main Road",
            "description": "A massive gulmohar tree has collapsed during the evening storm near the Wipro Corporate Office, completely blocking one lane and the sidewalk.",
            "category": "Fallen Tree",
            "location": "Sarjapur Road",
            "lat": 12.9123,
            "lng": 77.6834,
            "severity": "High",
            "status": "Action Initiated",
            "image_url": "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&q=80&w=800",
            "ai_analysis": {
                "incident_type": "Fallen Tree",
                "severity": "High",
                "confidence": 0.96,
                "urgency": "High",
                "traffic_impact": "Single lane traffic bottleneck. Slower speeds (+15m commute delay).",
                "accessibility_impact": "Complete sidewalk and left lane blockage.",
                "priority": "High",
                "suggested_action": "Dispatch BBMP forest squad with chain saws to clear trunk and debris."
            }
        },
        {
            "title": "Flipped Delivery Truck near Silk Board Junction",
            "description": "A small commercial delivery vehicle has flipped over on its side near the Silk Board flyover entrance. Motorists are rubbernecking, compounding the exit block.",
            "category": "Road Blockage",
            "location": "Silk Board Junction",
            "lat": 12.9172,
            "lng": 77.6228,
            "severity": "Critical",
            "status": "Action Initiated",
            "image_url": "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800",
            "ai_analysis": {
                "incident_type": "Road Blockage",
                "severity": "Critical",
                "confidence": 0.97,
                "urgency": "Immediate",
                "traffic_impact": "Flyover ramp access restricted. Massive gridlock spreading to connecting zones.",
                "accessibility_impact": "Complete lane obstruction, crane required for recovery.",
                "priority": "Critical",
                "suggested_action": "Deploy heavy recovery crane, divert traffic through BTM Layout roads."
            }
        },
        {
            "title": "Metro Rail Construction Barricades on Whitefield Road",
            "description": "Unmarked metro rail construction barricades have been placed at a sharp turn on ITPL Main Road without reflective signs, causing vehicles to merge lanes abruptly.",
            "category": "Construction Activity",
            "location": "Whitefield ITPL Road",
            "lat": 12.9845,
            "lng": 77.7378,
            "severity": "Medium",
            "status": "Under Review",
            "image_url": "https://images.unsplash.com/photo-1508873696983-2df519f0397e?auto=format&fit=crop&q=80&w=800",
            "ai_analysis": {
                "incident_type": "Construction Activity",
                "severity": "Medium",
                "confidence": 0.91,
                "urgency": "Medium",
                "traffic_impact": "Abrupt merging. Minor speed slowdowns (+5m commute delay).",
                "accessibility_impact": "Lane width reduced by 35%. Barricaded zone.",
                "priority": "Medium",
                "suggested_action": "Enforce contractor safety standards, install reflective hazard tape and flashing warning lights."
            }
        }
    ]

    for data in incidents_data:
        conn.execute(
            """INSERT INTO incidents
               (title, description, category, location, lat, lng, severity, status, image_url, verified, verification_count, ai_analysis_json, user_id, created_at, updated_at)
               VALUES (?,?,?,?,?,?,?,?,?,0,0,?,?,?,?)""",
            (
                data["title"],
                data["description"],
                data["category"],
                data["location"],
                data["lat"],
                data["lng"],
                data["severity"],
                data["status"],
                data["image_url"],
                json.dumps(data["ai_analysis"]),
                1,
                now_iso(),
                now_iso()
            )
        )
        print(f"Added realistic incident: {data['title']}")

    conn.commit()
    conn.close()
    print("Database successfully seeded with realistic incidents!")

if __name__ == "__main__":
    clear_and_seed_realistic_incidents()
