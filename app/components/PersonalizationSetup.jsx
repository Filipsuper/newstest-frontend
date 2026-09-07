"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FiX } from "react-icons/fi";
import { useAuthContext } from "../providers/AuthProvider";
import { setCompanyFollowing } from "../utils/api";
import { getCompanies } from "../utils/companies";
import StockSearch from "./StockSearch";
import PersonalPreview from "./PersonalPreview";
import { Button, IconButton } from "./ui/Button";
import { Heading, Inline, Stack, Text } from "./ui/layout";
import { Skeleton } from "./ui/data";
import styles from "./onboarding.module.css";

export default function PersonalizationSetup() {
  const { user, refreshUser } = useAuthContext();
  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [busy, setBusy] = useState(null),
    [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
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
  const cap = { free: 5, plus: 10, premium: 100 }[user?.plan] ?? 5;
  const hasPreferences =
    watchlist.length || user?.topics?.length || user?.keywords?.length;
  async function follow(company, followed) {
    if (pending.current || (followed && watchlist.includes(company.symbol)))
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
        <Stack gap={3}>
          <Heading as="h1" size="page">
            Vilka bolag vill du följa?
          </Heading>
          <Text size="sm" tone="secondary">
            Börja med ett bolag. Du kan ändra dina val när som helst.
          </Text>
        </Stack>
        {companiesLoading ? (
          <Skeleton />
        ) : companies.length > 0 ? (
          <fieldset
            className={styles.search}
            disabled={Boolean(busy) || watchlist.length >= cap}
          >
            <StockSearch
              label="Sök ett bolag att följa"
              placeholder="Sök bolag, till exempel Volvo"
              initialCompanies={companies}
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
        <Inline className={styles.between}>
          <Text size="xs" tone="secondary">
            {watchlist.length}/{cap} bolag i din plan
          </Text>
          <Text size="xs" tone="secondary">
            {busy ? "Sparar…" : "Sparas direkt"}
          </Text>
        </Inline>
        {watchlist.length >= cap && (
          <Text size="sm" tone="secondary">
            Du har valt så många bolag som ingår i din plan. Ta bort ett för att
            välja ett annat.
          </Text>
        )}
        {error && (
          <Text size="sm" role="alert">
            {error}
          </Text>
        )}
        <Text size="xs" role="status" className={styles.status}>
          {message}
        </Text>
        {watchlist.length > 0 && (
          <ul className={styles.rows} aria-label="Valda bolag">
            {watchlist.map((symbol) => {
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
                    disabled={Boolean(busy)}
                    onClick={() => follow(company, false)}
                  >
                    <FiX aria-hidden="true" />
                  </IconButton>
                </li>
              );
            })}
          </ul>
        )}
      </Stack>
      {hasPreferences ? (
        <>
          <Stack gap={4}>
            <div className={styles.actions}>
              <Button
                disabled={Boolean(busy)}
                nativeButton={false}
                role="link"
                render={<Link href="/bevakning" />}
              >
                Öppna min bevakning
              </Button>
              <Link href="/morgonbrevet" className={styles.link}>
                Läs Morgonbrevet
              </Link>
            </div>
          </Stack>
          <PersonalPreview />
          <Link href="/bevakning/hantera" className={styles.link}>
            Hantera ämnen och nyckelord
          </Link>
        </>
      ) : (
        <Link href="/morgonbrevet" className={styles.link}>
          Hoppa över och läs Morgonbrevet
        </Link>
      )}
      <Text size="xs" tone="secondary">
        Du väljer själv om du vill ha aviseringar. Personliga tillägg i
        Morgonbrevet ingår i Plus.
      </Text>
    </Stack>
  );
}
