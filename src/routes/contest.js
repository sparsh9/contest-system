const express = require("express");
const prisma = require("../prisma");
const auth = require("../middleware/auth");

const router = express.Router();

router.post("/", auth(["ADMIN", "VIP"]), async (req, res) => {
    const { title, description, access, startTime, endTime, prize } = req.body;

    if (!title) return res.status(400).json({ error: "Title required" });

    try {
        const contest = await prisma.contest.create({
            data: { title, description, access, startTime, endTime, prize }
        });
        res.json({ message: "Contest created", contest });
    } catch {
        res.status(500).json({ error: "Failed to create contest" });
    }
});

router.post("/question/:contestId", auth(["ADMIN","VIP"]), async (req, res) => {
    const contestId = Number(req.params.contestId);
    const { question, type, options } = req.body;
    // options = [{ text, correct }]

    if (!question || !type || !options?.length)
        return res.status(400).json({ error: "Invalid question format" });

    const contest = await prisma.contest.findUnique({ where: { id: contestId } });
    if (!contest) return res.status(404).json({ error: "Contest not found" });

    try {
        const q = await prisma.question.create({
            data: {
                question,
                type,
                contestId,
                options: {
                    create: options.map(o => ({
                        option: o.text,
                        correct: o.correct || false
                    }))
                }
            }
        });

        res.json({ message: "Question added", q });
    } catch {
        res.status(500).json({ error: "Failed to add question" });
    }
});

router.post("/join/:contestId", auth(["ADMIN","VIP","NORMAL"]), async (req, res) => {
    const contestId = Number(req.params.contestId);
    const user = req.user;

    const contest = await prisma.contest.findUnique({ where: { id: contestId } });
    if (!contest) return res.status(404).json({ error: "Contest not found" });

    if (contest.access === "VIP" && user.role !== "VIP" && user.role !== "ADMIN")
        return res.status(403).json({ error: "VIP contest, access denied" });

    const already = await prisma.participation.findFirst({ where: { userId: user.id, contestId } });
    if (already) return res.status(400).json({ error: "Already joined" });

    const part = await prisma.participation.create({
        data: { userId: user.id, contestId }
    });

    res.json({ message: "Joined", participation: part });
});

router.post("/submit/:participationId", auth(["ADMIN","VIP","NORMAL"]), async (req, res) => {
    const participationId = Number(req.params.participationId);
    const { answers } = req.body; // [{questionId, optionId}]

    const part = await prisma.participation.findUnique({ where: { id: participationId } });
    if (!part) return res.status(404).json({ error: "Participation not found" });

    if (part.status === "SUBMITTED")
        return res.status(400).json({ error: "Already submitted" });

    try {
        await prisma.submittedAnswer.createMany({
            data: answers.map(a => ({
                participationId,
                questionId: a.questionId,
                optionId: a.optionId
            }))
        });

        await prisma.participation.update({
            where: { id: participationId },
            data: { status: "SUBMITTED", submittedAt: new Date() }
        });

        res.json({ message: "Submitted answers" });
    } catch {
        res.status(500).json({ error: "Submit failed" });
    }
});

router.post("/score/:participationId", async (req,res) => {
    const participationId = Number(req.params.participationId);

    try {
        const correct = await prisma.submittedAnswer.count({
            where: { participationId, option: { correct: true } }
        });

        await prisma.participation.update({
            where: { id: participationId },
            data: { score: correct }
        });

        res.json({ participationId, score: correct });
    } catch {
        res.status(500).json({ error: "Score calculation failed" });
    }
});

router.get("/leaderboard/:contestId", async (req,res) => {
    const contestId = Number(req.params.contestId);

    const result = await prisma.participation.findMany({
        where: { contestId, status: "SUBMITTED" },
        include: { user: { select: { name: true } } },
        orderBy: { score: "desc" }
    });

    res.json(result.map((r,i) => ({
        rank: i + 1,
        user: r.user.name,
        score: r.score
    })));
});

router.post("/prize/:contestId", auth(["ADMIN","VIP"]), async (req,res) => {
    const contestId = Number(req.params.contestId);

    const top = await prisma.participation.findFirst({
        where: { contestId, status: "SUBMITTED" },
        orderBy: { score: "desc" },
        include: { contest: true }
    });

    if (!top) return res.status(404).json({ error: "No submissions" });

    await prisma.prizeHistory.create({
        data: { userId: top.userId, contestId, prize: top.contest.prize }
    });

    res.json({ message: "Prize awarded  ", winner: top.userId, prize: top.contest.prize });
});

module.exports = router;
