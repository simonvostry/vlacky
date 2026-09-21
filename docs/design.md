# Design and image handling

[Documentation index](../README.md#documentation)

## Approved design

Tichá galerie is the selected visual direction: crisp system sans-serif type,
restrained surfaces and blue actions, with train artwork providing the visual detail.
Hluboká modř is the default light theme; Noční galerie is the dark theme. The exact
semantic palette lives in [globals.css](../src/app/globals.css), not in study images.
Tune those shared roles instead of adding page-specific gray/blue values.

Global navigation stays at the top. A future contextual sidebar may supplement it.
Collection add actions live above their lists, aligned right: a compact plus and
“Přidat” in blue with a transparent background and neutral hover. Use the shared
`CollectionActions` on Soupravy, Lokomotivy and Vozy; keep contextual accessible
labels and standard target sizes. Creation actions do not belong in global navigation.
Train selection uses a subtle gray/slate fill and slightly rounded corners, with
no enclosing border or left accent; hover uses a lighter fill. The list hides general
prose below vehicle images but keeps short `Číslo vozu:` labels. Full notes remain
available in details.

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

For a paint variation belonging to one physical model, create a unique native asset
under `public/img/owned/`, add its derivative/mapping and change only that vehicle's
image path. Preserve identity, DCC, profiles and shared catalog assets. Publish assets
before assigning a new production path. Image URLs require authentication: a 200
response containing the login page is not proof that the image loaded. Verify in an
authenticated browser or through the authorized image integration.

The app icon is a transparent close crop of Brejlovec cab glazing. Native icon assets
live in `src/app/`; `scripts/prepare-app-icon.mjs` rebuilds them from the local master.

## Verification

Check both themes, a narrow viewport, long Desiros, form controls, edit/cancel,
keyboard focus and remembered selection. The [2026-09-20 review](reviews/theme-2026-09-20.md)
records the implementation checks. Local image-generation boards are historical
explorations; do not reintroduce their placeholder data or abandoned palette options.
