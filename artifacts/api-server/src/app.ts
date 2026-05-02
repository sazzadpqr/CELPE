import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { recordRequest } from "./lib/adminStore.js";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const durationMs = Date.now() - start;
    const urlPath = req.url?.split("?")[0] ?? "/";
    recordRequest({
      method: req.method,
      path: urlPath,
      status: res.statusCode,
      durationMs,
      timestamp: new Date().toISOString(),
      isError: res.statusCode >= 400,
    });
  });
  next();
});

app.use("/api", router);

export default app;
