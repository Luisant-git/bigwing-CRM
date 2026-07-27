import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@bigwing/db";
import { env } from "../../config/env.js";
import { AppError } from "../../middlewares/errorHandler.js";
import type { JwtPayload } from "../../middlewares/auth.js";

const BCRYPT_ROUNDS = 12;

export class AuthService {
  async register(data: {
    username: string;
    email?: string;
    password: string;
    fullName: string;
    role?: string;
  }) {
    const trimmedUsername = data.username.trim();
    // Check username uniqueness
    const existing = await prisma.user.findFirst({ where: { username: { equals: trimmedUsername, mode: 'insensitive' } } });
    if (existing) {
      throw new AppError(409, "USERNAME_EXISTS", "A user with this username already exists");
    }

    data.username = trimmedUsername;

    // Find role (default to VIEWER if not specified)
    const roleName = data.role || "VIEWER";
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      throw new AppError(400, "INVALID_ROLE", `Role '${roleName}' does not exist`);
    }

    const hashedPassword = await bcrypt.hash(data.password.trim(), BCRYPT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        password: hashedPassword,
        fullName: data.fullName,
        isActive: true,
        userRoles: {
          create: { roleId: role.id },
        },
      },
      include: { userRoles: { include: { role: true } } },
    });

    const roles = user.userRoles.map((ur) => ur.role.name);
    const accessToken = this.generateAccessToken(user.id, user.username, roles, user.fullName, user.brandAccess ?? "BOTH");
    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: Number(user.id),
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        roles,
        brandAccess: user.brandAccess ?? "BOTH",
      },
    };
  }

  async login(username: string, password: string) {
    const trimmedUsername = username.trim();
    const user = await prisma.user.findFirst({
      where: { username: { equals: trimmedUsername, mode: 'insensitive' } },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid username or password");
    }

    if (!user.isActive) {
      throw new AppError(401, "ACCOUNT_DEACTIVATED", "Your account is deactivated");
    }

    let validPassword = await bcrypt.compare(password, user.password);
    
    // Fallback: mobile keyboards sometimes add a trailing space. If raw password fails, try trimmed.
    if (!validPassword && password !== password.trim()) {
      validPassword = await bcrypt.compare(password.trim(), user.password);
    }

    if (!validPassword) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid username or password");
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    const accessToken = this.generateAccessToken(user.id, user.username, roles, user.fullName, user.brandAccess ?? "BOTH");
    const refreshToken = await this.generateRefreshToken(user.id);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: Number(user.id),
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        roles,
        brandAccess: user.brandAccess ?? "BOTH",
      },
    };
  }

  async refresh(refreshTokenValue: string) {
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshTokenValue },
      include: {
        user: { include: { userRoles: { include: { role: true } } } },
      },
    });

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
      throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired");
    }

    if (!storedToken.user.isActive) {
      throw new AppError(401, "USER_INACTIVE", "User account is deactivated");
    }

    // Revoke old token and issue new pair
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    const roles = storedToken.user.userRoles.map((ur) => ur.role.name);
    const accessToken = this.generateAccessToken(
      storedToken.user.id,
      storedToken.user.username,
      roles,
      storedToken.user.fullName,
      storedToken.user.brandAccess ?? "BOTH"
    );
    const newRefreshToken = await this.generateRefreshToken(storedToken.user.id);

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshTokenValue: string) {
    await prisma.refreshToken.updateMany({
      where: { token: refreshTokenValue, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    // Always return success to prevent email enumeration
    if (!user) return { message: "If the email exists, a reset link has been sent" };

    // In production: generate a short-lived token, store it, send email
    // For now, log it (to be replaced with email service)
    const resetToken = uuidv4();
    // TODO: Store resetToken with expiry and send via email
    return { message: "If the email exists, a reset link has been sent", _devToken: resetToken };
  }

  async resetPassword(token: string, newPassword: string) {
    // TODO: Look up token from password_reset_tokens table, validate expiry
    // For now, placeholder
    throw new AppError(501, "NOT_IMPLEMENTED", "Password reset via token not yet implemented");
  }

  // ─── Private helpers ────────────────────────────────────────────

  private generateAccessToken(userId: bigint, username: string, roles: string[], fullName: string, brandAccess: string): string {
    const payload = { userId: Number(userId), username, roles, fullName, brandAccess };
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);
  }

  private async generateRefreshToken(userId: bigint): Promise<string> {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7-day refresh

    await prisma.refreshToken.create({
      data: { userId, token, expiresAt },
    });

    return token;
  }
}

export const authService = new AuthService();
