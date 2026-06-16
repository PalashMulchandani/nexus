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

@app.post("/research")
def research(request: ResearchRequest):
    response = model.generate_content(
        f"Give me a structured research summary on: {request.topic}"
    )
    return {"topic": request.topic, "result": response.text}