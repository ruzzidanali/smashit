import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send } from "lucide-react";
import { aiChat } from "../services/api";

type Msg = { role: "user" | "ai"; text: string };

export default function AiAssistant() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "ai", text: "Hi! Tell me your preferred date/time and I’ll help you book the best court." },
  ]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  async function send() {
    const v = text.trim();
    if (!v || loading) return;

    setMsgs((prev) => [...prev, { role: "user", text: v }]);
    setText("");
    setLoading(true);

    try {
      const r = await aiChat(v);
      setMsgs((prev) => [...prev, { role: "ai", text: r.reply }]);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "AI request failed.";
      setMsgs((prev) => [...prev, { role: "ai", text: errorMessage }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <Bot size={18} />
          </div>
          <div>
            <h1 className="font-outfit text-2xl font-extrabold tracking-tight text-slate-900">
              AI Assistant
            </h1>
            <p className="mt-1 text-slate-600">
              Ask about best times, booking tips, or anything about SmashIt.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="max-h-[60vh] overflow-auto p-4">
          <div className="grid gap-3">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={[
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  m.role === "user"
                    ? "ml-auto bg-emerald-600 text-white"
                    : "mr-auto bg-slate-100 text-slate-800",
                ].join(" ")}
              >
                {m.text}
              </div>
            ))}

            {loading && (
              <div className="mr-auto inline-flex max-w-[85%] items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                <Loader2 className="animate-spin" size={16} />
                Thinking...
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>

        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              placeholder="Ask something…"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
            />
            <button
              onClick={send}
              disabled={!text.trim() || loading}
              className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
              aria-label="Send"
            >
              <Send size={18} />
            </button>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            The AI runs through your backend, so your API key stays private.
          </div>
        </div>
      </div>
    </div>
  );
}
