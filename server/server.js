import "dotenv/config";
import { createServer } from "node:http";
import {
  randomBytes,
  pbkdf2Sync,
  timingSafeEqual,
  randomUUID,
} from "node:crypto";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

const PORT = Number(process.env.PORT || 4000);
const SESSION_COOKIE = process.env.SESSION_COOKIE;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN;
const SESSION_MAX_AGE = Number(process.env.SESSION_MAX_AGE);
const JWT_SECRET = process.env.JWT_SECRET;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!JWT_SECRET) throw new Error("JWT_SECRET is missing in .env");
if (!SUPABASE_URL) throw new Error("SUPABASE_URL is missing in .env");
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing in .env");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
  process.env.NODE_ENV === "production"
    ? "SameSite=None; Secure"
    : "SameSite=Lax",
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
      }),
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

const toPublicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
});

const toAppResponse = (app, history = []) => ({
  id: app.id,
  userId: app.user_id,
  company: app.company,
  position: app.position,
  salary: app.salary || "",
  location: app.location || "",
  notes: app.notes || "",
  status: app.status,
  appliedDate: app.applied_date,
  createdAt: app.created_at,
  updatedAt: app.updated_at,
  history: history.map((item) => ({
    status: item.status,
    at: item.created_at,
  })),
});

const createJwt = (user) =>
  jwt.sign(
    {
      userId: user.id,
    },
    JWT_SECRET,
    {
      expiresIn: SESSION_MAX_AGE,
    },
  );

const getUserById = async (id) => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data;
};

const requireUser = async (req, res) => {
  const token = parseCookies(req)[SESSION_COOKIE];

  if (!token) {
    const error = new Error("Missing auth token");
    error.status = 401;
    throw error;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await getUserById(payload.userId);

    if (!user) {
      const error = new Error("Invalid auth token");
      error.status = 401;
      throw error;
    }

    const newToken = createJwt(user);

    res.setHeader(
      "Set-Cookie",
      `${SESSION_COOKIE}=${encodeURIComponent(newToken)}; ${cookieOptions}`,
    );

    return { user };
  } catch {
    const error = new Error("Invalid auth token");
    error.status = 401;
    throw error;
  }
};

const sanitizeApplication = (input, userId, existing = {}) => {
  const now = new Date().toISOString();

  const existingStatus = existing.status || "applied";

  const status = STATUS_ORDER.includes(input.status)
    ? input.status
    : existingStatus;

  const dateValue =
    input.appliedDate === undefined
      ? existing.applied_date || existing.appliedDate || now
      : input.appliedDate;

  const parsedDate = new Date(dateValue);

  if (Number.isNaN(parsedDate.getTime())) {
    const error = new Error("Applied date is invalid");
    error.status = 400;
    throw error;
  }

  const field = (name, dbName = name) =>
    input[name] === undefined
      ? String(existing[dbName] || "").trim()
      : String(input[name] || "").trim();

  return {
    user_id: userId,
    company: field("company"),
    position: field("position"),
    salary: field("salary"),
    location: field("location"),
    notes: field("notes"),
    status,
    applied_date: parsedDate.toISOString(),
    updated_at: now,
  };
};

const validateApplication = (app) => {
  if (!app.company || !app.position) {
    const error = new Error("Company and role are required");
    error.status = 400;
    throw error;
  }
};

const sendAuthPayload = async (res, user) => {
  const token = createJwt(user);

  json(
    res,
    200,
    { user: toPublicUser(user) },
    {
      "Set-Cookie": `${SESSION_COOKIE}=${encodeURIComponent(token)}; ${cookieOptions}`,
    },
  );
};

const getApplicationWithHistory = async (id, userId) => {
  const { data: app, error: appError } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (appError || !app) return null;

  const { data: history, error: historyError } = await supabase
    .from("application_history")
    .select("*")
    .eq("application_id", id)
    .order("created_at", { ascending: true });

  if (historyError) {
    const error = new Error(historyError.message);
    error.status = 500;
    throw error;
  }

  return toAppResponse(app, history || []);
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

    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingUser) {
      return json(res, 409, {
        message: "An account already exists for this email",
      });
    }

    const passwordHash = hashPassword(password);
    const now = new Date().toISOString();

    const newUser = {
      id: randomUUID(),
      name,
      email,
      password_hash: passwordHash.hash,
      password_salt: passwordHash.salt,
      created_at: now,
      updated_at: now,
    };

    const { data: user, error } = await supabase
      .from("users")
      .insert(newUser)
      .select("*")
      .single();

    if (error) {
      return json(res, 500, { message: error.message });
    }

    await sendAuthPayload(res, user);
  },

  "POST /api/auth/login": async (req, res) => {
    const body = await readBody(req);

    const email = normalizeEmail(body.email);
    const password = String(body.password || "");

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (
      error ||
      !user ||
      !verifyPassword(password, user.password_salt, user.password_hash)
    ) {
      return json(res, 401, {
        message: "Email or password is incorrect",
      });
    }

    await sendAuthPayload(res, user);
  },

  "GET /api/auth/me": async (req, res) => {
    try {
      const { user } = await requireUser(req, res);
      json(res, 200, { user: toPublicUser(user) });
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
      },
    );
  },

  "GET /api/applications": async (req, res) => {
    const { user } = await requireUser(req, res);

    const { data: apps, error } = await supabase
      .from("applications")
      .select("*")
      .eq("user_id", user.id)
      .order("applied_date", { ascending: false });

    if (error) {
      return json(res, 500, { message: error.message });
    }

    json(res, 200, {
      applications: (apps || []).map((app) => toAppResponse(app)),
    });
  },

  "POST /api/applications": async (req, res) => {
    const { user } = await requireUser(req, res);
    const body = await readBody(req);
    const now = new Date().toISOString();

    const appInput = sanitizeApplication(body, user.id);

    validateApplication(appInput);

    const newApp = {
      id: randomUUID(),
      ...appInput,
      created_at: now,
      updated_at: now,
    };

    const { data: app, error: appError } = await supabase
      .from("applications")
      .insert(newApp)
      .select("*")
      .single();

    if (appError) {
      return json(res, 500, { message: appError.message });
    }

    const { data: history, error: historyError } = await supabase
      .from("application_history")
      .insert({
        application_id: app.id,
        status: app.status,
        created_at: now,
      })
      .select("*");

    if (historyError) {
      return json(res, 500, { message: historyError.message });
    }

    json(res, 201, {
      application: toAppResponse(app, history || []),
    });
  },
};

const matchApplicationRoute = async (req, res, method, pathname) => {
  const match = pathname.match(/^\/api\/applications\/([^/]+)$/);

  if (!match) return false;

  const id = match[1];
  const { user } = await requireUser(req, res);

  const { data: existing, error: existingError } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) {
    json(res, 500, { message: existingError.message });
    return true;
  }

  if (!existing) {
    json(res, 404, { message: "Application not found" });
    return true;
  }

  if (method === "GET") {
    const application = await getApplicationWithHistory(id, user.id);
    json(res, 200, { application });
    return true;
  }

  if (method === "PUT") {
    const body = await readBody(req);
    const updatedInput = sanitizeApplication(body, user.id, existing);

    validateApplication(updatedInput);

    const { data: updated, error: updateError } = await supabase
      .from("applications")
      .update(updatedInput)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (updateError) {
      json(res, 500, { message: updateError.message });
      return true;
    }

    if (updated.status !== existing.status) {
      const { error: historyError } = await supabase
        .from("application_history")
        .insert({
          application_id: id,
          status: updated.status,
          created_at: updated.updated_at,
        });

      if (historyError) {
        json(res, 500, { message: historyError.message });
        return true;
      }
    }

    const application = await getApplicationWithHistory(id, user.id);
    json(res, 200, { application });
    return true;
  }

  if (method === "DELETE") {
    const { error: deleteError } = await supabase
      .from("applications")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      json(res, 500, { message: deleteError.message });
      return true;
    }

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
