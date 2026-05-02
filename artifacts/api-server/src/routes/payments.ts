import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../data");

function readData<T>(filename: string, def: T): T {
  const p = path.join(DATA_DIR, filename);
  if (!fs.existsSync(p)) return def;
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
  } catch {
    return def;
  }
}

function writeData(filename: string, data: unknown) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2));
}

interface SubscriptionRecord {
  isPremium: boolean;
  plan: string | null;
  activatedAt: string;
  canceledAt?: string;
}

const PADDLE_API_KEY = process.env.PADDLE_API_KEY;
const PADDLE_MONTHLY_PRICE_ID = process.env.PADDLE_MONTHLY_PRICE_ID;
const PADDLE_YEARLY_PRICE_ID = process.env.PADDLE_YEARLY_PRICE_ID;
const PADDLE_ENV = process.env.PADDLE_ENV ?? "sandbox";
const PADDLE_BASE =
  PADDLE_ENV === "production"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";

const router = Router();

router.post("/payments/checkout", async (req, res) => {
  const { plan, deviceToken } = req.body as {
    plan: "monthly" | "yearly";
    deviceToken: string;
  };

  if (!PADDLE_API_KEY || !PADDLE_MONTHLY_PRICE_ID || !PADDLE_YEARLY_PRICE_ID) {
    res.status(503).json({ error: "Pagamentos não configurados." });
    return;
  }

  const priceId =
    plan === "yearly" ? PADDLE_YEARLY_PRICE_ID : PADDLE_MONTHLY_PRICE_ID;

  try {
    const r = await fetch(`${PADDLE_BASE}/transactions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PADDLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ price_id: priceId, quantity: 1 }],
        custom_data: { deviceToken },
      }),
    });

    const data = (await r.json()) as {
      data?: { checkout?: { url?: string } };
    };
    const url = data.data?.checkout?.url;
    if (!url) throw new Error("No checkout URL from Paddle");
    res.json({ url });
  } catch (e) {
    req.log.error({ err: e }, "Paddle checkout error");
    res.status(500).json({ error: "Erro ao iniciar pagamento" });
  }
});

router.post("/webhooks/paddle", (req, res) => {
  const event = req.body as {
    event_type: string;
    data?: {
      custom_data?: { deviceToken?: string };
      items?: Array<{
        price?: { billing_cycle?: { interval?: string } };
      }>;
    };
  };

  const deviceToken = event.data?.custom_data?.deviceToken;
  const subs = readData<Record<string, SubscriptionRecord>>(
    "subscriptions.json",
    {}
  );

  if (
    event.event_type === "subscription.activated" ||
    event.event_type === "transaction.completed"
  ) {
    if (deviceToken) {
      const interval =
        event.data?.items?.[0]?.price?.billing_cycle?.interval ?? "monthly";
      subs[deviceToken] = {
        isPremium: true,
        plan: interval,
        activatedAt: new Date().toISOString(),
      };
      writeData("subscriptions.json", subs);
    }
  } else if (event.event_type === "subscription.canceled") {
    if (deviceToken && subs[deviceToken]) {
      subs[deviceToken].isPremium = false;
      subs[deviceToken].canceledAt = new Date().toISOString();
      writeData("subscriptions.json", subs);
    }
  }

  res.json({ received: true });
});

router.get("/payments/status", (req, res) => {
  const { token } = req.query as { token?: string };
  if (!token) { res.status(400).json({ error: "token required" }); return; }
  const subs = readData<Record<string, SubscriptionRecord>>(
    "subscriptions.json",
    {}
  );
  const sub = subs[token];
  res.json({ isPremium: sub?.isPremium ?? false, plan: sub?.plan ?? null });
});

export default router;
