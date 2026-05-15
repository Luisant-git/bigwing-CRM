import { createHash } from "crypto";
import { readFileSync } from "fs";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { prisma } from "@bigwing/db";
import { importRepository } from "./repository.js";
import { AppError } from "../../middlewares/errorHandler.js";
import { brandContext } from "../../middlewares/brand.js";
import {
  normalizeMobile,
  normalizeDate,
  normalizeName,
  normalizeStage,
  normalizeSource,
  normalizeChannel,
  normalizeBool,
  normalizeInterestLevel,
  normalizePurchaseType,
  normalizeModelName,
  normalizeVariantName,
  normalizeColourName,
  normalizeEnquiryType,
} from "./normalizer.js";

const BATCH_SIZE = 500;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Column header → CRM field mapping for auto-detect
const TELE_HEADERS: Record<string, string> = {
  "enquiry date": "enquiryDate",
  "enq date": "enquiryDate",
  "enquiry created date": "enquiryDate",
  "enq created date": "enquiryDate",
  "created date": "enquiryDate",
  "customer name": "customerName",
  "mobile number": "mobile",
  "alternate mobile number": "altMobile",
  "exchange": "exchangeFlag",
  "enquiry type": "enquiryType",
  "type of enquiry": "enquiryType",
  "type": "enquiryType",
  "enq type": "enquiryType",
  "location": "location",
  "channel": "channel",
  "source of enquiry": "source",
  "enquiry source": "source",
  "source": "source",
  "reference name": "refName",
  "model interested": "modelName",
  "model name": "modelName",
  "variant": "variantName",
  "model variant": "variantName",
  "colour preference": "colourName",
  "color": "colourName",
  "colour": "colourName",
  "executive assigned": "executive",
  "dealer sales executive name": "executive",
  "sales executive": "executive",
  "executive": "executive",
  "next follow up date": "nextFollowupAt",
  "next follow-up date": "nextFollowupAt",
  "next followup date": "nextFollowupAt",
  "current follow up date": "currentFollowupDate",
  "current follow-up date": "currentFollowupDate",
  "current followup date": "currentFollowupDate",
  "enquiry stage": "stage",
  "enquiry sales stage": "stage",
  "sales stage": "stage",
  "status": "stage",
  "current status": "stage",
  "enquiry status": "stage",
  "stage": "stage",
  "interest level": "interestLevel",
  "enquiry closing stage": "closureReason",
};

const WALKIN_HEADERS: Record<string, string> = {
  "enquiry number": "enquiryNo",
  "enquiry no": "enquiryNo",
  "model name": "modelName",
  "model interested": "modelName",
  "model variant": "variantName",
  "variant": "variantName",
  "color": "colourName",
  "colour": "colourName",
  "customer first name": "firstName",
  "customer last name": "lastName",
  "customer name": "customerName",
  "mobile no.": "mobile",
  "mobile no": "mobile",
  "mobile number": "mobile",
  "next follow up date": "nextFollowupAt",
  "next follow-up date": "nextFollowupAt",
  "next followup date": "nextFollowupAt",
  "current follow up date": "currentFollowupDate",
  "current follow-up date": "currentFollowupDate",
  "current followup date": "currentFollowupDate",
  "follow up id": "followupId",
  "follow up remark": "followupRemark",
  "follow up remarks": "followupRemark",
  "date of birth": "dob",
  "date of marriage": "anniversary",
  "enquiry created date": "enquiryDate",
  "enquiry date": "enquiryDate",
  "enquiry sales stage": "stage",
  "enquiry stage": "stage",
  "sales stage": "stage",
  "status": "stage",
  "current status": "stage",
  "enquiry status": "stage",
  "stage": "stage",
  "enquiry source": "source",
  "source of enquiry": "source",
  "source": "source",
  "dealer sales executive name": "executive",
  "executive assigned": "executive",
  "sales executive": "executive",
  "executive": "executive",
  "test ride flag": "testRideFlag",
  "purchase type": "purchaseType",
  "enquiry classification": "interestLevel",
  "enquiry type": "enquiryType",
  "type of enquiry": "enquiryType",
  "type": "enquiryType",
  "real next followup": "realNextFollowup",
  "real next follow up": "realNextFollowup",
  "enq type": "enquiryType",
  "customer type": "customerType",
  "customer category": "accountType",
  "account type": "accountType",
  "account name": "accountName",
  "channel": "channel",
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

  async upload(filePath: string, fileName: string, createdBy: bigint, brandOverride?: string) {
    const fileBuffer = readFileSync(filePath);
    // Hash is kept on the batch row for traceability (which file produced which batch),
    // but we no longer block re-uploads of the same file — the Hirise Honda DMS export
    // is run daily and operators routinely import the latest dump. Row-level dedupe by
    // enquiryNo (see importRow) guarantees we won't create duplicate leads.
    const fileHash = createHash("sha256").update(fileBuffer).digest("hex");
    
    let sheets: string[] = [];
    const fileContent = fileBuffer.toString("utf-8");
    const isAnalysisRowset = fileContent.includes("xml-analysis:rowset");

    if (isAnalysisRowset) {
      sheets = ["Analysis Rowset"];
    } else {
      try {
        const workbook = XLSX.read(fileBuffer, { type: "buffer" });
        sheets = workbook.SheetNames;
      } catch (err) {
        console.error("[Import] Upload read failed:", err);
        throw new AppError(400, "INVALID_FILE", "Could not read file. Ensure it is a valid Excel, CSV or XML spreadsheet.");
      }
    }

    const brand = brandOverride || brandContext.getStore();
    const batch = await importRepository.createBatch({
      fileName,
      fileHash,
      createdBy,
      brand,
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

    // Used for batch enquiry number generation
    let lastSeq = -1;
    let currentPrefix = "";

    // Process in batches of 500 for memory safety and performance
    try {
      for (let batchStart = 0; batchStart < parsed.length; batchStart += BATCH_SIZE) {
      const slice = parsed.slice(batchStart, batchStart + BATCH_SIZE);

      // Pre-fetch existing records for this batch to minimize individual lookups
      const mobiles = slice.map(r => r.mapped.mobile).filter(Boolean);
      const enquiryNos = slice.map(r => r.mapped.enquiryNo).filter(Boolean);

      const [existingCustomers, existingLeads] = await Promise.all([
        prisma.customer.findMany({ where: { mobile: { in: mobiles } } }),
        prisma.lead.findMany({ where: { enquiryNo: { in: enquiryNos } } })
      ]);

      const customerCache = new Map<string, any>(existingCustomers.map(c => [c.mobile, c]));
      const leadCache = new Map<string, any>(existingLeads.map(l => [l.enquiryNo!, l]));

      // Pre-create missing lookups to avoid queries inside the loop
      const missingSources = new Set<string>();
      const missingTypes = new Set<string>();
      const missingModels = new Set<string>();
      const missingColours = new Set<string>();

      slice.forEach(r => {
        if (r.mapped.source && !sourceMap.has(r.mapped.source.toLowerCase())) missingSources.add(r.mapped.source);
        if (r.mapped.enquiryType && !typeMap.has(r.mapped.enquiryType.toLowerCase())) missingTypes.add(r.mapped.enquiryType);
        if (r.mapped.modelName && !modelMap.has(r.mapped.modelName.toLowerCase())) missingModels.add(r.mapped.modelName);
        if (r.mapped.colourName && !colourMap.has(r.mapped.colourName.toLowerCase())) missingColours.add(r.mapped.colourName);
      });

      if (missingSources.size > 0) {
        for (const name of missingSources) {
          const s = await prisma.enquirySource.upsert({
            where: { brand_name: { name, brand: batch.brand } },
            update: {},
            create: { name, brand: batch.brand, isActive: true, displayOrder: 999 }
          });
          sourceMap.set(name.toLowerCase(), s.id);
        }
      }
      if (missingTypes.size > 0) {
        for (const name of missingTypes) {
          const t = await prisma.enquiryTypeLookup.upsert({
            where: { brand_name: { name, brand: batch.brand } },
            update: {},
            create: { name, brand: batch.brand, isActive: true, displayOrder: 999 }
          });
          typeMap.set(name.toLowerCase(), t.id);
        }
      }
      if (missingModels.size > 0) {
        for (const name of missingModels) {
          const m = await prisma.vehicleModel.upsert({
            where: { brand_name: { name, brand: batch.brand } },
            update: {},
            create: { name, brand: batch.brand, isActive: true, displayOrder: 999 }
          });
          modelMap.set(name.toLowerCase(), m.id);
        }
      }
      if (missingColours.size > 0) {
        for (const name of missingColours) {
          const c = await prisma.vehicleColour.upsert({
            where: { brand_name: { name, brand: batch.brand } },
            update: {},
            create: { name, brand: batch.brand, isActive: true, displayOrder: 999 }
          });
          colourMap.set(name.toLowerCase(), c.id);
        }
      }

      // Pre-create missing variants
      const missingVariants = new Set<string>();
      slice.forEach(r => {
        if (r.mapped.modelName && r.mapped.variantName) {
          const modelId = modelMap.get(r.mapped.modelName.toLowerCase());
          if (modelId) {
            const key = `${modelId}:${r.mapped.variantName.toLowerCase().trim()}`;
            if (!variantMap.has(key)) {
              missingVariants.add(`${modelId}|${r.mapped.variantName}`);
            }
          }
        }
      });

      if (missingVariants.size > 0) {
        for (const composite of missingVariants) {
          const [modelIdStr, name] = composite.split("|");
          const modelId = BigInt(modelIdStr);
          const v = await prisma.vehicleVariant.upsert({
            where: { modelId_name: { modelId, name } },
            update: {},
            create: { modelId, name, isActive: true, displayOrder: 999 }
          });
          variantMap.set(`${modelId}:${name.toLowerCase().trim()}`, { id: v.id, modelId });
        }
      }

      // Pre-fetch all followups for existing leads in this batch to avoid 1 query per row
      const existingLeadIds = existingLeads.map(l => l.id);
      const allFollowups = existingLeadIds.length > 0 
        ? await prisma.leadFollowup.findMany({
            where: { leadId: { in: existingLeadIds } },
            orderBy: { seqNo: "desc" }
          })
        : [];
      
      const followupCache = new Map<bigint, any[]>();
      allFollowups.forEach(f => {
        const list = followupCache.get(f.leadId) || [];
        list.push(f);
        followupCache.set(f.leadId, list);
      });

      // Process batch rows sequentially for resilience (so one failure doesn't kill the batch)
      // but lookups are already optimized above.
      for (const row of slice) {
        // Check if batch was cancelled (only once at the start of the slice for efficiency)
        if (row === slice[0]) {
          try {
            const currentBatch = await importRepository.findBatchById(batchId);
            if (currentBatch?.status === "CANCELLED") {
              throw new Error("IMPORT_CANCELLED");
            }
          } catch (err: any) {
            if (err.message === "IMPORT_CANCELLED") throw err;
            console.warn(`[Import] Could not check cancellation status for batch ${batchId}:`, err.message);
            // Continue import if it's just a transient connection issue on the status check
          }
        }

        // Skip rows with critical validation errors
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

        if (channelOverride) row.mapped.__channelOverride = channelOverride;

        try {
          const result = await this.importRow(
            row.mapped,
            batch.createdBy,
            prisma, // Use global prisma for resilience
            { customerCache, leadCache, followupCache },
            {
              sourceMap,
              typeMap,
              modelMap,
              variantMap,
              colourMap,
              userMap,
              // Helper to get next enquiry no without a query per row
              getNextEnquiryNo: async (t: any, date: Date) => {
                const now = date || new Date();
                const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
                const prefix = `BW-${yearMonth}-`;
                
                if (prefix !== currentPrefix) {
                  currentPrefix = prefix;
                  const last = await t.lead.findFirst({
                    where: { enquiryNo: { startsWith: prefix } },
                    orderBy: { enquiryNo: "desc" },
                    select: { enquiryNo: true },
                  });
                  lastSeq = last ? parseInt(last.enquiryNo.split("-").pop()!, 10) : 0;
                }
                lastSeq++;
                return `${prefix}${String(lastSeq).padStart(5, "0")}`;
              }
            }
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

      // Flush errors per batch using global prisma
      if (rowErrors.length >= 100) {
        await importRepository.createRowErrors(rowErrors.splice(0, rowErrors.length));
      }

        await importRepository.updateBatch(batchId, {
          totalRows: parsed.length,
          successRows,
          errorRows,
          skippedRows,
        });

        if (batchStart + BATCH_SIZE < parsed.length) {
          await sleep(100); // 100ms breather for Postgres (reduced from 1s)
        }
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
    } catch (err: any) {
      if (err.message === "IMPORT_CANCELLED") {
        console.log(`[Import] Batch ${batchId} was cancelled by user.`);
        return;
      }
      console.error(`[Import] Critical failure during commit for batch ${batchId}:`, err);
      await importRepository.updateBatch(batchId, {
        status: "FAILED",
        completedAt: new Date(),
      });
      throw err;
    }

    return {
      batchId: Number(batchId),
      status: "COMPLETED",
      totalRows: parsed.length,
      successRows,
      errorRows,
      skippedRows,
    };
  }

  async cancel(batchId: bigint) {
    const batch = await importRepository.findBatchById(batchId);
    if (!batch) throw new AppError(404, "BATCH_NOT_FOUND", "Import batch not found");
    
    if (batch.status !== "PROCESSING" && batch.status !== "PENDING") {
      throw new AppError(400, "INVALID_STATUS", `Cannot cancel batch in ${batch.status} status`);
    }

    await importRepository.updateBatch(batchId, {
      status: "CANCELLED",
      completedAt: new Date(),
    });

    return { success: true };
  }

  async getActiveBatch() {
    const batch = await importRepository.findActiveBatch();
    if (!batch) return null;
    return {
      id: Number(batch.id),
      fileName: batch.fileName,
      status: batch.status,
      totalRows: batch.totalRows,
      successRows: batch.successRows,
      errorRows: batch.errorRows,
      skippedRows: batch.skippedRows,
      startedAt: batch.startedAt,
      createdAt: batch.createdAt,
    };
  }

  // ─── Error report ─────────────────────────────────────────────

  async getErrors(batchId: bigint) {
    const batch = await importRepository.findBatchById(batchId);
    if (!batch) throw new AppError(404, "BATCH_NOT_FOUND", "Import batch not found");

    const errors = await importRepository.getRowErrors(batchId);
    if (errors.length === 0) {
      throw new AppError(400, "NO_ERRORS", "No errors found for this batch");
    }

    // Group errors by row number
    const errorMap = new Map<number, { column?: string; error: string }[]>();
    errors.forEach((e) => {
      const existing = errorMap.get(e.rowNumber) || [];
      existing.push({ column: e.column ?? undefined, error: e.error });
      errorMap.set(e.rowNumber, existing);
    });

    const filePath = `uploads/${batch.fileName}`;
    let allRows: ParsedRow[] = [];
    try {
      allRows = this.parseFile(filePath);
    } catch (err) {
      console.error("[Import] Failed to re-parse file for error report:", err);
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Fix and Re-upload");

    if (allRows.length > 0) {
      const firstRow = allRows[0];
      const originalHeaders = Object.keys(firstRow.raw);
      
      const requiredKeywords = ["mobile", "customer name", "first name", "enquiry date", "source", "model interested", "model name"];

      // Setup columns with labels
      const sheetHeaders = originalHeaders.map(h => {
        let label = h;
        if (requiredKeywords.some(kw => h.toLowerCase().includes(kw))) {
          if (!label.includes("*")) label = `${h} *`;
        }
        return label;
      });
      const remarksHeader = "IMPORT_REMARKS (FIX THESE)";
      const allHeaderLabels = [...sheetHeaders, remarksHeader];
      
      sheet.columns = allHeaderLabels.map((h) => ({
        header: h,
        key: h,
        width: h === remarksHeader ? 50 : 20,
      }));

      // Filter rows that have errors
      const errorRows = allRows.filter((r) => errorMap.has(r.rowNum));

      errorRows.forEach((r) => {
        const rowData: Record<string, any> = {};
        originalHeaders.forEach((h, idx) => {
          rowData[sheetHeaders[idx]] = r.raw[h];
        });
        
        const rowErrors = errorMap.get(r.rowNum)!;
        rowData[remarksHeader] = rowErrors
          .map((re) => `${re.column ? re.column + ": " : ""}${re.error}`)
          .join(" | ");

        const row = sheet.addRow(rowData);

        // Highlight cells with errors
        rowErrors.forEach((re) => {
          if (re.column) {
            // Find column index (1-based for ExcelJS cell access)
            const colIdx = sheetHeaders.findIndex(
              (h) =>
                h === re.column ||
                h === `${re.column} *` ||
                h.toLowerCase().includes(re.column!.toLowerCase())
            );
            if (colIdx !== -1) {
              const cell = row.getCell(colIdx + 1);
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFFFC7CE" }, // Light red background
              };
              cell.font = {
                color: { argb: "FF9C0006" }, // Dark red text
              };
            }
          }
        });

        // Also highlight missing values in required columns
        originalHeaders.forEach((h, idx) => {
          const val = r.raw[h];
          const isRequired = requiredKeywords.some((kw) => h.toLowerCase().includes(kw));
          if (isRequired && (val === null || val === undefined || String(val).trim() === "")) {
            const cell = row.getCell(idx + 1);
            // Only fill if not already filled by error logic
            if (!cell.fill || (cell.fill as any).pattern !== "solid") {
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFFFC7CE" },
              };
            }
          }
        });

        // Style the remarks column cell
        const remarksCell = row.getCell(allHeaderLabels.length);
        remarksCell.font = { color: { argb: "FF9C0006" }, italic: true };
      });

      // Style header row
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FF1F3864" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF2F2F2" },
      };
      headerRow.alignment = { horizontal: "center" };

    } else {
      // Fallback: only show Row, Column, Value, Error
      sheet.columns = [
        { header: "Row", key: "row", width: 10 },
        { header: "Column", key: "col", width: 20 },
        { header: "Value", key: "val", width: 20 },
        { header: "Error", key: "err", width: 50 },
      ];
      errors.forEach((e) => {
        sheet.addRow({
          row: e.rowNumber,
          col: e.column,
          val: e.value,
          err: e.error,
        });
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as any;
  }

  // ─── File parsing ─────────────────────────────────────────────

  private parseFile(filePath: string, sheetName?: string): ParsedRow[] {
    const fileBuffer = readFileSync(filePath);
    const fileContent = fileBuffer.toString("utf-8");
    const isAnalysisRowset = fileContent.includes("xml-analysis:rowset");

    let aoa: any[][] = [];
    let headerRowIdx = 0;

    if (isAnalysisRowset) {
      const { headers, rows } = this.parseAnalysisRowset(fileContent);
      aoa = [headers, ...rows];
      headerRowIdx = 0;
    } else {
      let workbook;
      try {
        workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
      } catch (err) {
        console.error("[Import] Parsing failed:", err);
        throw new AppError(
          400,
          "INVALID_FILE",
          "Could not parse file. Ensure it is a valid Excel, CSV or XML spreadsheet."
        );
      }

      const sheet = workbook.Sheets[sheetName ?? workbook.SheetNames[0]];
      if (!sheet) throw new AppError(400, "SHEET_NOT_FOUND", "Sheet not found");

      // Read as 2D array so we can scan for the real header row
      aoa = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: null,
        blankrows: false,
      });

      if (aoa.length === 0) return [];

      // Auto-detect header row: scan first 5 rows for known column labels
      const HEADER_MARKERS = [
        "customer name",
        "mobile number",
        "mobile no",
        "enquiry number",
        "enquiry date",
        "enquiry created date",
        "model interested",
        "model name",
        "customer first name",
      ];

      for (let i = 0; i < Math.min(5, aoa.length); i++) {
        const row = aoa[i];
        if (!row) continue;
        const cellStrs = row.map((c) => String(c ?? "").toLowerCase().trim());
        const matchCount = HEADER_MARKERS.filter((m) =>
          cellStrs.some((c) => c.includes(m))
        ).length;
        if (matchCount >= 2) {
          headerRowIdx = i;
          break;
        }
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

    console.log(`[Import Header] Detected Headers:`, lowerHeaders);

    const isWalkin = lowerHeaders.includes("enquiry number") || lowerHeaders.includes("dms enquiry no");
    const rowMapping = isWalkin ? WALKIN_HEADERS : TELE_HEADERS;
    
    // Debug the mapping result
    const actualMapping: Record<string, string> = {};
    for (let i = 0; i < lowerHeaders.length; i++) {
      const field = rowMapping[lowerHeaders[i]];
      if (field) actualMapping[lowerHeaders[i]] = `Col ${i} -> ${field}`;
    }
    console.log(`[Import Mapping] Final Column Map:`, actualMapping);

    // Map original header name → CRM field name
    // Use substring matching so "Enquiry Date (DD-MM-YYYY)" still maps to enquiryDate.
    // Longer alias keys are matched first to avoid false hits (e.g. "mobile number" before "mobile").
    const aliasKeys = Object.keys(rowMapping).sort((a, b) => b.length - a.length);
    const result: Record<string, string> = {};
    for (const header of originalHeaders) {
      const normalized = header.toLowerCase().trim();
      // exact match first
      if (rowMapping[normalized]) {
        result[header] = rowMapping[normalized];
        continue;
      }
      // substring match (longest first)
      for (const key of aliasKeys) {
        if (normalized.includes(key)) {
          result[header] = rowMapping[key];
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
    
    if (rowNum <= 5) {
      console.log(`[Import Debug] Row ${rowNum} mapped:`, mapped.modelName, mapped.variantName, mapped);
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
    mapped.channel = normalizeChannel(mapped.channel);
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
    tx: any,
    cache: {
      customerCache: Map<string, any>;
      leadCache: Map<string, any>;
      followupCache: Map<bigint, any[]>;
    },
    lookups: {
      sourceMap: Map<string, bigint>;
      typeMap: Map<string, bigint>;
      modelMap: Map<string, bigint>;
      variantMap: Map<string, { id: bigint; modelId: bigint }>;
      colourMap: Map<string, bigint>;
      userMap: Map<string, bigint>;
      getNextEnquiryNo: (tx: any, date: Date) => Promise<string>;
    }
  ) {
    const { sourceMap, typeMap, modelMap, variantMap, colourMap, userMap, getNextEnquiryNo } = lookups;
    const { customerCache, leadCache } = cache;

    // Resolve customer (upsert by mobile)
    let customer = customerCache.get(mapped.mobile);
    if (customer) {
      // Update customer info ONLY if it changed in Excel
      const hasChanged = 
        (mapped.firstName && mapped.firstName !== customer.firstName) ||
        (mapped.lastName && mapped.lastName !== customer.lastName) ||
        (mapped.email && mapped.email !== customer.email) ||
        (mapped.dob && mapped.dob?.getTime() !== customer.dob?.getTime()) ||
        (mapped.anniversary && mapped.anniversary?.getTime() !== customer.anniversary?.getTime()) ||
        (mapped.location && mapped.location !== customer.location) ||
        (mapped.customerType && mapped.customerType !== customer.customerType) ||
        (mapped.accountType && mapped.accountType !== customer.accountType) ||
        (mapped.accountName && mapped.accountName !== customer.accountName);

      if (hasChanged) {
        customer = await tx.customer.update({
          where: { id: customer.id },
          data: {
            firstName: mapped.firstName ?? customer.firstName,
            lastName: mapped.lastName ?? customer.lastName,
            email: mapped.email ?? customer.email,
            dob: mapped.dob ?? customer.dob,
            anniversary: mapped.anniversary ?? customer.anniversary,
            location: mapped.location ?? customer.location,
            customerType: mapped.customerType ?? customer.customerType,
            accountType: mapped.accountType ?? customer.accountType,
            accountName: mapped.accountName ?? customer.accountName,
            updatedBy: createdBy,
            updatedAt: new Date(),
          },
        });
      }
    } else {
      customer = await tx.customer.create({
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
      customerCache.set(mapped.mobile, customer);
    }

    // Resolve lookups - now guaranteed by pre-creation in commit()
    let sourceId = mapped.source
      ? sourceMap.get(mapped.source.toLowerCase()) ?? null
      : null;
    if (!sourceId) sourceId = sourceMap.get("other") || null;
    if (!sourceId) throw new Error(`No source available for: ${mapped.source}`);

    let enquiryTypeId = mapped.enquiryType
      ? typeMap.get(mapped.enquiryType.toLowerCase()) ?? null
      : null;
    if (!enquiryTypeId) enquiryTypeId = typeMap.get("new")!;

    let modelId = mapped.modelName
      ? modelMap.get(mapped.modelName.toLowerCase()) ?? null
      : null;

    let colourId = mapped.colourName
      ? colourMap.get(mapped.colourName.toLowerCase()) ?? null
      : null;

    let variantId: bigint | null = null;
    if (modelId && mapped.variantName) {
      const key = `${modelId}:${mapped.variantName.toLowerCase().trim()}`;
      variantId = variantMap.get(key)?.id ?? null;
    }

    // Resolve executive
    let assignedTo: bigint | null = null;
    if (mapped.executive) {
      const execName = String(mapped.executive).toLowerCase().replace(/\.+$/, "").trim();
      assignedTo = userMap.get(execName) ?? null;
      if (!assignedTo) {
        for (const [fullName, id] of userMap.entries()) {
          if (fullName.includes(execName) || execName.includes(fullName)) {
            assignedTo = id;
            break;
          }
        }
      }
    }

    const targetStage = normalizeStage(mapped.stage);

    // Dedupe lead
    let enquiryNo = mapped.enquiryNo;
    if (enquiryNo) {
      const existing = leadCache.get(enquiryNo);
      if (existing) {
        let nextDate = mapped.nextFollowupAt ? new Date(mapped.nextFollowupAt) : null;
        if (!nextDate && mapped.realNextFollowup) {
          const parts = String(mapped.realNextFollowup).split("|");
          const datePart = parts.find(p => p.match(/\d{1,2}[\-\/]\d{1,2}[\-\/]\d{2,4}/));
          if (datePart) nextDate = normalizeDate(datePart);
        }

        const lastDate = mapped.currentFollowupDate ? new Date(mapped.currentFollowupDate) : null;
        const shouldUpdateNext = nextDate && (!existing.nextFollowupAt || nextDate.getTime() !== existing.nextFollowupAt.getTime());
        const shouldUpdateLast = lastDate && (!existing.lastFollowupAt || lastDate.getTime() !== existing.lastFollowupAt.getTime());

        const hasChanged = 
          targetStage !== existing.stage ||
          (sourceId && sourceId !== existing.sourceId) ||
          (enquiryTypeId && enquiryTypeId !== existing.enquiryTypeId) ||
          (modelId && modelId !== existing.modelId) ||
          (variantId && variantId !== existing.variantId) ||
          (colourId && colourId !== existing.colourId) ||
          (assignedTo && assignedTo !== existing.assignedTo) ||
          (mapped.executive && mapped.executive !== existing.executiveName) ||
          (mapped.interestLevel && mapped.interestLevel !== existing.interestLevel) ||
          (mapped.testRideFlag !== undefined && mapped.testRideFlag !== existing.testRideFlag) ||
          shouldUpdateNext ||
          shouldUpdateLast ||
          (mapped.referredFromBranch && mapped.referredFromBranch !== existing.referredFromBranch);

        if (hasChanged) {
          await tx.lead.update({
            where: { id: existing.id },
            data: {
              stage: targetStage,
              sourceId: sourceId ?? existing.sourceId,
              enquiryTypeId: enquiryTypeId ?? existing.enquiryTypeId,
              modelId: modelId ?? existing.modelId,
              variantId: variantId ?? existing.variantId,
              colourId: colourId ?? existing.colourId,
              assignedTo: assignedTo ?? existing.assignedTo,
              executiveName: mapped.executive ?? existing.executiveName,
              interestLevel: mapped.interestLevel ?? existing.interestLevel,
              testRideFlag: mapped.testRideFlag ?? existing.testRideFlag,
              nextFollowupAt: shouldUpdateNext ? nextDate : existing.nextFollowupAt,
              lastFollowupAt: shouldUpdateLast ? lastDate : existing.lastFollowupAt,
              enquiryDate: mapped.enquiryDate ?? existing.enquiryDate,
              remark: mapped.remark ?? mapped.closureRemark ?? existing.remark,
              referredFromBranch: mapped.referredFromBranch ?? existing.referredFromBranch,
              updatedBy: createdBy,
              updatedAt: new Date(),
            },
          });
        }
        await this.appendImportedFollowup(existing.id, mapped, createdBy, tx, cache.followupCache);
        return "skipped" as const;
      }
    } else {
      enquiryNo = await getNextEnquiryNo(tx, mapped.enquiryDate);
    }

    const channel = mapped.__channelOverride || mapped.channel || (mapped.enquiryNo ? "WALKIN" : "TELE");

    const lead = await tx.lead.create({
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
        executiveName: mapped.executive,
        stage: targetStage,
        interestLevel: mapped.interestLevel,
        testRideFlag: mapped.testRideFlag || false,
        nextFollowupAt: mapped.nextFollowupAt,
        lastFollowupAt: mapped.currentFollowupDate,
        enquiryDate: mapped.enquiryDate || new Date(),
        remark: mapped.remark ?? mapped.closureRemark,
        referredFromBranch: mapped.referredFromBranch,
        closedAt: targetStage === "DELIVERED_CLOSED" || targetStage === "LOST" ? new Date() : undefined,
        createdBy,
      },
    });

    // Reduce stock for the variant if provided
    if (variantId) {
      await tx.vehicleVariant.update({
        where: { id: variantId },
        data: { stock: { decrement: 1 } },
      }).catch((err: any) => {
        console.error(`[Import] Failed to reduce stock for variant ${variantId}:`, err.message);
      });
    }

    // Update cache so subsequent rows in same batch find this lead
    leadCache.set(enquiryNo, lead);

    if (mapped.followupRemark || mapped.currentFollowupDate || mapped.followupId) {
      const followupDate = mapped.currentFollowupDate ?? mapped.enquiryDate ?? new Date();
      await tx.leadFollowup.create({
        data: {
          leadId: lead.id,
          seqNo: 1,
          followupDate,
          remark: this.buildFollowupRemark(mapped.followupRemark, mapped.followupId),
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
    createdBy: bigint,
    tx: any,
    followupCache?: Map<bigint, any[]>
  ) {
    const remark = this.buildFollowupRemark(
      mapped.followupRemark,
      mapped.followupId
    );
    const followupDate: Date | null =
      mapped.currentFollowupDate ?? mapped.enquiryDate ?? null;

    // Nothing to record
    if (!remark && !followupDate) return;

    // Use cache if available, otherwise fetch
    const existing = followupCache 
      ? (followupCache.get(leadId) || [])
      : await tx.leadFollowup.findMany({
          where: { leadId },
          select: { seqNo: true, followupDate: true, remark: true },
          orderBy: { seqNo: "desc" },
        });

    // Dedup check
    const followupIdTag = mapped.followupId
      ? `[${String(mapped.followupId).trim()}]`
      : null;
    const alreadyExists = existing.some((f: any) => {
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

    await tx.leadFollowup.create({
      data: {
        leadId,
        seqNo: nextSeqNo,
        followupDate: followupDate ?? new Date(),
        remark,
        createdBy,
      },
    });

    if (mapped.nextFollowupAt) {
      await tx.lead.update({
        where: { id: leadId },
        data: { nextFollowupAt: mapped.nextFollowupAt },
      });
    }
  }

  private parseAnalysisRowset(xmlString: string) {
    const headerMap: Record<string, string> = {};
    // Extract schema: <xsd:element name="C0" ... saw-sql:columnHeading="Network Type" ... />
    const schemaRegex = /<xsd:element[^>]+?name="(C\d+)"[^>]+?saw-sql:columnHeading="([^"]+)"/g;
    let match;
    while ((match = schemaRegex.exec(xmlString)) !== null) {
      headerMap[match[1]] = this.decodeXmlEntities(match[2]);
    }

    // Determine the max column index from headers
    const colIndices = Object.keys(headerMap).map((c) => parseInt(c.substring(1)));
    const maxCol = colIndices.length > 0 ? Math.max(...colIndices) : -1;

    const headers: string[] = [];
    for (let i = 0; i <= maxCol; i++) {
      headers[i] = headerMap[`C${i}`] || `Column ${i}`;
    }

    const rows: any[][] = [];
    // Extract data rows: <R><C0>...</C0><C1>...</C1>...</R>
    const rowRegex = /<R>(.*?)<\/R>/gs;
    const colRegex = /<(C\d+)>(.*?)<\/\1>/g;

    let rowMatch;
    while ((rowMatch = rowRegex.exec(xmlString)) !== null) {
      const rowContent = rowMatch[1];
      const rowData: any[] = new Array(maxCol + 1).fill(null);
      let colMatch;
      while ((colMatch = colRegex.exec(rowContent)) !== null) {
        const colTag = colMatch[1];
        const colValue = colMatch[2];
        const idx = parseInt(colTag.substring(1));
        if (idx <= maxCol) {
          rowData[idx] = this.decodeXmlEntities(colValue);
        }
      }
      rows.push(rowData);
    }

    return { headers, rows };
  }

  private decodeXmlEntities(text: string): string {
    return text
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&apos;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
  }
}

export const importService = new ImportService();


