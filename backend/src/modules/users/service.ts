import bcrypt from "bcrypt";
import { prisma } from "@bigwing/db";
import { AppError } from "../../middlewares/errorHandler.js";

const BCRYPT_ROUNDS = 12;

export class UserService {
  async list(page: number, pageSize: number, q?: string) {
    const where = {
      ...(q && {
        OR: [
          { fullName: { contains: q, mode: "insensitive" as const } },
          { username: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { userRoles: { include: { role: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { fullName: "asc" },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: users.map(this.formatUser),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getById(id: bigint) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }

    return this.formatUser(user);
  }

  async create(data: {
    username: string;
    email?: string;
    password: string;
    fullName: string;
    mobile?: string;
    gender?: string;
    role: string;
    branchId?: number;
    isActive?: boolean;
    brandAccess?: string;
  }, createdBy?: bigint) {
    // Check username uniqueness
    const existing = await prisma.user.findUnique({
      where: { username: data.username },
    });
    if (existing) {
      throw new AppError(409, "USERNAME_EXISTS", "A user with this username already exists", "username");
    }

    // Find role
    const role = await prisma.role.findUnique({ where: { name: data.role } });
    if (!role) {
      throw new AppError(400, "INVALID_ROLE", `Role '${data.role}' does not exist`, "role");
    }

    const hashedPassword = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        password: hashedPassword,
        fullName: data.fullName,
        mobile: data.mobile,
        gender: data.gender,
        branchId: data.branchId ? BigInt(data.branchId) : null,
        isActive: data.isActive ?? true,
        brandAccess: data.brandAccess ?? "BOTH",
        createdBy: createdBy,
        userRoles: {
          create: { roleId: role.id },
        },
      },
      include: { userRoles: { include: { role: true } } },
    });

    return this.formatUser(user);
  }

  async update(
    id: bigint,
    data: {
      username?: string;
      email?: string;
      password?: string;
      fullName?: string;
      mobile?: string;
      gender?: string;
      role?: string;
      branchId?: number | null;
      isActive?: boolean;
      brandAccess?: string;
    },
    updatedBy?: bigint
  ) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }

    // If role is changing, update user_role
    if (data.role) {
      const role = await prisma.role.findUnique({ where: { name: data.role } });
      if (!role) {
        throw new AppError(400, "INVALID_ROLE", `Role '${data.role}' does not exist`, "role");
      }

      // Remove existing roles and assign new one
      await prisma.userRole.deleteMany({ where: { userId: id } });
      await prisma.userRole.create({ data: { userId: id, roleId: role.id } });
    }

    const updateData: any = {
      ...(data.username && { username: data.username }),
      ...(data.password && { password: await bcrypt.hash(data.password, BCRYPT_ROUNDS) }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.fullName && { fullName: data.fullName }),
      ...(data.mobile !== undefined && { mobile: data.mobile }),
      ...(data.gender !== undefined && { gender: data.gender }),
      ...(data.branchId !== undefined && { branchId: data.branchId ? BigInt(data.branchId) : null }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.brandAccess !== undefined && { brandAccess: data.brandAccess }),
      updatedBy,
    };

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { userRoles: { include: { role: true } } },
    });

    return this.formatUser(updated);
  }

  async resetPassword(id: bigint, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }

    const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await prisma.user.update({
      where: { id },
      data: { password: hashed },
    });

    // Revoke all refresh tokens
    await prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { message: "Password reset successfully" };
  }

  async delete(id: bigint) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }

    // Delete related user roles and refresh tokens
    await prisma.userRole.deleteMany({ where: { userId: id } });
    await prisma.refreshToken.deleteMany({ where: { userId: id } });
    
    await prisma.user.delete({ where: { id } });
    return { message: "User deleted successfully" };
  }

  // ─── Private ────────────────────────────────────────────────────

  private formatUser(user: any) {
    return {
      id: Number(user.id),
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      mobile: user.mobile,
      gender: user.gender,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      roles: user.userRoles?.map((ur: any) => ur.role.name) ?? [],
      branchId: user.branchId ? Number(user.branchId) : null,
      brandAccess: user.brandAccess ?? "BOTH",
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

export const userService = new UserService();
