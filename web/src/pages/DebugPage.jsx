import { useEffect, useState } from "react";
import { zotFetch } from "../api.js";
import { clearCookieState } from "../cookies.js";

function randId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function DebugPage() {
  const [quota, setQuota] = useState("");
  const [chatId, setChatId] = useState("");
  const [messages, setMessages] = useState([]); // [{ id, role, text }]
  const [chatInput, setChatInput] = useState("");

  useEffect(()=>{
    const chatId = localStorage.getItem("zot-fresh-chatid");
    if (chatId !== null && chatId !== undefined) {
      setChatId(chatId);
    }
  }, [])

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

  async function checkQuota() {
    setQuota("loading...");
    const res = await zotFetch("/api/quota");
    const data = await res.json();
    setQuota(JSON.stringify(data, null, 2));
  }

  function resetCookies() {
    clearCookieState();
    setQuota("");
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

    setChatInput("");
    const assistantMsgId = randId();
    setMessages((prev) => [
      ...prev,
      { id: randId(), role: "user", text },
      { id: assistantMsgId, role: "assistant", text: "..." },
    ]);

    const body = {
      id,
      chatType: "simple",
      conversationStyle: "balanced",
      chatSearch: "none",
      chatAttachments: [],
      chatModelDeploymentName: "us.anthropic.claude-sonnet-5",
      documentType: "analysis_and_ocr",
      advancedSettings: {
        enableLatex: true,
        systemPrompt:
          "- You are UCI ZotGPT Chat who is a helpful AI Assistant.\n- You will provide clear and concise queries, and you will respond with polite and professional answers.\n- You will answer questions truthfully and accurately.",
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

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
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
        }
      }
    }
  }

  return (
    <div className="font-mono text-sm p-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
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
      <section className="mb-4 p-3 border border-neutral-700 rounded">
        <h2 className="font-bold mb-2">quota</h2>
        <button onClick={checkQuota} className="px-2 py-1 bg-neutral-800 rounded">
          check quota
        </button>
        <pre className="mt-2 whitespace-pre-wrap">{quota}</pre>
      </section>

      <section className="mb-4 p-3 border border-neutral-700 rounded">
        <h2 className="font-bold mb-2">chat</h2>
        <div className="text-xs text-gray-500 pb-2">
          {chatId === "" ? "error: no chat id" : `chat id ${chatId}`}
        </div>
        
        <div className="mb-2 space-y-2 max-h-96 overflow-y-auto">
          {messages.map((m) => (
            <div
              key={m.id}
              className={
                "whitespace-pre-wrap " + (m.role === "user" ? "text-blue-300" : "text-neutral-300")
              }
            >
              {m.role}: {m.text}
            </div>
          ))}
        </div>
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-2 py-1"
            placeholder="say something"
            autoComplete="off"
          />
          <button type="submit" className="px-2 py-1 bg-neutral-800 rounded">
            send
          </button>
        </form>
      </section>
    </div>
  );
}

