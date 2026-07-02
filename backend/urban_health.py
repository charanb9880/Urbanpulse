
"""
Urban Health Engine — composite city health score from traffic, weather,
incidents, and accessibility.
"""

import numpy as np
from datetime import datetime
from typing import Dict, Any, List, Optional

import database as db


def calculate_urban_health(
    avg_congestion: float = 0.0,
    active_incidents: int = 0,
    weather_penalty: float = 0.0,
    accessibility_reduction: float = 0.0,
) -> Dict[str, Any]:
    """
    Score 0-100 (higher = healthier city).
    base = 100, subtract penalties.
    """
    base = 100.0
    congestion_penalty = avg_congestion * 30
    incident_penalty = min(active_incidents * 5, 30)  # cap at 30
    weather_pen = weather_penalty * 20
    access_pen = accessibility_reduction * 15

    score = max(0, base - congestion_penalty - incident_penalty - weather_pen - access_pen)
    score = round(score, 1)

    if score >= 80:
        risk_level = "Low"
        label = "Healthy"
    elif score >= 60:
        risk_level = "Moderate"
        label = "Stable"
    elif score >= 40:
        risk_level = "High"
        label = "Stressed"
    else:
        risk_level = "Critical"
        label = "Critical"

    factors = {
        "avg_congestion": round(avg_congestion, 4),
        "active_incidents": active_incidents,
        "weather_penalty": round(weather_penalty, 3),
        "accessibility_reduction": round(accessibility_reduction, 3),
        "breakdown": {
            "congestion_impact": round(congestion_penalty, 1),
            "incident_impact": round(incident_penalty, 1),
            "weather_impact": round(weather_pen, 1),
            "accessibility_impact": round(access_pen, 1),
        },
    }

    # Persist
    try:
        db.save_urban_health(score, risk_level, factors)
    except Exception:
        pass

    return {
        "score": score,
        "risk_level": risk_level,
        "label": label,
        "factors": factors,
        "timestamp": datetime.utcnow().isoformat(),
    }


def get_health_history(hours: int = 24) -> List[dict]:
    return db.get_urban_health_history(hours)
