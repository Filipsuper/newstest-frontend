import { safeSourceUrl } from '../utils/newsroom';
import { Text } from './ui/layout';

/** Shared source detail, not another resting-page explanation/card. */
export default function ReviewedShareBasisNote({ basis }) {
  if (!basis) return null;
  const url = safeSourceUrl(basis.sourceUrl);
  return <Text size="sm">
    Modellens aktieantal: {basis.assumedShares.toLocaleString('sv-SE')} · underlag {basis.observedAsOf}.
    {' '}{basis.treasuryShares === null
      ? 'Bolagets bekräftade totalantal används som antagande; uppgift om egna aktier saknas i underlaget.'
      : `${basis.treasuryShares.toLocaleString('sv-SE')} egna aktier har dragits av från totalantalet.`}
    {' '}Antalet antas vara oförändrat under prognoskvartalet. Historisk EPS räknas inte om och estimatet kopplas inte till R12E vid olika aktiebas. Utspädning ingår inte.
    {url && <> <a href={url} target="_blank" rel="noreferrer">Källa för aktieantal ↗</a></>}
  </Text>;
}
