"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";
import { addEmail } from "../utils/api";
import { letterExcerpt } from "../utils/letters";
import { newsDate } from "../utils/newsroom";
import { Button } from "./ui/Button";
import { TextField } from "./ui/TextField";
import { SegmentedControl } from "./ui/SegmentedControl";
import { Container, Heading, Inline, Stack, Text, Surface } from "./ui/layout";
import { EmptyState } from "./ui/data";
import styles from "./workspace.module.css";
import ui from "./ui/ui.module.css";

export default function LetterLibrary({ articles, unavailable = false }) {
  const [filter, setFilter] = useState("all");
  const [visible, setVisible] = useState(12);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const editions = useMemo(
    () =>
      [...articles]
        .filter(
          (article) =>
            filter === "all" ||
            Boolean(article.isEveningLetter) === (filter === "evening"),
        )
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [articles, filter],
  );
  async function subscribe(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await addEmail(
        email.trim(),
        new FormData(event.currentTarget).get("website"),
      );
      if (!result || result.error)
        throw new Error(result?.msg || "Prenumerationen kunde inte sparas.");
      setMessage(
        result.alreadyVerified
          ? "Du prenumererar redan. Välkommen tillbaka!"
          : "Kontrollera din e-post och bekräfta prenumerationen via länken.",
      );
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Container as="main" className={styles.workspace}>
      <header className={styles.heading}>
        <Stack gap={2}>
          <Heading as="h1" size="page">
            Breven
          </Heading>
          <Text size="sm" tone="secondary">
            Börsdagen, redigerad till det viktigaste. Morgon och kväll.
          </Text>
        </Stack>
        <Button
          variant="secondary"
          nativeButton={false}
          render={<a href="#prenumerera" />}
        >
          Få breven i mejlen
        </Button>
      </header>
      <Stack gap={6}>
        <SegmentedControl
          label="Välj brev"
          value={filter}
          onValueChange={(value) => {
            setFilter(value);
            setVisible(12);
          }}
          options={[
            { value: "all", label: "Alla brev" },
            { value: "morning", label: "Morgonbrevet" },
            { value: "evening", label: "Kvällsbrevet" },
          ]}
        />
        {unavailable ? (
          <EmptyState
            role="alert"
            title="Breven kunde inte hämtas"
            action={
              <Button
                variant="secondary"
                onClick={() => window.location.reload()}
              >
                Försök igen
              </Button>
            }
          />
        ) : !editions.length ? (
          <EmptyState title="Inga brev i urvalet ännu" />
        ) : (
          <div className={styles.library}>
            {editions.slice(0, visible).map((article) => (
              <article
                key={article._id || article.id || article.title}
                className={styles.letter}
              >
                <Inline className={styles.between}>
                  <Text size="xs" tone="secondary">
                    {article.isEveningLetter ? "Kvällsbrevet" : "Morgonbrevet"}
                  </Text>
                  <Text
                    as="time"
                    size="xs"
                    tone="secondary"
                    dateTime={article.createdAt}
                  >
                    {newsDate(article.createdAt, {
                      hour: undefined,
                      minute: undefined,
                    })}
                  </Text>
                </Inline>
                <Link
                  href={`/article/${encodeURIComponent(article.title.replaceAll("-", "_").replaceAll(" ", "-"))}`}
                >
                  <Heading>{article.title}</Heading>
                </Link>
                <Text>{letterExcerpt(article)}</Text>
                <Link
                  className={styles.textLink}
                  href={`/article/${encodeURIComponent(article.title.replaceAll("-", "_").replaceAll(" ", "-"))}`}
                >
                  Läs brevet <FiArrowRight aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        )}
        {editions.length > visible && (
          <Button
            variant="secondary"
            onClick={() => setVisible((value) => value + 12)}
          >
            Visa äldre brev
          </Button>
        )}
        <Surface as="section" id="prenumerera">
          <Stack gap={4}>
            <Heading>En bra start. Ett tydligt avslut.</Heading>
            <Text size="sm" tone="secondary">
              Få morgon- och kvällsbreven kostnadsfritt. Bekräfta
              prenumerationen i din e-post.
            </Text>
            <form className={styles.keywordForm} onSubmit={subscribe}>
              <input
                className={ui.srOnly}
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
              />
              <TextField
                label="E-postadress"
                type="email"
                required
                autoComplete="email"
                value={email}
                onValueChange={setEmail}
                error={error}
                placeholder="namn@exempel.se"
              />
              <Button type="submit" loading={busy}>
                Prenumerera
              </Button>
            </form>
            {message && (
              <Text size="sm" role="status">
                {message}
              </Text>
            )}
          </Stack>
        </Surface>
      </Stack>
    </Container>
  );
}
