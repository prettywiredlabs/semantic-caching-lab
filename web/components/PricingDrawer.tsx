"use client";

import { useEffect } from "react";
import type { Pricing } from "@/lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
  pricing: Pricing | null;
};

export function PricingDrawer({ open, onClose, pricing }: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-ink/30 transition-opacity duration-200
          ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="pricing-drawer-title"
        className={`fixed inset-y-0 left-0 z-50 w-[400px] max-w-[92vw]
          transform border-r border-ink-line bg-warm-50 shadow-drawer
          transition-transform duration-300 ease-out
          ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between border-b border-ink-line/60 px-7 py-6">
            <div>
              <h2
                id="pricing-drawer-title"
                className="font-serif text-2xl text-ink"
              >
                Anthropic Model Pricing
              </h2>
              <p className="mt-1 text-xs text-ink-muted">
                {pricing
                  ? `Pricing ${pricing.unit} (${pricing.currency})`
                  : "Loading pricing…"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close pricing drawer"
              className="rounded-full border border-ink-line/70 p-1.5
                         text-ink-muted transition-colors hover:bg-warm-100
                         hover:text-ink"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="scrollbar-soft flex-1 overflow-y-auto px-7 py-6">
            {pricing ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-line/60">
                    <th className="py-2 text-left">
                      <span className="label">Model</span>
                    </th>
                    <th className="py-2 text-right">
                      <span className="label">Input</span>
                    </th>
                    <th className="py-2 text-right">
                      <span className="label">Output</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pricing.models.map((m) => (
                    <tr
                      key={m.id}
                      className="border-b border-ink-line/30 align-top"
                    >
                      <td className="py-3 pr-2">
                        <p className="font-medium text-ink">{m.name}</p>
                        <p className="mt-0.5 text-[11px] text-ink-subtle">
                          {(m.contextWindow / 1000).toLocaleString()}k context
                        </p>
                      </td>
                      <td className="py-3 text-right tabular-nums text-ink">
                        ${m.inputPerMillion.toFixed(2)}
                      </td>
                      <td className="py-3 text-right tabular-nums text-ink">
                        ${m.outputPerMillion.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-ink-muted">Loading…</p>
            )}
          </div>

          <div className="border-t border-ink-line/60 px-7 py-5">
            <p className="text-[11px] uppercase tracking-label text-ink-subtle">
              Cached pricing applies when content is served from cache.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <path
        d="M3 3 L11 11 M11 3 L3 11"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
