// Browser presentation/transport only. The backend owns entitlement and policy.
export const COMPANY_ALERT_LEVELS = [
  { value: "relevant", label: "Fler relevanta nyheter" },
  { value: "important", label: "Viktiga nyheter" },
  { value: "major", label: "Bara det viktigaste" },
];

export const companyAlertsEnabled = () => process.env.NEXT_PUBLIC_COMPANY_ALERTS_ENABLED === "true";

export function companyAlertDraft(resource) {
  return {
    revision: resource.revision,
    enabled: resource.enabled,
    importanceLevel: resource.importanceLevel,
    mutedSymbols: [...resource.mutedSymbols],
    quietHours: { ...resource.quietHours },
    timeZone: resource.timeZone,
  };
}

export function validateCompanyAlertResource(value) {
  if (!value || !Number.isSafeInteger(value.revision) || value.revision < 0
    || typeof value.enabled !== "boolean"
    || !COMPANY_ALERT_LEVELS.some((level) => level.value === value.importanceLevel)
    || !Array.isArray(value.mutedSymbols) || value.mutedSymbols.some((symbol) => typeof symbol !== "string")
    || typeof value.quietHours?.enabled !== "boolean"
    || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.quietHours?.start)
    || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.quietHours?.end)
    || typeof value.timeZone !== "string" || typeof value.destination !== "string"
    || typeof value.verified !== "boolean" || typeof value.entitlement?.eligible !== "boolean"
    || !Number.isSafeInteger(value.entitlement?.companyLimit)
    || typeof value.delivery?.available !== "boolean"
    || !["off", "service_paused", "requires_plan", "requires_verification", "no_companies",
      "all_muted", "over_limit", "resume_required", "active", "suppressed"].includes(value.delivery?.status)) {
    throw new Error("Mejlvalen kunde inte läsas. Försök igen.");
  }
  return value;
}

export function companyAlertStatus(resource) {
  const labels = {
    requires_plan: resource.enabled ? "Mejl pausade · Plus eller Pro krävs" : "Mejlbevakning · Plus och Pro",
    requires_verification: "Bekräfta din mejladress",
    no_companies: "Välj bolag för mejl",
    all_muted: "Inga bolag får mejl just nu",
    over_limit: `Välj upp till ${resource.entitlement.companyLimit} bolag för mejl`,
    resume_required: "Mejl pausade · Återuppta",
    suppressed: "Mejl pausade",
  };
  if (labels[resource.delivery.status]) return labels[resource.delivery.status];
  if (!resource.delivery.available) return resource.enabled ? "Mejlval sparade" : "Välj mejlbevakning";
  if (!resource.enabled) return "Aktivera mejl";
  const level = COMPANY_ALERT_LEVELS.find((entry) => entry.value === resource.importanceLevel)?.label;
  return `Mejl på · ${level}`;
}

export async function requestCompanyAlerts({ draft, signal, fetcher = fetch, baseUrl, timeoutMs = 10_000 } = {}) {
  const base = baseUrl ?? process.env.NEXT_PUBLIC_API_URL ?? "/api";
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  else signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, timeoutMs);
  try {
    const response = await fetcher(`${base.replace(/\/$/, "")}/user/company-alerts`, {
      method: draft ? "PUT" : "GET",
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
      ...(draft ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(companyAlertDraft(draft)) } : {}),
    });
    if (!response.ok) {
      const messages = {
        401: "Logga in igen för att hantera mejlbevakning.",
        403: "Kontot kan inte aktivera mejl just nu. Kontrollera medlemskap och mejladress.",
        404: "Mejlbevakning är inte tillgänglig ännu.",
        409: "Mejlvalen har ändrats. Hämta de sparade valen och granska dem innan du sparar igen.",
        400: "Mejlvalen kunde inte sparas. Kontrollera dina val.",
        422: "Mejlvalen kunde inte sparas. Kontrollera dina val.",
      };
      const error = new Error(messages[response.status] || "Mejlbevakningen kunde inte nås. Försök igen.");
      error.status = response.status;
      throw error;
    }
    return validateCompanyAlertResource(await response.json());
  } catch (error) {
    if (controller.signal.aborted && !signal?.aborted) {
      throw new Error("Mejlbevakningen tog för lång tid att svara. Försök igen.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
