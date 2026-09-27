# Railway epochs (Epocha)

[Documentation index](../README.md#documentation)

Epochs describe the historical appearance represented by a model: livery, markings,
operator and operating state. They are not the production year of the miniature or
the complete service life of its prototype class.

[MOROP NEM 800](https://www.morop.org/images/NEM_register/NEM_E/nem800_en_2007.pdf)
defines six epochs, I–VI, and allows overlaps. A model can belong to several epochs.
Dates are country-specific: for example, [NEM 805 CZ (2024)](https://www.morop.eu/images/NEM_register/NEM_D/nem805CZ_de_2024.pdf)
places Czech V in 1993–2013 and VI from 2014, while manufacturers often use their own
catalogue convention. Do not silently translate a manufacturer's label to different
year cutoffs, or assume all ČD Cargo models are VI.

## Data and editing

`vehicles`, `vehicle_catalog` and `catalog_images` each have `epochs` (JSON array of
unique integers 1–6, default `[]`) and nullable `epoch_notes`. UI uses Roman numerals;
an empty list means **Nevyplněna**, never all epochs. The API sorts input, rejects
invalid/duplicate identifiers and null lists. Omission preserves values; `[]` clears.

Owned epochs and source notes are shared model specifications through
`wagon-storage.ts`: variant edits propagate, additional copies inherit, and a
piece-only change splits a shared variant. Changing epochs without supplying new
source notes clears stale evidence; the form also clears it when selection changes.
Equipment, IDs, memberships and calibration remain independent.

A catalog type's epochs describe its base artwork; each livery has its own values.
Do not inherit the type's epoch when a specific livery is unknown. The authenticated
add form reads epochs from the selected catalog/livery record, never URL claims.
Owned edits do not rewrite catalog reference data. Exact image/operator matches may
be populated in a reviewed maintenance operation; matching only a class or catalog
foreign key is insufficient.

Details show epoch labels and expandable provenance. Editing offers six independent
checkboxes plus optional source notes. Collection and catalog filters include six
epoch choices and Nevyplněna. Selecting V matches both V and V/VI. Epoch selections
use existing per-section filter memory and reset behavior. Catalog filtering matches
base or livery epochs and shows matching artwork even when color variants are off.

## Research policy

1. Prefer the manufacturer's exact product/SKU and its own epoch designation.
2. A verified matching reference livery can support an assignment; explicitly say
   that it does not identify the owned miniature's manufacturer or SKU.
3. For historical imports without SKU, record the documented operating state and
   the applicable national NEM as a reasoned attribution. A documented year proves
   inclusion in that epoch, not an exhaustive lifetime or exclusivity.
4. Keep unknown when paint/identity conflicts, a custom conversion has no historical
   reference, or only the class's general history can be found. Record the missing
   evidence in `epoch_notes`. Never use generated lettering as a source.

Sources and reasoning belong with each record. Private inventory reviews and
backfill manifests stay in ignored `output/`; collection backups stay in
`data/backups/`. The additive migration makes no historical guesses.

Examples checked during initial research: REE NW-089 is V/VI; Fleischmann 837715
(script Cargo logo) is V; 837708 (modern logo) is VI. These last two share a prototype
family but must retain different livery epochs.
