"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { companyAlertsEnabled, requestCompanyAlerts } from "../utils/companyAlerts";

const UPDATED = "omxsum:company-alerts-updated";

export function useCompanyAlerts(user) {
  const enabled = companyAlertsEnabled() && Boolean(user?.email);
  const key = JSON.stringify([user?.email, user?.plan, user?.verified, user?.watchlist]);
  const account = user?.email?.toLowerCase() || "";
  const identity = useRef({ account, key, epoch: 0 });
  const latest = useRef(null);
  if (identity.current.account !== account) {
    // A → B → A is a new account context too; never revive the first A's work.
    identity.current = { account, key, epoch: identity.current.epoch + 1 };
    latest.current = null;
  } else identity.current.key = key;
  const accountEpoch = identity.current.epoch;
  const version = useRef(0);
  const pending = useRef(null);
  const [snapshot, setSnapshot] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [retry, setRetry] = useState(0);
  const reload = useCallback(() => setRetry((value) => value + 1), []);

  const accept = useCallback((resource, requestVersion, requestKey, requestEpoch) => {
    const current = identity.current;
    if (current.key !== requestKey || current.epoch !== requestEpoch
      || resource.destination.toLowerCase() !== current.account) {
      throw new Error("Kontot har ändrats. Hämta mejlvalen igen.");
    }
    const previous = latest.current;
    if (previous && (resource.revision < previous.resource.revision
      || (resource.revision === previous.resource.revision && requestVersion < previous.requestVersion))) {
      // Preserve a newer GET even if a slow, already-successful PUT arrives last.
      // An older-context entitlement is not a safe fallback after follows/plan change.
      if (previous.key !== requestKey) throw new Error("Mejlvalen har uppdaterats. Hämta de senaste valen igen.");
      return previous.resource;
    }
    latest.current = { key: requestKey, resource, requestVersion };
    return resource;
  }, []);

  useEffect(() => {
    setSaveError(null);
    if (!enabled) { setSnapshot(null); return; }
    const controller = new AbortController();
    const requestVersion = ++version.current;
    setSnapshot((previous) => ({ key, accountEpoch, loading: true,
      resource: previous?.key === key && previous.accountEpoch === accountEpoch ? previous.resource : null, error: null }));
    requestCompanyAlerts({ signal: controller.signal }).then((resource) => {
      if (controller.signal.aborted || requestVersion !== version.current
        || identity.current.key !== key || identity.current.epoch !== accountEpoch) return;
      const accepted = accept(resource, requestVersion, key, accountEpoch);
      setSnapshot({ key, accountEpoch, resource: accepted, loading: false, error: null });
    }).catch((error) => {
      if (controller.signal.aborted || requestVersion !== version.current
        || identity.current.key !== key || identity.current.epoch !== accountEpoch) return;
      setSnapshot((previous) => ({ key, accountEpoch,
        resource: previous?.key === key && previous.accountEpoch === accountEpoch ? previous.resource : null, loading: false, error }));
    });
    return () => controller.abort();
  }, [enabled, key, accountEpoch, retry, accept]);

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener(UPDATED, reload);
    window.addEventListener("focus", reload);
    return () => {
      window.removeEventListener(UPDATED, reload);
      window.removeEventListener("focus", reload);
    };
  }, [enabled, reload]);

  useEffect(() => () => { pending.current?.abort(); }, [key, accountEpoch]);

  const save = useCallback(async (draft) => {
    if (!enabled || pending.current) throw new Error("Vänta tills mejlvalen har sparats.");
    const controller = new AbortController();
    pending.current = controller;
    const requestVersion = ++version.current;
    setSaving(true);
    setSaveError(null);
    try {
      const resource = await requestCompanyAlerts({ draft, signal: controller.signal });
      if (controller.signal.aborted || identity.current.key !== key || identity.current.epoch !== accountEpoch) {
        throw new Error("Kontot har ändrats. Hämta mejlvalen igen.");
      }
      const accepted = accept(resource, requestVersion, key, accountEpoch);
      setSnapshot({ key, accountEpoch, resource: accepted, loading: false, error: null });
      window.dispatchEvent(new Event(UPDATED));
      return accepted;
    } catch (error) {
      if (identity.current.key === key && identity.current.epoch === accountEpoch) setSaveError(error);
      throw error;
    } finally {
      if (pending.current === controller) pending.current = null;
      setSaving(false);
    }
  }, [enabled, key, accountEpoch, accept]);

  const currentSnapshot = snapshot?.key === key && snapshot.accountEpoch === accountEpoch ? snapshot : null;
  return {
    resource: currentSnapshot?.resource ?? null,
    loading: enabled && (!currentSnapshot || currentSnapshot.loading),
    error: currentSnapshot?.error ?? null,
    saving, saveError, reload, save,
  };
}
