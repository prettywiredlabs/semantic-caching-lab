export type Model = {
  id: string;
  name: string;
};

export type PricingModel = {
  id: string;
  name: string;
  provider: string;
  inputPerMillion: number;
  outputPerMillion: number;
  contextWindow: number;
};

export type Pricing = {
  currency: string;
  unit: string;
  models: PricingModel[];
};

export type ModelsResponse = {
  default: string | null;
  models: Model[];
};

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
  cached?: boolean;
};

export type ChatResult = {
  cache_hit: boolean;
  similarity: number | null;
  response: string;
  tokens_input: number;
  tokens_output: number;
  hit_count: number | null;
  model: string;
};

export type SessionSummary = {
  available: boolean;
  total_turns: number;
  cache_hits: number;
  cache_misses: number;
  tokens_saved: { input: number; output: number };
  tokens_used: { input: number; output: number };
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

async function jget<T>(path: string): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
  return r.json();
}

async function jpost<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`${path} → ${r.status} ${text}`);
  }
  return r.json();
}

export const api = {
  models: () => jget<ModelsResponse>("/api/models"),
  pricing: () => jget<Pricing>("/api/pricing"),
  history: () => jget<{ turns: ChatTurn[] }>("/api/history"),
  summary: () => jget<SessionSummary>("/api/session-summary"),
  chat: (prompt: string, model: string) =>
    jpost<ChatResult>("/api/chat", { prompt, model }),
  clear: () => jpost<{ ok: boolean }>("/api/clear", {}),
};

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function formatCurrency(n: number): string {
  if (n === 0) return "$0.00";
  if (n < 0.01) return `$${n.toFixed(5)}`;
  return `$${n.toFixed(4)}`;
}

export function estimateCost(
  tokensInput: number,
  tokensOutput: number,
  pricing: PricingModel | undefined,
): number {
  if (!pricing) return 0;
  return (
    (tokensInput / 1_000_000) * pricing.inputPerMillion +
    (tokensOutput / 1_000_000) * pricing.outputPerMillion
  );
}
