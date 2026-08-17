import express from "express";
import cors from "cors";
import compression from "compression";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "./config.js";
import authRoutes from "./routes/auth.routes.js";
import catalogRoutes from "./routes/catalog.routes.js";
import productsRoutes from "./routes/products.routes.js";
import { adminOrdersRouter, publicOrdersRouter } from "./routes/orders.routes.js";
import { adminContactRouter, publicContactRouter } from "./routes/contact.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

app.use(cors({ origin: true, credentials: true }));
// Compress responses to reduce payload size and improve load times
app.use(compression());
app.use(express.json({ limit: "25mb" }));
app.use("/images", express.static(path.join(__dirname, "../public/images")));
app.use("/attachments", express.static(path.join(__dirname, "../public/attachments")));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.use("/api/auth", authRoutes);
app.use("/api/catalog", catalogRoutes);
app.use("/api/orders", publicOrdersRouter);
app.use("/api/contact", publicContactRouter);
app.use("/api/admin", productsRoutes);
app.use("/api/admin/orders", adminOrdersRouter);
app.use("/api/admin/contact-messages", adminContactRouter);

// Health check
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const MAX_PORT_RETRY = 5;

const displayStartupInfo = (port: number) => {
    console.log(`\n🚀 Samsonite Admin Server`);
    console.log(`   Port:        ${port}`);
    console.log(`   PrestaShop:  ${config.ps.apiUrl}`);
    console.log(`   Endpoints:`);
    console.log(`     POST /api/auth/login`);
    console.log(`     GET  /api/catalog`);
    console.log(`     GET  /api/catalog/images/products/:productId/:imageId`);
    console.log(`     POST /api/orders`);
    console.log(`     POST /api/contact`);
    console.log(`     GET  /api/admin/products`);
    console.log(`     GET  /api/admin/orders`);
    console.log(`     GET  /api/admin/contact-messages`);
    console.log(`     POST /api/admin/products`);
    console.log(`     PUT  /api/admin/products/:id`);
    console.log(`     DEL  /api/admin/products/:id`);
    console.log(`     GET  /api/admin/categories`);
    console.log();
};

const startServer = (port: number): Promise<void> =>
    new Promise((resolve, reject) => {
        const server = app.listen(port, () => {
            displayStartupInfo(port);
            resolve();
        });

        server.on("error", (err: NodeJS.ErrnoException) => {
            reject(err);
        });
    });

const launchServer = async () => {
    let port = config.port;

    for (let attempt = 0; attempt <= MAX_PORT_RETRY; attempt += 1) {
        try {
            if (attempt > 0) {
                console.warn(`Port ${port - 1} was unavailable. Trying port ${port} instead.`);
            }
            await startServer(port);
            return;
        } catch (err: unknown) {
            const error = err as NodeJS.ErrnoException;
            if (error.code === "EADDRINUSE") {
                port += 1;
                continue;
            }
            console.error("\n❌ Server failed to start:", err);
            process.exit(1);
        }
    }

    console.error(`\n❌ Unable to start server: ports ${config.port}-${config.port + MAX_PORT_RETRY} are all in use.`);
    process.exit(1);
};

launchServer();

export default app;
