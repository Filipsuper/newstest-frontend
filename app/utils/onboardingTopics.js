import { TOPIC_LABELS } from "./topicLabels.js";

export const ONBOARDING_TOPIC_LIMIT = 10;
const GROUPS = ["events", "sectors", "segments"];

export function onboardingTopicOptions(vocabulary, selected = [], query = "") {
  const normalize = value => String(value).toLocaleLowerCase("sv-SE").trim();
  const seen = new Set();
  const groups = GROUPS.map(group => (Array.isArray(vocabulary?.[group]) ? vocabulary[group] : []).filter(value => {
    if (typeof value !== "string" || seen.has(value)) return false;
    seen.add(value);
    return !selected.includes(value) && normalize(`${TOPIC_LABELS[value] || value} ${value}`).includes(normalize(query));
  }));
  return Array.from({ length: Math.max(0, ...groups.map(group => group.length)) }, (_, index) =>
    groups.map(group => group[index]).filter(Boolean)).flat();
}

/** Same topic contract as the full preference editor, with bounded requests. */
export async function requestOnboardingTopics({ topics, signal, fetcher = fetch, timeoutMs = 10000 } = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) abort();
  const timer = setTimeout(abort, timeoutMs);
  const saving = Array.isArray(topics);
  try {
    const response = await fetcher(`${(process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/$/, "")}/${saving ? "user/topics" : "feed/topics"}`, {
      method: saving ? "POST" : "GET", credentials: "include", cache: "no-store", signal: controller.signal,
      ...(saving ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topics }) } : {}),
    });
    if (!response.ok) throw new Error(saving ? "Ämnet kunde inte sparas. Försök igen." : "Ämnena kunde inte hämtas. Försök igen.");
    const value = await response.json();
    if (!value || value.error || (!saving && (!GROUPS.some(group => Array.isArray(value[group]))
      || GROUPS.some(group => value[group] !== undefined && (!Array.isArray(value[group]) || value[group].some(item => typeof item !== "string")))))) {
      throw new Error(saving ? "Ämnet kunde inte sparas. Försök igen." : "Ämnena kunde inte läsas. Försök igen.");
    }
    return value;
  } finally { clearTimeout(timer); signal?.removeEventListener("abort", abort); }
}
