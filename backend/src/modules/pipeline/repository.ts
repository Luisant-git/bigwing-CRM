import { prisma } from "@bigwing/db";

export class PipelineRepository {
  // ─── Quotation ────────────────────────────────────────────────
  async findQuotationsByLead(leadId: bigint) {
    return prisma.quotation.findMany({
      where: { leadId, isDeleted: false },
      orderBy: { createdAt: "desc" },
    });
  }

  async createQuotation(data: any) {
    return prisma.quotation.create({ data });
  }

  async getLastQuotationNoForMonth(prefix: string) {
    const q = await prisma.quotation.findFirst({
      where: { quotationNo: { startsWith: prefix } },
      orderBy: { quotationNo: "desc" },
      select: { quotationNo: true },
    });
    return q?.quotationNo;
  }

  // ─── Booking ──────────────────────────────────────────────────
  async findBookingsByLead(leadId: bigint) {
    return prisma.booking.findMany({
      where: { leadId, isDeleted: false },
      orderBy: { createdAt: "desc" },
    });
  }

  async createBooking(data: any) {
    return prisma.booking.create({ data });
  }

  async getLastBookingNoForMonth(prefix: string) {
    const b = await prisma.booking.findFirst({
      where: { bookingNo: { startsWith: prefix } },
      orderBy: { bookingNo: "desc" },
      select: { bookingNo: true },
    });
    return b?.bookingNo;
  }

  // ─── Invoice ──────────────────────────────────────────────────
  async findInvoicesByLead(leadId: bigint) {
    return prisma.invoice.findMany({
      where: { leadId, isDeleted: false },
      orderBy: { createdAt: "desc" },
    });
  }

  async createInvoice(data: any) {
    return prisma.invoice.create({ data });
  }

  async getLastInvoiceNoForMonth(prefix: string) {
    const i = await prisma.invoice.findFirst({
      where: { invoiceNo: { startsWith: prefix } },
      orderBy: { invoiceNo: "desc" },
      select: { invoiceNo: true },
    });
    return i?.invoiceNo;
  }

  // ─── Delivery ─────────────────────────────────────────────────
  async findDeliveriesByLead(leadId: bigint) {
    return prisma.delivery.findMany({
      where: { leadId },
      orderBy: { createdAt: "desc" },
    });
  }

  async createDelivery(data: any) {
    return prisma.delivery.create({ data });
  }
}

export const pipelineRepository = new PipelineRepository();
