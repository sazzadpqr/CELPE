import { Router } from "express";
import { db } from "@workspace/db";
import {
  teacherInviteCodes,
  teacherStudents,
  teacherClasses,
  teachers,
} from "@workspace/db/schema";
import { eq, and, desc, gte } from "drizzle-orm";

const router = Router();

router.post("/student/connect-teacher", async (req, res) => {
  const { code, deviceToken, studentName = "Aluno" } = req.body as {
    code: string;
    deviceToken: string;
    studentName?: string;
  };

  if (!code || !deviceToken) {
    res.status(400).json({ error: "code e deviceToken são obrigatórios" });
    return;
  }

  const normalizedCode = code.trim().toUpperCase();

  const [inviteCode] = await db
    .select()
    .from(teacherInviteCodes)
    .where(eq(teacherInviteCodes.code, normalizedCode))
    .limit(1);

  if (!inviteCode) {
    res.status(404).json({ error: "Código inválido ou não encontrado" });
    return;
  }

  if (!inviteCode.active) {
    res.status(400).json({ error: "Este código está desativado" });
    return;
  }

  if (inviteCode.expiresAt && inviteCode.expiresAt < new Date()) {
    res.status(400).json({ error: "Este código expirou" });
    return;
  }

  if (inviteCode.maxUses !== null && inviteCode.usesCount >= inviteCode.maxUses) {
    res.status(400).json({ error: "Este código já atingiu o limite de usos" });
    return;
  }

  const existingConnection = await db
    .select({ id: teacherStudents.id })
    .from(teacherStudents)
    .where(
      and(
        eq(teacherStudents.teacherId, inviteCode.teacherId),
        eq(teacherStudents.studentDeviceToken, deviceToken),
        eq(teacherStudents.status, "active")
      )
    )
    .limit(1);

  if (existingConnection.length > 0) {
    res.status(409).json({ error: "Você já está conectado a este professor" });
    return;
  }

  const [connection] = await db
    .insert(teacherStudents)
    .values({
      teacherId: inviteCode.teacherId,
      studentDeviceToken: deviceToken,
      studentName,
      inviteCode: normalizedCode,
    })
    .returning();

  await db
    .update(teacherInviteCodes)
    .set({ usesCount: inviteCode.usesCount + 1 })
    .where(eq(teacherInviteCodes.id, inviteCode.id));

  const [teacher] = await db
    .select({ id: teachers.id, name: teachers.name, bio: teachers.bio, specialties: teachers.specialties })
    .from(teachers)
    .where(eq(teachers.id, inviteCode.teacherId))
    .limit(1);

  res.json({
    connection,
    teacher: teacher ?? null,
  });
});

router.delete("/student/disconnect-teacher", async (req, res) => {
  const { deviceToken, connectionId } = req.body as {
    deviceToken: string;
    connectionId: string;
  };

  if (!deviceToken || !connectionId) {
    res.status(400).json({ error: "deviceToken e connectionId são obrigatórios" });
    return;
  }

  await db
    .update(teacherStudents)
    .set({ status: "removed" })
    .where(
      and(
        eq(teacherStudents.id, connectionId),
        eq(teacherStudents.studentDeviceToken, deviceToken)
      )
    );

  res.json({ ok: true });
});

router.get("/student/my-teachers", async (req, res) => {
  const { deviceToken } = req.query as { deviceToken?: string };
  if (!deviceToken) { res.status(400).json({ error: "deviceToken required" }); return; }

  const connections = await db
    .select()
    .from(teacherStudents)
    .where(
      and(
        eq(teacherStudents.studentDeviceToken, deviceToken),
        eq(teacherStudents.status, "active")
      )
    )
    .orderBy(desc(teacherStudents.connectedAt));

  if (connections.length === 0) { res.json([]); return; }

  const result = await Promise.all(
    connections.map(async (conn) => {
      const [teacher] = await db
        .select({ id: teachers.id, name: teachers.name, bio: teachers.bio, specialties: teachers.specialties })
        .from(teachers)
        .where(and(eq(teachers.id, conn.teacherId), eq(teachers.status, "active")))
        .limit(1);

      const now = new Date();
      const classes = await db
        .select()
        .from(teacherClasses)
        .where(
          and(
            eq(teacherClasses.teacherId, conn.teacherId),
            eq(teacherClasses.status, "scheduled")
          )
        )
        .orderBy(teacherClasses.scheduledAt)
        .limit(10);

      const myClasses = classes.filter((c) =>
        c.studentConnectionIds.length === 0 ||
        c.type === "group" ||
        c.studentConnectionIds.includes(conn.id)
      );

      return {
        connection: conn,
        teacher: teacher ?? null,
        upcomingClasses: myClasses.filter((c) =>
          c.scheduledAt && c.scheduledAt >= now
        ),
      };
    })
  );

  res.json(result.filter((r) => r.teacher !== null));
});

export default router;
