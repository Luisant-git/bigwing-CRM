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

  const str = String(value).trim();

  // DD-MM-YYYY or DD/MM/YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    if (!isNaN(date.getTime())) return date;
  }

  // YYYY-MM-DD (ISO)
  const iso = new Date(str);
  if (!isNaN(iso.getTime())) return iso;

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
  "NOT CONTACTED": "NOT_CONTACTED",
  "CONTACTED": "CONTACTED",
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
  "ENQUIRY": "NOT_CONTACTED",
  "ENQUIRY RECEIVED": "NOT_CONTACTED",
  "NEW ENQUIRY": "NOT_CONTACTED",
  "CANCELLED AFTER BOOKING": "LOST",
  "CANCELLED": "LOST",
  "NOT INTERESTED": "LOST",
};

export function normalizeStage(value: any): string {
  if (!value) return "NOT_CONTACTED";
  const key = String(value).toUpperCase().trim();
  return stageAliases[key] ?? "NOT_CONTACTED";
}

// ─── Source alias mapping ───────────────────────────────────────
const sourceAliases: Record<string, string> = {
  "ALWAYS ON HOT": "Campaign",
  "SHOWROOM": "Walk-in",
  "SHOWROOM WALKIN": "Walk-in",
  "SHOWROOM WALK-IN": "Walk-in",
  "SHOWROOM WALK IN": "Walk-in",
  "WALK-IN": "Walk-in",
  "WALK IN": "Walk-in",
  "WALKIN": "Walk-in",
  "CALL AT SHOWROOM": "Call at Showroom",
  "PHONE": "Call at Showroom",
  "GOOGLE ADS": "Google",
  "GOOGLE SEARCH": "Google",
  "FACEBOOK ADS": "Facebook",
  "FB": "Facebook",
  "INSTA": "Instagram",
  "IG": "Instagram",
  "WHATSAPP": "WhatsApp",
  "WHATS APP": "WhatsApp",
  "WEBSITE ENQUIRY": "Website",
  "META LEAD": "Meta Lead Ads",
  "META": "Meta Lead Ads",
  "REFERRAL": "Reference",
  "REF": "Reference",
  "CUSTOMER REFERENCE": "Reference",
};

export function normalizeSource(value: any): string {
  if (!value) return "Other";
  const key = String(value).toUpperCase().trim();
  return sourceAliases[key] ?? String(value).trim();
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
export function normalizeEnquiryType(value: any): string {
  if (!value) return "New";
  const key = String(value).toUpperCase().trim();
  if (key.includes("NEW") || key === "WALK-IN" || key === "TELEPHONIC" || key === "DIGITAL") return "New";
  if (key.includes("SERVICE")) return "Service";
  if (key.includes("SPARE")) return "Spares";
  if (key.includes("INSURANCE")) return "Insurance";
  if (key.includes("ACCESS")) return "Accessories";
  return "New";
}
