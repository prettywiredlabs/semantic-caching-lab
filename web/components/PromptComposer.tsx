"use client";

import { useEffect, useRef, useState } from "react";
import type { Model } from "@/lib/api";

type Props = {
  models: Model[];
  selectedModel: string;
  onModelChange: (id: string) => void;
  prompt: string;
  onPromptChange: (v: string) => void;
  onSubmit: () => void;
  onViewPricing: () => void;
  submitting: boolean;
};

export function PromptComposer({
  models,
  selectedModel,
  onModelChange,
  prompt,
  onPromptChange,
  onSubmit,
  onViewPricing,
  submitting,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", onDocClick);
      return () => document.removeEventListener("mousedown", onDocClick);
    }
  }, [open]);

  const selected =
    models.find((m) => m.id === selectedModel) ?? models[0];

  return (
    <section className="card p-7">
      <p className="label">Prompt Composer</p>

      <div className="mt-5 space-y-5">
        <div>
          <label className="label mb-2 block text-ink">Anthropic Model</label>
          <div className="flex flex-wrap items-center gap-2">
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={open}
                className="card-inset flex min-w-[230px] items-center
                           justify-between gap-3 px-4 py-2.5 text-sm
                           text-ink transition-colors
                           hover:border-ink-muted"
              >
                <span className="font-medium">
                  {selected ? selected.name : "Select model"}
                </span>
                <Chevron open={open} />
              </button>
              {open && (
                <ul
                  role="listbox"
                  className="absolute z-20 mt-2 w-full overflow-hidden
                             rounded-card border border-ink-line/70
                             bg-warm-50 shadow-soft"
                >
                  {models.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={m.id === selected?.id}
                        onClick={() => {
                          onModelChange(m.id);
                          setOpen(false);
                        }}
                        className={`block w-full px-4 py-2.5 text-left
                                    text-sm transition-colors
                                    ${
                                      m.id === selected?.id
                                        ? "bg-warm-100 text-ink"
                                        : "text-ink-muted hover:bg-warm-100 hover:text-ink"
                                    }`}
                      >
                        {m.name}
                      </button>
                    </li>
                  ))}
                  {models.length === 0 && (
                    <li className="px-4 py-2.5 text-sm text-ink-subtle">
                      No models available
                    </li>
                  )}
                </ul>
              )}
            </div>

            <button
              type="button"
              onClick={onViewPricing}
              className="btn-ghost"
            >
              View Pricing
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="prompt-input"
            className="label mb-2 block text-ink"
          >
            Your Prompt
          </label>
          <textarea
            id="prompt-input"
            ref={textareaRef}
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder="Ask a question about the return policy..."
            rows={6}
            className="card-inset w-full resize-none px-4 py-3
                       text-[15px] text-ink placeholder:text-ink-subtle
                       focus:outline-none focus:ring-0
                       focus-visible:border-forest"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting || prompt.trim().length === 0}
            className="btn-primary"
          >
            {submitting ? "Calculating…" : "Calculate Cost"}
          </button>
        </div>
      </div>
    </section>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      aria-hidden
      className={`transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path
        d="M2.5 4.5 L6 8 L9.5 4.5"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
