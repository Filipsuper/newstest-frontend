// Presentation of the existing access rules, not a source of authorization.
// Prices are unchanged; Stripe continues to resolve its configured lookup keys.
export function companyLimit(plan) {
  return plan === "premium" ? 100 : plan === "plus" ? 20 : 2;
}

export function hasTerminalPlan(user) {
  return Boolean(user?.email) && user.plan === "premium";
}

export const membershipPlans = [
  {
    id: "free",
    name: "Gratis",
    price: 0,
    description: "Börja med börsdagen och dina första bolag.",
    features: [
      "Morgonbrevet på mejl och båda breven på sajten",
      "Utvalda nyheter på Marknaden",
      "Aktieöversikter med kursgraf och nyheter",
      `Följ upp till ${companyLimit('free')} bolag i Mina bolag`,
      "Nyheter som matchar dina ämnen och nyckelord",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    price: 49,
    description: "Nyheter och bolagsanalys för dig som vill förstå dina investeringar.",
    features: [
      `Allt i Gratis, med upp till ${companyLimit('plus')} följda bolag`,
      "Hela nyhetsflödet med sökning och kursreaktioner",
      "Personlig del i Morgonbrevet",
      "Finansiella grafer: resultat, kassaflöde och skuld",
      "Korta AI-sammanfattningar av VD-ord",
      "Estimat, värdering, insyn och blankning",
      "Screener för att filtrera och jämföra bolag",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 99,
    description: "För dig som vill arbeta med fler bolag och verktyg samtidigt.",
    features: ["Allt i Plus", `Följ upp till ${companyLimit('premium')} bolag`,
      "Exklusiv tillgång till OMXsum Terminal",
      "Nyhetsflöde och flera bolagsgrafer i samma arbetsyta",
      "Movers, relativ volym och intradagsscreener"],
  },
];

export function memberPlan(user) {
  if (!user?.email) return null;
  return user.plan === "premium"
    ? "pro"
    : user.plan === "plus"
      ? "plus"
      : "free";
}

export function checkoutDestination(response) {
  if (response?.error) throw new Error("Checkout unavailable");
  const url = new URL(response?.url);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "checkout.stripe.com" ||
    url.port ||
    url.username ||
    url.password
  )
    throw new Error("Invalid checkout destination");
  return url.href;
}
