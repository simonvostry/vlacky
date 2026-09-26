# Design and image handling

[Documentation index](../README.md#documentation)

## Approved design

Tichá galerie is the selected visual direction: crisp system sans-serif type,
restrained surfaces and blue actions, with train artwork providing the visual detail.
Hluboká modř is the default light theme; Noční galerie is the dark theme. The exact
semantic palette lives in [globals.css](../src/app/globals.css), not in study images.
Tune those shared roles instead of adding page-specific gray/blue values.

Global navigation stays at the top. A future contextual sidebar may supplement it.
Collection add actions live in the top bar beside the theme/account controls: a
compact plus and “Přidat” in blue with a transparent background and neutral hover.
Use `CollectionActions` on Soupravy, Lokomotivy and Vozy with contextual accessible
labels and standard target sizes. Do not add a separate row above the lists.
Train selection uses a subtle gray/slate fill and slightly rounded corners, with
no enclosing border or left accent; hover uses a lighter fill. The list hides general
prose below vehicle images but keeps short `Číslo vozu:` labels. Full notes remain
available in details.

Four independent display toggles beside the theme control show/hide Dopravce
(logo/name), Číslo (the `Číslo vozu:` service number), Třída (class badge) and Typ
(designation, e.g. Bmz 61 or 642). They share one selection across Soupravy,
Lokomotivy, Vozy and Katalog, including read-only detail pages and train side panels.
DCC and creation/edit forms have no display controls and retain all information.
Page titles, form fields, image alt text, DCC addresses, model catalog numbers and
freeform notes remain visible/accessible; filters affect only explicitly marked
presentation labels. A field absent from a page has nothing to toggle there.

All default on. Keep the existing `vlacky-train-labels-hidden` browser/origin storage
key to preserve saved choices; restore before paint and synchronize across tabs,
even while a tab is on DCC or a form. Turning everything off removes pure label
rows, while preserving descriptions. On narrow screens the controls wrap below
navigation. Catalog content filters remain separate from these display settings.

## Themes and controls

`src/lib/theme.ts` defines the `vlacky-theme` localStorage key and defensive inline
head bootstrap. `ThemeToggle` restores the explicit choice before paint, persists
it per browser/origin and synchronizes changes across tabs. Light is the default;
there is no OS auto-selection or database preference. If storage is unavailable,
switching still works in-page and a later reload defaults to light. Preserve the
hydration handling when changing the root layout. Login also has the toggle.

- Use `EditAction` for pencil-only edits with contextual localized accessible names
  and hover/focus tooltips. Keep text for Save, Cancel and Add.
- Use shared `ui-button` and `ui-icon-button` styles: 36px desktop targets, 14px
  action text, 6px corners; coarse-pointer targets expand to 44px. Fields are 40px.
- Entity headings are 28px, section headings 18px. Use tabular numbers for tables.
- Preserve visible keyboard focus and distinct hover, selection, disabled and error
  states. A tooltip must not be required to activate a touch control.
- Chart colors use theme variables; reverse curves also use a distinct line style.
  Display speeds with exactly one Czech decimal place; never round stored values.
- Keep operator logos and class badges in their identity colors. Dark mode gives
  operator logos a small light backing; it does not recolor train artwork.

Operator logos are registered in `src/components/operator-logo.tsx` by the stored
operator name. Unknown operators retain a text fallback. The Vogtlandbahn wordmark
uses the original [Wikimedia SVG](https://commons.wikimedia.org/wiki/File:Vogtlandbahn_logo.svg)
behind the supplied PNG preview; keep its proportions and original colors.

## Layout and image dimensions

| Surface | Display size relative to stored native dimensions |
| --- | --- |
| Catalog/vehicle overview, train composition and compact details panel | 0.75× |
| Catalog detail | 1× |
| Wagon and legacy vehicle detail | 2×, with local horizontal scrolling when needed |
| Locomotive detail header | Up to 2×, shrinking proportionally to fit; no horizontal scroller |

The locomotive image occupies a full-width left-aligned row above identity and
metadata. Below it are equal desktop columns: DCC and train appearances left, speed
profile right; stack below `lg`. Decoder forms use container queries to fit either
half-width locomotive or full-width wagon sections.

Grid tiles use wrapping flex layout with `shrink-0`, preserving vehicle proportions.
`VehicleImage` uses unoptimized sources and inline `maxWidth: "none"` to override
Tailwind's image reset. The locomotive header deliberately uses a responsive width
expression. Long train compositions may scroll locally; the page must not overflow.

## Artwork pipeline

[The image mapping](../src/lib/enhanced-vehicle-images.json) maps original source
paths to transparent 4× WebP UI derivatives in `public/img/enhanced/`. Shared paths
use the derivative throughout the UI. Removing a mapping restores the original.
Stored dimensions and original MCP/iTrain downloads remain unchanged.

Image masters, prompts and reference photographs stay local in `output/`. Rebuild
shared derivatives with `node scripts/prepare-train-images.mjs` only when those
masters are available; a fresh checkout already contains the active derivatives.
The exporter crops the generated artwork, fits it to the original visible height,
and restores transparent top/bottom rows. Keep couplers tight at both horizontal
ends. Do not stretch the visible drawing into the entire padded canvas or use
contain/padded composition exports.

Run `node scripts/check-train-image-edges.mjs` after image changes: it checks exact
4× dimensions, original vertical bounds and tight side spacing. AI artwork is
illustrative and may alter fine markings; never use it as specification evidence.

The Ex 250 historical set uses `scripts/prepare-ex250-images.mjs` with the same
export contract. Its original references, built-in imagegen prompts, PNG masters
and review board live in ignored `output/train-250-1992/`; final WebP derivatives
are in `public/img/enhanced/`. Catalog originals use operator-prefixed filenames
to avoid collisions between similarly named ČD and ČSD liveries. Byte-identical
existing WR/WLAB originals are reused. Vehicle forms and badges support mixed
first/second class, sleeping, couchette and baggage/postal vehicles.

For a paint variation belonging to one physical model, create a unique native asset
under `public/img/owned/`, add its derivative/mapping and change only that vehicle's
image path. Preserve identity, DCC, profiles and shared catalog assets. Publish assets
before assigning a new production path. Image URLs require authentication: a 200
response containing the login page is not proof that the image loaded. Verify in an
authenticated browser or through the authorized image integration.

The app icon is a transparent close crop of Brejlovec cab glazing. Native icon assets
live in `src/app/`; `scripts/prepare-app-icon.mjs` rebuilds them from the local master.
The top-left home link reuses `src/app/icon.png` at 44px instead of a text wordmark,
with a transparent background in both themes and an accessible “Vláčky — Soupravy” label.

## Verification

Check both themes, a narrow viewport, long Desiros, form controls, edit/cancel,
keyboard focus and remembered selection. The [2026-09-20 review](reviews/theme-2026-09-20.md)
records the implementation checks. Local image-generation boards are historical
explorations; do not reintroduce their placeholder data or abandoned palette options.

Passenger and freight wagon libraries use the same gallery tiles and shared editors.
Top navigation names them **Osobní vozy** and **Nákladní vozy** and wraps on narrow
screens. Both retain the compact top-bar add action and shared display preferences.
Soupravy uses quiet Vše / Osobní / Nákladní filter buttons with the selected semantic
surface. Freight forms omit passenger class controls; shared locomotives have no
passenger/freight restriction.

The yellow/brown ČSD Uacs (Raj) artwork is exported by
`scripts/prepare-uacs-images.mjs` from the approved master in
`output/freight-uacs/`. With no native side-elevation source, it uses a 145 × 42
native PNG and a 580 × 168 WebP derivative. Width-only resizing preserves the
approved silhouette; trim transparent margins to keep couplers adjacent. The
photograph, generation prompts and full-resolution master stay local. Markings
in this reconstructed artwork are illustrative, not verified vehicle identities.

### Common scale for new freight artwork

For reconstructed freight side views, use **10 native display pixels per metre of
prototype length over buffers**, rounded to the nearest pixel. A verified N-scale
model length can corroborate this (`model mm × 160 / 1000` gives prototype metres).
This is a common physical scale, not a fixed thumbnail width: the approximately
14.5 m Uacs is 145 px; the 29.61 m Sggmrrs double wagon is 296 px. UI scale factors
above apply equally to both. Keep permanently coupled double wagons as one owned
model and one complete image; do not halve their recorded image length.

Use a true perpendicular side elevation, align wheel contact baselines, and trim
horizontal transparency to the outer coupling gear. Resize by width only to preserve
the reconstructed silhouette; never stretch every wagon into a shared width/height.
Keep the transparent 4× derivative consistent with the native canvas and verify with
`check-train-image-edges.mjs`. Compare mixed wagons on both theme backgrounds.
Record the dimension source and distinguish verified length from inferred height.
Existing catalog artwork is not silently rescaled by this rule.

`scripts/prepare-custom-dhl-image.mjs` exports the individually photographed,
weathered DB Cargo Lgs 579 with a DHL swap body to a unique `img/owned/` asset,
4× preview and full-resolution detail derivative. Its private master is in
`output/freight-dhl-custom/`; uploaded personal photographs in `x/` are excluded
from Git and deployment. The provisional 136 px width uses the Fleischmann Lgs 579
chassis length of 85 mm in N (13.6 m equivalent); measure the individual model to
confirm. The supplied 824204 listing shows a different load, so it does not establish
this physical piece's exact SKU or running number. Preserve those uncertainties.

`scripts/prepare-sggmrrs-images.mjs` exports the empty ČD Cargo Smart GigaWood from
`output/freight-sggmrrs/master-v3.png` at 296 × 43 and 1184 × 172 px. Its 29.61 m
length comes from [Innofreight's Smart GigaWood specification](https://www.innofreight.com/wp-content/uploads/2025/04/Smart_GigaWood_EN.pdf);
the [model listing](https://www.itvlaky.cz/plosinove-n/n657009/) states 185 mm in N.
Reference photos, prompts, discarded candidates and light/dark comparison boards
remain local in `output/freight-sggmrrs/`.

`scripts/prepare-fleischmann-freight-images.mjs` exports DB DDm (6260066), DB Zags
(6660081) and AAE T2000/DHL (6660069) from local `output/freight-fleischmann/` masters.
The Fleischmann catalogs give N-model lengths of 330 mm for the two separate DDm
wagons together, 110 mm for Zags and 214 mm for the complete articulated T2000.
At the shared scale these become 264, 176 and 342 native pixels respectively.
These are model-length conversions, not independently verified prototype dimensions.
The exporter resolves integer resize rounding with transparent bottom rows, retaining
width-only artwork proportions and exact 4× canvases; the edge check still applies.

`scripts/prepare-covered-freight-images.mjs` exports the three individual Minitrix
15116 liveries, Fleischmann 837703/837715/826251 and REE NW-089 from local
`output/freight-covered/` masters. Each has its own artwork and owned record.
The REE scale is provisional: 213 mm model length gives 341 native pixels; listings
also quote 217 mm and an inconsistent 121 mm. Preserve this uncertainty in its
vehicle notes until the physical model is measured. Its loads are road semitrailers,
including their wheels, rather than containers. Transparent rounding rows may be
split between top/bottom to satisfy the unchanged alpha-bound checks without stretching.

### Wagon quantities

Wagon collection tiles show one image per stable variant and an owned `N ks` badge.
Display filters affect identity labels, never the quantity. The detail route remains
the physical vehicle URL for compatibility; its shared image is followed by “Moje
kusy” and the selected piece's notes, DCC and appearances. Individual piece rows
show stable IDs, optional running numbers and per-piece equipment/weathering values,
with accessible pencil actions. General lighting retains Ano / Ne / Nezjištěno. Selection uses `bg-selected`.

The edit form explicitly offers a single-piece or whole-variant scope for shared
model/artwork fields. Its physical settings always affect only the selected piece.
Quantity reductions require selecting the pieces and confirming configuration loss;
assigned pieces cannot be deleted. The train picker shows grouped availability,
a quantity control, selected artwork and an optional specific-piece checklist.

### Detail image magnifier

`VehicleDetailImage` adds a cursor-following lens to locomotive, passenger wagon,
freight wagon and legacy vehicle details. Normal galleries and composed trains keep
using the compact 4× derivatives. Larger detail artwork is loaded on first hover or
keyboard focus only. Tab focuses the image, arrows move the inspection point, and
Escape closes the lens. Pointer leave, scrolling, window blur and resizing dismiss
it. Touch gestures remain ordinary page/image scrolling.

The magnification is bounded by both actual loaded image dimensions divided by
rendered CSS dimensions and `window.devicePixelRatio`, with a maximum of 3×. An
image already at its native display-pixel limit offers no enlargement. A missing
zoom asset falls back to the loaded preview with the same pixel cap. Browser zoom
and viewport changes remeasure the available resolution. The lens uses semantic
surface/border roles, stays inside the viewport and cannot intercept pointer input.

`src/lib/zoom-vehicle-images.json` maps original paths to detail-only WebP derivatives
in `public/img/zoom/`. Rebuild with `node scripts/prepare-vehicle-zoom.mjs` when the
private approved masters and earlier export manifests are available. The exporter
uses the same approved cutouts and geometry as existing previews, retains transparent
padding and never enlarges beyond the master crop in either axis. It does not
regenerate artwork, change stored vehicle dimensions, or alter MCP/iTrain images.
A source whose artwork is replaced must have its zoom derivative rebuilt or its zoom
mapping removed too. Private masters, references and review captures stay in output/.

### Additional operator SVGs

Logos are registered in `operator-logo.tsx`, not separate database records. Existing
operator strings automatically use the registered asset throughout galleries,
compositions and operator badges. Display height remains caller-controlled
(typically 12–16 CSS px); SVG viewBoxes preserve proportions at every pixel density.
ZSSK and ZSSK Cargo have distinct registrations. DB retains its plain DB mark;
DB Cargo uses a horizontal mark with the original black lettering to its right.

| Asset | Source / attribution | License and adaptation |
| --- | --- | --- |
| `logo-cd-cargo.svg` | [ČD Cargo, a.s., via Wikimedia](https://commons.wikimedia.org/wiki/File:Logo_cd_cargo.svg) | Commons PD-textlogo; intrinsic dimensions normalized, vector artwork retained |
| `logo-zssk.svg` | [ZSSK logo, converted by Marsupilami from operator vector data](https://commons.wikimedia.org/wiki/File:%C5%BDelezni%C4%8Dn%C3%A1_spolo%C4%8Dnos%C5%A5_Slovensko_logo.svg) | Commons PD-textlogo; original viewBox and artwork retained |
| `logo-zssk-cargo.svg` | [ŽSR attribution, via Wikimedia](https://commons.wikimedia.org/wiki/File:ZSSK_Cargo.svg) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); explicit intrinsic dimensions added, artwork unchanged |
| `logo-db-cargo.svg` | [Communication DB Cargo France, via Wikimedia](https://commons.wikimedia.org/wiki/File:DB-Logo-data.svg) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); horizontal adaptation retains original paths/colors, moves DB by −0.7 horizontally and Cargo by (120, −74.729), viewBox 253 × 70; this derivative remains CC BY-SA 4.0 |

The remaining named companies in the collection/catalog are covered by SVGs too:

| Asset / stored operator | Source / attribution | License and adaptation |
| --- | --- | --- |
| `logo-sncf.svg` / SNCF | [French Wikipedia SVG, sourced from SNCF's brand portal](https://fr.wikipedia.org/wiki/Fichier:Logo_SNCF_(2011).svg) | Registered trademark; rights remain with SNCF; original gradient and paths retained, editor metadata removed |
| `logo-dlb.svg` / DLB | [Länderbahn route-map vectors via Wikimedia](https://commons.wikimedia.org/wiki/File:L%C3%A4nderbahn_logo.svg) | Commons PD-textlogo; original paths/colors retained, explicit viewBox added |
| `logo-aae.svg` / AAE | [AAE vectors converted by Imalipusram via Wikimedia](https://commons.wikimedia.org/wiki/File:AAE_Ahaus_Alst%C3%A4tter_Eisenbahn_logo.svg) | Commons PD-textlogo; original artwork/viewBox retained |
| `logo-hz-cargo.svg` / HŽ Cargo | [HŽ Cargo's official website SVG](https://www.hzcargo.hr/wp-content/uploads/2023/07/header-logo.svg) | Rights remain with HŽ Cargo; artwork unchanged |

These four assets embed source descriptions and contain only self-contained vectors
(including internal gradient/clip references). DLB uses the Länderbahn company mark;
AAE keeps its own identity rather than substituting a successor's logo. Logos identify
the stored company; the registry does not automatically select marks by historical era.
Wagon, legacy vehicle and catalog detail headings now use the same `OperatorLogo`
as galleries and train panels, retaining the operator display toggle. Catalog metadata
still spells out the operator name. Unknown/blank values retain text/no-logo fallback.
No collection records or operator strings are changed by adding assets. Long URLs in
vehicle notes wrap on narrow screens; catalog livery actions wrap below the artwork
when they cannot fit beside it.

DB Cargo and ZSSK Cargo SVGs embed source/author/license descriptions. Keep those
credits and the derivative licenses with redistributed assets. Dark mode continues
to use the shared light backing behind operator logos without recoloring them.

### Model manufacturer logos

`ManufacturerLogo` replaces model-maker text in locomotive/wagon/legacy vehicle
parameters and the train details panel. It does not add another label row to galleries.
Model manufacturers remain stored as text; missing values are not inferred from
artwork or catalog links. Catalog prototype builders and decoder manufacturers are
separate fields and retain their existing presentation. No database migration is needed.

The registry covers the collection's Fleischmann, Minitrix, REE Models and Sudexpress.
Matching ignores case, accents and extra spaces; REE Modèles and Sud Express are
explicit aliases. Unknown names retain readable text. Logos preserve proportions,
fit within 112 × 24 CSS px (64 × 16 in the panel), have accessible names and a title,
and are not affected by the operator display toggle. Dark mode shares the operator
logos' light backing. Sudexpress's official white mark uses a navy backing in both themes.

| Asset | Original source | Preparation / rights |
| --- | --- | --- |
| `manufacturer-fleischmann.svg` | [Wikimedia source credited to Gebr. Fleischmann GmbH und Co. KG](https://commons.wikimedia.org/wiki/File:Logo_FLEISCHMANN.svg) | Commons PD-textlogo; retains original red wordmark paths, omits frame/tagline for small display |
| `manufacturer-minitrix.svg` | [Märklin's Minitrix 2026 catalog, cover](https://streaming.maerklin.de/public-media/m/nht26/minitrix_nh2026/DE_minitrix_nh2026_Online.pdf) | Original green vector wordmark paths extracted without tracing; rights remain with Gebr. Märklin & Cie. GmbH |
| `manufacturer-ree-modeles.svg` | [REE's 2025 H0 catalog, cover](https://catalogues.ree-modeles.com/2025-ree-ho/2025-Catalogue-REE.pdf) | Original emblem/REE paths and outlined MODELES glyphs; omits tagline; rights remain with Rails Europ Express |
| `manufacturer-sudexpress.png` | [Sudexpress official website logo](https://www.sudexpressmodels.eu/Content/img/logo.png) | Original transparent 220 × 50 PNG, metadata removed without resampling; no genuine vector found in the inspected sources; rights remain with Sudexpress |

SVG assets embed source descriptions, use self-contained paths, and contain no fonts,
scripts, external references or embedded raster images. Sudexpress stays a PNG rather
than a raster wrapped in SVG; its 50 px source height covers the 24 px Retina rendering.
Research PDFs, source downloads and review captures stay in ignored output/.

### Physical equipment controls

Wagon edit forms use checkboxes for magnetic couplers at fixed ends A/B, red tail
lights, an installed sound decoder and a built-in speaker. Unchecked means No.
General lighting remains a separate nullable field; it is not reinterpreted as tail
lights. The independent “Patinováno” checkbox is available for both locomotives and
wagons. These settings always describe the selected physical piece, not its siblings.

Wagon piece lists show explicit Yes/No values; locomotive details show weathering.
The train picker identifies variants containing a speaker and lists the equipment
of each selectable piece. Active equipment appears under the vehicle in the ordering
table and train side panel. A speaker wagon not directly behind a locomotive gets
a quiet placement hint; the user chooses the order and no automatic reorder occurs.
Equipment is not hidden by the four identity display toggles. Quantities and shared
artwork keep their previous behavior.
