// UIC wagon letter designation decoder
// Based on https://www.vagonweb.cz/oznacovani/v_pismena.php
// and https://www.vagonweb.cz/oznacovani/m_pismena_CD.php

const mainLetters: Record<string, string> = {
  A: "vůz 1. třídy se sedadly",
  B: "vůz 2. třídy se sedadly",
  AB: "vůz 1. a 2. třídy se sedadly",
  WL: "lůžkový vůz",
  WR: "jídelní vůz",
  R: "restaurační nebo barový oddíl",
  D: "zavazadlový vůz",
  DD: "otevřený patrový vůz pro přepravu automobilů",
  Post: "poštovní vůz",
  SR: "společenský vůz",
  Salon: "salónní vůz",
};

const smallLetters: Record<string, string> = {
  a: "dvounápravový vůz",
  b: "vybavený pro tělesně postižené osoby",
  c: "lehátka (sedačky upravitelné k ležení)",
  d: "prostor pro jízdní kola",
  ee: "zásobování energií z napájecího vedení",
  f: "řídící vůz",
  g: "alternativní oddíl pro zaměstnance obsluhy",
  h: "vybavený pro tělesně postižené osoby",
  j: "nerozpojitelná jednotka",
  k: "individuální vytápění kamny",
  m: "vůz delší než 24,5 m",
  n: "pro motorovou trakci, bez kab. el. topení",
  o: "dvoupodlažní vůz",
  p: "velkoprostorový se středovou uličkou (dálková)",
  r: "zvláštní výbava nebo uspořádání interiéru",
  s: "postranní chodba v zavazadlovém voze",
  t: "velkoprostorový se středovou uličkou (regionální)",
  u: "úzkorozchodný vůz",
  v: "prostor pro jízdní kola",
  w: "bez přechodových můstků",
  x: "lehká stavba pro motorové vlaky",
  y: "velkoprostorový se středovou uličkou",
  z: "zásobování energií z napájecího vedení",
};

interface DecodedLetter {
  letter: string;
  meaning: string;
  isMain: boolean;
}

export function decodeDesignation(designation: string): DecodedLetter[] {
  const result: DecodedLetter[] = [];
  let remaining = designation.trim();

  // Try to match main letter combinations (longest first)
  const mainSorted = Object.keys(mainLetters).sort(
    (a, b) => b.length - a.length
  );

  // Extract main letters (uppercase or special combos)
  let mainFound = false;
  for (const key of mainSorted) {
    if (remaining.startsWith(key)) {
      result.push({ letter: key, meaning: mainLetters[key], isMain: true });
      remaining = remaining.substring(key.length);
      mainFound = true;
      break;
    }
  }

  // If no known main letter, try individual uppercase letters
  if (!mainFound) {
    const upperMatch = remaining.match(/^([A-Z]+)/);
    if (upperMatch) {
      // Try to decode each uppercase letter individually
      for (const ch of upperMatch[1]) {
        if (mainLetters[ch]) {
          result.push({ letter: ch, meaning: mainLetters[ch], isMain: true });
        } else {
          result.push({ letter: ch, meaning: "—", isMain: true });
        }
      }
      remaining = remaining.substring(upperMatch[1].length);
    }
  }

  // Now decode lowercase letters
  let i = 0;
  while (i < remaining.length) {
    const ch = remaining[i];

    // Skip non-letter characters (digits, spaces, hyphens)
    if (!/[a-z]/.test(ch)) {
      i++;
      continue;
    }

    // Try "ee" digraph first
    if (ch === "e" && i + 1 < remaining.length && remaining[i + 1] === "e") {
      result.push({
        letter: "ee",
        meaning: smallLetters["ee"],
        isMain: false,
      });
      i += 2;
      continue;
    }

    if (smallLetters[ch]) {
      result.push({ letter: ch, meaning: smallLetters[ch], isMain: false });
    }
    i++;
  }

  return result;
}

type Props = {
  designation: string;
};

export function DesignationDecoder({ designation }: Props) {
  const decoded = decodeDesignation(designation);

  if (decoded.length === 0) return null;

  return (
    <div className="space-y-1">
      {decoded.map((d, i) => (
        <div key={i} className="flex items-baseline gap-2 text-sm">
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 font-mono font-bold ${
              d.isMain
                ? "bg-gray-800 text-white text-xs"
                : "bg-gray-100 text-gray-600 text-[11px]"
            }`}
          >
            {d.letter}
          </span>
          <span className="text-gray-500">{d.meaning}</span>
        </div>
      ))}
    </div>
  );
}
