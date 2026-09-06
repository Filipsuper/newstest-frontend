import Link from "next/link";
import { articleHref, letterDate } from "../utils/editorial";
import { letterExcerpt } from "../utils/letters";
import { Label } from "./ui/Label";
import { Heading, Inline, Stack, Text } from "./ui/layout";
import styles from "./letter-card.module.css";

export default function LetterCard({ article }) {
  return (
    <article className={styles.card}>
      <Link href={articleHref(article.title)} className={styles.link}>
        <Stack gap={4}>
          <Inline gap={2}>
            <Label>
              {article.isEveningLetter ? "Kvällsbrevet" : "Morgonbrevet"}
            </Label>
            <Text
              as="time"
              size="xs"
              tone="secondary"
              dateTime={article.createdAt}
            >
              {letterDate(article.createdAt)}
            </Text>
          </Inline>
          <Heading size="subsection">{article.title}</Heading>
          <Text size="sm" tone="secondary">
            {letterExcerpt(article)}
          </Text>
          <Text as="span" size="sm">
            Läs brevet →
          </Text>
        </Stack>
      </Link>
    </article>
  );
}
