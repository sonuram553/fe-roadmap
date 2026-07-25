**Top-level await** lets you use the `await` keyword directly in a module's
top-level scope — outside of any `async function` — to pause execution of
that module until a promise resolves.

Introduced in **ES2022** (ES13) — reached TC39 Stage 4 in 2021.

---

## Before top-level await

Without it, `await` was only legal inside an `async function`. To do async
work at the top of a file, you had to wrap it:

```js
// old workaround
async function main() {
  const data = await fetch("/config.json").then((r) => r.json());
  console.log(data);
}
main();
```

## With top-level await

```js
// works directly at module top level
const data = await fetch("/config.json").then((r) => r.json());
console.log(data);
```

No wrapper function needed — the module itself becomes "async."

---

## Requirements

- Only works in **ES modules** (`.mjs` files, `"type": "module"` in
  `package.json`, or `<script type="module">` in the browser).
- Not allowed in CommonJS (`require`) modules or classic scripts — those
  are inherently synchronous.

---

## Common use cases

```js
// 1. Dynamic conditional imports
const lang = await detectLanguage();
const strings = await import(`./i18n/${lang}.js`);

// 2. Initializing a DB connection before exporting
const db = await connectToDatabase();
export { db };

// 3. Fetching config/data a module needs before it can define its exports
const config = await fetch("/api/config").then((r) => r.json());
export const API_URL = config.apiUrl;
```

---

## Important gotcha: it blocks importers

If module `B` has a top-level `await`, any module `A` that does
`import ... from "B"` will **wait** for `B`'s top-level await to resolve
before `A` itself continues executing. This can create surprising
load-order delays or, in bad cases, deadlocks if modules end up circularly
waiting on each other.

```
A imports B
B has: await slowOperation()
→ A's own module evaluation pauses until B's await settles
```

So it's powerful but should be used deliberately — mainly at genuine "this
module can't do anything until this async setup completes" points, not
casually.
