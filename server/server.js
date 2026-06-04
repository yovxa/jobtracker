import "dotenv/config";
import { createServer } from "node:http";
import { randomBytes, pbkdf2Sync, timingSafeEqual, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import jwt from "jsonwebtoken";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "data");
const DB_FILE = join(DATA_DIR, "db.json");

const PORT = Number(process.env.PORT);
const SESSION_COOKIE = process.env.SESSION_COOKIE;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN;
const SESSION_MAX_AGE = Number(process.env.SESSION_MAX_AGE);
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing in .env");
}

const STATUS_ORDER = ["applied", "interview", "offer", "rejected"];

const json = (res, status, body, headers = {}) => {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": CLIENT_ORIGIN,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    ...headers,
  });

  res.end(JSON.stringify(body));
};

const cookieOptions = [
  "HttpOnly",
  "Path=/",
  process.env.NODE_ENV === "production"
    ? "SameSite=None; Secure"
    : "SameSite=Lax",
  `Max-Age=${SESSION_MAX_AGE}`,
].join("; ");

const clearCookieOptions = [
  "HttpOnly",
  "Path=/",
  "SameSite=Lax",
  "Max-Age=0",
].join("; ");

const parseCookies = (req) =>
  Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        const key = index === -1 ? part : part.slice(0, index);
        const value = index === -1 ? "" : part.slice(index + 1);
        return [key, decodeURIComponent(value)];
      })
  );

const readBody = async (req) => {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) return {};

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Invalid JSON body");
    error.status = 400;
    throw error;
  }
};

const ensureDb = async () => {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    const db = JSON.parse(await readFile(DB_FILE, "utf8"));

    return {
      users: db.users || [],
      applications: db.applications || [],
    };
  } catch {
    const fresh = {
      users: [],
      applications: [],
    };

    await writeFile(DB_FILE, JSON.stringify(fresh, null, 2));
    return fresh;
  }
};

const saveDb = async (db) => {
  await writeFile(DB_FILE, JSON.stringify(db, null, 2));
};

const normalizeEmail = (email = "") => email.trim().toLowerCase();

const hashPassword = (password, salt = randomBytes(16).toString("hex")) => ({
  salt,
  hash: pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex"),
});

const verifyPassword = (password, salt, expectedHash) => {
  const { hash } = hashPassword(password, salt);
  const left = Buffer.from(hash, "hex");
  const right = Buffer.from(expectedHash, "hex");

  return left.length === right.length && timingSafeEqual(left, right);
};

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
});

const createJwt = (user) =>
  jwt.sign(
    {
      userId: user.id,
    },
    JWT_SECRET,
    {
      expiresIn: SESSION_MAX_AGE,
    }
  );

const requireUser = async (req, res) => {
  const token = parseCookies(req)[SESSION_COOKIE];

  if (!token) {
    const error = new Error("Missing auth token");
    error.status = 401;
    throw error;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    const db = await ensureDb();
    const user = db.users.find(
      (item) => item.id === payload.userId
    );

    if (!user) {
      const error = new Error("Invalid auth token");
      error.status = 401;
      throw error;
    }

    const newToken = createJwt(user);

    res.setHeader(
      "Set-Cookie",
      `${SESSION_COOKIE}=${encodeURIComponent(
        newToken
      )}; ${cookieOptions}`
    );

    return { db, user };
  } catch {
    const error = new Error("Invalid auth token");
    error.status = 401;
    throw error;
  }
};

const sanitizeApplication = (input, userId, existing = {}) => {
  const now = new Date().toISOString();

  const status = STATUS_ORDER.includes(input.status)
    ? input.status
    : existing.status || "applied";

  const dateValue =
    input.appliedDate === undefined
      ? existing.appliedDate || now
      : input.appliedDate;

  const parsedDate = new Date(dateValue);

  if (Number.isNaN(parsedDate.getTime())) {
    const error = new Error("Applied date is invalid");
    error.status = 400;
    throw error;
  }

  const field = (name) =>
    input[name] === undefined
      ? String(existing[name] || "").trim()
      : String(input[name] || "").trim();

  return {
    ...existing,
    userId,
    company: field("company"),
    position: field("position"),
    salary: field("salary"),
    location: field("location"),
    notes: field("notes"),
    status,
    appliedDate: parsedDate.toISOString(),
    updatedAt: now,
  };
};

const validateApplication = (app) => {
  if (!app.company || !app.position) {
    const error = new Error("Company and role are required");
    error.status = 400;
    throw error;
  }
};

const sendAuthPayload = async (res, db, user) => {
  const token = createJwt(user);

  await saveDb(db);

  json(
    res,
    200,
    { user: publicUser(user) },
    {
      "Set-Cookie": `${SESSION_COOKIE}=${encodeURIComponent(token)}; ${cookieOptions}`,
    }
  );
};

const routes = {
  "POST /api/auth/register": async (req, res) => {
    const body = await readBody(req);

    const name = String(body.name || "").trim();
    const email = normalizeEmail(body.email);
    const password = String(body.password || "");

    if (!name || !email || password.length < 6) {
      return json(res, 400, {
        message: "Name, valid email, and 6+ character password are required",
      });
    }

    const db = await ensureDb();

    if (db.users.some((user) => user.email === email)) {
      return json(res, 409, {
        message: "An account already exists for this email",
      });
    }

    const passwordHash = hashPassword(password);
    const now = new Date().toISOString();

    const user = {
      id: randomUUID(),
      name,
      email,
      passwordHash: passwordHash.hash,
      passwordSalt: passwordHash.salt,
      createdAt: now,
      updatedAt: now,
    };

    db.users.push(user);

    await sendAuthPayload(res, db, user);
  },

  "POST /api/auth/login": async (req, res) => {
    const body = await readBody(req);

    const email = normalizeEmail(body.email);
    const password = String(body.password || "");

    const db = await ensureDb();
    const user = db.users.find((item) => item.email === email);

    if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      return json(res, 401, {
        message: "Email or password is incorrect",
      });
    }

    await sendAuthPayload(res, db, user);
  },

  "GET /api/auth/me": async (req, res) => {
    try {
      const { user } = await requireUser(req, res);
      json(res, 200, { user: publicUser(user) });
    } catch {
      json(res, 200, { user: null });
    }
  },

  "POST /api/auth/logout": async (req, res) => {
    json(
      res,
      200,
      { ok: true },
      {
        "Set-Cookie": `${SESSION_COOKIE}=; ${clearCookieOptions}`,
      }
    );
  },

  "GET /api/applications": async (req, res) => {
    const { db, user } = await requireUser(req, res);

    const apps = db.applications
      .filter((app) => app.userId === user.id)
      .sort((a, b) => +new Date(b.appliedDate) - +new Date(a.appliedDate));

    json(res, 200, { applications: apps });
  },

  "POST /api/applications": async (req, res) => {
    const { db, user } = await requireUser(req, res);
    const body = await readBody(req);
    const now = new Date().toISOString();

    const app = sanitizeApplication(body, user.id);

    validateApplication(app);

    app.id = randomUUID();
    app.createdAt = now;
    app.updatedAt = now;
    app.history = [{ status: app.status, at: now }];

    db.applications.unshift(app);

    await saveDb(db);

    json(res, 201, { application: app });
  },
};

const matchApplicationRoute = async (req, res, method, pathname) => {
  const match = pathname.match(/^\/api\/applications\/([^/]+)$/);

  if (!match) return false;

  const id = match[1];

  const { db, user } = await requireUser(req, res);

  const index = db.applications.findIndex(
    (app) => app.id === id && app.userId === user.id
  );

  if (index === -1) {
    json(res, 404, { message: "Application not found" });
    return true;
  }

  if (method === "GET") {
    json(res, 200, { application: db.applications[index] });
    return true;
  }

  if (method === "PUT") {
    const body = await readBody(req);
    const existing = db.applications[index];
    const updated = sanitizeApplication(body, user.id, existing);

    validateApplication(updated);

    if (updated.status !== existing.status) {
      updated.history = [
        ...(existing.history || []),
        { status: updated.status, at: updated.updatedAt },
      ];
    } else {
      updated.history = existing.history || [];
    }

    db.applications[index] = updated;

    await saveDb(db);

    json(res, 200, { application: updated });
    return true;
  }

  if (method === "DELETE") {
    db.applications.splice(index, 1);

    await saveDb(db);

    json(res, 200, { ok: true });
    return true;
  }

  return false;
};

const server = createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      return json(res, 204, {});
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const key = `${req.method} ${url.pathname}`;
    const route = routes[key];

    if (route) {
      return await route(req, res);
    }

    if (await matchApplicationRoute(req, res, req.method, url.pathname)) {
      return;
    }

    json(res, 404, { message: "Route not found" });
  } catch (error) {
    json(res, error.status || 500, {
      message: error.message || "Server error",
    });
  }
});

server.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});