import { customerRepository } from "./repository.js";
import { AppError } from "../../middlewares/errorHandler.js";
import { auditService } from "../audit/service.js";

export class CustomerService {
  async list(page: number, pageSize: number, q?: string) {
    const where: any = {
      isDeleted: false,
      ...(q && {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { mobile: { contains: q } },
        ],
      }),
    };

    const [customers, total] = await Promise.all([
      customerRepository.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      customerRepository.count(where),
    ]);

    return {
      data: customers.map(this.formatCustomer),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getById(id: bigint) {
    const customer = await customerRepository.findById(id);
    if (!customer || customer.isDeleted) {
      throw new AppError(404, "CUSTOMER_NOT_FOUND", "Customer not found");
    }
    return this.formatCustomerDetail(customer);
  }

  async create(data: any, createdBy?: bigint) {
    // Normalize name + mobile
    data.firstName = data.firstName.toUpperCase();
    if (data.lastName) data.lastName = data.lastName.toUpperCase();
    data.mobile = this.normalizeMobile(data.mobile);
    if (data.altMobile) data.altMobile = this.normalizeMobile(data.altMobile);

    // Mobile uniqueness check
    const existing = await customerRepository.findByMobile(data.mobile);
    if (existing && !existing.isDeleted) {
      throw new AppError(
        409,
        "MOBILE_EXISTS",
        "A customer with this mobile number already exists",
        "mobile"
      );
    }

    const customer = await customerRepository.create({
      firstName: data.firstName,
      lastName: data.lastName,
      mobile: data.mobile,
      altMobile: data.altMobile,
      email: data.email,
      ...(data.dob && { dob: new Date(data.dob) }),
      ...(data.anniversary && { anniversary: new Date(data.anniversary) }),
      location: data.location,
      customerType: data.customerType,
      accountType: data.accountType,
      accountName: data.accountName,
      createdBy,
    });

    if (createdBy) {
      auditService.log({ userId: createdBy, entityType: "customer", entityId: customer.id, action: "CREATE" });
    }

    return this.formatCustomer(customer);
  }

  async update(id: bigint, data: any, updatedBy?: bigint) {
    const existing = await customerRepository.findById(id);
    if (!existing || existing.isDeleted) {
      throw new AppError(404, "CUSTOMER_NOT_FOUND", "Customer not found");
    }

    // Normalize if provided
    if (data.firstName) data.firstName = data.firstName.toUpperCase();
    if (data.lastName) data.lastName = data.lastName.toUpperCase();
    if (data.mobile) {
      data.mobile = this.normalizeMobile(data.mobile);
      if (data.mobile !== existing.mobile) {
        const dup = await customerRepository.findByMobile(data.mobile);
        if (dup && !dup.isDeleted && dup.id !== id) {
          throw new AppError(
            409,
            "MOBILE_EXISTS",
            "A customer with this mobile number already exists",
            "mobile"
          );
        }
      }
    }
    if (data.altMobile) data.altMobile = this.normalizeMobile(data.altMobile);

    const updateFields: any = {
      ...(data.firstName !== undefined && { firstName: data.firstName }),
      ...(data.lastName !== undefined && { lastName: data.lastName }),
      ...(data.mobile !== undefined && { mobile: data.mobile }),
      ...(data.altMobile !== undefined && { altMobile: data.altMobile }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.dob !== undefined && { dob: data.dob ? new Date(data.dob) : null }),
      ...(data.anniversary !== undefined && {
        anniversary: data.anniversary ? new Date(data.anniversary) : null,
      }),
      ...(data.location !== undefined && { location: data.location }),
      ...(data.customerType !== undefined && { customerType: data.customerType }),
      ...(data.accountType !== undefined && { accountType: data.accountType }),
      ...(data.accountName !== undefined && { accountName: data.accountName }),
      updatedBy,
      rowVersion: { increment: 1 },
    };

    const customer = await customerRepository.update(id, updateFields);

    if (updatedBy) {
      auditService.log({ userId: updatedBy, entityType: "customer", entityId: id, action: "UPDATE", changes: data });
    }

    return this.formatCustomer(customer);
  }

  async softDelete(id: bigint, deletedBy: bigint) {
    const existing = await customerRepository.findById(id);
    if (!existing || existing.isDeleted) {
      throw new AppError(404, "CUSTOMER_NOT_FOUND", "Customer not found");
    }

    await customerRepository.update(id, {
      isDeleted: true,
      updatedBy: deletedBy,
      rowVersion: { increment: 1 },
    });

    auditService.log({ userId: deletedBy, entityType: "customer", entityId: id, action: "DELETE" });

    return { message: "Customer deleted" };
  }

  // ─── Helpers ──────────────────────────────────────────────────

  normalizeMobile(mobile: string): string {
    return mobile.replace(/^\+?91/, "").slice(-10);
  }

  formatCustomer(c: any) {
    return {
      id: Number(c.id),
      firstName: c.firstName,
      lastName: c.lastName,
      mobile: c.mobile,
      altMobile: c.altMobile,
      email: c.email,
      dob: c.dob,
      anniversary: c.anniversary,
      location: c.location,
      customerType: c.customerType,
      accountType: c.accountType,
      accountName: c.accountName,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  private formatCustomerDetail(c: any) {
    return {
      ...this.formatCustomer(c),
      leads:
        c.leads?.map((l: any) => ({
          id: Number(l.id),
          enquiryNo: l.enquiryNo,
          channel: l.channel,
          stage: l.stage,
          interestLevel: l.interestLevel,
          source: l.source?.name,
          enquiryType: l.enquiryType?.name,
          model: l.model?.name,
          enquiryDate: l.enquiryDate,
          createdAt: l.createdAt,
        })) ?? [],
    };
  }
}

export const customerService = new CustomerService();
