import { createHash } from "crypto";
import { readFileSync } from "fs";
import * as XLSX from "xlsx";
import { prisma } from "@bigwing/db";
import { importRepository } from "./repository.js";
import { AppError } from "../../middlewares/errorHandler.js";
import {
  normalizeMobile,
  normalizeDate,
  normalizeName,
  normalizeStage,
  normalizeSource,
  normalizeBool,
  normalizeInterestLevel,
  normalizePurchaseType,
  normalizeModelName,
  normalizeVariantName,
  normalizeColourName,
  normalizeEnquiryType,
} from "./normalizer.js";

const BATCH_SIZE = 500;

// Column header → CRM field mapping for auto-detect
const TELE_HEADERS: Record<string, string> = {
  "enquiry date": "enquiryDate",
  "customer name": "customerName",
  "mobile number": "mobile",
  "alternate mobile number": "altMobile",
  "exchange": "exchangeFlag",
  "enquiry type": "enquiryType",
  "location": "location",
  "source of enquiry": "source",
  "reference name": "refName",
  "model interested": "modelName",
  "variant": "variantName",
  "colour preference": "colourName",
  "executive assigned": "executive",
  "next follow up date": "nextFollowupAt",
  "enquiry stage": "stage",
  "interest level": "interestLevel",
  "enquiry closing stage": "closureReason",
};

const WALKIN_HEADERS: Record<string, string> = {
  "enquiry number": "enquiryNo",
  "enquiry no": "enquiryNo",
  "model name": "modelName",
  "model variant": "variantName",
  "color": "colourName",
  "colour": "colourName",
  "customer first name": "firstName",
  "customer last name": "lastName",
  "customer name": "customerName",
  "mobile no.": "mobile",
  "mobile no": "mobile",
  "mobile number": "mobile",
  "next follow up date": "nextFollowupAt",
  "next follow up": "nextFollowupAt",
  "current follow up date": "currentFollowupDate",
  "current follow up": "currentFollowupDate",
  "follow up id": "followupId",
  "follow up remark": "followupRemark",
  "follow up remarks": "followupRemark",
  "date of birth": "dob",
  "date of marriage": "anniversary",
  "enquiry created date": "enquiryDate",
  "enquiry sales stage": "stage",
  "enquiry source": "source",
  "dealer sales executive name": "executive",
  "test ride flag": "testRideFlag",
  "purchase type": "purchaseType",
  "enquiry classification": "interestLevel",
  "enquiry type": "enquiryType",
  "customer type": "customerType",
  "customer category": "accountType",
  "account type": "accountType",
  "account name": "accountName",
  "network type": "referredFromBranch",
  "enquiry remark": "remark",
  "closure remarks": "closureRemark",
};

interface ParsedRow {
  rowNum: number;
  raw: Record<string, any>;
  mapped: Record<string, any>;
  errors: { column: string; value: string; error: string }[];
}

export class ImportService {
  // ─── Upload ───────────────────────────────────────────────────

  async upload(filePath: string, fileName: string, createdBy: bigint) {
    const fileBuffer = readFileSync(filePath);
    // Hash is kept on the batch row for traceability (which file produced which batch),
    // but we no longer block re-uploads of the same file — the Hirise Honda DMS export
    // is run daily and operators routinely import the latest dump. Row-level dedupe by
    // enquiryNo (see importRow) guarantees we won't create duplicate leads.
    const fileHash = createHash("sha256").update(fileBuffer).digest("hex");

    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    const sheets = workbook.SheetNames;

    const batch = await importRepository.createBatch({
      fileName,
      fileHash,
      createdBy,
    });

    return {
      batchId: Number(batch.id),
      fileName,
      sheets,
      status: batch.status,
    };
  }

  // ─── Preview ──────────────────────────────────────────────────

  async preview(batchId: bigint, sheetName?: string) {
    const batch = await importRepository.findBatchById(batchId);
    if (!batch) throw new AppError(404, "BATCH_NOT_FOUND", "Import batch not found");

    const filePath = `uploads/${batch.fileName}`;
    const parsed = this.parseFile(filePath, sheetName);

    const previewRows = parsed.slice(0, 50).map((r) => ({
      rowNum: r.rowNum,
      data: r.mapped,
      errors: r.errors,
    }));

    const errorCount = parsed.filter((r) => r.errors.length > 0).length;
    const validCount = parsed.length - errorCount;

    return {
      batchId: Number(batchId),
      totalRows: parsed.length,
      validRows: validCount,
      errorRows: errorCount,
      preview: previewRows,
    };
  }

  // ─── Commit ───────────────────────────────────────────────────

  async commit(batchId: bigint, sheetName?: string, channelOverride?: string) {
    const batch = await importRepository.findBatchById(batchId);
    if (!batch) throw new AppError(404, "BATCH_NOT_FOUND", "Import batch not found");
    if (batch.status !== "PENDING") {
      throw new AppError(400, "BATCH_NOT_PENDING", `Batch is ${batch.status}`);
    }

    await importRepository.updateBatch(batchId, {
      status: "PROCESSING",
      startedAt: new Date(),
    });

    const filePath = `uploads/${batch.fileName}`;
    const parsed = this.parseFile(filePath, sheetName);

    // Load master data lookups
    const [sourceMap, typeMap, modelMap, variantMap, colourMap, userMap] =
      await Promise.all([
        importRepository.getSourceMap(),
        importRepository.getEnquiryTypeMap(),
        importRepository.getModelMap(),
        importRepository.getVariantMap(),
        importRepository.getColourMap(),
        importRepository.getUserMap(),
      ]);

    let successRows = 0;
    let errorRows = 0;
    let skippedRows = 0;
    const rowErrors: {
      batchId: bigint;
      rowNumber: number;
      column?: string;
      value?: string;
      error: string;
    }[] = [];

    // Process in batches of 500 for memory safety and progress reporting
    for (let batchStart = 0; batchStart < parsed.length; batchStart += BATCH_SIZE) {
      const slice = parsed.slice(batchStart, batchStart + BATCH_SIZE);

      for (const row of slice) {
        // Skip rows with critical validation errors (missing mobile/date)
        if (row.errors.length > 0) {
          errorRows++;
          for (const err of row.errors) {
            rowErrors.push({
              batchId,
              rowNumber: row.rowNum,
              column: err.column,
              value: err.value,
              error: err.error,
            });
          }
          continue;
        }

        // Apply channel override (TELE / SOCIAL / DIGITAL / SERVICE for tele-enquiry sheets)
        if (channelOverride) row.mapped.__channelOverride = channelOverride;

        try {
          const result = await this.importRow(
            row.mapped,
            batch.createdBy,
            sourceMap,
            typeMap,
            modelMap,
            variantMap,
            colourMap,
            userMap
          );
          if (result === "skipped") {
            skippedRows++;
          } else {
            successRows++;
          }
        } catch (err: any) {
          errorRows++;
          rowErrors.push({
            batchId,
            rowNumber: row.rowNum,
            error: err.message || "Unknown error",
          });
        }
      }

      // Flush errors and update progress per batch
      if (rowErrors.length >= 100) {
        await importRepository.createRowErrors(rowErrors.splice(0, rowErrors.length));
      }
      await importRepository.updateBatch(batchId, {
        totalRows: parsed.length,
        successRows,
        errorRows,
        skippedRows,
      });
    }

    // Bulk insert remaining errors
    await importRepository.createRowErrors(rowErrors);

    await importRepository.updateBatch(batchId, {
      status: "COMPLETED",
      completedAt: new Date(),
      totalRows: parsed.length,
      successRows,
      errorRows,
      skippedRows,
    });

    return {
      batchId: Number(batchId),
      status: "COMPLETED",
      totalRows: parsed.length,
      successRows,
      errorRows,
      skippedRows,
    };
  }

  // ─── Error report ─────────────────────────────────────────────

  async getErrors(batchId: bigint) {
    const batch = await importRepository.findBatchById(batchId);
    if (!batch) throw new AppError(404, "BATCH_NOT_FOUND", "Import batch not found");

    const errors = await importRepository.getRowErrors(batchId);

    const workbook = XLSX.utils.book_new();
    const data = errors.map((e) => ({
      Row: e.rowNumber,
      Column: e.column ?? "",
      Value: e.value ?? "",
      Error: e.error,
    }));
    const sheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, "Errors");

    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  }

  // ─── File parsing ─────────────────────────────────────────────

  private parseFile(filePath: string, sheetName?: string): ParsedRow[] {
    const fileBuffer = readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });

    const sheet =
      workbook.Sheets[sheetName ?? workbook.SheetNames[0]];
    if (!sheet) throw new AppError(400, "SHEET_NOT_FOUND", "Sheet not found");

    // Read as 2D array so we can scan for the real header row
    const aoa: any[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: null,
      blankrows: false,
    });
    if (aoa.length === 0) return [];

    // Auto-detect header row: scan first 5 rows for known column labels
    const HEADER_MARKERS = [
      "customer name", "mobile number", "mobile no", "enquiry number",
      "enquiry date", "enquiry created date", "model interested", "model name",
      "customer first name",
    ];

    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(5, aoa.length); i++) {
      const row = aoa[i];
      if (!row) continue;
      const cellStrs = row.map((c) => String(c ?? "").toLowerCase().trim());
      const matchCount = HEADER_MARKERS.filter((m) => cellStrs.some((c) => c.includes(m))).length;
      if (matchCount >= 2) {
        headerRowIdx = i;
        break;
      }
    }

    const headerRow = aoa[headerRowIdx];
    if (!headerRow) return [];

    // Build canonical header names for each column index
    const canonicalHeaders: string[] = headerRow.map((h: any, idx: number) => {
      const s = String(h ?? "").trim();
      return s || `__col${idx}`;
    });

    // Convert remaining rows to objects keyed by canonical header
    const rawRows: Record<string, any>[] = [];
    for (let i = headerRowIdx + 1; i < aoa.length; i++) {
      const row = aoa[i];
      if (!row) continue;
      // Skip rows that are effectively empty (e.g., trailing blank rows with just a running index)
      const meaningfulCells = row.filter(
        (c: any) => c !== null && c !== "" && c !== undefined
      ).length;
      if (meaningfulCells <= 1) continue; // needs at least 2 filled cells to be real data

      const obj: Record<string, any> = {};
      for (let c = 0; c < canonicalHeaders.length; c++) {
        obj[canonicalHeaders[c]] = row[c] ?? null;
      }
      rawRows.push(obj);
    }

    if (rawRows.length === 0) return [];

    const headerMap = this.detectFormat(canonicalHeaders);
    // rowNum = excel row number (header row was at `headerRowIdx`, so data starts at headerRowIdx+2 in 1-based)
    return rawRows.map((raw, idx) => this.mapAndValidateRow(raw, headerRowIdx + 2 + idx, headerMap));
  }

  private detectFormat(
    originalHeaders: string[]
  ): Record<string, string> {
    const lowerHeaders = originalHeaders.map((h) => h.toLowerCase().trim());

    // Check if Walk-in format (has "enquiry number" or similar DMS fields)
    const hasEnquiryNo = lowerHeaders.some(
      (h) => h.includes("enquiry number") || h.includes("enquiry no")
    );
    const mapping = hasEnquiryNo ? WALKIN_HEADERS : TELE_HEADERS;

    // Map original header name → CRM field name
    // Use substring matching so "Enquiry Date (DD-MM-YYYY)" still maps to enquiryDate.
    // Longer alias keys are matched first to avoid false hits (e.g. "mobile number" before "mobile").
    const aliasKeys = Object.keys(mapping).sort((a, b) => b.length - a.length);
    const result: Record<string, string> = {};
    for (const header of originalHeaders) {
      const normalized = header.toLowerCase().trim();
      // exact match first
      if (mapping[normalized]) {
        result[header] = mapping[normalized];
        continue;
      }
      // substring match (longest first)
      for (const key of aliasKeys) {
        if (normalized.includes(key)) {
          result[header] = mapping[key];
          break;
        }
      }
    }
    return result;
  }

  private mapAndValidateRow(
    raw: Record<string, any>,
    rowNum: number,
    headerMap: Record<string, string>
  ): ParsedRow {
    const mapped: Record<string, any> = {};
    const errors: { column: string; value: string; error: string }[] = [];

    // Map raw columns to CRM fields
    for (const [excelCol, crmField] of Object.entries(headerMap)) {
      mapped[crmField] = raw[excelCol];
    }

    // Normalize customer name
    if (mapped.customerName) {
      const { firstName, lastName } = normalizeName(mapped.customerName);
      mapped.firstName = firstName;
      mapped.lastName = lastName;
    } else if (mapped.firstName) {
      mapped.firstName = String(mapped.firstName).toUpperCase().trim();
      if (mapped.lastName)
        mapped.lastName = String(mapped.lastName).toUpperCase().trim();
    }

    // Normalize mobile
    if (mapped.mobile) {
      const mob = normalizeMobile(mapped.mobile);
      if (!mob.valid) {
        errors.push({
          column: "mobile",
          value: String(mapped.mobile),
          error: mob.error!,
        });
      }
      mapped.mobile = mob.normalized;
    } else {
      errors.push({ column: "mobile", value: "", error: "Mobile is required" });
    }

    // Normalize altMobile
    if (mapped.altMobile) {
      const alt = normalizeMobile(mapped.altMobile);
      mapped.altMobile = alt.valid ? alt.normalized : undefined;
    }

    // Normalize dates — missing enquiry date defaults to today (data quality issue, not a blocker)
    mapped.enquiryDate = normalizeDate(mapped.enquiryDate);
    if (!mapped.enquiryDate) {
      mapped.enquiryDate = new Date();
    }

    mapped.nextFollowupAt = normalizeDate(mapped.nextFollowupAt);
    mapped.currentFollowupDate = normalizeDate(mapped.currentFollowupDate);
    mapped.dob = normalizeDate(mapped.dob);
    mapped.anniversary = normalizeDate(mapped.anniversary);

    if (mapped.followupId) {
      mapped.followupId = String(mapped.followupId).trim() || undefined;
    }

    // Normalize enums
    mapped.stage = normalizeStage(mapped.stage);
    mapped.source = normalizeSource(mapped.source);
    mapped.enquiryType = normalizeEnquiryType(mapped.enquiryType);
    mapped.interestLevel = normalizeInterestLevel(mapped.interestLevel);
    mapped.purchaseType = normalizePurchaseType(mapped.purchaseType);
    mapped.exchangeFlag = normalizeBool(mapped.exchangeFlag);
    mapped.testRideFlag = normalizeBool(mapped.testRideFlag);

    // Model / Variant / Colour — map Excel values to canonical catalogue names
    if (mapped.modelName) {
      const normalized = normalizeModelName(mapped.modelName);
      mapped.modelName = normalized ?? mapped.modelName;
    }
    if (mapped.variantName) {
      const normalized = normalizeVariantName(mapped.variantName);
      mapped.variantName = normalized ?? mapped.variantName;
    }
    if (mapped.colourName) {
      mapped.colourName = normalizeColourName(mapped.colourName);
    }

    // Normalize referred branch
    if (mapped.referredFromBranch) {
      const branch = String(mapped.referredFromBranch).trim();
      mapped.referredFromBranch =
        branch === "Main Dealer" || branch === "" ? null : branch;
    }

    return { rowNum, raw, mapped, errors };
  }

  // ─── Single row import ────────────────────────────────────────

  private async importRow(
    mapped: Record<string, any>,
    createdBy: bigint,
    sourceMap: Map<string, bigint>,
    typeMap: Map<string, bigint>,
    modelMap: Map<string, bigint>,
    variantMap: Map<string, { id: bigint; modelId: bigint }>,
    colourMap: Map<string, bigint>,
    userMap: Map<string, bigint>
  ) {
    // Resolve customer (upsert by mobile)
    let customer = await importRepository.findCustomerByMobile(mapped.mobile);
    if (customer) {
      // Update if we have more data
      if (!customer.isDeleted) {
        // Existing customer, skip creation
      }
    } else {
      customer = await prisma.customer.create({
        data: {
          firstName: mapped.firstName || "UNKNOWN",
          lastName: mapped.lastName,
          mobile: mapped.mobile,
          altMobile: mapped.altMobile,
          email: mapped.email,
          dob: mapped.dob,
          anniversary: mapped.anniversary,
          location: mapped.location,
          customerType: mapped.customerType,
          accountType: mapped.accountType,
          accountName: mapped.accountName,
          createdBy,
        },
      });
    }

    // Resolve lookups
    // Source — auto-create missing sources on the fly (per design doc 7.4)
    let sourceId = sourceMap.get(mapped.source?.toLowerCase());
    if (!sourceId) {
      sourceId = sourceMap.get("other");
    }
    if (!sourceId && mapped.source) {
      // Auto-create new source (inactive — flagged for admin review)
      const newSource = await prisma.enquirySource.create({
        data: { name: mapped.source, displayOrder: 999, isActive: false },
      });
      sourceId = newSource.id;
      sourceMap.set(mapped.source.toLowerCase(), sourceId);
    }
    if (!sourceId) {
      throw new Error(`No source available for: ${mapped.source}`);
    }
    const enquiryTypeId =
      typeMap.get((mapped.enquiryType ?? "New").toLowerCase()) ?? typeMap.get("new")!;
    const modelId = mapped.modelName
      ? modelMap.get(mapped.modelName.toLowerCase()) ?? null
      : null;
    const colourId = mapped.colourName
      ? colourMap.get(mapped.colourName.toLowerCase()) ?? null
      : null;

    // Resolve variant (needs model context)
    let variantId: bigint | null = null;
    if (modelId && mapped.variantName) {
      const key = `${modelId}:${mapped.variantName.toLowerCase().trim()}`;
      variantId = variantMap.get(key)?.id ?? null;
    }

    // Resolve executive
    const assignedTo = mapped.executive
      ? userMap.get(
          String(mapped.executive).toLowerCase().replace(/\.+$/, "").trim()
        ) ?? null
      : null;

    // Dedupe lead. When the Hirise Honda export is re-imported (daily habit) the same
    // enquiryNo rows will appear again. The Hirise DMS emits one row per follow-up, so
    // several rows can share an enquiryNo — treat the extra rows as additional follow-ups
    // on the existing lead rather than dropping them (which was losing follow-up history).
    let enquiryNo = mapped.enquiryNo;
    if (enquiryNo) {
      const existing = await importRepository.findLeadByEnquiryNo(enquiryNo);
      if (existing) {
        await this.appendImportedFollowup(existing.id, mapped, createdBy);
        return "skipped" as const;
      }
    } else {
      // Generate new enquiry number
      const now = mapped.enquiryDate ?? new Date();
      const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
      const prefix = `BW-${yearMonth}-`;
      const last = await prisma.lead.findFirst({
        where: { enquiryNo: { startsWith: prefix } },
        orderBy: { enquiryNo: "desc" },
        select: { enquiryNo: true },
      });
      let seq = 1;
      if (last) seq = parseInt(last.enquiryNo.split("-").pop()!, 10) + 1;
      enquiryNo = `${prefix}${String(seq).padStart(5, "0")}`;
    }

    // Determine channel: explicit override > walkin (has enquiry_no) > default to TELE
    const channel =
      mapped.__channelOverride ||
      (mapped.enquiryNo ? "WALKIN" : "TELE");

    // Create lead
    const lead = await prisma.lead.create({
      data: {
        enquiryNo,
        dmsEnquiryNo: mapped.enquiryNo?.startsWith("VEHENQ") ? mapped.enquiryNo : undefined,
        customerId: customer.id,
        channel,
        sourceId,
        enquiryTypeId,
        purchaseType: mapped.purchaseType,
        exchangeFlag: mapped.exchangeFlag ?? false,
        modelId,
        variantId,
        colourId,
        assignedTo,
        stage: mapped.stage ?? "NOT_CONTACTED",
        interestLevel: mapped.interestLevel,
        testRideFlag: mapped.testRideFlag ?? false,
        nextFollowupAt: mapped.nextFollowupAt,
        enquiryDate: mapped.enquiryDate ?? new Date(),
        remark: mapped.remark ?? mapped.closureRemark,
        referredFromBranch: mapped.referredFromBranch,
        closedAt:
          mapped.stage === "DELIVERED_CLOSED" || mapped.stage === "LOST"
            ? new Date()
            : undefined,
        createdBy,
      },
    });

    // Create initial follow-up from the Excel row (Hirise DMS exports one follow-up
    // per row; later rows for the same enquiryNo are appended by appendImportedFollowup).
    if (mapped.followupRemark || mapped.currentFollowupDate || mapped.followupId) {
      const followupDate =
        mapped.currentFollowupDate ?? mapped.enquiryDate ?? new Date();
      await prisma.leadFollowup.create({
        data: {
          leadId: lead.id,
          seqNo: 1,
          followupDate,
          remark: this.buildFollowupRemark(
            mapped.followupRemark,
            mapped.followupId
          ),
          createdBy,
        },
      });
    }
  }

  // Compose the follow-up remark so the Hirise follow-up id is preserved alongside
  // the free-text remark. The id is the natural key we use for dedupe on re-import.
  private buildFollowupRemark(
    remark: string | null | undefined,
    followupId: string | null | undefined
  ): string | null {
    const r = remark ? String(remark).trim() : "";
    const id = followupId ? String(followupId).trim() : "";
    if (r && id) return `[${id}] ${r}`;
    if (r) return r;
    if (id) return `[${id}]`;
    return null;
  }

  // Append an imported follow-up to an existing lead. De-dupes on Hirise Follow Up Id
  // when present (exact natural key), otherwise falls back to (date + remark) so
  // re-imports of the same file don't double up rows.
  private async appendImportedFollowup(
    leadId: bigint,
    mapped: Record<string, any>,
    createdBy: bigint
  ) {
    const remark = this.buildFollowupRemark(
      mapped.followupRemark,
      mapped.followupId
    );
    const followupDate: Date | null =
      mapped.currentFollowupDate ?? mapped.enquiryDate ?? null;

    // Nothing to record
    if (!remark && !followupDate) return;

    const existing = await prisma.leadFollowup.findMany({
      where: { leadId },
      select: { seqNo: true, followupDate: true, remark: true },
      orderBy: { seqNo: "desc" },
    });

    // Dedup check
    const followupIdTag = mapped.followupId
      ? `[${String(mapped.followupId).trim()}]`
      : null;
    const alreadyExists = existing.some((f) => {
      if (followupIdTag && f.remark?.startsWith(followupIdTag)) return true;
      if (
        followupDate &&
        f.followupDate &&
        f.remark === remark &&
        new Date(f.followupDate).getTime() === followupDate.getTime()
      ) {
        return true;
      }
      return false;
    });
    if (alreadyExists) return;

    const nextSeqNo = (existing[0]?.seqNo ?? 0) + 1;

    await prisma.leadFollowup.create({
      data: {
        leadId,
        seqNo: nextSeqNo,
        followupDate: followupDate ?? new Date(),
        remark,
        createdBy,
      },
    });

    if (mapped.nextFollowupAt) {
      await prisma.lead.update({
        where: { id: leadId },
        data: { nextFollowupAt: mapped.nextFollowupAt },
      });
    }
  }
}

export const importService = new ImportService();
