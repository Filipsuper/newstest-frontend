/** Presentation geometry only. Shares must already have a qualified denominator.
 * Do not renormalize a rounding shortfall, inflate small slices or draw zeroes.
 * Clip a tolerated rounding excess at one turn; labels keep the original shares.
 */
export function donutSlices(series) {
  if (!Array.isArray(series) || series.some(item => !Number.isFinite(item?.sharePct) || item.sharePct < 0 || item.sharePct > 100)) return [];
  let offset = 0;
  return series.flatMap(item => {
    const start = Math.min(offset, 100);
    const sweep = Math.min(item.sharePct, 100 - start);
    offset += item.sharePct;
    return sweep > 0 ? [{ ...item, start, sweep }] : [];
  });
}
