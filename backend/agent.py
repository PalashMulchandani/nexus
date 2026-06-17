import chromadb
from chromadb.utils import embedding_functions
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.tools.tavily_search import TavilySearchResults
from langgraph.prebuilt import create_react_agent
from dotenv import load_dotenv
import os

load_dotenv()
# ChromaDB setup
chroma_client = chromadb.Client()
collection = chroma_client.get_or_create_collection(
    name="nexus_research"
)

def save_to_memory(topic: str, result: str):
    existing = collection.get(ids=[f"research_{topic[:50].replace(' ', '_')}"])
    if not existing["ids"]:
        collection.add(
            documents=[result],
            metadatas=[{"topic": topic}],
            ids=[f"research_{topic[:50].replace(' ', '_')}"]
        )

def search_memory(query: str):
    count = collection.count()
    if count == 0:
        return []
    results = collection.query(
        query_texts=[query],
        n_results=min(3, count)
    )
    if results["documents"][0]:
        return results["documents"][0]
    return []
# LLM
llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash-001",
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

def run_research_agent(topic: str, custom_instruction: str = None):
    # Check cache first (skip if it's a follow-up customization request)
    if not custom_instruction:
        past = search_memory(topic)
        if past:
            return past[0] + "\n\n*(Retrieved from cache — previously researched)*"

    # Build the research prompt
    if custom_instruction:
        prompt = f"Refine this existing research on '{topic}' based on this instruction: {custom_instruction}\n\nOriginal research context: {search_memory(topic)}"
    else:
        prompt = f"Research this topic thoroughly and give a detailed structured report: {topic}"

    result = agent.invoke({
        "messages": [{"role": "user", "content": prompt}]
    })
    
    final = result["messages"][-1].content
    
    # Save to memory only for fresh research, not customizations
    if not custom_instruction:
        save_to_memory(topic, final)
    
    return final
    
    # Save to memory
    save_to_memory(topic, final)
    
    return final