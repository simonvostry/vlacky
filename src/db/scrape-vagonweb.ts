import { parse } from "node-html-parser";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { vehicleCatalog } from "./schema";
import fs from "fs";
import path from "path";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const PAGES = [
  {
    url: "https://www.vagonweb.cz/popisy/popisy.php?k=CD_Y&z=p&p=v",
    operator: "ČD",
    wagonFamily: "CD_Y",
  },
  {
    url: "https://www.vagonweb.cz/popisy/popisy.php?k=CD_Z&z=p&p=v",
    operator: "ČD",
    wagonFamily: "CD_Z",
  },
  {
    url: "https://www.vagonweb.cz/popisy/popisy.php?k=CSD_4n_II&z=p&p=v",
    operator: "ČSD/ČD",
    wagonFamily: "CSD_4n_II",
  },
  {
    url: "https://www.vagonweb.cz/popisy/popisy.php?k=RJ&z=p&p=v",
    operator: "RJ",
    wagonFamily: "RJ",
  },
];

const IMG_DIR = path.join(process.cwd(), "public", "img", "catalog");
const IMG_BASE = "https://www.vagonweb.cz/popisy/img/CD";

function inferClassType(designation: string): string | null {
  const d = designation.trim();
  if (/^WR/i.test(d)) return "restaurant";
  if (/^WL/i.test(d)) return "sleeping";
  if (/^(AB|BA)/i.test(d)) return "12";
  if (/^AR/i.test(d)) return "1";
  if (/^A/i.test(d)) return "1";
  if (/^(BD|Bt|Bp|B)/i.test(d)) return "2";
  if (/^D/i.test(d)) return "luggage";
  if (/^(Post|Salon|SR)/i.test(d)) return null;
  return null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"');
}

function stripHtml(html: string): string {
  return decodeEntities(html)
    .replace(/<br\s*\/?>/gi, " / ")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function readGifDimensions(
  buf: Buffer
): { width: number; height: number } | null {
  if (buf.length < 10) return null;
  if (buf[0] !== 0x47 || buf[1] !== 0x49 || buf[2] !== 0x46) return null; // "GIF"
  const width = buf[6] | (buf[7] << 8);
  const height = buf[8] | (buf[9] << 8);
  return { width, height };
}

interface CatalogRow {
  designation: string;
  code: string | null;
  fullDesignation: string;
  operator: string;
  wagonFamily: string;
  type: string;
  classType: string | null;
  uicNumber: string | null;
  inventoryRange: string | null;
  yearBuilt: string | null;
  manufacturer: string | null;
  yearReconstructed: string | null;
  reconstructor: string | null;
  unitsBuilt: string | null;
  unitsInService: string | null;
  yearRetired: string | null;
  maxSpeed: string | null;
  vehicleCode: string | null;
  sourceUrl: string;
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} fetching ${url}`);
  const buf = await res.arrayBuffer();
  const text = new TextDecoder("utf-8").decode(buf);
  // Debug: check if we got the real page
  if (!text.includes('id="evid"')) {
    console.log("  DEBUG: Page does not contain #evid table");
    console.log("  DEBUG: First 500 chars:", text.substring(0, 500));
  }
  return text;
}

function parseTable(
  html: string,
  operator: string,
  wagonFamily: string,
  sourceUrl: string
): CatalogRow[] {
  // Extract just the #evid table HTML to avoid parser issues with the full page
  const tableStart = html.indexOf('<table id="evid"');
  if (tableStart === -1) {
    console.warn("  No <table id=\"evid\"> found in HTML");
    return [];
  }
  const tableEnd = html.indexOf("</table>", tableStart);
  if (tableEnd === -1) {
    console.warn("  No closing </table> found");
    return [];
  }
  const tableHtml = html.substring(tableStart, tableEnd + 8);
  const root = parse(tableHtml);
  const table = root.querySelector("table");
  if (!table) {
    console.warn("  Failed to parse extracted table HTML");
    return [];
  }
  console.log("  Found table #evid");

  const tbody = table.querySelector("tbody");
  if (!tbody) return [];

  const rows: CatalogRow[] = [];

  for (const tr of tbody.querySelectorAll("tr")) {
    const tds = tr.querySelectorAll("td");
    if (tds.length < 12) continue;

    // Column 1 (index 1): designation with <sup>
    const desigTd = tds[1];
    if (!desigTd) continue;

    const desigHtml = decodeEntities(desigTd.innerHTML);

    // Handle multi-variant rows (split on <br />)
    const variants = desigHtml.split(/<br\s*\/?>/i).filter((s) => s.trim());

    for (let vi = 0; vi < variants.length; vi++) {
      const variantHtml = variants[vi].trim();
      if (!variantHtml) continue;

      // Parse designation and code from HTML like "Bdmpee<sup>233</sup>"
      const supMatch = variantHtml.match(
        /^(.*?)<sup[^>]*>(.*?)<\/sup>/i
      );
      let designation: string;
      let code: string | null;

      if (supMatch) {
        designation = supMatch[1].replace(/<[^>]*>/g, "").trim();
        code = supMatch[2].replace(/<[^>]*>/g, "").trim() || null;
      } else {
        designation = variantHtml.replace(/<[^>]*>/g, "").trim();
        code = null;
      }

      if (!designation) continue;

      const fullDesignation = code
        ? `${designation} ${code}`
        : designation;

      // Helper to get cell text, handling multi-variant splits
      function cellText(idx: number): string | null {
        if (idx >= tds.length) return null;
        const raw = tds[idx].innerHTML;
        if (variants.length > 1) {
          const parts = raw.split(/<br\s*\/?>/i);
          const part = parts[vi] || parts[0] || "";
          return stripHtml(part) || null;
        }
        return stripHtml(raw) || null;
      }

      rows.push({
        designation,
        code,
        fullDesignation,
        operator,
        wagonFamily,
        type: "wagon",
        classType: inferClassType(designation),
        uicNumber: cellText(2),
        inventoryRange: cellText(3),
        yearBuilt: cellText(4),
        manufacturer: cellText(5),
        yearReconstructed: cellText(6),
        reconstructor: cellText(7),
        unitsBuilt: cellText(8),
        unitsInService: cellText(9),
        yearRetired: cellText(10),
        maxSpeed: cellText(11),
        vehicleCode: cellText(12) || code,
        sourceUrl,
      });
    }
  }

  return rows;
}

async function tryDownloadImage(
  designation: string,
  code: string | null
): Promise<{ path: string; width: number; height: number } | null> {
  const name = designation.replace(/\s+/g, "");
  const codeStr = code || "";

  // Candidate suffixes in priority order
  const candidates: string[] = [];
  const suffixes = ["n2", "n", "", "z", "zz"];

  for (const suffix of suffixes) {
    const s = suffix ? `-${suffix}` : "";
    // With code
    if (codeStr) {
      candidates.push(`${name}${codeStr}${s}-a.gif`);
    }
    // Without code
    candidates.push(`${name}${s}-a.gif`);
  }

  // Also try with hyphen between name and code
  if (codeStr) {
    for (const suffix of suffixes) {
      const s = suffix ? `-${suffix}` : "";
      candidates.push(`${name}-${codeStr}${s}-a.gif`);
    }
  }

  for (const filename of candidates) {
    const url = `${IMG_BASE}/${filename}`;
    try {
      const res = await fetch(url, {
        method: "HEAD",
        headers: { "User-Agent": UA },
      });
      if (res.ok) {
        // Download the actual file
        const imgRes = await fetch(url, {
          headers: { "User-Agent": UA },
        });
        if (!imgRes.ok) continue;

        const buf = Buffer.from(await imgRes.arrayBuffer());
        const dims = readGifDimensions(buf);
        if (!dims) continue;

        const localName = filename.toLowerCase();
        const localPath = path.join(IMG_DIR, localName);
        fs.writeFileSync(localPath, buf);

        return {
          path: `/img/catalog/${localName}`,
          width: dims.width,
          height: dims.height,
        };
      }
    } catch {
      // ignore fetch errors
    }
    await delay(80);
  }

  return null;
}

async function main() {
  console.log("Scraping vagonWEB.cz ČD vehicle catalog...\n");

  // Ensure image directory
  if (!fs.existsSync(IMG_DIR)) {
    fs.mkdirSync(IMG_DIR, { recursive: true });
  }

  // Clear existing catalog for ČD
  db.delete(vehicleCatalog).run();
  console.log("Cleared existing catalog entries.\n");

  let totalInserted = 0;

  for (const page of PAGES) {
    console.log(`Fetching ${page.wagonFamily}: ${page.url}`);
    const html = await fetchPage(page.url);
    const rows = parseTable(html, page.operator, page.wagonFamily, page.url);
    console.log(`  Parsed ${rows.length} entries`);

    for (const row of rows) {
      db.insert(vehicleCatalog).values(row).run();
    }
    totalInserted += rows.length;
    console.log(`  Inserted ${rows.length} entries\n`);
  }

  console.log(`Total catalog entries: ${totalInserted}\n`);

  // Download images
  console.log("Downloading vehicle images...");
  const allEntries = db.select().from(vehicleCatalog).all();
  let imagesFound = 0;
  let imagesNotFound = 0;

  for (const entry of allEntries) {
    const result = await tryDownloadImage(entry.designation, entry.code);
    if (result) {
      db.update(vehicleCatalog)
        .set({
          imagePath: result.path,
          imageWidth: result.width,
          imageHeight: result.height,
        })
        .where(eq(vehicleCatalog.id, entry.id))
        .run();
      imagesFound++;
      process.stdout.write(`  ✓ ${entry.fullDesignation}\n`);
    } else {
      imagesNotFound++;
      process.stdout.write(`  ✗ ${entry.fullDesignation}\n`);
    }
  }

  console.log(
    `\nImages: ${imagesFound} found, ${imagesNotFound} not found`
  );
  console.log("Done!");
}

main().catch(console.error);
