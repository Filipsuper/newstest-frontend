# Värdering: streckad estimatreferens

## Releaseomfattning

Historiska multiplar behålls. En rak prickad linje i grafens sista 10 procent
visar en kvalificerad estimatmultipel vid oförändrad aktuell kurs eller
kapitalisering. Förlängningens x-position är en presentationsyta, inte en
framtida handelsdag eller en prognostiserad kursbana.

Helårsestimat jämförs med helårshistorik. När nästa kvartal är estimerat används
en separat rapporterad R12-serie och R12E beräknas som de tre senaste
rapporterade kvartalen plus det kommande kvartalsestimatet. Ett kvartal
multipliceras aldrig med fyra. Saknat eller inkompatibelt underlag ger ingen
estimatlinje.

API-releasen bygger på den driftsatta history-estimates-20260928-v1-källan och
ändrar endast lib/valuation.ts samt nya lib/valuation-r12.ts. Den kör inga
insamlare, modelluppdateringar eller databasskrivningar. EPS-utökningen och
piloten för nyhetsvaliderade aktieantal aktiveras inte av denna release.

## Verifiering före aktivering

- 280 frontend-enhetstester godkända.
- Åtta riktade webbläsartester för R12E och helårsreferens godkända, inklusive
  320 och 1440 px, ljust och mörkt tema samt tillgänglighetskontroller.
- Desktop- och mobilbilder granskade visuellt.
- API TypeScript-kontroll godkänd; kandidatens 26 kontrakttester godkända.
- Produktionsbyggen körs sekventiellt, med 1 CPU och 1400 MB minnesgräns.

Serverns releasekällor och tidigare images behålls för reproduktion respektive
återställning. Slutlig aktivering och verkliga API-kontroller dokumenteras i
arbetsytans deploymentsrapport.
