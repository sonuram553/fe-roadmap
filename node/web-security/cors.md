# Cross-Origin Resource Sharing (CORS)

**A server's way of saying "it's fine, let that other site read my
response."** CORS doesn't block anything — the browser's same-origin policy
does that already. CORS is the set of response headers that *relaxes* it,
one origin at a time.

```
Access-Control-Allow-Origin: https://app.example.com
```

## What an "origin" is

Scheme + host + port. All three must match, exactly:

| URL | Same origin as `https://app.example.com`? |
| --- | --- |
| `https://app.example.com/users` | yes — path doesn't count |
| `http://app.example.com` | no — different scheme |
| `https://api.example.com` | no — different host |
| `https://app.example.com:8443` | no — different port |

"Same site" is a looser rule (registrable domain, used by `SameSite`
cookies) and is not the same thing — `app.example.com` and
`api.example.com` are same-site but cross-origin.

## What the same-origin policy actually stops

This is the part people get backwards. The browser **sends** cross-origin
requests all day long — that's how images, stylesheets, fonts, `<script
src>` and form submissions work. What it refuses is **letting your
JavaScript read the response** of one.

```js
// on https://evil.com
const res = await fetch("https://bank.com/account", { credentials: "include" });
const data = await res.json();   // ← blocked here, not at the request
```

The request went out. The cookies went with it. The server processed it and
answered. The browser then looked for permission to hand the body to
`evil.com`'s script, found none, and threw the response away.

Two consequences fall straight out of that:

- **CORS is not a defense against anything happening on your server.** The
  side effect already happened. That's exactly why CORS is not a CSRF
  defense — see [csrf.md](csrf.md).
- **A CORS error is not your API rejecting the caller.** Your handler
  probably ran and returned `200`. The block is downstream, in the browser,
  and only in the browser — `curl` and server-to-server calls never see it.

## Simple requests

Some cross-origin requests are sent with no permission check at all. The
rule for which ones looks arbitrary until you see where it comes from.

### Why the exemption exists

A `<form>` or an `<img>` on any page has been able to fire a cross-origin
request since 1995, without asking anyone:

```html
<!-- on evil.com, no permission needed, always worked -->
<form action="https://api.example.com/x" method="POST"> ... </form>
<img src="https://api.example.com/track?id=1">
```

The web can't take that back. So for a request your server was **already
reachable by** through plain HTML, asking permission first would protect
nothing — the exposure predates CORS. The browser sends those straight
through and checks only whether script may *read* the answer.

Anything a form can't express — `DELETE`, an `Authorization` header, a JSON
body — is a **new** capability that `fetch` and `XMLHttpRequest` introduced.
Those the browser holds back until the server confirms it expects them.
That's the preflight, below.

So the real question is: **could a plain HTML form or image have sent this?**
If yes, no preflight.

### The exact conditions

All of these must hold. One violation anywhere means a preflight.

**1. The method is `GET`, `HEAD`, or `POST`.** Those are the only ones HTML
can produce. `PUT`, `PATCH`, `DELETE` preflight unconditionally.

**2. Script set no request header outside the safelist.** The safelist is
short and exhaustive:

| Header | Restriction |
| --- | --- |
| `Accept` | ≤ 128 bytes, no CORS-unsafe bytes |
| `Accept-Language` | ≤ 128 bytes, only `0-9 A-Z a-z`, space and `*,-.;=` |
| `Content-Language` | same as `Accept-Language` |
| `Content-Type` | ≤ 128 bytes, **and** one of the three values below |
| `Range` | a simple byte range only (`bytes=0-100`) |

("CORS-unsafe bytes" are control characters plus `` "(),/:;<=>?@[\]{} ``.)

`Authorization` is deliberately **not** on that list. Nor is
`X-Requested-With`, `X-Api-Key`, or any header you invent.

**3. `Content-Type`, if set, is one of exactly three values:**

```
application/x-www-form-urlencoded
multipart/form-data
text/plain
```

Exactly the three a `<form>` can produce via its `enctype` attribute — the
"could a form have sent this?" test, made literal. `application/json` is
not among them, which is why **almost every real API call preflights.**

**4. No upload progress listener.** Registering anything on `xhr.upload`
(`onprogress`, `onload`) disqualifies the request — a form submission offers
no such visibility into the upload.

**5. The body is not a `ReadableStream`** (fetch upload streaming).

### What does *not* count against you

Two things people expect to trigger a preflight and don't:

- **Cookies.** `credentials: "include"` does not make a request non-simple.
  Cookies are attached by the browser, not set by script, so they are never
  weighed against the header safelist. A credentialed simple POST goes
  straight to your handler.
- **Any other browser-controlled header** — `Origin`, `Referer`, `Cookie`,
  `Host`, `User-Agent`, `Connection`. Script is forbidden from setting
  these, so they never disqualify anything.

### Concretely

```js
// NO preflight — form-encoded POST, cookies and all
fetch("https://api.example.com/x", {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ a: "1" }),
});

// NO preflight — FormData sets multipart/form-data itself
fetch(url, { method: "POST", body: new FormData(form) });

// NO preflight — plain GET
fetch("https://api.example.com/users");

// PREFLIGHT — content-type not on the list
fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });

// PREFLIGHT — method
fetch(url, { method: "DELETE" });

// PREFLIGHT — non-safelisted header, even on a plain GET
fetch(url, { headers: { Authorization: "Bearer x" } });

// PREFLIGHT — upload progress listener
xhr.upload.onprogress = fn;
```

The `Authorization` case catches people out: a bare `GET` with a bearer
token is not a simple request.

### What the exchange looks like

```
GET /users HTTP/1.1
Host: api.example.com
Origin: https://app.example.com     ← browser adds this, you can't forge it
```

```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://app.example.com
```

Origin matches → the browser hands over the body. No match, or header
missing → `TypeError: Failed to fetch`. Either way your handler already ran.

## Preflight

For anything else, the browser asks permission *first*, with an `OPTIONS`
request, before sending the real one:

```
OPTIONS /users/42 HTTP/1.1
Origin: https://app.example.com
Access-Control-Request-Method: PATCH
Access-Control-Request-Headers: content-type, authorization
```

```
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PATCH, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

Only if that comes back satisfactory does the `PATCH` go out — and the real
response needs `Access-Control-Allow-Origin` again; the preflight's approval
doesn't carry over to it.

`Access-Control-Max-Age` caches the preflight result per (origin, URL,
method) so you don't pay an extra round trip on every call. Browsers cap it
(Chrome at 2 hours, Firefox at 24).

Because the preflight is a genuine "may I?", a preflighted request that gets
refused never reaches your handler at all. That's why a JSON-bodied
cross-origin POST is harder to abuse than a form-encoded one — but treat it
as a side effect, not a defense, for two reasons. A simple request never
preflights in the first place, so the entire CSRF shape sails past
untouched (see [csrf.md](csrf.md)). And the JSON content-type is only
protective if you *enforce* it: an attacker sends

```
Content-Type: text/plain

{"amount": 10000}
```

which is simple, so no preflight — and if your body parser reads it anyway,
the endpoint was never protected. Reject bodies whose `Content-Type` isn't
`application/json` and the property holds; parse whatever arrives and it
doesn't.

## The headers

| Response header | Does what |
| --- | --- |
| `Access-Control-Allow-Origin` | the one required header — a single origin, or `*` |
| `Access-Control-Allow-Methods` | methods allowed on the real request (preflight only) |
| `Access-Control-Allow-Headers` | request headers the caller may send (preflight only) |
| `Access-Control-Allow-Credentials: true` | cookies / `Authorization` may ride along, and the response may be read |
| `Access-Control-Expose-Headers` | which response headers JS may read beyond the safelist |
| `Access-Control-Max-Age` | seconds to cache the preflight |

Without `Expose-Headers`, script can only read `Cache-Control`,
`Content-Language`, `Content-Length`, `Content-Type`, `Expires`,
`Last-Modified` and `Pragma`. Your `X-Total-Count` or `X-Request-Id` is
present on the wire and invisible to `res.headers.get()` until you name it.

## Credentials change the rules

By default `fetch` sends **no** cookies cross-origin. The caller has to ask:

```js
fetch("https://api.example.com/me", { credentials: "include" });
```

and the server has to agree:

```
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Credentials: true
```

With credentials in play, the wildcard is banned everywhere — `*` is
rejected for `Allow-Origin`, `Allow-Headers`, `Allow-Methods` and
`Expose-Headers` alike. You must name the origin. This is deliberate: it
forces you to make a decision per origin rather than opening the door to
the whole web.

## In Express

```js
const cors = require("cors");

const ALLOWED = new Set([
  "https://app.example.com",
  "https://admin.example.com",
]);

app.use(cors({
  origin: (origin, cb) => {
    // no Origin header = same-origin, curl, server-to-server → let it through
    if (!origin || ALLOWED.has(origin)) return cb(null, true);
    cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
  exposedHeaders: ["X-Total-Count"],
  maxAge: 86400,
}));
```

The `cors` middleware answers preflights for you, and sets `Vary: Origin`
when the allowed origin depends on the request. Register it **before** your
routes — a preflight that falls through to a 404 fails the whole call.

Hand-rolled, the same thing:

```js
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  }
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Max-Age", "86400");
    return res.sendStatus(204);
  }
  next();
});
```

## Misconfiguration is the actual vulnerability

CORS is only dangerous when you loosen it too far. The classic:

```js
// DON'T
res.setHeader("Access-Control-Allow-Origin", req.headers.origin);  // reflects anything
res.setHeader("Access-Control-Allow-Credentials", "true");
```

Reflecting the caller's `Origin` unconditionally means *every* site is an
allowed origin. Combined with credentials, any page the victim visits can
read their authenticated responses from your API — their profile, their
messages, their CSRF token. `*` with credentials is rejected by the browser;
reflection has the same effect and is not.

Sloppy matching is the other half:

```js
if (origin.endsWith("example.com"))        // matches evil-example.com
if (/example\.com/.test(origin))           // matches example.com.evil.io
if (origin.startsWith("https://app"))      // matches https://app.evil.com
```

Compare full origin strings against a fixed set. If you must build the set
dynamically, parse with `new URL(origin)` and compare `.origin`, never a
substring.

## Gotchas

- **`Vary: Origin` is mandatory when the header varies.** Without it a
  shared cache (CDN, proxy) can serve one origin's approved response to
  another origin, or cache a "no headers" response and lock everyone out.
- **The failure message is deliberately useless.** The browser gives script
  a bare `TypeError` with no status and no body — the real reason is only in
  the devtools console. Reading a 500 as "CORS error" is a common wrong
  turn; check the Network tab for the actual response.
- **Redirects re-run the check.** If the request is redirected, the new
  destination needs its own CORS headers, and preflighted requests can't
  follow redirects at all in some browsers.
- **`Origin: null` is not a friend.** Sandboxed iframes, `file://` pages and
  some redirect chains send it. Allowlisting `null` lets any attacker with a
  sandboxed iframe in — never do it.
- **Error responses need the headers too.** A 401 or 500 without
  `Access-Control-Allow-Origin` is unreadable by the client, so your app
  reports a network error instead of the real problem. Set CORS headers in
  your error handler as well.
- **`mode: "no-cors"` doesn't bypass anything.** It returns an *opaque*
  response — status `0`, no body, no headers. Useful for fire-and-forget,
  useless for reading data.
- **CORS is not authorization.** It says which *origins* may read a
  response, not which *users* may. An open API endpoint is open to `curl`
  regardless — auth still has to be checked server-side. See
  [authentication.md](authentication.md).

## Quick reference

| Question | Answer |
| --- | --- |
| Does CORS stop the request reaching my server? | No — only preflight refusal does, and only for non-simple requests |
| Does it protect against CSRF? | No — see [csrf.md](csrf.md) |
| Can `*` be used with cookies? | No — name the origin explicitly |
| Why can't my JS read `X-Request-Id`? | Not on the safelist — add `Access-Control-Expose-Headers` |
| Why does `curl` work but the browser doesn't? | CORS is enforced by browsers only |
| Safe to reflect `req.headers.origin`? | Only against an allowlist; never blindly with credentials |

---

See [csrf.md](csrf.md) for what CORS doesn't stop, [csp.md](csp.md) for
restricting where your page may send data, and
[clickjacking.md](clickjacking.md) for framing.
