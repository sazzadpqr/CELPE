import { Router, type Request, type Response, type NextFunction } from "express";
import crypto from "crypto";
import { db } from "@workspace/db";
import {
  teachers,
  teacherInviteCodes,
  teacherStudents,
  teacherClasses,
} from "@workspace/db/schema";
import { eq, and, desc, count } from "drizzle-orm";

const router = Router();

function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, key) => {
      if (err) reject(err);
      else resolve(`${salt}:${key.toString("hex")}`);
    });
  });
}

function verifyPassword(password: string, stored: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, key] = stored.split(":");
    if (!salt || !key) { resolve(false); return; }
    crypto.scrypt(password, salt, 64, (err, derived) => {
      if (err) reject(err);
      else resolve(derived.toString("hex") === key);
    });
  });
}

function generateCode(len = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = crypto.randomBytes(len);
  for (let i = 0; i < len; i++) {
    code += chars[bytes[i]! % chars.length];
  }
  return code;
}

async function requireTeacher(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return; }
  const token = auth.slice(7);

  const [teacher] = await db
    .select()
    .from(teachers)
    .where(eq(teachers.sessionToken, token))
    .limit(1);

  if (!teacher || !teacher.sessionExpiresAt || teacher.sessionExpiresAt < new Date()) {
    res.status(401).json({ error: "Session expired" });
    return;
  }

  if (teacher.status !== "active") {
    res.status(403).json({ error: "Conta suspensa" });
    return;
  }

  (req as Request & { teacher: typeof teacher }).teacher = teacher;
  next();
}

router.post("/teacher/register", async (req, res) => {
  const { name, email, password } = req.body as {
    name: string;
    email: string;
    password: string;
  };
  if (!name || !email || !password) {
    res.status(400).json({ error: "name, email e password são obrigatórios" });
    return;
  }

  const existing = await db
    .select({ id: teachers.id })
    .from(teachers)
    .where(eq(teachers.email, email))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "E-mail já cadastrado" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const sessionToken = crypto.randomUUID();
  const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const [teacher] = await db
    .insert(teachers)
    .values({ name, email, passwordHash, sessionToken, sessionExpiresAt })
    .returning({
      id: teachers.id,
      name: teachers.name,
      email: teachers.email,
      status: teachers.status,
    });

  res.json({ teacher, token: sessionToken });
});

router.post("/teacher/login", async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) {
    res.status(400).json({ error: "email e password são obrigatórios" });
    return;
  }

  const [teacher] = await db
    .select()
    .from(teachers)
    .where(eq(teachers.email, email))
    .limit(1);

  if (!teacher) { res.status(401).json({ error: "Credenciais inválidas" }); return; }

  const valid = await verifyPassword(password, teacher.passwordHash);
  if (!valid) { res.status(401).json({ error: "Credenciais inválidas" }); return; }

  if (teacher.status !== "active") {
    res.status(403).json({ error: "Conta suspensa" });
    return;
  }

  const sessionToken = crypto.randomUUID();
  const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db
    .update(teachers)
    .set({ sessionToken, sessionExpiresAt, updatedAt: new Date() })
    .where(eq(teachers.id, teacher.id));

  res.json({
    token: sessionToken,
    teacher: {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      bio: teacher.bio,
      specialties: teacher.specialties,
      status: teacher.status,
    },
  });
});

router.get("/teacher/me", requireTeacher, (req, res) => {
  const teacher = (req as Request & { teacher: typeof teachers.$inferSelect }).teacher;
  res.json({
    id: teacher.id,
    name: teacher.name,
    email: teacher.email,
    bio: teacher.bio,
    specialties: teacher.specialties,
    status: teacher.status,
  });
});

router.get("/teacher/dashboard", requireTeacher, async (req, res) => {
  const teacher = (req as Request & { teacher: typeof teachers.$inferSelect }).teacher;

  const [studentCount] = await db
    .select({ cnt: count() })
    .from(teacherStudents)
    .where(and(eq(teacherStudents.teacherId, teacher.id), eq(teacherStudents.status, "active")));

  const [classCount] = await db
    .select({ cnt: count() })
    .from(teacherClasses)
    .where(and(eq(teacherClasses.teacherId, teacher.id), eq(teacherClasses.status, "scheduled")));

  const [codeCount] = await db
    .select({ cnt: count() })
    .from(teacherInviteCodes)
    .where(and(eq(teacherInviteCodes.teacherId, teacher.id), eq(teacherInviteCodes.active, true)));

  const recentStudents = await db
    .select()
    .from(teacherStudents)
    .where(eq(teacherStudents.teacherId, teacher.id))
    .orderBy(desc(teacherStudents.connectedAt))
    .limit(5);

  const upcomingClasses = await db
    .select()
    .from(teacherClasses)
    .where(and(eq(teacherClasses.teacherId, teacher.id), eq(teacherClasses.status, "scheduled")))
    .orderBy(teacherClasses.scheduledAt)
    .limit(5);

  res.json({
    stats: {
      students: Number(studentCount?.cnt ?? 0),
      upcomingClasses: Number(classCount?.cnt ?? 0),
      activeCodes: Number(codeCount?.cnt ?? 0),
    },
    recentStudents,
    upcomingClasses,
  });
});

router.get("/teacher/codes", requireTeacher, async (req, res) => {
  const teacher = (req as Request & { teacher: typeof teachers.$inferSelect }).teacher;
  const codes = await db
    .select()
    .from(teacherInviteCodes)
    .where(eq(teacherInviteCodes.teacherId, teacher.id))
    .orderBy(desc(teacherInviteCodes.createdAt));
  res.json(codes);
});

router.post("/teacher/codes", requireTeacher, async (req, res) => {
  const teacher = (req as Request & { teacher: typeof teachers.$inferSelect }).teacher;
  const { type = "individual", label = "", maxUses, expiresAt } = req.body as {
    type?: string;
    label?: string;
    maxUses?: number;
    expiresAt?: string;
  };

  let code: string;
  let attempts = 0;
  do {
    code = generateCode(type === "group" ? 6 : 8);
    attempts++;
    if (attempts > 10) break;
    const existing = await db
      .select({ id: teacherInviteCodes.id })
      .from(teacherInviteCodes)
      .where(eq(teacherInviteCodes.code, code))
      .limit(1);
    if (existing.length === 0) break;
  } while (true);

  const [newCode] = await db
    .insert(teacherInviteCodes)
    .values({
      teacherId: teacher.id,
      code,
      type,
      label,
      maxUses: maxUses ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    })
    .returning();

  res.json(newCode);
});

router.delete("/teacher/codes/:id", requireTeacher, async (req, res) => {
  const teacher = (req as Request & { teacher: typeof teachers.$inferSelect }).teacher;
  await db
    .delete(teacherInviteCodes)
    .where(
      and(
        eq(teacherInviteCodes.id, req.params.id),
        eq(teacherInviteCodes.teacherId, teacher.id)
      )
    );
  res.json({ ok: true });
});

router.get("/teacher/students", requireTeacher, async (req, res) => {
  const teacher = (req as Request & { teacher: typeof teachers.$inferSelect }).teacher;
  const students = await db
    .select()
    .from(teacherStudents)
    .where(eq(teacherStudents.teacherId, teacher.id))
    .orderBy(desc(teacherStudents.connectedAt));
  res.json(students);
});

router.put("/teacher/students/:id", requireTeacher, async (req, res) => {
  const teacher = (req as Request & { teacher: typeof teachers.$inferSelect }).teacher;
  const { notes, status } = req.body as { notes?: string; status?: string };

  const [updated] = await db
    .update(teacherStudents)
    .set({
      ...(notes !== undefined && { notes }),
      ...(status !== undefined && { status }),
    })
    .where(
      and(
        eq(teacherStudents.id, req.params.id),
        eq(teacherStudents.teacherId, teacher.id)
      )
    )
    .returning();

  res.json(updated);
});

router.delete("/teacher/students/:id", requireTeacher, async (req, res) => {
  const teacher = (req as Request & { teacher: typeof teachers.$inferSelect }).teacher;
  await db
    .delete(teacherStudents)
    .where(
      and(
        eq(teacherStudents.id, req.params.id),
        eq(teacherStudents.teacherId, teacher.id)
      )
    );
  res.json({ ok: true });
});

router.get("/teacher/classes", requireTeacher, async (req, res) => {
  const teacher = (req as Request & { teacher: typeof teachers.$inferSelect }).teacher;
  const classes = await db
    .select()
    .from(teacherClasses)
    .where(eq(teacherClasses.teacherId, teacher.id))
    .orderBy(desc(teacherClasses.scheduledAt));
  res.json(classes);
});

router.post("/teacher/classes", requireTeacher, async (req, res) => {
  const teacher = (req as Request & { teacher: typeof teachers.$inferSelect }).teacher;
  const {
    title, description = "", type = "individual",
    studentConnectionIds = [], scheduledAt, durationMinutes = 60,
    meetingLink = "", notes = "",
  } = req.body as {
    title: string;
    description?: string;
    type?: string;
    studentConnectionIds?: string[];
    scheduledAt?: string;
    durationMinutes?: number;
    meetingLink?: string;
    notes?: string;
  };

  if (!title) { res.status(400).json({ error: "title required" }); return; }

  const [cls] = await db
    .insert(teacherClasses)
    .values({
      teacherId: teacher.id,
      title, description, type,
      studentConnectionIds,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      durationMinutes,
      meetingLink, notes,
    })
    .returning();

  res.json(cls);
});

router.put("/teacher/classes/:id", requireTeacher, async (req, res) => {
  const teacher = (req as Request & { teacher: typeof teachers.$inferSelect }).teacher;
  const {
    title, description, type, studentConnectionIds,
    scheduledAt, durationMinutes, meetingLink, notes, status,
  } = req.body as Partial<{
    title: string; description: string; type: string;
    studentConnectionIds: string[]; scheduledAt: string;
    durationMinutes: number; meetingLink: string; notes: string; status: string;
  }>;

  const [updated] = await db
    .update(teacherClasses)
    .set({
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(type !== undefined && { type }),
      ...(studentConnectionIds !== undefined && { studentConnectionIds }),
      ...(scheduledAt !== undefined && { scheduledAt: new Date(scheduledAt) }),
      ...(durationMinutes !== undefined && { durationMinutes }),
      ...(meetingLink !== undefined && { meetingLink }),
      ...(notes !== undefined && { notes }),
      ...(status !== undefined && { status }),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(teacherClasses.id, req.params.id),
        eq(teacherClasses.teacherId, teacher.id)
      )
    )
    .returning();

  res.json(updated);
});

router.delete("/teacher/classes/:id", requireTeacher, async (req, res) => {
  const teacher = (req as Request & { teacher: typeof teachers.$inferSelect }).teacher;
  await db
    .delete(teacherClasses)
    .where(
      and(
        eq(teacherClasses.id, req.params.id),
        eq(teacherClasses.teacherId, teacher.id)
      )
    );
  res.json({ ok: true });
});

export default router;
