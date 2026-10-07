"use client";

import { Combobox } from "@base-ui/react/combobox";
import { useId } from "react";
import { FiChevronDown } from "react-icons/fi";
import { cx } from "./layout";
import styles from "./ui.module.css";

/** A persistent form selection with Base UI-owned search, focus and keyboard behavior. */
export function SearchableSelect({ label, value, onValueChange, options, filter, renderOption,
    placeholder = "Sök eller välj", empty = "Inga nyckeltal matchar", className }) {
    const id = useId();
    return <div className={cx(styles.field, className)}>
        <Combobox.Root items={options} value={options.find(option => option.value === value) ?? null}
            onValueChange={(option, details) => {
                if (option) onValueChange(option.value);
                else {
                    // This field always has a selection; Escape must not clear it
                    // or swallow dismissal of its enclosing dialog.
                    details.cancel();
                    details.allowPropagation();
                }
            }}
            itemToStringLabel={option => option.label} isItemEqualToValue={(a, b) => a.value === b.value}
            filter={filter} autoHighlight>
            <label htmlFor={id} className={styles.label}>{label}</label>
            <div className={styles.inputWrap}>
                <Combobox.Input id={id} placeholder={placeholder} className={styles.input} />
                <Combobox.Trigger className={styles.searchSelectTrigger} aria-label={`Visa ${label.toLowerCase()}`}>
                    <FiChevronDown aria-hidden="true" />
                </Combobox.Trigger>
            </div>
            <Combobox.Portal>
                <Combobox.Positioner sideOffset={8} className={styles.positioner}>
                    <Combobox.Popup className={styles.popup}>
                        <Combobox.Empty className={styles.searchEmpty}>{empty}</Combobox.Empty>
                        <Combobox.List className={styles.selectList}>
                            {option => <Combobox.Item key={option.value} value={option} className={styles.option}
                                aria-label={option.label}>{renderOption ? renderOption(option) : option.label}</Combobox.Item>}
                        </Combobox.List>
                    </Combobox.Popup>
                </Combobox.Positioner>
            </Combobox.Portal>
        </Combobox.Root>
    </div>;
}
