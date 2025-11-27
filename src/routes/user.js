const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../prisma");

const router = express.Router();


router.post("/signup", async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password)
        return res.status(400).json({ error: "Name, email, password required" });

    const hash = await bcrypt.hash(password, 10);

    try {
        const user = await prisma.user.create({
            data: { name, email, password: hash, role: role || "NORMAL" }
        });

        res.json({ message: "Signup successful", userId: user.id });
    } catch {
        res.status(400).json({ error: "Email already exists" });
    }
});


router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: "Email and password required" });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Incorrect password" });

    const token = jwt.sign(
        { id: user.id, name: user.name, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );

    res.json({ message: "Login successful", token });
});


router.get("/me", (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Token required" });

    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ user });
    } catch {
        res.status(401).json({ error: "Invalid token" });
    }
});

module.exports = router;
