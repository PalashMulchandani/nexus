from agent import run_research_agent, get_all_history
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from datetime import date
import os

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
usage_tracker = {}
DAILY_LIMIT = 5

class ResearchRequest(BaseModel):
    topic: str
    session_id: str
    custom_instruction: str = None

@app.get("/")
def root():
    return {"message": "Nexus API is running"}

@app.post("/research")
def research(request: ResearchRequest):
    if not request.custom_instruction:
        today = str(date.today())
        entry = usage_tracker.get(request.session_id)
        if entry and entry["date"] == today:
            if entry["count"] >= DAILY_LIMIT:
                return {"topic": request.topic, "limit_reached": True}
            entry["count"] += 1
        else:
            usage_tracker[request.session_id] = {"date": today, "count": 1}

    result = run_research_agent(request.topic, request.session_id, request.custom_instruction)
    return {
        "topic": request.topic,
        "result": result
    }

@app.get("/history")
def get_history(session_id: str):
    history = get_all_history(session_id)
    return {"history": history}