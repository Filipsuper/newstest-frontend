# OMXsum public-site foundation

Status: first implementation, 6 September 2026. This document is the plan and
decision record, not a claim that all public routes have been redesigned.

## What we are building

A Swedish, news-first research product for ordinary investors. The design
system borrows Wealthsimple/Fey's restraint and attention to interaction, not
their banking dashboard, portfolio priorities, proprietary assets, or valuation
model. `/terminal` remains a separate advanced interface.

Start from working primitives → repeatable patterns → page layout → staged
route migration. Keep the homepage a homepage. `/marknaden` remains the daily
workspace. This first release is intentionally a foundation, not another
wholesale restyling through global CSS.

## Research and resources

1. [Dennis Brotzky: Wealthsimple, one year post-acquisition](https://performance.dev/wealthsimple-year-one)
   — firsthand implementation account, published 3 September 2026. Wealthsimple's
   Mint uses Base UI. A working React prototype and component gallery informed
   incremental production rollout. The article connects design quality to stable
   layout, fonts, loading and navigation performance. We inspected its light
   prototype and dark-direction screenshots: restrained surfaces, legible type,
   compact rows and a clear primary/contextual hierarchy. This informs our
   process and visual hierarchy, not a copied layout or style sheet.
2. [Thiago Costa's personal site](https://tcosta.com/)
   — primary identity/portfolio source for the Fey cofounder.
   [His X profile](https://x.com/tcosta) was not accessible in research; no claims
   here depend on having read his threads. Do not confuse similarly named
   designers' posts with his work.
3. [Base UI quick start](https://base-ui.com/react/overview/quick-start),
   [components](https://base-ui.com/react/components/button),
   [composition](https://base-ui.com/react/handbook/composition)
   — official implementation resources. Use the current `@base-ui/react`
   package, subpath imports and `render` composition. Base UI supplies behavior,
   not a finished visual template. Its accessibility still requires correct
   labels, semantics, contrast and testing in our implementation.
4. [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
   — normative reference for contrast, reflow, focus, target size and labels.
   OMXsum's 44px default control target deliberately exceeds the 24px AA
   minimum; compact controls are only for fine-pointer desktop use.

References are research links, not bundled marketing images. The font is
locally served open-source Geist Variable, not Wealthsimple's Simple Sans.

## Repository audit

- Next.js App Router, React 19, JavaScript/JSX. Keep the existing app and data
  layer; this is not a framework, auth, API, or deployment-platform migration.
- `app/app.css` has over 8,500 lines with overlapping route rules and palette
  overrides. Body defaults to serif while many workspaces override it. Controls
  independently choose their font, size, border, focus behavior and spacing.
- Search, menus and tab-like buttons have several implementations. Some
  metadata is below 10px. Visually selected buttons do not consistently expose
  their selected state to assistive technology.
- News, company and watchlist views share data concepts but not enough
  presentation. Preserve those concepts and separate presentational components
  from adapters that know about APIs, permissions, or financial meaning.
- Previous mobile problems involved nested scrolling and fixed-height text.
  Treat continuous document scrolling and unclipped long Swedish content as
  acceptance criteria, not late breakpoint patches.

## Architecture and rules

`app/styles/tokens.css` → `app/components/ui` → feature adapters → routes.

- Namespace tokens `--ui-*`; scope presentation with CSS Modules. No new global
  route patches. Do not rewrite legacy palette aliases in one pass.
- Presentation modules (`layout`, `data`, `format`) are independent of account
  and API state. Interactive modules (`controls`, `overlays`) wrap Base UI.
- Features retain business logic. `NewsFeedItem` adapts real story data into
  the same `NewsRow` used in the reference page.
- Navigation links are anchors. Tabs connect in-page panels. A segmented
  control holds one required filter/sort choice. A select chooses a form value;
  a menu performs actions. Never make them visually interchangeable at the
  expense of their semantics.
- Do not expose a generic catch-all component with arbitrary colors and sizes.
  Add a variant only when it represents a reusable product purpose.
- Metadata remains at least 12px, list text 14px, and form inputs 16px on
  phones. Use shared type/spacing/radius scales from UI.md.
- Reserve layout before data arrives. Missing data is not zero. Do not claim
  causality, realtime data, or financial importance from an unrelated daily move.
- Select/menu/dialog portals inherit root theme tokens. Do not apply a nested
  custom theme without also handling its portal container.
- This phase does not add a second persisted theme preference. It reuses the
  existing public-site ThemeProvider and self-hosts the new UI font.

## Migration sequence

| Phase | Scope | Exit criteria |
| --- | --- | --- |
| 1 — Foundation | Tokens, type, layout, buttons, fields, select, menu, tabs, switch, checkbox, dialog, tooltip, lists, feedback; `/designsystem` | Working examples, both themes, keyboard tests, small-screen reflow, production build |
| 2 — News and navigation | Public shell, stock search, `/marknaden`, `/marknaden/nyheter`, `/bevakning` and preference management | One search pattern, one news-row grammar, mobile page scroll, URL-backed views, no auth/feed regressions |
| 3 — Company research | `/aktier`, screener, `/aktie/[symbol]` | Shared identity/quote rows, filter controls, table/chart tokens, consistent profile diagram placement and missing-data states |
| 4 — Editorial/account | Landing page, letter archive/reading, account/settings/login/paywall | Editorial typography variant, shared forms, stable conversion and navigation, obsolete CSS removed |

Phase 1 is implemented. Phase 2 now includes the public shell/search,
`/marknaden`, shared chronological feed, URL-backed story reader and social
images, Bevakning/preferences, and the letter library. The company page has
news-first ordering and shared news rows; its analytical controls/charts remain
an incremental migration. Screener presentation is now implemented
with shared controls, grouped metric selection, a Base UI filter dialog and
a token-based compact table. The research profile keeps its scores and only
opts into the new palette inside the screener.
See `docs/news-first-workspace.md` for the new product and data contract.

The 7 September release also migrated `/settings`, `/article/[id]`,
`/morgonbrevet`, `/kvallsbrevet`, article sharing and inline company previews.
`Label` / `NewsTypeLabel` now cover content taxonomy and edition identity in
the gallery, news rows, story reader and letter library. Email settings retain
explicit saving and existing backend values; appearance uses the shared switch.
These changes and company-first discovery are deployed in frontend `7b0f86b`;
the later screener pass received frontend publishing approval on 7 September.
`NewsSummary` now supplies the real AI prose/bullets beneath news headlines
through `NewsRow`'s presentation-only description slot and the story reader.
Its data adapter retains deterministic text for ranking but never presents it
as AI copy. See `docs/stock-discovery-ux.md` for the implemented compact
directory and its bounded company-news data contract. It uses shared controls,
tonal rows and URL-backed filters. Screener filter/sort persistence is a later
UX improvement; this polish does not add it or change the analytical data.
`LetterCard` is shared by the archive and existing landing-page previews;
`PreviousArticle` is now a compatibility adapter rather than a second renderer.
The supplemental company preview follows the [Base UI Tooltip guidelines](https://base-ui.com/react/components/tooltip#usage-guidelines):
the link remains independently named and navigable, and the full company page
provides the data without requiring hover.

Not included yet: table virtualization, a full rewrite of analytical renderers,
notification delivery, cross-device read receipts, exact letter-to-story IDs,
or a new landing page. Existing subscription access remains intact. Nothing
here deploys itself.

### Continuous company report

`/aktie/[symbol]` now composes shared controls into a document with desktop
contents and a mobile Base UI contents dialog. `CompanyReportShell` owns anchor
navigation, scroll highlighting and reader return; `ReportSection` defers
analytical rendering without resetting visited sections. Company-report styles
are scoped: the existing analytical renderers opt into foundation tokens locally,
without changing the Terminal or globally remapping the legacy palette.

The opening chart is flat, news follows directly, and full statements, reports,
letter mentions and the spider are progressive detail. The shared `Dialog`
accepts popup `initialFocus`/`finalFocus` for contents navigation; normal dialogs
retain Base UI's default focus restoration. Route links remain links, not tabs.

### Company-first onboarding

Signup/confirmation now use shared controls and the single Base UI dialog.
`onboarding.module.css` scopes the narrow company-setup document and preview;
legacy email/onboarding styles are removed. Search uses a native label linked
to the Base UI input: `Combobox.Label` labels a trigger, not an input-only
search. The onboarding preview reuses actual personal-feed stories and
`NewsFeedItem` rather than its old independent miniature news renderer.

Confirmation state is distinct from account loading, consumed links, delivery
failure and news availability. Explicit follow state makes retrying safe.
Third-party scripts are excluded from `/bekrafta`; successful confirmation
replaces the token-bearing URL. Release requires the compatible public backend
before the new frontend. This is not a pricing/landing-page redesign or a new
notification-delivery feature.

### Membership and upgrade return

`/pro` and `/pro/klart` now compose the same shared surfaces, labels, buttons,
type and Base UI login dialog as the other migrated routes. Presentation is
scoped to `membership.module.css`; obsolete pricing selectors are removed.
`membership.js` describes existing prices/access and validates Stripe checkout
destinations; it is not an authorization or billing source.

The current backend grants Terminal access to both Plus and Pro. Pricing copy
now reflects that, with 5/10/100 company caps and no unverified realtime or
notification promises. Existing subscribers take the existing settings/billing
management path, avoiding the new-subscription endpoint for plan changes.
The return page waits for server-confirmed access and never treats its URL as
a purchase receipt. No backend billing changes are included. Membership and
the earlier onboarding work were released with approval on 7 September 2026:
backend `fb5a6f2` first, then frontend application commit `7e3b5ed`. Terminal
was not deployed. See [release history](release-history.md) for live checks
and rollback image references; [ROADMAP.md](../ROADMAP.md) owns future work.

## Component use

### Site sharing artwork

`SITE_OG_IMAGE` in `brand.js` is the versioned generic Open Graph/Twitter image.
`/og/home` builds a static 1200×630 composition with bundled Geist, exact palette
values and the existing percentage formatter. ImageResponse cannot render the
CSS Modules/Base UI DOM directly, so its product-view illustration is a scoped
renderer, not another interactive component system. A visible date identifies
the saved public news snapshot; `preview.json` retains its source and quote
provenance. No runtime market/font request is required. Dedicated event,
company and article images still override the generic site artwork.

News and company share renderers reuse `app/og/_shared`: bundled regular/600
Geist, semantic light/dark palettes, brand lockup, canvas spacing and a static
equivalent of `ChangeBadge` using the UI formatter. News uses the warm canvas
and a full-width headline; a real reaction series sits below it, without a
panel. Missing series remove the chart layout entirely, while a known reaction
can still have its labelled badge. Fixed windows and rolling snapshots remain
distinct. The company image keeps the dark, flat chart, explicit selected
period, quote timestamp and optional moving averages. Its strokes are solid
so straight/flat SVG paths remain visible at thumbnail size. Neither renderer
loads remote fonts or changes the canonical story/company URLs. Shared
`CONTENT_OG_VERSION` versions the image URLs and company share links together,
keeping the modal preview/download and crawler metadata in sync after redesigns.

`tests/browser/share-images.spec.js` saves full-size and 600×315 previews for
positive/negative/zero reactions, missing charts, long headlines/company names,
fractional quotes, intraday and moving-average variants. It also checks real
PNG dimensions, shared badge colors and visible chart strokes. The fixtures
are fictional and confined to local tests.

### OMXsum 2.0 landing composition

The homepage now composes the foundation instead of its legacy clock, demo
blocks and oversized typography. `HomePage` is a server component with
independent, bounded news/letter preview slots. It reuses `NewsFeedItem` and
`LetterCard`; only account-aware actions, signup and retry controls are client
components. A failed preview leaves the core landing content usable.

`landing.module.css` owns layout, not a new palette or duplicate control
system. `brand.js` centralizes the launch name/version and headline for the
public shell, homepage and static OG route. The OG renderer uses explicit
foundation palette values because ImageResponse cannot resolve CSS variables;
it does not contain simulated financial data. Terminal remains untouched.

Guest signup uses the existing `EmailInput` and one confirmation dialog.
Returning readers get a workspace shortcut, with signup available in the
letter section rather than assuming their subscription state. Selection,
chronology, causality, paid access and notification opt-in remain distinct.
The current published letter now sits alongside the hero as the lead magnet
(below signup on phones); real news examples follow the benefits section.
Landing sections use 112px desktop and 64px mobile gaps, composed from shared
spacing tokens, without increasing the density of the individual controls.
Released with approval on 7 September 2026 as frontend `b614361`. Production
checks confirm the newsletter hero, section gaps and both themes at
1440/390/320px, the real letter link and the new social image. No production
forms were submitted; backend and Terminal remained unchanged. See
[release history](release-history.md) for release and rollback details.

### Shared primitives

```jsx
import { Button, TextField, Select } from './ui/controls';
import { Stack, Heading } from './ui/layout';

// Example from a feature in app/components; use relative imports in this repo.
<Stack gap={4}>
  <Heading as="h1" size="page">Bevakning</Heading>
  <TextField label="Nyckelord" value={keyword} onValueChange={setKeyword} />
  <Select label="Marknad" options={markets} value={market} onValueChange={setMarket} />
  <Button type="submit" loading={saving}>Spara</Button>
</Stack>
```

Buttons default to `type="button"`; submit is explicit. Use `IconButton` with
`label`. Use Base UI `render` composition for a link styled as a button:

```jsx
<Button nativeButton={false} render={<Link href="/bevakning" />}>
  Mina bevakningar
</Button>
```

Lists use semantic `ul/li` by default. `NewsRow` accepts `as="li"` inside a
`DataList`, or defaults to an article for existing feed containers. Interactive
headlines, company links and trailing actions are siblings, never nested buttons.
`ChangeBadge` accepts a finite number or missing value; do not pass formatted
strings or silently coerce missing data to zero.

## Verification and rollout

- `npm test`: financial change formatting, token contrast and existing ranking
  tests. Color checks cover normal text and positive/negative/accent badges in
  both themes (4.5:1 target), and focus/control boundaries (3:1 target).
- `npm run test:ui`: isolated Playwright checks of the gallery and news-feed
  pilot, with mocked account/news data; does not touch real subscriptions.
  Verify keyboard select/menu/tabs/dialog and focus return, form validation,
  reduced motion, no horizontal overflow at 320/390px and touch targets.
  Install the matching browser once with `npx playwright install chromium`.
  The suite also runs axe WCAG A/AA checks on the reference page in both themes
  and inside the dialog. This is automated coverage, not full WCAG certification.
- `npm run build`: route compilation and production prerendering.
- Manually inspect light/dark desktop and mobile screenshots. Confirm real
  headlines wrap, the letter grows, and mobile lists do not trap vertical scroll.
- Migrate complete components one at a time. Delete old CSS only when all of its
  consumers have migrated. Do not change the ranking/feed semantics to make a
  mock look better. New examples must be explicitly labeled fictional.
- Deploy only through the existing frontend deployment workflow when requested.

Follow-up infrastructure: remove legacy remote font imports after typography
migration, add WebKit/Firefox CI, expand visual/a11y regression coverage to all
migrated routes, and add field primitives (combobox, radio group, textarea,
pagination) when a real consumer defines their behavior.

Dependency audit on 6 September: npm reports four existing high-severity
dependency findings in Next/PostCSS, Sharp and nanoid. The affected versions
were already present in the starting lockfile; no finding targets Base UI,
Geist or Playwright. Resolve this in a separate framework/dependency maintenance
change; do not run `npm audit fix --force` as part of a visual migration.
