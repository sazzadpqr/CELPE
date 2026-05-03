import { Router } from "express";
import { db } from "@workspace/db";
import { teacherFeedbackRequests } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
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

// ─── STUDENT: List own requests ───────────────────────────────────────────────

router.get("/student/feedback-requests", async (req, res) => {
  const deviceToken = req.query["deviceToken"] as string | undefined;
  if (!deviceToken) { res.status(400).json({ error: "deviceToken required" }); return; }
  try {
    const rows = await db
      .select()
      .from(teacherFeedbackRequests)
      .where(eq(teacherFeedbackRequests.deviceToken, deviceToken))
      .orderBy(desc(teacherFeedbackRequests.createdAt));
    res.json(rows);
  } catch { res.status(500).json({ error: "Database error" }); }
});

// ─── STUDENT: Submit request ───────────────────────────────────────────────────

router.post("/student/feedback-requests", async (req, res) => {
  const { deviceToken, studentName, content, requestType } = req.body;
  if (!deviceToken || !content) { res.status(400).json({ error: "deviceToken e content obrigatórios" }); return; }
  try {
    const [row] = await db.insert(teacherFeedbackRequests).values({
      deviceToken,
      studentName: studentName ?? "Estudante",
      content,
      requestType: requestType ?? "escrita",
    }).returning();
    res.status(201).json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

// ─── ADMIN: List all requests ─────────────────────────────────────────────────

router.get("/admin/feedback-requests", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const rows = await db
      .select()
      .from(teacherFeedbackRequests)
      .orderBy(desc(teacherFeedbackRequests.createdAt));
    res.json(rows);
  } catch { res.status(500).json({ error: "Database error" }); }
});

// ─── ADMIN: Respond to a request ─────────────────────────────────────────────

router.put("/admin/feedback-requests/:id/respond", async (req, res) => {
  if (!checkAuth(req, res)) return;
  const { teacherResponse, status } = req.body;
  try {
    const [row] = await db
      .update(teacherFeedbackRequests)
      .set({
        teacherResponse: teacherResponse ?? "",
        status: status ?? "reviewed",
        respondedAt: new Date(),
      })
      .where(eq(teacherFeedbackRequests.id, req.params.id!))
      .returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

// ─── ADMIN: Delete a request ──────────────────────────────────────────────────

router.delete("/admin/feedback-requests/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const r = await db
      .delete(teacherFeedbackRequests)
      .where(eq(teacherFeedbackRequests.id, req.params.id!))
      .returning({ id: teacherFeedbackRequests.id });
    if (r.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Database error" }); }
});

export default router;
