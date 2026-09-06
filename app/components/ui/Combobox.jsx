"use client";
import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { FiSearch } from "react-icons/fi";
import { cx } from "./layout";
import styles from "./ui.module.css";

/** Search behavior lives in Base UI; callers supply results and selection. */
export function Combobox({
  label,
  placeholder,
  items,
  query,
  onQueryChange,
  onSelect,
  renderItem,
  itemLabel,
  footer,
  autoFocus,
  side = "bottom",
  className,
  empty = "Inga resultat",
}) {
  return (
    <div className={cx(styles.field, className)}>
      <BaseCombobox.Root
        items={items}
        filter={null}
        value={null}
        inputValue={query}
        onInputValueChange={onQueryChange}
        onValueChange={(item) => {
          if (item) onSelect(item);
        }}
        itemToStringLabel={itemLabel}
        autoHighlight
      >
        <BaseCombobox.Label className={styles.srOnly}>
          {label}
        </BaseCombobox.Label>
        <div className={styles.inputWrap}>
          <FiSearch aria-hidden="true" className={styles.fieldIcon} />
          <BaseCombobox.Input
            autoFocus={autoFocus}
            className={styles.input}
            placeholder={placeholder}
          />
        </div>
        <BaseCombobox.Portal>
          <BaseCombobox.Positioner
            side={side}
            sideOffset={8}
            className={styles.positioner}
          >
            <BaseCombobox.Popup className={styles.popup}>
              <BaseCombobox.Empty className={styles.searchEmpty}>
                {empty}
              </BaseCombobox.Empty>
              <BaseCombobox.List>
                {(item) => (
                  <BaseCombobox.Item
                    key={item.symbol ?? item.value}
                    value={item}
                    className={styles.option}
                  >
                    {renderItem(item)}
                  </BaseCombobox.Item>
                )}
              </BaseCombobox.List>
              {footer && <div className={styles.searchFooter}>{footer}</div>}
            </BaseCombobox.Popup>
          </BaseCombobox.Positioner>
        </BaseCombobox.Portal>
      </BaseCombobox.Root>
    </div>
  );
}
