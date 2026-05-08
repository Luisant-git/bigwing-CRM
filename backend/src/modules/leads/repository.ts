import { prisma } from "@bigwing/db";

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
    return prisma.lead.findMany({
      where: params.where,
      ...(params.skip !== undefined && { skip: params.skip }),
      ...(params.take !== undefined && { take: params.take }),
      orderBy: { createdAt: "desc" },
      include: listIncludes,
    });
  }

  async count(where: any) {
    return prisma.lead.count({ where });
  }

  async findById(id: bigint) {
    return prisma.lead.findUnique({
      where: { id },
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
    return prisma.lead.create({
      data,
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
    const lead = await prisma.lead.findFirst({
      where: { enquiryNo: { startsWith: prefix } },
      orderBy: { enquiryNo: "desc" },
      select: { enquiryNo: true },
    });
    return lead?.enquiryNo;
  }
}

export const leadRepository = new LeadRepository();
