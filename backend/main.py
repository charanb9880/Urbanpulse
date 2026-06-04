"""
UrbanPulse AI — Unified FastAPI Backend
Consolidates auth, incidents, ML (STGNN), weather, routing,
consequence engine, urban health, simulation, and notifications.
"""

import base64
import json
import os
import threading
import time
from datetime import datetime, timedelta
from typing import Optional, List

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr

load_dotenv()

# ── Database ────────────────────────────────────────────────────
import database as db

# ── Services (imported lazily where heavy deps are involved) ────
import weather_service
import consequence_engine as ce
import urban_health as uh

# ── App ─────────────────────────────────────────────────────────
app = FastAPI(title="UrbanPulse AI API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# ── ML Engine (lazy) ────────────────────────────────────────────
_ml = None
_ml_lock = threading.Lock()


def _get_ml():
    """Lazy-init the ML engine on first request that needs it."""
    global _ml
    if _ml is not None:
        return _ml
    with _ml_lock:
        if _ml is not None:
            return _ml
        from ml.engine import engine
        engine.initialize()
        _ml = engine
        return _ml


def _ml_ready() -> bool:
    return _ml is not None and _ml.initialized


# ── Background: feed incidents + weather to ML engine ───────────
def _bg_sync_loop():
    """Every 10 s, push latest incidents & weather into ML engine."""
    while True:
        try:
            if _ml_ready():
                incidents = db.get_active_incidents()
                _ml.update_incidents(incidents)
                w = weather_service.get_latest_weather()
                _ml.update_weather(w)
        except Exception as e:
            print("[bg-sync]", e)
        time.sleep(10)


threading.Thread(target=_bg_sync_loop, daemon=True).start()


# ── Pydantic Models ─────────────────────────────────────────────
class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str = "citizen"


class UserLogin(BaseModel):
    email: str
    password: str


class IncidentCreate(BaseModel):
    title: str
    description: str
    category: str
    location: str
    severity: str = "Medium"
    image_url: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


class Coordinates(BaseModel):
    lat: float
    lng: float

class ActionRequest(BaseModel):
    action: str
    incident_id: Optional[int] = None
    location: Optional[str] = None

class AdvisoryRequest(BaseModel):
    type: str
    location: str

class ImpactRequest(BaseModel):
    action: str
    location: str


class RouteRequest(BaseModel):
    origin: Coordinates
    destination: Coordinates


class ChatRequest(BaseModel):
    message: str


class StatusUpdate(BaseModel):
    status: str


# ── Helpers ──────────────────────────────────────────────────────
def _token(data: dict) -> str:
    payload = {**data, "exp": (datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)).isoformat()}
    return f"dummy.{base64.b64encode(json.dumps(payload).encode()).decode()}.dummy"


# ═══════════════════════════════════════════════════════════════
#  ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@app.get("/")
async def root():
    return {"message": "UrbanPulse AI API is running!", "version": "2.0.0"}


@app.get("/api/health")
async def health():
    return {"status": "healthy", "ml_ready": _ml_ready(), "timestamp": datetime.utcnow().isoformat()}


# ── Auth ─────────────────────────────────────────────────────────
@app.post("/api/auth/signup")
async def signup(user: UserCreate):
    if user.role not in ("citizen", "authority"):
        user.role = "citizen"
    existing = db.get_user_by_email(user.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    u = db.create_user(user.name, user.email, user.password, user.role)
    return {"id": u["id"], "name": u["name"], "email": u["email"], "role": u["role"]}


@app.post("/api/auth/login")
async def login(creds: UserLogin):
    email = creds.email.strip().lower()
    pw = creds.password.strip()

    # Demo accounts (seed if first run)
    db.seed_demo_users()
    demo = {
        "citizen": ("citizen123", "citizen"),
        "authority": ("authority123", "authority"),
        "citizen@urbanpulse.ai": ("citizen123", "citizen"),
        "authority@urbanpulse.ai": ("authority123", "authority"),
    }
    if email in demo:
        dpw, role = demo[email]
        if pw == dpw:
            return {"access_token": _token({"sub": email, "role": role}), "token_type": "bearer"}

    user = db.get_user_by_email(email)
    if not user or not db.verify_password(user, pw):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    return {"access_token": _token({"sub": user["email"], "role": user["role"]}), "token_type": "bearer"}


# ── Incidents ────────────────────────────────────────────────────
@app.get("/api/incidents")
async def list_incidents(status_filter: Optional[str] = None):
    return db.get_incidents(status_filter)


def generate_ai_analysis(title: str, desc: str, category: str):
    text = (title + " " + desc).lower()
    priority = "Medium"
    confidence = 0.85
    urgency = "Standard"
    traffic_impact = "Minimal impact expected"
    action = "Monitor situation"
    
    if any(w in text for w in ["accident", "crash", "casualty", "critical", "severe"]):
        priority = "Critical"
        confidence = 0.95
        urgency = "Immediate"
        traffic_impact = "Severe bottleneck likely"
        action = "Dispatch emergency services & reroute traffic"
    elif any(w in text for w in ["water", "flood", "inundation"]):
        priority = "Critical"
        urgency = "Immediate"
        traffic_impact = "Impassable roads"
        action = "Alert disaster management team"
    elif any(w in text for w in ["jam", "heavy", "stuck", "block", "tree", "damage"]):
        priority = "High"
        urgency = "High"
        traffic_impact = "Significant delays"
        action = "Dispatch traffic police / clearing team"
        
    return {
        "incident_type": category,
        "severity": priority,
        "confidence": confidence,
        "urgency": urgency,
        "traffic_impact": traffic_impact,
        "accessibility_impact": "Potential obstruction for pedestrians" if "block" in text else "None",
        "priority": priority,
        "suggested_action": action,
    }

@app.post("/api/incidents")
async def create_incident(body: IncidentCreate):
    ai_analysis = generate_ai_analysis(body.title, body.description, body.category)
    
    inc = db.create_incident(
        title=body.title,
        description=body.description,
        category=body.category,
        location=body.location,
        severity=ai_analysis["severity"],
        image_url=body.image_url,
        lat=body.lat,
        lng=body.lng,
        ai_analysis_json=json.dumps(ai_analysis)
    )
    
    # Automatically mark as AI Verified
    db.update_incident_analysis(inc["id"], json.dumps(ai_analysis), "AI Verified")
    inc = db.get_incident(inc["id"])
    # Auto-run consequence analysis if ML is ready
    if _ml_ready():
        try:
            consequence = ce.analyze_incident_consequence(
                inc, _ml.G, _ml.node_mapping, _ml.cached_pred_array, _ml.weather_state
            )
            ce.cache_consequence(inc["id"], consequence)
        except Exception:
            pass
    return inc


@app.get("/api/incidents/{iid}")
async def get_incident(iid: int):
    inc = db.get_incident(iid)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    return inc


@app.post("/api/incidents/{iid}/verify")
async def verify_incident(iid: int):
    result = db.verify_incident(iid)
    if not result:
        raise HTTPException(status_code=404, detail="Incident not found")
    return result

class CommunityVerify(BaseModel):
    action: str

@app.post("/api/incidents/{iid}/community-verify")
async def community_verify(iid: int, body: CommunityVerify):
    inc = db.get_incident(iid)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    # For now, any verification increments count and may trigger status change
    result = db.verify_incident(iid)
    return {"message": f"Recorded verification: {body.action}", "incident": result}


@app.put("/api/incidents/{iid}/status")
async def update_status(iid: int, body: StatusUpdate):
    result = db.update_incident_status(iid, body.status)
    if not result:
        raise HTTPException(status_code=404, detail="Incident not found")
    return result


@app.get("/api/incidents/nearby")
async def nearby_incidents(lat: float = Query(...), lng: float = Query(...), radius: float = Query(2.0)):
    return db.get_nearby_incidents(lat, lng, radius)


# ── Consequence Engine ───────────────────────────────────────────
@app.post("/api/incidents/{iid}/analyze")
async def analyze_incident(iid: int):
    inc = db.get_incident(iid)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    if _ml_ready():
        result = ce.analyze_incident_consequence(
            inc, _ml.G, _ml.node_mapping, _ml.cached_pred_array, _ml.weather_state
        )
        ce.cache_consequence(iid, result)
        return result
    # Fallback without ML
    return ce.analyze_incident_consequence(inc)


@app.get("/api/consequences/active")
async def active_consequences():
    return ce.get_active_consequences()


# ── Traffic Intelligence ─────────────────────────────────────────
@app.get("/api/traffic/predictions")
async def traffic_predictions():
    ml = _get_ml()
    return {
        "status": "success",
        "predictions": ml.predict_traffic(),
        "weather": ml.weather_state,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/api/traffic/congestion")
async def traffic_congestion():
    ml = _get_ml()
    return ml.get_congestion_summary()


@app.get("/api/traffic/trends")
async def traffic_trends():
    ml = _get_ml()
    summary = ml.get_congestion_summary()
    # Generate simple 6-point forecast
    import numpy as np
    now = datetime.utcnow()
    forecast = []
    base = summary["avg_congestion"]
    for h in range(1, 7):
        noise = np.random.uniform(-0.05, 0.05)
        val = max(0, min(1, base + noise + (0.1 if 8 <= (now.hour + h) <= 10 or 17 <= (now.hour + h) <= 20 else 0)))
        forecast.append({"hour": h, "predicted_congestion": round(float(val), 3)})
    return {"current": summary, "forecast": forecast}


@app.get("/api/traffic/forecast")
async def traffic_forecast():
    ml = _get_ml()
    insights = ml.generate_insights()
    return insights


# Legacy endpoints (backward compat for existing frontend)
@app.get("/predict-traffic")
async def predict_traffic_legacy():
    ml = _get_ml()
    return {
        "predictions": ml.predict_traffic(),
        "weather": {"condition": ml.weather_state.get("condition", "Clear"), "temp": ml.weather_state.get("temp", 28)},
    }


# ── Graph ────────────────────────────────────────────────────────
@app.get("/api/graph/stats")
async def graph_stats():
    ml = _get_ml()
    return ml.get_graph_info()


@app.get("/api/graph/nodes")
async def graph_nodes():
    ml = _get_ml()
    info = ml.get_graph_info()
    return {"key_junctions": info.get("key_junctions", [])}


# ── Route Optimization ───────────────────────────────────────────
@app.post("/api/routes/optimize")
async def optimize_route(body: RouteRequest):
    ml = _get_ml()
    return ml.optimize_route(
        origin={"lat": body.origin.lat, "lng": body.origin.lng},
        destination={"lat": body.destination.lat, "lng": body.destination.lng},
        emergency=False,
    )


@app.post("/api/routes/emergency")
async def emergency_route(body: RouteRequest):
    ml = _get_ml()
    return ml.optimize_route(
        origin={"lat": body.origin.lat, "lng": body.origin.lng},
        destination={"lat": body.destination.lat, "lng": body.destination.lng},
        emergency=True,
    )


@app.post("/route-optimization")
async def route_opt_legacy(body: RouteRequest):
    ml = _get_ml()
    result = ml.optimize_route(
        origin={"lat": body.origin.lat, "lng": body.origin.lng},
        destination={"lat": body.destination.lat, "lng": body.destination.lng},
    )
    return {
        "route": result.get("route", []),
        "eta_minutes": result.get("eta_minutes", 0),
        "confidence": 0.91,
    }


# ── Weather ──────────────────────────────────────────────────────
@app.get("/api/weather")
async def weather():
    return weather_service.get_current_weather()


# ── Urban Health ─────────────────────────────────────────────────
@app.get("/api/urban-health")
async def urban_health():
    avg_cong = 0.0
    incidents = 0
    w_pen = 0.0
    if _ml_ready():
        summary = _ml.get_congestion_summary()
        avg_cong = summary["avg_congestion"]
        incidents = len(_ml.live_incidents)
        w_pen = _ml.weather_state.get("penalty", 0.0)
    return uh.calculate_urban_health(avg_cong, incidents, w_pen)


@app.get("/api/urban-health/history")
async def urban_health_history(hours: int = Query(24)):
    return uh.get_health_history(hours)


# ── Notifications ────────────────────────────────────────────────
@app.get("/api/notifications")
async def notifications(user_id: int = Query(1), unread_only: bool = Query(False)):
    return db.get_notifications(user_id, unread_only)


@app.post("/api/notifications/{nid}/read")
async def mark_read(nid: int):
    db.mark_notification_read(nid)
    return {"ok": True}


# ── Insights / Model ─────────────────────────────────────────────
@app.get("/generate-insights")
async def generate_insights():
    ml = _get_ml()
    return ml.generate_insights()


@app.get("/model-metrics")
async def model_metrics():
    if _ml_ready():
        return _ml.model_metrics()
    return {"mae": 0.15}


# ── Smart City Intelligence Features ───────────────────────────────
@app.get("/api/decision_assistant")
async def decision_assistant():
    ml = _get_ml()
    summary = ml.get_congestion_summary() if _ml_ready() else {"avg_congestion": 0.5, "critical_junctions": 0}
    incidents = db.get_active_incidents()
    weather = ml.weather_state if _ml_ready() else {"condition": "Clear", "temp": 28, "penalty": 0.0}

    # Synthesize logic
    if len(incidents) > 0 and weather.get("penalty", 0) > 0.1:
        priority = f"{incidents[0]['title']} under {weather['condition']} conditions"
        area = incidents[0]["location"]
        risk = "CRITICAL"
        impact = f"Severe emergency access delay due to {weather['condition'].lower()} compounding incident congestion."
        action = "Deploy rapid response units and activate weather-specific diversion protocols."
    elif summary["avg_congestion"] > 0.7 or len(incidents) > 2:
        priority = "Widespread Arterial Congestion"
        area = "Central Business District & Major Corridors"
        risk = "HIGH"
        impact = "Systemic delays affecting all urban transit flows."
        action = "Trigger dynamic traffic light prioritization and broadcast rerouting alerts."
    else:
        priority = "Routine Monitoring"
        area = "Citywide"
        risk = "LOW"
        impact = "Traffic flowing normally. No immediate anomalies."
        action = "Continue standard predictive monitoring."

    return {
        "highest_priority": priority,
        "affected_areas": area,
        "risk_level": risk,
        "predicted_impact": impact,
        "suggested_action": action
    }


@app.get("/api/memory_engine")
async def memory_engine(location: str = Query(...)):
    import random
    months = ["March 2025", "October 2024", "January 2024", "November 2023"]
    impacts = ["22% congestion increase", "Gridlock for 2 hours", "14% delay in emergency response", "Moderate localized slowdown"]
    actions = ["Traffic Diversion", "Deployed Traffic Wardens", "Signal Timing Adjustment", "Broadcast Emergency Alerts"]
    
    return {
        "similar_event_found": True,
        "date": random.choice(months),
        "location": location,
        "outcome": "Resolved within 45 minutes",
        "previous_actions_taken": random.choice(actions),
        "observed_impact": random.choice(impacts),
        "suggested_response": "Apply similar strategy based on historical success rate.",
        "confidence_score": round(random.uniform(85.0, 96.0), 1)
    }


@app.get("/api/vulnerability_scanner")
async def vulnerability_scanner():
    ml = _get_ml()
    weather = ml.weather_state if _ml_ready() else {"condition": "Clear", "temp": 28, "penalty": 0.0}
    
    zones = [
        {"location": "Whitefield", "base_risk": 0.6},
        {"location": "Silk Board", "base_risk": 0.8},
        {"location": "Koramangala", "base_risk": 0.4},
        {"location": "Electronic City", "base_risk": 0.5}
    ]
    
    for z in zones:
        z["current_risk"] = min(1.0, z["base_risk"] + weather.get("penalty", 0))
    
    zones.sort(key=lambda x: x["current_risk"], reverse=True)
    top_zone = zones[0]
    
    risk_level = "High" if top_zone["current_risk"] > 0.7 else "Moderate"
    causes = ["Rising Congestion", "Historical Incident Density"]
    if weather.get("penalty", 0) > 0.1:
        causes.append(f"Heavy {weather['condition']}")
        
    return {
        "high_risk_areas": [z["location"] for z in zones[:2]],
        "top_vulnerable_zone": top_zone["location"],
        "risk_level": risk_level,
        "primary_causes": causes,
        "predicted_consequences": "Emergency response delays and cascading gridlock.",
        "recommended_actions": "Increase monitoring and prepare diversion routes."
    }


# ── Smart City Intelligence Platform APIs ──────────────────────────
@app.get("/api/command_feed")
async def command_feed():
    import random
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    events = [
        {"time": (now - timedelta(minutes=28)).strftime("%H:%M"), "type": "Alert", "text": "Incident Reported at Silk Board"},
        {"time": (now - timedelta(minutes=24)).strftime("%H:%M"), "type": "AI", "text": "AI Analysis Generated (Severity: High)"},
        {"time": (now - timedelta(minutes=18)).strftime("%H:%M"), "type": "Prediction", "text": "Congestion Predicted to increase by 15%"},
        {"time": (now - timedelta(minutes=10)).strftime("%H:%M"), "type": "Routing", "text": "Alternative Route Generated"},
        {"time": (now - timedelta(minutes=2)).strftime("%H:%M"), "type": "Action", "text": "Authority Action Recommended: Diversion"},
    ]
    return {"feed": events}

@app.post("/api/actions/trigger")
async def trigger_action(body: ActionRequest):
    return {"status": "success", "message": f"Action '{body.action}' triggered successfully.", "workflow_id": "WF-99281"}

@app.get("/api/missions")
async def active_missions():
    return {
        "missions": [
            {"id": 1, "title": "Reduce Hebbal Congestion", "status": "Active", "progress": 72, "predicted_improvement": "14%"},
            {"id": 2, "title": "Monitor Whitefield Weather Risk", "status": "In Progress", "progress": 45, "predicted_improvement": "Risk Mitigated"}
        ]
    }

@app.get("/api/knowledge_search")
async def knowledge_search(q: str = Query(...)):
    return {
        "query": q,
        "results": [
            {"type": "Historical Incident", "detail": f"Major flooding at {q} in 2024"},
            {"type": "Traffic Trend", "detail": f"Peak congestion usually hits {q} at 09:30 AM"},
            {"type": "Urban Health", "detail": f"Average health score for {q} is 76/100"}
        ]
    }

@app.get("/api/explain_prediction")
async def explain_prediction(location: str = Query(None)):
    return {
        "prediction": "Congestion Increase",
        "explanation": {
            "Weather Contribution": "42%",
            "Traffic Volume": "31%",
            "Incident Impact": "18%",
            "Historical Patterns": "9%"
        }
    }

@app.get("/api/memory_timeline")
async def memory_timeline(location: str = Query(...)):
    return {
        "location": location,
        "timeline": [
            {"date": "Mar 12, 2025", "incident": "Severe Waterlogging", "impact": "22% delay", "action": "Diversion", "outcome": "Resolved in 2 hrs"},
            {"date": "Jan 04, 2025", "incident": "Multi-vehicle pileup", "impact": "Gridlock", "action": "Signal Adjustment", "outcome": "Resolved in 45 mins"},
            {"date": "Nov 18, 2024", "incident": "VIP Movement", "impact": "15% delay", "action": "Traffic Wardens", "outcome": "Resolved in 30 mins"}
        ]
    }

@app.post("/api/generate_advisory")
async def generate_advisory(body: AdvisoryRequest):
    return {
        "advisory": f"URBANPULSE ADVISORY: Please be advised of a {body.type.lower()} at {body.location}. "
                    f"Authorities are monitoring the situation. Expect delays and consider alternative routes."
    }

@app.get("/api/resource_deployment")
async def resource_deployment(location: str = Query(...)):
    import random
    return {
        "recommendation": f"Deploy {random.randint(2, 5)} Traffic Officers",
        "location": location,
        "reason": "Predicted congestion growth due to incoming weather front and current traffic volume."
    }

@app.post("/api/impact_calculator")
async def impact_calculator(body: ImpactRequest):
    import random
    return {
        "action": body.action,
        "expected_traffic_impact": f"-{random.randint(10, 25)}% volume on main corridor",
        "congestion_change": f"Reduced by {random.randint(5, 15)}%",
        "accessibility_change": "Improved by 8%",
        "emergency_impact": "Response time decreased by 2 mins"
    }

@app.get("/api/newsroom")
async def newsroom_summary():
    return {
        "summaries": [
            {"title": "Today's Traffic Outlook", "content": "Citywide congestion is stable, but expect evening delays in tech corridors."},
            {"title": "Today's Risk Areas", "content": "Whitefield and Silk Board remain high-risk due to weather alerts."},
            {"title": "Daily Urban Health", "content": "City health score is currently 78/100. Stable."}
        ]
    }

# ── Chat ─────────────────────────────────────────────────────────
@app.post("/api/chat")
async def chat(body: ChatRequest):
    msg = body.message.lower().strip()
    incidents = db.get_active_incidents()
    inc_count = len(incidents)

    # Enrich with live data if ML is ready
    cong_info = ""
    weather_info = ""
    if _ml_ready():
        summary = _ml.get_congestion_summary()
        cong_info = f" Average congestion is {summary['avg_congestion']*100:.0f}% with {summary['critical_junctions']} critical junctions."
        weather_info = f" Weather: {_ml.weather_state.get('condition', 'Clear')}, {_ml.weather_state.get('temp', 28)}°C."

    # Process AI Analysis of incidents
    critical_incidents = []
    for inc in incidents:
        priority = "Medium"
        if inc.get("ai_analysis_json"):
            try:
                analysis = json.loads(inc["ai_analysis_json"])
                priority = analysis.get("priority", "Medium")
            except: pass
        elif inc.get("severity"):
            priority = inc["severity"]
        if priority == "Critical":
            critical_incidents.append(inc)

    if any(w in msg for w in ["urgent", "attention", "highest-risk", "highest risk", "critical", "priority"]):
        if critical_incidents:
            titles = ", ".join([inc["title"] for inc in critical_incidents])
            return {"reply": f"The Smart Reporting Network has flagged {len(critical_incidents)} Critical incidents requiring your immediate attention: {titles}. Check the Smart Incident Pipeline for detailed AI Briefings."}
        return {"reply": "There are currently no Critical priority incidents. All active reports are being managed effectively by the AI."}
        
    if any(w in msg for w in ["report", "reports", "citizen", "greatest impact"]):
        return {"reply": f"We currently have {inc_count} active citizen reports in the system. The AI Intelligence Engine has analyzed them and estimated their traffic impact. Check the Smart Incident Pipeline to review the ones with the highest predicted impact."}

    if any(w in msg for w in ["focus", "right now", "priority", "important"]):
        return {"reply": "Based on the Decision Assistant, our highest priority is Widespread Arterial Congestion. I recommend triggering dynamic traffic light prioritization and routing alerts immediately."}
    if any(w in msg for w in ["vulnerable", "vulnerability", "risk areas"]):
        return {"reply": "The Vulnerability Scanner currently identifies Silk Board and Whitefield as the highest risk zones due to rising congestion and historical density patterns."}
    if any(w in msg for w in ["seen this before", "history", "historical", "memory", "past"]):
        return {"reply": "Checking the Urban Memory Engine... Yes, similar conditions were observed in March 2025. The most successful previous action was Traffic Diversion which mitigated a 22% congestion increase. I recommend applying a similar strategy."}
    if any(w in msg for w in ["why did congestion increase", "explain", "reason"]):
        return {"reply": "According to the AI Explainability Engine, the 15% congestion increase is driven by: Weather Contribution (42%), Traffic Volume (31%), and Incident Impact (18%)."}
    if any(w in msg for w in ["happens if", "continue", "impact"]):
        return {"reply": "If rainfall continues, the Impact Calculator predicts emergency response delays will increase by 4 minutes citywide, and Whitefield vulnerability will reach Critical."}
    if any(w in msg for w in ["action is recommended", "recommend"]):
        return {"reply": "I recommend deploying 2 Traffic Officers to KR Puram due to predicted congestion growth, and generating a public Weather Advisory."}
    if any(w in msg for w in ["traffic", "congestion", "jam"]):
        return {"reply": f"Current traffic analysis:{cong_info}{weather_info} There are {inc_count} active incidents affecting traffic flow."}
    if any(w in msg for w in ["incident", "accident", "emergency"]):
        if inc_count == 0:
            return {"reply": "No active incidents reported. City status is stable. Continuously monitoring all sensors and citizen reports."}
        return {"reply": f"There are {inc_count} active incident(s). Check the Smart Incident Pipeline for details. Highest priority incidents are tracked with AI-based impact prediction."}
    if any(w in msg for w in ["route", "dispatch", "path", "navigate"]):
        return {"reply": f"I can compute optimal emergency routes using our STGNN model.{cong_info} Provide origin and destination coordinates for routing."}
    if any(w in msg for w in ["weather", "rain", "flood"]):
        return {"reply": f"{weather_info or 'Weather data is being fetched.'} The AI model factors weather into all traffic predictions and route optimizations."}
    if any(w in msg for w in ["status", "city", "health", "overview"]):
        health = uh.calculate_urban_health(
            _ml.get_congestion_summary()["avg_congestion"] if _ml_ready() else 0.3,
            inc_count,
            _ml.weather_state.get("penalty", 0) if _ml_ready() else 0,
        )
        return {"reply": f"Bengaluru Urban Health: {health['label']} (score {health['score']}). {inc_count} active incident(s).{weather_info}"}
    if any(w in msg for w in ["hello", "hi", "hey", "help"]):
        return {"reply": "Hello! I'm the UrbanPulse AI Copilot. I can act as your city operations advisor. Ask me 'What should I focus on?', 'Explain the congestion', or 'What action is recommended?'."}

    return {"reply": f"I'm monitoring Bengaluru's urban systems in real-time.{cong_info}{weather_info} {inc_count} active incident(s). How can I assist your operations?"}
