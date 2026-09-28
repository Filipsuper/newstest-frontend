// Editorial inclusion, not ranking or email eligibility. Both views stay chronological.
export function selectedNews(story) {
  const title = story.headline ?? story.title ?? '';
  const tags = story.tags ?? story.labels ?? [];
  if (story.status && !['flash', 'update'].includes(story.status)) return false;
  if (!title.trim() || !Number.isFinite(Number(story.importance)) || Number(story.importance) < 60) return false;
  if (tags.includes('INSIDER') && !(Number(story.facts?.grossValue) >= 25_000_000)) return false;
  return !/inbjudan till|invitation to|kallelse till|notice of|financial calendar|finansiell kalender|antal aktier och röster|number of shares and votes|(?:återköp|repurchases?).{0,100}(?:under perioden|under vecka|during the period|during week)/i.test(title);
}

