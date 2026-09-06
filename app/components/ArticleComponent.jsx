"use client";
import Link from "next/link";
import { FiSun, FiMoon } from "react-icons/fi";
import ShareArticleComponent from "./ShareArticleComponent";
import LetterBody from "./LetterBody";
import { useCompanyMap } from "../utils/useCompanyMap";
import { readingMinutes, letterDate, letterChange } from "../utils/editorial";
import { stripSummaryMarkup } from "../utils/stripSummaryMarkup";
import { Button } from "./ui/Button";
import { Label } from "./ui/Label";
import { ChangeBadge } from "./ui/data";
import { Container, Heading, Inline, Stack, Text } from "./ui/layout";
import styles from "./editorial.module.css";

export default function ArticleComponent({ article }) {
  const {
    title,
    createdAt,
    summary,
    bulletPoints,
    introText,
    omxPrice,
    omxChangePercentage,
  } = article;
  const resolveSymbol = useCompanyMap();
  const companies = new Map();
  for (const match of String(summary ?? "").matchAll(/&&([\s\S]*?)&&/g)) {
    const name = match[1].trim();
    const symbol = resolveSymbol?.(name);
    if (symbol && !companies.has(symbol)) companies.set(symbol, name);
  }
  const bullets = String(bulletPoints ?? "")
    .split("\n")
    .map((line) => stripSummaryMarkup(line.replace(/^\s*[-*•]\s*/, "")))
    .filter(Boolean)
    .slice(0, 3);
  const change = letterChange(omxChangePercentage);
  const quote = omxPrice == null ? "" : String(omxPrice).trim();
  return (
    <Container as="article" reading className={styles.article}>
      <Stack gap={8}>
        <Inline className={styles.toolbar}>
          <Button
            variant="ghost"
            nativeButton={false}
            render={<Link href="/nyhetsbrev" />}
          >
            ← Alla brev
          </Button>
          <ShareArticleComponent key={title} title={title} />
        </Inline>
        <Stack gap={4} as="header">
          <Inline gap={3}>
            <Label
              tone="accent"
              icon={article.isEveningLetter ? <FiMoon /> : <FiSun />}
            >
              {article.isEveningLetter ? "Kvällsbrevet" : "Morgonbrevet"}
            </Label>
            <Text as="time" size="xs" tone="secondary" dateTime={createdAt}>
              {letterDate(createdAt)}
            </Text>
            <Text as="span" size="xs" tone="secondary">
              {readingMinutes(summary)} min läsning
            </Text>
          </Inline>
          <Heading as="h1" size="page" className={styles.title}>
            {title}
          </Heading>
          {introText && (
            <Text className={styles.intro}>
              {stripSummaryMarkup(introText)}
            </Text>
          )}
        </Stack>
        {(bullets.length > 0 || change !== null || quote) && (
          <section className={styles.brief} aria-label="Brevet i korthet">
            {bullets.length > 0 && (
              <>
                <Heading size="subsection">I korthet</Heading>
                <ul className={styles.highlights}>
                  {bullets.map((bullet, index) => (
                    <li key={index}>{bullet}</li>
                  ))}
                </ul>
              </>
            )}
            {(change !== null || quote) && (
              <div className={styles.snapshot}>
                <Text as="span" size="xs" tone="secondary">
                  Sverige30 · IG, sparat i brevet
                </Text>
                {quote && (
                  <Text as="span" size="sm" numeric>
                    {quote}
                  </Text>
                )}
                <ChangeBadge value={change} label="IG Sverige30 i brevet" />
              </div>
            )}
          </section>
        )}
        {summary ? (
          <LetterBody summary={summary} resolveSymbol={resolveSymbol} />
        ) : (
          <Text tone="secondary">
            Brevets innehåll är inte tillgängligt just nu.
          </Text>
        )}
        {companies.size > 0 && (
          <Stack gap={4} as="section" aria-labelledby="mentioned-companies">
            <Heading id="mentioned-companies" size="subsection">
              Bolag i brevet
            </Heading>
            <Inline gap={2}>
              {[...companies].map(([symbol, name]) => (
                <Button
                  key={symbol}
                  variant="secondary"
                  nativeButton={false}
                  render={
                    <Link href={`/aktie/${encodeURIComponent(symbol)}`} />
                  }
                >
                  {name} →
                </Button>
              ))}
            </Inline>
          </Stack>
        )}
        <section className={styles.next} aria-label="Följ börsdagen">
          <Stack gap={1}>
            <Heading size="subsection">Följ nyheterna vidare</Heading>
            <Text size="sm" tone="secondary">
              Dagens händelser och aktiernas reaktioner.
            </Text>
          </Stack>
          <Button nativeButton={false} render={<Link href="/marknaden" />}>
            Till Marknaden →
          </Button>
        </section>
        <Inline className={styles.toolbar}>
          <Button
            variant="ghost"
            nativeButton={false}
            render={<Link href="/nyhetsbrev" />}
          >
            Fler brev →
          </Button>
          <Button
            variant="secondary"
            nativeButton={false}
            render={<Link href="/nyhetsbrev#prenumerera" />}
          >
            Få Morgonbrevet i mejlen
          </Button>
        </Inline>
      </Stack>
    </Container>
  );
}
