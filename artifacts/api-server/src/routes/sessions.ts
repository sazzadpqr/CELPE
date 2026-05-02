import { Router } from "express";
import { randomUUID } from "crypto";

const router = Router();

interface Session {
  id: string;
  taskType: string;
  startTime: number;
  durationSeconds: number;
  submitted: boolean;
}

const sessions = new Map<string, Session>();

setInterval(() => {
  const cutoff = Date.now() - 2 * 3600000;
  for (const [id, s] of sessions) {
    if (s.startTime < cutoff) sessions.delete(id);
  }
}, 600000);

router.post("/sessions", (req, res) => {
  const { taskType = "practice", durationSeconds = 1500 } = req.body as {
    taskType?: string;
    durationSeconds?: number;
  };
  const session: Session = {
    id: randomUUID(),
    taskType,
    startTime: Date.now(),
    durationSeconds,
    submitted: false,
  };
  sessions.set(session.id, session);
  res.json({ sessionId: session.id, startTime: session.startTime, durationSeconds });
});

router.get("/sessions/:id", (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }
  const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
  const remaining = Math.max(0, session.durationSeconds - elapsed);
  res.json({
    sessionId: session.id,
    elapsed,
    remaining,
    isExpired: remaining === 0,
    submitted: session.submitted,
  });
});

router.post("/sessions/:id/submit", (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }
  session.submitted = true;
  const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
  res.json({ sessionId: session.id, elapsed, timeExpired: elapsed >= session.durationSeconds });
});

export default router;
