import { Router } from "express";
import crypto from "crypto";
import { db } from "@workspace/db";
import {
  teachers,
  teacherStudents,
  teacherClasses,
  teacherInviteCodes,
} from "@workspace/db/schema";
import { eq, count, desc } from "drizzle-orm";
import { getStoredPasswordHash } from "../lib/adminStore.js";

const router = Router();

function checkAuth(req: import("express").Request, res: import("express").Response): boolean {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return false; }
  const token = authHeader.slice(7);
  const storedHash = getStoredPasswordHash();
  const password = storedHash ?? (process.env["SESSION_SECRET"] ?? "admin");
  if (token !== Buffer.from(password).toString("base64")) { res.status(401).json({ error: "Unauthorized" }); return false; }
  return true;
}

function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, key) => {
      if (err) reject(err);
      else resolve(`${salt}:${key.toString("hex")}`);
    });
  });
}

router.get("/admin/teachers", async (req, res) => {
  if (!checkAuth(req, res)) return;

  const rows = await db
    .select({
      id: teachers.id,
      name: teachers.name,
      email: teachers.email,
      bio: teachers.bio,
      specialties: teachers.specialties,
      status: teachers.status,
      createdAt: teachers.createdAt,
    })
    .from(teachers)
    .orderBy(desc(teachers.createdAt));

  const counts = await db
    .select({ teacherId: teacherStudents.teacherId, cnt: count() })
    .from(teacherStudents)
    .groupBy(teacherStudents.teacherId);

  const countMap = Object.fromEntries(counts.map((c) => [c.teacherId, Number(c.cnt)]));

  res.json(rows.map((t) => ({ ...t, studentCount: countMap[t.id] ?? 0 })));
});

router.get("/admin/teachers/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;

  const { id } = req.params;
  const [teacher] = await db
    .select({
      id: teachers.id,
      name: teachers.name,
      email: teachers.email,
      bio: teachers.bio,
      specialties: teachers.specialties,
      status: teachers.status,
      createdAt: teachers.createdAt,
      updatedAt: teachers.updatedAt,
    })
    .from(teachers)
    .where(eq(teachers.id, id))
    .limit(1);

  if (!teacher) { res.status(404).json({ error: "Not found" }); return; }

  const students = await db
    .select()
    .from(teacherStudents)
    .where(eq(teacherStudents.teacherId, id))
    .orderBy(desc(teacherStudents.connectedAt));

  const codes = await db
    .select()
    .from(teacherInviteCodes)
    .where(eq(teacherInviteCodes.teacherId, id))
    .orderBy(desc(teacherInviteCodes.createdAt));

  const classes = await db
    .select()
    .from(teacherClasses)
    .where(eq(teacherClasses.teacherId, id))
    .orderBy(desc(teacherClasses.scheduledAt));

  res.json({ ...teacher, students, codes, classes });
});

router.post("/admin/teachers", async (req, res) => {
  if (!checkAuth(req, res)) return;

  const { name, email, password, bio = "", specialties = [], status = "active" } =
    req.body as {
      name: string;
      email: string;
      password: string;
      bio?: string;
      specialties?: string[];
      status?: string;
    };

  if (!name || !email || !password) {
    res.status(400).json({ error: "name, email and password are required" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const [teacher] = await db
    .insert(teachers)
    .values({ name, email, passwordHash, bio, specialties, status })
    .returning();

  res.json(teacher);
});

router.put("/admin/teachers/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;

  const { id } = req.params;
  const { name, email, password, bio, specialties, status } = req.body as {
    name?: string;
    email?: string;
    password?: string;
    bio?: string;
    specialties?: string[];
    status?: string;
  };

  let passwordHash: string | undefined;
  if (password) passwordHash = await hashPassword(password);

  const [updated] = await db
    .update(teachers)
    .set({
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email }),
      ...(bio !== undefined && { bio }),
      ...(specialties !== undefined && { specialties }),
      ...(status !== undefined && { status }),
      ...(passwordHash !== undefined && { passwordHash }),
      updatedAt: new Date(),
    })
    .where(eq(teachers.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.post("/admin/teachers/:id/reset-password", async (req, res) => {
  if (!checkAuth(req, res)) return;

  const { id } = req.params;
  const { password } = req.body as { password: string };
  if (!password) { res.status(400).json({ error: "password required" }); return; }

  const passwordHash = await hashPassword(password);
  await db
    .update(teachers)
    .set({ passwordHash, sessionToken: null, sessionExpiresAt: null, updatedAt: new Date() })
    .where(eq(teachers.id, id));

  res.json({ ok: true });
});

router.delete("/admin/teachers/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  await db.delete(teachers).where(eq(teachers.id, req.params.id));
  res.json({ ok: true });
});

router.delete("/admin/teacher-students/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  await db.delete(teacherStudents).where(eq(teacherStudents.id, req.params.id));
  res.json({ ok: true });
});

router.post("/admin/teacher-codes", async (req, res) => {
  if (!checkAuth(req, res)) return;

  const { teacherId, type = "individual", label = "", maxUses, expiresAt } = req.body as {
    teacherId: string;
    type?: string;
    label?: string;
    maxUses?: number;
    expiresAt?: string;
  };
  if (!teacherId) { res.status(400).json({ error: "teacherId required" }); return; }

  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < (type === "group" ? 6 : 8); i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  const [newCode] = await db
    .insert(teacherInviteCodes)
    .values({
      teacherId,
      code,
      type,
      label,
      maxUses: maxUses ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    })
    .returning();

  res.json(newCode);
});

router.delete("/admin/teacher-codes/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  await db.delete(teacherInviteCodes).where(eq(teacherInviteCodes.id, req.params.id));
  res.json({ ok: true });
});

export default router;
