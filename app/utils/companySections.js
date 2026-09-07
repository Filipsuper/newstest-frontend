export const COMPANY_SECTIONS = [
  { id: "overview", label: "Översikt" },
  { id: "news", label: "Nyheter & reaktioner" },
  { id: "financials", label: "Finansiellt", plus: true },
  { id: "estimates", label: "Estimat", plus: true },
  { id: "valuation", label: "Värdering", plus: true },
  { id: "insiders", label: "Insyn & ägare", plus: true },
  { id: "shorts", label: "Blankning", plus: true },
  { id: "calendar", label: "Kalender" },
];

export const companySection = (value) => COMPANY_SECTIONS.find(
  (section) => section.id === String(value ?? "").replace(/^#/, ""),
)?.id ?? "overview";

// Keep chart/share parameters; legacy tabs become document anchors.
export function companySectionHref(pathname, search, id) {
  const params = new URLSearchParams(search);
  params.delete("tab");
  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ""}#${companySection(id)}`;
}
