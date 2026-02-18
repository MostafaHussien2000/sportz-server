import { Router } from "express";
import { createCommentaryController } from "../controllers/commentary.controller.js";
import { listCommentaryQuerySchema } from "../validation/commentary.js";
import { desc, eq } from "drizzle-orm";
import { matchIdParamSchema } from "../validation/matches.js";
import { db } from "../db/db.js";
import { commentary } from "../db/schema.js";

const MAX_LIMIT = 100;

export function createCommentaryRouter({ broadcastCommentaryCreated }) {
  const router = Router({ mergeParams: true });

  router.get("/", async (req, res) => {
    const paramsResult = matchIdParamSchema.safeParse(req.params);

    if (!paramsResult.success)
      return res.status(400).json({
        error: "Invalid match ID.",
        details: paramsResult.error.issues,
      });

    const queryResult = listCommentaryQuerySchema.safeParse(req.query);

    if (!queryResult.success)
      return res.status(400).json({
        error: "Invalid query params.",
        details: JSON.stringify(queryResult.error),
      });

    const limit = Math.min(queryResult.data.limit ?? 50, MAX_LIMIT);

    try {
      const data = await db
        .select()
        .from(commentary)
        .where(eq(commentary.matchId, paramsResult.data.id))
        .orderBy(desc(commentary.createdAt))
        .limit(limit);

      res.status(200).json(data);
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      res.status(500).json({
        error: "Failed to retrieve the commentary.",
        details: errorMessage,
      });
    }
  });

  const createCommentary = createCommentaryController({
    broadcastCommentaryCreated,
  });

  router.post("/", createCommentary);

  return router;
}
