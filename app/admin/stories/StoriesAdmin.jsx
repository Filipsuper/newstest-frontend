'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuthContext } from '../../providers/AuthProvider';
import LogInModal from '../../modals/logInModal';
import OmxsumStoryReader from '../../components/OmxsumStoryReader';
import { Button } from '../../components/ui/Button';
import { Container, Heading, Inline, Stack, Text } from '../../components/ui/layout';
import { Dialog } from '../../components/ui/overlays';
import { Select } from '../../components/ui/Select';
import { Label } from '../../components/ui/Label';
import { newsDate } from '../../utils/newsroom';
import { ADMIN_STORY_STATUSES, STORY_WITHDRAWAL_REASONS, StoriesAdminError, adminStoryBlockerLabel, adminStoryCheckLabel, adminStoryStatusLabel, checkedAdminDetail, checkedAdminList,
    checkedAdminSession, requestStoriesAdmin, sameStoryActionBinding, storiesAdminBaseUrl, storyActionBinding, storyActionBody } from '../../utils/storiesAdmin';
import styles from './stories-admin.module.css';

const time = value => newsDate(value, { year: 'numeric' });
const message = error => error instanceof StoriesAdminError ? error.message : 'Anslutningen kunde inte bekräftas. Läs om status innan du försöker igen.';

export default function StoriesAdmin() {
    const [privateDocument, setPrivateDocument] = useState(false);
    useEffect(() => {
        if (window.__OMXSUM_PRIVATE_DOCUMENT__ !== true) {
            // Public trackers may already be running after SPA navigation. Do
            // not fetch even the admin session until a fresh private document.
            window.location.replace(window.location.href);
            return;
        }
        setPrivateDocument(true);
    }, []);
    return privateDocument ? <AuthorizedStoriesAdmin /> : <Container as="main" className={styles.page}>
        <Heading as="h1">Stories-admin</Heading><Text size="sm" role="status">Öppnar den skyddade redaktionsvyn…</Text>
    </Container>;
}

function AuthorizedStoriesAdmin() {
    const { user } = useAuthContext();
    const [access, setAccess] = useState('loading'), [session, setSession] = useState(null);
    const [items, setItems] = useState([]), [selected, setSelected] = useState(null), [detail, setDetail] = useState(null);
    const [loadError, setLoadError] = useState(''), [detailError, setDetailError] = useState('');
    const [filter, setFilter] = useState('all'), [refresh, setRefresh] = useState(0);
    const [confirmation, setConfirmation] = useState(null), [confirmed, setConfirmed] = useState(false);
    const [reasonCode, setReasonCode] = useState('editorial_review'), [actionError, setActionError] = useState('');
    const [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
    const [mustRefresh, setMustRefresh] = useState(false);
    const pending = useRef(false), mutationController = useRef(null), mounted = useRef(true);
    const base = useRef(null);

    useEffect(() => { mounted.current = true; return () => { mounted.current = false; mutationController.current?.abort(); }; }, []);
    function deny(error) {
        setSession(null); setItems([]); setSelected(null); setDetail(null); setConfirmation(null); setNotice('');
        setAccess(error.status === 401 ? 'signed-out' : 'forbidden');
    }
    useEffect(() => {
        const controller = new AbortController();
        setAccess('loading'); setSession(null); setItems([]); setDetail(null); setConfirmation(null); setLoadError('');
        (async () => {
            try {
                base.current = storiesAdminBaseUrl(process.env.NEXT_PUBLIC_API_URL || '/api', window.location.origin);
                const nextSession = checkedAdminSession(await requestStoriesAdmin(base.current, '/session', { signal: controller.signal }));
                // A denied session never requests drafts, articles or originals.
                const list = checkedAdminList(await requestStoriesAdmin(base.current, '', { signal: controller.signal }));
                if (controller.signal.aborted) return;
                setSession(nextSession); setItems(list.items); setAccess('authorized');
                setSelected(previous => list.items.find(row => row.id === previous?.id) || list.items[0] || null);
            } catch (error) {
                if (controller.signal.aborted) return;
                if ([401, 403].includes(error.status)) deny(error);
                else { setAccess('error'); setLoadError(message(error)); }
            }
        })();
        return () => controller.abort();
    }, [refresh, user?.email, user?.verified]);

    useEffect(() => {
        const controller = new AbortController();
        setDetail(null); setDetailError(''); setConfirmation(null);
        if (session && selected) (async () => {
            try {
                const value = await requestStoriesAdmin(base.current, `/${selected.id}?revision=${selected.revision}`, { signal: controller.signal });
                const next = checkedAdminDetail(value, selected);
                if (!controller.signal.aborted) { setDetail(next); setMustRefresh(false); }
            } catch (error) {
                if (controller.signal.aborted) return;
                if ([401, 403].includes(error.status)) deny(error); else setDetailError(message(error));
            }
        })();
        return () => controller.abort();
    }, [session, selected?.id, selected?.revision, selected?.contentHash]);

    function openConfirmation(action) {
        if (!detail || detail.storageKind === 'manual_draft' || pending.current || mustRefresh) return;
        const ready = detail.storageKind === 'historical_archive'
            ? detail.manualPublication?.available === true && session?.capabilities.writesEnabled === true && session?.capabilities.manualPublicationEnabled === true
            : session?.capabilities.operatorConfigured;
        if (!ready || (action === 'publish' ? !detail.actions.canPublish || detail.actions.blockers.length : !detail.actions.canWithdraw)) return;
        setConfirmation({ action, binding: storyActionBinding(detail), headline: detail.article.headline });
        setConfirmed(false); setActionError(''); setReasonCode('editorial_review');
    }
    async function performAction() {
        if (pending.current || mustRefresh || !session || !detail || detail.storageKind === 'manual_draft' || !confirmation || !sameStoryActionBinding(confirmation.binding, detail)) return;
        const ready = detail.storageKind === 'historical_archive'
            ? detail.manualPublication?.available === true && session.capabilities.writesEnabled === true && session.capabilities.manualPublicationEnabled === true
            : session.capabilities.operatorConfigured;
        const allowed = ready && (confirmation.action === 'publish'
            ? detail.actions.canPublish && !detail.actions.blockers.length : detail.actions.canWithdraw);
        if (!allowed) return;
        pending.current = true; setBusy(true); setActionError('');
        const controller = new AbortController(); mutationController.current = controller;
        try {
            const body = storyActionBody(confirmation.action, confirmation.binding, { confirmed, reasonCode });
            await requestStoriesAdmin(base.current, `/${confirmation.binding.id}/${confirmation.action === 'publish' ? 'approve-publish' : 'withdraw'}`,
                { method: 'POST', csrfToken: session.csrfToken, body, signal: controller.signal });
            if (!mounted.current) return;
            setConfirmation(null); setNotice(confirmation.action === 'publish' ? 'Publiceringen har registrerats. Status läses om.' : 'Artikeln har dragits tillbaka. Status läses om.');
            setRefresh(value => value + 1);
        } catch (error) {
            if (!mounted.current) return;
            if ([401, 403].includes(error.status)) deny(error);
            else {
                setActionError(error instanceof StoriesAdminError ? message(error)
                    : 'Vi fick inget säkert svar. Publiceringen kan ha hunnit genomföras. Stäng dialogen och läs om status innan ett nytt försök.');
                // Never automatically replay a write with an unknown result.
                setConfirmed(false); setMustRefresh(true);
            }
        } finally {
            pending.current = false;
            if (mounted.current) setBusy(false);
        }
    }

    if (access !== 'authorized') return <Container as="main" className={styles.page}><Stack gap={4} className={styles.access}>
        <Label>Privat redaktionsvy</Label><Heading as="h1">Stories-admin</Heading>
        {access === 'loading' && <Text size="sm" role="status">Kontrollerar åtkomst…</Text>}
        {access === 'signed-out' && <><Text size="sm">Logga in med ditt godkända redaktionskonto. Utkast och underlag visas först när åtkomsten har kontrollerats.</Text><LogInModal redirectTo="/admin/stories" /></>}
        {access === 'forbidden' && <><Text size="sm" role="alert">Det här kontot har inte åtkomst till Stories-admin.</Text><Link href="/settings">Byt konto i inställningar →</Link></>}
        {access === 'error' && <><Text size="sm" role="alert">{loadError}</Text><Button variant="secondary" onClick={() => setRefresh(value => value + 1)}>Försök läsa om</Button></>}
    </Stack></Container>;

    const visibleItems = items.filter(item => filter === 'all' || item.status === filter);
    const historical = detail?.storageKind === 'historical_archive';
    const manualDraft = detail?.storageKind === 'manual_draft';
    const manualConfigured = historical && detail.manualPublication?.available === true;
    const manualReady = manualConfigured && session.capabilities.writesEnabled === true && session.capabilities.manualPublicationEnabled === true;
    const actionReady = manualDraft ? false : historical ? manualReady : session.capabilities.operatorConfigured;
    const canPublish = actionReady && !!detail?.actions.canPublish && !detail.actions.blockers.length && !mustRefresh;
    const canWithdraw = actionReady && !!detail?.actions.canWithdraw && !mustRefresh;
    return <Container as="main" className={styles.page}>
        <header className={styles.header}><Stack gap={2}>
            <Inline><Heading as="h1" size="section">Stories-admin</Heading><Label>Manuell beta</Label></Inline>
            <Text size="xs" tone="secondary">{session.email} · Ingen automatisk generering eller publicering</Text>
        </Stack><Button variant="secondary" size="sm" disabled={busy} onClick={() => setRefresh(value => value + 1)}>Läs om status</Button></header>
        {notice && <Text size="sm" role="status" className={styles.notice}>{notice}</Text>}
        {mustRefresh && <Text size="sm" role="alert" className={styles.notice}>Läs om status innan en ny publicering eller indragning. Det senaste försöket gav inget bekräftat resultat.</Text>}
        {!manualDraft && !session.capabilities.operatorConfigured && !manualReady && <Text size="sm" className={styles.notice}>Publiceringskopplingen är inte konfigurerad. Du kan läsa utkast och underlag, men publicera och dra tillbaka är avstängt.</Text>}
        {!manualDraft && (session.capabilities.operatorConfigured || manualConfigured) && session.capabilities.writesEnabled === false && <Text size="sm" className={styles.notice}>Redaktionsvyn är i läsläge. Publicering och indragning är inte aktiverat på servern.</Text>}
        <div className={styles.workspace}>
            <aside className={styles.sidebar} aria-label="Artiklar"><Stack gap={4}>
                <Select label="Visa artiklar" value={filter} onValueChange={setFilter} disabled={busy}
                    options={[{ value: 'all', label: `Alla (${items.length})` }, ...Object.entries(ADMIN_STORY_STATUSES).map(([value, label]) => ({ value, label }))]} />
                <div className={styles.articleList}>{visibleItems.map(item => <button type="button" key={item.id} disabled={busy}
                    className={styles.articleButton} aria-pressed={item.id === selected?.id} onClick={() => { setSelected(item); setNotice(''); }}>
                    <span className={styles.listMeta}>{item.symbol}<span>{adminStoryStatusLabel(item)}</span></span>
                    <span className={styles.listHeadline}>{item.headline}</span>
                    <span className={styles.listDate}>Utkast v{item.revision}{item.publicationRevision ? ` · publicerad v${item.publicationRevision}` : ''} · {time(item.updatedAt)}</span>
                </button>)}</div>
                {!visibleItems.length && <Text size="sm" tone="secondary">{items.length ? 'Inga artiklar med den här statusen.' : 'Inga importerade utkast ännu. Utkast tas fortfarande fram separat och läggs sedan in här för granskning.'}</Text>}
            </Stack></aside>
            <section className={styles.preview} aria-label="Artikelpreview" aria-busy={!!selected && !detail && !detailError}>
                {!selected && <Text size="sm" tone="secondary">Välj en artikel när ett utkast finns tillgängligt.</Text>}
                {selected && !detail && !detailError && <Text size="sm" role="status">Läser artikel och kontroller…</Text>}
                {detailError && <Stack gap={3}><Text size="sm" role="alert">{detailError}</Text><Button variant="secondary" onClick={() => setRefresh(value => value + 1)}>Läs om status</Button></Stack>}
                {detail && <Stack gap={6}>
                    <div className={styles.controls}><Stack gap={3}>
                        <Inline><Label>{selected.status === 'published' && detail.publication.revision < detail.revision ? 'Ny utkastversion' : adminStoryStatusLabel(selected)}</Label><Text size="xs" tone="secondary">Version {detail.revision} · {detail.contentHash.slice(0, 12)}</Text></Inline>
                        <Text size="xs" tone="secondary">Preview av sparad utkastversion {detail.revision}.{detail.publication.revision
                            ? ` ${detail.publication.status === 'published' ? 'Publicerad' : 'Tidigare publicerad'} version: ${detail.publication.revision}.`
                            : detail.publication.ref ? '' : ' Ingen publicerad version.'}</Text>
                        {historical && <Text size="sm" className={styles.notice}>Återfunnet utkast med den ursprungliga artikeltexten bevarad. Fullständiga körningsunderlag och giltig sparad AI-granskning saknas. {manualConfigured
                            ? 'Manuell betapublicering kräver att du själv faktagranskar texten mot aktuella originalkällor. Ingen AI-granskning ersätts eller registreras.'
                            : 'Du kan läsa text, grafer och källänkar, men utkastet kan inte publiceras.'}</Text>}
                        {manualDraft && <Text size="sm" className={styles.notice}>Manuellt framtaget, AI-assisterat utkast för redaktionell granskning. Texten är inte faktagranskad eller godkänd för publicering. Den här importvägen kan inte publicera eller dra tillbaka artiklar.</Text>}
                        {manualDraft && detail.manualDraft.sourceCompleteness === 'preamble_only' && <Text size="sm" role="alert" className={styles.notice}>Originalets fulltext saknas. Utkastet bygger på en sparad ingress; originalkällan och bolagskopplingen måste granskas innan texten kan godkännas.</Text>}
                        <Inline><Button size="sm" disabled={!canPublish || busy} onClick={() => openConfirmation('publish')}>Godkänn och publicera</Button>
                            <Button variant="secondary" size="sm" disabled={!canWithdraw || busy} onClick={() => openConfirmation('withdraw')}>Dra tillbaka</Button></Inline>
                        {detail.actions.blockers.length > 0 && <div className={styles.blockers}><Text size="sm">{manualDraft ? 'Granskning krävs före publicering' : 'Publiceringen är blockerad'}</Text><ul>{detail.actions.blockers.map((reason, index) => <li key={index}>{adminStoryBlockerLabel(reason)}</li>)}</ul></div>}
                    </Stack></div>
                    <div className={styles.reader}><OmxsumStoryReader article={detail.article} priceContextAccess={{ mode: 'admin', base: base.current }} /></div>
                    <details className={styles.evidence}><summary>Underlag & kontroller <span>{detail.sources.length} källor · {detail.checks.filter(row => row.state === 'pass').length}/{detail.checks.length} godkända kontroller</span></summary>
                        <Stack gap={6} className={styles.evidenceBody}>
                            <section><Heading size="subsection">{manualDraft ? 'Granskningskontroller' : 'Publiceringskontroller'}</Heading><ul className={styles.checks}>{detail.checks.map((check, index) => <li key={`${check.id}:${index}`}>
                                <span className={check.state === 'pass' ? styles.pass : styles.blocked}>{check.state === 'pass' ? 'Godkänd' : 'Ej godkänd'}</span><span><strong>{adminStoryCheckLabel(check.id)}</strong><br />{check.reason}</span>
                            </li>)}</ul>{!detail.checks.length && <Text size="sm" tone="secondary">Ingen sparad kontroll tillgänglig.</Text>}</section>
                            <section><Stack gap={3}><Heading size="subsection">{manualDraft ? 'Sparad originalkontext' : manualConfigured ? 'Aktuella originalkällor för manuell granskning' : 'Originalkällor'}</Heading><Text size="xs" tone="secondary">{manualDraft
                                ? `Källkopior sparade ${time(detail.manualDraft.sourceCapturedAt)} för utkastet. Detta är inte aktuella livekällor, en sparad modellkörning eller en godkänd granskning. Originaltexten visas endast i den privata redaktionsvyn.` : manualConfigured
                                ? 'Aktuella kopior av originalkällorna för din faktagranskning. Detta är inte det förlorade underlaget från den tidigare AI-körningen.' : historical
                                ? 'Bevarade källänkar från det ursprungliga utkastet. Originalens fulltext ingår inte i det återfunna artikelarkivet.'
                                : 'Originaltext för redaktionell granskning. Detta är inte artikelns publika källvy.'}</Text>
                                {detail.sources.map(source => <details className={styles.original} key={source.id}><summary>{source.title}<span>{source.publisher}{source.publishedAt ? ` · ${time(source.publishedAt)}` : ''}</span></summary>
                                    <Stack gap={3} className={styles.originalText}>
                                        {source.url && <a href={source.url} target="_blank" rel="noopener noreferrer">Öppna originalkällan ↗</a>}
                                        {source.original?.title && <Text size="sm">{source.original.title}</Text>}
                                        {source.original?.preamble && <p>{source.original.preamble}</p>}
                                        {manualDraft && !source.fullTextAvailable && <Text size="sm" tone="secondary">Fullständig originaltext saknas i den sparade källkopian.</Text>}
                                        {source.original?.body ? <p>{source.original.body}</p> : <Text size="sm" tone="secondary">{manualDraft
                                            ? 'Ingen fulltext ingår i utkastets sparade originalkontext.' : manualConfigured
                                            ? 'Ingen aktuell fulltext tillgänglig för den här källan.' : historical
                                            ? 'Originalets fulltext saknas i det återfunna artikelarkivet.' : 'Ingen fulltext sparad för den här källan.'}</Text>}
                                    </Stack>
                                </details>)}
                            </Stack></section>
                        </Stack>
                    </details>
                </Stack>}
            </section>
        </div>
        <Dialog open={!!confirmation} onOpenChange={open => { if (!open && !pending.current) setConfirmation(null); }}
            title={confirmation?.action === 'withdraw' ? 'Dra tillbaka artikeln?' : 'Godkänn och publicera?'}
            description={confirmation?.binding.reviewMode === 'manual_editorial_beta' && confirmation.action === 'publish'
                ? 'Du godkänner manuell betapublicering av exakt denna version efter egen faktagranskning. Servern kontrollerar att artikel och aktuella originalkällor inte har ändrats.'
                : 'Åtgärden gäller exakt den version du har läst. Servern kontrollerar underlag och aktuell status igen.'}>
            {confirmation && <Stack gap={4}>
                <Text>{confirmation.headline}</Text><Text size="xs" tone="secondary">Version {confirmation.binding.revision} · kontrollsumma {confirmation.binding.contentHash.slice(0, 16)}</Text>
                {confirmation.action === 'publish' && confirmation.binding.reviewMode === 'manual_editorial_beta' && <Text size="sm">Utkastet har bevarad originaltext, men saknar fullständiga äldre körningsunderlag och giltig sparad AI-granskning. Du ansvarar för att kontrollera fakta, siffror och formuleringar mot de aktuella originalkällorna innan publicering.</Text>}
                {confirmation.action === 'withdraw' && <><Text size="sm">Artikeln blir otillgänglig för läsarna. Den sparade publiceringen bevaras.</Text><Select label="Anledning" value={reasonCode} onValueChange={setReasonCode} options={STORY_WITHDRAWAL_REASONS} disabled={busy} /></>}
                <label className={styles.confirm}><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />
                    <span>{confirmation.action === 'withdraw' ? 'Jag bekräftar att denna publicering ska dras tillbaka.'
                        : confirmation.binding.reviewMode === 'manual_editorial_beta'
                            ? 'Jag har manuellt faktagranskat denna version mot de aktuella originalkällorna och godkänner publicering på OMXsum.'
                            : 'Jag har läst denna version och godkänner att den publiceras på OMXsum.'}</span></label>
                {actionError && <Text size="sm" role="alert">{actionError}</Text>}
                <Inline><Button disabled={!confirmed || mustRefresh || !sameStoryActionBinding(confirmation.binding, detail)} loading={busy} onClick={performAction}>
                    {confirmation.action === 'withdraw' ? 'Bekräfta indragning' : 'Publicera denna version'}</Button>
                    {actionError && <Button variant="secondary" disabled={busy} onClick={() => { setConfirmation(null); setRefresh(value => value + 1); }}>Läs om status</Button>}
                    <Button variant="ghost" disabled={busy} onClick={() => setConfirmation(null)}>Avbryt</Button></Inline>
            </Stack>}
        </Dialog>
    </Container>;
}
