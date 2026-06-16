from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.tools.tavily_search import TavilySearchResults
from langgraph.prebuilt import create_react_agent
from dotenv import load_dotenv
import os

load_dotenv()

# LLM
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=os.getenv("GEMINI_API_KEY"),
    temperature=0.3
)

# Tools
search_tool = TavilySearchResults(
    max_results=5,
    tavily_api_key=os.getenv("TAVILY_API_KEY")
)
tools = [search_tool]

# Create agent
agent = create_react_agent(llm, tools)

def run_research_agent(topic: str):
    result = agent.invoke({
        "messages": [{"role": "user", "content": f"Research this topic thoroughly and give a detailed structured report: {topic}"}]
    })
    return result["messages"][-1].content