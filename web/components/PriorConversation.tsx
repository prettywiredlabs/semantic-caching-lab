"use client";

import type { ChatTurn } from "@/lib/api";

type Props = {
  turns: ChatTurn[];
};

export function PriorConversation({ turns }: Props) {
  return (
    <section className="card flex flex-col p-7">
      <div className="flex items-start justify-between">
        <div>
          <p className="label">Prior Conversation</p>
          <p className="mt-1 text-xs text-ink-subtle">
            Live history from current session.
          </p>
        </div>
        <span className="pill-neutral">Read-only</span>
      </div>

      <div className="scrollbar-soft mt-5 max-h-[420px] flex-1 space-y-4 overflow-y-auto pr-2">
        {turns.length === 0 ? (
          <Empty />
        ) : (
          turns.map((t, i) => <Bubble key={i} turn={t} />)
        )}
      </div>
    </section>
  );
}

function Empty() {
  return (
    <div className="card-inset p-6 text-center text-sm text-ink-muted">
      No turns yet — submit a prompt to begin.
    </div>
  );
}

function Bubble({ turn }: { turn: ChatTurn }) {
  const isUser = turn.role === "user";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <p className="label">
          {isUser ? "User" : turn.cached ? "Assistant (cached)" : "Assistant"}
        </p>
        {!isUser && turn.cached && (
          <span
            aria-hidden
            className="inline-block h-1.5 w-1.5 rounded-full bg-forest"
            title="Served from cache"
          />
        )}
      </div>
      <div
        className={`rounded-card border px-4 py-3 text-[14.5px] leading-relaxed
        ${
          isUser
            ? "border-ink-line/60 bg-cream-50 text-ink"
            : turn.cached
              ? "border-forest/20 bg-forest/[0.04] text-ink"
              : "border-ink-line/60 bg-warm-50 text-ink"
        }`}
      >
        {turn.content}
      </div>
    </div>
  );
}
