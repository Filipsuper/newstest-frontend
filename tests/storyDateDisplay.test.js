import test from 'node:test';
import assert from 'node:assert/strict';
import { storyDateDisplay, storyPeriodDisplay, storyTextDateDisplay, storyParagraphDateDisplay } from '../app/utils/storyDateDisplay.js';

test('calendar dates are Swedish and independent of local timezone', () => {
    assert.equal(storyDateDisplay('2026-07-31'), '31 juli 2026');
    assert.equal(storyDateDisplay('2024-02-29'), '29 februari 2024');
    assert.equal(storyDateDisplay('2026-12-31'), '31 december 2026');
});

for (const [start, end, expected] of [
    ['2026-05-01', '2026-07-31', '1 maj–31 juli 2026'],
    ['2026-05-01', '2026-05-31', '1–31 maj 2026'],
    ['2025-12-31', '2026-01-01', '31 december 2025–1 januari 2026'],
    ['2026-07-31', '2026-07-31', '31 juli 2026'],
]) test(`readable period ${start} to ${end} keeps the exact calendar days`, () => {
    const period = Object.freeze({ start, end, frequency: 'quarterly', basis: 'reported' });
    assert.equal(storyPeriodDisplay(period), expected);
    assert.equal(storyTextDateDisplay(`${start}–${end}`), expected);
    assert.equal(period.start, start);
    assert.equal(period.end, end);
});

test('period end and comparison labels require no calendar inference', () => {
    assert.equal(storyPeriodDisplay({ end: '2026-07-31' }), '31 juli 2026');
    assert.equal(storyPeriodDisplay({ state: 'source_comparison', label: 'Rapportens jämförelsetal' }), 'Rapportens jämförelsetal');
});

test('dates in prose, headings and chart labels are presentation only', () => {
    const text = 'Rapport för 2026-05-01–2026-07-31. Kassan vid 2026-07-31 var 8,94 MSEK.';
    assert.equal(storyTextDateDisplay(text), 'Rapport för 1 maj–31 juli 2026. Kassan vid 31 juli 2026 var 8,94 MSEK.');
    assert.equal(storyTextDateDisplay('Historisk årsomsättning · 2025-12-31'), 'Historisk årsomsättning · 31 december 2025');
    assert.equal(storyTextDateDisplay('2026-05-01 - 2026-07-31'), '1 maj–31 juli 2026');
    assert.equal(text, 'Rapport för 2026-05-01–2026-07-31. Kassan vid 2026-07-31 var 8,94 MSEK.');
});

test('invalid dates, reversed periods and unrelated tokens stay unchanged', () => {
    for (const value of ['2026-02-30', '2026-13-01', '0000-01-01', '2026-07-31T22:00:00Z',
        'https://example.com/2026-07-31/report', 'https://example.com/?date=2026-07-31',
        'doc_2026-07-31', 'doc-2026-07-31', '2026-07-31.pdf', 'file2026-07-31',
        '2026-05-01–2026-07-31T00:00:00Z',
        '2026-07-31–2026-05-01', '2026-02-30–2026-03-01', 'Rapportens jämförelsetal',
        'Q1 2026/2027', '30,45 MSEK', '2027–2028']) assert.equal(storyTextDateDisplay(value), value);
    assert.equal(storyDateDisplay('2026-02-30'), '2026-02-30');
    assert.equal(storyTextDateDisplay(null), null);
});

test('source excerpts remain verbatim and editorial paragraphs retain their original bindings', () => {
    const text = 'Rapport för 2026-05-01–2026-07-31.';
    const quote = Object.freeze({ kind: 'source_excerpt', text, sourceIds: Object.freeze(['doc_test']) });
    const narrative = Object.freeze({ kind: 'fact', text, sourceIds: quote.sourceIds });
    assert.equal(storyParagraphDateDisplay(quote), text);
    assert.equal(storyParagraphDateDisplay(narrative), 'Rapport för 1 maj–31 juli 2026.');
    assert.equal(narrative.text, text);
    assert.equal(narrative.sourceIds, quote.sourceIds);
});
