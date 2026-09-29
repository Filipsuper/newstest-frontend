/** Authentication rejection means signed out; a failed account read is unknown. */
export async function requestAccount({ fetcher = fetch, timeoutMs = 10000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(`${(process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/$/, "")}/user`, {
      credentials: "include", cache: "no-store", signal: controller.signal,
    });
    const guest = { email: null, verified: false, plan: "free" };
    // /user uses 403 for an expired/invalid login token, not a plan restriction.
    if ([401, 403].includes(response.status)) return guest;
    if (!response.ok) throw Object.assign(new Error("Kontot kunde inte hämtas. Försök igen."), { status: response.status });
    const value = await response.json();
    // Compatibility with the existing backend's missing-cookie response.
    if (value?.error === "No token provided") return guest;
    if (!value?.error && value?.email === null && value.plan === "free") return guest;
    if (value?.error || typeof value?.email !== "string" || !value.email.includes("@")) {
      throw new Error("Kontot kunde inte läsas. Försök igen.");
    }
    return value;
  } finally { clearTimeout(timer); }
}
