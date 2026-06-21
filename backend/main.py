from agent import run_research_agent, get_all_history
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ResearchRequest(BaseModel):
    topic: str
    session_id: str
    custom_instruction: str = None

@app.get("/")
def root():
    return {"message": "Nexus API is running"}

@app.post("/research")
def research(request: ResearchRequest):
    result = run_research_agent(request.topic, request.session_id, request.custom_instruction)
    return {
        "topic": request.topic,
        "result": result
    }

@app.get("/history")
def get_history(session_id: str):
    history = get_all_history(session_id)
    return {"history": history}