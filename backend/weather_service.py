"""
Weather Intelligence Service.
Tries OpenWeather API (env OPENWEATHER_API_KEY), falls back to simulation.
"""

import os
import random
import json
from datetime import datetime
from typing import Dict, Any, Optional

import database as db

# Impact lookup
IMPACT_TABLE = {
    "clear":       {"penalty": 0.0,  "speed_factor": 1.0,  "congestion_add": 0.0,  "flood_risk": "None"},
    "clouds":      {"penalty": 0.0,  "speed_factor": 1.0,  "congestion_add": 0.0,  "flood_risk": "None"},
    "light rain":  {"penalty": 0.15, "speed_factor": 0.9,  "congestion_add": 0.15, "flood_risk": "Low"},
    "rain":        {"penalty": 0.15, "speed_factor": 0.9,  "congestion_add": 0.15, "flood_risk": "Low"},
    "heavy rain":  {"penalty": 0.4,  "speed_factor": 0.7,  "congestion_add": 0.4,  "flood_risk": "High"},
    "drizzle":     {"penalty": 0.1,  "speed_factor": 0.95, "congestion_add": 0.1,  "flood_risk": "Low"},
    "thunderstorm":{"penalty": 0.6,  "speed_factor": 0.5,  "congestion_add": 0.6,  "flood_risk": "Very High"},
    "storm":       {"penalty": 0.6,  "speed_factor": 0.5,  "congestion_add": 0.6,  "flood_risk": "Very High"},
    "fog":         {"penalty": 0.1,  "speed_factor": 0.85, "congestion_add": 0.05, "flood_risk": "None"},
    "haze":        {"penalty": 0.05, "speed_factor": 0.95, "congestion_add": 0.0,  "flood_risk": "None"},
}

API_KEY = os.getenv("OPENWEATHER_API_KEY", "")
BENGALURU_LAT = 12.9345
BENGALURU_LON = 77.6265


def _simulate_weather() -> Dict[str, Any]:
    """Generate plausible Bengaluru weather when no API key is available."""
    r = random.random()
    if r < 0.5:
        condition, temp, humidity, wind = "Clear", random.uniform(26, 34), random.uniform(40, 60), random.uniform(3, 10)
    elif r < 0.75:
        condition, temp, humidity, wind = "Light Rain", random.uniform(22, 28), random.uniform(70, 90), random.uniform(10, 20)
    elif r < 0.9:
        condition, temp, humidity, wind = "Heavy Rain", random.uniform(20, 25), random.uniform(85, 98), random.uniform(20, 35)
    else:
        condition, temp, humidity, wind = "Clouds", random.uniform(24, 30), random.uniform(50, 70), random.uniform(5, 12)
    return {"condition": condition, "temp": round(temp, 1), "humidity": round(humidity, 1), "wind_speed": round(wind, 1)}


def _fetch_openweather() -> Optional[Dict[str, Any]]:
    if not API_KEY:
        return None
    try:
        import requests
        url = f"https://api.openweathermap.org/data/2.5/weather?lat={BENGALURU_LAT}&lon={BENGALURU_LON}&appid={API_KEY}&units=metric"
        resp = requests.get(url, timeout=5)
        if resp.status_code != 200:
            return None
        data = resp.json()
        return {
            "condition": data.get("weather", [{}])[0].get("main", "Clear"),
            "temp": round(data.get("main", {}).get("temp", 28), 1),
            "humidity": data.get("main", {}).get("humidity", 50),
            "wind_speed": round(data.get("wind", {}).get("speed", 5), 1),
        }
    except Exception:
        return None


def get_current_weather() -> Dict[str, Any]:
    """Return current weather + impact assessment. Persists to SQLite."""
    raw = _fetch_openweather() or _simulate_weather()
    condition_key = raw["condition"].lower()
    impact = IMPACT_TABLE.get(condition_key, IMPACT_TABLE["clear"])

    weather = {
        **raw,
        "penalty": impact["penalty"],
        "speed_factor": impact["speed_factor"],
        "congestion_add": impact["congestion_add"],
        "flood_risk": impact["flood_risk"],
        "timestamp": datetime.utcnow().isoformat(),
    }

    # Persist
    try:
        db.save_weather(
            condition=raw["condition"],
            temp=raw["temp"],
            humidity=raw.get("humidity", 50),
            wind_speed=raw.get("wind_speed", 5),
            penalty=impact["penalty"],
        )
    except Exception:
        pass

    return weather


def get_latest_weather() -> Dict[str, Any]:
    """Return most recent weather from DB, or fetch fresh."""
    row = db.get_latest_weather()
    if row:
        condition_key = row["condition"].lower()
        impact = IMPACT_TABLE.get(condition_key, IMPACT_TABLE["clear"])
        return {
            "condition": row["condition"],
            "temp": row["temp"],
            "humidity": row.get("humidity", 50),
            "wind_speed": row.get("wind_speed", 5),
            "penalty": impact["penalty"],
            "speed_factor": impact["speed_factor"],
            "congestion_add": impact["congestion_add"],
            "flood_risk": impact["flood_risk"],
            "timestamp": row.get("fetched_at", ""),
        }
    return get_current_weather()
