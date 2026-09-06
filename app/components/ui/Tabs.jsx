"use client";

import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { createContext, useContext, useId } from "react";
import { cx } from "./layout";
import styles from "./ui.module.css";

const TabIds = createContext(null);
const valueId = (value) => encodeURIComponent(String(value));

// Explicit value-based associations survive hydration and rapid panel changes.
// Base UI still owns selection, roving focus, activation and hidden/inert state.

export function Tabs({ className, children, ...props }) {
  const id = useId();
  return (
    <TabIds.Provider value={id}>
      <BaseTabs.Root className={cx(styles.tabs, className)} {...props}>
        {children}
      </BaseTabs.Root>
    </TabIds.Provider>
  );
}
export function TabList({ label, className, ...props }) {
  return (
    <BaseTabs.List
      aria-label={label}
      className={cx(styles.tabList, className)}
      {...props}
    />
  );
}
export function Tab({ className, value, ...props }) {
  const scope = useContext(TabIds);
  const explicit = scope && value != null;
  return (
    <BaseTabs.Tab
      id={explicit ? `${scope}-tab-${valueId(value)}` : undefined}
      aria-controls={explicit ? `${scope}-panel-${valueId(value)}` : undefined}
      value={value}
      className={cx(styles.tab, className)}
      {...props}
    />
  );
}
export function TabPanel({ className, value, ...props }) {
  const scope = useContext(TabIds);
  const explicit = scope && value != null;
  return (
    <BaseTabs.Panel
      id={explicit ? `${scope}-panel-${valueId(value)}` : undefined}
      aria-labelledby={explicit ? `${scope}-tab-${valueId(value)}` : undefined}
      keepMounted
      value={value}
      className={cx(styles.tabPanel, className)}
      {...props}
    />
  );
}
