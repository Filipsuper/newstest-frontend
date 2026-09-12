import Link from "next/link";
import { FiArrowRight, FiSun, FiMoon } from "react-icons/fi";
import { Heading, Inline, Stack, Text } from "./ui/layout";
import { Label } from "./ui/Label";
import { letterExcerpt, letterTakeaways } from "../utils/letters";
import { newsDate } from "../utils/newsroom";
import styles from "./letter-preview.module.css";

export default function LetterPreview({ article }) {
  const evening = article?.isEveningLetter;
  const name = evening ? "Kvällsbrevet" : "Morgonbrevet";
  const href = article
    ? evening
      ? "/kvallsbrevet"
      : "/morgonbrevet"
    : "/nyhetsbrev";
  const takeaways = letterTakeaways(article);
  return (
    <Stack as="aside" gap={3} className={styles.letter} aria-label="Senaste brevet">
      <Inline gap={2} className={styles.metadata}>
        <Label tone="accent" icon={evening ? <FiMoon /> : <FiSun />}>
          {article ? name : "Breven"}
        </Label>
        {article && (
          <Text as="time" size="xs" tone="secondary" dateTime={article.createdAt}>
            {newsDate(article.createdAt, {
              year: "numeric",
              hour: undefined,
              minute: undefined,
            })}
          </Text>
        )}
      </Inline>
      <Link href={href} className={styles.titleLink}>
        <Heading size="subsection">{article?.title || "Dagens börs, sammanfattad."}</Heading>
      </Link>
      {takeaways.length ? (
        <Stack as="ul" gap={2} className={styles.takeaways} aria-label="Ur brevet">
          {takeaways.map((takeaway, index) => (
            <Text as="li" size="sm" key={index}>{takeaway}</Text>
          ))}
        </Stack>
      ) : (
        <Text size="sm" tone="secondary">
          {letterExcerpt(article, 160) || "Läs de senaste morgon- och kvällsbreven."}
        </Text>
      )}
      <Inline className={styles.actions}>
        <Link className={styles.textLink} href={href}>
          Läs brevet <FiArrowRight aria-hidden="true" />
        </Link>
        <Link className={styles.textLink} href="/nyhetsbrev#prenumerera">
          Få i mejlen
        </Link>
      </Inline>
    </Stack>
  );
}
