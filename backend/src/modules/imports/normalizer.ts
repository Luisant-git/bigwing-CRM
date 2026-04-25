// ─── Mobile normalization ───────────────────────────────────────
export function normalizeMobile(
  value: any
): { valid: boolean; normalized: string; error?: string } {
  if (!value) return { valid: false, normalized: "", error: "Mobile is required" };
  const digits = String(value).replace(/\D/g, "");
  const last10 = digits.slice(-10);
  if (last10.length !== 10)
    return { valid: false, normalized: last10, error: "Must be exactly 10 digits" };
  if (!/^[6-9]/.test(last10))
    return { valid: false, normalized: last10, error: "Must start with 6-9" };
  return { valid: true, normalized: last10 };
}

// ─── Date normalization ─────────────────────────────────────────
export function normalizeDate(value: any): Date | null {
  if (value === null || value === undefined || value === "") return null;

  // Excel serial number (e.g. 45669)
  if (typeof value === "number" && value > 10000 && value < 100000) {
    return new Date((value - 25569) * 86400000);
  }

  let str = String(value).trim();
  if (!str) return null;

  // 1. Handle formats with month names: "03 Jun 2026", "June 3, 2026", etc.
  // Regex to find: Day (1-2 digits), Month (3+ letters), Year (4 digits)
  const monthMatch = str.match(/(\d{1,2})[\s\-\/]([A-Za-z]{3,})[\s\-\/](\d{4})/);
  if (monthMatch) {
    const [, d, m, y] = monthMatch;
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, 
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    const monthIndex = months[m.toLowerCase().slice(0, 3)];
    if (monthIndex !== undefined) {
      // Set to Noon to prevent day-shift in UTC/Local conversions
      const date = new Date(Number(y), monthIndex, Number(d), 12, 0, 0);
      console.log(`[Import Date] Parsed Month Name: ${str} -> ${date.toDateString()}`);
      if (!isNaN(date.getTime())) return date;
    }
  }

  // 2. Handle YYYY-MM-DD or YYYY/MM/DD
  const yyyymmdd = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (yyyymmdd) {
    const [, y, m, d] = yyyymmdd;
    // Set to Noon to prevent day-shift in UTC/Local conversions
    const date = new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
    console.log(`[Import Date] Parsed YYYY-MM-DD: ${str} -> ${date.toDateString()}`);
    if (!isNaN(date.getTime())) return date;
  }

  // 3. Handle DD-MM-YYYY or DD/MM/YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (ddmmyyyy) {
    let [, d, m, y] = ddmmyyyy;
    let year = Number(y);
    if (year < 100) year += 2000;
    // Set to Noon to prevent day-shift in UTC/Local conversions
    const date = new Date(year, Number(m) - 1, Number(d), 12, 0, 0);
    console.log(`[Import Date] Parsed DD-MM-YYYY: ${str} -> ${date.toDateString()}`);
    if (!isNaN(date.getTime())) return date;
  }

  // 4. Fallback to native JS parser
  const fallback = new Date(str);
  if (!isNaN(fallback.getTime())) return fallback;

  return null;
}

// ─── Name normalization ─────────────────────────────────────────
export function normalizeName(
  value: any
): { firstName: string; lastName?: string } {
  if (!value) return { firstName: "" };
  let name = String(value)
    .toUpperCase()
    .replace(/\.+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!name) return { firstName: "" };

  const parts = name.split(" ");
  if (parts.length === 1) return { firstName: parts[0] };

  const lastName = parts.pop()!;
  return { firstName: parts.join(" "), lastName };
}

// ─── Stage alias mapping ────────────────────────────────────────
const stageAliases: Record<string, string> = {
  "NEW": "NEW",
  "ENQUIRED": "ENQUIRED",
  "CONTACTED": "ENQUIRED",
  "CONTACT": "ENQUIRED",
  "NOT REACHABLE": "NOT_REACHABLE",
  "RNR": "NOT_REACHABLE",
  "SWITCHED OFF": "NOT_REACHABLE",
  "TEST RIDE SCHEDULED": "TEST_RIDE_SCHEDULED",
  "TEST RIDE COMPLETED": "TEST_RIDE_COMPLETED",
  "TEST RIDE DONE": "TEST_RIDE_COMPLETED",
  "QUOTATION SHARED": "QUOTATION_SHARED",
  "QUOTATION": "QUOTATION_SHARED",
  "BOOKED": "BOOKED",
  "BOOKING": "BOOKED",
  "INVOICED": "INVOICED",
  "INVOICE": "INVOICED",
  "DELIVERED & CLOSED": "DELIVERED_CLOSED",
  "DELIVERED": "DELIVERED_CLOSED",
  "READY FOR DELIVERY": "INVOICED",
  "LOST": "LOST",
  "ENQUIRY LOST": "LOST",
  "LEAD LOST": "LOST",
  "ENQUIRY": "NEW",
  "ENQUIRY RECEIVED": "NEW",
  "NEW ENQUIRY": "NEW",
  "CANCELLED AFTER BOOKING": "LOST",
  "CANCELLED": "LOST",
  "NOT INTERESTED": "LOST",
};

export function normalizeStage(value: any): string {
  if (!value) return "NEW";
  const str = String(value).trim();
  const key = str.toUpperCase();
  // Return the mapped key if it exists in aliases, otherwise return the raw trimmed string
  // and format it nicely.
  const mapped = stageAliases[key];
  if (mapped) return mapped;
  
  // Title Case for dynamic stages
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Source normalization ───────────────────────────────────────
export function normalizeSource(value: any): string {
  if (!value) return "Other";
  let s = String(value).trim();
  // Simple title case: "digital campaign" -> "Digital Campaign"
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function normalizeChannel(value: any): string | undefined {
  if (!value) return undefined;
  const key = String(value).toUpperCase().trim();
  if (key.includes("WALK")) return "WALKIN";
  if (key.includes("TELE") || key.includes("PHONE") || key.includes("CALL")) return "TELE";
  if (key.includes("DIGITAL") || key.includes("ONLINE") || key.includes("WEB")) return "DIGITAL";
  if (key.includes("SOCIAL") || key.includes("FB") || key.includes("FACEBOOK") || key.includes("INSTA")) return "SOCIAL";
  if (key.includes("REF")) return "REFERENCE";
  if (key.includes("SERVICE")) return "SERVICE";
  return key;
}

// ─── Boolean normalization ──────────────────────────────────────
export function normalizeBool(value: any): boolean {
  if (!value) return false;
  const str = String(value).toUpperCase().trim();
  return ["Y", "YES", "TRUE", "1"].includes(str);
}

// ─── Interest level normalization ───────────────────────────────
export function normalizeInterestLevel(value: any): string | null {
  if (!value) return null;
  const key = String(value).toUpperCase().trim();
  if (["HOT", "WARM", "COLD"].includes(key)) return key;
  return null;
}

// ─── Purchase type normalization ────────────────────────────────
export function normalizePurchaseType(value: any): string | null {
  if (!value) return null;
  const key = String(value).toUpperCase().trim();
  if (["CASH", "FINANCE", "EXCHANGE"].includes(key)) return key;
  return null;
}

// ─── Model name normalization ───────────────────────────────────
// Excel has names like "CB350 H'NESS OBD2B", "CB350C OBD2B" — map to clean catalogue names
export function normalizeModelName(value: any): string | null {
  if (!value) return null;
  let s = String(value).toUpperCase().trim();

  // Strip OBD suffixes
  s = s.replace(/\s*OBD2B?\s*$/i, "").trim();
  s = s.replace(/\s*-\s*OB(D2)?\s*$/i, "").trim();

  // Pattern matches — return clean canonical names matching our seed
  if (/H[''′]?NESS\s*CB350/i.test(s) || s.includes("HNESS CB350")) return "H'ness CB350";
  if (/CB350\s*RS/i.test(s)) return "CB350RS";
  if (/CB350\s*C/i.test(s)) return "CB350";
  if (/^CB350\b/.test(s)) return "H'ness CB350";
  if (/CB300\s*F/i.test(s)) return "CB300F";
  if (/CB300\s*R/i.test(s)) return "CB300R";
  if (/\bNX500\b/i.test(s)) return "NX500";
  if (/CB500\s*X/i.test(s)) return "CB500X";
  if (/CBR650\s*R/i.test(s)) return "CBR650R";
  if (/CB650\s*R/i.test(s)) return "CB650R";
  if (/AFRICA\s*TWIN|CRF1100/i.test(s)) return "CRF1100L Africa Twin";
  if (/GOLD\s*WING|GOLDWING/i.test(s)) return "Gold Wing";
  if (/CB200\s*X/i.test(s)) return "CB200X";

  return null; // unmatched — will leave lead with no model
}

// ─── Variant normalization ──────────────────────────────────────
// "CB350 H'NESS DLX PRO CHROME-OB" → "DLX Pro"
export function normalizeVariantName(value: any): string | null {
  if (!value) return null;
  const s = String(value).toUpperCase().trim();

  if (/DLX\s*PRO\s*CHROME/.test(s)) return "DLX Pro";
  if (/DLX\s*PRO/.test(s)) return "DLX Pro";
  if (/\bDLX\b/.test(s)) return "DLX";
  if (/SPECIAL\s*EDITION/.test(s)) return "DLX Pro";
  if (/ADVENTURE\s*SPORT/.test(s)) return "Adventure Sport";
  if (/TOUR\s*DCT/.test(s)) return "Tour DCT Airbag";
  if (/\bTOUR\b/.test(s)) return "Tour";
  if (/\bSTD\b|\bSTANDARD\b/.test(s)) return "STD";

  return null;
}

// ─── Colour name normalization ──────────────────────────────────
// "PEARL DEEP GROUND GRAY" → closest seeded colour if possible, else keep raw
export function normalizeColourName(value: any): string | null {
  if (!value) return null;
  let s = String(value).trim();
  // Title case
  s = s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  return s;
}

// ─── Enquiry Type alias mapping ─────────────────────────────────
export function normalizeEnquiryType(value: any): string | null {
  if (!value) return null;
  let s = String(value).trim();
  // Simple title case: "new vehicle" -> "New Vehicle"
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}


