import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express, { type Express, type Request, type Response } from "express";
import { compareSpecs } from "@apidiff/engine";

const webDist = join(dirname(fileURLToPath(import.meta.url)), "../../web/dist");

export function createApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (_request: Request, response: Response) => {
    response.json({ ok: true, service: "api-diff" });
  });

  app.post("/api/compare", (request: Request, response: Response) => {
    const oldSpec = request.body?.oldSpec;
    const newSpec = request.body?.newSpec;

    if (typeof oldSpec !== "string" || typeof newSpec !== "string") {
      response.status(400).json({
        error: "INVALID_REQUEST",
        message: "Body must be JSON with string fields oldSpec and newSpec."
      });
      return;
    }

    const result = compareSpecs(oldSpec, newSpec);
    if (!result.ok) {
      response.status(400).json(result.error);
      return;
    }

    response.json(result.report);
  });

  if (existsSync(webDist)) {
    app.use(express.static(webDist));
  }

  return app;
}
