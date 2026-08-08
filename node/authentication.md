# Authentication

**Authentication (authn)** answers *who are you?*
**Authorization (authz)** answers *what are you allowed to do?*

They're separate steps and separate failures: a wrong password is a `401
Unauthorized` (authn), a logged-in user opening someone else's invoice is
`403 Forbidden` (authz). The name of the 401 status code is a historical
mistake — it means "unauthenticated".

---

## 1. The problem: HTTP is stateless

Every HTTP request is independent. The server has no memory that the
previous request came from the same person. So after you prove your
identity once, **every subsequent request must carry a credential** that
re-proves it.

The whole subject is really just: what is that credential, where is it
stored, and how do you revoke it?

```
POST /login   { email, password }   → server verifies → issues credential
GET  /orders  Cookie: sid=abc…      → server maps credential → user
```

---

## 2. Factors

| Factor | Meaning | Examples |
| --- | --- | --- |
| Knowledge | something you **know** | password, PIN, security question |
| Possession | something you **have** | phone (TOTP/SMS), hardware key, email inbox |
| Inherence | something you **are** | fingerprint, face |

**MFA/2FA** = two factors from *different* categories. A password plus a
security question is still one factor (both knowledge). A password plus a
TOTP code is two.

TOTP (authenticator apps) is a shared secret plus the current 30-second
window, hashed — which is why it works offline. SMS is the weakest second
factor: SIM swaps and SS7 interception are routine. It's still much better
than nothing.

---

## 3. The main strategies

| Strategy | Credential | State | Revoke | Fits |
| --- | --- | --- | --- | --- |
| **Session + cookie** | opaque session id | server-side store | delete the row | classic web apps, same-origin SPAs |
| **JWT** | signed token | none (self-contained) | hard | services, mobile, cross-domain APIs |
| **OAuth 2.0 / OIDC** | delegated token | at the provider | at the provider | "Sign in with Google" |
| **API key** | long random string | DB row | delete the row | machine-to-machine |
| **Basic auth** | base64 `user:pass` **every** request | none | change the password | internal tools behind a VPN |
| **Magic link** | one-time emailed token | DB row | expiry | consumer apps, no passwords |
| **Passkeys / WebAuthn** | key pair, private key on device | public key in DB | delete the key | strongest option today |

Passkeys are worth knowing: the server stores only a **public** key, so a
database breach leaks nothing usable, and the signature is bound to the
site's origin — which makes phishing structurally impossible rather than a
training problem.

### Session vs JWT — the one that actually comes up

**Session:** the cookie holds a meaningless random id. Everything real
(user id, roles, expiry) lives server-side in Redis/Postgres.

- Revocation is instant — delete the record.
- Every request needs a store lookup (fast, but a dependency).
- The store is shared state: with more than one server instance you cannot
  use the default in-memory store.

**JWT:** the token itself contains the claims, signed so it can't be
edited.

- No lookup — any instance can verify with the key alone.
- **You cannot revoke it.** A stolen token stays valid until it expires;
  "ban this user" doesn't take effect until then.
- Payload is **base64, not encrypted** — anyone can read it. Never put
  anything secret in a JWT.
- Claims are a snapshot. Demote an admin and their old token still says
  `role: admin`.

The standard compromise: a **short-lived access token** (5–15 min) plus a
**long-lived refresh token** that *is* stored server-side and can be
revoked. Best of both, at the cost of a rotation flow.

Common advice, and it holds up: if it's a browser app talking to your own
backend, use sessions. Reach for JWTs when statelessness genuinely buys
you something.

---

## 4. Signup vs login vs logout

They're often conflated because they share a form layout. They are three
different operations.

| | Signup (register) | Login (sign in) | Logout (sign out) |
| --- | --- | --- | --- |
| Purpose | **create** the identity | **prove** an existing identity | **end** the proven session |
| Verb | `POST /signup` | `POST /login` | `POST /logout` |
| Writes | inserts a user row | usually no user write | deletes the session |
| Password | hashed and stored | hashed and **compared** | untouched |
| Idempotent | ❌ second call = duplicate | ✅ repeatable | ✅ repeatable |
| Fails when | email already taken | credentials don't match | ~never |
| Status | `201 Created` | `200 OK` | `204 No Content` |

### Signup

```js
app.post("/signup", async (req, res) => {
  const { email, password, name } = req.body; // validated first — see
                                              // request-validation.md
  const existing = await db.users.findByEmail(email);
  if (existing) return res.status(409).json({ error: "Email already in use" });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await db.users.insert({ email, passwordHash, name });

  await sendVerificationEmail(user); // proves they own the address
  res.status(201).json({ id: user.id, email: user.email });
});
```

Points worth internalising:

- **Never store the password**, only the hash — see
  [password-hashing.md](password-hashing.md).
- Enforce uniqueness with a **DB unique constraint**, not just the
  `findByEmail` check above. Two simultaneous signups both pass that check;
  only the constraint stops the duplicate. Catch the unique-violation error
  and return the same 409.
- **Email verification** is what turns "typed an address" into "controls
  that address". Without it, password reset is meaningless.
- Signup inevitably leaks whether an account exists ("email already in
  use"). You can't avoid it without breaking UX — the standard mitigation
  is rate limiting and CAPTCHA on the endpoint, and never leaking the same
  fact on *login*.
- Auto-login after signup is fine; issue the session exactly as login does.

### Login

```js
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await db.users.findByEmail(email);

  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) return res.status(401).json({ error: "Invalid email or password" });

  req.session.regenerate((err) => {   // new session id — kills fixation
    if (err) return res.status(500).end();
    req.session.userId = user.id;
    res.json({ id: user.id, email: user.email });
  });
});
```

- **One generic error message.** "No such user" vs "Wrong password" hands
  an attacker a free account-enumeration oracle.
- Login is where you **regenerate the session id**. Otherwise: attacker
  plants a known session id in your browser, you log in, that id is now
  authenticated — **session fixation**.
- **Rate limit it.** Per IP *and* per account, with a backoff. Otherwise
  credential stuffing (replaying leaked password dumps) works.
- Timing: if the user doesn't exist you skip `bcrypt.compare` and answer in
  1 ms instead of 100 ms, which itself reveals whether the account exists.
  Compare against a dummy hash in the not-found branch if you care.
- Don't log `req.body` on this route.

### Logout

```js
app.post("/logout", (req, res) => {
  req.session.destroy(() => {         // server-side record gone
    res.clearCookie("connect.sid");   // browser copy gone
    res.status(204).end();
  });
});
```

Two halves — kill the **server-side** session *and* clear the cookie.
Clearing only the cookie leaves a live session id that still works if it
was captured.

Use `POST`, not `GET`: a `<img src="/logout">` on any page would otherwise
log your users out (CSRF, mild but real).

**Logout with JWTs is the hard case.** Nothing server-side exists to
delete, and a token you already handed out stays valid. Options: delete the
client copy and accept the window; keep a denylist of `jti` values until
expiry (you've reintroduced state); or use short access tokens + a
revocable refresh token, which is why that pattern won.

---

## 5. Cookies: the attributes that matter

```js
res.cookie("sid", id, {
  httpOnly: true,   // JS can't read it → XSS can't steal it
  secure: true,     // HTTPS only
  sameSite: "lax",  // not sent on cross-site POSTs → blunts CSRF
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
});
```

| Attribute | Why |
| --- | --- |
| `HttpOnly` | invisible to `document.cookie`; the single biggest XSS mitigation |
| `Secure` | never sent over plain HTTP |
| `SameSite=Lax` | sent on top-level navigations, not on cross-site form posts/XHR |
| `SameSite=Strict` | never sent cross-site — safest, but breaks inbound links |
| `SameSite=None` | required for genuine cross-site use; **must** pair with `Secure` |
| `Max-Age` / `Expires` | absent = session cookie, dies with the browser |
| `Domain` | omit it — setting `.example.com` shares the cookie with every subdomain |

This is also the answer to "why not `localStorage` for tokens": JS can read
it, so any XSS — including one in a transitive npm dependency — exfiltrates
the token. A `HttpOnly` cookie can be *used* by an injected script but not
*read*, which keeps the damage inside the session.

Behind a proxy or load balancer, set `app.set("trust proxy", 1)` or
`secure: true` cookies never get sent (Express sees plain HTTP internally).

---

## 6. A working session setup

```js
const session = require("express-session");
const RedisStore = require("connect-redis").default;

app.use(
  session({
    store: new RedisStore({ client: redis }),
    secret: process.env.SESSION_SECRET,  // signs the cookie
    resave: false,
    saveUninitialized: false,            // no cookie until you store something
    cookie: { httpOnly: true, secure: true, sameSite: "lax", maxAge: 864e5 },
  })
);

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: "Login required" });
  next();
}

app.get("/me", requireAuth, async (req, res) => {
  res.json(await db.users.findById(req.session.userId));
});
```

The **default `MemoryStore` is dev-only** — it leaks memory, loses every
session on restart, and with two instances behind a load balancer half your
requests land on the server that's never heard of the session.

`secret` signs the cookie so the id can't be tampered with; it does not
encrypt anything. Rotating it logs everyone out.

---

## 7. JWT, concretely

```
eyJhbGciOiJIUzI1NiJ9  .  eyJzdWIiOiIxMjMiLCJleHAiOjE3…  .  3Rk8p…
      header                      payload                  signature
```

Three base64url segments. Header says the algorithm, payload holds the
claims, signature covers the first two.

```js
const jwt = require("jsonwebtoken");

const token = jwt.sign({ sub: user.id, role: user.role }, SECRET, {
  expiresIn: "15m",
});

const payload = jwt.verify(token, SECRET, { algorithms: ["HS256"] });
```

Standard claims: `sub` (subject/user), `iat` (issued at), `exp` (expiry),
`iss`, `aud`, `jti` (unique id, for denylisting).

Two classic vulnerabilities, both fixed by pinning the algorithm:

- **`alg: none`** — a token claiming no algorithm, which naive verifiers
  accepted as valid with an empty signature.
- **RS256 → HS256 confusion** — the attacker re-signs a token with the
  *public* key as the HMAC secret; a verifier that trusts the header's
  `alg` accepts it.

Always pass `algorithms: [...]` to `verify`, and always set an `expiresIn`.

### Refresh token rotation

Each use of a refresh token issues a **new** refresh token and invalidates
the old one. If an old one is ever presented again, that means two parties
hold the same token — a theft signal — so you revoke the entire family and
force a re-login. This "reuse detection" is what makes long-lived sessions
with JWTs defensible.

---

## 8. OAuth 2.0 / OIDC in one paragraph

OAuth 2.0 is an **authorization** framework — "let this app read my Drive"
— that got repurposed for login. **OIDC** is the thin layer on top that
makes it real authentication, by adding an `id_token` (a JWT describing the
user). Flow: you redirect to Google with your `client_id`, a `redirect_uri`
and a random `state`; the user consents; Google redirects back with a
short-lived `code`; your **server** exchanges that code plus its client
secret for tokens. The code goes through the browser but is useless without
the secret, which is the point of the extra hop. Verify `state` matches
what you sent — that's the CSRF defence — and use **PKCE** for mobile/SPA
clients that can't hold a secret.

Practically: use a library (`passport`, `openid-client`, Auth.js). Hand-
rolling OAuth is where subtle bugs live.

---