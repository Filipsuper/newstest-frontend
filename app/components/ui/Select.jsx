"use client";

import { Field } from "@base-ui/react/field";
import { Select as BaseSelect } from "@base-ui/react/select";
import { FiCheck, FiChevronDown } from "react-icons/fi";
import { cx } from "./layout";
import styles from "./ui.module.css";

/** Single-value select. Pass stable {value, label, disabled?} options. */
export function Select({
  label,
  hideLabel = false,
  options,
  placeholder = "Välj",
  className,
  ...props
}) {
  return (
    <Field.Root
      className={cx(styles.field, className)}
      disabled={props.disabled}
    >
      <Field.Label className={hideLabel ? styles.srOnly : styles.label}>
        {label}
      </Field.Label>
      <BaseSelect.Root items={options} {...props}>
        <BaseSelect.Trigger className={cx(styles.select, styles.control_md)}>
          <BaseSelect.Value placeholder={placeholder} />
          <BaseSelect.Icon>
            <FiChevronDown aria-hidden="true" />
          </BaseSelect.Icon>
        </BaseSelect.Trigger>
        <BaseSelect.Portal>
          <BaseSelect.Positioner
            className={styles.positioner}
            sideOffset={6}
            alignItemWithTrigger={false}
          >
            <BaseSelect.Popup className={styles.popup}>
              <BaseSelect.List className={styles.selectList}>
                {options.map((option) => (
                  <BaseSelect.Item
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className={styles.option}
                  >
                    <BaseSelect.ItemText>{option.label}</BaseSelect.ItemText>
                    <BaseSelect.ItemIndicator>
                      <FiCheck aria-hidden="true" />
                    </BaseSelect.ItemIndicator>
                  </BaseSelect.Item>
                ))}
              </BaseSelect.List>
            </BaseSelect.Popup>
          </BaseSelect.Positioner>
        </BaseSelect.Portal>
      </BaseSelect.Root>
    </Field.Root>
  );
}
