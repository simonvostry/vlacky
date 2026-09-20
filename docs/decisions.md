# Decisions and open questions

[Documentation index](../README.md#documentation)

This is a concise record of durable decisions and unresolved facts, last consolidated
on 2026-09-20. Current implementation details belong in the linked topic docs.
Historical observations below are not a live database inventory.

## Implemented decisions

- Vlacky is the master collection reference for identities, images, decoder functions
  and saved compositions. iTrain remains the measurement/operating system. The hosted
  integration is read-only; [preservation rules](itrain-integration.md) govern future writers.
- Speed profiles keep only the latest valid measurement and its calendar date, with
  both directional arrays. One-direction or identical measurements can display one
  curve. Stored precision is retained; UI readouts show one decimal. No history is wanted.
- Locomotive images use the full header width and fit without a scrollbar. DCC/train
  appearances and speed profiles occupy two equal desktop columns.
- Train list prose is hidden, short wagon numbers retained. Rounded neutral selection
  replaced both the blue left accent and the subsequently rejected square outline.
- Tichá galerie became the approved design: Hluboká modř light and Noční galerie dark,
  remembered per browser, light by default. Pencil-only edit actions are implemented.
  Earlier charcoal/azure/indigo studies and text-edit proposals are superseded.
- Individual model paint edits receive unique assets, preserving shared catalog art.
  The application icon uses a transparent close crop of the Brejlovec cab glazing.

## Collection context to preserve

### Brejlovec, vehicle 36

The owner confirmed measurement on **2026-09-19**, in one direction used for both.
The imported profile has 28 steps at 1:160; retain the small original step-1 reverse
difference and all source decimals. Captured project settings are context, not proof
that every setting was present at measurement time. Do not infer inventory DCC settings
from this snapshot without a separate verified update.

The model-specific native image is `/img/owned/vehicle-36-yellow-v1.png` (165×44),
with its 660×176 derivative. It adds yellow nose-wrap and cab-step edges and keeps
both buffers intact. Vehicle 47 and catalog artwork retain their shared image.
The owner asked to ignore the damaged buffer in the reference photograph.

The photo's front number appears different from the stored identity. This was a
paint-only edit: designation 754 and stored EVN were not corrected. Verify against
the original photograph and reliable model information if identity is revisited;
generated markings are not evidence.

### RegioJet Desiro, vehicle 60 / train 10

Recorded model: Fleischmann 742081. Train 10 is **Os 39636**, “Žluté jaro na železnici
— Kozí dráha”, era 2010, Děčín–Krupka, with one owned Desiro assigned.
[Photo/report source](http://fotodoprava.com/regiojet_vl.htm).

The exact match between 39636 from an older timetable and the revised 1 May 2010
15:10 departure remained uncertain. The owner subsequently chose **Os 39636**;
preserve that choice and the uncertainty. The pasted MR 10002 presentation-run claim
was not verified. Historical paired units do not justify adding an unowned second model.

### Vogtlandbahn Desiro, vehicle 61 / train 11

Recorded model: Fleischmann 742004, white/green with Vogtland-Express branding,
identified in model research as VT 23 A/B. Train 11 is **Os 12967**, descriptive name
“Vogtlandbahn — Gera–Cheb”, era 2010. Vogtland-Express is the branding, not this
regional service's name. The historical timetable describes two units; the saved
composition contains the owner's one unit and explains the difference in notes.

A surviving [report caption](https://www.eisenbahnforumvogtland.de/t7904f2-Impressionen-aus-dem-Elstergebirge-m-B.html)
places VT 23 at Vojtanov on 29 May 2010, train 12967; its original image is unavailable,
so the exact livery that day was not visually reconfirmed.
[Route](https://www.zelpage.cz/razeni/10/trasa-vlaku/vbg-12967) and
[formation](https://www.zelpage.cz/razeni/10/vlaky/vbg-12967) supplied timetable context.
Factory NEM 651 interface information does not identify the owner's installed decoder.

Vehicles 60/61 had null catalog links at the last collection review, despite earlier
variant-import notes. Re-query before changing relationships; do not infer catalog
linkage from an image path or an old import result.

## Remaining work, if requested

- A tested iTrain adapter for import/restore/synchronization; none is implemented.
- Coordinated migration of integration client/export URLs from the Vercel alias to
  the custom domain; preserve source identities. See [operations](operations.md).
- Resolve prototype/service uncertainties above only when relevant to a requested
  collection update. They do not block the current app.

## Historical material

Detailed session transcripts, the rejected versioned speed-profile proposal, design
boards and source evidence remain local under ignored `output/`. The documentation
cleanup preserved original Markdown in `output/documentation-archive-2026-09-20/`.
These artifacts record what was known at the time and may contradict later decisions;
they are not instructions for current implementation. No source photographs, collection
backups or authentication material are published with the documentation.
