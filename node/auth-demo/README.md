# Auth demos — session/cookie vs JWT

Two minimal, runnable Express servers that put [`../authentication.md`](../authentication.md)
into practice. Each is self-contained (in-memory "database", no Postgres/Redis
needed) so you can run it and hit it with `curl` in a couple of minutes.

```bash
cd node/auth-demo
npm install
```

---

## 1. Session + cookie (`npm run session`, port 4001)

The cookie holds only an opaque session id; the server keeps the real state.

```bash
npm run session
```

```bash
# 1. Signup
curl -i -X POST localhost:4001/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"a@test.com","password":"hunter2"}'

# 2. Login — save the cookie to a jar so curl resends it like a browser would
curl -i -c cookies.txt -X POST localhost:4001/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"a@test.com","password":"hunter2"}'
# Response has no token in the body — check with -i that a Set-Cookie:
# connect.sid=... header came back. That cookie IS the credential.

# 3. Call a protected route — no Authorization header, just the cookie
curl -i -b cookies.txt localhost:4001/me

# 4. Without the cookie, it's rejected
curl -i localhost:4001/me   # 401

# 5. Logout — destroys the session server-side and clears the cookie
curl -i -b cookies.txt -X POST localhost:4001/logout

# 6. The old cookie is now dead even though the browser still "has" it
curl -i -b cookies.txt localhost:4001/me   # 401
```

What to notice:

- `/me` never sees a token — Express reads the cookie, looks up the session,
  and `req.session.userId` is just... there.
- Step 6 is the point of session auth: logout is **instant and total**
  because the record it depends on no longer exists.
- Restart the server and re-run step 3 — the cookie is now meaningless,
  because `MemoryStore` (the default) forgets everything on restart. That's
  exactly why it's dev-only; a real deployment points `store:` at Redis.

---

## 2. JWT (`npm run jwt`, port 4002)

The access token is self-contained and signed; nothing is looked up to
validate it. Because of that, a separate **refresh token** is tracked
server-side — it's the only handle you have on revocation.

```bash
npm run jwt
```

```bash
# 1. Signup
curl -i -X POST localhost:4002/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"b@test.com","password":"hunter2"}'

# 2. Login — response body carries both tokens directly (no cookie at all)
curl -s -X POST localhost:4002/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"b@test.com","password":"hunter2"}' | tee tokens.json
```

Pull the tokens out for the next commands:

```bash
ACCESS=$(node -pe "require('./tokens.json').accessToken")
REFRESH=$(node -pe "require('./tokens.json').refreshToken")
```

```bash
# 3. Call a protected route with the access token
curl -i localhost:4002/me -H "Authorization: Bearer $ACCESS"

# 4. Wait 2 minutes (the demo sets a short expiry on purpose) and retry
curl -i localhost:4002/me -H "Authorization: Bearer $ACCESS"   # 401 Token expired

# 5. Use the refresh token to get a new pair — this ROTATES it
curl -s -X POST localhost:4002/refresh \
  -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$REFRESH\"}" | tee tokens.json
ACCESS=$(node -pe "require('./tokens.json').accessToken")
NEW_REFRESH=$(node -pe "require('./tokens.json').refreshToken")

# 6. The old refresh token is now dead (single use) — reusing it fails
curl -i -X POST localhost:4002/refresh \
  -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$REFRESH\"}"   # 401 — this is the theft-detection signal

# 7. Logout revokes the refresh token server-side
curl -i -X POST localhost:4002/logout \
  -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$NEW_REFRESH\"}"

# 8. But the access token you already hold still works until it expires —
#    there's nothing server-side to delete for it. This is the hard part
#    of "JWT logout" that authentication.md §3 calls out.
curl -i localhost:4002/me -H "Authorization: Bearer $ACCESS"   # still 200, if within 2 min
```

What to notice:

- Step 3 needs no DB lookup — `jwt.verify` alone proves the token is valid.
  That statelessness is JWT's entire selling point.
- Step 4/6 show the tradeoff: an expired access token is simply dead, but a
  *stolen but not-yet-expired* one is equally unstoppable — there's no
  record to delete.
- Step 6 is refresh-token rotation's reason to exist: reuse of a consumed
  token means two parties now hold "the same" credential, which is exactly
  the theft signal that lets you force a re-login on the whole family.

---

## Side by side

| | Session | JWT |
| --- | --- | --- |
| Credential in | `Set-Cookie` header | JSON response body |
| Sent back via | cookie (automatic) | `Authorization: Bearer` (manual) |
| `/me` needs | a session-store lookup | just the signing secret |
| Logout | instant, one call | only revokes the refresh token; access token outlives it |
| Server state | one row per session | one row per refresh token (none for the access token) |

Clean up the scratch file when done: `rm node/auth-demo/tokens.json node/auth-demo/cookies.txt`.
