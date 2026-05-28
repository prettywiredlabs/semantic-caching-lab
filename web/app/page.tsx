"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  api,
  type ChatResult,
  type ChatTurn,
  type Model,
  type Pricing,
  type PricingModel,
  type SessionSummary,
} from "@/lib/api";
import { Header } from "@/components/Header";
import { PromptComposer } from "@/components/PromptComposer";
import { ResultPanel } from "@/components/ResultPanel";
import { PriorConversation } from "@/components/PriorConversation";
import { SessionSummaryCard } from "@/components/SessionSummaryCard";
import { PricingDrawer } from "@/components/PricingDrawer";

export default function HomePage() {
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<ChatResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);

  // Initial load: models + pricing + history + summary. Each is independent
  // so we settle individually rather than aborting the whole page on one
  // failure — keeps the design visible even when the bridge is partially up.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [m, p, h, s] = await Promise.allSettled([
        api.models(),
        api.pricing(),
        api.history(),
        api.summary(),
      ]);
      if (cancelled) return;

      if (m.status === "fulfilled") {
        setModels(m.value.models);
        setSelectedModel(m.value.default ?? m.value.models[0]?.id ?? "");
      } else if (p.status === "fulfilled") {
        // Fallback: derive models from pricing if /api/models failed.
        const fallback = p.value.models.map(({ id, name }) => ({ id, name }));
        setModels(fallback);
        setSelectedModel(fallback[fallback.length - 1]?.id ?? "");
      } else {
        setBootError(
          "Unable to reach the API bridge at http://localhost:8000. " +
            "Start it with `uvicorn server:app --reload --port 8000`.",
        );
      }

      if (p.status === "fulfilled") setPricing(p.value);
      if (h.status === "fulfilled") setTurns(h.value.turns);
      if (s.status === "fulfilled") setSummary(s.value);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedPricing: PricingModel | undefined = useMemo(
    () => pricing?.models.find((m) => m.id === selectedModel),
    [pricing, selectedModel],
  );
  const selectedModelName = useMemo(
    () => models.find((m) => m.id === selectedModel)?.name,
    [models, selectedModel],
  );

  const refresh = useCallback(async () => {
    const [h, s] = await Promise.allSettled([api.history(), api.summary()]);
    if (h.status === "fulfilled") setTurns(h.value.turns);
    if (s.status === "fulfilled") setSummary(s.value);
  }, []);

  const onSubmit = useCallback(async () => {
    if (!prompt.trim() || !selectedModel) return;
    setSubmitting(true);
    setSubmitError(null);
    setResult(null);
    try {
      const r = await api.chat(prompt.trim(), selectedModel);
      setResult(r);
      setPrompt("");
      await refresh();
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : "Request failed.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [prompt, selectedModel, refresh]);

  const onClearAll = useCallback(async () => {
    setClearing(true);
    try {
      await api.clear();
      setTurns([]);
      setResult(null);
      setSubmitError(null);
      await refresh();
    } catch {
      // Soft fail — clearing only affects in-memory state; surface inline.
      setSubmitError("Unable to clear history. Is the bridge running?");
    } finally {
      setClearing(false);
    }
  }, [refresh]);

  return (
    <main className="mx-auto w-full max-w-[1400px] px-8 pb-20">
      <Header onClearAll={onClearAll} clearing={clearing} />

      {bootError && (
        <div className="card mb-8 border-warm-200 bg-warm-50 px-6 py-4">
          <p className="label mb-1 text-ink">Bridge unreachable</p>
          <p className="text-sm text-ink-muted">{bootError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PromptComposer
          models={models}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          prompt={prompt}
          onPromptChange={setPrompt}
          onSubmit={onSubmit}
          onViewPricing={() => setDrawerOpen(true)}
          submitting={submitting}
        />

        <ResultPanel
          result={result}
          loading={submitting}
          pricing={selectedPricing}
          error={submitError}
        />

        <PriorConversation turns={turns} />

        <SessionSummaryCard
          summary={summary}
          pricing={selectedPricing}
          modelName={selectedModelName}
        />
      </div>

      <PricingDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        pricing={pricing}
      />

      <footer className="mt-16 text-center">
        <p className="text-[11px] uppercase tracking-label text-ink-subtle">
          Pretty Wired AI · Prompt Caching Lab
        </p>
      </footer>
    </main>
  );
}
