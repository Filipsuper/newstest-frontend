"use client";

import Link from "next/link";
import { ChangeBadge, ListRow } from "./data";
import { Button } from "./Button";
import { FiArrowRight, FiArrowUpRight } from "react-icons/fi";
import { cx } from "./layout";
import styles from "./news-row.module.css";
import CompanyLogo from "./CompanyLogo";

/** Presentation only: callers own sources, timestamps, relevance and detail navigation. */
export default function NewsRow({
  as = "article",
  company,
  companyHref,
  companyData,
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
  variant = "default",
  identityLabel,
  publicationMetadata,
  className,
  ...props
}) {
  const scan = variant === "scan";
  const editorial = variant === "editorial";
  const brief = variant === "brief";
  const separated = scan || editorial || brief;
  const reactionBadge = Number.isFinite(reaction)
    ? <ChangeBadge value={reaction} label={reactionLabel} />
    : leadingLabel ?? null;
  const readLink = href ? <Button variant="ghost" nativeButton={false} role="link"
    render={<Link href={href} scroll={false} />}>
    Läs nyheten <FiArrowRight aria-hidden="true" />
  </Button> : <Button variant="ghost" onClick={onOpen}>
    Läs nyheten <FiArrowRight aria-hidden="true" />
  </Button>;
  return (
    <ListRow
      as={as}
      leading={editorial || brief ? null : reactionBadge}
      highlighted={highlighted}
      className={cx(compact && styles.compact, scan && styles.scan, editorial && styles.editorial, brief && styles.brief, !editorial && !brief && !Number.isFinite(reaction) && leadingLabel && styles.sessionLeading, className)}
      data-news-layout={separated ? variant : undefined}
      {...props}
    >
      {separated && <div className={editorial || brief ? styles.newsHeader : undefined} data-news-header>
        {(editorial || brief) && reactionBadge && <span className={styles.headerSignal}>{reactionBadge}</span>}
        {(company || identityLabel) && <div className={styles.identityLine}>
          {company && (companyHref ? <Link href={companyHref} prefetch={false} className={cx(styles.company, styles.companyLink)}>
            {companyData && <CompanyLogo company={companyData} size="sm" />}
            {company}<FiArrowUpRight aria-hidden="true" />
          </Link> : <span className={styles.company}>{company}</span>)}
          {identityLabel}
        </div>}
      </div>}
      {href ? (
        <Link href={href} scroll={false} className={styles.headline}>
          {!separated && company && (
            <>
              <strong>{company}</strong>
              <span aria-hidden="true"> — </span>
            </>
          )}
          {title}
        </Link>
      ) : (
        <button type="button" className={styles.headline} onClick={onOpen}>
          {!separated && company && (
            <>
              <strong>{company}</strong>
              <span aria-hidden="true"> — </span>
            </>
          )}
          {title}
        </button>
      )}
      {description}
      {editorial ? <div className={styles.editorialFooter}>
        {publicationMetadata && <div className={styles.publication}>{publicationMetadata}</div>}
        {metadata && <div className={styles.metadata}>{metadata}</div>}
        <div className={styles.editorialActions}>
          {metadataAction && <span className={styles.metadataAction}>{metadataAction}</span>}
          <span className={styles.editorialRead}>{readLink}</span>
        </div>
      </div> : (metadata || (!scan && metadataAction)) && <div className={styles.metadata}>
        {metadata}
        {!scan && metadataAction && <span className={styles.metadataAction}>{metadataAction}</span>}
      </div>}
      {scan && <div className={styles.scanActions}>
        {readLink}
        {metadataAction && <span className={styles.metadataAction}>{metadataAction}</span>}
      </div>}
    </ListRow>
  );
}
