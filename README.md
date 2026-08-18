# Nexus — Autonomous AI Research Agent

Nexus is an AI-powered research assistant that autonomously searches the live web, reasons through multiple sources, and generates structured research reports — all without manual digging.

Unlike typical "ChatGPT wrapper" projects, Nexus uses an agentic architecture (LangGraph + ReAct pattern) to plan its own search strategy, retrieve real-time information, and refine its findings based on user feedback.

---

## Live Demo

🔗 nexus-chi-dun-88.vercel.app

---

## Features

- **Autonomous Research Agent** — Plans its own search queries, reads results, and decides whether more research is needed before finalizing a report
- **Live Web Search** — Powered by Tavily, pulling real-time information instead of relying on stale training data
- **Persistent Memory** — Uses ChromaDB to cache past research, enabling instant retrieval for repeated topics
- **Follow-up Customization** — Users can refine generated reports with natural language instructions (e.g. "make it shorter," "focus on India")
- **PDF Export** — Download any research report as a formatted PDF
- **Session-based History** — Each visitor gets their own private research history
- **Polished UI** — Dark/light mode, smooth animations, responsive design

---

## Tech Stack

**Frontend**
- React
- Tailwind CSS
- Framer Motion (animations)
- jsPDF (PDF export)

**Backend**
- FastAPI (Python)
- LangGraph (agent orchestration)
- Groq API (LLM — Llama 3.3 70B)
- Tavily API (web search)
- ChromaDB (vector memory & caching)

---

## How It Works

1. **User submits a topic** through the frontend
2. **Agent plans its approach** — decides what to search for
3. **Tavily searches the live web** for relevant, current sources
4. **Agent reads and reasons** over the results, deciding if more searches are needed
5. **A structured report is generated** and cached in ChromaDB
6. **User can refine the report** with follow-up instructions or export it as a PDF
User Input → Agent Planning → Web Search → Reasoning Loop → Structured Report → Cache

---

## Project Structure
nexus/

├── backend/

│   ├── main.py          # FastAPI server & API endpoints

│   ├── agent.py         # LangGraph agent, memory, and research logic

│   ├── requirements.txt

│   └── .env             # API keys (not committed)

└── frontend/

└── src/

└── App.js       # Main React application

---

## Running Locally

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm start
```

### Environment Variables

Create a `.env` file inside `backend/` with:
GROQ_API_KEY=your_groq_api_key

TAVILY_API_KEY=your_tavily_api_key

---

## Why Nexus Is Different

Most student AI projects are simple wrappers — send a prompt, get a response. Nexus instead implements a genuine **agentic loop**: the system reasons about what it doesn't know, searches for it, evaluates the results, and only then produces output. This mirrors how production AI agents are built in the industry, rather than a single API call dressed up with a UI.

---

## Author

Built by **Palash Mulchandani**

- GitHub: [PalashMulchandani](https://github.com/PalashMulchandani)
- LinkedIn: [palash-mulchandani](https://www.linkedin.com/in/palash-mulchandani-29a326378/)

---

## License

MIT License — feel free to use and learn from this project.
