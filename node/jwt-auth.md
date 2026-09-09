# JWT authentication, in practice

## The story in one paragraph

Think of a festival wristband. When you buy a ticket they print your name and
the closing date on a band, seal it around your wrist, and wave you in. At
every stage after that, the guard doesn't phone the box office. They glance at
the band, check the seal is genuine and the date hasn't passed, and let you
through.

That's a JWT. Meera logs in once, the server hands her a small signed string,
and every request after that carries it. No lookup, no shared database, no
back room — the token *is* the answer.

Everything good and everything bad about JWTs falls out of that one picture:

- **Fast and stateless.** Any server with the key can check the seal. Nothing
  to store, nothing to share between instances.
- **Anyone can read it.** The band has your name printed on the outside.
- **You can't un-issue it.** There's no guest list to strike a name off. Throw
  Meera out and her band still opens the gate until the date passes.

That last point is the whole reason the refresh-token dance exists (§7).

For the session/cookie approach and how the two compare, see
[authentication.md](authentication.md) §3, and
[express-session-config.md](express-session-config.md) for its coat-check
counterpart. The runnable version of everything below is
[auth-demo/jwt-auth/server.js](auth-demo/jwt-auth/server.js).

---

## 1. One request, start to finish

There's no middleware sitting over the whole app this time. You put a guard on
the routes that need one:

```js
app.get("/me", requireAuth, (req, res) => { /* … */ });
```

And `requireAuth` does all of it:

```js
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  try {
    req.user = jwt.verify(token, ACCESS_SECRET, { algorithms: ["HS256"] });
    next();
  } catch (err) {
    const reason = err.name === "TokenExpiredError" ? "Token expired" : "Invalid token";
    res.status(401).json({ error: reason });
  }
}
```

Step by step:

1. **Read the header.** The client sends `Authorization: Bearer eyJhbGci…`.
   Two words, split on the space. "Bearer" is literal, and it means exactly
   what it sounds like: whoever bears this token is treated as the user.
2. **Check the seal.** `jwt.verify` recomputes the signature from the header
   and payload using your key, and compares. One wrong character anywhere and
   it throws.
3. **Check the date.** `verify` also enforces `exp` for you — an expired token
   throws `TokenExpiredError` even though the signature is perfectly valid.
4. **Hand the payload on.** Whatever survives lands on `req.user`.

Notice what *doesn't* happen: no database, no Redis, no session store. That's
the selling point in one line — and §6 walks through how `verify` pulls it off
without one.

### `req.user` is not a user

It's the token's payload:

```js
{ sub: 1, iat: 1788626030, exp: 1788626150 }
```

Which is why `/me` still has to go and fetch the actual person:

```js
const user = users.find((u) => u.id === req.user.sub);
```

The name is conventional but misleading. `req.claims` would be honest.

---

## 2. The three moments your code owns

### Signing up: no token yet

Identical to the session demo, and for the same reason — signup writes to the
**user table**, which has nothing to do with tokens:

```js
const passwordHash = await bcrypt.hash(password, 10);
const user = { id: nextId++, email, passwordHash };
users.push(user);
res.status(201).json({ id: user.id, email: user.email });
```

No wristband, because she hasn't been through the gate yet. Walked through
line by line in [express-session-config.md](express-session-config.md) §2 —
it's the same route.

### Logging in: print the band

```js
const ok = user && (await bcrypt.compare(password, user.passwordHash));
if (!ok) return res.status(401).json({ error: "Invalid email or password" });

res.json({ id: user.id, email: user.email, ...issueTokens(user) });
```

The password check is exactly the session version. The difference is the last
line: the credential comes back **in the response body**, as JSON, for the
client to hold on to. There's no `Set-Cookie` and no session id, because
there's no session.

Compare the two responses and the whole architecture is visible:

```
session   HTTP/1.1 200 OK
          Set-Cookie: connect.sid=s%3AkQ7v…       ← browser stores it, sends it automatically
          {"id":1,"email":"a@test.com"}

jwt       HTTP/1.1 200 OK
          {"id":1,"email":"a@test.com",
           "accessToken":"eyJhbGci…",             ← your code stores it, sends it manually
           "refreshToken":"3nQ8…"}
```

### Logging out: the awkward one

```js
app.post("/logout", (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken) refreshTokens.delete(hashToken(refreshToken));
  res.status(204).end();
});
```

Read that carefully: **it never touches the access token.** It can't. There is
nothing stored anywhere to delete, and the token is already in the client's
hands. Meera "logs out" and her access token keeps working until `exp` passes
— two minutes in the demo, fifteen in a typical app.

What logout actually achieves is that she can't *renew*. The refresh token is
revoked, so when the access token dies, that's the end.

You can watch the gap in the README: log out, then immediately call `/me` with
the access token you already had. Still `200`.

Three ways to live with it:

| Approach | Cost |
| --- | --- |
| Short access TTL + accept the window | simplest, and what almost everyone does |
| Denylist `jti` values until they expire | you've reintroduced the state you left sessions to avoid |
| Delete the client's copy and hope | does nothing against an already-stolen token |

If instant logout matters to you — banking, admin panels, anything where "ban
this user" must be immediate — that's a real argument for sessions.

---

## 3. What's actually in the token

Three base64url segments joined by dots. Here's a real one from the demo:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9  .  eyJzdWIiOjEsImlhdCI6MTc4ODYyNjAzMCwiZXhwIjoxNzg4NjI2MTUwfQ  .  N_evajWpJ35ykTaFCKVDduKMERs0DkGL-MAlgbPoMf8
            header                                        payload                                                  signature
```

Decode the first two — no key needed, that's the point being made:

```js
Buffer.from(header,  "base64url").toString()   // {"alg":"HS256","typ":"JWT"}
Buffer.from(payload, "base64url").toString()   // {"sub":1,"iat":1788626030,"exp":1788626150}
```

**Base64url is not encryption.** It's an alphabet swap so the token survives
being put in a URL or a header. Anyone holding the token — the user, a proxy,
whoever pulls it out of a log file — can read every claim in it.

So the rule is short: the signature stops the payload being *changed*, not
being *read*. Nothing sensitive goes in a JWT. No email addresses you'd rather
not leak, no internal flags, no "is_under_investigation".

The signature is the seal: an HMAC over `header.payload` with your secret.
Edit one character of the payload and the recomputed signature no longer
matches, so `verify` throws.

---

## 4. The claims, and why the names are so short

The payload is any JSON you like, but seven names are reserved by RFC 7519 and
understood by every library:

| Claim | Means | In the demo |
| --- | --- | --- |
| `sub` | **subject** — who the token is about | `user.id`, set by you |
| `iat` | issued at | added automatically by `jwt.sign` |
| `exp` | expires at | from `expiresIn: "2m"` |
| `iss` | issuer — who minted it | unused |
| `aud` | audience — who should accept it | unused |
| `nbf` | not valid before | unused |
| `jti` | unique token id | unused; you'd need it for a denylist |

They're abbreviated because the token goes out on **every single request**.
Every character is paid for over and over.

Two things to watch:

**`sub` should be a string.** The spec says so; `jsonwebtoken` won't stop you
signing a number. The demo signs `sub: user.id` (a number) and compares with
`u.id === req.user.sub`, which works only because both sides are numbers. Move
to string ids, Mongo `ObjectId`s, or follow the spec with
`sub: String(user.id)`, and that strict comparison silently finds nobody. Sign
strings, compare strings.

**Claims are a snapshot, not a live view.** Put `role: "admin"` in a token and
demote that person, and their token still says `admin` until it expires. The
data was true when the band was printed. This is the argument for keeping
tokens short-lived and for looking up anything that can change — which is what
`/me` does.

---

## 5. Signing: `jwt.sign`

```js
const accessToken = jwt.sign({ sub: user.id }, ACCESS_SECRET, {
  expiresIn: ACCESS_TTL,   // "2m" in the demo
});
```

### What `sign` actually does

Three steps, and you can do all of them yourself:

1. **Encode the header.** `{"alg":"HS256","typ":"JWT"}`, base64url.
2. **Encode the payload.** Your claims, plus `iat` (now) and `exp`
   (now + `expiresIn`), which the library adds for you. Base64url again.
3. **HMAC the two together** — `HMAC-SHA256(secret, "header.payload")` — and
   append that as the third segment.

Written out with nothing but `crypto`:

```js
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const now = Math.floor(Date.now() / 1000);

const h = b64({ alg: "HS256", typ: "JWT" });
const p = b64({ sub: 1, iat: now, exp: now + 120 });
const sig = crypto.createHmac("sha256", SECRET).update(h + "." + p).digest("base64url");

const token = h + "." + p + "." + sig;
```

That produces a byte-for-byte identical string to `jwt.sign({ sub: 1 },
SECRET, { expiresIn: "2m" })`:

```
hand-built : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImlhdCI6MTc4ODYyNzE1MiwiZXhwIjoxNzg4NjI3MjcyfQ.szAgtNs_m7Imd6x94n2Wo4uWrCXrgj4iQjZit4agE2M
jwt.sign   : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImlhdCI6MTc4ODYyNzE1MiwiZXhwIjoxNzg4NjI3MjcyfQ.szAgtNs_m7Imd6x94n2Wo4uWrCXrgj4iQjZit4agE2M
identical  : true
```

**The secret.** For HS256 it's one shared key that both signs and verifies —
anyone who can check a token can also mint one. Long, random, from the
environment. Rotating it invalidates every token at once, which is survivable
precisely because they're short-lived.

**`expiresIn` is not optional.** Leave it out and there's no `exp` in the
payload, and a token with no `exp` is a credential that works forever with no
way to take it back. Minutes for an access token — 15 is the usual figure, and
the demo uses 2 so you can watch it expire.

**HS256 vs RS256.** HS256 is symmetric: one secret, and every service that
verifies can also forge. RS256 is asymmetric — a private key signs, a public
key verifies — so you can hand the public key to five other services and none
of them can mint tokens. Use RS256 when someone other than the issuer needs to
verify (microservices, or a third-party identity provider). For a single
backend talking to itself, HS256 is fine.

---

## 6. Verifying: `jwt.verify`

```js
req.user = jwt.verify(token, ACCESS_SECRET, { algorithms: ["HS256"] });
```

### What `verify` actually does

The key idea: **verification is recomputation, not lookup.** The server
doesn't remember issuing this token. It redoes the signing math from §5 and
checks it lands on the same answer.

**1. Split on dots.** Not exactly three segments → `jwt malformed`, thrown
before any crypto runs.

**2. Decode the header and check `alg` against your list.**

```js
{ alg: "HS256", typ: "JWT" }
```

The header *claims* HS256. Your `algorithms: ["HS256"]` is what makes that
claim acceptable rather than authoritative — a token saying `alg: none` or
`alg: RS256` is rejected here, before its signature is even looked at.

**3. Recompute the HMAC** over the first two segments and compare:

```js
crypto.createHmac("sha256", ACCESS_SECRET).update(h + "." + p).digest("base64url")
```

```
token sig   : LHFjxXqBHrb3XdBCCTE_Vf79_fRribTSjEVzOMBXC8Y
recomputed  : LHFjxXqBHrb3XdBCCTE_Vf79_fRribTSjEVzOMBXC8Y
match       : true
```

**4. Which is why tampering fails.** Change `sub: 1` to `sub: 2` — trivial,
it's base64 — and the token now needs a different signature:

```
tampered payload needs sig: OAeG_DQZvY-bba0qGl6R…
attacker can only supply  : LHFjxXqBHrb3XdBCCTE_…   ← no secret, can't compute the other
verify says               : JsonWebTokenError - invalid signature
```

Editing the payload is free. Producing a matching signature is the part that
isn't.

**5. Only then, check the clock.** A valid signature doesn't mean a valid
token. `verify` reads `exp` from the payload it just trusted and throws
`TokenExpiredError` if it has passed (`nbf` likewise). This is why
`requireAuth` branches on `err.name`: an expired token is a perfectly genuine
one, and the client should refresh rather than log in again.

**6. Return the payload**, which is what lands on `req.user`:

```js
{ sub: 1, iat: 1788626030, exp: 1788626150 }
```

`verify` proved *who*, not *what they look like now* — hence the `users.find`
that follows it.

---

## 7. Refresh tokens: why there are two credentials

An access token can't be revoked, so it has to be short-lived. But nobody
wants to type their password every fifteen minutes. So you carry a second
credential whose only job is to mint new access tokens — and *that* one is
stored server-side, which makes it revocable.

Short-lived and unrevocable, or long-lived and revocable. You get both by
carrying one of each.

```js
const refreshToken = crypto.randomBytes(32).toString("base64url");
refreshTokens.set(hashToken(refreshToken), {
  userId: user.id,
  expiresAt: Date.now() + REFRESH_TTL_MS,
});
```

Two design choices there are worth stopping on.

**The refresh token isn't a JWT.** It's 32 random bytes. It doesn't need to
carry claims, because it gets looked up in a table anyway — and if you're
looking it up, self-description buys you nothing. See
[crypto-random-ids.md](crypto-random-ids.md) for why `randomBytes` and not
`Math.random`.

**It's stored hashed**, exactly like a password. A leaked database gives an
attacker a table of SHA-256 digests, not a set of working credentials. (Plain
SHA-256 is right here and wrong for passwords — the token is already 32 random
bytes, so there's nothing to guess and nothing to slow down. Compare
[password-hashing.md](password-hashing.md).)

### Rotation and reuse detection

```js
const hash = hashToken(refreshToken);
const record = refreshTokens.get(hash);
refreshTokens.delete(hash);   // single use, valid or not

if (!record || record.expiresAt < Date.now()) {
  return res.status(401).json({ error: "Invalid or expired refresh token" });
}
res.json(issueTokens(user));
```

Every refresh **consumes** the old token and issues a fresh pair. So a refresh
token works exactly once.

That's not just hygiene — it's a burglar alarm. If a consumed refresh token is
ever presented again, two parties are holding the same credential, and one of
them is a thief. You can't tell which, and you don't need to: revoke the whole
family and force a re-login. Reuse detection is what makes month-long JWT
sessions defensible at all.

Note the `delete` happens *before* the validity check, so even a presented
expired token is burned rather than left lying around.

The demo stops at revoking the single token. A production version keeps a
family id on each record so one reuse can kill every descendant.

---

## 8. Where the client keeps it

This is where JWTs get lost, because the token has to live somewhere and every
option has a catch.

| Kept in | Read by XSS? | Sent automatically? | Then you also need |
| --- | --- | --- | --- |
| `localStorage` | **yes** | no | nothing — and that's the problem |
| Memory (a JS variable) | only while the page is open | no | a refresh call on every page load |
| `httpOnly` cookie | no | yes | CSRF protection — [csrf.md](web-security/csrf.md) |

`localStorage` is the default choice in tutorials and the weakest one: any
injected script — including one from a transitive npm dependency — reads the
token and sends it anywhere. See [xss.md](web-security/xss.md).

Putting the token in an `httpOnly` cookie fixes that, but notice what you've
built: a credential the browser attaches automatically, which needs `SameSite`
and CSRF tokens. That's a session, with extra steps and no revocation.

Which is the honest summary of the whole subject: **if it's a browser app
talking to your own backend, use sessions.** Reach for JWTs when
statelessness genuinely buys something — a mobile client, service-to-service
calls, or tokens minted by an identity provider you don't run.
