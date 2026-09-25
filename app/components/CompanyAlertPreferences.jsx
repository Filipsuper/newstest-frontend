"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FiChevronDown, FiChevronRight } from "react-icons/fi";
import LogInModal from "../modals/logInModal";
import { COMPANY_ALERT_LEVELS, companyAlertDraft } from "../utils/companyAlerts";
import { Button } from "./ui/Button";
import { Switch } from "./ui/Choices";
import { Label } from "./ui/Label";
import { Slider } from "./ui/Slider";
import { TextField } from "./ui/TextField";
import { Skeleton } from "./ui/data";
import { Inline, Stack, Text } from "./ui/layout";
import styles from "./company-alert-preferences.module.css";

const DESCRIPTIONS = {
  relevant: "Fler affärsnyheter om dina bolag, med fokus på betydande besked.",
  important: "Rapporter och andra tydligt betydande bolagshändelser.",
  major: "De mest betydande beskeden, som vinstvarningar och stora affärer.",
};
const SLIDER_LEVELS = [...COMPANY_ALERT_LEVELS].reverse();
const SLIDER_OPTIONS = SLIDER_LEVELS.map((level) => ({
  value: level.value, label: level.label,
  description: `${DESCRIPTIONS[level.value]} Rutinmeddelanden filtreras bort.`,
}));
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const symbolKey = (symbol) => String(symbol).trim().toUpperCase();
const errorText = (error) => error?.message || "Mejlvalen kunde inte sparas. Dina ändringar finns kvar – försök igen.";

function comparable(draft) {
  return JSON.stringify({
    enabled: draft.enabled,
    importanceLevel: draft.importanceLevel,
    mutedSymbols: [...draft.mutedSymbols].sort(),
    quietHours: draft.quietHours,
    timeZone: draft.timeZone,
  });
}

function changed(edit) {
  return Boolean(edit && comparable(edit.draft) !== comparable(edit.base));
}

function fromResource(resource, identity) {
  return { identity, base: companyAlertDraft(resource), draft: companyAlertDraft(resource) };
}

function RouteAction({ href, children }) {
  return <Button variant="ghost" nativeButton={false} role="link" render={<Link href={href} />}>{children}</Button>;
}

/** Draft-only editor; the owning hook supplies authenticated snapshots and writes. */
export default function CompanyAlertPreferences({ alerts, user, companies = [], collapsible = false, open = true, onOpenChange, onDraftStateChange }) {
  const identity = user?.email?.toLowerCase() || "";
  const identityRef = useRef(identity);
  identityRef.current = identity;
  const resource = alerts.resource;
  const [edit, setEdit] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const pending = useRef(false);
  const [failure, setFailure] = useState(null);
  const [dismissedError, setDismissedError] = useState(null);
  const [message, setMessage] = useState("");
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [timeErrors, setTimeErrors] = useState({});
  const statusId = useId();
  const bodyId = useId();
  const busy = submitting || alerts.saving;
  const currentEdit = edit?.identity === identity ? edit : null;
  const draft = currentEdit?.draft;
  const dirty = changed(currentEdit);
  const saveError = failure || (alerts.saveError !== dismissedError ? alerts.saveError : null);
  const conflict = saveError?.status === 409;
  const newerSnapshot = Boolean(resource && currentEdit && resource.revision !== currentEdit.base.revision);

  useEffect(() => { onDraftStateChange?.({ dirty, busy }); }, [dirty, busy, onDraftStateChange]);
  useEffect(() => () => onDraftStateChange?.({ dirty: false, busy: false }), [onDraftStateChange]);
  useEffect(() => {
    if (!dirty && !busy) return;
    const warn = event => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, busy]);

  function frame(content, toggle = null, footer = null) {
    return <Stack gap={collapsible && !open && !footer ? 0 : 4} className={styles.root}
      aria-label="Mejlval" aria-busy={busy || alerts.loading || undefined}>
      {collapsible && <div className={styles.header}>
        <Button variant="ghost" className={styles.disclosure} aria-expanded={open}
          aria-controls={bodyId} onClick={() => onOpenChange(!open)}>
          {open ? <FiChevronDown aria-hidden="true" /> : <FiChevronRight aria-hidden="true" />}
          Mejl om mina bolag
        </Button>
        {toggle}
      </div>}
      <div id={bodyId} hidden={collapsible && !open}>{content}</div>
      {footer}
    </Stack>;
  }

  useEffect(() => {
    setFailure(null);
    setDismissedError(null);
    setMessage("");
    setVerifyOpen(false);
    setTimeErrors({});
  }, [identity]);

  useEffect(() => {
    if (!resource) return;
    setEdit((previous) => {
      if (previous?.identity !== identity) return fromResource(resource, identity);
      // A follow change or another mounted editor can refresh this snapshot.
      // Never replace a dirty draft, including while resolving a 409 conflict.
      if (!changed(previous) && !pending.current) return fromResource(resource, identity);
      return previous;
    });
  }, [resource, identity]);

  const followed = useMemo(
    () => [...new Set((user?.watchlist || []).filter((symbol) => typeof symbol === "string").map(symbolKey))],
    [user?.watchlist],
  );
  const companyNames = useMemo(
    () => new Map(companies.map((company) => [symbolKey(company.symbol), company.name || company.symbol])),
    [companies],
  );
  const muted = new Set((draft?.mutedSymbols || []).map(symbolKey));
  const alertCount = followed.filter((symbol) => !muted.has(symbol)).length;
  const companyLimit = resource?.entitlement.companyLimit;
  const overLimit = resource ? alertCount > companyLimit : false;
  // Muting the final company preserves an existing opt-in. A first activation
  // or a server-fenced resumption still needs at least one unmuted company.
  const blockedEnable = !resource?.verified || !resource?.entitlement.eligible
    || (alertCount === 0 && !resource?.enabled) || overLimit || resource?.delivery.status === "suppressed";
  const renewedOptInRequired = resource && !resource.enabled && (
    currentEdit?.base.enabled
    || ["requires_plan", "requires_verification", "over_limit", "resume_required"].includes(resource.delivery.status)
  );

  function clearFeedback(resolveConflict = false) {
    setFailure((previous) => !resolveConflict && previous?.status === 409 ? previous : null);
    if (resolveConflict || alerts.saveError?.status !== 409) setDismissedError(alerts.saveError);
    setMessage("");
  }

  function update(patch) {
    clearFeedback();
    setTimeErrors({});
    setEdit((previous) => ({ ...previous, draft: { ...previous.draft, ...patch } }));
  }

  function reset() {
    clearFeedback();
    setTimeErrors({});
    // Ordinary undo returns to the draft's baseline, not an unreviewed GET.
    setEdit((previous) => ({ ...previous, draft: companyAlertDraft(previous.base) }));
  }

  function reviewLatest(keepChanges) {
    if (!resource || alerts.loading || alerts.error) return;
    clearFeedback(true);
    setTimeErrors({});
    setEdit((previous) => keepChanges
      ? {
        identity,
        base: companyAlertDraft(resource),
        draft: { ...previous.draft, revision: resource.revision, ...(renewedOptInRequired ? { enabled: false } : {}) },
      }
      : fromResource(resource, identity));
    setMessage(keepChanges
      ? renewedOptInRequired
        ? "Dina övriga ändringar finns kvar. För att återuppta behöver du slå på mejlvalet igen och spara."
        : "Dina ändringar finns kvar. Granska dem och spara igen."
      : "De sparade mejlvalen visas nu.");
  }

  async function save(disableOnly = false) {
    if (!draft || pending.current || alerts.saving || alerts.loading || alerts.error || newerSnapshot || conflict) return;
    const next = disableOnly ? { ...draft, enabled: false } : draft;
    const invalid = {};
    if (!TIME.test(next.quietHours.start)) invalid.start = "Ange en giltig starttid.";
    if (!TIME.test(next.quietHours.end)) invalid.end = "Ange en giltig sluttid.";
    if (next.quietHours.enabled && !invalid.start && !invalid.end && next.quietHours.start === next.quietHours.end) {
      invalid.end = "Välj en annan sluttid, eller stäng av tysta timmar.";
    }
    setTimeErrors(invalid);
    if (Object.keys(invalid).length || (next.enabled && blockedEnable)) return;
    const savingIdentity = identity;
    pending.current = true;
    setSubmitting(true);
    clearFeedback();
    try {
      const saved = await alerts.save(companyAlertDraft(next));
      if (identityRef.current !== savingIdentity) return;
      setEdit(fromResource(saved, identity));
      setMessage(saved.delivery.available
        ? "Dina mejlval har sparats."
        : "Mejlval sparade. Inga mejl skickas ännu.");
    } catch (error) {
      if (identityRef.current === savingIdentity) setFailure(error);
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  }

  if (!user || (identity && !draft && alerts.loading)) {
    return frame(
      <Stack gap={3} className={styles.root} role="status" aria-label="Hämtar mejlval">
        <Text size="sm" tone="secondary">Hämtar mejlval…</Text>
        <Skeleton className={styles.loadingLine} />
        <Skeleton className={styles.loadingControl} />
      </Stack>
    );
  }

  if (!identity) {
    return frame(
      <Stack gap={2} className={styles.root}>
        <Text size="sm" tone="secondary">Mejlbevakning förbereds för Plus och Pro. Logga in för att hantera dina val.</Text>
        <Inline><RouteAction href="/settings">Logga in</RouteAction></Inline>
      </Stack>
    );
  }

  if (!draft || !resource) {
    return frame(
      <Stack gap={2} className={styles.root}>
        <Text size="sm" role={alerts.loading ? "status" : "alert"}>
          {alerts.loading ? "Hämtar mejlval…" : alerts.error?.message || "Mejlvalen är inte tillgängliga just nu."}
        </Text>
        <Inline>
          <Button variant="secondary" loading={alerts.loading} onClick={alerts.reload}>Försök igen</Button>
          {alerts.error?.status === 401 && <RouteAction href="/settings">Logga in igen</RouteAction>}
        </Inline>
      </Stack>
    );
  }

  const feedback = (
    <>
      {alerts.error && (
        <Stack gap={2}>
          <Text size="sm" role="alert">Mejlvalen kunde inte uppdateras. Dina ändringar finns kvar.</Text>
          <Inline>
            <Button variant="secondary" onClick={alerts.reload}>Försök igen</Button>
            {alerts.error.status === 401 && <RouteAction href="/settings">Logga in igen</RouteAction>}
          </Inline>
        </Stack>
      )}
      {(newerSnapshot || conflict) && (
        <Stack gap={2} className={styles.review}>
          <Text size="sm" role="alert">De sparade mejlvalen har ändrats. Dina ändringar finns kvar och skrivs inte över.</Text>
          {newerSnapshot && !alerts.loading && !alerts.error ? (
            <>
              <Text size="sm" tone="secondary">
                Sparat: {resource.enabled ? "mejlval på" : "mejlval av"} · {COMPANY_ALERT_LEVELS.find((level) => level.value === resource.importanceLevel)?.label}.
                {" "}{resource.quietHours.enabled ? `Tysta timmar ${resource.quietHours.start}–${resource.quietHours.end}` : "Tysta timmar av"} ({resource.timeZone}).
              </Text>
              <Text size="sm" tone="secondary" className={styles.wrap}>
                Pausade bolag: {resource.mutedSymbols.length
                  ? resource.mutedSymbols.map((symbol) => companyNames.get(symbolKey(symbol)) || symbol).join(", ")
                  : "inga"}.
              </Text>
              {renewedOptInRequired && <Text size="sm" tone="secondary">Mejlvalet förblir av när du behåller ändringarna. Du behöver uttryckligen slå på det igen för att återuppta.</Text>}
              <Inline>
                <Button variant="secondary" disabled={busy} onClick={() => reviewLatest(true)}>Behåll mina ändringar</Button>
                <Button variant="ghost" disabled={busy} onClick={() => reviewLatest(false)}>Använd sparade val</Button>
              </Inline>
            </>
          ) : (
            <Inline><Button variant="secondary" loading={alerts.loading} onClick={alerts.reload}>Hämta sparade mejlval</Button></Inline>
          )}
        </Stack>
      )}
      {saveError && !conflict && <Text size="sm" className={styles.error} role="alert">{errorText(saveError)}</Text>}
      {message && <Text size="sm" role="status">{message}</Text>}
    </>
  );

  if (!resource.entitlement.eligible) {
    return frame(
      <Stack gap={2} className={styles.root}>
        <Inline><Label>Plus</Label><Text size="sm">{resource.delivery.available
          ? "Viktiga nyheter om dina bolag, direkt i mejlen"
          : "Mejlbevakning förbereds för Plus och Pro"}</Text></Inline>
        <Text size="sm" tone="secondary">Din bevakning fungerar som tidigare. Mejl kräver Plus eller Pro och ett separat aktivt val.</Text>
        <Inline>
          <RouteAction href="/pro">{resource.delivery.available ? "Se Plus" : "Om Plus och Pro"}</RouteAction>
          {resource.enabled && <Button variant="secondary" loading={busy} onClick={() => save(true)}>Pausa mejlval</Button>}
        </Inline>
        {feedback}
      </Stack>
    );
  }

  const toggle = <Switch
    label="Mejl om mina bolag"
    className={collapsible ? styles.headerSwitch : undefined}
    checked={draft.enabled}
    disabled={busy || (!draft.enabled && blockedEnable)}
    aria-describedby={!resource.delivery.available ? statusId : undefined}
    onCheckedChange={(enabled) => update({ enabled })}
  />;

  return frame(
    <Stack gap={4}>
      <Stack gap={2}>
        {!collapsible && toggle}
        <Text size="sm" tone="secondary">Mejl omfattar bolag du följer. Ämnen och nyckelord används på webbplatsen och i personliga brev, inte i separata mejl ännu.</Text>
        <Text size="sm" tone="secondary" className={styles.wrap}>
          {resource.verified ? "Till bekräftad mejladress:" : "Kontots mejladress:"} {resource.destination}
        </Text>
        {!resource.delivery.available && <Text id={statusId} size="xs" tone="secondary">Inga mejl skickas ännu.</Text>}
      </Stack>

      {!resource.verified && (
        <Stack gap={1}>
          <Text size="sm">Bekräfta kontots mejladress innan du aktiverar mejl. Efter en adressändring behöver du också välja att återuppta.</Text>
          <Inline><Button variant="ghost" onClick={() => setVerifyOpen((value) => !value)}>
            {verifyOpen ? "Stäng bekräftelse" : "Bekräfta mejladress"}
          </Button></Inline>
          {verifyOpen && <LogInModal redirectTo="/marknaden/bevakning/hantera?section=email" />}
        </Stack>
      )}
      {resource.delivery.status === "suppressed" && (
        <Stack gap={1}>
          <Text size="sm">Mejl är pausade för den här adressen. Att ändra mejlvalen häver inte pausen.</Text>
          <Inline><RouteAction href="/settings">Kontoinställningar och hjälp</RouteAction></Inline>
        </Stack>
      )}
      {resource.delivery.status === "resume_required" && (
        <Text size="sm">Mejlvalen är pausade. Slå på Mejl om mina bolag och spara för att återuppta ditt val. Tidigare nyheter skickas inte i efterhand.</Text>
      )}
      {overLimit ? (
        <Text size="sm">Välj upp till {companyLimit} bolag för mejl. Pausa några under Bolagsval nedan; de finns kvar i Bevakning. Slå sedan på mejlvalet och spara.</Text>
      ) : resource.delivery.status === "over_limit" && (
        <Text size="sm">Bolagen ryms nu inom ditt medlemskap. Slå på mejlvalet och spara för att återuppta. Tidigare nyheter skickas inte i efterhand.</Text>
      )}
      {alertCount === 0 && (
        <Text size="sm">Inga bolag får mejl just nu. {followed.length
          ? "Du kan välja bolag under Bolagsval utan att ta bort dem från Bevakning."
          : "Lägg till ett bolag i Bevakning för att kunna aktivera mejl."}</Text>
      )}

      <Stack gap={3}>
        <Slider
          label="Nyhetsnivå"
          options={SLIDER_OPTIONS}
          value={draft.importanceLevel}
          onValueChange={(importanceLevel) => update({ importanceLevel })}
          disabled={busy}
        />
      </Stack>

      <details className={styles.details}>
        <summary>Bolagsval · {alertCount} av {followed.length} valda</summary>
        <Stack gap={3} className={styles.detailsBody}>
          <ul className={styles.companyList}>
            {followed.map((symbol) => (
              <li key={symbol}>
                <Switch
                  label={companyNames.get(symbol) || symbol}
                  checked={!muted.has(symbol)}
                  disabled={busy}
                  onCheckedChange={(included) => update({
                    mutedSymbols: included
                      ? draft.mutedSymbols.filter((saved) => symbolKey(saved) !== symbol)
                      : [...draft.mutedSymbols, symbol],
                  })}
                />
              </li>
            ))}
          </ul>
        </Stack>
      </details>

      <details className={styles.details} open={Object.keys(timeErrors).length ? true : undefined}>
        <summary>Tysta timmar · {draft.quietHours.enabled ? `${draft.quietHours.start}–${draft.quietHours.end}` : "Av"}</summary>
        <Stack gap={3} className={styles.detailsBody}>
          <Switch
            label="Tysta timmar"
            description="Samla nyheter till efter de tysta timmarna."
            checked={draft.quietHours.enabled}
            disabled={busy}
            onCheckedChange={(enabled) => update({ quietHours: { ...draft.quietHours, enabled } })}
          />
          <div className={styles.times}>
            <TextField label="Från" type="time" value={draft.quietHours.start} error={timeErrors.start} disabled={busy}
              onValueChange={(start) => update({ quietHours: { ...draft.quietHours, start } })} />
            <TextField label="Till" type="time" value={draft.quietHours.end} error={timeErrors.end} disabled={busy}
              onValueChange={(end) => update({ quietHours: { ...draft.quietHours, end } })} />
          </div>
          <Text size="sm" tone="secondary" className={styles.wrap}>Tidszon: {draft.timeZone}. Sommar- och vintertid följer tidszonen.</Text>
        </Stack>
      </details>

    </Stack>,
    toggle,
    (!collapsible || open || dirty || busy || alerts.error || newerSnapshot || saveError || message) ? <Stack gap={3}>
      {feedback}
      {(!collapsible || open || dirty || busy) &&
      <Stack gap={2}>
        <Inline>
          <Button loading={busy} disabled={!dirty || alerts.loading || Boolean(alerts.error) || newerSnapshot || conflict || (draft.enabled && blockedEnable)} onClick={() => save()}>
            {busy ? "Sparar mejlval…" : "Spara mejlval"}
          </Button>
          <Button variant="ghost" disabled={!dirty || busy} onClick={reset}>Ångra</Button>
        </Inline>
        {(alerts.loading || dirty) && <Text size="sm" tone="secondary" role="status">
          {alerts.loading ? "Uppdaterar sparade mejlval…" : "Du har osparade mejlval."}
        </Text>}
      </Stack>}
    </Stack> : null
  );
}
