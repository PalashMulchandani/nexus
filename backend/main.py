from agent import run_research_agent, get_all_history
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os
import google.generativeai as genai

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.5-flash")

class ResearchRequest(BaseModel):
    topic: str
    custom_instruction: str = None

@app.get("/")
def root():
    return {"message": "Nexus API is running"}

from agent import run_research_agent

@app.post("/research")
def research(request: ResearchRequest):
    result = run_research_agent(request.topic, request.custom_instruction)
    return {
        "topic": request.topic,
        "result": result
    }
@app.get("/history")
def get_history():
    history = get_all_history()
    return {"history": history}