// JWT auth, end to end — short-lived access token + revocable refresh token.
// Run:  npm install   (from node/auth-demo)
//       npm run jwt
// Then follow node/auth-demo/README.md

const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");

const app = express();
app.use(express.json());

// In-memory "database" — swap for Postgres/Mongo/etc in a real app.
const users = []; // { id, email, passwordHash }
let nextId = 1;

// The access token needs nothing stored server-side (that's the point of a
// JWT) but the refresh token DOES — it's the only thing that makes logout
// and revocation possible. Keyed by a hash of the token so a DB leak alone
// doesn't hand out working refresh tokens.
const refreshTokens = new Map(); // hash -> userId

const ACCESS_SECRET = "demo-access-secret-change-me";
const REFRESH_SECRET = "demo-refresh-secret-change-me";
const ACCESS_TTL = "2m"; // short on purpose so you can watch it expire
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function issueTokens(user) {
  const accessToken = jwt.sign({ sub: user.id }, ACCESS_SECRET, {
    expiresIn: ACCESS_TTL,
  });

  const refreshToken = crypto.randomBytes(32).toString("base64url");
  refreshTokens.set(hashToken(refreshToken), {
    userId: user.id,
    expiresAt: Date.now() + REFRESH_TTL_MS,
  });

  return { accessToken, refreshToken };
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  try {
    // Pin the algorithm — accepting whatever `alg` the token claims is how
    // the classic "alg: none" / RS256-HS256 confusion bugs happen.
    req.user = jwt.verify(token, ACCESS_SECRET, { algorithms: ["HS256"] });
    next();
  } catch (err) {
    const reason = err.name === "TokenExpiredError" ? "Token expired" : "Invalid token";
    res.status(401).json({ error: reason });
  }
}

app.post("/signup", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }
  if (users.some((u) => u.email === email)) {
    return res.status(409).json({ error: "Email already in use" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = { id: nextId++, email, passwordHash };
  users.push(user);

  res.status(201).json({ id: user.id, email: user.email });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  const user = users.find((u) => u.email === email);

  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  res.json({ id: user.id, email: user.email, ...issueTokens(user) });
});

app.get("/me", requireAuth, (req, res) => {
  const user = users.find((u) => u.id === req.user.sub);
  res.json({ id: user.id, email: user.email });
});

// Rotation: every refresh consumes the old refresh token and issues a new
// one. If a consumed token is ever presented again, that's a theft signal
// (two parties hold it) — see node/authentication.md §7.
app.post("/refresh", (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) return res.status(400).json({ error: "refreshToken required" });

  const hash = hashToken(refreshToken);
  const record = refreshTokens.get(hash);
  refreshTokens.delete(hash); // single use, whether or not it's valid

  if (!record || record.expiresAt < Date.now()) {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }

  const user = users.find((u) => u.id === record.userId);
  res.json(issueTokens(user));
});

// There's nothing server-side to delete for the access token — it stays
// valid until it expires (2 minutes here). Revoking the refresh token is
// what actually stops the session from being renewable.
app.post("/logout", (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken) refreshTokens.delete(hashToken(refreshToken));
  res.status(204).end();
});

const PORT = 4002;
app.listen(PORT, () => {
  console.log(`jwt-auth demo listening on http://localhost:${PORT}`);
});
