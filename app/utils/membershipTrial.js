export async function startMembershipTrial(tier, { fetcher = fetch } = {}) {
  if (!["plus", "pro"].includes(tier)) throw new Error("Välj Plus eller Pro.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetcher(`${(process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/$/, "")}/user/trial`, {
      method: "POST", credentials: "include", cache: "no-store", signal: controller.signal,
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tier }),
    });
    const value = await response.json();
    if (!response.ok) throw new Error(response.status === 409
      ? "Kontot kan inte starta en ny provperiod. Hämta din plan igen."
      : "Provperioden kunde inte startas. Försök igen.");
    if (value.status !== "active" || value.plan !== tier || !Number.isFinite(value.endsAt) || value.autoRenews !== false)
      throw new Error("Provperioden kunde inte bekräftas. Hämta din plan igen.");
    return value;
  } finally { clearTimeout(timer); }
}

export function trialEndLabel(trial, { includeTime = true } = {}) {
  if (!Number.isFinite(trial?.endsAt) || !Number.isFinite(new Date(trial.endsAt).getTime())) return "";
  return new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "long", ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}), timeZone: "Europe/Stockholm" }).format(trial.endsAt);
}

// Presentation only. The account response, not this countdown, grants access.
export function activeTrialPresentation(trial, now = Date.now()) {
  if (trial?.status !== "active" || !["plus", "pro"].includes(trial.plan)
    || !Number.isFinite(trial.endsAt) || !Number.isFinite(new Date(trial.endsAt).getTime()) || trial.endsAt <= now) return null;
  const remaining = trial.endsAt - now;
  const days = Math.ceil(remaining / 86400000);
  return {
    name: trial.plan === "pro" ? "Pro" : "Plus",
    remainingLabel: remaining < 86400000 ? "Mindre än en dag kvar" : `${days} ${days === 1 ? "dag" : "dagar"} kvar`,
    shortRemainingLabel: remaining < 86400000 ? "<1 d kvar" : `${days} d kvar`,
  };
}
