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

    // Follow-up gap logic
    let nextActionAt = data.nextActionAt ? new Date(data.nextActionAt) : null;
    if (!nextActionAt && !data.outcome) { // Only auto-set if not provided and not a special outcome like RNR
      const now = new Date();
      if (seqNo === 1) nextActionAt = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000); // F1: 1 Day
      else if (seqNo === 2) nextActionAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // F2: 3 Days
      else if (seqNo === 3) nextActionAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // F3: 7 Days
      else if (seqNo === 4) nextActionAt = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000); // F4: 15 Days
      else if (seqNo === 5) nextActionAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // F5: 30 Days
    }

    // Create follow-up and update lead in a transaction
    const [followup] = await prisma.$transaction([
      prisma.leadFollowup.create({
        data: {
          leadId,
          seqNo,
          followupDate: new Date(data.followupDate),
          channel: data.channel,
          remark: data.remark,
          outcome: data.outcome,
          nextActionAt: nextActionAt,
          createdBy,
        },
        include: {
          creator: { select: { id: true, fullName: true } },
        },
      }),
      prisma.lead.update({
        where: { id: leadId },
        data: {
          nextFollowupAt: nextActionAt,
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
