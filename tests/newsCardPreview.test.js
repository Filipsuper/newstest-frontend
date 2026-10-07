import test from 'node:test';
import assert from 'node:assert/strict';
import { newsCardExcerpt, newsCardHeadline } from '../app/utils/newsCardPreview.js';

test('card excerpts use supplied AI prose, never the wire description', () => {
  const value = { text: ' Kort AI-text. ', bullets: ['Dubblerad detalj'] };
  assert.equal(newsCardExcerpt(value), 'Kort AI-text.');
  assert.deepEqual(value, { text: ' Kort AI-text. ', bullets: ['Dubblerad detalj'] });
  for (const value of [null, {}, 'Wire description', { summary: 'Wire description' }])
    assert.equal(newsCardExcerpt(value), null);
  assert.equal(newsCardExcerpt({ text: '', bullets: [null, ' En sparad AI-punkt. ', 'Nästa'] }), 'En sparad AI-punkt.');
});

test('long prose ends at a complete sentence or word, with full source untouched', () => {
  const text = `En kort första mening. ${'Fler detaljer som finns i läsaren '.repeat(20)}`;
  assert.equal(newsCardExcerpt({ text }), 'En kort första mening.');
  const long = 'Detaljerade uppgifter om incitamentsprogram och aktierätter '.repeat(20);
  const excerpt = newsCardExcerpt({ text: long });
  assert.ok(excerpt.length <= 220);
  assert.ok(excerpt.endsWith('…'));
  assert.ok(long.startsWith(excerpt.slice(0, -1)));
  assert.equal(long[excerpt.length - 1], ' ');
  assert.equal(newsCardExcerpt({ text: 'A'.repeat(300) }).length, 220);
});

test('headline cleanup removes only a redundant exact company prefix', () => {
  for (const title of ['Vicore: optionsinlösen', 'Vicore — optionsinlösen', 'Vicore – optionsinlösen', 'Vicore - optionsinlösen', 'VICORE: optionsinlösen'])
    assert.equal(newsCardHeadline(title, 'Vicore'), 'optionsinlösen');
  for (const title of ['Vicore Holdings: optionsinlösen', 'Vicore B: optionsinlösen', 'Analys av Vicore: uppdatering', 'Vicore: ', 'Vicore rapporterar en nyhet'])
    assert.equal(newsCardHeadline(title, 'Vicore'), title);
  assert.equal(newsCardHeadline('Nyhet', null), 'Nyhet');
  assert.equal(newsCardHeadline(null, 'Vicore'), null);
});
