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
automatiskt av docker utan dataförlust. Boxen har 3,8 GB och ingen swap;
en swapfil är fortfarande den utestående åtgärden.
