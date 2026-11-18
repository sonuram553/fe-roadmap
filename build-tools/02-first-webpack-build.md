# Lesson 2 — A first webpack build

Level: beginner. Installing webpack, running it with and without a config file, and opening up the file it writes to see how a bundle works. Written against webpack 5.112 and webpack-cli 7.3 on Node 22.

## 1. Installing webpack

Neha's expense tracker from [lesson 1](01-why-build-tools.md) §4 is three files in `src/` that import `date-fns`. Neha adds a `package.json` and installs two packages:

```bash
npm install date-fns
npm install --save-dev webpack webpack-cli
```

```json
{
  "name": "expense-tracker",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "date-fns": "^4.4.0"
  },
  "devDependencies": {
    "webpack": "^5.112.2",
    "webpack-cli": "^7.3.1"
  }
}
```

`webpack` is the bundler itself. `webpack-cli` is the small package that gives you the `webpack` command in the terminal. They go in `devDependencies` because they are only needed on Neha's machine (and the build server) while the book is being printed. The browser never downloads webpack. It downloads what webpack writes.

`date-fns` is in `dependencies` because its code ends up inside the app. With a bundler, that difference is mostly about intent: webpack will copy whatever the code imports, from either list.

## 2. Running it with no configuration

webpack can run without a config file. Neha tries it, using `npx` to run the copy installed in the project ([how `npx` finds it](../npm/1.%20npx.md)):

```
$ npx webpack

WARNING in configuration
The 'mode' option has not been set, webpack will fallback to 'production' for this value.
Set 'mode' option to 'development' or 'production' to enable defaults for each environment.
You can also set it to 'none' to disable any default behavior. Learn more: https://webpack.js.org/configuration/mode/

ERROR in main
Module not found: Error: Can't resolve './src' in '…/expense-tracker'
resolve './src' in '…/expense-tracker'
  …
          …/expense-tracker/src/index.js doesn't exist
  …
webpack 5.112.2 compiled with 1 error and 1 warning in 39 ms
```

With no configuration, webpack makes three assumptions. The first file to read, the **entry point**, is `./src/index.js`. The output goes to `dist/main.js`. And the **mode** is `production`, with a warning that you should say so yourself. Neha's first file is called `main.js`, not `index.js`, so webpack found nothing to start from. The real error is a few dozen lines long, because webpack lists every file name it tried, with and without each extension.

In the publishing house, the printer was told nothing, so they went looking for a chapter called "index" to start from. There isn't one.

## 3. A config file

Rather than rename the file, Neha tells webpack where to start. webpack reads its settings from `webpack.config.js` in the project folder:

```js
// webpack.config.js
const path = require('node:path');

module.exports = {
  mode: 'production',
  entry: './src/main.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'main.js',
  },
};
```

The file runs in Node, not in the browser, which is why it uses `require` and `module.exports`. `entry` is the first page the printer opens. `output.path` is where the printed book goes, and webpack insists that it is an absolute path, so `path.resolve(__dirname, 'dist')` turns `dist` into the full path of a folder next to the config file. `mode: 'production'` silences the warning.

```
$ npx webpack
asset main.js 19.2 KiB [emitted] [minimized] (name: main)
orphan modules 473 KiB [orphan] 268 modules
./src/main.js + 38 modules 98.3 KiB [built] [code generated]
webpack 5.112.2 compiled successfully in 465 ms
```

Line by line:

1. **One asset.** webpack wrote one file, `dist/main.js`, 19.2 KiB. `[minimized]` means it was squeezed for production (§5).
2. **Orphan modules.** webpack looked at 268 files it then left out: 473 KiB of `date-fns` that Neha's code can never reach. These are the pages of the borrowed book that no chapter quotes.
3. **The modules that made it in.** `main.js` plus 38 other modules: Neha's two other files and 36 files from `date-fns`. That's 98.3 KiB of source before minifying, which became the 19.2 KiB file.

Compare that with [lesson 1](01-why-build-tools.md) §5, where the browser fetched 304 files from `date-fns` because it couldn't tell which ones it needed. webpack read all of them on Neha's laptop, worked out which 36 matter, and bound only those.

The bundle is an ordinary script, not a module, so the HTML loads it with a plain `<script>` tag. The tag goes at the end of the body so that `#list` and `#total` already exist when it runs ([why position matters](../html/performance/02-async-and-defer.md)):

```html
<!doctype html>
<meta charset="utf-8">
<title>Expenses</title>
<ul id="list"></ul>
<p>Total: <strong id="total"></strong></p>
<script src="dist/main.js"></script>
```

The page shows the same "2 Nov · Groceries · ₹2,340.00" list as before, from 2 requests instead of 308.

## 4. Inside the bundle

A production bundle is hard to read, so to see how bundling works, Neha builds in development mode instead:

```
$ npx webpack --mode development
asset main.js 147 KiB [emitted] (name: main)
…
webpack 5.112.2 compiled successfully in 225 ms
```

Opening `dist/main.js`, the first thing in it is a warning:

```js
/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 …
 */
```

In development mode, webpack wraps each module's code in a string passed to `eval()`. That helps the browser's developer tools show each file separately, but it makes the bundle unreadable for people. [Lesson 10](10-source-maps.md) covers the `devtool` setting properly. For now, Neha turns it off with `npx webpack --mode development --devtool false` and reads the 3,815-line file. It has three parts.

**The modules, each wrapped in a function.** The file opens with an object called `__webpack_modules__`. Each key is a module's path, and each value is a function containing that module's code. Here is Neha's `format.js` inside it:

```js
/***/ "./src/format.js"
/*!***********************!*\
  !*** ./src/format.js ***!
  \***********************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   formatDay: () => (/* binding */ formatDay),
/* harmony export */   formatMoney: () => (/* binding */ formatMoney)
/* harmony export */ });
/* harmony import */ var date_fns__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! date-fns */ "./node_modules/date-fns/format.js");


function formatMoney(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}

function formatDay(isoDate) {
  return (0,date_fns__WEBPACK_IMPORTED_MODULE_0__.format)(new Date(isoDate), 'd MMM');
}
```

The function bodies are Neha's code, unchanged. The `import` and `export` lines are gone. In their place, webpack wrote calls to its own helpers: `__webpack_require__.d` lists what the module exports, and `__webpack_require__(...)` fetches what it imports. Notice that the bare name `'date-fns'` has been replaced with a path, `./node_modules/date-fns/format.js`. webpack resolved the name, and went straight to the file that defines `format` instead of the 245-line `index.js`. [Lesson 8](08-tree-shaking.md) explains how it knew it could skip that file.

**A small loader called `__webpack_require__`.** After the module object comes webpack's **runtime**, the code it adds to every bundle to make the modules work together. The heart of it is this function (comments trimmed):

```js
const __webpack_module_cache__ = {};

function __webpack_require__(moduleId) {
  const cachedModule = __webpack_module_cache__[moduleId];
  if (cachedModule !== undefined) {
    return cachedModule.exports;
  }
  const module = __webpack_module_cache__[moduleId] = {
    exports: {}
  };
  …
  __webpack_modules__[moduleId](module, module.exports, __webpack_require__);
  return module.exports;
}
```

When a module asks for another one, this function looks the module up by its path, runs its function once, and remembers the result. A second request for the same module gets the remembered exports without running the code again. That's the same rule native modules follow: each module runs once, however many files import it.

In the publishing house, this is how the bound book stays a set of chapters. Every chapter is still there under its own heading, and the runtime is the table of contents. When one chapter says "see `./src/format.js`", the reader looks it up in the contents and turns to it.

**The entry module, run last.** At the bottom of the file is `main.js`, with its imports replaced the same way, and wrapped so it runs as soon as the script loads:

```js
(() => {
/* harmony import */ var _expenses_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./expenses.js */ "./src/expenses.js");
/* harmony import */ var _format_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./format.js */ "./src/format.js");

const list = document.querySelector('#list');
for (const e of _expenses_js__WEBPACK_IMPORTED_MODULE_0__.expenses) {
  …
```

So the whole app is one function that defines a table of modules and a way to look them up, then starts at the entry. Nothing is left for the browser to resolve or fetch.

## 5. Production mode

The production build is 19.2 KiB against development's 147 KiB, and it looks very different. Here is how it starts:

```js
(()=>{"use strict";const t=[{id:1,date:"2026-11-02",note:"Groceries",amount:2340},{id:2,date:"2026-11-05",note:"Train pass",amount:1500},{id:3,date:"2026-11-09",note:"Dinner out",amount:1820}],e={lessThanXSeconds:{one:"less than a second",other:"less than {{count}} seconds"},…
```

And how it ends:

```js
…const $=document.querySelector("#list");for(const e of t){const t=document.createElement("li");t.textContent=`${B(e.date)} · ${e.note} · ${X(e.amount)}`,$.append(t)}document.querySelector("#total").textContent=X(function(t){return t.reduce((t,e)=>t+e.amount,0)}(t))})();
```

Three things happened.

**The module wrappers are gone.** There is no `__webpack_modules__` table and no `__webpack_require__` in the file. In production, webpack checks whether modules can simply be placed one after another in a single function, and if they can, it does that. This is called **scope hoisting**, and it's what the build output meant by `./src/main.js + 38 modules`: 39 modules joined into one. Neha's `expenses` array is now the first line, `const t=[…]`, followed straight away by `date-fns`'s English text for its other features.

**Names got shorter.** `formatDay` is now `B`, `formatMoney` is `X`, and `total` was small enough to be written out in place where it was called. The **minifier** (webpack uses one called Terser) renames anything that isn't visible outside the file and removes spaces, line breaks and comments.

**Unused code is gone.** Only what Neha's code reaches is in the file.

Text like this compresses very well. The server Neha will eventually deploy to can send it gzipped, and gzip shrinks the 19,690-byte file to 5,663 bytes ([what gzip is](../javascript/6.%20networking/compression.md)).

The mode does more than minify. It also sets defaults for a long list of other options, such as `devtool`, and it tells libraries which mode they're running in through `process.env.NODE_ENV`. [Lesson 11](11-env-variables-and-modes.md) covers that.

## 6. npm scripts and watch mode

Typing `npx webpack` with flags gets tiresome, so Neha adds two scripts to `package.json`:

```json
"scripts": {
  "build": "webpack",
  "watch": "webpack --watch --mode development"
}
```

```
$ npm run build

> expense-tracker@1.0.0 build
> webpack

asset main.js 19.2 KiB [emitted] [minimized] (name: main)
orphan modules 473 KiB [orphan] 268 modules
./src/main.js + 38 modules 98.3 KiB [built] [code generated]
webpack 5.112.2 compiled successfully in 796 ms
```

Flags on the command line win over the config file, which is how the `watch` script builds in development mode even though the config says `production`.

`--watch` makes webpack build once and then keep running. When a file changes, it builds again. Neha started `npm run watch` and then changed "Dinner out" to "Dinner with Ravi" in `src/expenses.js`. After the first full build, webpack printed:

```
asset main.js 147 KiB [emitted] (name: main)
cached modules 473 KiB [cached] 268 modules
runtime modules 614 bytes 3 modules
./src/expenses.js 321 bytes [built] [code generated]
webpack 5.112.2 compiled successfully in 38 ms
```

Only `expenses.js` was built again. Everything else came from webpack's memory of the last build (`[cached]`), so the rebuild took 38 ms instead of 220. The printer kept the typeset pages from the last run and reset only the chapter that changed.

Watch mode still leaves one job to Neha: refreshing the browser to see the new `dist/main.js`. And if Neha had typed something into the page, a refresh throws it away. A dev server fixes both, and that's in [lesson 4](04-webpack-plugins-and-dev-server.md), after [lesson 3](03-webpack-loaders.md) teaches webpack to handle files that aren't JavaScript.
