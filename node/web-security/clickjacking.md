# Clickjacking

An attacker puts your page inside an invisible iframe on their own site,
and gets the user to click a button on it without realising.

```html
<!-- hosted on evil.com -->
<style>
  iframe  { opacity: 0; position: absolute; top: 0; left: 0; width: 400px; height: 300px; }
  button  { position: absolute; top: 120px; left: 90px; }
</style>
<iframe src="https://real-bank.com/transfer-confirm"></iframe>
<button>Click to win a prize!</button>
```

The victim sees the button. The click lands on the iframe.

## The setup

Three things are stacked in the attacker's page:

1. **Your real page**, in an `<iframe>` on `evil.com`. It's genuinely your
   site — your HTML, your CSS, your session cookie, your logged-in user.
   Nothing is faked or copied.
2. **`opacity: 0`** on that iframe. It is still there, still rendered, still
   fully interactive — it just isn't painted. Invisible is not absent.
3. **The attacker's bait button**, visible, placed at the same screen
   position as your button behind it — same coordinates, one on top of the
   other.

## Why the click lands on the wrong thing

The browser dispatches a click to whatever element is topmost at those
coordinates — and topmost is decided by stacking order and hit-testing,
**not by what's visible**. A fully transparent element still takes part in
hit-testing; only `pointer-events: none` or `visibility: hidden` opt out,
and `opacity: 0` does neither. So the invisible iframe swallows the click
and delivers it to your page's button at that exact spot.

The attacker's remaining work is pure geometry: find where "Confirm
transfer" lands inside the frame, then place the bait so the cursor is over
both at once. The user aims at "Click to win a prize!" and hits "Confirm
transfer".

## Why the usual defenses don't help

Follow the resulting request through your stack. It comes from **your own
origin** — the framed document *is* your page. It carries the **victim's
real session cookie**, sent under normal same-site rules. It carries a
**valid CSRF token**, because your server issued that token to this real
page. **No script was injected** anywhere. And the user **genuinely
clicked**, so there is no bot signature, no replay, no anomaly.

Nothing about the request is forged, so nothing that inspects the request
can catch it:

| Defense | Why it misses |
| --- | --- |
| `SameSite` cookies | the click happens *inside* your own frame — it's a same-site interaction as far as the cookie rules are concerned |
| CSRF tokens | the framed page is your real page, so it carries your real, correctly-issued token |
| CSP `script-src` | no script is injected; see [csp.md](csp.md) |
| Authentication | the session is the victim's own, and they are genuinely logged in |

Every check answers "legitimate" — and each is answering *correctly*.
Authentication asks *who*; CSRF tokens ask *did this page issue this form*.
Both are satisfied. The lie is one level up, in **what the user believed
they were clicking**, and no header on the request records that.

Compare [csrf.md](csrf.md): CSRF forges the *request*, clickjacking forges
the *context the user is clicking in*. Both end with "the attacker's action
runs as you," but only one of them is fixable at the request layer.

## Mitigation

Since the request itself is unimpeachable, the only place to intervene is
*before* the framing happens: when the browser fetches your page, tell it
this document may not be rendered inside someone else's frame. No frame, no
invisible layer to click through, no attack.

Two headers, one modern and one legacy — send both:

```
Content-Security-Policy: frame-ancestors 'none'
X-Frame-Options: DENY
```

`frame-ancestors` is the CSP directive and the one that matters; it takes an
origin list, so use it if you legitimately embed your own pages:

```
Content-Security-Policy: frame-ancestors 'self'
Content-Security-Policy: frame-ancestors 'self' https://partner.example.com
```

`X-Frame-Options` only understands `DENY` and `SAMEORIGIN` (its
`ALLOW-FROM` variant is dead — no modern browser honours it), which is
exactly why `frame-ancestors` replaced it. Where both are present, browsers
that support `frame-ancestors` ignore `X-Frame-Options`.

In Express, [`helmet`](https://www.npmjs.com/package/helmet) sets
`X-Frame-Options: SAMEORIGIN` and a `frame-ancestors 'self'` default policy
as part of its bundle:

```js
const helmet = require("helmet");
app.use(helmet());
```

Or set it yourself:

```js
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "frame-ancestors 'none'");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});
```

## Gotchas

- **`frame-ancestors` is ignored in a `<meta>` tag.** It only works as an
  HTTP response header — one of the directives that makes `<meta>`-only CSP
  delivery strictly weaker. See [csp.md](csp.md).
- **Frame-busting JavaScript is not a defense.** The classic
  `if (top !== self) top.location = self.location` is defeated by the
  `sandbox` attribute on the iframe, which can block top-level navigation
  while still rendering the page. Use the headers.
- **The header must be on every framable response**, not just the sensitive
  ones — an attacker frames whatever page has the button they want clicked.
- **Cursorjacking / drag-and-drop variants** exist (faking the cursor
  position, or tricking the user into dragging data out of your frame), but
  the same header shuts them all down: no frame, no attack.

---

See [csrf.md](csrf.md) for forged requests, [xss.md](xss.md) for injected
scripts, and [csp.md](csp.md) for the header that carries
`frame-ancestors`.
