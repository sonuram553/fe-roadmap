# Password hashing, salting and rainbow tables

Rule zero: **you never store a password.** You store something that lets
you *check* a password, and from which the password cannot be recovered.

---

## 1. Why not just store it? Why not encrypt it?

Plaintext is obvious: one leaked backup, one SQL injection, one over-eager
log line, and every account is gone — plus, because people reuse passwords,
so are their email and bank accounts.

**Encryption is nearly as bad**, and it's the trap people fall into.
Encryption is *reversible by design*: there is a key, the key must live
somewhere your server can read it, and whatever reached your database will
usually reach your key too. You also don't *need* reversibility — you never
have to display a password back, only answer "is this the right one?".

That's exactly what a hash does.

| | Encryption | Hashing |
| --- | --- | --- |
| Direction | two-way (key required) | one-way |
| Output | varies with input length | fixed length |
| Purpose | keep data readable *later* | prove a value matches |
| For passwords | ❌ | ✅ |

---

## 2. What a hash function gives you

A cryptographic hash is deterministic (same input → same output,
always), fixed-length, and has the **avalanche** property — one changed
bit changes about half the output bits:

```
sha256("hunter2")  → f52fbd32b2b3b86ff88ef6c490628285f482af15…
sha256("hunter3")  → 0b0e1ba4a5b9b7fbe37eeb6f6b0ec26bdea3fb3a…
```

Login then becomes: hash what they typed, compare with the stored hash,
never learn the original.

```js
// the shape of it — NOT what you should ship, see §3
const hash = sha256(password);
if (hash === user.passwordHash) { /* logged in */ }
```

---

## 3. Why SHA-256 is the wrong hash here

SHA-256 is *too fast*. That sounds like a strange complaint, so here is
the reasoning.

**Nobody reverses a hash — they guess.** An attacker who steals your
database can't turn `f52fbd32…` back into a password. What they can do is
take a guess, hash it, and see if it matches. Then guess again. This is
called an **offline attack**: they have your hashes on their own machine,
so there's no login screen, no rate limit, and nothing to stop them
trying as fast as their hardware allows.

**Guessing works because passwords aren't random.** In theory there are
astronomically many 8-character passwords. In practice people pick
dictionary words, names, and `Summer2024!`. A wordlist of a few hundred
million entries covers a large share of real accounts — so the attacker
isn't searching everything, just the likely stuff.

**So the only thing that matters is guesses per second.** And SHA-256 was
built for speed (it's great for checking a downloaded file hasn't been
corrupted). A single machine with a few GPUs does **billions** of SHA-256
hashes per second, which chews through that wordlist in seconds.

MD5 and SHA-1 are worse still — even faster, and separately broken.

### The fix: make hashing slow on purpose

Flip the trade-off. Use a hash that is **deliberately slow and
memory-hungry**, tuned so one hash takes something like 50–250 ms:

- For a real user logging in, one hash runs once. 100 ms is unnoticeable.
- For an attacker, every guess costs 100 ms. Billions per second becomes
  roughly ten per second per core.

Same wordlist, but now it takes centuries instead of seconds. Making it
*memory*-hungry matters too: GPUs get their speed from running thousands
of tiny cores in parallel, and there isn't enough memory to give each one
a big chunk — so a memory-heavy hash blunts exactly the hardware
attackers rely on.

This deliberate slowness is called **key stretching**, and it's the whole
point of bcrypt, scrypt and Argon2. They come with a tunable **cost
factor**: as hardware gets faster you raise the number, and the hash gets
slower again.

---

## 4. Rainbow table attacks

If everyone hashes with plain SHA-256, then `sha256("password123")` is the
*same string* in every database on earth. So an attacker precomputes it
once — for hundreds of millions of common passwords — and cracking becomes
a lookup instead of a computation.

A **rainbow table** is the space-optimised form of that idea. Storing every
hash is huge, so instead you store *chains*: alternate hashing with a
"reduction" function that maps a hash back to a candidate password, run
that thousands of times, and keep only the first and last entry of each
chain. To crack a hash you reduce/hash forward until you hit a stored chain
end, then walk that chain from its start to find the password. It's a
classic time–memory trade-off — much smaller than a full table, a bit
slower to query.

The property the attack depends on: **the same password always produces
the same hash**. Break that, and precomputation is worthless.

---

## 5. Salting

A **salt** is a unique random value mixed into each password before
hashing, and stored next to the resulting hash.

```
alice: hash("Passw0rd" + "x7Kq2mNp") = a3f1…
bob:   hash("Passw0rd" + "9dLm4Rt2") = 8c2e…   ← same password, different hash
```

What it buys you:

- **Rainbow tables die.** A precomputed table is per-salt, so an attacker
  would need to build a fresh one for every user — that's just brute force
  again, with the shortcut removed.
- **No cross-user leverage.** Cracking Alice tells you nothing about Bob,
  and identical hashes no longer reveal identical passwords.
- **Attack cost scales with user count** instead of being amortised across
  the whole table.

Properties of a good salt:

- **Unique per user** (per password, in fact — regenerate on change).
- **Random**, from a CSPRNG — see [crypto-random-ids.md](crypto-random-ids.md).
- **16 bytes** is plenty.
- **Not secret.** It's stored in the clear right beside the hash, and that
  is fine — its job is uniqueness, not concealment.

You do **not** implement this yourself: bcrypt, scrypt and Argon2 generate
the salt and pack it into the output string for you.

---

## 6. The algorithms you should use

| Algorithm | Hard on | Notes |
| --- | --- | --- |
| **Argon2id** | CPU **and memory** | Password Hashing Competition winner; today's first choice |
| **scrypt** | CPU and memory | in Node core, no dependency |
| **bcrypt** | CPU | 25+ years of scrutiny, everywhere, still fine |
| **PBKDF2** | CPU only | weakest of the four; pick it when FIPS compliance forces you |

"Memory-hard" is the modern refinement. bcrypt is slow on a CPU but a GPU
or ASIC can still run thousands of copies in parallel. Argon2 and scrypt
also demand tens of megabytes *per hash*, and memory is what specialised
hardware can't cheaply multiply — so parallel cracking gets much more
expensive.

Current OWASP baselines:

| Algorithm | Parameters |
| --- | --- |
| Argon2id | m = 19 MiB, t = 2, p = 1 |
| bcrypt | cost ≥ 10 (12 is the common default) |
| scrypt | N = 2¹⁷, r = 8, p = 1 |
| PBKDF2-HMAC-SHA256 | ≥ 600 000 iterations |

Calibrate rather than copy: pick the highest cost that keeps a hash under
~250 ms on your production hardware, and revisit it yearly — hardware gets
faster, so the number only goes up.

---

## 7. Gotchas

- **Client-side hashing is not a substitute.** Whatever the client sends
  *is* the password from the server's perspective — an attacker who steals
  the DB replays the stored value directly. Hash on the server, always. TLS
  is what protects the wire.
- **Don't reject passwords for "complexity".** NIST's current guidance:
  require length (8+, ideally 12+), allow everything up to ~64 chars
  including spaces and emoji, check against known-breached lists (e.g. the
  Pwned Passwords k-anonymity API), and drop forced periodic rotation —
  it just produces `Password1` → `Password2`.
- **Normalise before hashing** if you allow non-ASCII: `password.normalize("NFKC")`,
  or the same characters typed on a different keyboard won't match.
- **Never log the password**, and don't log `req.body` on auth routes.
- **On password change or reset, invalidate every other session** — that's
  the whole point of changing it after a suspected compromise.
- **Don't reveal the hash anywhere** — not in an API response, not in an
  admin UI, not in an error.
- **`user && await bcrypt.compare(...)`** short-circuits, so unknown emails
  answer far faster than real ones. Compare against a fixed dummy hash in
  that branch if you want the timings to match — see
  [authentication.md](authentication.md).

---

## Quick reference

| Term | One line |
| --- | --- |
| Hash | one-way fixed-length digest of the password |
| Salt | unique random per-user value, stored with the hash, kills rainbow tables |
| Rainbow table | precomputed hash → password chains; useless once salted |
| Key stretching | making each guess deliberately slow (cost / time / memory) |
| Cost factor | the tuning knob; `12` in bcrypt = 2¹² rounds |
| Memory-hard | also demands RAM per hash, so GPUs/ASICs can't parallelise cheaply |
