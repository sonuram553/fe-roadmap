# Signing in with Google (OAuth 2.0 and OIDC)

## The story in one paragraph

Picture a members' club that has no ID scanner of its own. Meera turns up at
the door and the doorman points across the street: *"Go to the booth, they
know you."* The booth belongs to someone else entirely. It already knows
Meera, it already holds her details, and before it says a word to the club it
asks her — in its own words, on its own premises — whether this particular
club may hear them. When she agrees, the booth does **not** shout her details
back across the road. It gives her a numbered paper ticket and sends her back
to the door. The club then walks round to the booth's **back door**, shows its
own staff badge, and swaps the ticket for the details.

That is "Sign in with Google", end to end. Everything else in this note is a
detail of that picture:

- **The club never learns her password.** Only the booth does. That is the
  entire security argument for the redirect.
- **Meera chooses what's shared.** The booth reads out the request — *email
  address*, *profile* — and she can refuse.
- **The ticket passes through her hands**, so it has to be worthless to
  anyone who steals it in transit (§5).
- **The handshake ends at the door.** The booth vouches for her once. Keeping
  her logged in afterwards is still your job (§9).

The one-line comparison against the other strategies is in
[authentication.md](authentication.md) §3. Once the handshake is over you fall
back to a coat-check session ([express-session-config.md](express-session-config.md))
or a wristband token ([jwt-auth.md](jwt-auth.md)) — this note stops where
those two begin. There's no server in
[auth-demo/](auth-demo/) for this one, because a real run needs real Google
credentials and a real browser; the values printed below are generated
locally with the same code you'd use in production.

---

## 1. OAuth is authorization. OIDC is the login.

OAuth 2.0 answers one question: *may this app do something on my behalf?*
"Let this app read my Drive." Delegated access, nothing else. It was never
designed to say who anyone is.

People bolted login onto it anyway. The trick was to take the access token
Google handed back, call an API with it, and treat *"the call worked"* as
proof that the user is who the token belongs to. That's broken. An access
token is a bearer credential — a token some other app obtained, for some
other purpose, from the same user, will also make the call work. Your app
can't tell the difference, and it happily logs the attacker in as the victim.

**OIDC** (OpenID Connect) is the thin, standardised layer that fixes it. It
adds a second token, the `id_token`: a signed statement, *addressed to your
app specifically*, saying who just logged in. So two tokens come back and they
have completely different jobs:

- **`access_token`** — a pass for calling Google's APIs as Meera. Treat it as
  opaque; it isn't for you to read. If you're only doing login, you can throw
  it away.
- **`id_token`** — a **JWT** (a signed, readable token — see
  [jwt-auth.md](jwt-auth.md) §3) that *is* for you to read. Never send it to
  an API as a credential.

Asking for `scope=openid email profile` is what turns a bare OAuth request
into an OIDC one. The literal string `openid` is the switch.

---

## 2. Who's who

Four names show up in every spec paragraph, and they're all in the picture
already:

The **resource owner** is Meera — it's her account, her decision. The
**client** is your app; "client" here means the club, not her browser, which
trips people up constantly. The **authorization server** is the booth,
`accounts.google.com`, the thing she actually logs in to. The **resource
server** is whatever holds the data the pass unlocks — Gmail, Drive, the
`userinfo` endpoint.

Your club gets two things when you register the app in Google Cloud Console:
a **`client_id`**, which is public and travels in URLs, and a
**`client_secret`**, which is the staff badge for the back door and never
leaves your server. You also register your **`redirect_uri`** up front, exactly
— every character, including the port and trailing slash. Google will refuse to
redirect anywhere else, which is what stops someone starting a login with your
`client_id` and having the ticket delivered to their own site.

---

## 3. One login, start to finish

**Step one — she clicks the button.** Your `/auth/google` route doesn't render
anything. It builds a URL and redirects:

```js
const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
url.searchParams.set("client_id", CLIENT_ID);
url.searchParams.set("redirect_uri", "https://club.example/auth/google/callback");
url.searchParams.set("response_type", "code");
url.searchParams.set("scope", "openid email profile");
url.searchParams.set("state", state);   // §4
url.searchParams.set("nonce", nonce);   // §7
res.redirect(url.toString());
```

`response_type=code` is the choice that matters. It says *give her a ticket,
not the goods*. (The old `response_type=token`, which sent real tokens back
through the browser's address bar, is deprecated for exactly the reason you'd
guess.)

**Step two — she's on Google's page.** Not yours. She may already be signed
in, in which case she just sees the consent screen; she may have to type a
password and a 2FA code. Your app is not involved and learns nothing about it.

**Step three — the ticket comes back.** Google redirects her browser to your
registered callback:

```
GET /auth/google/callback?code=4%2F0AVMBsJj…&state=128c4c1a10d4fd74067c37474d3d3ad1&scope=openid+email+profile
```

The `code` is the numbered paper ticket. It is short-lived (a minute or so),
single-use, and useless on its own.

**Step four — the back door.** Your server, not her browser, POSTs the code to
the token endpoint:

```bash
curl -s https://oauth2.googleapis.com/token \
  -d code="4/0AVMBsJj…" \
  -d client_id="$CLIENT_ID" \
  -d client_secret="$CLIENT_SECRET" \
  -d redirect_uri="https://club.example/auth/google/callback" \
  -d grant_type=authorization_code
```

and gets back:

```json
{
  "access_token": "ya29.a0AfB_…",
  "expires_in": 3599,
  "scope": "openid https://www.googleapis.com/auth/userinfo.email …",
  "token_type": "Bearer",
  "id_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6…"
}
```

**Step five — you verify the `id_token` (§6), find or create the user, and
start your own session (§9).**

The split between step three and step four has a name worth knowing. Steps one
to three run through the **front channel** — the browser's address bar, where
Meera, her extensions, her history and any shoulder-surfer can see everything.
Step four runs through the **back channel**, a direct HTTPS call from your
server to Google's. The design principle is simply: *nothing valuable travels
in the front channel*. The code is worthless without the secret, and the
secret only ever exists in the back channel.

---

## 4. `state` — the parameter people skip

Without `state`, here's the attack. Mallory starts a Google login as herself,
gets as far as the callback URL carrying **her** code, and doesn't follow it.
She sends that URL to Meera instead. Meera's browser hits your callback, your
server dutifully exchanges the code, and logs Meera's browser into **Mallory's
account**. Meera then uploads a document, saves a card — into an account
Mallory controls. It's CSRF pointed at the login itself.

The fix is a random value you generate, remember, and insist on seeing again:

```js
const state = crypto.randomBytes(16).toString("hex");
req.session.oauthState = state;    // remembered server-side
```

which produces something like:

```
128c4c1a10d4fd74067c37474d3d3ad1
```

Google echoes it back untouched on the callback, and you compare:

```js
if (req.query.state !== req.session.oauthState) {
  return res.status(400).send("Bad state");
}
delete req.session.oauthState;     // single use
```

Mallory can't guess it and can't read Meera's session, so her pre-built
callback URL carries the wrong value and dies at that check. Note where it's
stored: server-side, against *this browser's* session. A `state` you don't
remember and compare is decoration.

---

## 5. Why the extra hop exists

It's fair to ask why Google doesn't just send the tokens to your callback
directly and save a round trip.

Because that callback runs in the front channel. The URL lands in the
browser's history, in the `Referer` header of the next request, in any proxy
or extension logs along the way. Tokens in a URL are tokens on a billboard.
The code is the answer: it's in the URL, yes, but it expires in seconds, works
exactly once, and — the important part — cannot be redeemed without the
`client_secret` that lives only on your server. Someone who steals the code
from the address bar holds a cloakroom ticket for a cloakroom that will only
talk to staff.

That's also why the `redirect_uri` is sent *again* in step four. Google checks
it matches the one from step one, which stops a code minted for your app being
redeemed against a different registration.

---

## 6. Reading the `id_token`

The token is a JWT: three base64url segments separated by dots. Here's a real
one, signed locally so the shape is genuine even though the issuer isn't:

```
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImEx…
```

Its header:

```json
{"alg":"RS256","typ":"JWT","kid":"a1b2c3d4e5f6"}
```

and its payload, decoded — with no key, by anyone, which is the standing
reminder that a JWT is signed, not secret:

```json
{
  "iss": "https://accounts.google.com",
  "azp": "8151….apps.googleusercontent.com",
  "aud": "8151….apps.googleusercontent.com",
  "sub": "104829173625901847362",
  "email": "meera@example.com",
  "email_verified": true,
  "name": "Meera Iyer",
  "nonce": "7f3df9c10643151917639ee6a97d35b8",
  "iat": 1788984191,
  "exp": 1788987791
}
```

Five checks turn that from a string into a login, and skipping any one of them
is a real vulnerability rather than sloppiness:

1. **The signature.** `alg` is `RS256`, not the `HS256` of your own tokens —
   Google signs with a private key and publishes only the public half, so
   anyone can verify and nobody else can mint. The `kid` says which key;
   fetch the set from `https://www.googleapis.com/oauth2/v3/certs` and cache
   it, because Google rotates keys and a hardcoded one breaks on a random
   Tuesday. Reject `alg: none` and reject a symmetric `alg` outright.
2. **`iss`** is `https://accounts.google.com` (Google also emits it without
   the scheme — accept both, and nothing else).
3. **`aud` is your `client_id`.** This is the check that kills the confused
   deputy from §1: a token minted for some other app names that other app
   here, and fails. It is the single most important line in the whole flow.
4. **`exp` hasn't passed** (and `iat` isn't wildly in the future).
5. **`nonce` matches** what you sent (§7).

In practice you call `openid-client` or Google's `verifyIdToken` and it does
all five. Write the list down anyway — it's how you tell whether the library
you picked is doing its job.

Then the claim that actually identifies her: **`sub`**. It's Google's opaque,
permanent id for that account, unique within Google, and it never changes.
Store *that* as the foreign key.

Do not key users on `email`. People change the address on a Google account,
and Workspace admins hand a departed employee's address to their replacement —
key on email and the new hire inherits the old one's account. And treat
`email_verified: false` as no email at all: on Workspace domains an admin can
create an account with an address nobody proved control of, so a `false` here
is the difference between "Google says this is her address" and "somebody
typed it in".

---

## 7. `nonce` is not `state`

They look identical — both random strings you generate per login — so it's
worth being precise about which hole each one plugs.

**`state` protects the callback.** It's remembered in your session and
compared against a query parameter, and it proves *this browser is the one
that started this login* (§4).

**`nonce` protects the token.** You send it in step one, Google copies it
into the `id_token`, and you check it after verifying the signature. It proves
*this id_token was minted for this login*, not replayed from an older one
somebody captured. Same generator, different journey:

```
state  128c4c1a10d4fd74067c37474d3d3ad1
nonce  7f3df9c10643151917639ee6a97d35b8
```

Both are single-use. Both get deleted from the session the moment they're
checked.

---

## 8. PKCE — when you can't keep a secret

Go back to the back-door call in §3 and ask a narrow question: *which machine
sends it?* So far, always your server. The `client_secret` is read out of an
env var, goes straight to Google, and the browser never comes near it. That's
the right place for it, and it's why the flow is safe.

Now take the server out. A phone app talks to Google directly; so does a
single-page app. The POST to the token endpoint leaves the device itself.
Which means the secret would have to be *inside the thing making the call* —
and whatever the app sends, the app contains. An APK is a zip file anyone can
unpack. A JS bundle is one devtools tab away. There's no hiding place, so
Google doesn't issue these clients a secret at all.

That leaves the token endpoint with nothing to check. Somebody turns up
holding a valid code and a `client_id` that was public all along, and there's
no way to tell the real app from a malicious one on the same phone that caught
the redirect first. The ticket has become the entire credential, and whoever
holds it wins.

**PKCE** ("pixie", Proof Key for Code Exchange) replaces the fixed secret with
a fresh one per login. There are two values, and the whole trick is which one
you show first:

- the **verifier** — a random password the app invents for this one login,
  kept private;
- the **challenge** — a fingerprint of that password, its SHA-256 hash, shown
  in public.

```js
const verifier  = crypto.randomBytes(32).toString("base64url");
const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
```

```
verifier   yfRYnojr5-EiXaYizb6Fn1Kq8lJPaUFhj4aH843iAKQ   ← stays in the app
challenge  pu-PidbivsD1MhXpg1x7gcLTrLOhElcEr5emDc3lZGE   ← goes in the URL
```

Laid over the four steps from §3:

1. **Before the redirect.** The app rolls 32 random bytes — the verifier — and
   hashes it into the challenge. The verifier stays in memory. Nothing writes
   it down, nothing ships it.
2. **Starting the login.** The **challenge** goes in the authorization URL,
   with `code_challenge_method=S256`. It travels through the browser, so treat
   it as public. Google files it beside the code it's about to issue:
   *whoever redeems this must produce the word that hashes to this.*
3. **The ticket comes back.** Possibly into the wrong hands.
4. **Redeeming it.** The app sends the code **and the verifier**, straight to
   Google. Google hashes what it just received and compares it against the
   challenge from step 2. Match, tokens. No match, nothing.

The interceptor has the code, and saw the challenge too — it was in the URL.
But hashing runs one way. Verifier to challenge is instant; challenge back to
verifier is not a thing. Their best move is to hand over the challenge itself,
since it's all they hold, and it hashes to something else entirely:

```
real app presents the verifier  → MATCH, tokens issued
thief presents the challenge    → rejected
thief guesses something         → rejected
```

Which is also why the spec's other option, `code_challenge_method=plain`, is
worthless: it sends the verifier as-is at step 2, publishing the password
alongside the ticket. Always `S256`.

Which is the real trick: it isn't *where* the secret lives, it's *how long it
has to survive*. A long-term secret needs a machine you control. A secret that
only has to stay hidden for the ten seconds between the redirect and the
exchange can live in memory on a stranger's phone and die there. PKCE proves
"I'm the app that started this login" instead of "I'm the app that knows the
permanent password" — and only the second kind needs somewhere safe to sit.

It's cheap, and there's no longer a good reason to skip it on a confidential
server-side client either — belt and braces, and OAuth 2.1 makes it mandatory
for everyone.

### Why not route it through your own backend?

Fair question — a phone app usually *has* a server, so why not let that server
do the exchange, exactly as the web flow does? You can. Phone-versus-web was
never the real dividing line. What decides it is the `redirect_uri` you
registered, because that's the address the ticket gets delivered to.

Point it at a URL you own, and nothing about the device matters:

```
app → system browser → Google → https://club.example/auth/google/callback
                                        ↓
                                your server, holding the secret,
                                does the exchange exactly as in §3
```

Point it at the device, and there's no server in the loop to hold anything:

```
app → system browser → Google → myapp://callback
                                        ↓
                                the app does the exchange — with what secret?
```

The first shape has a name — **backend for frontend**, or BFF — and it is
genuinely safer. Google's tokens never touch the phone at all.

But it isn't free. Your server finishes the exchange and is now holding a
session for Meera. That session has to get into **the app**, and the app is a
different process from the browser that just did the login. So the server has
to hand something back across that gap, which in practice means redirecting to
`myapp://done?token=…`.

That is the same device-level hop, with the same interception risk, now
carrying your own credential instead of Google's code. The problem moved; it
didn't leave. Close it properly — a one-time value the app redeems over your
own API, proving it started the login — and you will find you have rebuilt
PKCE under a different name.

Which is the argument written up in RFC 8252, *OAuth 2.0 for Native Apps*:
treat a native app as a public client, run the login through the system
browser, use PKCE. A secret shipped inside an app isn't a secret, and
registering as a confidential client is a lie you're telling your provider.

Two things do soften the theft story on a modern phone. **App Links** on
Android and **Universal Links** on iOS are ordinary `https://` links the OS
verifies against a file hosted on your domain, so a stray app can't claim
them. And `ASWebAuthenticationSession` on iOS hands the callback straight back
to the app that opened it, rather than broadcasting it. Between them the
original hijack is mostly closed — PKCE stays regardless, because you can't
assume every OS version behaves and a code has other ways to leak.

Where BFF has genuinely won is **single-page apps**, for a different reason
entirely. It keeps tokens out of JavaScript: Meera's browser holds an ordinary
session cookie, your server holds Google's tokens, and an XSS bug on your page
has nothing worth stealing.

---

## 9. The handshake ends. Your session begins.

This is the part that surprises people the first time. Google's job finishes
at the callback. It has vouched for Meera *once*, for that one instant. It
will not vouch for her again on the next request, and you are not going to
redirect her to Google on every page load.

So the last thing your callback does is the same thing a password login does:

```js
const claims = await verifyIdToken(tokens.id_token);   // §6

let user = await findByGoogleSub(claims.sub);
if (!user) user = await createUser({ googleSub: claims.sub, email: claims.email });

req.session.userId = user.id;    // your ticket, your rules
res.redirect("/dashboard");
```

From that line on you're in exactly the world the other two notes describe —
[express-session-config.md](express-session-config.md) §2 if you issue a
cookie, [jwt-auth.md](jwt-auth.md) §2 if you issue your own token. OAuth
replaced the password check, and nothing else. It's also why "sign out" almost
never means signing out of Google: you're clearing your own session, and her
Google account stays as it was.
---

## 10. Two accounts, one person

Meera signed up with an email and a password in March. In September she comes
back, doesn't remember doing that, and clicks **Sign in with Google**. The
`sub` is new to you, but the email already exists in your users table.

Creating a second account is the wrong answer — she'll log in one way and find
her data missing. Blindly attaching the Google identity to the existing row is
the wrong answer too, and it's the classic account-takeover bug: if you'll
link on an unverified email, anyone who can put `meera@example.com` on a
Google-ish account walks into her existing account without ever knowing her
password.

The rule that holds up: link automatically **only** when `email_verified` is
`true` and the address matches exactly — the provider has then done the same
proof your own signup email would have. Otherwise make her prove she owns the
existing account first, by logging in with her password or clicking a link you
email her, and attach the `sub` after that.

Which means the shape to store is a user row with *many* linked identities —
`(provider, sub)` pairs pointing at one user — rather than a `googleId` column
bolted onto the users table. You'll want it the day you add a second provider,
and retrofitting it once people have signed up both ways is genuinely painful.

---
