// Session + cookie auth, end to end.
// Run:  npm install   (from node/auth-demo)
//       npm run session
// Then follow node/auth-demo/README.md

const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");

const app = express();
app.use(express.json());

// In-memory "database" — swap for Postgres/Mongo/etc in a real app.
const users = []; // { id, email, passwordHash }
let nextId = 1;

// MemoryStore (the express-session default) is dev-only: it leaks memory
// and loses every session on restart. Fine here, wrong in production —
// see node/authentication.md §6 for a Redis-backed version.
app.use(
  session({
    secret: "demo-secret-change-me", // signs the cookie, doesn't encrypt it
    resave: false,
    saveUninitialized: false, // don't set a cookie until something is stored
    cookie: {
      httpOnly: true, // JS can't read it — the main XSS mitigation
      secure: false, // would be true behind HTTPS in production
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  })
);

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Login required" });
  }
  next();
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

  // New session id on every login — prevents session fixation.
  req.session.regenerate((err) => {
    if (err) return res.status(500).end();
    req.session.userId = user.id;
    res.json({ id: user.id, email: user.email });
  });
});

app.get("/me", requireAuth, (req, res) => {
  const user = users.find((u) => u.id === req.session.userId);
  res.json({ id: user.id, email: user.email });
});

app.post("/logout", requireAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).end();
    res.clearCookie("connect.sid"); // server-side record AND browser copy, both gone
    res.status(204).end();
  });
});

const PORT = 4001;
app.listen(PORT, () => {
  console.log(`session-auth demo listening on http://localhost:${PORT}`);
});
