import { prisma } from "@bigwing/db";

export class CustomerRepository {
  async findMany(params: {
    where: any;
    skip: number;
    take: number;
  }) {
    return prisma.customer.findMany({
      where: params.where,
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: "desc" },
    });
  }

  async count(where: any) {
    return prisma.customer.count({ where });
  }

  async findById(id: bigint) {
    return prisma.customer.findUnique({
      where: { id },
      include: {
        leads: {
          where: { isDeleted: false },
          orderBy: { createdAt: "desc" },
          include: {
            source: true,
            enquiryType: true,
            model: true,
          },
        },
      },
    });
  }

  async findByMobile(mobile: string) {
    return prisma.customer.findUnique({ where: { mobile } });
  }

  async create(data: any) {
    return prisma.customer.create({ data });
  }

  async update(id: bigint, data: any) {
    return prisma.customer.update({ where: { id }, data });
  }
}

export const customerRepository = new CustomerRepository();
