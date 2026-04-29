import { prisma } from "@bigwing/db";
import { leadRepository } from "./repository.js";
import { customerService } from "../customers/service.js";
import { customerRepository } from "../customers/repository.js";
import { AppError } from "../../middlewares/errorHandler.js";
import { auditService } from "../audit/service.js";

// Roles that can see all leads
export const ALL_DATA_ROLES = ["SUPER_ADMIN", "ADMIN"];

export function ownDataFilter(user?: any): any {
  if (!user) return { id: -1 }; // Force no results if no user
  
  const roles = (user.roles || []).map((r: string) => r.toUpperCase());
  
  const canSeeAll = roles.some((r: string) => ALL_DATA_ROLES.includes(r));
  if (canSeeAll) return {};

  // For restricted roles (MANAGER, TELE_CALLER, SALES_EXECUTIVE):
  // They should see leads that:
  // 1. Are assigned to them
  // 2. OR were created by them
  // 3. OR are unassigned (only if they are allowed to pick up new leads)
  
  // If the user wants strictly individual data (only assigned or created by them):
  const restrictedRoles = ["MANAGER", "TELE_CALLER", "SALES_EXECUTIVE"];
  const isRestricted = roles.some(r => restrictedRoles.includes(r));

  if (isRestricted) {
    return {
      OR: [
        { createdBy: BigInt(user.userId) },
        { assignedTo: BigInt(user.userId) },
        { assignedTo: null } // Allow seeing unassigned leads to pick them up
      ]
    };
  }
  
  // Default fallback: only assigned to them
  return { assignedTo: BigInt(user.userId) };
}

export class LeadService {
  async create(data: any, createdBy?: bigint) {
    // Resolve customer — inline creation or existing
    let customerId: bigint;

    if (data.customer) {
      const customer = await customerService.create(data.customer, createdBy);
      customerId = BigInt(customer.id);
    } else if (data.customerId) {
      customerId = BigInt(data.customerId);
      const customer = await customerRepository.findById(customerId);
      if (!customer || customer.isDeleted) {
        throw new AppError(
          404,
          "CUSTOMER_NOT_FOUND",
          "Customer not found",
          "customerId"
        );
      }
    } else {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Either customerId or customer object is required"
      );
    }

    const enquiryNo = await this.generateEnquiryNo();

    const lead = await leadRepository.create({
      enquiryNo,
      customer: { connect: { id: customerId } },
      channel: data.channel,
      source: { connect: { id: BigInt(data.sourceId) } },
      enquiryType: { connect: { id: BigInt(data.enquiryTypeId) } },
      ...(data.purchaseType && { purchaseType: data.purchaseType }),
      exchangeFlag: data.exchangeFlag ?? false,
      ...(data.modelId && {
        model: { connect: { id: BigInt(data.modelId) } },
      }),
      ...(data.variantId && {
        variant: { connect: { id: BigInt(data.variantId) } },
      }),
      ...(data.colourId && {
        colour: { connect: { id: BigInt(data.colourId) } },
      }),
      ...(data.assignedTo && {
        assignedUser: { connect: { id: BigInt(data.assignedTo) } },
      }),
      ...(data.interestLevel && { interestLevel: data.interestLevel }),
      testRideFlag: data.testRideFlag ?? false,
      ...(data.nextFollowupAt && {
        nextFollowupAt: new Date(data.nextFollowupAt),
      }),
      enquiryDate: new Date(data.enquiryDate),
      ...(data.remark && { remark: data.remark }),
      ...(data.referredFromBranch && {
        referredFromBranch: data.referredFromBranch,
      }),
      ...(data.executiveName && { executiveName: data.executiveName }),
      // Service enquiry attributes
      ...(data.typeOfService && { typeOfService: data.typeOfService }),
      pickupDropFlag: data.pickupDropFlag ?? false,
      ...(data.expectedServiceDate && {
        expectedServiceDate: new Date(data.expectedServiceDate),
      }),
      createdBy,
    });

    if (createdBy) {
      auditService.log({ userId: createdBy, entityType: "lead", entityId: lead.id, action: "CREATE" });
    }

    return this.formatLead(lead);
  }

  async list(filters: any, user?: any) {
    const {
      page,
      pageSize,
      stage,
      channel,
      interestLevel,
      assignedTo,
      sourceId,
      modelId,
      dateFrom,
      dateTo,
      referredFromBranch,
      q,
    } = filters;

    const where: any = {
      AND: [
        { isDeleted: false },
        ownDataFilter(user),
        ...(stage ? [{ stage }] : []),
        ...(channel ? [{ channel }] : []),
        ...(interestLevel ? [{ interestLevel }] : []),
        ...(assignedTo ? [{ assignedTo: BigInt(assignedTo) }] : []),
        ...(sourceId ? [{ sourceId: BigInt(sourceId) }] : []),
        ...(modelId ? [{ modelId: BigInt(modelId) }] : []),
        ...(referredFromBranch ? [{ referredFromBranch }] : []),
        ...((dateFrom || dateTo) ? [{
          enquiryDate: {
            ...(dateFrom && { gte: new Date(dateFrom) }),
            ...(dateTo && { lte: new Date(dateTo) }),
          },
        }] : []),
        ...(q ? [{
          OR: [
            { enquiryNo: { contains: q, mode: "insensitive" } },
            { customer: { firstName: { contains: q, mode: "insensitive" } } },
            { customer: { lastName: { contains: q, mode: "insensitive" } } },
            { customer: { mobile: { contains: q } } },
          ],
        }] : []),
      ]
    };

    const [leads, total] = await Promise.all([
      leadRepository.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      leadRepository.count(where),
    ]);

    return {
      data: leads.map(this.formatLead),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getById(id: bigint) {
    const lead = await leadRepository.findById(id);
    if (!lead || lead.isDeleted) {
      throw new AppError(404, "LEAD_NOT_FOUND", "Lead not found");
    }
    return this.formatLeadDetail(lead);
  }

  async update(id: bigint, data: any, updatedBy?: bigint) {
    const existing = await leadRepository.findById(id);
    if (!existing || existing.isDeleted) {
      throw new AppError(404, "LEAD_NOT_FOUND", "Lead not found");
    }

    const updateData: any = {
      ...(data.sourceId && {
        source: { connect: { id: BigInt(data.sourceId) } },
      }),
      ...(data.enquiryTypeId && {
        enquiryType: { connect: { id: BigInt(data.enquiryTypeId) } },
      }),
      ...(data.purchaseType !== undefined && {
        purchaseType: data.purchaseType,
      }),
      ...(data.exchangeFlag !== undefined && {
        exchangeFlag: data.exchangeFlag,
      }),
      ...(data.modelId && {
        model: { connect: { id: BigInt(data.modelId) } },
      }),
      ...(data.variantId && {
        variant: { connect: { id: BigInt(data.variantId) } },
      }),
      ...(data.colourId && {
        colour: { connect: { id: BigInt(data.colourId) } },
      }),
      ...(data.assignedTo && {
        assignedUser: { connect: { id: BigInt(data.assignedTo) } },
      }),
      ...(data.interestLevel !== undefined && {
        interestLevel: data.interestLevel,
      }),
      ...(data.testRideFlag !== undefined && {
        testRideFlag: data.testRideFlag,
      }),
      ...(data.nextFollowupAt !== undefined && {
        nextFollowupAt: data.nextFollowupAt
          ? new Date(data.nextFollowupAt)
          : null,
      }),
      ...(data.enquiryDate && { enquiryDate: new Date(data.enquiryDate) }),
      ...(data.remark !== undefined && { remark: data.remark }),
      ...(data.referredFromBranch !== undefined && {
        referredFromBranch: data.referredFromBranch,
      }),
      ...(data.executiveName !== undefined && { executiveName: data.executiveName }),
      ...(data.typeOfService !== undefined && {
        typeOfService: data.typeOfService,
      }),
      ...(data.pickupDropFlag !== undefined && {
        pickupDropFlag: data.pickupDropFlag,
      }),
      ...(data.expectedServiceDate !== undefined && {
        expectedServiceDate: data.expectedServiceDate
          ? new Date(data.expectedServiceDate)
          : null,
      }),
      updatedBy,
      rowVersion: { increment: 1 },
    };

    const lead = await leadRepository.update(id, updateData);

    if (updatedBy) {
      auditService.log({ userId: updatedBy, entityType: "lead", entityId: id, action: "UPDATE", changes: data });
    }

    return this.formatLead(lead);
  }

  async moveStage(
    id: bigint,
    data: { stage: string; closureReasonId?: number; remark?: string },
    changedBy: bigint
  ) {
    const existing = await leadRepository.findById(id);
    if (!existing || existing.isDeleted) {
      throw new AppError(404, "LEAD_NOT_FOUND", "Lead not found");
    }

    if (existing.stage === data.stage) {
      throw new AppError(400, "SAME_STAGE", "Lead is already in this stage");
    }

    const updateData: any = {
      stage: data.stage,
      updatedBy: changedBy,
      rowVersion: { increment: 1 },
    };

    // Terminal stages
    if (data.stage === "DELIVERED_CLOSED" || data.stage === "LOST") {
      updateData.closedAt = new Date();
      if (data.closureReasonId) {
        updateData.closureReason = {
          connect: { id: BigInt(data.closureReasonId) },
        };
      }
    }

    const [lead] = await prisma.$transaction([
      prisma.lead.update({
        where: { id },
        data: updateData,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              mobile: true,
            },
          },
          source: { select: { id: true, name: true } },
          enquiryType: { select: { id: true, name: true } },
          model: { select: { id: true, name: true } },
          variant: { select: { id: true, name: true } },
          colour: { select: { id: true, name: true } },
          assignedUser: { select: { id: true, fullName: true } },
        },
      }),
      prisma.leadStageHistory.create({
        data: {
          leadId: id,
          fromStage: existing.stage,
          toStage: data.stage,
          remark: data.remark,
          changedBy,
        },
      }),
    ]);

    auditService.log({ userId: changedBy, entityType: "lead", entityId: id, action: "UPDATE", changes: { stage: data.stage } });

    return this.formatLead(lead);
  }

  async assign(id: bigint, assignedTo: number, updatedBy: bigint) {
    const existing = await leadRepository.findById(id);
    if (!existing || existing.isDeleted) {
      throw new AppError(404, "LEAD_NOT_FOUND", "Lead not found");
    }

    const updateData: any = {
      updatedBy,
      rowVersion: { increment: 1 },
    };

    if (typeof assignedTo === "number") {
      updateData.assignedUser = { connect: { id: BigInt(assignedTo) } };
    } else if (typeof assignedTo === "string") {
      updateData.executiveName = assignedTo;
      updateData.assignedTo = null; // Clear system user if assigning to executive by name
    }

    const lead = await leadRepository.update(id, updateData);

    auditService.log({ userId: updatedBy, entityType: "lead", entityId: id, action: "UPDATE", changes: { assignedTo } });

    return this.formatLead(lead);
  }

  async getFollowupView(
    view: "today" | "overdue" | "upcoming" | "no-followup",
    filters: any,
    user?: any
  ) {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const { page, pageSize, assignedTo } = filters;

    const where: any = {
      AND: [
        { isDeleted: false },
        { stage: { notIn: ["DELIVERED_CLOSED", "LOST"] } },
        ownDataFilter(user),
        ...(assignedTo ? [{ assignedTo: BigInt(assignedTo) }] : []),
      ]
    };

    const conditions = where.AND as any[];

    switch (view) {
      case "today":
        conditions.push({ nextFollowupAt: { gte: todayStart, lt: todayEnd } });
        break;
      case "overdue":
        conditions.push({ nextFollowupAt: { lt: todayStart } });
        break;
      case "upcoming":
        conditions.push({ nextFollowupAt: { gte: todayEnd } });
        break;
      case "no-followup":
        conditions.push({ nextFollowupAt: null });
        break;
    }

    const [leads, total] = await Promise.all([
      leadRepository.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      leadRepository.count(where),
    ]);

    return {
      data: leads.map(this.formatLead),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async softDelete(id: bigint, deletedBy: bigint) {
    const existing = await leadRepository.findById(id);
    if (!existing || existing.isDeleted) {
      throw new AppError(404, "LEAD_NOT_FOUND", "Lead not found");
    }

    await leadRepository.update(id, {
      isDeleted: true,
      updatedBy: deletedBy,
      rowVersion: { increment: 1 },
    });

    auditService.log({ userId: deletedBy, entityType: "lead", entityId: id, action: "DELETE" });

    return { message: "Lead deleted" };
  }

  // ─── Helpers ──────────────────────────────────────────────────

  private async generateEnquiryNo(): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prefix = `BW-${yearMonth}-`;

    const lastNo = await leadRepository.getLastEnquiryNoForMonth(prefix);
    let seq = 1;
    if (lastNo) {
      const lastSeq = parseInt(lastNo.split("-").pop()!, 10);
      seq = lastSeq + 1;
    }

    return `${prefix}${String(seq).padStart(5, "0")}`;
  }

  private formatLead(l: any) {
    return {
      id: Number(l.id),
      enquiryNo: l.enquiryNo,
      customer: l.customer
        ? {
            id: Number(l.customer.id),
            firstName: l.customer.firstName,
            lastName: l.customer.lastName,
            mobile: l.customer.mobile,
          }
        : undefined,
      channel: l.channel,
      source: l.source?.name,
      enquiryType: l.enquiryType?.name,
      purchaseType: l.purchaseType,
      exchangeFlag: l.exchangeFlag,
      model: l.model?.name,
      variant: l.variant?.name,
      colour: l.colour?.name,
      assignedTo: l.assignedUser
        ? { id: Number(l.assignedUser.id), fullName: l.assignedUser.fullName }
        : null,
      stage: l.stage,
      interestLevel: l.interestLevel,
      testRideFlag: l.testRideFlag,
      nextFollowupAt: l.nextFollowupAt,
      lastFollowupAt: l.lastFollowupAt,
      enquiryDate: l.enquiryDate,
      closedAt: l.closedAt,
      remark: l.remark,
      executiveName: l.executiveName,
      referredFromBranch: l.referredFromBranch,
      typeOfService: l.typeOfService,
      pickupDropFlag: l.pickupDropFlag,
      expectedServiceDate: l.expectedServiceDate,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
    };
  }

  private formatLeadDetail(l: any) {
    return {
      ...this.formatLead(l),
      dmsEnquiryNo: l.dmsEnquiryNo,
      closureReason: l.closureReason?.name,
      customer: l.customer
        ? {
            id: Number(l.customer.id),
            firstName: l.customer.firstName,
            lastName: l.customer.lastName,
            mobile: l.customer.mobile,
            altMobile: l.customer.altMobile,
            email: l.customer.email,
            location: l.customer.location,
            customerType: l.customer.customerType,
          }
        : undefined,
      assignedTo: l.assignedUser
        ? {
            id: Number(l.assignedUser.id),
            fullName: l.assignedUser.fullName,
            email: l.assignedUser.email,
          }
        : null,
      followups:
        l.followups?.map((f: any) => ({
          id: Number(f.id),
          seqNo: f.seqNo,
          followupDate: f.followupDate,
          channel: f.channel,
          remark: f.remark,
          outcome: f.outcome,
          nextActionAt: f.nextActionAt,
          createdBy: f.creator
            ? { id: Number(f.creator.id), fullName: f.creator.fullName }
            : null,
          createdAt: f.createdAt,
        })) ?? [],
      stageHistory:
        l.stageHistory?.map((h: any) => ({
          id: Number(h.id),
          fromStage: h.fromStage,
          toStage: h.toStage,
          remark: h.remark,
          changedBy: Number(h.changedBy),
          changedAt: h.changedAt,
        })) ?? [],
    };
  }
}

export const leadService = new LeadService();
