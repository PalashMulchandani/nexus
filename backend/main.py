from agent import search_web
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

@app.get("/")
def root():
    return {"message": "Nexus API is running"}

from agent import search_web

@app.post("/research")
def research(request: ResearchRequest):
    # Step 1: Search web
    sources = search_web(request.topic)
    
    # Step 2: Build context from sources
    context = "\n\n".join([f"Source: {s['title']}\n{s['content']}" for s in sources])
    
    # Step 3: Gemini summarizes based on real web data
    response = model.generate_content(
        f"Based on these real web sources, give a structured research summary on '{request.topic}':\n\n{context}"
    )
    
    return {
        "topic": request.topic,
        "result": response.text,
        "sources": sources
    }