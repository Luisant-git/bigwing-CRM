import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@bigwing/db";
import { env } from "../../config/env.js";
import { AppError } from "../../middlewares/errorHandler.js";
import type { JwtPayload } from "../../middlewares/auth.js";

const BCRYPT_ROUNDS = 12;

export class AuthService {
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user || !user.isActive) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    const accessToken = this.generateAccessToken(user.id, user.email, roles);
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
        email: user.email,
        fullName: user.fullName,
        roles,
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
      storedToken.user.email,
      roles
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

  private generateAccessToken(userId: bigint, email: string, roles: string[]): string {
    const payload = { userId: Number(userId), email, roles };
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as string | number });
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
