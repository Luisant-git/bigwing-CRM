import { Request, Response, NextFunction } from "express";
import { lookupService } from "./service.js";
import xlsx from "xlsx";
import { AppError } from "../../middlewares/errorHandler.js";

export class LookupController {
  async getItems(req: Request, res: Response, next: NextFunction) {
    try {
      const name = req.params.name as string;

      if (!lookupService.isValidLookup(name)) {
        res.status(404).json({
          success: false,
          error: {
            code: "INVALID_LOOKUP",
            message: `Unknown lookup: ${name}`,
          },
        });
        return;
      }

      const modelId = req.query.modelId ? Number(req.query.modelId) : undefined;
      const includeInactive = req.query.includeInactive === "true";
      const items = await lookupService.getItems(name, modelId, includeInactive);
      res.json({ success: true, data: items });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const name = req.params.name as string;
      if (!lookupService.isValidLookup(name)) {
        res.status(404).json({ success: false, error: { code: "INVALID_LOOKUP", message: `Unknown lookup: ${name}` } });
        return;
      }
      const item = await lookupService.create(name, req.body);
      res.status(201).json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const name = req.params.name as string;
      const id = req.params.id as string;
      if (!lookupService.isValidLookup(name)) {
        res.status(404).json({ success: false, error: { code: "INVALID_LOOKUP", message: `Unknown lookup: ${name}` } });
        return;
      }
      const item = await lookupService.update(name, BigInt(id), req.body);
      res.json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const name = req.params.name as string;
      const id = req.params.id as string;
      if (!lookupService.isValidLookup(name)) {
        res.status(404).json({ success: false, error: { code: "INVALID_LOOKUP", message: `Unknown lookup: ${name}` } });
        return;
      }
      await lookupService.delete(name, BigInt(id));
      res.json({ success: true, data: { success: true } });
    } catch (err) {
      next(err);
    }
  }

  async exportExcel(req: Request, res: Response, next: NextFunction) {
    try {
      const name = req.params.name as string;
      if (!lookupService.isValidLookup(name)) {
        res.status(404).json({ success: false, error: { code: "INVALID_LOOKUP", message: `Unknown lookup: ${name}` } });
        return;
      }
      const items = await lookupService.getItems(name, undefined, true);
      
      const ws = xlsx.utils.json_to_sheet(items.length > 0 ? items : [{ id: "", name: "" }]);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, name.substring(0, 31));
      const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=${name}.xlsx`);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  }

  async importExcel(req: Request, res: Response, next: NextFunction) {
    try {
      const name = req.params.name as string;
      if (!lookupService.isValidLookup(name)) {
        res.status(404).json({ success: false, error: { code: "INVALID_LOOKUP", message: `Unknown lookup: ${name}` } });
        return;
      }
      if (!req.file) {
        throw new AppError(400, "NO_FILE", "Please upload a file");
      }

      const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

      let imported = 0;
      let errors = 0;
      for (const row of data as any[]) {
        try {
          if (row.id) {
            await lookupService.update(name, BigInt(row.id), row);
            imported++;
          } else {
            await lookupService.create(name, row);
            imported++;
          }
        } catch (err) {
          console.warn(`Failed to import row for ${name}:`, err);
          errors++;
        }
      }

      res.json({ success: true, data: { imported, errors } });
    } catch (err) {
      next(err);
    }
  }
}

export const lookupController = new LookupController();
