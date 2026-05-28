"use client";

import { PwaiLogo } from "./PwaiLogo";

type Props = {
  onClearAll: () => void;
  clearing?: boolean;
};

export function Header({ onClearAll, clearing }: Props) {
  return (
    <header className="relative pt-10 pb-12">
      <div className="flex items-start justify-between">
        <PwaiLogo />
        <button
          type="button"
          onClick={onClearAll}
          disabled={clearing}
          className="btn-ghost"
          aria-label="Clear all conversation history"
        >
          {clearing ? "Clearing…" : "Clear All"}
        </button>
      </div>

      <div className="mt-10 text-center">
        <h1 className="font-serif text-5xl font-medium leading-tight tracking-tight text-ink sm:text-6xl">
          Prompt Caching Lab
        </h1>
        <p className="mt-3 text-sm text-ink-muted sm:text-base">
          See how reusable context changes token usage and cost.
        </p>
      </div>
    </header>
  );
}
