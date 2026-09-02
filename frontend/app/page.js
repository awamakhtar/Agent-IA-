"use client";

import { useState, useRef, useEffect, useMemo } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/chat.php";
const STORAGE_KEY = "africa-shopping-agent-conversations";

const QUICK_ACTIONS = [
  { label: "📢 Campagne uniformes scolaires", prompt: "Prépare une campagne pour les uniformes scolaires." },
  { label: "🎓 Idées Reels toges", prompt: "Donne-moi 10 idées de Reels pour promouvoir les toges de graduation." },
  { label: "🏥 Campagne uniformes médicaux", prompt: "Prépare une campagne pour cibler les cliniques avec nos uniformes médicaux." },
  { label: "📅 Calendrier éditorial", prompt: "Fais-moi un calendrier de contenu pour les deux prochaines semaines." },
];

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ts) {
  const d = new Date(ts);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return "Aujourd'hui";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function makeId() {
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function makeTitle(firstMessage) {
  const clean = firstMessage.trim().replace(/\s+/g, " ");
  return clean.length > 42 ? clean.slice(0, 42) + "…" : clean;
}

function loadConversations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveConversations(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export default function ChatPage() {
  const [conversations, setConversations] = useState({});
  const [activeId, setActiveId] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // fermée par défaut, s'ouvre en desktop via CSS/effet
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  // Chargement initial + ouverture par défaut de la sidebar si l'écran est large
  useEffect(() => {
    const saved = loadConversations();
    if (saved && saved.conversations && Object.keys(saved.conversations).length > 0) {
      setConversations(saved.conversations);
      setActiveId(saved.activeId && saved.conversations[saved.activeId] ? saved.activeId : Object.keys(saved.conversations)[0]);
    } else {
      const id = makeId();
      const fresh = { id, title: "Nouvelle discussion", messages: [], updatedAt: Date.now() };
      setConversations({ [id]: fresh });
      setActiveId(id);
    }
    // Sur grand écran (desktop/tablette large), la sidebar s'ouvre par défaut
    if (typeof window !== "undefined" && window.innerWidth >= 900) {
      setSidebarOpen(true);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveConversations({ conversations, activeId });
  }, [conversations, activeId, hydrated]);

  const activeConversation = conversations[activeId];
  const messages = activeConversation?.messages || [];

  const conversationList = useMemo(
    () => Object.values(conversations).sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function isMobile() {
    return typeof window !== "undefined" && window.innerWidth < 900;
  }

  function handleNewConversation() {
    const id = makeId();
    const fresh = { id, title: "Nouvelle discussion", messages: [], updatedAt: Date.now() };
    setConversations((prev) => ({ ...prev, [id]: fresh }));
    setActiveId(id);
    setError(null);
    if (isMobile()) setSidebarOpen(false);
  }

  function handleSelectConversation(id) {
    setActiveId(id);
    if (isMobile()) setSidebarOpen(false);
  }

  function handleDeleteConversation(id, e) {
    e.stopPropagation();
    if (!confirm("Supprimer cette discussion ?")) return;
    setConversations((prev) => {
      const next = { ...prev };
      delete next[id];
      if (Object.keys(next).length === 0) {
        const newId = makeId();
        next[newId] = { id: newId, title: "Nouvelle discussion", messages: [], updatedAt: Date.now() };
        setActiveId(newId);
      } else if (id === activeId) {
        setActiveId(Object.values(next).sort((a, b) => b.updatedAt - a.updatedAt)[0].id);
      }
      return next;
    });
  }

  async function sendMessage(overrideText) {
    const trimmed = (overrideText ?? input).trim();
    if (!trimmed || loading || !activeId) return;

    const userTurn = { role: "user", content: trimmed, ts: Date.now() };
    const isFirstMessage = messages.length === 0;
    const historyForApi = messages.map(({ role, content }) => ({ role, content }));

    setConversations((prev) => ({
      ...prev,
      [activeId]: {
        ...prev[activeId],
        title: isFirstMessage ? makeTitle(trimmed) : prev[activeId].title,
        messages: [...prev[activeId].messages, userTurn],
        updatedAt: Date.now(),
      },
    }));
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history: historyForApi }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur inconnue de l'API.");

      setConversations((prev) => ({
        ...prev,
        [activeId]: {
          ...prev[activeId],
          messages: [...prev[activeId].messages, { role: "assistant", content: data.reply, ts: Date.now() }],
          updatedAt: Date.now(),
        },
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="app-shell">
      {/* Overlay sombre derrière la sidebar sur mobile */}
      {sidebarOpen && <div className="backdrop" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-top">
          <button className="new-conv-btn" onClick={handleNewConversation}>
            + Nouvelle discussion
          </button>
        </div>

        <div className="conv-list">
          {conversationList.map((c) => (
            <div
              key={c.id}
              onClick={() => handleSelectConversation(c.id)}
              className={`conv-item ${c.id === activeId ? "conv-item-active" : ""}`}
            >
              <div className="conv-item-text">
                <div className={`conv-title ${c.id === activeId ? "conv-title-active" : ""}`}>
                  {c.title}
                </div>
                <div className="conv-meta">
                  {formatDate(c.updatedAt)} · {c.messages.length} message{c.messages.length > 1 ? "s" : ""}
                </div>
              </div>
              <button
                onClick={(e) => handleDeleteConversation(c.id, e)}
                title="Supprimer"
                className="delete-btn"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Contenu principal */}
      <main className="main">
        <header className="header">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            title={sidebarOpen ? "Masquer l'historique" : "Afficher l'historique"}
            className="menu-btn"
          >
            ☰
          </button>
          <div className="header-titles">
            <h1 className="title">🛍️ Africa Shopping — Agent Marketing IA</h1>
            <p className="subtitle">Stratégie &amp; création de contenu</p>
          </div>
        </header>

        {/* Boutons rapides */}
        <div className="quick-actions">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => sendMessage(action.prompt)}
              disabled={loading}
              className="quick-btn"
            >
              {action.label}
            </button>
          ))}
        </div>

        {/* Zone de conversation */}
        <div className="chat-area">
          {messages.length === 0 && (
            <div className="empty-state">
              <p>👋 Pose une question ou choisis une suggestion rapide ci-dessus.</p>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`msg-row ${m.role === "user" ? "msg-row-user" : "msg-row-assistant"}`}>
              <div className={`bubble ${m.role === "user" ? "bubble-user" : "bubble-assistant"}`}>
                {m.content}
              </div>
              {m.ts && <span className="msg-time">{formatTime(m.ts)}</span>}
            </div>
          ))}

          {loading && (
            <div className="loading-row">
              <span className="loading-dot" />
              L&apos;agent réfléchit…
            </div>
          )}
          {error && <p className="error-box">⚠️ {error}</p>}
          <div ref={bottomRef} />
        </div>

        {/* Zone de saisie */}
        <div className="input-row">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Écris ta demande…"
            rows={2}
            className="textarea"
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="send-btn"
          >
            Envoyer
          </button>
        </div>
      </main>

      <style>{`
        * { box-sizing: border-box; }

        .app-shell {
          display: flex;
          height: 100dvh;
          font-family: system-ui, sans-serif;
          position: relative;
          overflow: hidden;
        }

        .backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.35);
          z-index: 20;
        }

        .sidebar {
          width: 260px;
          overflow: hidden;
          transition: transform 0.2s ease, width 0.2s ease;
          border-right: 1px solid #eee;
          background: #fbfbfb;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
        }

        .sidebar-top { padding: 12px; }

        .new-conv-btn {
          width: 100%;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #1A3C5E;
          background: #1A3C5E;
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .conv-list { flex: 1; overflow-y: auto; padding: 0 8px; }

        .conv-item {
          padding: 10px;
          border-radius: 8px;
          margin-bottom: 4px;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 6px;
        }
        .conv-item-active { background: #eef2f6; }

        .conv-item-text { min-width: 0; }
        .conv-title {
          font-size: 13px;
          color: #222;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .conv-title-active { font-weight: 600; }
        .conv-meta { font-size: 11px; color: #999; margin-top: 2px; }

        .delete-btn {
          border: none;
          background: none;
          color: #bbb;
          cursor: pointer;
          font-size: 16px;
          flex-shrink: 0;
          padding: 4px;
          min-width: 28px;
          min-height: 28px;
        }

        .main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          padding: 0 16px;
        }

        .header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 0;
          border-bottom: 1px solid #eee;
        }

        .menu-btn {
          border: 1px solid #ddd;
          background: #fff;
          border-radius: 6px;
          width: 36px;
          height: 36px;
          min-width: 36px;
          cursor: pointer;
          font-size: 15px;
          flex-shrink: 0;
        }

        .header-titles { min-width: 0; }
        .title {
          font-size: 16px;
          margin: 0;
          color: #1A3C5E;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .subtitle { font-size: 11.5px; color: #888; margin: 2px 0 0; }

        .quick-actions {
          display: flex;
          gap: 8px;
          padding: 10px 0;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          flex-wrap: nowrap;
        }
        .quick-btn {
          font-size: 12.5px;
          padding: 9px 14px;
          border-radius: 20px;
          border: 1px solid #E07B39;
          background: #fff;
          color: #E07B39;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .quick-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .chat-area {
          flex: 1;
          overflow-y: auto;
          border-radius: 12px;
          padding: 14px;
          background: #fafafa;
          border: 1px solid #eee;
          -webkit-overflow-scrolling: touch;
        }

        .empty-state { text-align: center; color: #999; margin-top: 40px; font-size: 14px; }

        .msg-row { margin-bottom: 14px; display: flex; flex-direction: column; }
        .msg-row-user { align-items: flex-end; }
        .msg-row-assistant { align-items: flex-start; }

        .bubble {
          display: inline-block;
          max-width: 90%;
          padding: 11px 15px;
          border-radius: 14px;
          white-space: pre-wrap;
          line-height: 1.5;
          font-size: 14.5px;
          word-break: break-word;
        }
        .bubble-user { background: #1A3C5E; color: #fff; }
        .bubble-assistant {
          background: #fff;
          color: #111;
          border: 1px solid #e5e5e5;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        }

        .msg-time { font-size: 10.5px; color: #aaa; margin-top: 4px; }

        .loading-row { display: flex; align-items: center; gap: 8px; color: #999; font-size: 13.5px; }
        .loading-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #E07B39; display: inline-block;
          animation: pulse 1s infinite ease-in-out;
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1); }
        }

        .error-box {
          color: #c0392b;
          font-size: 13.5px;
          background: #fdecea;
          padding: 8px 12px;
          border-radius: 8px;
        }

        .input-row {
          display: flex;
          gap: 8px;
          padding: 10px 0 14px;
        }
        .textarea {
          flex: 1;
          padding: 12px;
          border-radius: 10px;
          border: 1px solid #ccc;
          resize: none;
          font-family: inherit;
          font-size: 16px; /* 16px minimum pour éviter le zoom auto sur iOS */
          outline: none;
        }
        .send-btn {
          padding: 0 20px;
          border-radius: 10px;
          border: none;
          background: #E07B39;
          color: #fff;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          min-width: 84px;
        }
        .send-btn:disabled { background: #e0a479; cursor: not-allowed; }

        /* ---- TABLETTE (≤ 900px) : sidebar devient un panneau superposé ---- */
        @media (max-width: 900px) {
          .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            z-index: 30;
            width: 280px;
            transform: translateX(-100%);
            box-shadow: 2px 0 12px rgba(0,0,0,0.1);
          }
          .sidebar-open { transform: translateX(0); }
        }

        /* ---- MOBILE (≤ 560px) : ajustements de densité ---- */
        @media (max-width: 560px) {
          .main { padding: 0 10px; }
          .title { font-size: 14.5px; }
          .subtitle { display: none; }
          .bubble { max-width: 94%; font-size: 14px; padding: 10px 13px; }
          .send-btn { min-width: 68px; padding: 0 14px; font-size: 13px; }
          .quick-btn { font-size: 12px; padding: 8px 12px; }
          .sidebar { width: 240px; }
        }
      `}</style>
    </div>
  );
}