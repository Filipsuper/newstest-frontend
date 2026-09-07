# Newsletter email design handoff

7 September 2026 — **released**, newsletter renderer `8bd95c8`.

Morgonbrevet email now follows the public article's visual hierarchy and color
tokens: warm canvas, Geist with fallback fonts, compact edition label, title,
real introduction, inset “I korthet”, ink pill action and personal section.
The existing briefing-to-full-article workflow remains; it is not a full-article
email or a new newsletter delivery product.

## Ownership

| Responsibility | Repository / files |
| --- | --- |
| Public design reference | This repo: `UI.md`, `app/styles/tokens.css`, `app/components/editorial.module.css` |
| Newsletter UI and HTML/plain text | `Filipsuper/news-test`: `src/services/emailUi.js`, `src/services/mailHtml.js` |
| Delivery and cron | `Filipsuper/news-test`: `src/services/mail.js`, `src/main.js` |
| Generated letter/personal matches | `newsbackend`: `jobs/morningLetter.js`, `jobs/personalBlocks.js` |
| Account confirmation/welcome emails | Separate `newsbackend` templates, unchanged |

The scheduler work is in branch `codex/newsletter-editorial`, based on production
`c1cce4e`, in isolated worktree `/private/tmp/omxsum-newsletter.nRD4uo/repo`.
Its linked checkout is `/Users/filipkarlberg/Documents/coding/news test`, whose
older branch and unrelated `src/utils/utils.js` edit were preserved.
The implementation is committed and pushed to scheduler `main` as `8bd95c8`.
Production `/root/news-test/news-test` was fast-forwarded and only its existing
PM2 process `main` (ID 0) restarted at 21:04 UTC. Production mode and disabled
watch mode were verified first; no immediate mailing batch was triggered.
The temporary worktree is a convenience, not the durable source of the release.

## Scope and contracts

- Same verified subscriber filter, provider, subject, throttle and schedule.
  Evening generation is unchanged and does not send an evening email.
- Real `introText` now passes through the scheduler. Highlights remain supplied
  content; personal AI bullets remain primary with matched stories as fallback.
- Free/Plus/Pro access remains enforced for HTML and the new plain-text version.
  No fake locked-content skeletons or account-name greetings derived from email.
- Exact article title-slug links replace links that open whichever edition is
  latest. Unsubscribe addresses are encoded; preferences link to Bevakning.
- Source/period labels distinguish saved IG quotes and observed reactions from
  live prices. Missing values do not become zero; no embedded chart is invented.

## Local QA and next release step

From the scheduler worktree, using Node 22:

```sh
npm test
npm run preview:email
node scripts/check-email.mjs /absolute/path/to/newstest-frontend
```

13 unit tests and 38 browser layout checks pass. Fictional previews cover
320/390/768px, light/dark, long headlines, missing data, paid/free states and
font/style removal. Screenshots were visually inspected. These commands do not
send emails, load credentials or connect to the database. Output is ignored in
`email-previews/`. The scheduler's `docs/newsletter-email.md` contains the full
rendering contract and email-client compatibility references.

One explicitly authorized fictional mockup was reported delivered on 7 September
2026 and the user approved its appearance. No subscription was changed; the test
disabled its unsubscribe action. Broader Gmail/Outlook/Apple Mail coverage is
not claimed. The scheduler is deployed with its existing schedules active and
no new startup errors. Its 13 rendering tests also passed on production Node 18
in an isolated directory before release. Do not use scheduler
dev/start commands or the subscriber-batch
entry point for a preview. A frontend deployment does not release these emails.
