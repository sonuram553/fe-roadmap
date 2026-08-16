# Random IDs with Node's `crypto` module

Anything a user must not be able to guess — a session id, a password
reset link, an API key — has to come from a **cryptographically secure**
random source. Node ships one in the built-in `crypto` module.

```js
const crypto = require("node:crypto"); // CJS
import crypto from "node:crypto"; // ESM
```

Since Node 19 a subset (the Web Crypto API) is also available as a
**global** `crypto`, so `crypto.randomUUID()` works with no import at all
— same function you'd call in a browser.

---

## 1. Why not `Math.random()`

**PRNG** (pseudo-random number generator) — a deterministic algorithm
that produces number sequences that *look* random but are fully
determined by an internal state. Given the same seed/state, it always
produces the same sequence. Fast and statistically well-distributed,
but **predictable** if you know or can recover the state.

**CSPRNG** (cryptographically secure PRNG) — a PRNG built to survive
an attacker who sees its outputs. The core guarantee: even with many
past outputs in hand, you cannot predict the next one or recover the
internal state, because it's continuously reseeded from real OS
entropy and built from primitives designed to resist exactly that
kind of analysis.
```js
Math.random(); // 0.8371926...
```

`Math.random()` is a **PRNG**, not a **CSPRNG**. In V8 it's xorshift128+:
a small integer state advanced by shifts and XORs. It's fast and evenly
distributed, which is all a game or an animation needs — but it is
completely predictable:

- V8 generates numbers in batches of 64 and hands them out **in reverse
  order**, so an attacker who sees a few outputs can often derive ones you
  already handed to somebody else.

So `Math.random()` for a password-reset token means anyone who signs up,
requests their own reset, and reads their token can compute yours.

| Source | Secure? | Use for |
| --- | --- | --- |
| `Math.random()` | ❌ | jitter, shuffling a UI list, sampling |
| `crypto.randomBytes()` | ✅ | tokens, keys, salts, session ids |
| `crypto.randomUUID()` | ✅ | record ids, correlation ids |
| `crypto.randomInt()` | ✅ | OTP codes, random picks |
| `crypto.getRandomValues()` | ✅ | same, portable to the browser |

The secure ones pull from the OS entropy pool (`getrandom(2)` on Linux,
`BCryptGenRandom` on Windows) — the same source the kernel uses for TLS
keys.

---

## 2. `randomUUID()` — the default for record ids

```js
crypto.randomUUID();
// '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'
```

An RFC 4122 **version 4** UUID: 36 characters, 122 random bits (6 bits are
fixed version/variant markers). Collisions are a non-issue — you'd need on
the order of 2⁶¹ ids before a 50 % chance of any pair colliding.

```js
crypto.randomUUID({ disableEntropyCache: true });
```

By default Node pre-generates UUIDs in a small cache for speed. That cache
is still filled from the CSPRNG, so it's safe; disable it only if you're
generating so many that you'd rather not hold unused ones in memory.

**Gotcha — UUIDv4 as a database primary key.**

UUIDv4 is 122 bits of pure randomness, so two consecutively-generated
UUIDs have essentially no relationship to each other — they land at
arbitrary points in the ID space.

Why that hurts as a primary key: most databases (Postgres, MySQL/InnoDB)
store the primary key as a B-tree, physically ordered by key value. When
IDs are sequential (1, 2, 3...) or time-ordered, each new insert goes to
the rightmost edge of the tree — cheap, no reshuffling needed.

With a random UUIDv4 PK, each insert lands at a random position inside
the tree instead of the edge. That forces:

- **Page splits** — the B-tree page where the new key belongs is already
  full, so the DB has to split it into two, which is extra I/O.
- **Fragmentation** — related rows (inserted around the same time) end up
  scattered across many disk pages instead of sitting together.
- **Cache pressure** — since recently-inserted rows aren't clustered,
  more distinct pages have to be pulled into memory to serve queries
  touching recent data, so the "hot" working set no longer fits in the
  buffer cache.

Two fixes:

1. **Auto-increment PK + UUID as public `external_id`** — keep the
   sequential integer doing what B-trees like (fast, clustered inserts)
   internally, but never expose it externally (it leaks row
   counts/creation order). Expose the UUID instead for anything user- or
   API-facing.
2. **Time-ordered ID instead of UUIDv4** — UUIDv7 or ULID encode a
   timestamp in the leading bits, so IDs generated close in time sort
   close together and inserts still land at the right edge of the index,
   giving you both randomness (for the non-guessable part) and insert
   locality. Node's built-in `crypto.randomUUID()` only generates v4, so
   this requires the `uuid` npm package's `uuidv7()` or the `ulid`
   package.

---

## 3. `randomBytes()` — the general-purpose token generator

```js
crypto.randomBytes(32);                    // <Buffer a3 f1 ...> 32 bytes
crypto.randomBytes(32).toString("hex");    // 64 chars, [0-9a-f]
crypto.randomBytes(32).toString("base64url"); // 43 chars, URL-safe
```

Encoding only changes how the *same* bits are printed:

| Encoding | Bits per char | 32 bytes becomes | Notes |
| --- | --- | --- | --- |
| `hex` | 4 | 64 chars | unambiguous, easy to eyeball |
| `base64` | 6 | 44 chars | contains `+ / =` — must be escaped in URLs |
| `base64url` | 6 | 43 chars | `- _`, no padding — safe in URLs and cookies |

**How many bytes?** 16 bytes (128 bits) is the accepted floor for a secret
token; 32 bytes (256 bits) is the comfortable default and costs nothing.
Don't derive length from "how long should the string look" — derive it
from bits of entropy.

### Sync vs async

```js
const buf = crypto.randomBytes(32);              // sync — returns a Buffer

crypto.randomBytes(32, (err, buf) => { ... });   // async — libuv threadpool
```

The sync form blocks the event loop while the OS produces bytes. For the
small sizes above that's microseconds and completely fine. The async form
matters when you request large buffers or generate many per request — it
moves the work to the threadpool. There's no promise version; wrap it with
`util.promisify` if you want `await`.

### `getRandomValues` — the portable spelling

```js
const bytes = crypto.getRandomValues(new Uint8Array(16));
```

Web Crypto's version. Identical guarantees, fills a typed array you own,
and the **exact same code runs in the browser** — worth preferring in code
shared between client and server. Capped at 65 536 bytes per call.

---

## 4. `randomInt()` — random numbers without modulo bias

Wrong way:

```js
crypto.randomBytes(1)[0] % 10; // ❌ biased
```

A byte has 256 possible values: 0 through 255. Walk through `% 10` in
groups of 10 — 0-9 → remainders 0-9, 10-19 → remainders 0-9, and so on.
That repeats cleanly 25 full times (25 × 10 = 250, using byte values
0-249), giving every remainder 0-9 exactly 25 chances so far, all equal.

But 256 doesn't divide evenly by 10 — there are **6 values left over**:
250-255. Their remainders are 0, 1, 2, 3, 4, 5. So remainders 0-5 each
pick up **one extra** chance from this leftover batch (26 total), while
6-9 stay at 25. That's the whole bias: 256 isn't a clean multiple of 10,
so the leftover wraps around and lands unevenly on the low remainders.
For something like a lottery or a shuffled deck, that skew is a real
vulnerability.

```js
crypto.randomInt(10);        // 0–9,   max is EXCLUSIVE
crypto.randomInt(1, 7);      // 1–6,   a fair die
crypto.randomInt(0, 1_000_000, (err, n) => { ... }); // async
```

`randomInt` uses rejection sampling — it discards values that would land
in the biased tail and draws again — so every outcome is equally likely.

Six-digit OTP:

```js
const otp = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
```

(A 6-digit code is only ~20 bits, so it leans on a short expiry and an
attempt limit, not on its own entropy.)

---

## 5. Where you actually use these

| Use case | Generator | Notes |
| --- | --- | --- |
| Session id | `randomBytes(32).base64url` | usually handled for you by `express-session` |
| Password reset / email verification token | `randomBytes(32).hex` | short TTL, single use, store **hashed** |
| API key | `randomBytes(32).base64url` | prefix it, e.g. `sk_live_…`, so leaks are greppable |
| CSRF token | `randomBytes(32).base64url` | per session |
| Salt for password hashing | `randomBytes(16)` | bcrypt/argon2 do this for you — see [password-hashing.md](password-hashing.md) |
| DB record id | `randomUUID()` | or UUIDv7/ULID for index locality |
| Uploaded file name | `randomUUID()` | never reuse the user's filename — path traversal |
| OTP / 2FA code | `randomInt(0, 1e6)` | pair with expiry + rate limit |

### Token pattern, end to end

```js
const crypto = require("node:crypto");

function createToken() {
  const token = crypto.randomBytes(32).toString("base64url"); // → user
  const hash = crypto.createHash("sha256").update(token).digest("hex"); // → DB
  return { token, hash };
}

// issuing a reset link
const { token, hash } = createToken();
await db.resets.insert({
  userId,
  tokenHash: hash,
  expiresAt: new Date(Date.now() + 15 * 60_000),
  usedAt: null,
});
sendEmail(`https://app.example.com/reset?token=${token}`);
```

Three things are doing work here:

1. **Only the hash is stored.** A leaked database (or a stray log line)
   doesn't hand over working reset links.
2. **Plain SHA-256 is correct here** — unlike a password, the token has
   256 bits of entropy, so there is nothing to brute-force and no reason to
   pay for a slow hash. See [password-hashing.md](password-hashing.md) for
   why passwords are the opposite case.
3. **Expiry + single use** (`usedAt`) bound the damage window.

---

## Quick reference

```js
crypto.randomUUID()                          // '9b1deb4d-…'  record ids
crypto.randomBytes(32).toString("hex")       // 64 hex chars  tokens
crypto.randomBytes(32).toString("base64url") // 43 chars      URL-safe tokens
crypto.getRandomValues(new Uint8Array(16))   // portable to the browser
crypto.randomInt(1, 7)                       // unbiased 1–6
crypto.createHash("sha256").update(t).digest("hex") // store this, not t
crypto.timingSafeEqual(bufA, bufB)           // constant-time compare
```

Rules of thumb:

- Security-relevant randomness → `crypto`, never `Math.random()`.
- 128 bits minimum for a secret, 256 bits when in doubt.
- Store the **hash** of any token you hand out.
- Give every token an expiry and a single-use flag.
