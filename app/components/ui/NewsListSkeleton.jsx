import { ListRow, Skeleton } from "./data";
import { cx } from "./layout";
import styles from "./news-list-skeleton.module.css";

/** Same surface, padding and gaps as news rows; never implies real data. */
export default function NewsListSkeleton({
  count = 4,
  compact = false,
  label = "Hämtar nyheter",
}) {
  return (
    <div className={styles.rows} role="status" aria-label={label} aria-busy="true">
      {Array.from({ length: count }, (_, index) => (
        <ListRow
          as="div"
          key={index}
          aria-hidden="true"
          leading={!compact && <Skeleton className={styles.badge} />}
        >
          <div className={styles.copy}>
            <Skeleton className={cx(styles.line, styles.title)} />
            <Skeleton className={cx(styles.line, styles.continuation)} />
            <div className={styles.metadata}>
              <Skeleton className={cx(styles.line, styles.time)} />
              <Skeleton className={cx(styles.line, styles.source)} />
            </div>
          </div>
        </ListRow>
      ))}
    </div>
  );
}
