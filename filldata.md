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

Dagens extraktionsfixar (regexbuggen `kommentarer?`, titelgrinden för
upptäckta rapport-PDF:er, ihopklistrade rubrikrader) plus omprocessning av
backloggen och periodjoinen för språkdubbletter:

| | I morse | Efter |
|---|---:|---:|
| Rapport-PDF:er med extraherat VD-ord | 699 | 812 |
| PDF:er utan sektion (`no_section`) | 707 | 344 |
| Bolag med VD-ord | 592 (68,0%) | 635 (73,0%) |
| Innevarande kvartal complete/no_section | — | 631 / 172 (≈78% av upptäckta) |

2 052 sektioner totalt (156 nya idag), 1 756 med färdig AI-sammanfattning,
sammanfattningskön tom. Hela dokumentbackloggen dränerad: 0 pending,
4 failed, 5 needs_ocr.

19 bolag (bl.a. Volvo, Atlas Copco, Oneflow, Synsam) hade extraherade
sektioner som aldrig nådde sajten för att aktuell-raden pekade på fel
språkdubblett; relinkade 2026-08-14, joinen går nu på symbol + räkenskaps-
period.

### Kvarvarande luckor, i angreppsordning

1. **66 bolag utan upptäckt rapportdokument** — discovery-luckan (rapporter
   utanför MFN/Cision-flödena).
2. **172 bolag med aktuell rapport men inget VD-ord** — delvis äkta (banker
   och fastighetsbolag skriver ofta inget), delvis PDF:er där pypdf kastar om
   kolumnordningen; hellre tomt än ihopblandad text.
3. **TTM 49,3%** — begränsas av kvartalsdjupet hos källan.
4. **Estimat 6,7%** — ingen historik över vad konsensus var före tidigare
   rapporter; Phase 5-frågan.
5. **5 PDF:er kräver riktig OCR.**
6. `financialComplete: 289` — PDF-siffertabellextraktionen är en yngre,
   kompletterande pipeline ovanpå Yahoo-boksluten; syns inte som hål på
   sajten.
