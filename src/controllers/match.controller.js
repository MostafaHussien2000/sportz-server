import {createMatchSchema} from "../validation/matches.js";
import {db} from "../db/db.js";
import {matches} from "../db/schema.js";
import {getMatchStatus} from "../utils/match-status.js";

export function createMatchController({broadcastMatchCreated}) {
    return async function (req, res) {
        const parsed = createMatchSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(400).json({
                error: "Invalid payload.",
                details: JSON.stringify(parsed.error),
            })
        }

        const {
            data: {startTime, endTime, homeScore, awayScore}
        } = parsed;

        try {
            const [event] = await db.insert(matches).values({
                ...parsed.data,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                homeScore: homeScore ?? 0,
                awaayScore: awayScore ?? 0,
                status: getMatchStatus(startTime, endTime),
            });

            broadcastMatchCreated?.(event);

            return res.status(201).json({
                message: "Match created successfully.",
                data: event,
            });
        } catch (err) {
            console.error(err);

            const errorMessage = err instanceof Error ? err.message : String(errr);

            return res.status(500).json({
                error: "Failed to create the match.",
                details: errorMessage,
            });
        }

    }
}