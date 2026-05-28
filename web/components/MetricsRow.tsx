"use client";

import {
  estimateCost,
  formatCurrency,
  formatNumber,
  type ChatResult,
  type PricingModel,
} from "@/lib/api";

type Props = {
  result: ChatResult;
  pricing?: PricingModel;
};

export function MetricsRow({ result, pricing }: Props) {
  const inputSaved = result.cache_hit ? result.tokens_input : 0;
  const outputSaved = result.cache_hit ? result.tokens_output : 0;
  const costSaved = result.cache_hit
    ? estimateCost(inputSaved, outputSaved, pricing)
    : 0;
  const timesServed = result.hit_count ?? 1;

  return (
    <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
      <Metric
        label="Input tokens saved"
        value={formatNumber(inputSaved)}
        muted={!result.cache_hit}
      />
      <Metric
        label="Output tokens saved"
        value={formatNumber(outputSaved)}
        muted={!result.cache_hit}
      />
      <Metric
        label="Est. cost saved"
        value={formatCurrency(costSaved)}
        muted={!result.cache_hit}
      />
      <Metric label="Times served" value={formatNumber(timesServed)} />
    </div>
  );
}

function Metric({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="card-inset p-4">
      <p className="label">{label}</p>
      <p
        className={`mt-2 font-serif text-2xl ${
          muted ? "text-ink-subtle" : "text-ink"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
