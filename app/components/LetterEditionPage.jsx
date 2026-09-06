import Link from "next/link";
import ArticleComponent from "./ArticleComponent";
import { latestEdition, letterDate } from "../utils/editorial";
import { Container, Heading, Stack, Text } from "./ui/layout";
import { Button } from "./ui/Button";
import { EmptyState } from "./ui/data";
import styles from "./editorial.module.css";

export default function LetterEditionPage({
  articles,
  evening = false,
  unavailable = false,
}) {
  const { article, isToday } = latestEdition(articles, evening);
  const name = evening ? "Kvällsbrevet" : "Morgonbrevet";
  if (unavailable || !article)
    return (
      <Container as="main" reading className={styles.editionEmpty}>
        <Stack gap={6}>
          <Heading as="h1" size="page">
            {name}
          </Heading>
          <EmptyState
            title={
              unavailable
                ? "Brevet kunde inte hämtas"
                : "Inget brev publicerat ännu"
            }
            description={
              unavailable
                ? "Försök igen om en stund eller öppna brevarkivet."
                : "Under tiden finns dagens nyheter på Marknaden."
            }
            action={
              <Button
                variant="secondary"
                nativeButton={false}
                render={<Link href="/nyhetsbrev" />}
              >
                Till brevarkivet →
              </Button>
            }
          />
        </Stack>
      </Container>
    );
  return (
    <main>
      {!isToday && (
        <Container reading className={styles.notice}>
          <Text size="sm" tone="secondary">
            Senast publicerade {name.toLowerCase()} ·{" "}
            {letterDate(article.createdAt)}
          </Text>
        </Container>
      )}
      <ArticleComponent article={article} />
    </main>
  );
}
