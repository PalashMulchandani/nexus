from tavily import TavilyClient
from dotenv import load_dotenv
import os

load_dotenv()

tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

def search_web(topic: str):
    results = tavily.search(
        query=topic,
        search_depth="advanced",
        max_results=5
    )
    
    sources = []
    for r in results["results"]:
        sources.append({
            "title": r["title"],
            "url": r["url"],
            "content": r["content"]
        })
    
    return sources