export async function requestNewsletterPreferences({ draft, signal, fetcher = fetch, timeoutMs = 10000 } = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) abort();
  const timer = setTimeout(abort, timeoutMs);
  try {
    const response = await fetcher(`${(process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/$/, "")}/user/newsletters`, {
      method: draft ? "PUT" : "GET", credentials: "include", cache: "no-store", signal: controller.signal,
      ...(draft ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) } : {}),
    });
    if (!response.ok) throw Object.assign(new Error(response.status === 409
      ? "Brevvalen har ändrats på annat håll. Hämta de sparade valen och välj igen."
      : response.status === 403 ? "Bekräfta kontots mejladress för att välja brev."
        : "Brevvalen kunde inte hämtas eller sparas. Försök igen."), { status: response.status });
    const value = await response.json();
    if (!Number.isSafeInteger(value?.revision) || value.revision < 0 || !Array.isArray(value.catalog)
      || value.catalog.some(letter => !letter || typeof letter.id !== "string" || typeof letter.title !== "string" || typeof letter.description !== "string")
      || !Array.isArray(value.selected) || value.selected.some(id => !value.catalog.some(letter => letter.id === id))) {
      throw new Error("Brevvalen kunde inte läsas. Försök igen.");
    }
    return value;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
