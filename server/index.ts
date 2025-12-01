import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pkg from "pg";
const { Pool } = pkg;
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import http from "http"; 
import path from "path"; 
import fs from "fs"; 
import helmet from "helmet";
import cors from "cors";
import hpp from "hpp";
import { apiLimiter } from "./routes/middlewares/rateLimit";
import { Server as SocketIOServer } from "socket.io";
import { notificationService } from "./services"; 

const app = express();
const server = http.createServer(app); 

const io = new SocketIOServer(server, {
  path: "/api/socket.io",
  addTrailingSlash: false,
  cors: {
    origin: "*", 
    credentials: true
  }
});

io.on("connection", (socket) => {

  socket.on("join", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room ${userId}`);
  });
});

notificationService.setIo(io);

app.set("trust proxy", 1);

if (process.env.NODE_ENV === "production") {
  app.use(helmet());
} else {
  app.use(helmet({ contentSecurityPolicy: false }));
}

app.use(cors({
  origin: process.env.FRONTEND_URL || true, 
  credentials: true, 
}));

app.use(hpp()); 

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/api", apiLimiter);


const PgSession = connectPgSimple(session);
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 40000,
  connectionTimeoutMillis:2000,
});

app.use(
  session({
    store: new PgSession({
      pool,
      tableName: 'session',
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || 'essay-ai-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', 
      sameSite: "lax",
    },
  })
);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {



  let vite;

  if (app.get("env") === "development") {
    vite = await setupVite(app, server); 
  }

  app.get("/health", async (req, res) => {
  try {
    await pool.query('SELECT 1'); 
    
    res.status(200).send("OK");
  } catch (error) {
    console.error("Healthcheck failed:", error);
    res.status(500).send("Unhealthy");
  }
});

  registerRoutes(app);
  
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error(err);
    res.status(status).json({ message });
  });

if (app.get("env") === "development") {
    if (!vite) throw new Error("Vite server não foi inicializado.");

    app.use("*", async (req, res, next) => { 
      const url = req.originalUrl;
      try {
        const clientTemplate = path.resolve(
          import.meta.dirname, 
          "..",                 
          "client",             
          "index.html",
        );
        let template = await fs.promises.readFile(clientTemplate, "utf-8");
        const page = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(page);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    serveStatic(app);
  }

 
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
