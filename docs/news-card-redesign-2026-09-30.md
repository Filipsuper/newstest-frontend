# News card redesign — 30 September 2026

Frontend-only release on top of deployed `0b90969` (documentation base `69589a4`).

- Important selections use `Nyheten först`: separate company/type and headline,
  short supplied AI excerpt, reaction footer and canonical `Läs nyheten` link.
- Ordinary chronological news and personal previews use the smaller `brief`
  variant, without AI excerpts or an extra CTA. Full text stays in the reader.
- Remove only exact redundant company prefixes at render time. Source/stored
  headlines and canonical URLs are unchanged; no AI headlines are generated.
- Match the letter widget's density to the editorial cards (16px title,
  14px body, 16px padding). Preserve letter content and touch targets.
- Verified before/after-session labels fall back to matching calendar-qualified
  company context when v2 timing is absent, never to guessed exchange hours.

No ranking, ingestion, reaction calculations, backend, email policy, databases,
account entitlements or AI generation changes. Other uncommitted company research
and about-page work is excluded. Production uses the existing public API and
alerts UI build flag. Candidate and exact-image rollback are required before
frontend-only cutover; record final checks separately after deployment.
