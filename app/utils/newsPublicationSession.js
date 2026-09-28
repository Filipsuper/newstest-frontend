import { reactionV2For } from './reactionV2.js';

// Publication context is historical: do not derive it from today's clock,
// a later quote session, or assume Stockholm hours for every exchange.
export function newsPublicationSession(story) {
  const symbol = story.symbol ?? story.companies?.[0]?.symbol;
  const timing = reactionV2For(story)?.measurements.find(row => row.symbol === symbol)?.timing;
  if (timing === 'before_open') return 'beforeOpen';
  if (timing === 'after_close') return 'afterClose';
  return null;
}
