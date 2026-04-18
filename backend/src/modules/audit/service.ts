import { prisma } from "@bigwing/db";

export class AuditService {
  async log(params: {
    userId: bigint;
    entityType: string;
    entityId: bigint;
    action: "CREATE" | "UPDATE" | "DELETE";
    changes?: any;
    ipAddress?: string;
  }) {
    await prisma.auditLog.create({ data: params });
  }

  async getByEntity(entityType: string, entityId: bigint) {
    return (
      await prisma.auditLog.findMany({
        where: { entityType, entityId },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          user: { select: { id: true, fullName: true, email: true } },
        },
      })
    ).map((a) => ({
      id: Number(a.id),
      action: a.action,
      changes: a.changes,
      ipAddress: a.ipAddress,
      createdAt: a.createdAt,
      user: {
        id: Number(a.user.id),
        fullName: a.user.fullName,
        email: a.user.email,
      },
    }));
  }
}

export const auditService = new AuditService();
