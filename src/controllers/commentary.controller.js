import { db } from "../db/db.js";
import { commentary } from "../db/schema.js";
import { createCommentarySchema } from "../validation/commentary.js";
import { matchIdParamSchema } from "../validation/matches.js";

export function createCommentaryController({ broadcastCommentaryCreated }) {
  return async function (req, res) {
    const paramsResult = matchIdParamSchema.safeParse(req.params);

    if (!paramsResult.success)
      return res.status(400).json({
        error: "Invalid match ID.",
        details: paramsResult.error.issues,
      });

    const bodyResult = createCommentarySchema.safeParse(req.body);

    if (!bodyResult.success)
      return res.status(400).json({
        error: "Invalid commentary data.",
        details: bodyResult.error.issues,
      });

    try {
      const [event] = await db
        .insert(commentary)
        .values({
          matchId: paramsResult.data.id,
          ...bodyResult.data,
        })
        .returning();

      // Safe broadcast - avoid 500 if broadcast fails
      try {
        broadcastCommentaryCreated?.(paramsResult.data.id, event);
      } catch (broadcastError) {
        console.error("Broadcast failed:", broadcastError);
      }

      return res
        .status(201)
        .json({ message: "Commentary created successfully.", data: event });
    } catch (err) {
      console.error(err);

      const errorMessage = err instanceof Error ? err.message : String(err);

      return res.status(500).json({
        error: "Failed to create commentary.",
        details: errorMessage,
      });
    }
  };
}
