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
