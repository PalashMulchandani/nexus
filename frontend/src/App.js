import jsPDF from 'jspdf';
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';

function getSmoothPath(points) {
  if (points.length < 2) return '';
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    path += ` Q ${points[i].x} ${points[i].y} ${xc} ${yc}`;
  }
  return path;
}

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [trail, setTrail] = useState([]);
  const [followUp, setFollowUp] = useState('');
  const [followUpLoading, setFollowUpLoading] = useState(false);
  useEffect(() => {
    let id = 0;
    const moveCursor = (e) => {
      id++;
      setTrail((prev) => [...prev, { x: e.clientX, y: e.clientY, id }].slice(-15));
    };
    window.addEventListener('mousemove', moveCursor);

    const fadeInterval = setInterval(() => {
      setTrail((prev) => prev.slice(1));
    }, 50);

    return () => {
      window.removeEventListener('mousemove', moveCursor);
      clearInterval(fadeInterval);
    };
  }, []);
  useEffect(() => {
    fetch('http://127.0.0.1:8000/history')
      .then((res) => res.json())
      .then((data) => {
        const formattedHistory = data.history.map((item) => ({
          topic: item.topic,
          time: '',
          date: 'Previously researched',
          report: item.report
        }));
        setHistory(formattedHistory);
      })
      .catch((err) => console.log('Could not load history:', err));
  }, []);

  const handleResearch = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setResult('');

    try {
      const response = await fetch('http://127.0.0.1:8000/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });
      const data = await response.json();
      console.log('API Response:', data);
      setResult(data.result);
      setHistory((prev) => [{ topic, time: new Date().toLocaleTimeString(), date: 'Today' }, ...prev].slice(0, 12));
    } catch (error) {
      setResult('Something went wrong. Make sure the backend is running.');
    }
    setLoading(false);
  };
  const handleFollowUp = async () => {
    if (!followUp.trim()) return;
    setFollowUpLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, custom_instruction: followUp }),
      });
      const data = await response.json();
      setResult(data.result);
      setFollowUp('');
    } catch (error) {
      alert('Something went wrong with the follow-up request.');
    }
    setFollowUpLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const maxWidth = pageWidth - margin * 2;
    const lineHeight = 7;
    let y = 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(`Research Report: ${topic}`, margin, y);
    y += 15;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    const cleanText = result.replace(/[#*]/g, '');
    const lines = doc.splitTextToSize(cleanText, maxWidth);

    lines.forEach((line) => {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    });

    doc.save(`nexus-research-${topic.replace(/\s+/g, '-')}.pdf`);
  };

  const groupedHistory = history.reduce((acc, item) => {
    if (!acc[item.date]) acc[item.date] = [];
    acc[item.date].push(item);
    return acc;
  }, {});

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen relative bg-white dark:bg-[#05050a] text-gray-900 dark:text-white transition-colors duration-300 overflow-x-hidden flex flex-col cursor-default">

        {/* Cursor glow trail */}
        <svg className="hidden md:block pointer-events-none fixed inset-0 z-50 w-full h-full">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {trail.length > 1 && (
            <path
              d={getSmoothPath(trail)}
              fill="none"
              stroke="#a855f7"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
              opacity="0.9"
            />
          )}
        </svg>

        {/* Ambient gradient blobs */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/3 -right-32 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        {/* Navbar */}
        <nav className="relative z-20 flex justify-between items-center px-6 md:px-8 py-5 border-b border-gray-200/50 dark:border-white/5 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:flex w-8 h-8 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition text-gray-400"
              title="Toggle sidebar"
            >
              ☰
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center font-display font-bold text-white shadow-lg shadow-primary-500/30">
                N
              </div>
              <span className="font-display font-bold text-xl">Nexus</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-500 dark:text-gray-400">
            <a href="#how-it-works" className="hover:text-gray-900 dark:hover:text-white transition">How it works</a>
            <a href="#about" className="hover:text-gray-900 dark:hover:text-white transition">About</a>
            <a href="#contact" className="hover:text-gray-900 dark:hover:text-white transition">Contact</a>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="px-4 py-2 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm font-medium hover:bg-gray-200 dark:hover:bg-white/10 transition"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10"
            >
              ☰
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden relative z-20 border-b border-gray-200/50 dark:border-white/5 overflow-hidden"
            >
              <div className="flex flex-col px-6 py-4 gap-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How it works</a>
                <a href="#about" onClick={() => setMobileMenuOpen(false)}>About</a>
                <a href="#contact" onClick={() => setMobileMenuOpen(false)}>Contact</a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative z-10 flex flex-1 max-w-7xl mx-auto w-full">

          {/* Sidebar */}
          <AnimatePresence>
            {sidebarOpen && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 256, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="hidden lg:block overflow-hidden border-r border-gray-200/50 dark:border-white/5"
              >
                <div className="w-64 px-4 py-8">
                  {Object.keys(groupedHistory).length === 0 ? (
                    <>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4 px-2">
                        Recent Research
                      </h3>
                      <p className="text-sm text-gray-400 dark:text-gray-600 px-2">
                        Your research history will appear here.
                      </p>
                    </>
                  ) : (
                    Object.entries(groupedHistory).map(([date, items]) => (
                      <div key={date} className="mb-6">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 px-2">
                          {date}
                        </h3>
                        <div className="space-y-1">
                          {items.map((item, i) => (
                            <button
  key={i}
  onClick={() => {
    setTopic(item.topic);
    if (item.report) {
      setResult(item.report);
    }
  }}
  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition group"
>
                              <p className="text-sm font-medium truncate group-hover:text-primary-500 transition">
                                {item.topic}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-600">{item.time}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Main content */}
          <main className="flex-1 px-6 py-16">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl mx-auto text-center mb-10"
            >
              <span className="inline-block px-3 py-1 rounded-full bg-primary-500/10 text-primary-500 text-xs font-semibold mb-5 border border-primary-500/20">
                AUTONOMOUS RESEARCH AGENT
              </span>
              <h1 className="font-display text-4xl md:text-5xl font-bold mb-4 leading-tight">
                Your personal<br />
                <span className="bg-gradient-to-r from-primary-500 via-accent-500 to-primary-600 bg-clip-text text-transparent">
                  research analyst.
                </span>
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                Give Nexus a topic. It plans, searches the live web, and delivers a structured report — no manual digging required.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-3 mb-3"
            >
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleResearch()}
                placeholder="Enter a topic to research..."
                className="flex-1 px-5 py-4 rounded-xl bg-gray-100/80 dark:bg-white/5 backdrop-blur-sm border border-gray-200 dark:border-white/10 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition placeholder:text-gray-400"
              />
              <button
                onClick={handleResearch}
                disabled={loading}
                className="px-6 py-4 rounded-xl bg-gradient-to-r from-primary-500 to-accent-600 text-white font-semibold hover:shadow-lg hover:shadow-primary-500/30 hover:-translate-y-0.5 transition disabled:opacity-50 disabled:translate-y-0 whitespace-nowrap"
              >
                {loading ? 'Researching...' : 'Research'}
              </button>
            </motion.div>

            <p className="text-center text-xs text-gray-400 dark:text-gray-600 mb-12">
              Nexus can make mistakes. Verify important facts independently.
            </p>

            {!result && !loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4"
              >
                {[
                  { icon: '🔍', title: 'Live Web Search', desc: 'Real-time data, not stale training info' },
                  { icon: '🧠', title: 'Autonomous Agent', desc: 'Plans, searches, and reflects on its own' },
                  { icon: '💾', title: 'Remembers Context', desc: 'Builds on your past research sessions' },
                ].map((f, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="p-5 rounded-xl bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 text-center cursor-default"
                  >
                    <div className="text-2xl mb-2">{f.icon}</div>
                    <p className="font-semibold text-sm mb-1">{f.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{f.desc}</p>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {!result && !loading && (
              <motion.section
                id="how-it-works"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="max-w-3xl mx-auto mt-24 mb-16"
              >
                <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-2">How Nexus works</h2>
                <p className="text-center text-gray-500 dark:text-gray-400 mb-12">Four steps, fully autonomous</p>
                <div className="space-y-6">
                  {[
                    { step: '01', title: 'You give a topic', desc: 'Type anything you want researched — broad or specific.' },
                    { step: '02', title: 'Agent plans its search', desc: 'Nexus decides what queries will find the most relevant information.' },
                    { step: '03', title: 'Searches the live web', desc: 'Pulls real, current sources — not outdated training data.' },
                    { step: '04', title: 'Builds your report', desc: 'Reads, reflects, and writes a structured summary you can refine further.' },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: i * 0.1 }}
                      className="flex gap-5 items-start p-5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.02] transition"
                    >
                      <span className="font-display text-2xl font-bold text-primary-500/40 flex-shrink-0 w-12">{item.step}</span>
                      <div>
                        <h3 className="font-semibold mb-1">{item.title}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            )}

            {!result && !loading && (
              <motion.section
                id="about"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="max-w-2xl mx-auto mb-20 text-center p-8 rounded-2xl bg-gradient-to-br from-primary-500/10 to-accent-500/10 border border-primary-500/20"
              >
                <h2 className="font-display text-2xl font-bold mb-3">Why Nexus is different</h2>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                  Most AI tools just answer from memory. Nexus reasons, searches, and verifies — like a real research assistant. Built with LangGraph for autonomous decision-making and ChromaDB for persistent memory across sessions.
                </p>
              </motion.section>
            )}

            <AnimatePresence>
              {(loading || result) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="max-w-2xl mx-auto"
                >
                  <div className="rounded-2xl bg-gray-50/80 dark:bg-white/[0.03] backdrop-blur-sm border border-gray-200 dark:border-white/10 p-8 shadow-xl shadow-black/5">
                    {loading ? (
                      <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                        <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                        Agent is searching the web and analyzing sources...
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-xs text-gray-400 dark:text-gray-500">Generated just now</span>
                          <div className="flex gap-2">
                            <button
                              onClick={handleCopy}
                              className="text-xs font-medium px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition"
                            >
                              {copied ? '✓ Copied' : 'Copy'}
                            </button>
                            <button
  onClick={handleExportPDF}
  className="text-xs font-medium px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition"
>
  Export PDF
</button>
                          </div>
                        </div>
                        <div className="prose prose-gray dark:prose-invert max-w-none prose-headings:font-display">
                          <ReactMarkdown>{result}</ReactMarkdown>
                        </div>
                        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10 flex gap-2">
  <input
    type="text"
    value={followUp}
    onChange={(e) => setFollowUp(e.target.value)}
    onKeyDown={(e) => e.key === 'Enter' && handleFollowUp()}
    placeholder="Ask a follow-up or request changes..."
    disabled={followUpLoading}
    className="flex-1 px-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:border-primary-500 transition disabled:opacity-50"
  />
  <button
    onClick={handleFollowUp}
    disabled={followUpLoading}
    className="px-4 py-3 rounded-xl bg-primary-500/10 text-primary-500 text-sm font-medium hover:bg-primary-500/20 transition disabled:opacity-50"
  >
    {followUpLoading ? '...' : 'Send'}
  </button>
</div>
                        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-4">
                          Nexus can make mistakes. Verify important facts independently.
                        </p>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>

        <footer id="contact" className="relative z-10 border-t border-gray-200/50 dark:border-white/5 mt-auto">
          <div className="max-w-7xl mx-auto px-6 md:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center font-display font-bold text-white text-sm">
                  N
                </div>
                <span className="font-display font-bold text-lg">Nexus</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                An autonomous AI research agent that searches the live web, reasons through sources, and builds structured reports.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <li><a href="#how-it-works" className="hover:text-gray-900 dark:hover:text-white transition">How it works</a></li>
                <li><a href="#about" className="hover:text-gray-900 dark:hover:text-white transition">About</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Connect</h4>
              <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <li><a href="https://github.com/PalashMulchandani" target="_blank" rel="noreferrer" className="hover:text-gray-900 dark:hover:text-white transition">GitHub</a></li>
                <li><a href="https://www.linkedin.com/in/palash-mulchandani-29a326378/" target="_blank" rel="noreferrer" className="hover:text-gray-900 dark:hover:text-white transition">LinkedIn</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200/50 dark:border-white/5 py-6 text-center text-gray-400 dark:text-gray-500 text-sm">
            © 2026 Nexus · Built by Palash Mulchandani
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;