import { Request, Response, NextFunction } from "express";
import { importService } from "./service.js";

export class ImportController {
  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: { code: "NO_FILE", message: "No file uploaded" },
        });
        return;
      }

      const createdBy = BigInt(req.user!.userId);
      const result = await importService.upload(
        req.file.path,
        req.file.filename,
        createdBy
      );
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async preview(req: Request, res: Response, next: NextFunction) {
    try {
      const batchId = BigInt(req.params.id);
      const sheetName = req.query.sheet as string | undefined;
      const result = await importService.preview(batchId, sheetName);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async commit(req: Request, res: Response, next: NextFunction) {
    try {
      const batchId = BigInt(req.params.id);
      const sheetName = req.query.sheet as string | undefined;
      const channel = req.query.channel as string | undefined;
      const result = await importService.commit(batchId, sheetName, channel);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async downloadErrors(req: Request, res: Response, next: NextFunction) {
    try {
      const batchId = BigInt(req.params.id);
      const buffer = await importService.getErrors(batchId);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="import-errors-${req.params.id}.xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  }
}

export const importController = new ImportController();
