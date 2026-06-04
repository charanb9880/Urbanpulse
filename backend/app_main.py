from datetime import datetime, timedelta
import base64
import hashlib
import json
import os
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr

load_dotenv()

app = FastAPI(title="UrbanPulse AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
ACCESS_TOKEN_EXPIRE_MINUTES = 30

users_db = {}
incidents_db = {}
next_user_id = 1
next_incident_id = 1


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "citizen"


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str


class Token(BaseModel):
    access_token: str
    token_type: str


class IncidentCreate(BaseModel):
    title: str
    description: str
    category: str
    location: str
    severity: str = "Medium"
    image_url: Optional[str] = None


class Coordinates(BaseModel):
    lat: float
    lng: float


class RouteOptimizationRequest(BaseModel):
    origin: Coordinates
    destination: Coordinates


class IncidentResponse(BaseModel):
    id: int
    title: str
    description: str
    category: str
    location: str
    severity: str
    status: str = "Reported"
    image_url: Optional[str] = None
    verified: bool = False
    created_at: datetime
    user_id: int


def get_password_hash(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    expires_at = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    payload = {**data, "exp": expires_at.isoformat()}
    encoded = base64.b64encode(json.dumps(payload).encode()).decode()
    return f"dummy.{encoded}.dummy"


def get_user(email: str):
    normalized = email.strip().lower()
    for user in users_db.values():
        if user["email"].lower() == normalized:
            return user
    return None


@app.get("/")
async def root():
    return {"message": "UrbanPulse AI API is running!", "version": "1.0.0"}


@app.get("/api/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


@app.post("/api/auth/signup", response_model=UserResponse)
async def signup(user: UserCreate):
    global next_user_id
    if get_user(user.email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    new_user = {
        "id": next_user_id,
        "name": user.name,
        "email": user.email,
        "hashed_password": get_password_hash(user.password),
        "role": user.role,
        "created_at": datetime.utcnow(),
    }
    users_db[next_user_id] = new_user
    next_user_id += 1
    return UserResponse(id=new_user["id"], name=new_user["name"], email=new_user["email"], role=new_user["role"])


@app.post("/api/auth/login", response_model=Token)
async def login(user_login: UserLogin):
    email = user_login.email.strip().lower()
    password = user_login.password.strip()
    demo_accounts = {
        "citizen@urbanpulse.ai": {"role": "citizen", "password": "citizen123"},
        "officer@urbanpulse.ai": {"role": "officer", "password": "officer123"},
        "analyst@urbanpulse.ai": {"role": "analyst", "password": "analyst123"},
        "admin@urbanpulse.ai": {"role": "admin", "password": "admin123"},
        "citizen": {"role": "citizen", "password": "citizen123"},
        "officer": {"role": "officer", "password": "officer123"},
        "analyst": {"role": "analyst", "password": "analyst123"},
        "admin": {"role": "admin", "password": "admin123"},
    }

    demo = demo_accounts.get(email)
    if demo and demo["password"] == password:
        token = create_access_token(
            {"sub": email, "role": demo["role"]},
            timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        )
        return Token(access_token=token, token_type="bearer")

    user = get_user(email)
    if not user or user["hashed_password"] != get_password_hash(password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(
        {"sub": user["email"], "role": user["role"]},
        timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return Token(access_token=token, token_type="bearer")


@app.get("/api/incidents")
async def get_incidents():
    return list(incidents_db.values())


@app.post("/api/incidents", response_model=IncidentResponse)
async def create_incident(incident: IncidentCreate):
    global next_incident_id
    new_incident = {
        "id": next_incident_id,
        "title": incident.title,
        "description": incident.description,
        "category": incident.category,
        "location": incident.location,
        "severity": incident.severity,
        "status": "Reported",
        "image_url": incident.image_url,
        "verified": False,
        "created_at": datetime.utcnow(),
        "user_id": 1,
    }
    incidents_db[next_incident_id] = new_incident
    next_incident_id += 1
    return IncidentResponse(**new_incident)


@app.get("/api/incidents/{incident_id}", response_model=IncidentResponse)
async def get_incident(incident_id: int):
    incident = incidents_db.get(incident_id)
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
    return IncidentResponse(**incident)


@app.post("/api/incidents/{incident_id}/analyze")
async def analyze_incident(incident_id: int):
    if incident_id not in incidents_db:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
    return {
        "severity_prediction": "Medium",
        "confidence_score": 0.87,
        "impact_assessment": "Potential traffic disruption in 500m radius",
        "affected_radius": 0.5,
        "priority_level": "P2",
    }


TRAFFIC_NODES = [
    {"id": "silk-board", "name": "Silk Board Junction", "lat": 12.9172, "lng": 77.6228, "congestion": 82, "prediction": "High"},
    {"id": "koramangala-bda", "name": "Koramangala BDA Complex", "lat": 12.9345, "lng": 77.6265, "congestion": 48, "prediction": "Medium"},
    {"id": "forum-mall", "name": "Forum Mall Koramangala", "lat": 12.9343, "lng": 77.6112, "congestion": 61, "prediction": "Medium"},
    {"id": "madiwala", "name": "Madiwala Police Station", "lat": 12.9226, "lng": 77.6174, "congestion": 70, "prediction": "High"},
    {"id": "hsr-sector-1", "name": "HSR Layout Sector 1", "lat": 12.9116, "lng": 77.6389, "congestion": 31, "prediction": "Low"},
    {"id": "st-johns", "name": "St. John's Hospital", "lat": 12.9304, "lng": 77.6214, "congestion": 42, "prediction": "Medium"},
]


@app.get("/predict-traffic")
async def predict_traffic():
    return {
        "predictions": TRAFFIC_NODES,
        "weather": {"condition": "Clear", "temp": 28},
    }


@app.post("/route-optimization")
async def route_optimization(request: RouteOptimizationRequest):
    midpoint = {
        "lat": (request.origin.lat + request.destination.lat) / 2,
        "lng": (request.origin.lng + request.destination.lng) / 2,
    }
    return {
        "route": [
            [request.origin.lat, request.origin.lng],
            [midpoint["lat"], midpoint["lng"]],
            [request.destination.lat, request.destination.lng],
        ],
        "eta_minutes": 14,
        "confidence": 0.91,
    }


@app.get("/generate-insights")
async def generate_insights():
    return {
        "recommendation": "Prioritize Silk Board and Madiwala corridors for active monitoring.",
        "weather": "Clear",
    }


@app.get("/model-metrics")
async def model_metrics():
    return {"mae": 0.1521}
