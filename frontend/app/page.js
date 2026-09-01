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
  const [conversations, setConversations] = useState({}); // { id: { id, title, messages, updatedAt } }
  const [activeId, setActiveId] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  // Chargement initial
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
    setHydrated(true);
  }, []);

  // Sauvegarde à chaque changement
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

  function handleNewConversation() {
    const id = makeId();
    const fresh = { id, title: "Nouvelle discussion", messages: [], updatedAt: Date.now() };
    setConversations((prev) => ({ ...prev, [id]: fresh }));
    setActiveId(id);
    setError(null);
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
    <div style={{ display: "flex", height: "100vh", fontFamily: "system-ui, sans-serif" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: sidebarOpen ? 260 : 0,
          overflow: "hidden",
          transition: "width 0.2s ease",
          borderRight: sidebarOpen ? "1px solid #eee" : "none",
          background: "#fbfbfb",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        <div style={{ padding: 12 }}>
          <button
            onClick={handleNewConversation}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #1A3C5E",
              background: "#1A3C5E",
              color: "#fff",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + Nouvelle discussion
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
          {conversationList.map((c) => (
            <div
              key={c.id}
              onClick={() => setActiveId(c.id)}
              style={{
                padding: "10px 10px",
                borderRadius: 8,
                marginBottom: 4,
                cursor: "pointer",
                background: c.id === activeId ? "#eef2f6" : "transparent",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 6,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    color: "#222",
                    fontWeight: c.id === activeId ? 600 : 400,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.title}
                </div>
                <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>
                  {formatDate(c.updatedAt)} · {c.messages.length} message{c.messages.length > 1 ? "s" : ""}
                </div>
              </div>
              <button
                onClick={(e) => handleDeleteConversation(c.id, e)}
                title="Supprimer"
                style={{
                  border: "none",
                  background: "none",
                  color: "#bbb",
                  cursor: "pointer",
                  fontSize: 14,
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Contenu principal */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          padding: "0 16px",
          boxSizing: "border-box",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 0",
            borderBottom: "1px solid #eee",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              title={sidebarOpen ? "Masquer l'historique" : "Afficher l'historique"}
              style={{
                border: "1px solid #ddd",
                background: "#fff",
                borderRadius: 6,
                width: 30,
                height: 30,
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              ☰
            </button>
            <div>
              <h1 style={{ fontSize: 18, margin: 0, color: "#1A3C5E" }}>
                🛍️ Agent Marketing IA - Africa Shopping
              </h1>
              <p style={{ fontSize: 12, color: "#888", margin: "2px 0 0" }}>
                Stratégie & création de contenu
              </p>
            </div>
          </div>
        </header>

        {/* Boutons rapides */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "12px 0" }}>
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => sendMessage(action.prompt)}
              disabled={loading}
              style={{
                fontSize: 12.5,
                padding: "8px 12px",
                borderRadius: 20,
                border: "1px solid #E07B39",
                background: "#fff",
                color: "#E07B39",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.5 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {action.label}
            </button>
          ))}
        </div>

        {/* Zone de conversation */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            borderRadius: 12,
            padding: 16,
            background: "#fafafa",
            border: "1px solid #eee",
          }}
        >
          {messages.length === 0 && (
            <div style={{ textAlign: "center", color: "#999", marginTop: 60 }}>
              <p style={{ fontSize: 14 }}>
                👋 Pose une question ou choisis une suggestion rapide ci-dessus.
              </p>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                marginBottom: 16,
                display: "flex",
                flexDirection: "column",
                alignItems: m.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  maxWidth: "88%",
                  padding: "12px 16px",
                  borderRadius: 14,
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.5,
                  fontSize: 14.5,
                  background: m.role === "user" ? "#1A3C5E" : "#fff",
                  color: m.role === "user" ? "#fff" : "#111",
                  border: m.role === "user" ? "none" : "1px solid #e5e5e5",
                  boxShadow: m.role === "assistant" ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
                }}
              >
                {m.content}
              </div>
              {m.ts && (
                <span style={{ fontSize: 10.5, color: "#aaa", marginTop: 4 }}>
                  {formatTime(m.ts)}
                </span>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#999", fontSize: 13.5 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#E07B39",
                  display: "inline-block",
                  animation: "pulse 1s infinite ease-in-out",
                }}
              />
              L'agent réfléchit…
            </div>
          )}
          {error && (
            <p style={{ color: "#c0392b", fontSize: 13.5, background: "#fdecea", padding: "8px 12px", borderRadius: 8 }}>
              ⚠️ {error}
            </p>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Zone de saisie */}
        <div style={{ display: "flex", gap: 8, padding: "12px 0 16px" }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Écris ta demande… (Entrée pour envoyer, Maj+Entrée pour une nouvelle ligne)"
            rows={2}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 10,
              border: "1px solid #ccc",
              resize: "none",
              fontFamily: "inherit",
              fontSize: 14,
              outline: "none",
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            style={{
              padding: "0 22px",
              borderRadius: 10,
              border: "none",
              background: loading || !input.trim() ? "#e0a479" : "#E07B39",
              color: "#fff",
              fontWeight: 600,
              fontSize: 14,
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            }}
          >
            Envoyer
          </button>
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.3; transform: scale(0.85); }
            50% { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </main>
    </div>
  );
}
