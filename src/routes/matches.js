import { Router } from "express";
import {
  createMatchSchema,
  listMatchesQuerySchema,
} from "../validation/matches.js";
import { db } from "../db/db.js";
import { matches } from "../db/schema.js";
import { getMatchStatus } from "../utils/match-status.js";
import { desc } from "drizzle-orm";
import { createMatchController } from "../controllers/match.controller.js";

const MAX_LIMIT = 100;

// Export a factory function that accepts dependencies
export function createMatchRouter({ broadcastMatchCreated }) {
  const router = new Router();

  router.get("/", async (req, res) => {
    const parsed = listMatchesQuerySchema.safeParse(req.query);

    if (!parsed.success)
      return res.status(400).json({
        error: "Invalid query params.",
        details: JSON.stringify(parsed.error),
      });

    const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT);

    try {
      const data = await db
        .select()
        .from(matches)
        .orderBy(desc(matches.createdAt))
        .limit(limit);

      res.status(200).json(data);
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      res
        .status(500)
        .json({
          error: "Failed to retrieve the matches.",
          details: errorMessage,
        });
    }
  });

  // Pass the dependency to the controller
  const createMatch = createMatchController({
    broadcastMatchCreated,
  });

  router.post("/", createMatch);

  return router;
}
