# Landing and memberships — local implementation

The landing page now connects news and stock reactions to company catch-up,
financial performance, VD-ord summaries, estimates and screening. It retains
the current letter beside the hero, real news previews and generous section
spacing. Screener and Terminal occupy separate sections. Both the landing and
Terminal gateway reuse the user-supplied September 28 screenshots with Trading /
Bolagsanalys tabs and a full-size link for each image. The originals are unchanged;
Next Image serves responsive variants. No invented data or automatic slideshow.
Report and market coverage are explicitly qualified.

## Plan contract

| Plan | Followed companies | Access | Monthly price |
| --- | ---: | --- | ---: |
| Free | 2 | Existing public overview, company overview, letters and interest matching | 0 kr |
| Plus | 20 | Full feed, personal newsletter, public-site screener and paid company research | 49 kr |
| Pro (`premium`) | 100 | All Plus features and exclusive Terminal | 99 kr |

Frontend membership helpers serve pricing, onboarding and interest management.
The backend helper serves atomic following, email preference limits, preview
limits and both Terminal auth_request and session handoff routes. Other paid
research gates remain Plus. Stripe configuration and subscriptions are untouched.

Existing Free accounts above two keep all saved follows; additions are rejected
until below the cap. Removals and repeated requests to follow existing selections
remain valid. No bulk migration, mail send or account mutation has been performed.

## Deployment checks

- Deploy frontend and backend together; copy alone does not change access.
- Verify Free 2 / Plus 20 / Pro 100 follow boundaries with test accounts.
- Verify the live Terminal proxy calls `/api/auth/terminal-access`: Plus denied,
  Pro accepted. The local policy and frontend behavior are tested, not the live proxy.
- Review existing Plus subscribers before rollout: moving Terminal to Pro removes
  their previous Terminal access. No grandfathering or billing migration is applied.
- Verify newsletter/alert selection keeps existing consent and pause semantics.
- Nothing in this change enables alert delivery or expands AI generation.

## Local verification

- Frontend: 272 unit tests pass.
- Backend: 415 tests pass, 2 opt-in integrations skipped; dummy model credentials
  satisfy module initialization, with no generation or real credentials used.
- Landing, pricing, Terminal and preference browser suites: 34 checks pass
  including four successful reruns after dev-server/lazy-image loading delays.
- Additional 20-company email-cap and final 320px landing checks pass.
- Desktop/mobile, light/dark and automated accessibility checks included.
- Local preview is available at port 3112. No deployment performed.
