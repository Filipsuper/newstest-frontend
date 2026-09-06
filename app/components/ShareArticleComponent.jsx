"use client";
import { useState } from "react";
import { FiShare2, FiCopy, FiCheck } from "react-icons/fi";
import { articleHref } from "../utils/editorial";
import { Button } from "./ui/Button";
import { Inline, Text } from "./ui/layout";
import styles from "./editorial.module.css";

export default function ShareArticleComponent({ title }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const url = `https://omxsum.com${articleHref(title)}`;
  async function share(copy = false) {
    setError("");
    try {
      if (!copy && navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      }
    } catch (error) {
      if (error.name !== "AbortError")
        setError("Länken kunde inte kopieras. Använd länken nedan.");
    }
  }
  return (
    <div className={styles.share}>
      <Inline className={styles.shareActions}>
        <Button variant="ghost" onClick={() => share()}>
          <FiShare2 aria-hidden="true" />
          Dela brevet
        </Button>
        <Button variant="ghost" onClick={() => share(true)}>
          {copied ? (
            <FiCheck aria-hidden="true" />
          ) : (
            <FiCopy aria-hidden="true" />
          )}
          Kopiera länk
        </Button>
      </Inline>
      {copied && (
        <Text size="xs" role="status">
          Länk kopierad
        </Text>
      )}
      {error && (
        <Text size="xs" role="alert" className={styles.shareFeedback}>
          {error}{" "}
          <a className={styles.link} href={url}>
            {url}
          </a>
        </Text>
      )}
    </div>
  );
}
