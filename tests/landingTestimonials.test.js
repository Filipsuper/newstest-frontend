import test from 'node:test';
import assert from 'node:assert/strict';
import { LANDING_TESTIMONIAL_SOURCE, LANDING_TESTIMONIALS } from '../app/utils/landingTestimonials.js';

test('restored reader feedback keeps the original public source and exact text', () => {
  assert.equal(LANDING_TESTIMONIAL_SOURCE.commit, 'd1f9a532d4fbeb8cb2b2a81b5c6f22ac4660cbf6');
  assert.equal(LANDING_TESTIMONIAL_SOURCE.file, 'app/routes/home.jsx');
  assert.deepEqual(LANDING_TESTIMONIALS.map(quote => [quote.name, quote.text]), [
    ['Nidalus1', 'Riktigt nice, tack så mycket :)'],
    ['3xc1t3r', 'Snyggt och rent! Ska få med den i rotationen!'],
    ['Hampsx', 'Snyggt jobbat! Kommer användas'],
  ]);
});

test('feedback links to individual original comments and adds no invented dates or scores', () => {
  assert.equal(new Set(LANDING_TESTIMONIALS.map(quote => quote.url)).size, 3);
  for (const quote of LANDING_TESTIMONIALS) {
    assert.equal(quote.source, 'Reddit');
    const url = new URL(quote.url);
    assert.equal(url.protocol, 'https:');
    assert.equal(url.hostname, 'www.reddit.com');
    assert.match(url.pathname, /^\/r\/Aktiemarknaden\/comments\/1j3vtqt\/comment\/m[a-z0-9]+\/$/);
    assert.equal('date' in quote, false);
    assert.equal('stars' in quote, false);
    assert.equal('rating' in quote, false);
  }
});
