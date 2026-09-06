"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiArrowUpRight } from "react-icons/fi";
import { getCompanies } from "../utils/companies";
import { Combobox } from "./ui/Combobox";
import { Text } from "./ui/layout";

const popular = [
  "INVE-B.ST",
  "VOLV-B.ST",
  "SAAB-B.ST",
  "ATCO-A.ST",
  "ERIC-B.ST",
];
const normalize = (value) =>
  String(value || "")
    .toLocaleLowerCase("sv-SE")
    .trim();

export default function StockSearch({
  placeholder = "Sök bolag eller ticker",
  label = "Sök efter bolag eller ticker",
  onSelect,
  onNavigate,
  dropUp = false,
  autoFocus = false,
  showSuggestions = false,
  includeNews = false,
  initialCompanies,
  className,
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [companies, setCompanies] = useState(initialCompanies ?? []);
  useEffect(() => {
    let active = true;
    if (initialCompanies?.length) setCompanies(initialCompanies);
    else
      getCompanies().then((rows) => {
        if (active) setCompanies(rows);
      });
    return () => {
      active = false;
    };
  }, [initialCompanies]);
  const results = useMemo(() => {
    const q = normalize(query);
    if (!q)
      return showSuggestions
        ? popular
            .map((symbol) => companies.find((row) => row.symbol === symbol))
            .filter(Boolean)
        : [];
    return companies
      .filter(
        (row) =>
          normalize(row.name).includes(q) ||
          normalize(row.nativeSymbol).startsWith(q) ||
          normalize(row.symbol).startsWith(q),
      )
      .sort(
        (a, b) =>
          Number(!normalize(a.name).startsWith(q)) -
            Number(!normalize(b.name).startsWith(q)) ||
          a.name.localeCompare(b.name, "sv"),
      )
      .slice(0, 8);
  }, [companies, query, showSuggestions]);
  return (
    <Combobox
      className={className}
      label={label}
      placeholder={placeholder}
      items={results}
      query={query}
      onQueryChange={setQuery}
      onSelect={(row) => {
        setQuery("");
        if (onSelect) onSelect(row);
        else {
          onNavigate?.();
          router.push(`/aktie/${encodeURIComponent(row.symbol)}`);
        }
      }}
      itemLabel={(row) => row.name || row.symbol}
      renderItem={(row) => (
        <>
          <div>
            <Text as="span" size="sm">
              {row.name}
            </Text>
            <Text size="xs" tone="secondary">
              {row.nativeSymbol || row.symbol}
            </Text>
          </div>
          <FiArrowUpRight aria-hidden="true" />
        </>
      )}
      autoFocus={autoFocus}
      side={dropUp ? "top" : "bottom"}
      empty={
        companies.length
          ? "Inget bolag matchar sökningen."
          : "Bolagslistan är inte tillgänglig ännu."
      }
      footer={
        includeNews && query.trim() ? (
          <Link
            href={`/marknaden/nyheter?q=${encodeURIComponent(query.trim())}`}
            onClick={onNavigate}
          >
            Sök ”{query.trim()}” i nyheterna ↗
          </Link>
        ) : showSuggestions && !onSelect ? (
          <Link href="/aktier" onClick={onNavigate}>
            Utforska alla aktier ↗
          </Link>
        ) : null
      }
    />
  );
}
