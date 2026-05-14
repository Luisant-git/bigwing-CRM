import { prisma } from "@bigwing/db";
import { brandContext } from "../../middlewares/brand.js";

export class ImportRepository {
  async createBatch(data: {
    fileName: string;
    fileHash: string;
    createdBy: bigint;
    brand?: string;
  }) {
    return prisma.importBatch.create({ data });
  }

  async findBatchById(id: bigint) {
    return prisma.importBatch.findUnique({ where: { id } });
  }

  async findBatchByHash(hash: string) {
    return prisma.importBatch.findFirst({ where: { fileHash: hash } });
  }

  async updateBatch(id: bigint, data: any) {
    return prisma.importBatch.update({ where: { id }, data });
  }

  async findActiveBatch() {
    const brand = brandContext.getStore();
    return prisma.importBatch.findFirst({
      where: { 
        status: { in: ["PENDING", "PROCESSING"] },
        brand 
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async createRowErrors(
    errors: {
      batchId: bigint;
      rowNumber: number;
      column?: string;
      value?: string;
      error: string;
    }[],
    tx?: any
  ) {
    if (errors.length === 0) return;
    const client = tx || prisma;
    // Truncate long strings to fit DB column limits (column=80, value=500, error=500)
    const truncate = (s: string | undefined, n: number) =>
      s ? (s.length > n ? s.slice(0, n) : s) : s;
    const brand = brandContext.getStore();
    const safe = errors.map((e) => ({
      ...e,
      brand,
      column: truncate(e.column, 80),
      value: truncate(e.value, 495),
      error: truncate(e.error, 495) ?? "Unknown error",
    }));
    await client.importRowError.createMany({ data: safe });
  }

  async getRowErrors(batchId: bigint) {
    return prisma.importRowError.findMany({
      where: { batchId },
      orderBy: { rowNumber: "asc" },
    });
  }

  // ─── Master data lookups (cached per import run) ──────────────

  async getSourceMap(): Promise<Map<string, bigint>> {
    const sources = await prisma.enquirySource.findMany();
    const map = new Map<string, bigint>();
    for (const s of sources) map.set(s.name.toLowerCase(), s.id);
    return map;
  }

  async getEnquiryTypeMap(): Promise<Map<string, bigint>> {
    const types = await prisma.enquiryTypeLookup.findMany();
    const map = new Map<string, bigint>();
    for (const t of types) map.set(t.name.toLowerCase(), t.id);
    return map;
  }

  async getModelMap(): Promise<Map<string, bigint>> {
    const models = await prisma.vehicleModel.findMany();
    const map = new Map<string, bigint>();
    for (const m of models) map.set(m.name.toLowerCase(), m.id);
    return map;
  }

  async getVariantMap(): Promise<Map<string, { id: bigint; modelId: bigint }>> {
    const variants = await prisma.vehicleVariant.findMany();
    const map = new Map<string, { id: bigint; modelId: bigint }>();
    for (const v of variants)
      map.set(`${v.modelId}:${v.name.toLowerCase()}`, {
        id: v.id,
        modelId: v.modelId,
      });
    return map;
  }

  async getColourMap(): Promise<Map<string, bigint>> {
    const colours = await prisma.vehicleColour.findMany();
    const map = new Map<string, bigint>();
    for (const c of colours) map.set(c.name.toLowerCase(), c.id);
    return map;
  }

  async getUserMap(): Promise<Map<string, bigint>> {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true },
    });
    const map = new Map<string, bigint>();
    for (const u of users)
      map.set(u.fullName.toLowerCase().replace(/\.+$/, "").trim(), u.id);
    return map;
  }

  async findCustomerByMobile(mobile: string) {
    const brand = brandContext.getStore();
    return prisma.customer.findFirst({ where: { mobile, brand } });
  }

  async findLeadByEnquiryNo(enquiryNo: string) {
    const brand = brandContext.getStore();
    return prisma.lead.findFirst({ where: { enquiryNo, brand } });
  }
}

export const importRepository = new ImportRepository();
