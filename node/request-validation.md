# Validating and sanitizing request payloads

Everything in an HTTP request is attacker-controlled. Not just `req.body` —
query strings, route params, headers, cookies and uploads too. The client
is not your form; it's `curl`, a script, or someone replaying your requests
with the fields changed.

**Client-side validation is a UX feature.** It gives instant feedback and
saves a round trip. It provides *zero* security, because anyone can open
DevTools, delete the `required` attribute, or skip the browser entirely.

---

## 1. Validation vs sanitization

| | Validation | Sanitization |
| --- | --- | --- |
| Question | *is this acceptable?* | *make this safe/normal* |
| Result | yes / no → `400` | a transformed value |
| Examples | is it an email? 8–128 chars? a number 1–100? | `trim()`, `toInt()`, strip HTML tags |
| Order | run **after** sanitizing | run **first** |

Sanitize, then validate: trim `"  a@b.com  "` before checking it's an
email, or a stray space fails a legitimate signup.

**Reject, don't repair.** Sanitization should be limited to normalisation
(whitespace, casing, type coercion). Trying to *fix* dangerous input is how
you get bypasses — the classic being a filter that strips `<script>` once,
turning `<scr<script>ipt>` into a working `<script>`.

**Allowlist, don't denylist.** Define what's permitted (`/^[a-z0-9_-]{3,20}$/`)
rather than enumerating what's forbidden. You will never finish the list of
bad things.

---

## 2. Getting a body at all

```js
app.use(express.json({ limit: "100kb" }));           // application/json
app.use(express.urlencoded({ extended: true }));     // HTML form posts
```

Without a parser, `req.body` is `undefined` — the first thing to check when
your validators mysteriously all fail.

- The `limit` (default `100kb`) matters: without a cap, a 500 MB JSON body
  is a trivial memory DoS.
- `extended` picks the parser, which decides whether nested keys like
  `user[address][city]` become objects or stay one oddly-named string —
  see below. Nested parsing is convenient and, as §6 shows, is also how
  NoSQL injection sneaks in.
- Neither parser handles `multipart/form-data` (file uploads) — that needs
  `multer` or `busboy`.

### `extended`: `querystring` vs `qs`

`express.urlencoded()` parses the request **body** only, and only when
`Content-Type: application/x-www-form-urlencoded` — on any method, not just
`POST`. It never touches `req.query`; that's Express's own query parser, a
separate setting (last bullet). `extended: false` uses Node's built-in
`querystring`, `true` uses `qs`. Same bytes on the wire, different
`req.body`:

| Body | `extended: false` | `extended: true` |
| --- | --- | --- |
| `a=1&b=2` | `{ a: "1", b: "2" }` | `{ a: "1", b: "2" }` |
| `a=1&a=2` | `{ a: ["1","2"] }` | `{ a: ["1","2"] }` |
| `tags[]=a&tags[]=b` | `{ "tags[]": ["a","b"] }` | `{ tags: ["a","b"] }` |
| `tags[1]=b&tags[0]=a` | `{ "tags[1]": "b", … }` | `{ tags: ["a","b"] }` — reordered |
| `user[address][city]=X` | `{ "user[address][city]": "X" }` | `{ user: { address: { city: "X" } } }` |
| `password[$gt]=` | `{ "password[$gt]": "" }` | `{ password: { $gt: "" } }` |

#### Why brackets are in the payload at all

A form body is a flat list of `name=value` pairs — there is no syntax for
"this field belongs inside an object". Brackets in the *name* are the
workaround (PHP's, cemented by Rails), and three unrelated senders emit
them:

1. **A hand-written form.** `<input name="user[address][city]">`,
   `<input name="items[0][qty]">` — plain HTML, no JS involved.
2. **A client serializing an object**, automatically: jQuery's
   `$.ajax({ data })`, axios with a `qs` transform.
   `qs.stringify({ items: [{ sku: "A", qty: 2 }] })` gives
   `items[0][sku]=A&items[0][qty]=2` — exactly the payload
   `body("items.*.qty")` (§3) is written against.
3. **An attacker** who knows Express runs `qs`, promoting a string field
   into an object: `password[$gt]=`.

On the wire the three are indistinguishable — same bytes, same parser, same
`req.body`. So `extended: true` is a capability to enable only if sender 1
or 2 actually exists for your app, and the defence is never the parser but
asserting the shape you expected.

---

## 3. express-validator

`validator.js` is a plain library of string functions — `isEmail(s)`,
`trim(s)`, etc. express-validator just wraps each one as an Express
middleware, so `.isEmail()` on a field *is* `validator.isEmail` under the
hood, wired into `req` and chainable. You describe each field as a
**chain** of sanitizers and validators; the middleware collects the errors;
your handler decides what to do with them.

```bash
npm i express-validator
```

```js
const { body, validationResult, matchedData } = require("express-validator");

app.post(
  "/signup",
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Must be a valid email")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 8, max: 128 }).withMessage("8–128 characters")
    .matches(/\d/).withMessage("Must contain a number"),
  body("age").optional().isInt({ min: 13, max: 120 }).toInt(),
  (req, res, next) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      return res.status(400).json({ errors: result.array() });
    }
    const data = matchedData(req); // ← only validated fields
    next();
  }
);
```

The chain runs **left to right**, and sanitizers mutate `req.body` in
place, so ordering is real: `.trim()` before `.isEmail()`, `.toInt()` after
`.isInt()`.

### Where to look

| Function | Reads from |
| --- | --- |
| `body("x")` | `req.body` |
| `query("x")` | `req.query` |
| `param("x")` | `req.params` |
| `header("x")` | headers |
| `cookie("x")` | cookies |
| `check("x")` | all of the above — convenient, but ambiguous; prefer the specific one |

### Useful validators / sanitizers

| Validators | Sanitizers |
| --- | --- |
| `isEmail` `isURL` `isUUID` `isMobilePhone` | `trim` `ltrim` `rtrim` |
| `isLength({min,max})` `notEmpty` | `escape` `unescape` |
| `isInt({min,max})` `isFloat` `isNumeric` | `toInt` `toFloat` `toBoolean` `toDate` |
| `isIn(["a","b"])` `isBoolean` `isDate` | `normalizeEmail` |
| `matches(/re/)` `isAlphanumeric` `isJSON` | `blacklist` `whitelist` `stripLow` |
| `isStrongPassword` `equals` `custom()` | `default` `replace` `customSanitizer()` |

### Modifiers

```js
body("email")
  .optional()                 // skip the chain entirely if absent
  .optional({ values: "falsy" }) // also skip on '' / 0 / null
  .bail()                     // stop this chain at the first failure — otherwise every validator runs regardless of earlier failures
  .not().isEmpty()            // negate the next validator
```

`bail()` is worth reaching for: without it, an empty `email` would fail
both `.not().isEmpty()` and any validator chained after it (e.g. `isEmail()`),
reporting "must not be empty" and "must be a valid email" at once — `bail()`
stops at the first.

### Custom validators

```js
body("email").custom(async (value) => {
  if (await db.users.findByEmail(value)) throw new Error("Email already in use");
}),

body("passwordConfirm").custom((value, { req }) => {
  if (value !== req.body.password) throw new Error("Passwords do not match");
  return true;
}),
```

Throw (or return a rejected promise) to fail; return anything truthy to
pass. `{ req, location, path }` is the second argument.

`customSanitizer()` is the same idea for transforming:

```js
body("tags").customSanitizer((v) => (Array.isArray(v) ? v : [v]));
```

### Arrays and nested objects

```js
body("items").isArray({ min: 1, max: 50 }),
body("items.*.sku").isString().trim().notEmpty(),
body("items.*.qty").isInt({ min: 1 }).toInt(),
body("address.city").optional().trim().escape(),
```

`*` is a wildcard over array indices or object keys. Always bound the array
length — `items.*` over 100 000 entries is a CPU DoS.

### Reusable middleware

Repeating the `validationResult` block in every route gets old:

```js
// middleware/validate.js
const { validationResult } = require("express-validator");

module.exports = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  res.status(400).json({
    errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
  });
};
```

```js
const validate = require("./middleware/validate");

const signupRules = [
  body("email").trim().isEmail().normalizeEmail(),
  body("password").isLength({ min: 8, max: 128 }),
];

app.post("/signup", signupRules, validate, signupHandler);
```

### `checkExact` and `oneOf`

Both solve different problems that plain field-by-field validation doesn't
cover.

**`checkExact` — reject unexpected fields.** Normal validator chains only
check the fields you list — they say nothing about fields you *didn't*
list. If your rules are `body("email").isEmail()` and
`body("password").isLength({ min: 8 })`, and someone sends
`{ email, password, isAdmin: true }`, validation passes — `isAdmin` is
silently sitting in `req.body`, untouched. If your handler ever does
something like `db.users.insert(req.body)` instead of using `matchedData`
(below), that field slips through — the mass-assignment problem from §6.
`checkExact` closes that gap: it's an extra middleware that checks the
request contains **only** the fields your rules declared, nothing more.
Now the same payload fails validation with an error like
`"Unexpected field: isAdmin"`, before it ever reaches the handler.

**`oneOf` — accept any one of several alternative chains.** Normal chains
are all mandatory: every `body(...)` you declare must pass. `oneOf` groups
several chains together and passes if **at least one whole group**
passes — useful when a field is optional in favor of an alternative, e.g.
logging in with *either* email *or* phone, where you don't know in advance
which one they'll send and neither is individually `required`. If neither
group passes, `validationResult` reports a failure.

```js
const { checkExact, oneOf } = require("express-validator");

// reject any field you didn't declare
app.post("/signup", checkExact(signupRules), validate, handler);

// at least one of these must be valid
oneOf([body("email").isEmail(), body("phone").isMobilePhone()]);
```

### `matchedData` is the point

```js
const data = matchedData(req, { locations: ["body"] });
await db.users.insert(data);
```

Validating and then using raw `req.body` throws away half the benefit.
`matchedData` returns **only the fields you declared**, already sanitized —
which is the fix for mass assignment (§6).

---

## 4. Schema-based alternatives

express-validator is chain-based and Express-specific. The other common
approach is to declare a schema and infer the type from it:

```js
const { z } = require("zod");

const SignupSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  age: z.number().int().min(13).optional(),
});

app.post("/signup", (req, res, next) => {
  const parsed = SignupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.issues });
  }
  req.validated = parsed.data; // typed, and unknown keys stripped by default
  next();
});
```

| | express-validator | zod / joi |
| --- | --- | --- |
| Style | middleware chains | declarative schema |
| TypeScript | weak inference | `z.infer<typeof S>` — one source of truth |
| Unknown keys | need `checkExact` | stripped by default |
| Reuse | Express only | anywhere — front end, workers, config |
| Sanitizers | rich, built in | you compose `.transform()` |

Neither is wrong. On a TypeScript codebase, zod usually wins because the
schema *is* the type. On an existing Express app with `body()` chains
everywhere, express-validator's sanitizer library is genuinely handy.

---

## 5. Express also needs errors handled

`express.json()` throws on malformed JSON, and without an error handler
your user gets an HTML stack trace:

```js
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed")
    return res.status(400).json({ error: "Invalid JSON" });
  if (err.type === "entity.too.large")
    return res.status(413).json({ error: "Payload too large" });
  next(err);
});
```

---

## 6. What validation actually protects you from (and what it doesn't)

### SQL injection — validation is *not* the fix

```js
db.query(`SELECT * FROM users WHERE email = '${req.body.email}'`); // ❌
db.query("SELECT * FROM users WHERE email = $1", [req.body.email]); // ✅
```

Use **parameterized queries** — the driver sends the query and the data
separately, so no input can ever be read as SQL. Validation is a useful
extra layer, never the defence.

### NoSQL injection — this one *is* a payload-shape problem

**The setup.** MongoDB query filters aren't SQL strings — they're plain JS
objects, and Mongo gives special meaning to keys starting with `$`.
`{ $gt: "" }` isn't data, it's an operator: "greater than empty string."
Since almost every value is greater than `""`, that operator matches *any*
password whatsoever.

**The attack.** A normal login sends `password` as a string:
`"password": "hunter2"`. But nothing stops a client from sending this JSON
instead:

```json
{ "email": "a@b.com", "password": { "$gt": "" } }
```

`express.json()` parses that fine — JSON has always supported nested
objects, that's not a parser bug. So `req.body.password` isn't the string
`"hunter2"`, it's the object `{ $gt: "" }`. If your code does:

```js
db.users.findOne({ email: req.body.email, password: req.body.password });
```

Mongo receives:

```js
db.users.findOne({ email: "a@b.com", password: { $gt: "" } });
```

which reads as "find a user with this email whose password is greater than
an empty string" — true for every account. The attacker logs in as
`a@b.com` without knowing the password at all.

`.isString()` on every field that should be a string stops it dead.

> Express 4's query parser defaults to `extended` (`qs`), so
> `?role[$ne]=user` becomes an object too. Express 5 defaults to `simple`.

### Prototype pollution

```js
// body: { "__proto__": { "isAdmin": true } }
Object.assign(target, req.body); // ❌ can poison Object.prototype
```

Merging untrusted objects into existing ones can add properties every
object in the process then inherits. Use `matchedData`/a schema instead of
spreading the raw body, and never deep-merge user input.

### Mass assignment

```js
const user = await db.users.insert(req.body); // ❌ { …, "role": "admin" }
```

The client sends fields you didn't intend to accept. Fix: build the object
from an allowlist — `matchedData(req)`, a zod schema, or an explicit pick.

### XSS — escape on **output**, not input

```js
body("bio").escape(); // turns < into &lt; before it hits the DB
```

Tempting, and usually a mistake. Escaping at the input boundary corrupts
your stored data (`O'Brien` becomes `O&#x27;Brien`), double-escapes when it
passes through twice, and is wrong for any non-HTML consumer of that field
— a mobile app, a CSV export, an email subject. Store the real text; escape
where you render, which every template engine and React already do.

This conflates two separate concerns — *what the data is* and *how one
particular output format needs to render it* — and bakes the second into
the first, permanently. `O'Brien` in the DB isn't the user's name anymore,
it's the user's name mangled for HTML; every other consumer now has to
know to un-escape it. Escape it again on a second pass (an edit that
re-validates, another `.escape()` downstream) and `&` becomes `&amp;`, so
`&#x27;` becomes `&amp;#x27;` — visibly rotting on screen. And a mobile app
or CSV export reading the same field never wanted HTML entities in the
first place; it wanted the real string. The fix is to escape only in the
one place that's actually about to be HTML — `{{ bio }}` in a template,
`{bio}` in JSX, both already auto-escaping — keeping the stored value
clean for everyone else.

`escape()` earns its place when you're about to interpolate straight into
HTML yourself, bypassing a templating engine — i.e. you *are* the one
output context, not the storage layer.

Rich text is the harder case: a bio with `<b>bold</b>`, a comment with a
link — you want *some* real HTML to survive, but blanket-escaping would
turn it all into literal visible `&lt;b&gt;` tags, and storing raw HTML
unfiltered is exactly how `<img src=x onerror=alert(1)>` gets through.
This still has to run at input time — you're deciding what HTML is
*allowed to exist* in storage, not how to render it — but it's a different
operation from `.escape()`: selectively permitting real markup instead of
neutering all of it into text. Use a real HTML sanitizer with an
allowlist (same "allowlist, don't denylist" principle from §1):

```js
const sanitizeHtml = require("sanitize-html");
const clean = sanitizeHtml(dirty, {
  allowedTags: ["b", "i", "em", "strong", "a", "p", "ul", "li"],
  allowedAttributes: { a: ["href"] },
});
```
---

## 7. Gotchas

- **`normalizeEmail()` rewrites the address**: it lowercases, and by
  default strips Gmail dots and `+tags`, so `John.Doe+news@gmail.com`
  becomes `johndoe@gmail.com`. Great for dedupe, but if you normalise on
  signup and not on login, users can't log in. Apply it in exactly the same
  places, or turn the aggressive options off.
- **`.optional()` vs `.notEmpty()`**: `optional()` skips the chain when the
  key is absent; a present-but-empty `""` still runs the chain. Use
  `optional({ values: "falsy" })` if empty should mean "not provided".
- **Validate `req.params` too.** `/users/:id` with `id = "abc"` reaches your
  database as garbage — `param("id").isUUID()` or `.isInt().toInt()`.
- **Type after validation**: `query("page").isInt()` leaves `req.query.page`
  as the *string* `"2"`. Chain `.toInt()`, or you'll do string math.
- **Don't echo the input back in error messages** unescaped — that's a
  reflected XSS in your own 400 response.
- **Validate before auth logic**, so a malformed body can't reach
  `bcrypt.compare` or your session code — see
  [authentication.md](authentication.md).
- **Rate-limit the endpoints anyway.** Validation rejects bad *shapes*, not
  a million well-formed login attempts.

---

## Quick reference

| Threat | Real defence |
| --- | --- |
| SQL injection | parameterized queries |
| NoSQL injection | type checks (`isString`) on every field |
| XSS | escape at render time; `sanitize-html` for rich text |
| Mass assignment | `matchedData` / schema allowlist |
| Prototype pollution | never merge raw `req.body` |
| Payload DoS | `express.json({ limit })`, `isLength`, `isArray({ max })` |
| Path traversal | allowlist the filename, or generate it |
| ReDoS | simple regexes, length-check first |
