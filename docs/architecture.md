# Vlacky — Architektura aplikace

## Účel

Česká aplikace pro správu sbírky modelových vlaků a kolejiště. Umožňuje:
- Procházet katalog vozidel stažený z vagonWEB.cz (ČD, ČSD, ÖBB, RJ) s barevnými variantami
- Evidovat vlastní lokomotivy a vozy (s DCC adresami)
- Skládat vlakové soupravy s vizuálním zobrazením řazení
- Přidávat vozidla z katalogu do vlastní sbírky jedním kliknutím
- Spravovat DCC adresy a detekovat konflikty

## Nasazení

| | |
|---|---|
| **Aplikace** | https://vlacky.vercel.app |
| **Hosting** | Vercel (osobní účet, auto-deploy z GitHubu) |
| **GitHub** | https://github.com/simonvostry/vlacky |
| **Databáze** | Turso (libSQL) — `libsql://vlacky-xsima78.aws-eu-west-1.turso.io` |
| **Lokální fallback** | SQLite soubor `data/vlacky.db` (když chybí TURSO_* env vars) |

## Technologický stack

| Vrstva | Technologie |
|--------|-------------|
| Framework | Next.js 16 (App Router) |
| Jazyk | TypeScript |
| Styling | Tailwind CSS v4 |
| Databáze | Turso (libSQL) v produkci, SQLite (better-sqlite3) lokálně |
| ORM | Drizzle ORM (podporuje oba drivery) |
| Scraping | node-html-parser + fetch |
| Runtime skripty | tsx |

## Struktura projektu

```
vlacky/
├── data/
│   └── vlacky.db                    # SQLite databáze (gitignored)
├── public/
│   └── img/
│       ├── catalog/                 # ~900 stažených obrázků z vagonWEB
│       ├── logo-cd.svg              # Logo ČD
│       ├── logo-csd.svg             # Logo ČSD
│       ├── logo-obb.svg             # Logo ÖBB
│       ├── logo-db.svg              # Logo DB
│       ├── logo-rj.svg             # Logo RegioJet
│       └── *.gif                    # Obrázky z ručních importů
├── reference/
│   └── ec70.html                    # Původní prototyp
├── src/
│   ├── app/                         # Next.js stránky a API
│   ├── components/                  # React komponenty
│   └── db/                          # Schema, připojení, scrapery
├── drizzle.config.ts
├── package.json
└── CLAUDE.md
```

## Datový model

### 6 tabulek v SQLite

```
┌──────────────────┐     ┌──────────────────┐
│     vehicles      │     │      trains       │
│ (vlastní modely)  │     │    (soupravy)     │
├──────────────────┤     ├──────────────────┤
│ id               │     │ id               │
│ designation      │     │ number           │
│ operator         │     │ name             │
│ type (loco/wagon)│     │ category (EC/R/Os)│
│ classType        │     │ route            │
│ imagePath        │     │ era              │
│ manufacturer     │     │ notes            │
│ catalogNumber    │     └────────┬─────────┘
│ dccAddress       │              │
│ notes            │              │
└────────┬─────────┘              │
         │                        │
         │    ┌───────────────────┘
         │    │
    ┌────┴────┴────────┐
    │  train_vehicles   │
    │ (pozice v soupr.) │
    ├──────────────────┤
    │ trainId (FK)     │
    │ vehicleId (FK)   │
    │ position         │
    │ dccAddressOverride│
    │ lightingDecAddr  │
    │ notes            │
    └──────────────────┘

┌──────────────────┐     ┌──────────────────┐
│decoder_functions │     │ vehicle_catalog  │
│ (funkce F0–F28)  │     │ (z vagonWEB.cz)  │
├──────────────────┤     ├──────────────────┤
│ vehicleId (FK)   │     │ designation      │
│ functionNumber   │     │ code             │
│ label            │     │ fullDesignation  │
│ description      │     │ operator         │
│                  │     │ wagonFamily      │
│                  │     │ type, classType  │
│                  │     │ uicNumber        │
│                  │     │ yearBuilt        │
│                  │     │ manufacturer     │
│                  │     │ maxSpeed         │
│                  │     │ imagePath        │
│                  │     └────────┬─────────┘
│                  │              │
│                  │     ┌───────┴──────────┐
│                  │     │  catalog_images   │
│                  │     │ (barevné varianty)│
│                  │     ├──────────────────┤
│                  │     │ catalogId (FK)   │
│                  │     │ imagePath        │
│                  │     │ label (epocha)   │
│                  │     │ sortOrder        │
└──────────────────┘     └──────────────────┘
```

### Klíčové vztahy

- **vehicles** = fyzické modely, které vlastním (s DCC adresami)
- **trains** = pojmenované soupravy
- **train_vehicles** = spojovací tabulka: který vůz na jaké pozici v soupravě
- **vehicleCatalog** = referenční katalog všech typů vozidel z vagonWEB.cz
- **catalogImages** = více barevných variant (nátěrů) pro každý typ v katalogu
- **decoder_functions** = mapování DCC funkcí F0–F28 na konkrétní vozidlo

## Stránky (URL)

### UI stránky

| URL | Popis |
|-----|-------|
| `/` | Přesměrování na `/katalog` |
| `/katalog` | Katalog vozidel — hlavní stránka s filtry (typ, dopravce, barvy) |
| `/katalog/[id]` | Detail typu — všechny barevné varianty, specifikace, dekodér označení, tlačítko "Přidat" |
| `/soupravy` | Seznam vlakových souprav s vizuálním řazením |
| `/soupravy/[id]` | Detail soupravy — vizuální řazení + správa vozidel |
| `/soupravy/[id]/upravit` | Úprava soupravy |
| `/soupravy/novy` | Nová souprava |
| `/lokomotivy` | Knihovna vlastních lokomotiv |
| `/lokomotivy/[id]` | Detail lokomotivy (DCC adresa, zařazení ve vlacích) |
| `/lokomotivy/[id]/upravit` | Úprava lokomotivy |
| `/lokomotivy/novy` | Nová lokomotiva (s předvyplněním z katalogu) |
| `/vozy` | Knihovna vlastních vozů |
| `/vozy/[id]` | Detail vozu |
| `/vozy/[id]/upravit` | Úprava vozu |
| `/vozy/novy` | Nový vůz (s předvyplněním z katalogu) |
| `/dcc` | Přehled DCC adres a detekce konfliktů |
| `/vozidla` | Přesměrování na `/lokomotivy` (zpětná kompatibilita) |

### API endpointy

| Metoda | URL | Popis |
|--------|-----|-------|
| GET/POST | `/api/vozidla` | Seznam / vytvoření vozidla |
| GET/PUT/DELETE | `/api/vozidla/[id]` | CRUD vozidla |
| GET/POST | `/api/vlaky` | Seznam / vytvoření vlaku |
| GET/PUT/DELETE | `/api/vlaky/[id]` | CRUD vlaku |
| POST/PUT/DELETE | `/api/vlaky/[id]/vozidla` | Správa řazení (přidat, přesunout, odebrat) |

## Komponenty

| Komponenta | Účel |
|------------|------|
| `nav.tsx` | Horní lišta s navigací, filtry katalogu, tlačítky |
| `train-composition.tsx` | Vizuální řazení soupravy (obrázky vozů na koleji) |
| `train-vehicle-manager.tsx` | Správa řazení (přidávání, řazení ↑↓, odebírání) |
| `class-badge.tsx` | Odznak třídy (1, 2, R, L) s barvou |
| `operator-logo.tsx` | Logo dopravce (ČD, ÖBB, ČSD, DB, RJ) |
| `designation-decoder.tsx` | Dekodér UIC označení (význam písmen) |
| `vehicle-form.tsx` | Formulář pro vozidlo |
| `train-form.tsx` | Formulář pro vlak |
| `decoder-functions.tsx` | Editor funkcí dekodéru F0–F28 |

## Scrapery a import dat

### Hlavní scrapery (src/db/)

| Skript | Příkaz | Zdroj | Výstup |
|--------|--------|-------|--------|
| `scrape-vagonweb.ts` | `npm run db:scrape` | Popisy stránky (tabulkový pohled) | vehicleCatalog tabulka |
| `scrape-images.ts` | `npm run db:scrape-images` | Popisy stránky (skupinový pohled) | catalogImages + stažené GIFy |
| `scrape-rady.ts` | `npx tsx src/db/scrape-rady.ts` | Řady stránky (1957–2026) | Další katalogové záznamy + obrázky |

### Zdroje dat z vagonWEB.cz

| Stránka | Parametr | Operátor | Obsah |
|---------|----------|----------|-------|
| `popisy.php?k=CD_Y` | `z=p&p=v` | ČD | UIC-Y vozy (84 záznamů) |
| `popisy.php?k=CD_Z` | `z=p&p=v` | ČD | UIC-Z vozy (84 záznamů) |
| `popisy.php?k=CSD_4n_II` | `z=p&p=v` | ČSD/ČD | Starší vozy (68 záznamů) |
| `popisy.php?k=RJ` | `z=p&p=v` | RJ | RegioJet vozy (40 záznamů) |
| `popisy.php?k=OeBB_1` | `z=p&p=v` | ÖBB | Rakouské vozy (63 záznamů) |
| `rady.php?z=ČD` | rok 1994–2026 | ČD | Lokomotivy + vozy s obrázky |
| `rady.php?z=ČSD` | rok 1957–1993 | ČSD | Historický vozový park |

### Import konkrétních vlakových souprav

| Skript | Vlak | Rok |
|--------|------|-----|
| `seed.ts` | EC 70 Antonín Dvořák | 1998/1999 |
| `import-rj1014.ts` | RJ 1014 RegioJet | 2026 |
| `import-rj55.ts` | RJ 55 Vindobona | 2026 |
| `import-ex355.ts` | Ex 355 Západní expres | 2021 |
| `import-r452.ts` | R 452 | 2007 |
| `import-r670.ts` | R 670 Labe | 2026 |
| `import-os9065.ts` | Os 9065 | 2026 |
| `import-sp1641.ts` | Sp 1641 Ondráš | 2002 |

## Aktuální statistiky

| Metrika | Hodnota |
|---------|---------|
| Záznamy v katalogu | ~521 |
| Barevné varianty | ~1 609 |
| Obrázky na disku | ~900 |
| Importované soupravy | 8 |
| Vlastní vozidla | ~53 |
| Loga dopravců | 6 (ČD, ČSD, ÖBB, DB, RJ + odkaz ČSD/ČD) |

## Vizuální zobrazení souprav

Soupravy se zobrazují jako horizontální řada obrázků vozidel:
- Obrázky ve scale 0.75× (kompromis mezi ostrostí na retina a čitelností)
- Lokomotivy ~127×44px, vozy ~198×31px na obrazovce
- Pod každým vozidlem: logo dopravce, třída, označení, číslo vozu
- Kolej (šedá čára 1px) pod obrázky

## Katalog — filtry

Filtry v horní liště (URL parametry):
- **Typ**: `?typ=loco` / `?typ=wagon` / (vše)
- **Dopravce**: `?op=ČD` / `?op=ČSD` / `?op=ÖBB` / `?op=RJ`
- **Barevné varianty**: `?barvy=1` (zobrazit všechny nátěry)

Filtry se kombinují a fungují s tlačítkem zpět v prohlížeči.

## Dekodér označení

Komponenta `designation-decoder.tsx` rozšifruje UIC označení:
- Velká písmena: A=1.třída, B=2.třída, AB=smíšený, WR=jídelní, WL=lůžkový, D=zavazadlový
- Malá písmena: m=delší než 24,5m, p=velkoprostorový, z=napájení z vedení, f=řídící, ee=centrální napájení, d=kola, h=bezbariérový...

## Příkazy

```bash
npm run dev              # Spustit vývojový server
npm run build            # Sestavit pro produkci
npm run db:push          # Synchronizovat schema do SQLite
npm run db:seed          # Naplnit vzorová data
npm run db:scrape        # Stáhnout katalog z vagonWEB
npm run db:scrape-images # Stáhnout obrázky barevných variant
npx tsx src/db/scrape-rady.ts       # Stáhnout řady (ČD+ČSD)
npx tsx src/db/scrape-rady.ts csd   # Jen ČSD (1957–1993)
npx tsx src/db/import-*.ts          # Import konkrétní soupravy
```

## Budoucí rozšíření

- Propojení katalogu s vlastními vozidly (FK `catalogId` na `vehicles`)
- Import souprav přímo z UI (vyhledání na vagonWEB, klik na import)
- Další dopravci (ZSSK, PKPIC, MÁV-START...)
- Deploy na Vercel (migrace SQLite → Turso)
