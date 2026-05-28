"use client";

import {
  estimateCost,
  formatCurrency,
  formatNumber,
  type PricingModel,
  type SessionSummary,
} from "@/lib/api";

type Props = {
  summary: SessionSummary | null;
  pricing?: PricingModel;
  modelName?: string;
};

export function SessionSummaryCard({ summary, pricing, modelName }: Props) {
  const savedCost = summary
    ? estimateCost(
        summary.tokens_saved.input,
        summary.tokens_saved.output,
        pricing,
      )
    : 0;
  const usedCost = summary
    ? estimateCost(
        summary.tokens_used.input,
        summary.tokens_used.output,
        pricing,
      )
    : 0;
  const netCost = Math.max(usedCost, 0);

  return (
    <section className="card flex flex-col p-7">
      <p className="label">Session Summary</p>
      <p className="mt-1 text-xs text-ink-subtle">
        This Session{modelName ? ` · ${modelName}` : ""}
      </p>

      <div className="mt-5 overflow-hidden rounded-card border border-ink-line/60 bg-cream-50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-line/60 bg-warm-50">
              <th className="px-4 py-2.5 text-left">
                <span className="label">Metric</span>
              </th>
              <th className="px-4 py-2.5 text-right">
                <span className="label">Value</span>
              </th>
              <th className="px-4 py-2.5 text-right">
                <span className="label">Est. Cost</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <Row
              label="Total turns"
              value={summary ? formatNumber(summary.total_turns) : "—"}
              cost="—"
            />
            <Row
              label="Cache hits"
              value={summary ? formatNumber(summary.cache_hits) : "—"}
              cost={summary ? formatCurrency(savedCost) : "—"}
              accent
            />
            <Row
              label="Cache misses"
              value={summary ? formatNumber(summary.cache_misses) : "—"}
              cost={summary ? formatCurrency(usedCost) : "—"}
            />
            <Row
              label="Total tokens saved"
              value={
                summary
                  ? formatNumber(
                      summary.tokens_saved.input +
                        summary.tokens_saved.output,
                    )
                  : "—"
              }
              cost={summary ? formatCurrency(savedCost) : "—"}
            />
            <Row
              label="Total tokens used"
              value={
                summary
                  ? formatNumber(
                      summary.tokens_used.input + summary.tokens_used.output,
                    )
                  : "—"
              }
              cost={summary ? formatCurrency(usedCost) : "—"}
              last
            />
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex items-baseline justify-between border-t border-ink-line/50 pt-5">
        <div>
          <p className="label">Net cost this session</p>
          <p className="mt-1 text-xs text-ink-subtle">
            Pricing estimate based on selected model.
          </p>
        </div>
        <p className="font-serif text-3xl text-forest">
          {summary ? formatCurrency(netCost) : "—"}
        </p>
      </div>

      {summary && !summary.available && (
        <p className="mt-4 text-xs text-ink-subtle">
          Mongo not configured — values will populate once
          <code className="mx-1 rounded bg-warm-100 px-1.5 py-0.5">
            CONNECTION_STRING
          </code>
          is set.
        </p>
      )}
    </section>
  );
}

function Row({
  label,
  value,
  cost,
  accent,
  last,
}: {
  label: string;
  value: string;
  cost: string;
  accent?: boolean;
  last?: boolean;
}) {
  return (
    <tr className={last ? "" : "border-b border-ink-line/40"}>
      <td className="px-4 py-3 text-ink-muted">{label}</td>
      <td
        className={`px-4 py-3 text-right font-medium ${
          accent ? "text-forest" : "text-ink"
        }`}
      >
        {value}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-ink-muted">
        {cost}
      </td>
    </tr>
  );
}
