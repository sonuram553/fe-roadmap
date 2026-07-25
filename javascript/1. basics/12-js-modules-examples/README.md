# JS Modules — runnable examples

Companion code for [12-js-modules.md](../12-js-modules.md). Every file
here runs standalone with plain `node`, no build step or `package.json`
needed — the `.cjs`/`.mjs` extensions tell Node which module system to use
regardless of any `"type"` field.

## Run them

```bash
node 1-cjs-basics/app.cjs
node 2-esm-basics/app.mjs
node 3-live-bindings/app-esm.mjs
node 3-live-bindings/app-cjs.cjs
node 4-interop-esm-importing-cjs/app.mjs
node 5-interop-cjs-requiring-esm/app.cjs

# conditional loading variants
RUN_MOCK=1 node 1-cjs-basics/app.cjs   # require() inside an if — fine in CJS
RUN_MOCK=1 node 2-esm-basics/app.mjs   # import() inside an if — the ESM equivalent
```

## What each folder shows

- **1-cjs-basics** — `require`/`module.exports`, `__dirname`/`__filename`
  available for free, `require()` works conditionally since it's just a
  function call.
- **2-esm-basics** — `import`/`export`, deriving `__dirname` manually via
  `import.meta.url`, and using dynamic `import()` where CJS would use a
  conditional `require()`.
- **3-live-bindings** — the same counter written twice. Run `app-esm.mjs`
  vs `app-cjs.cjs` and compare: ESM's imported `count` updates after
  `increment()` (live binding), CJS's stays frozen at the value copied out
  at `require()` time.
- **4-interop-esm-importing-cjs** — an ESM file importing a `.cjs` module;
  `module.exports` shows up as the default export.
- **5-interop-cjs-requiring-esm** — a CJS file loading an `.mjs` module.
  `require()` can't do this directly (`require("./math.mjs")` throws
  `ERR_REQUIRE_ESM`), so it uses dynamic `import()` inside an async IIFE
  instead.
