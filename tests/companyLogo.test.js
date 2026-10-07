import test from 'node:test';
import assert from 'node:assert/strict';
import { companyInitials, companyLogoSrc } from '../app/utils/companyLogo.js';

const symbol = 'VOLV-B.ST';
const url = 'https://terminal.omxsum.com/api/v1/logos/VOLV-B.ST.png';
test('logo images reuse exact-symbol public routes and versioned cache keys', () => {
    assert.equal(companyLogoSrc({ symbol }), url);
    assert.equal(companyLogoSrc({ symbol, logoUrl: url }), url);
    assert.equal(companyLogoSrc({ symbol, logo: { url, sha256: 'a'.repeat(64) } }), `${url}?v=${'a'.repeat(16)}`);
});
test('authoritative absence does not request an image', () => {
    assert.equal(companyLogoSrc({ symbol, logo: null, logoUrl: null }), null);
    assert.equal(companyLogoSrc({ symbol, logoUrl: null }), null);
});
test('untrusted URLs and mismatched company assets are rejected', () => {
    for (const logoUrl of ['https://other.test/logo.png', 'javascript:alert(1)',
        'https://terminal.omxsum.com/api/v1/logos/SAAB-B.ST.png',
        'https://secret@terminal.omxsum.com/api/v1/logos/VOLV-B.ST.png']) {
        assert.equal(companyLogoSrc({ symbol, logoUrl }), null);
    }
    for (const invalid of ['../private', '', null, 'VOLV-B.ST/x']) assert.equal(companyLogoSrc({ symbol: invalid }), null);
});
test('fallback initials remain concise and support Swedish names', () => {
    assert.equal(companyInitials({ name: 'Atlas Copco AB' }), 'AC');
    assert.equal(companyInitials({ name: 'Öresund' }), 'Ö');
    assert.equal(companyInitials({ symbol: 'SAAB-B.ST' }), 'S');
    assert.equal(companyInitials({}), '·');
});
