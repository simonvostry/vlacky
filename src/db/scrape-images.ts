import { eq } from "drizzle-orm";
import { db } from "./index";
import { vehicleCatalog, catalogImages } from "./schema";
import fs from "fs";
import path from "path";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const PAGES = [
  { url: "https://www.vagonweb.cz/popisy/popisy.php?k=CD_Y&z=s&p=v", family: "CD_Y" },
  { url: "https://www.vagonweb.cz/popisy/popisy.php?k=CD_Z&z=s&p=v", family: "CD_Z" },
  { url: "https://www.vagonweb.cz/popisy/popisy.php?k=CSD_4n_II", family: "CSD_4n_II" },
  { url: "https://www.vagonweb.cz/popisy/popisy.php?k=RJ&z=s&p=v", family: "RJ" },
  { url: "https://www.vagonweb.cz/popisy/popisy.php?k=OeBB_1&z=s&p=v", family: "OeBB_1" },
];

const IMG_DIR = path.join(process.cwd(), "public", "img", "catalog");
const IMG_BASE = "https://www.vagonweb.cz/popisy";

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function readGifDimensions(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 10) return null;
  if (buf[0] !== 0x47 || buf[1] !== 0x49 || buf[2] !== 0x46) return null;
  return { width: buf[6] | (buf[7] << 8), height: buf[8] | (buf[9] << 8) };
}

function readPngDimensions(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 24) return null;
  if (buf[0] !== 0x89 || buf[1] !== 0x50) return null; // PNG
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function readDimensions(buf: Buffer): { width: number; height: number } | null {
  return readGifDimensions(buf) || readPngDimensions(buf);
}

interface ImageEntry {
  designation: string;
  code: string | null;
  srcUrl: string; // relative like "../popisy/img/CD/A150-a.gif"
  label: string | null; // "(od 1997)", "(1993)", etc.
  sortOrder: number;
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} fetching ${url}`);
  return new TextDecoder("utf-8").decode(await res.arrayBuffer());
}

function parseGroupedView(html: string): ImageEntry[] {
  const entries: ImageEntry[] = [];

  // Split by vehicle designation blocks (tab-rada cells, not tab-rada2)
  const blocks = html.split(/(?=<td\s+class='tab-rada\s)/i);

  for (const block of blocks) {
    // Extract designation and code (code may be absent)
    const desigWithCode = block.match(
      /rada_v_popisu>\s*(.*?)<sup[^>]*>([^<]+)<\/sup>/i
    );
    const desigNoCode = block.match(
      /rada_v_popisu>\s*([^<]+)<\/span>/i
    );

    let designation: string;
    let code: string | null;

    if (desigWithCode) {
      designation = desigWithCode[1].replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
      code = desigWithCode[2].replace(/&nbsp;/g, " ").trim();
    } else if (desigNoCode) {
      designation = desigNoCode[1].replace(/&nbsp;/g, " ").trim();
      code = null;
    } else {
      continue;
    }

    // Find all images in this block
    const imgRegex = /pop_obrazek_vozu'><img\s+src='([^']+)'/g;
    const labelRegex = /popisek_k_obrazku[^>]*>([^<]*)</g;

    const imgs: string[] = [];
    const labels: string[] = [];

    let m;
    while ((m = imgRegex.exec(block)) !== null) {
      imgs.push(m[1]);
    }
    while ((m = labelRegex.exec(block)) !== null) {
      labels.push(m[1].trim());
    }

    for (let i = 0; i < imgs.length; i++) {
      entries.push({
        designation,
        code,
        srcUrl: imgs[i],
        label: labels[i] || null,
        sortOrder: i,
      });
    }
  }

  return entries;
}

async function downloadImage(srcUrl: string): Promise<{
  localPath: string;
  width: number;
  height: number;
} | null> {
  // Convert relative URL to absolute
  const fullUrl = srcUrl.startsWith("http")
    ? srcUrl
    : `${IMG_BASE}/${srcUrl.replace(/^\.\.\/popisy\//, "")}`;

  const filename = path.basename(srcUrl).toLowerCase();
  const localFile = path.join(IMG_DIR, filename);

  // Skip if already downloaded
  if (fs.existsSync(localFile)) {
    const buf = fs.readFileSync(localFile);
    const dims = readDimensions(buf);
    if (dims) {
      return { localPath: `/img/catalog/${filename}`, ...dims };
    }
  }

  try {
    const res = await fetch(fullUrl, { headers: { "User-Agent": UA } });
    if (!res.ok) return null;

    const buf = Buffer.from(await res.arrayBuffer());
    const dims = readDimensions(buf);
    if (!dims) return null;

    fs.writeFileSync(localFile, buf);
    return { localPath: `/img/catalog/${filename}`, ...dims };
  } catch {
    return null;
  }
}

async function main() {
  console.log("Scraping all livery variants from vagonWEB grouped view...\n");

  if (!fs.existsSync(IMG_DIR)) {
    fs.mkdirSync(IMG_DIR, { recursive: true });
  }

  // Clear existing catalog images
  db.delete(catalogImages).run();
  console.log("Cleared existing catalog images.\n");

  // Load all catalog entries for matching
  const catalog = db.select().from(vehicleCatalog).all() as any[];
  console.log(`Catalog has ${catalog.length} entries.\n`);

  let totalImages = 0;
  let totalDownloaded = 0;
  let totalFailed = 0;

  for (const page of PAGES) {
    console.log(`Fetching ${page.family}: ${page.url}`);
    const html = await fetchPage(page.url);
    const imageEntries = parseGroupedView(html);
    console.log(`  Found ${imageEntries.length} image variants\n`);

    for (const img of imageEntries) {
      totalImages++;

      // Find ALL matching catalog entries
      let matches = catalog.filter(
        (c) =>
          c.wagonFamily === page.family &&
          c.designation === img.designation &&
          c.code === img.code
      );

      if (matches.length === 0) {
        // Try matching without code (some designations don't have codes in table view)
        matches = catalog.filter(
          (c) =>
            c.wagonFamily === page.family &&
            c.designation === img.designation
        );
      }

      if (matches.length === 0) {
        console.log(`  ? No catalog match for ${img.designation} ${img.code || ""}`);
        continue;
      }

      // Assign this image to all matching catalog entries
      for (const match of matches) {
        await processImage(img, match.id);
      }
    }
  }

  async function processImage(img: ImageEntry, catalogId: number) {
    const result = await downloadImage(img.srcUrl);
    if (result) {
      db.insert(catalogImages)
        .values({
          catalogId,
          imagePath: result.localPath,
          imageWidth: result.width,
          imageHeight: result.height,
          sourceUrl: img.srcUrl,
          label: img.label,
          sortOrder: img.sortOrder,
        })
        .run();
      totalDownloaded++;
      console.log(
        `  ✓ ${img.designation} ${img.code || ""} — ${path.basename(img.srcUrl)} ${img.label || ""}`
      );
    } else {
      totalFailed++;
      console.log(`  ✗ ${img.designation} ${img.code || ""} — ${img.srcUrl}`);
    }
    await delay(80);
  }

  // Update the vehicleCatalog.imagePath to point to the first (newest) variant
  console.log("\nUpdating catalog primary images...");
  for (const entry of catalog) {
    const images = db
      .select()
      .from(catalogImages)
      .where(eq(catalogImages.catalogId, entry.id))
      .orderBy(catalogImages.sortOrder)
      .all() as any[];

    if (images.length > 0) {
      // Use the last image (newest livery) as the primary
      const primary = images[images.length - 1];
      db.update(vehicleCatalog)
        .set({
          imagePath: primary.imagePath,
          imageWidth: primary.imageWidth,
          imageHeight: primary.imageHeight,
        })
        .where(eq(vehicleCatalog.id, entry.id))
        .run();
    }
  }

  console.log(`\nDone! ${totalDownloaded} images downloaded, ${totalFailed} failed, ${totalImages} total variants found.`);
}

main().catch(console.error);
