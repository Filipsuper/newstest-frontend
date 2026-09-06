import styles from "./ui.module.css";

export const cx = (...values) => values.filter(Boolean).join(" ");

export function Container({
  as: Tag = "div",
  children,
  className,
  reading = false,
  ...props
}) {
  return (
    <Tag
      className={cx(styles.container, reading && styles.reading, className)}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function Stack({
  as: Tag = "div",
  children,
  gap = 4,
  className,
  style,
  ...props
}) {
  return (
    <Tag
      className={cx(styles.stack, className)}
      style={{ "--ui-gap": `var(--ui-space-${gap})`, ...style }}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function Inline({
  as: Tag = "div",
  children,
  gap = 2,
  className,
  style,
  ...props
}) {
  return (
    <Tag
      className={cx(styles.inline, className)}
      style={{ "--ui-gap": `var(--ui-space-${gap})`, ...style }}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function Surface({
  as: Tag = "div",
  children,
  tone = "raised",
  className,
  ...props
}) {
  return (
    <Tag
      className={cx(
        styles.surface,
        tone === "inset" && styles.inset,
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function Heading({
  as: Tag = "h2",
  size = "section",
  children,
  className,
  ...props
}) {
  return (
    <Tag
      className={cx(styles.heading, styles[`heading_${size}`], className)}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function Text({
  as: Tag = "p",
  size = "md",
  tone = "default",
  numeric = false,
  children,
  className,
  ...props
}) {
  return (
    <Tag
      className={cx(
        styles.text,
        styles[`text_${size}`],
        tone === "secondary" && styles.secondary,
        numeric && styles.numeric,
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

/** Route links keep anchor semantics. Use Tabs only for in-page panels. */
export function NavigationTabs({ label, children, className, ...props }) {
  return (
    <nav
      aria-label={label}
      className={cx(styles.navigation, className)}
      {...props}
    >
      {children}
    </nav>
  );
}
