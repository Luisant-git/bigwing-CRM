import { prisma } from "@bigwing/db";

export class NotificationService {
  async list(userId: bigint, unreadOnly = false) {
    const where: any = { userId };
    if (unreadOnly) where.readAt = null;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return notifications.map((n) => ({
      id: Number(n.id),
      type: n.type,
      title: n.title,
      body: n.body,
      readAt: n.readAt,
      createdAt: n.createdAt,
    }));
  }

  async unreadCount(userId: bigint) {
    return prisma.notification.count({
      where: { userId, readAt: null },
    });
  }

  async markRead(id: bigint, userId: bigint) {
    await prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { message: "Marked as read" };
  }

  async markAllRead(userId: bigint) {
    const result = await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { message: `${result.count} notifications marked as read` };
  }

  async create(params: {
    userId: bigint;
    type: string;
    title: string;
    body?: string;
  }) {
    return prisma.notification.create({ data: params });
  }
}

export const notificationService = new NotificationService();
