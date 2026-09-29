# Val av estimatår i Värdering

Deployat 29 september 2026 efter releasen med prickad estimatlinje.

- Gemensam Estimatår-väljare byggd av SegmentedControl, bredvid måttvalet.
- Visas endast när det valda måttet har flera kvalificerade helårsestimat.
- Närmaste år förvalt. Ett explicit valt år uppdaterar linjens slutvärde,
  axel-/slutpunktsetikett, tooltip, tillgängliga diagramnamn och metodtext.
- Historisk kurva, statistik och alla rapporterade/estimerade staplar bevaras.
- Årvalet följer med mellan mått om perioden finns. Annars visas närmaste
  tillgängliga år; ett annat bolag börjar med sitt eget närmaste år.
- Ett valt förlustår behåller sin period utan en missvisande linje till ett
  annat år. Ingen automatisk övergång till ett positivare estimat.
- Endast ett år, inget jämförbart estimat eller kvartalsbaserad R12E visar
  ingen redundant årsväljare. Kvartalsdata skapar inga nya helårsestimat.
- Inga nya API-anrop, AI-genereringar, databasändringar eller behörighetsändringar.

Verifiering omfattar modell-/periodval, borttaget år, förlustår och oförändrad
R12E, samt UI-byte för alla fyra värderingsmått med tangentbord och på mobil.

284 enhetstester och 23 UI-tester godkända. Efter sista bolagsåterställningen
passerade de fyra riktade årsväljartesterna igen. Bilder på 320/1440 px och
ljust/mörkt tema granskade; ingen horisontell sidoöverströmning och minst
44 px mål för årvalen. Testservrarna avslutades efter kontrollerna.

Kodcommit: b771170. Produktionens startsida, bolagssida, Marknaden och
bolagslistans API gav HTTP 200. Den offentliga bolagssidans JavaScript
verifierades innehålla årsväljaren. Endast frontend byttes; API, backend,
insamlare, inställningar och data lämnades oförändrade.
