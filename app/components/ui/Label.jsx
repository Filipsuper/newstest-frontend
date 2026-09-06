import { cx } from "./layout";
import styles from "./label.module.css";

/** Non-interactive taxonomy/edition label. Use Badge for status and ChangeBadge for data. */
export function Label({
  children,
  icon,
  tone = "neutral",
  className,
  ...props
}) {
  return (
    <span
      className={cx(
        styles.label,
        tone === "accent" && styles.accent,
        className,
      )}
      {...props}
    >
      {icon && (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      )}
      <span>{children}</span>
    </span>
  );
}
