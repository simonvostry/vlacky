import { eq, and } from "drizzle-orm";
import { db } from "./index";
import { vehicleCatalog, catalogImages } from "./schema";
import fs from "fs";
import path from "path";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const IMG_DIR = path.join(process.cwd(), "public", "img", "catalog");
const IMG_BASE = "https://www.vagonweb.cz/popisy";

interface RunConfig {
  operator: string;
  urlParam: string; // URL-encoded operator for the z= parameter
  startYear: number;
  endYear: number;
  wagonFamily: string;
}

const RUNS: RunConfig[] = [
  { operator: "ČD", urlParam: "%C4%8CD", startYear: 1994, endYear: 2026, wagonFamily: "rady" },
  { operator: "ČSD", urlParam: "%C4%8CSD", startYear: 1957, endYear: 1993, wagonFamily: "rady_csd" },
];

// Allow selecting a specific run via CLI arg: npx tsx scrape-rady.ts csd
const arg = process.argv[2]?.toLowerCase();
const selectedRuns = arg === "csd"
  ? RUNS.filter(r => r.operator === "ČSD")
  : arg === "cd"
    ? RUNS.filter(r => r.operator === "ČD")
    : RUNS;

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function readGifDimensions(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 10 || buf[0] !== 0x47 || buf[1] !== 0x49 || buf[2] !== 0x46) return null;
  return { width: buf[6] | (buf[7] << 8), height: buf[8] | (buf[9] << 8) };
}

function inferClassType(designation: string): string | null {
  const d = designation.trim();
  if (/^WR/i.test(d)) return "restaurant";
  if (/^WL/i.test(d)) return "sleeping";
  if (/^(AB|BA)/i.test(d)) return "12";
  if (/^AR/i.test(d)) return "1";
  if (/^A/i.test(d)) return "1";
  if (/^(BD|Bt|Bp|B)/i.test(d)) return "2";
  if (/^D/i.test(d)) return "luggage";
  return null;
}

function inferType(designation: string): string {
  // Locomotive designations are typically just numbers (362, 754, 193, etc.)
  if (/^\d+$/.test(designation.trim())) return "loco";
  return "wagon";
}

interface RadyEntry {
  designation: string;
  code: string | null;
  variant: string | null; // "retro", "n", "mr", "cr", "br", etc.
  imgSrc: string;
}

async function fetchPage(urlParam: string, year: number): Promise<string> {
  const url = `https://www.vagonweb.cz/razeni/rady.php?z=${urlParam}&rok=${year}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} fetching ${url}`);
  return new TextDecoder("utf-8").decode(await res.arrayBuffer());
}

function parsePage(html: string): RadyEntry[] {
  const entries: RadyEntry[] = [];
  // Each entry is a <tr> with designation, code, variant, and image
  const regex = /<span class=tab-radam>([^<]+)<\/span>\s*<sup>([^<]*)<\/sup>(?:<br><span class=maly>\s*([^<]*)<span>)?.*?<img src="([^"]+)"/g;

  let m;
  while ((m = regex.exec(html)) !== null) {
    entries.push({
      designation: m[1].trim(),
      code: m[2].trim() || null,
      variant: m[3]?.trim() || null,
      imgSrc: m[4],
    });
  }

  return entries;
}

async function downloadImage(srcUrl: string): Promise<{
  localPath: string;
  width: number;
  height: number;
} | null> {
  // Normalize URL — handle paths like "../popisy/img/CD/../CD/A-67-a.gif"
  const fullUrl = srcUrl.startsWith("http")
    ? srcUrl
    : `${IMG_BASE}/${srcUrl.replace(/^\.\.\/popisy\//, "")}`;

  const filename = path.basename(srcUrl).toLowerCase();
  const localFile = path.join(IMG_DIR, filename);

  if (fs.existsSync(localFile)) {
    const buf = fs.readFileSync(localFile);
    const dims = readGifDimensions(buf);
    if (dims) return { localPath: `/img/catalog/${filename}`, ...dims };
  }

  try {
    const res = await fetch(fullUrl, { headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const dims = readGifDimensions(buf);
    if (!dims) return null;
    fs.writeFileSync(localFile, buf);
    return { localPath: `/img/catalog/${filename}`, ...dims };
  } catch {
    return null;
  }
}

async function main() {
  console.log(`Scraping rady.php — ${selectedRuns.map(r => `${r.operator} ${r.startYear}–${r.endYear}`).join(", ")}...\n`);

  if (!fs.existsSync(IMG_DIR)) {
    fs.mkdirSync(IMG_DIR, { recursive: true });
  }

  // Collect all unique images across all years and runs
  const seenImages = new Set<string>();
  const allEntries: { entry: RadyEntry; run: RunConfig }[] = [];
  const seenDesignations = new Set<string>();

  for (const run of selectedRuns) {
    console.log(`\n${run.operator} (${run.startYear}–${run.endYear}):`);

    for (let year = run.startYear; year <= run.endYear; year++) {
      process.stdout.write(`  ${year}...`);
      const html = await fetchPage(run.urlParam, year);
      const entries = parsePage(html);
      process.stdout.write(` ${entries.length} entries\n`);

      for (const entry of entries) {
        const imgFile = path.basename(entry.imgSrc).toLowerCase();
        const desigKey = `${run.operator}|${entry.designation}|${entry.code || ""}`;

        if (!seenImages.has(imgFile)) {
          seenImages.add(imgFile);
          allEntries.push({ entry, run });
        }

        if (!seenDesignations.has(desigKey)) {
          seenDesignations.add(desigKey);
        }
      }

      await delay(200);
    }
  }

  console.log(`\nTotal unique images found: ${seenImages.size}`);
  console.log(`Total unique designations: ${seenDesignations.size}\n`);

  // Now check which images we DON'T have yet
  const existingImages = new Set<string>();
  const existingCatalogImages = db.select().from(catalogImages).all();
  for (const ci of existingCatalogImages) {
    existingImages.add(path.basename(ci.imagePath).toLowerCase());
  }

  let newImages = 0;
  let newCatalogEntries = 0;
  let alreadyHave = 0;

  for (const { entry, run } of allEntries) {
    const imgFile = path.basename(entry.imgSrc).toLowerCase();

    if (existingImages.has(imgFile)) {
      alreadyHave++;
      continue;
    }

    // Download the image
    const result = await downloadImage(entry.imgSrc);
    if (!result) {
      continue;
    }

    // Find or create catalog entry
    const fullDesig = entry.code
      ? `${entry.designation} ${entry.code}`
      : entry.designation;

    let catalogEntry = db
      .select()
      .from(vehicleCatalog)
      .where(
        and(
          eq(vehicleCatalog.designation, entry.designation),
          entry.code
            ? eq(vehicleCatalog.code, entry.code)
            : eq(vehicleCatalog.code, "")
        )
      )
      .get();

    // Also try matching with null code
    if (!catalogEntry && !entry.code) {
      catalogEntry = db
        .select()
        .from(vehicleCatalog)
        .where(eq(vehicleCatalog.fullDesignation, fullDesig))
        .get();
    }

    if (!catalogEntry) {
      // Try matching just by full designation
      catalogEntry = db
        .select()
        .from(vehicleCatalog)
        .where(eq(vehicleCatalog.fullDesignation, fullDesig))
        .get();
    }

    if (!catalogEntry) {
      // Create a new catalog entry
      catalogEntry = db
        .insert(vehicleCatalog)
        .values({
          designation: entry.designation,
          code: entry.code,
          fullDesignation: fullDesig,
          operator: run.operator,
          wagonFamily: run.wagonFamily,
          type: inferType(entry.designation),
          classType: inferClassType(entry.designation),
          imagePath: result.localPath,
          imageWidth: result.width,
          imageHeight: result.height,
          sourceUrl: "rady.php",
        })
        .returning()
        .get();
      newCatalogEntries++;
      console.log(`  + NEW: ${fullDesig} (${entry.variant || "default"})`);
    }

    // Add to catalog_images
    const label = entry.variant || null;
    db.insert(catalogImages)
      .values({
        catalogId: catalogEntry.id,
        imagePath: result.localPath,
        imageWidth: result.width,
        imageHeight: result.height,
        sourceUrl: entry.imgSrc,
        label,
        sortOrder: 0,
      })
      .run();
    newImages++;
    existingImages.add(imgFile);
    console.log(`  ✓ ${fullDesig} — ${imgFile} ${label ? `(${label})` : ""}`);

    await delay(80);
  }

  // Update primary images for new catalog entries
  if (newCatalogEntries > 0) {
    const families = selectedRuns.map(r => r.wagonFamily);
    const newEntries = db
      .select()
      .from(vehicleCatalog)
      .all()
      .filter(e => families.includes(e.wagonFamily));
    for (const entry of newEntries) {
      const img = db
        .select()
        .from(catalogImages)
        .where(eq(catalogImages.catalogId, entry.id))
        .get();
      if (img && !entry.imagePath) {
        db.update(vehicleCatalog)
          .set({
            imagePath: img.imagePath,
            imageWidth: img.imageWidth,
            imageHeight: img.imageHeight,
          })
          .where(eq(vehicleCatalog.id, entry.id))
          .run();
      }
    }
  }

  console.log(`\nDone!`);
  console.log(`  Already had: ${alreadyHave}`);
  console.log(`  New images added: ${newImages}`);
  console.log(`  New catalog entries created: ${newCatalogEntries}`);
}

main().catch(console.error);
