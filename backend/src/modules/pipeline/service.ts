import { prisma } from "@bigwing/db";
import { pipelineRepository } from "./repository.js";
import { AppError } from "../../middlewares/errorHandler.js";

export class PipelineService {
  // ─── Quotation ────────────────────────────────────────────────

  async getQuotations(leadId: bigint) {
    await this.verifyLead(leadId);
    const quotations = await pipelineRepository.findQuotationsByLead(leadId);
    return quotations.map(this.formatQuotation);
  }

  async createQuotation(leadId: bigint, data: any, createdBy: bigint) {
    const lead = await this.verifyLead(leadId);
    const quotationNo = await this.generateNo("QT");

    const [quotation] = await prisma.$transaction([
      prisma.quotation.create({
        data: {
          leadId,
          quotationNo,
          variantId: BigInt(data.variantId),
          colourId: data.colourId ? BigInt(data.colourId) : null,
          exShowroom: data.exShowroom,
          onRoad: data.onRoad,
          discount: data.discount ?? 0,
          netAmount: data.netAmount,
          validTill: new Date(data.validTill),
          remark: data.remark,
          createdBy,
        },
      }),
      prisma.lead.update({
        where: { id: leadId },
        data: { stage: "QUOTATION_SHARED", updatedBy: createdBy },
      }),
      prisma.leadStageHistory.create({
        data: {
          leadId,
          fromStage: lead.stage,
          toStage: "QUOTATION_SHARED",
          remark: `Quotation ${quotationNo} created`,
          changedBy: createdBy,
        },
      }),
    ]);

    return this.formatQuotation(quotation);
  }

  // ─── Booking ──────────────────────────────────────────────────

  async getBookings(leadId: bigint) {
    await this.verifyLead(leadId);
    const bookings = await pipelineRepository.findBookingsByLead(leadId);
    return bookings.map(this.formatBooking);
  }

  async createBooking(leadId: bigint, data: any, createdBy: bigint) {
    const lead = await this.verifyLead(leadId);
    const bookingNo = await this.generateNo("BK");

    const [booking] = await prisma.$transaction([
      prisma.booking.create({
        data: {
          leadId,
          bookingNo,
          bookingAmount: data.bookingAmount,
          bookingDate: new Date(data.bookingDate),
          remark: data.remark,
          createdBy,
        },
      }),
      prisma.lead.update({
        where: { id: leadId },
        data: { stage: "BOOKED", updatedBy: createdBy },
      }),
      prisma.leadStageHistory.create({
        data: {
          leadId,
          fromStage: lead.stage,
          toStage: "BOOKED",
          remark: `Booking ${bookingNo} created`,
          changedBy: createdBy,
        },
      }),
    ]);

    return this.formatBooking(booking);
  }

  // ─── Invoice ──────────────────────────────────────────────────

  async getInvoices(leadId: bigint) {
    await this.verifyLead(leadId);
    const invoices = await pipelineRepository.findInvoicesByLead(leadId);
    return invoices.map(this.formatInvoice);
  }

  async createInvoice(leadId: bigint, data: any, createdBy: bigint) {
    const lead = await this.verifyLead(leadId);
    const invoiceNo = await this.generateNo("INV");

    const [invoice] = await prisma.$transaction([
      prisma.invoice.create({
        data: {
          leadId,
          invoiceNo,
          invoiceDate: new Date(data.invoiceDate),
          totalAmount: data.totalAmount,
          remark: data.remark,
          createdBy,
        },
      }),
      prisma.lead.update({
        where: { id: leadId },
        data: { stage: "INVOICED", updatedBy: createdBy },
      }),
      prisma.leadStageHistory.create({
        data: {
          leadId,
          fromStage: lead.stage,
          toStage: "INVOICED",
          remark: `Invoice ${invoiceNo} created`,
          changedBy: createdBy,
        },
      }),
    ]);

    return this.formatInvoice(invoice);
  }

  // ─── Delivery ─────────────────────────────────────────────────

  async getDeliveries(leadId: bigint) {
    await this.verifyLead(leadId);
    const deliveries = await pipelineRepository.findDeliveriesByLead(leadId);
    return deliveries.map(this.formatDelivery);
  }

  async createDelivery(leadId: bigint, data: any, createdBy: bigint) {
    const lead = await this.verifyLead(leadId);

    const [delivery] = await prisma.$transaction([
      prisma.delivery.create({
        data: {
          leadId,
          deliveryDate: new Date(data.deliveryDate),
          remark: data.remark,
          createdBy,
        },
      }),
      prisma.lead.update({
        where: { id: leadId },
        data: {
          stage: "DELIVERED_CLOSED",
          closedAt: new Date(),
          updatedBy: createdBy,
        },
      }),
      prisma.leadStageHistory.create({
        data: {
          leadId,
          fromStage: lead.stage,
          toStage: "DELIVERED_CLOSED",
          remark: "Vehicle delivered",
          changedBy: createdBy,
        },
      }),
    ]);

    return this.formatDelivery(delivery);
  }

  // ─── Helpers ──────────────────────────────────────────────────

  private async verifyLead(leadId: bigint) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || lead.isDeleted) {
      throw new AppError(404, "LEAD_NOT_FOUND", "Lead not found");
    }
    return lead;
  }

  private async generateNo(prefix: string): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const fullPrefix = `${prefix}-${yearMonth}-`;

    let lastNo: string | undefined;
    if (prefix === "QT") lastNo = await pipelineRepository.getLastQuotationNoForMonth(fullPrefix);
    if (prefix === "BK") lastNo = await pipelineRepository.getLastBookingNoForMonth(fullPrefix);
    if (prefix === "INV") lastNo = await pipelineRepository.getLastInvoiceNoForMonth(fullPrefix);

    let seq = 1;
    if (lastNo) {
      seq = parseInt(lastNo.split("-").pop()!, 10) + 1;
    }
    return `${fullPrefix}${String(seq).padStart(5, "0")}`;
  }

  private formatQuotation(q: any) {
    return {
      id: Number(q.id),
      leadId: Number(q.leadId),
      quotationNo: q.quotationNo,
      variantId: Number(q.variantId),
      colourId: q.colourId ? Number(q.colourId) : null,
      exShowroom: Number(q.exShowroom),
      onRoad: Number(q.onRoad),
      discount: Number(q.discount),
      netAmount: Number(q.netAmount),
      validTill: q.validTill,
      remark: q.remark,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
    };
  }

  private formatBooking(b: any) {
    return {
      id: Number(b.id),
      leadId: Number(b.leadId),
      bookingNo: b.bookingNo,
      bookingAmount: Number(b.bookingAmount),
      bookingDate: b.bookingDate,
      remark: b.remark,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    };
  }

  private formatInvoice(i: any) {
    return {
      id: Number(i.id),
      leadId: Number(i.leadId),
      invoiceNo: i.invoiceNo,
      invoiceDate: i.invoiceDate,
      totalAmount: Number(i.totalAmount),
      remark: i.remark,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    };
  }

  private formatDelivery(d: any) {
    return {
      id: Number(d.id),
      leadId: Number(d.leadId),
      deliveryDate: d.deliveryDate,
      remark: d.remark,
      createdAt: d.createdAt,
    };
  }
}

export const pipelineService = new PipelineService();
