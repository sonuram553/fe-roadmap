# JS Modules — CommonJS vs ESM (`.mjs`)

JavaScript Modules let you split code into separate files, each with its
own scope, and share pieces between them via explicit `import`/`export` —
instead of everything living in one global scope.

Runnable examples for everything below: [12-js-modules-examples/](12-js-modules-examples/)

| | **CommonJS (CJS)** | **ESM (`.mjs`)** | **ESM (`.js` + `"type": "module"`)** |
| --- | --- | --- | --- |
| File extension | `.js` (default in Node) or `.cjs` | `.mjs` (always ESM, no config needed) | `.js`, but only ESM because `package.json` says so |
| Syntax | `require` / `module.exports` | `import` / `export` | `import` / `export` |
| Loading | Synchronous | Asynchronous | Asynchronous |

`.mjs` and `.js`-with-`"type":"module"` are **the same module system**
(ESM) — just two ways of telling Node "treat this as ESM." The real split
is **CommonJS vs ESM**.

---

## 1. CommonJS — `require` / `module.exports`

```javascript
// math.cjs
function add(a, b) { return a + b; }
module.exports = { add };
```

```javascript
// app.cjs
const { add } = require("./math.cjs");
console.log(add(2, 3)); // 5
```

- `require()` is a normal **synchronous function call** — it can be called
  conditionally, inside `if` blocks, in loops, anywhere.
- Node has `__dirname` and `__filename` available automatically:
  - `__filename` — the full absolute path to the current module file,
    including the file name itself. e.g.
    `/Users/sonu.ram/Documents/fe-roadmap/practice/app.js`
  - `__dirname` — the full absolute path to the directory containing the
    current file (i.e. `__filename` minus the file name). e.g.
    `/Users/sonu.ram/Documents/fe-roadmap/practice`
- `this` at module top-level = `module.exports`.

```javascript
// conditional require works fine in CJS
if (process.env.NODE_ENV === "test") {
  const mock = require("./mock-db.cjs");
}
```

---

## 2. ESM — `import` / `export` (`.mjs`)

```javascript
// math.mjs
export function add(a, b) { return a + b; }
```

```javascript
// app.mjs
import { add } from "./math.mjs";
console.log(add(2, 3)); // 5
```

- `import` is **static** — must be at the top level, can't be inside an
  `if`/loop, and is hoisted/resolved before any code runs.
- No `__dirname`/`__filename` — use instead:

  ```javascript
  import { fileURLToPath } from "url";
  import path from "path";
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  ```

- `this` at module top-level = `undefined`.
- Supports **top-level await** (see [top-level-await.md](../4.%20async/top-level-await.md))
  and **dynamic `import()`** for the conditional case:

  ```javascript
  if (process.env.NODE_ENV === "test") {
    const mock = await import("./mock-db.mjs"); // dynamic = allowed anywhere
  }
  ```

---

## 3. ESM via `.js` + `package.json`

```json
// package.json
{ "type": "module" }
```

```javascript
// math.js  — now treated as ESM because of "type": "module" above
export function add(a, b) { return a + b; }
```

Identical behavior to `.mjs` — just lets you keep the plain `.js`
extension across a whole package instead of renaming every file. If you
need a CommonJS file *inside* an ESM package, name it `.cjs` explicitly.

---

## Practical behavioral difference: live bindings vs copied values

This is the one that actually bites people.

```javascript
// counter.mjs (ESM)
export let count = 0;
export function increment() { count++; }
```

```javascript
// app.mjs
import { count, increment } from "./counter.mjs";
increment();
console.log(count); // 1 — ESM imports are LIVE BINDINGS, auto-update
```

```javascript
// counter.cjs (CommonJS)
let count = 0;
function increment() { count++; }
module.exports = { count, increment };
```

```javascript
// app.cjs
const { count, increment } = require("./counter.cjs");
increment();
console.log(count); // 0 — CJS exports are a COPY taken at require time
```

---

## Interop: mixing the two

**ESM importing CommonJS** — works, CJS's `module.exports` becomes the
default export:

```javascript
// app.mjs
import pkg from "./legacy.cjs"; // whole module.exports object as default
const { add } = pkg;
```

**CommonJS requiring ESM** — does **not** work with `require()` (sync
can't load async). Must use dynamic import:

```javascript
// app.cjs
(async () => {
  const { add } = await import("./math.mjs");
})();
```

---

## Key Points

- Named exports (`export const/function`) — many per file, imported by
  matching name.
- Default export (`export default`) — one per file, imported under any
  name.
- Modules are **singletons** — importing the same module from multiple
  files gives the same instance/state, not a fresh copy.
- New project with no legacy constraints → prefer **ESM** (language
  standard, better tree-shaking, native in browsers).
- Maintaining an old Node codebase / a dependency still on `require` →
  **CommonJS**, or interop via dynamic `import()`.
