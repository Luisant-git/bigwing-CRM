import { prisma } from "@bigwing/db";

export class FollowupRepository {
  async getMaxSeqNo(leadId: bigint): Promise<number> {
    const result = await prisma.leadFollowup.aggregate({
      where: { leadId },
      _max: { seqNo: true },
    });
    return result._max.seqNo ?? 0;
  }

  async create(data: {
    leadId: bigint;
    seqNo: number;
    followupDate: Date;
    channel?: string;
    remark?: string;
    outcome?: string;
    nextActionAt?: Date;
    createdBy: bigint;
  }) {
    return prisma.leadFollowup.create({
      data,
      include: {
        creator: { select: { id: true, fullName: true } },
      },
    });
  }
}

export const followupRepository = new FollowupRepository();
