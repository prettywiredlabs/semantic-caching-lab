"use client";

import {
  formatCurrency,
  formatNumber,
  type ChatResult,
  type PricingModel,
} from "@/lib/api";
import { MetricsRow } from "./MetricsRow";

type Props = {
  result: ChatResult | null;
  loading: boolean;
  pricing?: PricingModel;
  error?: string | null;
};

export function ResultPanel({ result, loading, pricing, error }: Props) {
  return (
    <section className="card p-7">
      <div className="flex items-center justify-between">
        <p className="label">Result</p>
        {result && (
          <span className="text-[11px] uppercase tracking-label text-ink-subtle">
            Model: {result.model}
          </span>
        )}
      </div>

      <div className="mt-5">
        {loading && !result ? (
          <LoadingState />
        ) : error && !result ? (
          <ErrorState message={error} />
        ) : !result ? (
          <EmptyState />
        ) : result.cache_hit ? (
          <HitState result={result} pricing={pricing} />
        ) : (
          <MissState result={result} pricing={pricing} />
        )}
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="card-inset p-8 text-center">
      <p className="text-sm text-ink-muted">
        Submit a prompt to see whether it was answered from cache or sent to
        the model.
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="pill-neutral">
        <Dot /> Calling Claude…
      </div>
      <div className="card-inset space-y-3 p-5">
        <div className="shimmer h-3 w-3/4 rounded bg-warm-100" />
        <div className="shimmer h-3 w-full rounded bg-warm-100" />
        <div className="shimmer h-3 w-5/6 rounded bg-warm-100" />
        <div className="shimmer h-3 w-2/3 rounded bg-warm-100" />
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="card-inset p-6">
      <p className="label mb-2 text-ink">Backend unavailable</p>
      <p className="text-sm text-ink-muted">{message}</p>
      <p className="mt-3 text-xs text-ink-subtle">
        Start the FastAPI bridge with{" "}
        <code className="rounded bg-warm-100 px-1.5 py-0.5">
          uvicorn server:app --reload --port 8000
        </code>
        .
      </p>
    </div>
  );
}

function HitState({
  result,
  pricing,
}: {
  result: ChatResult;
  pricing?: PricingModel;
}) {
  return (
    <div className="fade-in space-y-5">
      <div className="flex items-center gap-3">
        <span className="pill-hit">
          <CheckIcon /> Cache Hit
        </span>
        {typeof result.similarity === "number" && (
          <span className="text-xs text-ink-muted">
            similarity:{" "}
            <span className="font-medium text-ink">
              {result.similarity.toFixed(2)}
            </span>
          </span>
        )}
      </div>

      <div className="space-y-1 text-sm text-ink-muted">
        <p>
          Similar question found. Tokens saved:{" "}
          <span className="font-medium text-ink">
            {formatNumber(result.tokens_input)} input +{" "}
            {formatNumber(result.tokens_output)} output
          </span>
          .
        </p>
        {typeof result.hit_count === "number" && (
          <p>
            This answer has been served from cache{" "}
            <span className="font-medium text-ink">{result.hit_count}</span>{" "}
            {result.hit_count === 1 ? "time" : "times"}.
          </p>
        )}
      </div>

      <Divider />
      <ResponseBlock label="Agent (cached response)" body={result.response} />

      <MetricsRow result={result} pricing={pricing} />
    </div>
  );
}

function MissState({
  result,
  pricing,
}: {
  result: ChatResult;
  pricing?: PricingModel;
}) {
  return (
    <div className="fade-in space-y-5">
      <span className="pill-miss">Cache Miss</span>

      <div className="space-y-1 text-sm text-ink-muted">
        <p>
          Tokens used:{" "}
          <span className="font-medium text-ink">
            {formatNumber(result.tokens_input)} input +{" "}
            {formatNumber(result.tokens_output)} output
          </span>
          .
        </p>
        <p>Response cached for future use.</p>
      </div>

      <Divider />
      <ResponseBlock label="Agent" body={result.response} />

      <MetricsRow result={result} pricing={pricing} />
    </div>
  );
}

function ResponseBlock({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <p className="label mb-2">{label}</p>
      <div className="card-inset whitespace-pre-wrap p-5 text-[15px] leading-relaxed text-ink">
        {body}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-px w-full bg-ink-line/60" />;
}

function Dot() {
  return (
    <span
      aria-hidden
      className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-ink-muted"
    />
  );
}

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden>
      <path
        d="M2.5 6.5 L5 9 L9.5 3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Re-export the cost helper for the metrics row caller convenience.
export { formatCurrency };
