"use client";

import { Field } from "@base-ui/react/field";
import { cx } from "./layout";
import styles from "./ui.module.css";

export function TextField({
  label,
  hideLabel = false,
  description,
  error,
  leading,
  trailing,
  className,
  inputRef,
  disabled,
  ...props
}) {
  return (
    <Field.Root
      className={cx(styles.field, className)}
      invalid={Boolean(error)}
      disabled={disabled}
    >
      <Field.Label className={hideLabel ? styles.srOnly : styles.label}>
        {label}
      </Field.Label>
      <div className={styles.inputWrap}>
        {leading && (
          <span className={styles.fieldIcon} aria-hidden="true">
            {leading}
          </span>
        )}
        <Field.Control ref={inputRef} className={styles.input} {...props} />
        {trailing}
      </div>
      {description && (
        <Field.Description className={styles.description}>
          {description}
        </Field.Description>
      )}
      {error && (
        <Field.Error match className={styles.fieldError}>
          {error}
        </Field.Error>
      )}
    </Field.Root>
  );
}
