import { prisma } from "@bigwing/db";
import { brandContext } from "../../middlewares/brand.js";



const listIncludes = {
  customer: { select: { id: true, firstName: true, lastName: true, mobile: true } },
  source: { select: { id: true, name: true } },
  enquiryType: { select: { id: true, name: true } },
  model: { select: { id: true, name: true } },
  variant: { select: { id: true, name: true } },
  colour: { select: { id: true, name: true } },
  assignedUser: { select: { id: true, fullName: true } },
} as const;

export class LeadRepository {
  async findMany(params: { where: any; skip?: number; take?: number }) {
    const brand = brandContext.getStore() || "BIGWING";
    return prisma.lead.findMany({
      where: { ...params.where, brand },
      ...(params.skip !== undefined && { skip: params.skip }),
      ...(params.take !== undefined && { take: params.take }),
      orderBy: { createdAt: "desc" },
      include: listIncludes,
    });
  }

  async count(where: any) {
    const brand = brandContext.getStore() || "BIGWING";
    return prisma.lead.count({ where: { ...where, brand } });
  }

  async findById(id: bigint) {
    const brand = brandContext.getStore() || "BIGWING";
    return prisma.lead.findFirst({
      where: { id, brand },
      include: {
        customer: true,
        source: true,
        enquiryType: true,
        model: true,
        variant: true,
        colour: true,
        closureReason: true,
        assignedUser: { select: { id: true, fullName: true, email: true } },
        followups: {
          orderBy: { seqNo: "desc" },
          include: { creator: { select: { id: true, fullName: true } } },
        },
        stageHistory: {
          orderBy: { changedAt: "desc" },
        },
      },
    });
  }

  async create(data: any) {
    const brand = brandContext.getStore() || "BIGWING";
    return prisma.lead.create({
      data: { ...data, brand },
      include: listIncludes,
    });
  }

  async update(id: bigint, data: any) {
    return prisma.lead.update({
      where: { id },
      data,
      include: listIncludes,
    });
  }

  async getLastEnquiryNoForMonth(prefix: string) {
    const brand = brandContext.getStore() || "BIGWING";
    const lead = await prisma.lead.findFirst({
      where: { enquiryNo: { startsWith: prefix }, brand },
      orderBy: { enquiryNo: "desc" },
      select: { enquiryNo: true },
    });
    return lead?.enquiryNo;
  }
}

export const leadRepository = new LeadRepository();
