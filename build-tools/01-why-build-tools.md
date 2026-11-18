# Lesson 1 — Why build tools exist

Level: beginner. What problem a build tool solves, shown by trying to run a small app in Chrome 157 without one. Nothing gets installed in this lesson except one npm package. Every error message and number below comes from actually loading the pages in Chrome.

## 1. A manuscript and a printed book

Our running example is Neha. Neha is building a small **expense tracker**: a page that lists what was spent this month and shows the total. The code is split into a few files, one for the data, one for formatting money and dates, and one that puts everything on the page.

Throughout these lessons, think of a **publishing house**. Neha is the author. The source files are the **manuscript**, written as many separate chapters. Chapters refer to each other: "see the table in chapter 4". In code, that cross-reference is an `import`.

Nobody sells a manuscript as a pile of loose chapters with notes scribbled between them. A printer takes the chapters, follows every cross-reference, translates anything written in another language, and binds the result into a book a reader can open. A **build tool** is that printer. The reader is the browser.

The rest of this lesson tries to skip the printer, and shows where that stops working.

## 2. Script tags and globals

The oldest way to split JavaScript across files is one `<script>` tag per file. Neha's first version looks like this:

```html
<!doctype html>
<meta charset="utf-8">
<title>Expenses</title>
<ul id="list"></ul>
<p>Total: <strong id="total"></strong></p>
<script src="format.js"></script>
<script src="expenses.js"></script>
<script src="main.js"></script>
```

```js
// format.js
function formatMoney(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}
```

```js
// expenses.js
var expenses = [
  { id: 1, date: '2026-11-02', note: 'Groceries', amount: 2340 },
  { id: 2, date: '2026-11-05', note: 'Train pass', amount: 1500 },
  { id: 3, date: '2026-11-09', note: 'Dinner out', amount: 1820 },
];

function total(list) {
  return list.reduce((sum, e) => sum + e.amount, 0);
}
```

```js
// main.js
const list = document.querySelector('#list');
for (const e of expenses) {
  const li = document.createElement('li');
  li.textContent = `${e.date} · ${e.note} · ${formatMoney(e.amount)}`;
  list.append(li);
}
document.querySelector('#total').textContent = formatMoney(total(expenses));
```

The page works:

```
2026-11-02 · Groceries · ₹2,340.00
2026-11-05 · Train pass · ₹1,500.00
2026-11-09 · Dinner out · ₹1,820.00
Total: ₹5,660.00
```

`main.js` never says where `expenses`, `total` or `formatMoney` come from. It just uses them. That works because every top-level `var` and `function` in a classic script becomes a **global**: a name that every other script on the page can see. `expenses.js` defines `expenses`, and from then on any script on the page can use it.

The cost is that the order of the tags now matters, and nothing checks it. Neha moved `main.js` to the top of the list, and the page broke:

```
[pageerror] expenses is not defined
```

`main.js` ran first and looked for `expenses`, but `expenses.js` hadn't run yet, so the name didn't exist. With three files, keeping the order right by hand is easy. With three hundred, it is a real job, and two files that happen to use the same global name will quietly overwrite each other.

## 3. Native modules

Browsers have understood `import` and `export` since about 2018. Neha turns each file into a **module**, says what each one exports, and loads only the first file from the HTML:

```html
<script type="module" src="src/main.js"></script>
```

```js
// src/expenses.js
export const expenses = [ /* same three entries */ ];

export function total(list) {
  return list.reduce((sum, e) => sum + e.amount, 0);
}
```

```js
// src/format.js
export function formatMoney(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}
```

```js
// src/main.js
import { expenses, total } from './expenses.js';
import { formatMoney } from './format.js';

const list = document.querySelector('#list');
for (const e of expenses) {
  const li = document.createElement('li');
  li.textContent = `${e.date} · ${e.note} · ${formatMoney(e.amount)}`;
  list.append(li);
}
document.querySelector('#total').textContent = formatMoney(total(expenses));
```

The page shows the same four lines as before. Now each file says exactly what it needs, so the browser can work out the order itself: it reads `main.js`, sees the two imports, fetches those files, and runs them first. And none of the names become globals, so two files can both have a `total` without clashing.

One small catch: modules have to come from a web server. Opening `index.html` straight from the disk (a `file://` address) fails:

```
Access to script at 'file:///…/src/main.js' from origin 'null' has been blocked by CORS policy: Cross origin requests are only supported for protocol schemes: chrome, chrome-experimental-site-token-provider, chrome-extension, chrome-untrusted, data, http, https, isolated-app.
```

Served over `http://localhost`, it works. So far, the browser can handle Neha's app without any help. The trouble starts with the next step.

## 4. Borrowing from npm: the name problem

Neha wants dates to read "2 Nov" instead of "2026-11-02". Formatting dates well is fiddly, so Neha installs a popular library, `date-fns`, and uses its `format` function:

```bash
npm install date-fns
```

```js
// src/format.js
import { format } from 'date-fns';

export function formatMoney(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}

export function formatDay(isoDate) {
  return format(new Date(isoDate), 'd MMM');
}
```

This is how every npm package's README tells you to import it. In the browser, it fails straight away:

```
[pageerror] Failed to resolve module specifier "date-fns". Relative references must start with either "/", "./", or "../".
```

`'date-fns'` is called a **bare specifier**: a package name, not an address. To the browser, an import must be a URL, like `./format.js` or `/node_modules/date-fns/index.js`. It has never heard of npm, and it doesn't know there is a `node_modules` folder on Neha's laptop.

In the publishing house, quoting from another published book is normal. The house has a library of other books on its shelves (that's `node_modules`), and the author writes "quote from *date-fns*". But the reader at home only has the book in their hands. They can follow "turn to page 40". They cannot follow "see *date-fns*", because they don't own that book and don't know where to find it.

There are two ways round this without a build tool, and both work. Neha can write the full path:

```js
import { format } from '/node_modules/date-fns/index.js';
```

Or Neha can keep `'date-fns'` in the code and add an **import map** to the HTML, which tells the browser what the name means:

```html
<script type="importmap">
  { "imports": { "date-fns": "/node_modules/date-fns/index.js" } }
</script>
<script type="module" src="src/main.js"></script>
```

Both versions print the nicely formatted page:

```
2 Nov · Groceries · ₹2,340.00
5 Nov · Train pass · ₹1,500.00
9 Nov · Dinner out · ₹1,820.00
Total: ₹5,660.00
```

So the name problem can be solved by hand. The next problem can't.

## 5. The waterfall

Neha uses one function from `date-fns`. Here is what the browser fetched to show that page:

```
308 requests
  /                     the HTML
  /src/main.js
  /src/expenses.js
  /src/format.js
  304 files from /node_modules/date-fns/
```

`date-fns/index.js` is a file that re-exports the whole library, one line per function: `export * from "./add.js"`, `export * from "./addBusinessDays.js"`, and so on, 245 lines. The browser can't know which of those Neha needs until it has fetched them all, because any of them could be the one that exports `format`. Each of those files imports a few helpers of its own, which the browser only discovers once the file arrives. So it fetches in rounds: index, then the 245, then their helpers, then the helpers' helpers. This chain of rounds is called a **waterfall**.

On `localhost` this is quick, because there is no network. Over a real network, every round costs a trip to the server and back. Neha loaded the page with Chrome pretending to be on a fast 4G phone connection (165 ms per round trip, about 1 MB/s down), and then loaded a version that a build tool had already bound into one file (that build is the subject of [lesson 2](02-first-webpack-build.md)):

| | Requests | Transferred | Total appears after |
|---|---|---|---|
| Native modules, no build | 308 | 503 kB | 9.7 s |
| One bundled file | 2 | 20 kB | 0.4 s |

Neither server compressed anything, so both sizes are raw. The bundled file is not just fewer requests. It is also 25 times smaller, because the printer only bound in the parts of `date-fns` that Neha's code actually reaches. [Lesson 8](08-tree-shaking.md) is about how that works.

This is the core reason bundlers exist. Native modules are fine for a handful of your own files. Real apps pull in libraries made of hundreds of small files, and asking the browser to discover them one round at a time is slow.

## 6. Languages the browser doesn't read

The last problem is about language. Many projects write code that isn't plain JavaScript. If Neha used React, a list item might be written in **JSX**, the HTML-like syntax inside JavaScript:

```js
const row = (e) => <li>{e.date} · {e.note} · {formatMoney(e.amount)}</li>;
```

Chrome stops at the first `<`:

```
[pageerror] Unexpected token '<'
```

**TypeScript** fails the same way. TypeScript is JavaScript with type labels added, like `list: Expense[]`:

```ts
type Expense = { id: number; date: string; note: string; amount: number };

export function total(list: Expense[]): number {
  return list.reduce((sum, e) => sum + e.amount, 0);
}
```

```
[pageerror] Unexpected identifier 'Expense'
```

Browsers only run JavaScript. JSX and TypeScript have to be **translated** into plain JavaScript before the browser sees them. The same goes for importing a stylesheet from JavaScript, which bundled projects do all the time. A plain `import './style.css';` at the top of `main.js` stops the whole app from loading:

```
Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "text/css". Strict MIME type checking is enforced for module scripts per HTML spec.
```

In the publishing house, these are chapters written in another language, and someone has to translate them before the book is bound. [Lesson 12](12-typescript-and-jsx.md) looks at TypeScript and JSX closely, and [JSX compilation](../react/12.%20jsx-compilation.md) shows exactly what JSX turns into.

## 7. What a build tool does

Put the problems together and you get the job description of a build tool.

**It resolves names.** It reads `import { format } from 'date-fns'`, finds the package in `node_modules`, and works out which file that means. The browser never sees a bare name.

**It translates.** TypeScript, JSX, CSS, images and other file types are turned into JavaScript (or into separate files the page can link to). webpack calls the pieces that do this **loaders** ([lesson 3](03-webpack-loaders.md)).

**It bundles.** Starting from one file, the **entry point**, it follows every import, collects each file once, and writes a small number of output files. The map of who imports whom is called the **module graph**. In the publishing house, the printer starts at page one, follows every cross-reference, and binds the result.

**It shrinks.** For production it leaves out code nothing uses, and **minifies** what's left: shorter variable names, no spaces or comments, same behaviour. Small print with no margins, same words.

**It splits.** For a big app, one file is too much. Parts that are needed only later go in separate files that load when needed ([lesson 7](07-code-splitting.md)).

**It names files for caching.** Output files get names like `main.3f9a1c.js`, where the middle part changes only when the content does, so browsers can keep them for a long time ([lesson 9](09-hashes-and-caching.md)).

**It runs a dev server.** While Neha is writing, a local server shows the app and updates it after every save, often without reloading the page ([lesson 4](04-webpack-plugins-and-dev-server.md), [lesson 5](05-first-vite-project.md)).

## 8. The tools you will meet

Two tools cover most frontend projects today, and they are the two these lessons use.

**webpack** has been the standard bundler since the mid-2010s. It bundles everything, in development as well as for production, and almost every part of it can be configured. Many large existing apps are built with it, so you will meet it at work even if you start new projects with something else. Lessons 2 to 4 are about webpack.

**Vite** is newer. It is the default for new Vue and Svelte projects, and the most common choice for a new React app. In development it doesn't bundle your own code at all. It serves each file as a native module, as in §3, translating on the fly, and it fixes the npm problems from §4 and §5 for you. For production it does bundle, using a separate bundler called **Rolldown** (since Vite 8). Lessons 5 and 6 introduce Vite, and lessons 7 to 13 show each topic in both tools.

You will also see these names, mostly underneath or alongside the two above. **Rollup** is the bundler Vite used for production before Vite 8, and Rolldown is its faster, Rust-based successor with the same plugin interface. **esbuild** is a very fast bundler and translator written in Go, used inside many other tools. **Rspack** is a Rust rewrite of webpack that accepts most of webpack's configuration. **Turbopack** is the bundler built into Next.js. **Parcel** is a bundler that aims to need no configuration. The ideas in these lessons (entry points, the module graph, loaders and plugins, chunks, hashes, source maps) carry over to all of them.
