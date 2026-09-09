# Configuring `express-session`

## The story in one paragraph

Think of a coat check at a restaurant. You hand over your coat, they hand you
a small numbered ticket. The ticket isn't your coat. It's not worth anything
by itself. But whoever holds it can walk up and get the coat back.

Sessions work exactly like that. Meera logs in, the server keeps her details
in a back room, and it hands her browser a ticket with a number on it. Her
browser shows that ticket on every request after that. The ticket is the
cookie. The back room is the *session store*.

One thing to keep straight: this back room is **not** your user table. The
user table is the permanent register that signup writes to. The session store
is a separate, temporary room holding one shelf per active login, usually with
nothing on it but a `userId`. Signup fills in the register; login is what puts
a coat in the room — §2 walks through both.

Once you see it that way, the config stops being a wall of options. Every
setting is answering one of two questions:

- **when do we write in the back room?** (`resave`, `saveUninitialized`, `store`)
- **what rules do we attach to the ticket?** (everything under `cookie`)

Concepts are in [authentication.md](authentication.md) §3. A version you can
actually run is in
[auth-demo/session-auth/server.js](auth-demo/session-auth/server.js).

---

## 1. One request, start to finish

You write this once, near the top of the app:

```js
app.use(session({ /* options */ }));
```

That line does not log anyone in. It runs on *every* request that comes in —
logged in, logged out, a page load, a favicon. Here is what it does each time,
in order.

**On the way in:**

1. Look for the ticket. It's a cookie, named `connect.sid` unless you rename it.
2. Check the seal on it (more on that in a second). If the seal is wrong, or
   the number doesn't exist in the back room, pretend there was no ticket at all.
3. Go to the back room, fetch that session's data, and put it on `req.session`.

**Your route code then runs**, and `req.session` is already sitting there
waiting. This is the part that surprises people coming from tokens — you never
parse anything:

```js
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: "Login required" });
  next();
}
```

**On the way out:**

4. If you changed anything on `req.session`, save it to the back room.
5. If you didn't, just tell the back room "still in use, keep it around."
6. If the browser doesn't have a valid ticket yet, send one:
   `Set-Cookie: connect.sid=…`

### What the ticket actually looks like

```
connect.sid = s:kQ7vN2xR8pLm4tYw.9fB3aXcV1nMk0oPqRsTuVwXyZ
              │ └── the number ──┘ └────── the seal ──────┘
              └── "this one is signed"
```

The number is 24 random bytes, generated for you (see
[crypto-random-ids.md](crypto-random-ids.md)). It means nothing on its own. It
is not your email, not your user id, not encrypted data — it's just a number
that matches a shelf in the back room.

---

## 2. The three moments your code owns

Every option in the rest of this note decides how the coat check *behaves*.
These three are the moments where your own code has to act: someone joins,
someone hands over a coat, someone takes it back.

### Signing up: filling in the register, no ticket yet

Signup is the odd one out, because **it doesn't touch the coat room at all.**

Meera fills in the membership register: name, email, and a password. That's a
permanent record in your `users` table. She hasn't handed over a coat, so
there's nothing to give her a ticket for.

```js
app.post("/signup", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }
  if (users.some((u) => u.email === email)) {
    return res.status(409).json({ error: "Email already in use" });
  }

  const passwordHash = await bcrypt.hash(password, 10);   // ← the whole point
  const user = { id: nextId++, email, passwordHash };
  users.push(user);

  res.status(201).json({ id: user.id, email: user.email });
});
```

Nothing in there mentions `req.session`, which is why `POST /signup` comes
back with **no `Set-Cookie`** on it. That isn't a quirk of
`saveUninitialized` (§5) — there is genuinely no session yet.

What's worth noticing, line by line:

- **`req.body` only exists** because of `app.use(express.json())` higher up.
  The `|| {}` keeps a request with no body from throwing when destructured.
- **400 vs 409 vs 401.** 400 means "your request is malformed", 409 means
  "this clashes with something that already exists", and 401 — which signup
  never returns — means "your request was fine, your credentials weren't".
- **`bcrypt.hash` is where the password dies.** What lands in the register is
  a hash; the password itself is dropped and cannot be recovered by you or by
  anyone who steals the whole table. See
  [password-hashing.md](password-hashing.md).
- **`await` it.** Hashing is slow on purpose (~100 ms at cost 10). The
  callback form would block the event loop for that whole time, stalling
  every other request on the process.
- **Check for the duplicate before hashing**, not after — no point spending
  100 ms to then reject the request.
- **The response re-lists its fields.** Never `res.json(user)`: spreading the
  record is how a `passwordHash` ends up in an API response, and it will
  faithfully leak every new column you add later.

So the register entry looks like this, and this is all you ever store:

```js
{ id: 1, email: "a@test.com",
  passwordHash: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy" }
```

**If you want to log her in immediately** — most apps do — then signup ends by
doing what login does, and *that's* the moment a ticket appears:

```js
  users.push(user);

  req.session.regenerate((err) => {
    if (err) return res.status(500).end();
    req.session.userId = user.id;      // session is now dirty → Set-Cookie goes out
    res.status(201).json({ id: user.id, email: user.email });
  });
```

### Logging in: hand out a *new* ticket

When Meera logs in, throw away the ticket she had and give her a fresh one:

```js
req.session.regenerate((err) => {
  if (err) return res.status(500).end();
  req.session.userId = user.id;
  res.json({ id: user.id, email: user.email });
});
```

The version without it looks harmless, and is the one people write first:

```js
// no regenerate — she keeps whatever session id she already had
req.session.userId = user.id;
res.json({ id: user.id, email: user.email });
```

That one missing call is the whole difference. The session she was browsing
with *before* logging in is the same session she's logged into *after* — same
ticket number, now marked as authenticated.

Here's why that matters. Someone gets a ticket number into Meera's browser
before she logs in: a crafted link, a compromised subdomain, or simply the
shared computer they used first. They know that number. Meera logs in. If the
number doesn't change, the number they already know is now an authenticated
one, and they can walk in with it.

That's **session fixation**. `regenerate` is the entire fix: it throws the old
number away and issues a fresh one at the exact moment her privilege changes,
so whatever was planted earlier is now attached to a dead session.

### Logging out: clear the shelf, then the ticket

```js
req.session.destroy((err) => {
  if (err) return res.status(500).end();
  res.clearCookie("connect.sid");   // must match your `name`
  res.status(204).end();
});
```

`destroy` empties the shelf. That's what actually ends the session — the
ticket is now worthless no matter who holds it. `clearCookie` is just tidying
up so the browser stops presenting a dead ticket.

This instant, total logout is the thing sessions have and JWTs don't. With a
JWT there's no shelf to empty, so a token stays valid until it expires — see
[authentication.md](authentication.md) §3.

### A small trap: redirecting right after you write

The save happens as the response goes out. If you redirect, the browser may
fire the next request before the save finished, and that request won't see
your change. Wait for it:

```js
req.session.userId = user.id;
req.session.save(() => res.redirect("/dashboard"));
```

---

## 3. `secret` — the seal on the ticket

```js
secret: process.env.SESSION_SECRET,
```

Without a seal, anyone could scribble their own number on a ticket and try it.
So the server stamps each ticket with a seal only it can produce, and checks
that seal on the way back in. Forged tickets get thrown out immediately.

Two things people get wrong here:

- **The seal doesn't hide anything.** The number is right there in the cookie,
  readable by anyone. That's fine. A number with no back room behind it is
  worthless.
- **Changing the secret invalidates every ticket at once.** Every logged-in
  user is logged out. Sometimes that's what you want. Usually it isn't.

To change it *without* logging everyone out, pass a list. The first one stamps
new tickets, all of them are accepted on old tickets:

```js
secret: [process.env.SESSION_SECRET, process.env.SESSION_SECRET_OLD].filter(Boolean),
```

Ship that, wait until the old tickets have expired anyway, then drop the old one.

Keep the secret long, random, and out of the repo:
`crypto.randomBytes(32).toString("base64url")`.

---

## 4. `resave: false` — stop rewriting the same thing

The old default was `true`, which means: on every single request, go to the
back room and write the session down again. Even when nothing changed. Even
for a favicon.

Two problems with that.

It's wasteful — that's a database write per request, for nothing.

And it loses data. Picture two requests from Meera arriving at almost the same
time. Both read her session. Request A adds something and saves. Request B,
which never saw A's change, saves the older copy on top. A's change is gone.
Fewer writes means fewer chances for that.

Set it to `false`. Nothing breaks, because step 5 above still says "keep it
around" so the session doesn't expire out from under an active user.

---

## 5. `saveUninitialized: false` — no ticket until there's a coat

If someone walks past the coat check without handing over a coat, don't give
them a ticket. That's all this setting says.

With `false`, a request that never writes anything to `req.session` gets no
back-room entry and **no cookie**. You can watch it happen in the demo:

```bash
# signup — the server stored nothing in the session, so no ticket comes back
curl -i -X POST localhost:4001/signup -H 'Content-Type: application/json' \
  -d '{"email":"a@test.com","password":"hunter2"}'

# login — this one writes req.session.userId, so now you get a ticket
curl -i -X POST localhost:4001/login -H 'Content-Type: application/json' \
  -d '{"email":"a@test.com","password":"hunter2"}'
# → Set-Cookie: connect.sid=…
```

The signup half of that is the point made in §2: it writes to the *user
table*, never to `req.session`, so as far as the coat check is concerned
nothing happened.

Why you want this:

- Bots, crawlers and health checks hit your site constantly. With `true`, each
  one gets a session written down. Your back room fills up with empty shelves.
- You're not putting a cookie on someone's machine before they've done
  anything, which is the line most cookie-consent rules care about.

The one case for `true` is when you genuinely need to remember anonymous
visitors — a guest shopping cart, say.

---

## 6. `name` — don't leave the label on

```js
name: "sid",   // default: "connect.sid"
```

`connect.sid` is a fingerprint. Anyone who sees it knows you're running Express
with `express-session`, which tells an attacker where to start. Renaming it
costs you nothing.

---

## 7. The `cookie` block — the rules on the ticket

When the server hands over a ticket, it also attaches rules for the browser:
who may look at it, when to send it, when to throw it away. The browser
enforces these, not you.

```js
cookie: {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  maxAge: 24 * 60 * 60 * 1000,
  path: "/",
  // leave `domain` out
},
```

| Setting | In plain words | If you get it wrong |
| --- | --- | --- |
| `httpOnly: true` | JavaScript on the page can't read the ticket | injected script steals it and logs in as the user, anywhere |
| `secure: true` | only send it over HTTPS | the ticket travels in the clear; anyone on the café wifi has it |
| `sameSite: "lax"` | other websites can't make the browser send it | another site can act as your user (see [csrf.md](web-security/csrf.md)) |
| `maxAge` | how long before the browser bins it | leave it out and the ticket dies when the browser closes |
| `path: "/"` | which URLs it's sent to; the default is fine | — |
| `domain` | **leave it out** | setting `.example.com` shares the ticket with every subdomain you own |

---

## 8. `store` — the back room is not optional

By default, the "back room" is a plain object in your app's memory. Express
even prints a warning about it, and the warning is right:

- it never really cleans up, so memory keeps climbing;
- restart the app and every session is gone — everyone is logged out;
- run two copies of the app behind a load balancer and it's worse than that.
  Meera logs in on server A. Her next request lands on server B, which has
  never heard of her ticket. She's logged out. Next request goes back to A and
  she's logged in again. Half your users see random logouts.

So point it at something real:

```js
const RedisStore = require("connect-redis").default;

store: new RedisStore({ client: redis, ttl: 86400 }),
```

Keep the store's `ttl` and the cookie's `maxAge` in agreement. If the ticket
outlives the shelf, users get a confusing 401. If the shelf outlives the
ticket, you're paying to store sessions nobody can reach.

---

## The whole thing, for production

```js
app.set("trust proxy", 1);

app.use(
  session({
    store: new RedisStore({ client: redis, ttl: 86400 }),
    name: "sid",
    secret: [process.env.SESSION_SECRET, process.env.SESSION_SECRET_OLD].filter(Boolean),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
      path: "/",
    },
  })
);
```
