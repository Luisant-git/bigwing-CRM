import { prisma } from "@bigwing/db";
import { AppError } from "../../middlewares/errorHandler.js";

export class TaskService {
  async list(userId: bigint, showCompleted = false) {
    const where: any = { assignedTo: userId };
    if (!showCompleted) where.completedAt = null;

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: 100,
    });

    return tasks.map(this.format);
  }

  async getById(id: bigint) {
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
    return this.format(task);
  }

  async create(data: any, createdBy: bigint) {
    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        assignedTo: BigInt(data.assignedTo),
        leadId: data.leadId ? BigInt(data.leadId) : undefined,
        dueAt: data.dueAt ? new Date(data.dueAt) : undefined,
        createdBy,
      },
    });
    return this.format(task);
  }

  async complete(id: bigint) {
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
    if (task.completedAt)
      throw new AppError(400, "ALREADY_COMPLETED", "Task is already completed");

    const updated = await prisma.task.update({
      where: { id },
      data: { completedAt: new Date() },
    });
    return this.format(updated);
  }

  private format(t: any) {
    return {
      id: Number(t.id),
      title: t.title,
      description: t.description,
      assignedTo: Number(t.assignedTo),
      leadId: t.leadId ? Number(t.leadId) : null,
      dueAt: t.dueAt,
      completedAt: t.completedAt,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  }
}

export const taskService = new TaskService();
