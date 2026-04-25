import { prisma } from "@bigwing/db";
import { followupRepository } from "./repository.js";
import { AppError } from "../../middlewares/errorHandler.js";

export class FollowupService {
  async create(leadId: bigint, data: any, createdBy: bigint) {
    // Verify lead exists
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || lead.isDeleted) {
      throw new AppError(404, "LEAD_NOT_FOUND", "Lead not found");
    }

    // Auto-increment seq_no
    const maxSeq = await followupRepository.getMaxSeqNo(leadId);
    const seqNo = maxSeq + 1;

    // Create follow-up and update lead.nextFollowupAt in a transaction
    const [followup] = await prisma.$transaction([
      prisma.leadFollowup.create({
        data: {
          leadId,
          seqNo,
          followupDate: new Date(data.followupDate),
          channel: data.channel,
          remark: data.remark,
          outcome: data.outcome,
          nextActionAt: data.nextActionAt
            ? new Date(data.nextActionAt)
            : undefined,
          createdBy,
        },
        include: {
          creator: { select: { id: true, fullName: true } },
        },
      }),
      prisma.lead.update({
        where: { id: leadId },
        data: {
          nextFollowupAt: data.nextActionAt
            ? new Date(data.nextActionAt)
            : null,
          lastFollowupAt: new Date(data.followupDate),
          updatedBy: createdBy,
        },
      }),
    ]);

    return this.formatFollowup(followup);
  }

  private formatFollowup(f: any) {
    return {
      id: Number(f.id),
      leadId: Number(f.leadId),
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
    };
  }
}

export const followupService = new FollowupService();
