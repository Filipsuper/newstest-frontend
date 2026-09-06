"use client";

import { Button as BaseButton } from "@base-ui/react/button";
import { FiLoader } from "react-icons/fi";
import { cx } from "./layout";
import styles from "./ui.module.css";

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  className,
  ...props
}) {
  return (
    <BaseButton
      type="button"
      className={cx(
        styles.button,
        styles[`button_${variant}`],
        styles[`control_${size}`],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <FiLoader className={styles.spinner} aria-hidden="true" />}
      {children}
    </BaseButton>
  );
}

export function IconButton({
  label,
  children,
  variant = "ghost",
  className,
  ...props
}) {
  return (
    <Button
      variant={variant}
      aria-label={label}
      className={cx(styles.iconButton, className)}
      {...props}
    >
      {children}
    </Button>
  );
}
