"use client";

import Link from "next/link";
import { ChangeBadge, ListRow } from "./data";
import styles from "./news-row.module.css";

/** Presentation only: callers own sources, timestamps, relevance and detail navigation. */
export default function NewsRow({
  as = "article",
  company,
  title,
  reaction,
  reactionLabel = "Kursförändring",
  metadata,
  onOpen,
  href,
  highlighted,
  ...props
}) {
  return (
    <ListRow
      as={as}
      leading={
        <ChangeBadge value={reaction} fallback="Nyhet" label={reactionLabel} />
      }
      highlighted={highlighted}
      {...props}
    >
      {href ? (
        <Link href={href} scroll={false} className={styles.headline}>
          {company && (
            <>
              <strong>{company}</strong>
              <span aria-hidden="true"> — </span>
            </>
          )}
          {title}
        </Link>
      ) : (
        <button type="button" className={styles.headline} onClick={onOpen}>
          {company && (
            <>
              <strong>{company}</strong>
              <span aria-hidden="true"> — </span>
            </>
          )}
          {title}
        </button>
      )}
      {metadata && <div className={styles.metadata}>{metadata}</div>}
    </ListRow>
  );
}
