import dotenv from "dotenv";
dotenv.config();

export const config = {
    port: parseInt(process.env.PORT || "3001", 10),
    ps: {
        apiUrl: (process.env.PS_API_URL || "").replace(/\/+$/, "").replace(/\/api$/i, ""),
        apiKey: (process.env.PS_API_KEY || "").trim(),
    },
    jwt: {
        secret: process.env.JWT_SECRET || "default-secret-change-me",
        expiresIn: "8h" as const,
    },
};
