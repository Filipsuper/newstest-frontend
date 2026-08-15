# Datatäckning (fill)

Mätt mot hela universumet om 870 noterade bolag. Källor: Market API
`/coverage` (uppdateras varje timme av `stonks-data-coverage`-cronen) och
`ReportDocumentStore.status()` på VPS:en. Ny mätning läggs överst.

Snabbkommandon:

```bash
# ledger
curl -s -H "Authorization: Bearer $OMXSUM_API_KEY" \
  https://terminal.omxsum.com/api/v1/coverage | jq '.data.dimensions'

# rapport/VD-ord-status
ssh root@omxsum.com 'cd /root/stonks && .venv/bin/python -c "
import sys, json; sys.path.insert(0, \".\")
from stonks.db import get_db
from stonks.report_documents import ReportDocumentStore
print(json.dumps(ReportDocumentStore(get_db()).status(), indent=1))"'
```

## 2026-08-15 (kväll)

### Ledger (hela universumet, 870 bolag)

| Dataset | Fill |
|---|---:|
| Dagliga kurser | 100% |
| Livekurser | 99,9% |
| Profiler | 99,0% |
| Årsbokslut | 98,6% |
| Kvartalsbokslut | 98,4% |
| Rapportdokument upptäckta | **98,3%** (var 92,4% i går morse) |
| VD-ord/ledningskommentar | **84,7%** (var 65,6% vid Phase 1-baseline) |
| Kalender | 87,4% |
| R12/TTM | 49,3% |
| Nyhetshistorik | 32,1% |
| Estimat | 6,7% |

### Nya dataset denna vecka

| Dataset | Omfattning |
|---|---|
| Insynstransaktioner (FI) | 4 397 rader, mars 2025 → idag, 460 bolag, ingen beloppsgräns |
| Ägardata ur rapporter | **479 bolag (55%)** efter universumsvep + sajtkrypning: största ägare + ledningens innehav där de redovisas |
| Valutakurser (FX) | EURSEK + USDSEK, 5 205 dagliga kurser, ~10 år |
| VD-ord-sektioner | 2 439 totalt, 2 143 med AI-sammanfattning |
| Spotlight-källan | 411 dokument, live-pollning var 60:e sekund |
| Värderingsband | Hela universumet on-demand (P/E, P/S, EV/EBIT, EV/S) |

Not: 1 153 insynsrader är olänkade (utländska emittenter, onoterade
instrument, namnvarianter) — ärlig rest, syns inte på sajten.

Ägardata-vägen dit: kvartalsrapporternas tabeller (universumsvep, 399
bolag) + sajtkrypning efter årsredovisningar som aldrig bifogades någon
release — 457 bolagssajter kröp, 141 ÅR-PDF:er hittade och validerade
(rätt år måste stå i dokumentets inledning), 80 nya bolag extraherade.
Kvarvarande ~390 utan ägardata: sajter som time:ar ut, skannade PDF:er
(kräver OCR), JS-renderade IR-sidor, och bolag som faktiskt inte redovisar
tabellen. Krypningen är omkörbar — varje ny träff är ren vinst.

## 2026-08-15 (förmiddag)

Spotlight-connector tillagd i wiren (`sources=...,spotlight,...`): Spotlight-
listade bolag publicerar via börsens eget nyhetssystem, inte MFN eller
Cision — beQuoted (den misstänkta källan) visade sig inte ha ett enda av
gap-bolagen. Connectorn läser Spotlights publika GetNews-endpoint plus
artikelsidorna, där rapport-PDF:en ligger på Cisions mediabank. Backfill
körd per bolag via NEWSWIRE_SPOTLIGHT_QUERY.

| | 2026-08-14 kväll | Efter Spotlight |
|---|---:|---:|
| Bolag med VD-ord | 701 (80,6%) | **712 (81,8%)** |
| Bolag utan upptäckt rapportdokument | 27 | **15** |
| Rapport-PDF:er med extraherat VD-ord | 1 021 | 1 030 |

12 av 17 Spotlight-gap-bolag fick rapport + VD-ord (NFO Drives, Spermosens,
EcoRub, Xoma, Norden Estates, FX International, Upgrade Invest, Proport,
Stockholm Treasury, Touchtech, Hunter Capital RTO 1/2 m.fl.). Kvarvarande 15:
Beowulf (rapporterar via brittiska RNS), Traton och PPI (utanför MFN),
RTO-skal utan kvartalsrapporter, samt några First North-bolag med udda
kanaler. Nya Spotlight-rapporter flödar in automatiskt framöver.

## 2026-08-14

### Finansiella data

| Dataset | Fill |
|---|---:|
| Dagliga kurser | 100% |
| Livekurser | 99,9% |
| Profiler | 99,0% |
| Årsbokslut | 98,6% (858/870) |
| Kvartalsbokslut | 98,4% (856/870) |
| R12/TTM | 49,3% (kräver fyra sammanhängande kvartal) |
| Kalender | 87,4% |
| Rapportdokument upptäckta | 92,4% (804/870) |
| Estimat | 6,7% (58/870) |
| Nyhetshistorik | 30,7% |

Fältnivå, årsbokslut: omsättning 97,6%, EBIT 94,6%, nettoresultat 94,5%,
eget kapital 97,0%, kassaflöde från driften 94,3%, capex 77,7%. Svagast:
utdelningar 38,7% och återköp 17,4% — luckor hos källan (Yahoo), inte i
pipelinen. Utdelningshistorik står som egen Phase 1-punkt i PROJECT_PLAN.

### VD-ord

Tre omgångar samma dag: extraktionsfixar (regexbuggen `kommentarer?`,
titelgrinden för upptäckta rapport-PDF:er, ihopklistrade rubrikrader,
omvänd rolordning "Koncernchef och VD har ordet", svenska typografiska
citat ”…”), periodjoin för språkdubbletter med relink av strandade rader,
och discovery-fixen för storbolag som sätter marknadsrubriker på sina
rapporter (periodupplösning via MFN:s egna sub:report-taggar,
dagnummer i månadsintervall, Kv1–Kv4, sexmånadersrapport m.m.):

| | I morse | Efter |
|---|---:|---:|
| Rapport-PDF:er med extraherat VD-ord | 699 | 1 021 |
| PDF:er utan sektion (`no_section`) | 707 | 337 |
| Bolag med VD-ord | 592 (68,0%) | **701 (80,6%)** |
| Bolag utan upptäckt rapportdokument | 66 | **27** |
| Innevarande kvartal complete/no_section | — | 693 / 150 (≈82% av upptäckta) |

2 400+ sektioner totalt, AI-sammanfattningskön tom. Storbolagsluckan
(Alfa Laval, AstraZeneca, H&M, Axfood, Kinnevik, Munters, Dustin, MTG,
Cavotec, Sampo) stängd på discovery-nivå; alla utom Alfa Laval och Sampo
har även VD-ord. 19 strandade bolag (bl.a. Volvo, Atlas Copco, Oneflow)
relinkade till redan extraherade sektioner.

### Kvarvarande luckor, i angreppsordning

1. **27 bolag utan upptäckt rapportdokument** — utanför MFN:s flöde helt
   (Traton, PPI Public Property, Spotlight-bolag via beQuoted m.fl.).
   Nästa steg är en beQuoted/Spotlight-connector.
2. **150 bolag med aktuell rapport men inget VD-ord** — delvis äkta (banker
   och fastighetsbolag skriver ofta inget; Alfa Laval har bara ett citat
   som pypdf:s textordning splittrar; Sampos länkade PDF är den finska
   utgåvan), delvis PDF:er med omkastad kolumnordning; hellre tomt än
   ihopblandad text.
3. **TTM 49,3%** — begränsas av kvartalsdjupet hos källan.
4. **Estimat 6,7%** — ingen historik över vad konsensus var före tidigare
   rapporter; Phase 5-frågan.
5. **5 PDF:er kräver riktig OCR.**
6. `financialComplete: 289` — PDF-siffertabellextraktionen är en yngre,
   kompletterande pipeline ovanpå Yahoo-boksluten; syns inte som hål på
   sajten.

Driftnotis 2026-08-14: mongod OOM-dödades två gånger under dagen (09:29
utan pågående batcharbete, 21:38 under omprocessningen) och startades om
automatiskt av docker utan dataförlust. Boxen har 3,8 GB. Åtgärdat 2026-08-15: 4 GB swapfil (swappiness 10) och
Claude Code-tmuxen på VPS:en (544 MB) avstängd. Kvarstående möjlig åtgärd:
capa WiredTiger-cachen (~0,75 GB) — mongods standard är ~1,4 GB på den här
boxen, vilket gör den till OOM-killerns förstahandsval.
