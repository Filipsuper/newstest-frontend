import Link from "next/link";
import { FiArrowRight, FiSun, FiMoon } from "react-icons/fi";
import { Heading, Inline, Text } from "./ui/layout";
import { letterExcerpt } from "../utils/letters";
import { newsDate } from "../utils/newsroom";
import styles from "./workspace.module.css";

export default function LetterPreview({ article }) {
  const evening = article?.isEveningLetter;
  const name = evening ? "Kvällsbrevet" : "Morgonbrevet";
  const href = article
    ? evening
      ? "/kvallsbrevet"
      : "/morgonbrevet"
    : "/nyhetsbrev";
  return (
    <aside className={styles.letter} aria-label="Dagens brev">
      <Inline className={styles.between}>
        <span className={styles.letterMark}>
          {evening ? (
            <FiMoon aria-hidden="true" />
          ) : (
            <FiSun aria-hidden="true" />
          )}
        </span>
        <Text as="span" size="xs" tone="secondary">
          {article
            ? newsDate(article.createdAt, {
                hour: undefined,
                minute: undefined,
              })
            : "Breven"}
        </Text>
      </Inline>
      <Text size="xs" tone="secondary">
        {name}
      </Text>
      <Link href={href}>
        <Heading>{article?.title || "Dagens börs, sammanfattad."}</Heading>
      </Link>
      <Text>
        {letterExcerpt(article) || "Läs de senaste morgon- och kvällsbreven."}
      </Text>
      <Inline className={styles.between}>
        <Link className={styles.textLink} href={href}>
          Läs brevet <FiArrowRight aria-hidden="true" />
        </Link>
        <Link className={styles.textLink} href="/nyhetsbrev#prenumerera">
          Få i mejlen
        </Link>
      </Inline>
    </aside>
  );
}
