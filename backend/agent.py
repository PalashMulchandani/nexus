import chromadb
from chromadb.utils import embedding_functions
from langchain_groq import ChatGroq
from langchain_community.tools.tavily_search import TavilySearchResults
from langgraph.prebuilt import create_react_agent
from dotenv import load_dotenv
import os

load_dotenv()

# ChromaDB setup
chroma_client = chromadb.PersistentClient(path="./chroma_data")
collection = chroma_client.get_or_create_collection(
    name="nexus_research"
)

def save_to_memory(topic: str, result: str, session_id: str):
    doc_id = f"research_{session_id}_{topic[:50].replace(' ', '_')}"
    existing = collection.get(ids=[doc_id])
    if not existing["ids"]:
        collection.add(
            documents=[result],
            metadatas=[{"topic": topic, "session_id": session_id}],
            ids=[doc_id]
        )

def search_memory(query: str, session_id: str):
    count = collection.count()
    if count == 0:
        return []
    results = collection.query(
        query_texts=[query],
        n_results=min(3, count),
        where={"session_id": session_id}
    )
    if results["documents"][0] and results["distances"][0]:
        # Only trust the match if it's genuinely similar (low distance = high similarity)
        if results["distances"][0][0] < 0.5:
            return results["documents"][0]
    return []

def get_all_history(session_id: str):
    all_data = collection.get(where={"session_id": session_id})
    history = []
    for i, metadata in enumerate(all_data["metadatas"]):
        history.append({
            "topic": metadata.get("topic", "Unknown"),
            "id": all_data["ids"][i],
            "report": all_data["documents"][i]
        })
    return history

# LLM
def get_llm():
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        groq_api_key=os.getenv("GROQ_API_KEY"),
        temperature=0.3
    )

llm = get_llm()

# Tools
search_tool = TavilySearchResults(
    max_results=5,
    tavily_api_key=os.getenv("TAVILY_API_KEY")
)
tools = [search_tool]

# Create agent
agent = create_react_agent(llm, tools)

def run_research_agent(topic: str, session_id: str, custom_instruction: str = None):
    if not custom_instruction:
        past = search_memory(topic, session_id)
        if past:
            return past[0] + "\n\n*(Retrieved from cache — previously researched)*"

    if custom_instruction:
        prompt = f"Refine this existing research on '{topic}' based on this instruction: {custom_instruction}\n\nOriginal research context: {search_memory(topic, session_id)}"
    else:
        prompt = f"""Research this topic thoroughly: {topic}

Write a comprehensive, detailed report with the following structure:
1. A clear title
2. An introduction/overview section (2-3 paragraphs)
3. At least 3-4 main sections with headers, each containing detailed information, examples, and context (3-4 paragraphs each)
4. A conclusion section

Make the report substantial and informative — aim for depth and thoroughness, not brevity. Use markdown formatting with ## for headers."""

    try:
        result = agent.invoke({
            "messages": [{"role": "user", "content": prompt}]
        })
        raw_content = result["messages"][-1].content

        if isinstance(raw_content, list):
            final = " ".join([block.get("text", "") for block in raw_content if isinstance(block, dict)])
        else:
            final = raw_content

        if not custom_instruction:
            save_to_memory(topic, final, session_id)

        return final

    except Exception as e:
        return f"Something went wrong while researching. Error: {str(e)}"