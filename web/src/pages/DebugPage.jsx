import { useEffect, useRef, useState } from "react";
import { zotFetch } from "../api.js";
import { clearCookieState } from "../cookies.js";
import {
  getChatList,
  getChatThread,
  storeNewChatMessage,
  createNewChat,
  deleteChat,
  renameChat,
} from "../storage.js";
import QuotaWidget from "../components/QuotaWidget.jsx";
import MarkdownMessage from "../components/MarkdownMessage.jsx";
import { MODELS, DEFAULT_MODEL_ID, getModel } from "../models.js";

const MAX_TEXTAREA_HEIGHT = 200; // px
const STREAM_IDLE_TIMEOUT_MS = 30000; // abort if no new chunk arrives for this long

function randId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function DebugPage() {
  // the chat id sitting in localStorage - the "draft"/new-chat id, kept live in
  // case another tab (or the cookie-sync flow) obtains a fresh one
  const [freshChatId, setFreshChatId] = useState("");
  // explicitly picked from the sidebar; null means "no selection, use freshChatId"
  const [selectedChatId, setSelectedChatId] = useState(null);
  const chatId = selectedChatId ?? freshChatId;

  const [messages, setMessages] = useState([]); // [{ id, role, text }]
  const [chatInput, setChatInput] = useState("");
  const [chatList, setChatList] = useState([]); // [{ chatId, title, createdAt, lastMessage }]
  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID);
  const [editingChatId, setEditingChatId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  function autoResizeTextarea() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }

  useEffect(() => {
    autoResizeTextarea();
  }, [chatInput]);

  async function refreshChatList() {
    const list = await getChatList();
    list.sort((a, b) => b.lastMessage - a.lastMessage);
    setChatList(list);
  }

  useEffect(() => {
    function syncFreshChatId() {
      setFreshChatId(localStorage.getItem("zot-fresh-chatid") ?? "");
    }
    syncFreshChatId();
    window.addEventListener("storage", syncFreshChatId);
    return () => window.removeEventListener("storage", syncFreshChatId);
  }, []);

  useEffect(() => {
    refreshChatList();
  }, [])

  async function selectChat(id) {
    setSelectedChatId(id);
    const thread = await getChatThread(id);
    setMessages(thread.map((m) => ({ id: randId(), role: m.role, text: m.message })));
  }

  function startNewChat() {
    setSelectedChatId(null);
    setMessages([]);
  }

  async function handleDeleteChat(id, e) {
    e.stopPropagation();
    await deleteChat(id);
    if (id === selectedChatId) {
      setSelectedChatId(null);
      setMessages([]);
    }
    await refreshChatList();
  }

  function startRenameChat(c, e) {
    e.stopPropagation();
    setEditingChatId(c.chatId);
    setEditingTitle(c.title || "");
  }

  async function commitRenameChat() {
    const id = editingChatId;
    const title = editingTitle.trim();
    setEditingChatId(null);
    if (!id || !title) return;
    await renameChat(id, title);
    await refreshChatList();
  }

  function getLastCookieSyncTime() {
    const lastSync = Number(localStorage.getItem("zot-last-cookie-sync-time"));

    if (!lastSync) return "Last updated: never";
    const diffSeconds = Math.floor((Date.now() - lastSync) / 1000);
    if (diffSeconds < 60) {
        return `${diffSeconds} sec ago`;
    }
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) {
        return `${diffMinutes} min ago`;
    }
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
        return `${diffHours} hr ago`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

  function resetCookies() {
    clearCookieState();
    alert(
      "Cleared stored cookie state. The next request will fall back to server/config.local.js."
    );
  }

  async function sendMessage(e) {
    e.preventDefault();
    const id = chatId.trim();
    const text = chatInput.trim();
    if (!id) {
      alert("get a chat id first");
      return;
    }
    if (!text) return;

    // lock onto this id so a fresh id showing up later (e.g. another tab
    // re-syncing cookies) doesn't yank the conversation mid-stream
    if (!selectedChatId) setSelectedChatId(id);

    setChatInput("");
    const assistantMsgId = randId();
    setMessages((prev) => [
      ...prev,
      { id: randId(), role: "user", text },
      { id: assistantMsgId, role: "assistant", text: "...", reasoning: "" },
    ]);

    const existingThread = await getChatThread(id);
    if (existingThread.length === 0) {
      await createNewChat(id, "user", text);
    } else {
      await storeNewChatMessage(id, "user", text);
    }
    refreshChatList();

    const body = {
      id,
      chatType: "simple",
      conversationStyle: "balanced",
      chatSearch: "none",
      chatAttachments: [],
      chatModelDeploymentName: modelId,
      documentType: "analysis_and_ocr",
      advancedSettings: {
        enableLatex: true,
        systemPrompt: (() => {
          const model = getModel(modelId);
          const name = model?.label ?? modelId;
          const company = model?.company ?? "an unknown company";
          return `You are ${name} made by ${company}. who is a helpful AI Assistant.\n- You will provide clear and concise queries, and you will respond with polite and professional answers.\n- You will answer questions truthfully and accurately`;
        })(),
        reasoningEnabled: true,
        reasoningTokens: 1024,
        reasoningEffort: "medium",
        enableWebSearch: false,
      },
      streamingPreferred: true,
      messages: [
        {
          role: "user",
          parts: [{ type: "text", text }],
          metadata: { createdAt: Date.now() },
          id: randId(),
        },
      ],
      trigger: "submit-message",
    };

    const res = await zotFetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.body) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId ? { ...m, text: "(no stream body - check server console)" } : m
        )
      );
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let assistantText = "";
    let reasoningText = "";
    let timedOut = false;

    // watchdog: cancel the stream if no chunk arrives for STREAM_IDLE_TIMEOUT_MS
    let idleTimer;
    const armIdleTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        timedOut = true;
        reader.cancel();
      }, STREAM_IDLE_TIMEOUT_MS);
    };
    armIdleTimer();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        armIdleTimer();
        buffer += decoder.decode(value, { stream: true });

        // SSE frames are separated by blank lines
        const frames = buffer.split("\n\n");
        buffer = frames.pop(); // keep the last (possibly incomplete) frame

        for (const frame of frames) {
          const line = frame.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") continue;

          let event;
          try {
            event = JSON.parse(payload);
          } catch {
            continue;
          }

          if (event.type === "text-delta") {
            assistantText += event.delta;
            const snapshot = assistantText;
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantMsgId ? { ...m, text: snapshot } : m))
            );
          } else if (event.type === "reasoning-delta") {
            reasoningText += event.delta;
            const snapshot = reasoningText;
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantMsgId ? { ...m, reasoning: snapshot } : m))
            );
          } else if (event.type === "finish") {
            const finishReason = event.messageMetadata?.finishReason;
            if (finishReason && finishReason !== "stop") {
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantMsgId ? { ...m, finishReason } : m))
              );
            }
          }
        }
      }
    } catch {
      // reader.cancel() from the idle timeout rejects the pending read - ignore it,
      // `timedOut` already records why we stopped
    } finally {
      clearTimeout(idleTimer);
    }

    if (timedOut) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, text: (m.text === "..." ? "" : m.text) + "\n\n_(stream timed out - no response for 30s)_" }
            : m
        )
      );
    }

    if (assistantText) {
      await storeNewChatMessage(id, "assistant", assistantText);
      refreshChatList();
    }
  }

  return (
    <div className="font-mono text-sm h-screen flex gap-4 p-4">
      <aside className="w-56 shrink-0 flex flex-col h-full">
        <div className="flex-1 min-h-0 border border-neutral-700 rounded p-2 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-xs uppercase text-neutral-500">chats</h2>
            <button
              onClick={startNewChat}
              className="text-xs px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-400 hover:text-white"
              title="Start a new chat"
            >
              + new
            </button>
          </div>
          <ul className="space-y-1">
            {chatList.length === 0 && (
              <li className="text-xs text-neutral-500">no chats yet</li>
            )}
            {chatList.map((c) => (
              <li
                key={c.chatId}
                onClick={() => editingChatId !== c.chatId && selectChat(c.chatId)}
                className={
                  "group flex items-center justify-between gap-1 px-2 py-1 rounded cursor-pointer text-xs " +
                  (c.chatId === chatId
                    ? "bg-neutral-700 text-white"
                    : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800")
                }
                title={c.chatId}
              >
                {editingChatId === c.chatId ? (
                  <input
                    autoFocus
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={commitRenameChat}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitRenameChat();
                      } else if (e.key === "Escape") {
                        setEditingChatId(null);
                      }
                    }}
                    className="flex-1 min-w-0 bg-neutral-800 border border-neutral-600 rounded px-1 py-0.5 text-white"
                  />
                ) : (
                  <span className="truncate">{c.title || c.chatId}</span>
                )}
                <span className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={(e) => startRenameChat(c, e)}
                    className="text-neutral-500 hover:text-white"
                    title="rename chat"
                  >
                    ✎
                  </button>
                  <button
                    onClick={(e) => handleDeleteChat(c.chatId, e)}
                    className="text-neutral-500 hover:text-red-400"
                    title="delete chat"
                  >
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="shrink-0 mt-2">
          <QuotaWidget />
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col h-full">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-bold">zotgpt debug client</h1>
          <button
            onClick={resetCookies}
            className="px-2 py-1 bg-neutral-800 rounded text-xs text-neutral-400"
            title="Clear stored cookie state, falling back to server/config.local.js on the next request"
          >
            reset stored cookies
          </button>
        </div>

        <div className="text-xs text-gray-500 pb-2">
          Cookies last updated {getLastCookieSyncTime()}
        </div>

        <section className="flex-1 min-h-0 flex flex-col p-3 border border-neutral-700 rounded">
          <div className="flex items-center justify-between gap-2 pb-2">
            <div className="text-xs text-gray-500">
              {chatId === "" ? "error: no chat id" : `chat id ${chatId}`}
            </div>
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              className="text-xs bg-neutral-900 border border-neutral-700 rounded px-1.5 py-1 text-neutral-300"
              title="model"
            >
              {Object.entries(
                MODELS.reduce((groups, m) => {
                  (groups[m.provider] ??= []).push(m);
                  return groups;
                }, {})
              ).map(([provider, models]) => (
                <optgroup key={provider} label={provider}>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="flex-1 min-h-0 mb-2 space-y-2 overflow-y-auto">
            {messages.map((m) => (
              <div
                key={m.id}
                className={m.role === "user" ? "text-blue-300 whitespace-pre-wrap" : "text-neutral-300"}
              >
                <span className="font-bold">{m.role}: </span>
                {m.role === "assistant" && m.reasoning && (
                  <details className="mb-1 text-xs text-neutral-500 border border-neutral-800 rounded px-2 py-1">
                    <summary className="cursor-pointer select-none text-neutral-400">reasoning</summary>
                    <div className="mt-1 whitespace-pre-wrap">{m.reasoning}</div>
                  </details>
                )}
                {m.role === "assistant" ? <MarkdownMessage text={m.text} /> : m.text}
                {m.role === "assistant" && m.finishReason && (
                  <div className="mt-1 text-xs text-yellow-500">
                    ⚠ response ended early: {m.finishReason}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={sendMessage} className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(e);
                }
              }}
              rows={1}
              className="flex-1 resize-none bg-neutral-900 border border-neutral-700 rounded-2xl px-3 py-2 leading-6 overflow-y-auto focus:outline-none focus:border-neutral-500"
              style={{ maxHeight: MAX_TEXTAREA_HEIGHT }}
              placeholder="say something"
              autoComplete="off"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-neutral-800 rounded-full hover:bg-neutral-700 shrink-0"
            >
              send
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

