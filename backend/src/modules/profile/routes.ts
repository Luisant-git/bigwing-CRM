import { Router } from "express";
import multer from "multer";
import path from "path";
import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "@bigwing/db";
import { authMiddleware } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { AppError } from "../../middlewares/errorHandler.js";

const router = Router();

router.use(authMiddleware);

function formatUser(u: any) {
  return {
    id: Number(u.id),
    email: u.email,
    fullName: u.fullName,
    mobile: u.mobile,
    gender: u.gender,
    avatarUrl: u.avatarUrl,
    isActive: u.isActive,
    lastLogin: u.lastLogin,
    roles: u.userRoles?.map((ur: any) => ur.role.name) ?? [],
    createdAt: u.createdAt,
  };
}

// Multer setup for avatar uploads
const storage = multer.diskStorage({
  destination: "uploads/avatars",
  filename: (req, file, cb) => {
    const ts = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `user-${req.user?.userId}-${ts}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Only JPG, PNG, WEBP allowed"));
  },
});

// GET /me — current user profile
router.get("/me", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(req.user!.userId) },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user) throw new AppError(404, "USER_NOT_FOUND", "User not found");
    res.json({ success: true, data: formatUser(user) });
  } catch (err) { next(err); }
});

// PATCH /me — update own profile (name, mobile, gender)
const updateSchema = z.object({
  fullName: z.string().min(1).max(160).optional(),
  mobile: z.string().regex(/^[6-9]\d{9}$/).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
});

router.patch("/me", validate(updateSchema), async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: BigInt(req.user!.userId) },
      data: req.body,
      include: { userRoles: { include: { role: true } } },
    });
    res.json({ success: true, data: formatUser(user) });
  } catch (err) { next(err); }
});

// POST /me/avatar — upload profile picture
router.post("/me/avatar", upload.single("avatar"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: { code: "NO_FILE", message: "No file uploaded" } });
      return;
    }
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const user = await prisma.user.update({
      where: { id: BigInt(req.user!.userId) },
      data: { avatarUrl },
      include: { userRoles: { include: { role: true } } },
    });
    res.json({ success: true, data: formatUser(user) });
  } catch (err) { next(err); }
});

// POST /me/password — change own password
const passwordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8).max(128),
});

router.post("/me/password", validate(passwordSchema), async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = BigInt(req.user!.userId);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(404, "USER_NOT_FOUND", "User not found");

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw new AppError(400, "INVALID_PASSWORD", "Current password is incorrect", "currentPassword");

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
    res.json({ success: true, data: { message: "Password changed successfully" } });
  } catch (err) { next(err); }
});

export { router as profileRoutes };
