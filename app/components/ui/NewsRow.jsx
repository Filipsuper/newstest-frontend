"use client";

import Link from "next/link";
import { ChangeBadge, ListRow } from "./data";
import { cx } from "./layout";
import styles from "./news-row.module.css";

/** Presentation only: callers own sources, timestamps, relevance and detail navigation. */
export default function NewsRow({
  as = "article",
  company,
  title,
  description,
  reaction,
  reactionLabel = "Kursförändring",
  metadata,
  onOpen,
  href,
  highlighted,
  compact = false,
  className,
  ...props
}) {
  return (
    <ListRow
      as={as}
      leading={
        <ChangeBadge value={reaction} fallback="Nyhet" label={reactionLabel} />
      }
      highlighted={highlighted}
      className={cx(compact && styles.compact, className)}
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
      {description}
      {metadata && <div className={styles.metadata}>{metadata}</div>}
    </ListRow>
  );
}
