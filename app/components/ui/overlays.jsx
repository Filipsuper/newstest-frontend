"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { Menu as BaseMenu } from "@base-ui/react/menu";
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { FiX } from "react-icons/fi";
import { IconButton } from "./Button";
import { cx } from "./layout";
import styles from "./ui.module.css";

export function Dialog({
  trigger,
  title,
  description,
  children,
  footer,
  className,
  variant,
  ...props
}) {
  return (
    <BaseDialog.Root {...props}>
      {trigger && <BaseDialog.Trigger render={trigger} />}
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className={styles.backdrop} />
        <BaseDialog.Viewport
          className={cx(
            styles.dialogViewport,
            variant === "reader" && styles.readerViewport,
          )}
        >
          <BaseDialog.Popup className={cx(styles.dialog, className)}>
            <div className={styles.dialogHeader}>
              <BaseDialog.Title
                className={cx(styles.heading, styles.heading_section)}
              >
                {title}
              </BaseDialog.Title>
              <BaseDialog.Close
                render={
                  <IconButton label="Stäng dialog">
                    <FiX aria-hidden="true" />
                  </IconButton>
                }
              />
            </div>
            {description && (
              <BaseDialog.Description className={styles.description}>
                {description}
              </BaseDialog.Description>
            )}
            <div className={styles.dialogBody}>{children}</div>
            {footer && <div className={styles.dialogFooter}>{footer}</div>}
          </BaseDialog.Popup>
        </BaseDialog.Viewport>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}

export function DialogClose({ render, children }) {
  return <BaseDialog.Close render={render}>{children}</BaseDialog.Close>;
}

/** Actions use a Menu. A form value uses Select. Routing uses real links. */
export function Menu({ trigger, items, label }) {
  return (
    <BaseMenu.Root>
      <BaseMenu.Trigger render={trigger} />
      <BaseMenu.Portal>
        <BaseMenu.Positioner
          className={styles.positioner}
          sideOffset={6}
          align="end"
        >
          <BaseMenu.Popup aria-label={label} className={styles.popup}>
            {items.map((item) => (
              <BaseMenu.Item
                key={item.id}
                className={cx(
                  styles.option,
                  item.destructive && styles.destructive,
                )}
                disabled={item.disabled}
                onClick={item.onClick}
                render={item.render}
              >
                <span className={styles.menuLabel}>
                  {item.icon}
                  {item.label}
                </span>
                {item.shortcut && (
                  <kbd className={styles.shortcut}>{item.shortcut}</kbd>
                )}
              </BaseMenu.Item>
            ))}
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}

export function Tooltip({ trigger, children }) {
  return (
    <BaseTooltip.Provider delay={350}>
      <BaseTooltip.Root>
        <BaseTooltip.Trigger render={trigger} />
        <BaseTooltip.Portal>
          <BaseTooltip.Positioner
            className={styles.tooltipPositioner}
            sideOffset={8}
          >
            <BaseTooltip.Popup className={styles.tooltip}>
              {children}
            </BaseTooltip.Popup>
          </BaseTooltip.Positioner>
        </BaseTooltip.Portal>
      </BaseTooltip.Root>
    </BaseTooltip.Provider>
  );
}
