import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { prisma } from "../db/prisma.js";

const router = Router();

const adminUserModel = (prisma as any).adminUser as {
    findUnique: (args: { where: { username: string } }) => Promise<{
        id: number;
        username: string;
        passwordHash: string;
    } | null>;
};

router.post("/login", async (req: Request, res: Response): Promise<void> => {
    const { username, password } = req.body as { username?: string; password?: string };

    if (!username || !password) {
        res.status(400).json({ error: "Nom d'utilisateur et mot de passe requis" });
        return;
    }

    try {
        const user = await adminUserModel.findUnique({ where: { username: username.trim() } });
        if (!user) {
            res.status(401).json({ error: "Identifiants incorrects" });
            return;
        }

        const matched = await bcrypt.compare(password, user.passwordHash);
        if (!matched) {
            res.status(401).json({ error: "Identifiants incorrects" });
            return;
        }

        const token = jwt.sign(
            { username: user.username } as { username: string },
            config.jwt.secret,
            { expiresIn: config.jwt.expiresIn }
        );

        res.json({ token, username: user.username, expiresIn: config.jwt.expiresIn });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

router.get("/me", (req: Request, res: Response): void => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        res.status(401).json({ error: "Non connecté" });
        return;
    }

    try {
        const payload = jwt.verify(header.slice(7), config.jwt.secret) as { username: string };
        res.json({ username: payload.username });
    } catch (e) {
        res.status(401).json({ error: "Token invalide" });
    }
});

export default router;
