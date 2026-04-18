import { prisma } from "@bigwing/db";

export class SearchService {
  async search(q: string, userId?: bigint, roles?: string[]) {
    const isOwn =
      roles &&
      !roles.includes("SUPER_ADMIN") &&
      !roles.includes("ADMIN") &&
      !roles.includes("MANAGER") &&
      !roles.includes("VIEWER");

    const [customers, leads] = await Promise.all([
      prisma.customer.findMany({
        where: {
          isDeleted: false,
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { mobile: { contains: q } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          mobile: true,
          email: true,
        },
      }),
      prisma.lead.findMany({
        where: {
          isDeleted: false,
          ...(isOwn && userId ? { assignedTo: userId } : {}),
          OR: [
            { enquiryNo: { contains: q, mode: "insensitive" } },
            { customer: { firstName: { contains: q, mode: "insensitive" } } },
            { customer: { lastName: { contains: q, mode: "insensitive" } } },
            { customer: { mobile: { contains: q } } },
          ],
        },
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, mobile: true },
          },
          model: { select: { name: true } },
          assignedUser: { select: { id: true, fullName: true } },
        },
      }),
    ]);

    return {
      customers: customers.map((c) => ({
        id: Number(c.id),
        firstName: c.firstName,
        lastName: c.lastName,
        mobile: c.mobile,
        email: c.email,
      })),
      leads: leads.map((l) => ({
        id: Number(l.id),
        enquiryNo: l.enquiryNo,
        customer: l.customer
          ? {
              id: Number(l.customer.id),
              firstName: l.customer.firstName,
              lastName: l.customer.lastName,
              mobile: l.customer.mobile,
            }
          : null,
        model: l.model?.name,
        stage: l.stage,
        assignedTo: l.assignedUser
          ? { id: Number(l.assignedUser.id), fullName: l.assignedUser.fullName }
          : null,
      })),
    };
  }
}

export const searchService = new SearchService();
