"use client";

import { useId } from "react";
import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { FiCheck } from "react-icons/fi";
import { cx } from "./layout";
import styles from "./ui.module.css";

export function Checkbox({ label, description, className, ...props }) {
  const descriptionId = useId();
  return (
    <label className={cx(styles.choice, className)}>
      <BaseCheckbox.Root
        className={styles.checkbox}
        aria-describedby={description ? descriptionId : undefined}
        {...props}
      >
        <BaseCheckbox.Indicator className={styles.checkIndicator}>
          <FiCheck aria-hidden="true" />
        </BaseCheckbox.Indicator>
      </BaseCheckbox.Root>
      <span>
        <span className={styles.label}>{label}</span>
        {description && (
          <span id={descriptionId} className={styles.choiceDescription}>
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

export function Switch({ label, description, className, ...props }) {
  const descriptionId = useId();
  return (
    <label className={cx(styles.choice, styles.switchChoice, className)}>
      <span>
        <span className={styles.label}>{label}</span>
        {description && (
          <span id={descriptionId} className={styles.choiceDescription}>
            {description}
          </span>
        )}
      </span>
      <BaseSwitch.Root
        className={styles.switch}
        aria-describedby={description ? descriptionId : undefined}
        {...props}
      >
        <BaseSwitch.Thumb className={styles.switchThumb} />
      </BaseSwitch.Root>
    </label>
  );
}
