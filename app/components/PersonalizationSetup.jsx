"use client";
import { companyLimit as membershipCompanyLimit } from '../utils/membership';

import { useEffect, useRef, useState } from "react";
import { FiPlus, FiX } from "react-icons/fi";
import { useAuthContext } from "../providers/AuthProvider";
import { setCompanyFollowing } from "../utils/api";
import { getCompanies } from "../utils/companies";
import StockSearch, { STOCK_SEARCH_SUGGESTIONS } from "./StockSearch";
import { Button, IconButton } from "./ui/Button";
import { Inline, Stack, Text } from "./ui/layout";
import { Skeleton } from "./ui/data";
import styles from "./onboarding.module.css";

export default function PersonalizationSetup({ suggestedSymbol, onBusyChange, onboarding = false, disabled = false }) {
  const { user, refreshUser } = useAuthContext();
  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [busy, setBusy] = useState(null),
    [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    let active = true;
    setCompaniesLoading(true);
    getCompanies().then((rows) => {
      if (active) {
        setCompanies(rows);
        setCompaniesLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [retry]);
  const watchlist = user?.watchlist ?? [];
  const cap = membershipCompanyLimit(user?.plan);
  const suggested = companies.find(company => company.symbol === suggestedSymbol?.toUpperCase());
  const suggestions = [...STOCK_SEARCH_SUGGESTIONS.map(symbol => companies.find(company => company.symbol === symbol)).filter(Boolean), ...companies]
    .filter((company, index, rows) => !watchlist.includes(company.symbol) && company.symbol !== suggested?.symbol
      && rows.findIndex(row => row.symbol === company.symbol) === index).slice(0, 3);
  useEffect(() => { onBusyChange?.(Boolean(busy)); }, [busy, onBusyChange]);
  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);
  async function follow(company, followed) {
    if (disabled || pending.current || (followed && (watchlist.includes(company.symbol) || watchlist.length >= cap)))
      return;
    pending.current = true;
    setBusy(company.symbol);
    setError("");
    setMessage("");
    try {
      await setCompanyFollowing(company.symbol, followed);
      const account = await refreshUser();
      if (!account?.email)
        throw new Error(
          "Valet är sparat, men kontot kunde inte hämtas. Försök öppna kontot igen.",
        );
      setMessage(
        followed
          ? `${company.name || company.symbol} är sparat.`
          : `${company.name || company.symbol} har tagits bort.`,
      );
    } catch (error) {
      setError(error.message || "Valet kunde inte sparas. Försök igen.");
    } finally {
      pending.current = false;
      setBusy(null);
    }
  }
  return (
    <Stack gap={8}>
      <Stack gap={4}>
        {suggested && !watchlist.includes(suggested.symbol) && <div className={styles.company}>
          <Stack gap={1}><Text size="xs" tone="secondary">Du ville följa</Text><Text size="sm">{suggested.name}</Text></Stack>
          <Button variant="secondary" disabled={disabled || Boolean(busy) || watchlist.length >= cap} onClick={() => follow(suggested, true)}>Följ {suggested.name}</Button>
        </div>}
        {companiesLoading ? (
          <Skeleton />
        ) : companies.length > 0 ? (
          <fieldset
            className={styles.search}
            disabled={disabled || Boolean(busy) || watchlist.length >= cap}
          >
            <StockSearch
              label="Sök ett bolag att följa"
              placeholder="Sök bolag, till exempel Volvo"
              initialCompanies={companies}
              showSuggestions
              selectionAction="follow"
              onSelect={(row) => follow(row, true)}
            />
          </fieldset>
        ) : (
          <Button
            variant="ghost"
            onClick={() => setRetry((value) => value + 1)}
          >
            Hämta bolagslistan igen
          </Button>
        )}
        {onboarding && !companiesLoading && watchlist.length < cap && suggestions.length > 0 && <Stack gap={2}>
          <Text size="xs" tone="secondary">Till exempel</Text>
          <Inline gap={2}>
            {suggestions.map(company => <Button key={company.symbol} variant="secondary" disabled={disabled || Boolean(busy)}
              onClick={() => follow(company, true)} aria-label={`Följ ${company.name || company.symbol}`}>
              <FiPlus aria-hidden="true" />{company.name || company.symbol}
            </Button>)}
          </Inline>
        </Stack>}
        <Text size="xs" tone="secondary" role="status">
          {watchlist.length}/{cap} bolag{busy ? " · Sparar…" : watchlist.length ? " · Sparat" : ""}
        </Text>
        {watchlist.length >= cap && (
          <Text size="sm" tone="secondary">
            {onboarding ? "Alla platser är valda. Ta bort ett bolag för att byta."
              : `Din plan har plats för ${cap} bolag. Ta bort ett bolag eller byt plan för att lägga till fler.`}
          </Text>
        )}
        {error && (
          <Text size="sm" role="alert">
            {error}
          </Text>
        )}
        {message && <Text size="xs" role="status">{message}</Text>}
        {watchlist.length > 0 && (
          <ul className={styles.rows} aria-label="Valda bolag">
            {(onboarding && !showAll ? watchlist.slice(0, 3) : watchlist).map((symbol) => {
              const company = companies.find(
                (row) => row.symbol === symbol,
              ) || { symbol, name: symbol };
              return (
                <li className={styles.company} key={symbol}>
                  <Stack gap={1}>
                    <Text size="sm">{company.name}</Text>
                    <Text size="xs" tone="secondary">
                      {company.nativeSymbol || symbol}
                    </Text>
                  </Stack>
                  <IconButton
                    label={`Ta bort ${company.name}`}
                    loading={busy === symbol}
                    disabled={disabled || Boolean(busy)}
                    onClick={() => follow(company, false)}
                  >
                    <FiX aria-hidden="true" />
                  </IconButton>
                </li>
              );
            })}
          </ul>
        )}
        {onboarding && watchlist.length > 3 && <Inline><Button variant="ghost" aria-expanded={showAll}
          onClick={() => setShowAll(value => !value)}>{showAll ? "Visa färre bolag" : `Visa alla ${watchlist.length} bolag`}</Button></Inline>}
      </Stack>
    </Stack>
  );
}
