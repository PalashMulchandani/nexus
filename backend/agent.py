import chromadb
from chromadb.utils import embedding_functions
from langchain_google_genai import ChatGoogleGenerativeAI
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
    if results["documents"][0] and results["distances"][0]:
        # Only trust the match if it's genuinely similar (low distance = high similarity)
        if results["distances"][0][0] < 0.5:
            return results["documents"][0]
    return []
def get_all_history():
    count = collection.count()
    if count == 0:
        return []
    
    all_data = collection.get()
    history = []
    for i, metadata in enumerate(all_data["metadatas"]):
        history.append({
            "topic": metadata.get("topic", "Unknown"),
            "id": all_data["ids"][i],
            "report": all_data["documents"][i]
        })
    return history
# LLM
import random

GEMINI_KEYS = [
    os.getenv("GEMINI_API_KEY"),
    os.getenv("GEMINI_API_KEY_2"),
]
GEMINI_KEYS = [k for k in GEMINI_KEYS if k]  # remove empty ones

current_key_index = 0

def get_llm():
    global current_key_index
    key = GEMINI_KEYS[current_key_index]
    return ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=key,
        temperature=0.3
    )

def rotate_key():
    global current_key_index
    current_key_index = (current_key_index + 1) % len(GEMINI_KEYS)

llm = get_llm()

# Tools
search_tool = TavilySearchResults(
    max_results=5,
    tavily_api_key=os.getenv("TAVILY_API_KEY")
)
tools = [search_tool]

# Create agent
agent = create_react_agent(llm, tools)

def run_research_agent(topic: str, custom_instruction: str = None):
    global agent, llm

    if not custom_instruction:
        past = search_memory(topic)
        if past:
            return past[0] + "\n\n*(Retrieved from cache — previously researched)*"

    if custom_instruction:
        prompt = f"Refine this existing research on '{topic}' based on this instruction: {custom_instruction}\n\nOriginal research context: {search_memory(topic)}"
    else:
        prompt = f"Research this topic thoroughly and give a detailed structured report: {topic}"

    max_retries = len(GEMINI_KEYS)
    last_error = None

    for attempt in range(max_retries):
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
                save_to_memory(topic, final)

            return final

        except Exception as e:
            last_error = e
            error_str = str(e).lower()
            if "quota" in error_str or "429" in error_str:
                print(f"Key {current_key_index} hit quota limit. Rotating to next key...")
                rotate_key()
                llm = get_llm()
                agent = create_react_agent(llm, tools)
            else:
                raise e

    return f"All API keys exhausted for today. Please try again tomorrow. Error: {str(last_error)}"