import { cx } from "./layout";
import { changeTone, formatChange } from "./format";
import styles from "./ui.module.css";

export function Badge({ tone = "neutral", children, className, ...props }) {
  return (
    <span
      className={cx(styles.badge, styles[`tone_${tone}`], className)}
      {...props}
    >
      {children}
    </span>
  );
}

export function ChangeBadge({
  value,
  fallback = "Saknas",
  label,
  className,
  ...props
}) {
  return (
    <Badge
      tone={changeTone(value)}
      className={cx(styles.numeric, className)}
      aria-label={
        label ? `${label}: ${formatChange(value, fallback)}` : undefined
      }
      {...props}
    >
      {formatChange(value, fallback)}
    </Badge>
  );
}

export function DataList({ label, children, className, ...props }) {
  return (
    <ul
      aria-label={label}
      className={cx(styles.dataList, className)}
      {...props}
    >
      {children}
    </ul>
  );
}

/** Compose body/actions as siblings; never put a button inside another button. */
export function ListRow({
  as: Tag = "li",
  leading,
  children,
  trailing,
  highlighted = false,
  className,
  ...props
}) {
  return (
    <Tag
      className={cx(
        styles.listRow,
        highlighted && styles.highlighted,
        className,
      )}
      {...props}
    >
      {leading && <div className={styles.rowLeading}>{leading}</div>}
      <div className={styles.rowBody}>{children}</div>
      {trailing && <div className={styles.rowTrailing}>{trailing}</div>}
    </Tag>
  );
}

export function Skeleton({ className, ...props }) {
  return (
    <div
      aria-hidden="true"
      className={cx(styles.skeleton, className)}
      {...props}
    />
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  role,
  className,
}) {
  return (
    <div role={role} className={cx(styles.empty, className)}>
      {icon && (
        <span aria-hidden="true" className={styles.emptyIcon}>
          {icon}
        </span>
      )}
      <p className={styles.emptyTitle}>{title}</p>
      {description && <p className={styles.emptyDescription}>{description}</p>}
      {action}
    </div>
  );
}
