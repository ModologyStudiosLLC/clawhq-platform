from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(
    title="ClawHQ Platform API",
    description="The command center for your OpenClaw ecosystem",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://clawhqplatform.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Models
class HealthCheck(BaseModel):
    status: str
    version: str
    timestamp: str

class AgentStatus(BaseModel):
    id: str
    name: str
    status: str
    last_heartbeat: str
    cost_today: float
    uptime: str

class CostMetric(BaseModel):
    date: str
    total_cost: float
    agent_costs: dict
    model_breakdown: dict

class SystemAlert(BaseModel):
    id: str
    type: str
    severity: str
    message: str
    timestamp: str
    resolved: bool

# Routes
@app.get("/")
async def root():
    return {
        "message": "Welcome to ClawHQ Platform API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health", response_model=HealthCheck)
async def health_check():
    import datetime
    return HealthCheck(
        status="healthy",
        version="1.0.0",
        timestamp=datetime.datetime.now().isoformat()
    )

@app.get("/api/agents", response_model=List[AgentStatus])
async def get_agents():
    # Mock data for now
    import datetime
    return [
        AgentStatus(
            id="agent-001",
            name="Paperclip",
            status="running",
            last_heartbeat=datetime.datetime.now().isoformat(),
            cost_today=12.50,
            uptime="5d 3h 12m"
        ),
        AgentStatus(
            id="agent-002",
            name="Nerve",
            status="idle",
            last_heartbeat=datetime.datetime.now().isoformat(),
            cost_today=8.75,
            uptime="2d 18h 45m"
        ),
        AgentStatus(
            id="agent-003",
            name="OpenFang Bridge",
            status="running",
            last_heartbeat=datetime.datetime.now().isoformat(),
            cost_today=15.20,
            uptime="7d 2h 30m"
        )
    ]

@app.get("/api/costs", response_model=CostMetric)
async def get_costs():
    import datetime
    return CostMetric(
        date=datetime.datetime.now().date().isoformat(),
        total_cost=36.45,
        agent_costs={
            "Paperclip": 12.50,
            "Nerve": 8.75,
            "OpenFang Bridge": 15.20
        },
        model_breakdown={
            "deepseek/deepseek-chat": 24.30,
            "zai/glm-5": 8.15,
            "openrouter/healer-alpha": 4.00
        }
    )

@app.get("/api/alerts", response_model=List[SystemAlert])
async def get_alerts():
    import datetime
    return [
        SystemAlert(
            id="alert-001",
            type="budget",
            severity="warning",
            message="Daily budget threshold (80%) reached",
            timestamp=datetime.datetime.now().isoformat(),
            resolved=False
        ),
        SystemAlert(
            id="alert-002",
            type="agent",
            severity="info",
            message="Agent 'Paperclip' restarted successfully",
            timestamp=datetime.datetime.now().isoformat(),
            resolved=True
        )
    ]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)