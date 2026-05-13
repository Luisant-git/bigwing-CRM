import { prisma } from "@bigwing/db";
import { brandContext } from "../../middlewares/brand.js";



export class CustomerRepository {
  async findMany(params: {
    where: any;
    skip: number;
    take: number;
  }) {
    const brand = brandContext.getStore() || "BIGWING";
    return prisma.customer.findMany({
      where: { ...params.where, brand },
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: "desc" },
    });
  }

  async count(where: any) {
    const brand = brandContext.getStore() || "BIGWING";
    return prisma.customer.count({ where: { ...where, brand } });
  }

  async findById(id: bigint) {
    const brand = brandContext.getStore() || "BIGWING";
    return prisma.customer.findFirst({
      where: { id, brand },
      include: {
        leads: {
          where: { isDeleted: false, brand },
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
    const brand = brandContext.getStore() || "BIGWING";
    return prisma.customer.findFirst({ where: { mobile, brand } });
  }

  async create(data: any) {
    const brand = brandContext.getStore() || "BIGWING";
    return prisma.customer.create({ data: { ...data, brand } });
  }

  async update(id: bigint, data: any) {
    return prisma.customer.update({ where: { id }, data });
  }
}

export const customerRepository = new CustomerRepository();
