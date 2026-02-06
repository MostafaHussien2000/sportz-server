import {Router} from "express"
import {createMatchSchema, listMatchesQuerySchema} from "../validation/matches.js";
import {db} from "../db/db.js";
import {matches} from "../db/schema.js";
import {getMatchStatus} from "../utils/match-status.js";
import {desc} from "drizzle-orm"

const MAX_LIMIT = 100;

export const matchRouter = new Router();

matchRouter.get("/", async (req, res) => {
    const parsed = listMatchesQuerySchema.safeParse(req.params);

    if (!parsed.success) return res.status(400).json({
        error: "Invalid query params.",
        details: JSON.stringify(parsed.error)
    });

    const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT);

    try {
        const data = await db.select().from(matches).orderBy(desc(matches.createdAt)).limit(limit);

        console.log(data)

        res.status(200).json(data)
    } catch (err) {
        console.error(err)
        res.status(500).json({error: "Failed to retrieve tha matches.", details: JSON.stringify(new Error(err))})
    }
})

matchRouter.post("/", async (req, res) => {
    const parsed = createMatchSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({error: "Invalid payload.", details: JSON.stringify(parsed.error)})
    const {data: {startTime, endTime, homeScore, awayScore}} = parsed;
    try {
        const [event] = await db.insert(matches).values({
            ...parsed.data,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            homeScore: homeScore ?? 0,
            awayScore: awayScore ?? 0,
            status: getMatchStatus(startTime, endTime)
        }).returning()
        res.status(201).json({message: "Match created successfully.", data: event})
    } catch (err) {
        console.error(err)
        res.status(500).json({error: "Failed to create the match.", details: JSON.stringify(new Error(err))})
    }
})