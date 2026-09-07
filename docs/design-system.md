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

## Component use

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
