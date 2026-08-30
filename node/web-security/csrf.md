# Cross-Site Request Forgery (CSRF)

**The attacker's request runs as you, without your say-so.** They don't need
to read anything and they don't need a vulnerability on your site — they
just need **your browser to send a request you didn't intend**, riding on
credentials it attaches automatically (cookies).

It works because the browser doesn't know the difference between "the user
clicked submit on this site" and "some other site's form auto-submitted to
this site."

```html
<!-- hosted on evil.com; the victim just has to load this page while logged into bank.com -->
<form action="https://bank.com/transfer" method="POST" id="f">
  <input type="hidden" name="to" value="attacker" />
  <input type="hidden" name="amount" value="10000" />
</form>
<script>document.getElementById("f").submit();</script>
```

**Cookies are attached by destination, not by origin.** The browser's rule
is simple and dumb: *this request is going to `bank.com`, so I'll attach my
`bank.com` cookies.* It never asks who started it. The form lives on
evil.com, the user never saw it, a script submitted it automatically — none
of that changes the address on the envelope.

**And the server has no way to tell.** Here is what actually arrives:

```
POST /transfer HTTP/1.1
Host: bank.com
Cookie: session=abc123        ← real, valid, the victim's own
Content-Type: application/x-www-form-urlencoded

to=attacker&amount=10000
```

So "perfectly authenticated" is literal, not sarcastic. Authentication
answers *who are you*, and the answer is correctly "you." What's missing is
**intent** — did you mean to send this? Cookies alone can't answer that,
which is why every mitigation below adds something a cross-site request
can't produce: a token it can't read, an `Origin` header that gives it away,
or a `SameSite` rule that withholds the cookie in the first place.

**No injection vulnerability on the target site is required**: the payload
lives entirely on the *attacker's* site. All CSRF needs is a state-changing
endpoint that trusts ambient cookies without also verifying the request
actually originated from the app itself.

**The example above no longer fires as written.** Browsers now default to
`SameSite=Lax`, so that cross-site POST arrives with no cookie at all — it
is the textbook illustration of the mechanism, not a live exploit. It still
bites where a cookie is explicitly `SameSite=None` (embedded widgets,
cross-domain SSO), or where a `GET` endpoint mutates state.

That is what separates it from [xss.md](xss.md): there the attacker's *code*
runs in your origin, here only their *request* does.

## Mitigations

- **`SameSite` cookies** — the modern, mostly-automatic fix. Controls
  whether a cookie is sent on a cross-site request at all:

  | Value | Sent on cross-site navigation? | Sent on cross-site `<form>`/`fetch`? |
  | --- | --- | --- |
  | `Strict` | never | never |
  | `Lax` (default in modern browsers) | only top-level GET navigations | no |
  | `None` (+ `Secure` required) | yes | yes |

  `Lax` alone kills the classic auto-submitting-POST-form attack above,
  because the cross-site POST simply arrives with no cookie. It doesn't
  help if your app changes state on a `GET` (another reason `GET` must
  never mutate).

- **CSRF tokens (synchronizer token pattern).** Server generates a random
  token per session (or per form), embeds it in the page, and requires it
  back on the mutating request. An attacker's cross-origin form can't read
  it — same-origin policy blocks them from fetching your page's HTML to
  extract it.

  ```html
  <input type="hidden" name="_csrf" value="{{csrfToken}}" />
  ```

  ```js
  if (req.body._csrf !== req.session.csrfToken) return res.status(403).end();
  ```

- **Double-submit cookie.** A stateless variant: send the token both as a
  cookie and as a request header/body field; the server just checks they
  match. Cheaper than server-side storage, slightly weaker (relies on the
  attacker not being able to set/read that cookie, which holds under
  same-origin but breaks if the site has a subdomain injection
  vulnerability).

- **Check `Origin`/`Referer`** on state-changing requests as a
  belt-and-suspenders layer — reject if it's not your own origin. Not
  sufficient alone (headers can be stripped by some proxies/older
  browsers) but cheap and effective in practice.

- **Custom headers on APIs.** A `fetch`/XHR request that sets a custom
  header (`X-Requested-With`, or any app-specific one) can't be replicated
  by a plain HTML `<form>` — simple forms can only send a fixed set of
  headers. This is why pure JSON APIs called only via `fetch` are
  naturally harder to CSRF than form-based endpoints, though it's not a
  substitute for a real token if you also accept `Content-Type:
  application/x-www-form-urlencoded`.

## Gotchas

- **`SameSite=Lax` is now the browser default** for cookies that don't set
  it explicitly — don't rely on that silently; set it yourself so intent
  is visible and consistent across browsers/versions.
- **A CSRF token stored in a `SameSite=None` cookie is not itself
  protected** — `SameSite` and CSRF tokens are complementary, not
  redundant; keep both if you must support cross-site requests (e.g. an
  embedded widget).
- **CORS is not a CSRF defense.** CORS controls whether *JavaScript on
  another origin can read the response* — it says nothing about whether
  the browser sends the request in the first place. A `<form>` POST
  happens regardless of your CORS headers — see [cors.md](cors.md).
- **CSP is not a CSRF defense either.** Different problem — the request is
  genuine and no script is injected, so there is nothing for
  [csp.md](csp.md) to block.

---

See [clickjacking.md](clickjacking.md) for clickjacking — the other way an
attacker gets an action performed as you.
