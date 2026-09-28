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
  leadingLabel,
  reactionLabel = "Kursförändring",
  metadata,
  metadataAction,
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
      leading={Number.isFinite(reaction)
        ? <ChangeBadge value={reaction} label={reactionLabel} />
        : leadingLabel ?? null}
      highlighted={highlighted}
      className={cx(compact && styles.compact, !Number.isFinite(reaction) && leadingLabel && styles.sessionLeading, className)}
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
      {(metadata || metadataAction) && <div className={styles.metadata}>
        {metadata}
        {metadataAction && <span className={styles.metadataAction}>{metadataAction}</span>}
      </div>}
    </ListRow>
  );
}
