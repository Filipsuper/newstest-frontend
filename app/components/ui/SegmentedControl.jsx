"use client";

import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Toggle } from "@base-ui/react/toggle";
import { cx } from "./layout";
import styles from "./ui.module.css";

/** A mandatory single selection, not page navigation. Arrow keys move focus. */
export function SegmentedControl({
  label,
  options,
  value,
  onValueChange,
  variant = "inset",
  className,
  ...props
}) {
  return (
    <ToggleGroup
      aria-label={label}
      value={[value]}
      onValueChange={(values, details) => {
        if (values.length) onValueChange(values[0], details);
      }}
      className={cx(
        styles.segments,
        variant === "plain" && styles.segmentsPlain,
        className,
      )}
      {...props}
    >
      {options.map((option) => (
        <Toggle
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          className={styles.segment}
        >
          {option.label}
        </Toggle>
      ))}
    </ToggleGroup>
  );
}
