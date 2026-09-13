import { insiderMateriality, storySymbols, uniqueNews } from "./marketNewsRanking.js";
import { newsMarketAttention } from "./newsMarketAttention.js";

// Editorial selection only. Never reuse this as a price-mover score or alter
// the upstream story classification, chronological feed or personal matching.
const HOUR = 3600_000;
const MAX_AGE_HOURS = 96;
const MIN_SCORE = 45;
const REPEATED_TOPIC_PENALTY = 8;
const CONTEXT = new Set(["CONTEXT", "RESEARCH", "ANALYSIS", "RECOMMENDATION", "MEDIA", "MEDIA_REPORT"]);
const ADMINISTRATIVE = /invitation to|inbjudan till|notice (?:of|to attend)|kallelse till|financial calendar|finansiell kalender|number of shares and votes|antal aktier och röster|(?:to host|will host|invites? to|bjuder in till).{0,70}(?:capital markets day|kapitalmarknadsdag|webcast|presentation)|(?:återköp|repurchases?).{0,100}(?:under perioden|under vecka|during the period|during week)/i;
const HOLDINGS_NOTICE = /(?:styrelseordförande|ordförande|\bvd\b|\bceo\b|\bcfo\b).{0,100}(?:ökar|ökat|minskar|minskat).{0,30}(?:aktie)?innehav/i;
const PROMOTIONAL = /(?:positioned|recogn[is]ed|named).{0,50}(?:as (?:a )?leader|market leader)|(?:appoints?|utser).{0,65}(?:financial advis[oe]r|finansiell rådgivare)/i;
const FINANCING_FOLLOW_UP = /teckningsperioden (?:inleds|avslutas)|subscription period (?:begins|commences|ends)|utfall.{0,35}(?:emission|teckning)|(?:outcome|results).{0,35}(?:issue|offering)|optionsinlösen|exercise of warrants/i;
const DEAL_FOLLOW_UP = /(?:slutgiltigt utfall|final (?:outcome|results)).{0,100}(?:erbjudand|offer)|(?:slutfört|completed).{0,35}(?:återköpsprogram|buyback program(?:me)?)|last day of trading|sista (?:dag för handel|handelsdag)|(?:permission|tillstånd).{0,40}(?:merger plan|fusionsplan)/i;
const FINANCING_PHASES = new Set(["subscription", "outcome", "completed", "allotment", "registration"]);
const MATERIAL_SETBACK = /(?:emission|finansiering|financing|issue|offering).{0,45}(?:avbryt|ställs in|misslyck|cancel|fail|undersubscribed)|(?:avbryter|inställd|misslyckad|cancelled|failed).{0,35}(?:emission|finansiering|financing|issue|offering)/i;

const tagsOf = (item) => new Set((item.labels ?? []).map((tag) => String(tag).toUpperCase()));
function topicOf(item, tags) {
  if (["MACRO", "RATES", "MONETARY_POLICY"].some((tag) => tags.has(tag))) return "macro";
  if (["EARNINGS", "GUIDANCE", "PROFIT_WARNING"].some((tag) => tags.has(tag))) return "results";
  // An acquisition financed with shares remains an acquisition, not an issue update.
  if (item.eventType === "m_and_a" || ["M_AND_A", "M&A", "MERGER"].some((tag) => tags.has(tag))) return "deals";
  if (["CAPITAL_RAISE", "RIGHTS_ISSUE", "FINANCING"].some((tag) => tags.has(tag))) return "financing";
  if (["ORDER", "AGREEMENT", "STRATEGIC_AGREEMENT", "PARTNERSHIP"].some((tag) => tags.has(tag))) return "business";
  if (tags.has("CLINICAL") || tags.has("REGULATORY_ACTION")) return "clinical";
  if (tags.has("MANAGEMENT") || tags.has("PERSONNEL")) return "management";
  if (tags.has("INSIDER")) return "insider";
  return item.eventType || "other";
}

/** Explainable policy inputs for offline audits; no extra copy in news rows. */
export function assessFeaturedNews(item, now) {
  const tags = tagsOf(item);
  const title = item.title ?? "";
  const topic = topicOf(item, tags);
  const ageHours = (now - item.ts) / HOUR;
  const excluded = (reason) => ({ eligible: false, reason, topic, score: null });
  if (!item.id || !title.trim()) return excluded("missing_headline");
  if (item.status && !["flash", "update"].includes(item.status)) return excluded("withdrawn");
  if (!Number.isFinite(now) || !Number.isFinite(item.ts) || ageHours < 0 || ageHours > MAX_AGE_HOURS)
    return excluded("outside_window");
  if (ADMINISTRATIVE.test(title)) return excluded("administrative");
  const insider = insiderMateriality(tags.has("INSIDER") ? item : {
    ...item, labels: HOLDINGS_NOTICE.test(title) ? ["INSIDER"] : [],
  });
  if (insider === "routine") return excluded("routine_insider");

  const importance = item.importance == null ? 0 : Number(item.importance);
  const base = Number.isFinite(importance) ? Math.min(100, Math.max(0, importance)) : 0;
  const freshnessPenalty = Math.min(ageHours * 0.8, 72);
  const financingFollowUp = topic === "financing"
    && (FINANCING_PHASES.has(item.facts?.phase) || FINANCING_FOLLOW_UP.test(title))
    && !MATERIAL_SETBACK.test(title);
  const dealFollowUp = topic === "deals" && DEAL_FOLLOW_UP.test(title);
  const followUpPenalty = financingFollowUp || dealFollowUp ? 30 : 0;
  const contextPenalty = [...tags].some((tag) => CONTEXT.has(tag)) || PROMOTIONAL.test(title) ? 20 : 0;
  const insiderPenalty = insider === "exceptional" ? 10 : insider === "material" ? 22 : 0;
  const attention = newsMarketAttention(item, now);
  const score = base - freshnessPenalty - followUpPenalty - contextPenalty - insiderPenalty + attention.total;
  return {
    eligible: score >= MIN_SCORE,
    reason: score >= MIN_SCORE ? "candidate" : "below_editorial_floor",
    topic, score, base, freshnessPenalty, followUpPenalty, contextPenalty, insiderPenalty, attention,
  };
}

export function selectFeaturedNews(items, now, limit = 5) {
  let candidates = uniqueNews(items).map((item) => ({ item, ...assessFeaturedNews(item, now) }))
    .filter((candidate) => candidate.eligible);
  const selected = [];
  const companies = new Set();
  const topics = new Map();
  while (candidates.length && selected.length < limit) {
    // A soft preference for breadth, not a quota that hides an important
    // report-heavy day or fills empty slots with low-quality stories.
    const adjustedScore = (candidate) => candidate.score
      - (topics.get(candidate.topic) ?? 0) * REPEATED_TOPIC_PENALTY;
    candidates.sort((a, b) => adjustedScore(b) - adjustedScore(a)
      || Number(b.item.language === "sv") - Number(a.item.language === "sv")
      || b.item.ts - a.item.ts
      || a.item.id.localeCompare(b.item.id));
    const candidate = candidates.shift();
    const symbols = storySymbols(candidate.item);
    if (symbols.some((symbol) => companies.has(symbol))) continue;
    if (adjustedScore(candidate) < MIN_SCORE) break;
    selected.push(candidate.item);
    for (const symbol of symbols) companies.add(symbol);
    topics.set(candidate.topic, (topics.get(candidate.topic) ?? 0) + 1);
  }
  return selected;
}
