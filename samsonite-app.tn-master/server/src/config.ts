import dotenv from "dotenv";
dotenv.config();

export interface AdminUser {
    username: string;
    password: string;
}

const loadAdminUsers = (): AdminUser[] => {
    const users: AdminUser[] = [];
    for (let i = 1; i <= 3; i++) {
        const username = process.env[`ADMIN_${i}_USERNAME`];
        const password = process.env[`ADMIN_${i}_PASSWORD`];
        if (username && password) {
            users.push({ username, password });
        }
    }
    return users;
};

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
    adminUsers: loadAdminUsers(),
};
