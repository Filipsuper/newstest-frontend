const LOGO_ORIGIN = 'https://terminal.omxsum.com';
const SYMBOL = /^[A-Z0-9.^=_-]{1,64}$/;
const HASH = /^[a-f0-9]{64}$/;

/** Public PNGs only; never send credentials or follow arbitrary image URLs. */
export function companyLogoSrc(company) {
  const symbol = company?.symbol;
  if (typeof symbol !== 'string' || !SYMBOL.test(symbol)) return null;
  const path = `/api/v1/logos/${encodeURIComponent(symbol)}.png`;
  const supplied = company.logo?.url ?? company.logoUrl;
  if (supplied) {
    try {
      const url = new URL(supplied);
      if (url.origin !== LOGO_ORIGIN || url.pathname !== path || url.username || url.password) return null;
    } catch { return null; }
  } else if (Object.hasOwn(company, 'logo') || Object.hasOwn(company, 'logoUrl')) {
    // An explicit absence must not trigger repeated 404 requests.
    return null;
  }
  // Older cached company lists have no logo fields. The exact-symbol public
  // image route remains compatible; only mounted identities request an image.
  const version = HASH.test(company.logo?.sha256 ?? '') ? `?v=${company.logo.sha256.slice(0, 16)}` : '';
  return `${LOGO_ORIGIN}${path}${version}`;
}

export function companyInitials(company) {
  const words = String(company?.name || company?.nativeSymbol || company?.symbol || '')
    .replace(/\b(?:AB|ABP|publ)\b/gi, '').trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map(word => Array.from(word)[0]).join('').toLocaleUpperCase('sv-SE') || '·';
}
