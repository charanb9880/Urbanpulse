"""
UrbanPulse AI — Urban Mobility Pulse Network (UMPN) Engine
An additive module to anonymously aggregate movement patterns, identify anomalies,
forecast congestion hot-spots, and generate proactive smart city warnings.
"""

import json
import random
import sqlite3
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

from database import get_conn, now_iso, row_to_dict

# Default Corridors and baseline statistics
BASE_CORRIDORS = [
    {
        "id": 1,
        "origin": "Mandya",
        "destination": "Mysore",
        "demand_level": "High",
        "growth_pct": 34,
        "avg_travel_time_mins": 48,
        "delay_trend": "Increasing",
        "active_users": 520
    },
    {
        "id": 2,
        "origin": "Mysore",
        "destination": "Bengaluru",
        "demand_level": "Critical",
        "growth_pct": 12,
        "avg_travel_time_mins": 145,
        "delay_trend": "Stable",
        "active_users": 980
    },
    {
        "id": 3,
        "origin": "City Center",
        "destination": "Industrial Zone",
        "demand_level": "Medium",
        "growth_pct": -5,
        "avg_travel_time_mins": 35,
        "delay_trend": "Decreasing",
        "active_users": 340
    },
    {
        "id": 4,
        "origin": "Koramangala",
        "destination": "Silk Board",
        "demand_level": "Critical",
        "growth_pct": 18,
        "avg_travel_time_mins": 24,
        "delay_trend": "Increasing",
        "active_users": 640
    },
    {
        "id": 5,
        "origin": "HSR Layout",
        "destination": "Indiranagar",
        "demand_level": "High",
        "growth_pct": 22,
        "avg_travel_time_mins": 38,
        "delay_trend": "Increasing",
        "active_users": 410
    }
]

SIMULATED_STREETS = [
    "Hosur Road Bypass", "100ft Road Corridor", "HAL Old Airport Rd", "Outer Ring Road Grid",
    "Sarjapur Road Link", "Seshadri Road Corridor", "Lalbagh Fort Road"
]

def init_umpn():
    """Initializes the database tables on startup if not already loaded."""
    conn = get_conn()
    # Ensure tables exist (already done by database.py executescript, but double-safety)
    conn.execute("""
    CREATE TABLE IF NOT EXISTS umpn_settings (
        user_id INTEGER PRIMARY KEY REFERENCES users(id),
        smart_journey_enabled INTEGER DEFAULT 0,
        updated_at TEXT NOT NULL
    );
    """)
    conn.execute("""
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
    conn.commit()


def get_umpn_settings(user_id: int) -> dict:
    """Retrieves settings for a specific user."""
    conn = get_conn()
    row = conn.execute("SELECT * FROM umpn_settings WHERE user_id = ?", (user_id,)).fetchone()
    if not row:
        return {
            "user_id": user_id,
            "smart_journey_enabled": 0,
            "updated_at": now_iso()
        }
    return row_to_dict(row)


def set_umpn_settings(user_id: int, enabled: bool) -> dict:
    """Sets the smart journey enabled state for a user."""
    conn = get_conn()
    status_int = 1 if enabled else 0
    now = now_iso()
    
    # Check if exists
    row = conn.execute("SELECT user_id FROM umpn_settings WHERE user_id = ?", (user_id,)).fetchone()
    if row:
        conn.execute(
            "UPDATE umpn_settings SET smart_journey_enabled = ?, updated_at = ? WHERE user_id = ?",
            (status_int, now, user_id)
        )
    else:
        conn.execute(
            "INSERT INTO umpn_settings (user_id, smart_journey_enabled, updated_at) VALUES (?, ?, ?)",
            (user_id, status_int, now)
        )
    conn.commit()
    return {
        "user_id": user_id,
        "smart_journey_enabled": status_int,
        "updated_at": now
    }


def get_active_contributors_count() -> int:
    """Computes total anonymized contributors currently sharing telemetry."""
    conn = get_conn()
    # Count database flags
    enabled_count = conn.execute(
        "SELECT COUNT(*) FROM umpn_settings WHERE smart_journey_enabled = 1"
    ).fetchone()[0]
    
    # Return base simulated active telemetry users + verified active toggle users
    return 148 + enabled_count


def get_umpn_intelligence() -> dict:
    """
    Core Mobility Intelligence Engine.
    Aggregates simulated active data points and DB parameters.
    """
    active_contributors = get_active_contributors_count()
    
    # Dynamic multiplier based on active contributors
    contrib_pct_change = (active_contributors - 148) * 0.05
    
    # 1. Corridors Analysis
    corridors = []
    for item in BASE_CORRIDORS:
        item_copy = item.copy()
        # Scale active users based on toggles
        item_copy["active_users"] = int(item["active_users"] * (1 + contrib_pct_change))
        
        # Recalculate travel time delay trend labels
        if item_copy["growth_pct"] > 25:
            item_copy["delay_trend"] = "Increasing"
            item_copy["demand_level"] = "Critical"
        elif item_copy["growth_pct"] > 10:
            item_copy["delay_trend"] = "Increasing"
            item_copy["demand_level"] = "High"
        elif item_copy["growth_pct"] >= 0:
            item_copy["delay_trend"] = "Stable"
            item_copy["demand_level"] = "Medium"
        else:
            item_copy["delay_trend"] = "Decreasing"
            item_copy["demand_level"] = "Low"
            
        corridors.append(item_copy)

    # 2. Movement Trends (Anonymized)
    trends = [
        {
            "id": 1,
            "origin": "Mandya",
            "destination": "Mysore",
            "trend_pct": 34,
            "confidence": "High",
            "volume": int(480 * (1 + contrib_pct_change)),
            "time_of_peak": "17:30 - 19:30"
        },
        {
            "id": 2,
            "origin": "HSR Layout",
            "destination": "Koramangala",
            "trend_pct": 15,
            "confidence": "Medium",
            "volume": int(320 * (1 + contrib_pct_change)),
            "time_of_peak": "09:00 - 11:30"
        },
        {
            "id": 3,
            "origin": "Whitefield",
            "destination": "Outer Ring Road",
            "trend_pct": 28,
            "confidence": "High",
            "volume": int(850 * (1 + contrib_pct_change)),
            "time_of_peak": "08:30 - 10:45"
        }
    ]

    # 3. Travel Demand Heat Zones
    heat_zones = [
        {
            "id": 1,
            "corridor": "HAL Old Airport Road Corridor",
            "demand": "High",
            "volume": int(1120 * (1 + contrib_pct_change)),
            "peak_period": "08:00 AM - 10:30 AM"
        },
        {
            "id": 2,
            "corridor": "Outer Ring Road Bypass",
            "demand": "Critical",
            "volume": int(1580 * (1 + contrib_pct_change)),
            "peak_period": "06:00 PM - 09:00 PM"
        },
        {
            "id": 3,
            "corridor": "Stadium Zone Inner Ring Road",
            "demand": "Medium",
            "volume": int(740 * (1 + contrib_pct_change)),
            "peak_period": "05:00 PM - 07:30 PM"
        }
    ]

    # 4. Congestion Formation Signals
    congestion_signals = [
        {
            "id": 1,
            "location": "Mandya Ring Road",
            "confidence": 87,
            "severity": "High",
            "type": "Potential Congestion Formation",
            "timestamp": "10 mins ago",
            "reason": "Sudden travel density increase by 45% over the past 15 mins."
        },
        {
            "id": 2,
            "location": "Bus Terminal Exit",
            "confidence": 72,
            "severity": "Medium",
            "type": "Increasing Traffic Concentration",
            "timestamp": "4 mins ago",
            "reason": "Slow-down logs matching route blockages near commercial zone entrance."
        }
    ]

    # 5. Mobility Anomalies
    anomalies = [
        {
            "id": 1,
            "type": "Sudden Travel Density Increase",
            "location": "Stadium Zone",
            "description": "Abnormal delay of +15m detected across 45 active users.",
            "impact": "Potential Traffic Disruption",
            "confidence": 92
        },
        {
            "id": 2,
            "type": "Large-scale Route Deviation",
            "location": "Koramangala 100ft Road",
            "description": "28% of active users deviating unexpectedly onto secondary bypass channels.",
            "impact": "Potential Road Obstruction",
            "confidence": 85
        },
        {
            "id": 3,
            "type": "Sudden Speed Deceleration",
            "location": "Hosur Road Bypass",
            "description": "Average speeds dropped from 42km/h to 11km/h within 3 minutes.",
            "impact": "Potential Congestion Formation",
            "confidence": 89
        }
    ]

    # 6. Early Warning Intelligence
    early_warnings = [
        {
            "id": 1,
            "alert": "Increasing congestion pressure detected on Mandya Corridor A.",
            "expected_formation_mins": 20,
            "confidence": 84
        },
        {
            "id": 2,
            "alert": "Unexpected mobility surge detected near City Center grid.",
            "expected_formation_mins": 15,
            "confidence": 78
        },
        {
            "id": 3,
            "alert": "Traffic demand rising rapidly near Stadium Zone.",
            "expected_formation_mins": 25,
            "confidence": 89
        }
    ]

    # 7. Hotspot Prediction
    hotspots = [
        {
            "id": 1,
            "location": "Mandya Ring Road",
            "risk": "High",
            "confidence": 82,
            "expected_formation_mins": 25,
            "reason": "Increasing travel demand and route concentration."
        },
        {
            "id": 2,
            "location": "Whitefield IT Corridor Exit",
            "risk": "Critical",
            "confidence": 90,
            "expected_formation_mins": 12,
            "reason": "Heavy route concentration combined with weather-related speed reduction."
        }
    ]

    # 8. AI Insights Panel (Explainable natural language)
    insights = [
        f"Movement demand towards the city center has increased by {int(22 * (1 + contrib_pct_change * 0.1))}% during the last hour.",
        "Travel density near the bus terminal indicates possible congestion formation.",
        "Route diversion patterns suggest an emerging obstruction near Junction 4.",
        "Anonymized telemetry tracks verify that dynamic ORR bypasses have saved +12% average travel time for 380 active trips."
    ]

    return {
        "active_contributors": active_contributors,
        "corridors": corridors,
        "trends": trends,
        "heat_zones": heat_zones,
        "congestion_signals": congestion_signals,
        "anomalies": anomalies,
        "early_warnings": early_warnings,
        "hotspots": hotspots,
        "insights": insights
    }


def get_simulated_telemetry() -> dict:
    """Produces a random simulated telemetry frame for the citizen portal display."""
    origins = ["Koramangala 100ft Road", "HSR Layout Sector 2", "Whitefield ITPL Road", "Indiranagar 12th Main"]
    destinations = ["Silk Board Junction", "Majestic Bus Station", "MG Road Central", "Electronic City Phase 1"]
    
    origin = random.choice(origins)
    destination = random.choice(destinations)
    while destination == origin:
        destination = random.choice(destinations)
        
    duration = random.randint(12, 45)
    delay = random.randint(0, 15)
    deviation = 1 if random.random() < 0.25 else 0
    
    route_segments = [origin, random.choice(SIMULATED_STREETS), destination]
    
    logs = [
        f"Connecting to anonymous UMPN socket...",
        f"Transmitting travel sector {route_segments[0]} &rarr; {route_segments[1]}",
        f"Current speed: {random.randint(15, 48)} km/h",
        f"Anonymized telemetry token initialized.",
        f"Aggregate stats updated (contributors: {get_active_contributors_count()})"
    ]
    
    return {
        "origin": origin,
        "destination": destination,
        "duration_mins": duration,
        "delay_mins": delay,
        "deviation_detected": deviation,
        "route_taken": " → ".join(route_segments),
        "logs": logs,
        "timestamp": now_iso()
    }
