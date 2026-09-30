export function safeOnboardingReturn(value) {
  if (typeof value !== "string" || value.length > 1500 || !value.startsWith("/")
    || value.startsWith("//") || /[\\\u0000-\u0020]/.test(value)
    || /%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|20)/i.test(value.split(/[?#]/)[0])
    || ["/kom-igang", "/bekrafta"].includes(value.split(/[?#]/)[0])) return "/marknaden/bevakning";
  return value;
}

export function onboardingHref({ company, returnTo } = {}) {
  const params = new URLSearchParams();
  if (typeof company === "string" && /^[A-Z0-9.\-]{1,20}$/i.test(company)) params.set("company", company.toUpperCase());
  if (returnTo) params.set("returnTo", safeOnboardingReturn(returnTo));
  return `/kom-igang${params.size ? `?${params}` : ""}`;
}

export function onboardingPreview(data, { companySymbols, limit = 3 } = {}) {
  const companies = companySymbols ? new Set(companySymbols) : null;
  const matches = story => story && (!companies || companies.has(story.symbol)
    || (Array.isArray(story.symbols) && story.symbols.some(symbol => companies.has(symbol))));
  const important = (Array.isArray(data?.importantStories) ? data.importantStories : []).filter(matches);
  const stories = important.length ? important : (Array.isArray(data?.stories) ? data.stories : []).filter(matches);
  const coverage = important.length ? data?.importantCoverage : data?.coverage;
  const hours = Number(data?.sinceHours);
  return {
    stories: stories.slice(0, limit),
    important: important.length > 0,
    period: hours > 0 && Number.isFinite(hours)
      ? hours % 24 === 0 ? `Senaste ${hours / 24} dagarna` : `Senaste ${hours} timmarna` : "Senaste tillgängliga nyheter",
    complete: coverage?.complete === true && !coverage.candidatesLimited,
  };
}

// Position only: never persist consent, drafts or authorization in the browser.
export function restoredOnboardingStep(saved, { hasCompanies = false, mailStep = false, confirmedLetter = false } = {}) {
  const step = Number(saved);
  if (![1, 2, 3, 4].includes(step)) return confirmedLetter ? 2 : 1;
  if (step === 1 && confirmedLetter) return 2;
  if (step === 3 && (!mailStep || !hasCompanies)) return hasCompanies ? 4 : 2;
  return step;
}

export function onboardingEmailSummary(resource) {
  if (!resource) return "Mejlstatus kunde inte hämtas";
  if (["suppressed", "resume_required"].includes(resource.delivery.status)) return "Pausade";
  if (!resource.enabled) return "Av";
  if (resource.delivery.status === "all_muted") return "Inga bolag valda för mejl";
  if (!resource.entitlement.eligible) return "Pausade · Plus eller Pro krävs";
  if (!resource.verified) return "Pausade · bekräfta mejladressen";
  if (resource.delivery.status === "over_limit") return "Pausade · välj färre bolag";
  if (resource.delivery.status === "no_companies") return "Inga bolag valda för mejl";
  if (!resource.delivery.available || resource.delivery.status !== "active") return "Mejlval sparade · inga mejl skickas ännu";
  return "På";
}

// Preserve saved order and use the ticker when the company directory is unavailable.
// No additional quote/profile request is needed for each completion shortcut.
export function onboardingCompanies(symbols, companies = [], limit = 3) {
  const directory = new Map(companies.map(company => [company.symbol, company]));
  return [...new Set((Array.isArray(symbols) ? symbols : []).filter(symbol => typeof symbol === "string" && symbol.trim()))]
    .slice(0, limit).map(symbol => {
      const company = directory.get(symbol);
      return { symbol, name: company?.name || symbol, ticker: company?.nativeSymbol || symbol,
        href: `/aktie/${encodeURIComponent(symbol)}` };
    });
}
