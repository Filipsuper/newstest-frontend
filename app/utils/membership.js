// Presentation of the existing access rules, not a source of authorization.
// Prices are unchanged; Stripe continues to resolve its configured lookup keys.
export const membershipPlans = [
  {
    id: "free",
    name: "Gratis",
    price: 0,
    description: "Din dagliga överblick över börsen.",
    features: [
      "Morgonbrevet och Kvällsbrevet",
      "Utvalda nyheter på Marknaden",
      "Aktieöversikter med kursgraf och nyheter",
      "Bevaka upp till 5 bolag med ett konto",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    price: 49,
    description: "Följ nyheterna och gå djupare i bolagen.",
    features: [
      "Allt i Gratis, med upp till 10 bevakade bolag",
      "Hela nyhetsflödet med sökning och kursreaktioner",
      "Personlig del i Morgonbrevet",
      "Screener, finansiell historik och analytikerestimat",
      "Tillgång till Terminal",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 99,
    description: "För dig som följer fler bolag.",
    features: ["Allt i Plus", "Bevaka upp till 100 bolag"],
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
