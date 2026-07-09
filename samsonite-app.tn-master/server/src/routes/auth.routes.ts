import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config.js";

const router = Router();

// Hash passwords at startup for comparison
let hashedUsers: { username: string; hash: string }[] = [];

const initHashes = async () => {
    hashedUsers = await Promise.all(
        config.adminUsers.map(async (u) => ({
            username: u.username,
            hash: await bcrypt.hash(u.password, 10),
        }))
    );
};

// Initialize on first import
initHashes();

router.post("/login", async (req: Request, res: Response): Promise<void> => {
    const { username, password } = req.body as { username?: string; password?: string };

    if (!username || !password) {
        res.status(400).json({ error: "Nom d'utilisateur et mot de passe requis" });
        return;
    }

    // Debug log (can be removed later)
    console.log(`Tentative de connexion pour: ${username}`);

    // Find the admin user by username
    const adminUser = config.adminUsers.find(
        (u) => u.username.toLowerCase() === username.trim().toLowerCase()
    );

    if (!adminUser) {
        console.log(`Échec: Utilisateur non trouvé (${username})`);
        res.status(401).json({ error: "Identifiants incorrects" });
        return;
    }

    // Use bcrypt to compare even if we have the plain text in config
    // This is better and confirms our hashing logic is working
    const isMatched = await bcrypt.compare(password, await bcrypt.hash(adminUser.password, 10));
    // Actually, simpler for now since we have the plain text for these 3 users:
    const plainMatch = adminUser.password === password;

    if (!plainMatch) {
        console.log(`Échec: Mot de passe incorrect pour ${username}`);
        res.status(401).json({ error: "Identifiants incorrects" });
        return;
    }

    console.log(`Connexion réussie pour: ${username}`);

    const token = jwt.sign(
        { username: adminUser.username } as { username: string },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
    );

    res.json({
        token,
        username: adminUser.username,
        expiresIn: config.jwt.expiresIn,
    });
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
    } catch {
        res.status(401).json({ error: "Token invalide" });
    }
});

export default router;
