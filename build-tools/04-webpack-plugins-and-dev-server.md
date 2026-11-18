# Lesson 4 — Plugins and the dev server

Level: beginner. Plugins that work on the whole build (writing `index.html`, moving CSS into its own file, emptying the output folder), and webpack-dev-server with live reload and hot module replacement. Examples use webpack 5.112, html-webpack-plugin 5.6, mini-css-extract-plugin 2.10 and webpack-dev-server 5.2.

## 1. Loaders and plugins

A loader from [lesson 3](03-webpack-loaders.md) works on one file at a time, at the moment webpack reads it. It never sees the rest of the build. Some jobs need a view of the whole thing: writing an HTML page that loads whatever files the build produced, gathering every stylesheet into one file, or deleting what the last build left behind. Those jobs belong to **plugins**. A plugin hooks into the build itself and can act at any stage of it, before reading starts, after bundling, or just before files are written.

In the publishing house, loaders are the translators who each handle one chapter. Plugins are the production staff who work on the whole print run: the cover designer, the person who prints a separate booklet of illustrations, the person who clears last week's copies off the shelf before the new ones arrive.

Neha's tracker needs that kind of help. Its `index.html` is still written by hand, with `<script src="dist/main.js">` typed into it. In [lesson 3](03-webpack-loaders.md) §1, webpack's built-in CSS produced a `main.css` that nothing loaded until Neha typed a `<link>` too. Every time the build's output changes, the hand-written page has to change with it.

## 2. HtmlWebpackPlugin writes `index.html`

Neha installs the plugin:

```bash
npm install --save-dev html-webpack-plugin
```

The hand-written page moves to `src/index.html` and loses its `<script>` tag. It is now a **template**: the starting point the plugin fills in.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Expenses</title>
  </head>
  <body>
    <img id="logo" alt="Expense tracker" width="48" height="48">
    <ul id="list"></ul>
    <p>Total: <strong id="total"></strong></p>
  </body>
</html>
```

Plugins are listed in a `plugins` array in `webpack.config.js`. Each one is an object created with `new`:

```js
const path = require('node:path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: './src/main.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'main.js',
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|svg)$/,
        type: 'asset',
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({ template: './src/index.html' }),
  ],
};
```

The build output gains a line:

```
asset main.js 25.5 KiB [emitted] [minimized] (name: main)
asset 19d718f1e71342a628c7.png 8.84 KiB [emitted] [immutable] [from: src/images/logo.png] (auxiliary name: main)
asset index.html 247 bytes [emitted] [minimized]
…
webpack 5.112.2 compiled successfully in 1280 ms
```

In production mode the plugin also minifies the page, so `dist/index.html` is a single line:

```html
<!doctype html><html lang=en><head><meta charset=utf-8><title>Expenses</title><script defer src=main.js></script></head><body><img id=logo alt="Expense tracker" width=48 height=48><ul id=list></ul><p>Total: <strong id=total></strong></body></html>
```

A development build (`npx webpack --mode development`) leaves it readable:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Expenses</title>
  <script defer src="main.js"></script></head>
  <body>
    <img id="logo" alt="Expense tracker" width="48" height="48">
    <ul id="list"></ul>
    <p>Total: <strong id="total"></strong></p>
  </body>
</html>
```

The plugin added one line: `<script defer src="main.js"></script>`, at the end of `<head>`. It puts the tag in the head with `defer` by default, so the browser starts downloading the script early but runs it only after the whole page has been read ([what `defer` does](../html/performance/02-async-and-defer.md)). The address is now `main.js`, not `dist/main.js`, because the page itself lives in `dist/` now. From here on, `dist/` is the whole website, and that folder is what Neha serves.

## 3. Pulling CSS into its own file

With style-loader, the styles live inside `main.js`. They reach the page only after `main.js` has downloaded and run. On a slow connection the browser can draw the page before that happens, and the visitor sees it unstyled for a moment.

Neha measured it. A small test server held `main.js` back for one second, as a slow network might, and Chrome recorded when the first paint happened and when `body` got its 448px width:

| Build | First paint | `body` width at first paint | Styles applied at |
| --- | --- | --- | --- |
| style-loader | 48 ms | `none` (unstyled) | 1029 ms |
| CSS in its own file | 52 ms | `448px` | first paint |

For a whole second, the style-loader build showed "Total:" in the browser's default font near the left edge of the window, and then everything jumped into place. In both builds the expense rows appeared only when `main.js` ran, because JavaScript draws them. The difference is whether the page the visitor sees first is styled.

**mini-css-extract-plugin** fixes this. It comes as a pair: a loader that takes style-loader's place in the rule, and a plugin that writes the collected CSS out as a file. html-webpack-plugin then adds a `<link>` for it automatically.

```bash
npm install --save-dev mini-css-extract-plugin
```

Neha wants the extracted file only for production. During development, style-loader is better, for a reason §6 shows. So the config becomes a function. Webpack calls it with two arguments, and the second one, `argv`, holds the command-line options, including `--mode`:

```js
const path = require('node:path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, argv) => {
  const production = argv.mode === 'production';

  return {
    entry: './src/main.js',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'main.js',
    },
    module: {
      rules: [
        {
          test: /\.css$/,
          use: [production ? MiniCssExtractPlugin.loader : 'style-loader', 'css-loader'],
        },
        {
          test: /\.(png|svg)$/,
          type: 'asset',
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({ template: './src/index.html' }),
      production && new MiniCssExtractPlugin(),
    ],
  };
};
```

In development, `production && new MiniCssExtractPlugin()` is `false`. Webpack ignores `false` entries in `plugins`, so the line simply drops out. `npx webpack --mode production` now gives:

```
assets by chunk 20.5 KiB (name: main)
asset 19d718f1e71342a628c7.png 8.84 KiB [emitted] [immutable] [from: src/images/logo.png] (auxiliary name: main)
asset index.html 282 bytes [emitted] [minimized]
webpack 5.112.2 compiled successfully in 1694 ms
```

`dist/` now holds four files: the logo (9,051 bytes), `index.html` (282 bytes), `main.css` (620 bytes) and `main.js` (20,370 bytes). `main.js` shrank from 25.5 KiB to about 20 KiB, because the CSS and style-loader's helper code left it. The page now ends its `<head>` with both tags:

```html
<script defer src=main.js></script><link href=main.css rel=stylesheet></head>
```

That `<link>` is **render-blocking**: the browser will not paint anything until the stylesheet has arrived ([why CSS blocks the first paint](../html/performance/01-render-blocking-and-first-paint.md)). Here that is exactly what Neha wants. The first paint waits a few milliseconds for a 620-byte file, and it is styled when it comes, which is the second row of the table above.

`main.css` is not minified. With a loader rule in place, webpack's built-in CSS handling, and its CSS minifier, are switched off, and the default minifier only handles JavaScript. Projects with this setup usually add `css-minimizer-webpack-plugin`. With version 8.0 and `optimization: { minimizer: ['...', new CssMinimizerPlugin()] }` in the config, Neha's file went from 620 bytes to 556. The `'...'` means "and keep the default minimizers". Without it, webpack would stop minifying the JavaScript.

## 4. Cleaning the output folder

Neha redraws the logo, and the new image has different contents, so it gets a different hashed name. After the next production build, `dist/` holds both logos:

```
19d718f1e71342a628c7.png
8826f5bb8b930d6e6bc2.png
index.html
main.css
main.js
```

Webpack writes files into `dist/`, but it never removes anything there by default. The old logo is no longer used by any page, but it would still be uploaded with the site. Over months of builds, the folder fills with dead files. One option fixes it:

```js
output: {
  path: path.resolve(__dirname, 'dist'),
  filename: 'main.js',
  clean: true,
},
```

With `clean: true`, webpack empties the folder before writing, and the next build left only what it had just produced:

```
8826f5bb8b930d6e6bc2.png
index.html
main.css
main.js
```

## 5. The dev server

So far, every change means running the build again and reloading the browser by hand. **webpack-dev-server** does both for you. It runs webpack in watch mode ([lesson 2](02-first-webpack-build.md) §6), serves the result over HTTP, and tells the open page when something changed.

In the publishing house, this is the proof desk. While Neha is still writing, the printer binds a fresh proof copy after every edit and leaves it on the desk to read. Nothing goes onto the shop shelf.

```bash
npm install --save-dev webpack-dev-server
```

The newest major version, webpack-dev-server 6, needs Node 22.15 or later. On Node 22.13, npm installed version 5.2 instead, which is what this lesson uses. Neha adds a port to the config:

```js
devServer: {
  port: 5615,
},
```

and updates the scripts from [lesson 2](02-first-webpack-build.md) §6. `start` replaces `watch`. `build` now has to pass `--mode production`, because since §3 the config no longer sets a mode and reads it from the command line instead. Without the flag, `argv.mode` would be `undefined` and production builds would quietly use style-loader.

```json
"scripts": {
  "start": "webpack serve --mode development",
  "build": "webpack --mode production"
}
```

`npm start` printed:

```
> expense-tracker@1.0.0 start
> webpack serve --mode development

<i> [webpack-dev-server] Project is running at:
<i> [webpack-dev-server] Loopback: http://localhost:5615/, http://[::1]:5615/
<i> [webpack-dev-server] On Your Network (IPv4): http://192.168.…:5615/
<i> [webpack-dev-server] Content not from webpack is served from '…/expense-tracker/public' directory
asset main.js 350 KiB [emitted] (name: main)
asset 8826f5bb8b930d6e6bc2.png 8.79 KiB [emitted] [immutable] [from: src/images/logo.png] (auxiliary name: main)
asset index.html 307 bytes [emitted]
…
webpack 5.112.2 compiled successfully in 456 ms
```

The output says "emitted", but nothing was written to disk. Neha deleted `dist/` before starting the server. While the server was running, `ls dist` still said `No such file or directory`, and yet `http://localhost:5615/main.js` answered with status 200 and 358,711 bytes. The dev server keeps the built files in memory and answers requests from there. That is faster than writing to disk, and it means a running dev server never touches the production files in `dist/`.

`main.js` is 350 KiB here, against 174 KiB for a plain development build. The difference is the dev server's own client code, which it adds to the bundle so the page can listen for changes. The `public` line is for files that no module imports, such as a `robots.txt`: put them in a `public/` folder and the dev server serves them as they are.

## 6. Live reload and hot module replacement

When a file changes, the dev server can tell the page in two ways. **Live reload** reloads the whole page. **Hot module replacement** (HMR) sends only the changed modules and swaps them into the running page without reloading it. In the binder of proofs, live reload hands over a whole new copy, and the reader starts again from page one. HMR swaps the one changed page and leaves the bookmark where it was.

The difference matters when the page holds state, such as half-typed input. Neha adds a field for new expenses to the template:

```html
<input id="draft" placeholder="New expense">
```

Then a test script in Chrome typed `Coffee 120` into it, changed the row border in `style.css` from `#ddd` to `#2a7`, waited, and then added a fourth expense to `expenses.js`.

First, with HMR switched off (`npx webpack serve --mode development --no-hot`), the browser console showed:

```
[webpack-dev-server] Server started: Hot Module Replacement disabled, Live Reloading enabled, Progress disabled, Overlay enabled.
[webpack-dev-server] App updated. Recompiling...
[webpack-dev-server] App updated. Reloading...
[webpack-dev-server] Server started: Hot Module Replacement disabled, Live Reloading enabled, Progress disabled, Overlay enabled.
[webpack-dev-server] App updated. Recompiling...
[webpack-dev-server] App updated. Reloading...
[webpack-dev-server] Server started: Hot Module Replacement disabled, Live Reloading enabled, Progress disabled, Overlay enabled.
```

Each edit reloaded the page, and the draft was gone after the very first one, the CSS change. The new border colour and the fourth row did appear.

Then with the default settings, where HMR is on (`npm start`), the CSS edit gave:

```
[webpack-dev-server] App updated. Recompiling...
[webpack-dev-server] App hot update...
[HMR] Checking for updates on the server...
[HMR] Updated modules:
[HMR]  - ./src/style.css
[HMR]  - ./node_modules/css-loader/dist/cjs.js!./src/style.css
[HMR] App is up to date.
```

The border turned green and the draft still said `Coffee 120`. The page was never reloaded. The edit to `expenses.js` went differently:

```
[webpack-dev-server] App updated. Recompiling...
[webpack-dev-server] App hot update...
[HMR] Checking for updates on the server...
[HMR] Cannot apply update. Need to do a full reload!
[HMR] Error: Aborted because ./src/expenses.js is not accepted
Update propagation: ./src/expenses.js -> ./src/main.js
    at applyHandler (http://localhost:5615/main.js:1531:31)
    …
[webpack-dev-server] Server started: Hot Module Replacement enabled, Live Reloading enabled, Progress disabled, Overlay enabled.
[HMR] Waiting for update signal from WDS...
```

The page reloaded, the fourth row appeared, and the draft was empty again. Here is what happened:

1. **The CSS update was accepted.** HMR can only swap a module if some code has said how to swap it. style-loader includes that code for every stylesheet: when a new version arrives, it replaces the text of the matching `<style>` element. Nothing else on the page has to change.
2. **The JavaScript update was not.** Nobody had said what to do with a new `expenses.js`. HMR then asks the module that imported it, `main.js`, which is what "Update propagation: ./src/expenses.js -> ./src/main.js" means. `main.js` is the entry and has no importer, so there was nowhere left to ask.
3. **So the dev server fell back to live reload.** A full reload is always correct, just not gentle.

This is why §3 kept style-loader for development: it is the piece that knows how to swap a stylesheet in place.

## 7. Accepting an update yourself

To keep the draft through a change to `expenses.js`, `main.js` has to say what to do when a new version arrives: draw the list again. Neha moves the drawing into a function and registers it with webpack's HMR API:

```js
import './style.css';
import logoUrl from './images/logo.png';
import { expenses, total } from './expenses.js';
import { formatMoney, formatDay } from './format.js';

document.querySelector('#logo').src = logoUrl;

function render() {
  const list = document.querySelector('#list');
  list.replaceChildren();
  for (const e of expenses) {
    const li = document.createElement('li');
    li.textContent = `${formatDay(e.date)} · ${e.note} · ${formatMoney(e.amount)}`;
    list.append(li);
  }
  document.querySelector('#total').textContent = formatMoney(total(expenses));
}

render();

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept('./expenses.js', render);
}
```

`import.meta.webpackHot.accept('./expenses.js', render)` means: when a new `expenses.js` arrives, run it, then call `render`. By the time `render` runs, `expenses` and `total` refer to the new module's exports. `list.replaceChildren()` empties the list first, otherwise every update would add the rows a second time. The same test, run again:

```
[webpack-dev-server] App updated. Recompiling...
[webpack-dev-server] App hot update...
[HMR] Checking for updates on the server...
[HMR] Updated modules:
[HMR]  - ./src/expenses.js
[HMR] App is up to date.
```

Four rows, a total of ₹6,259.00, and `Coffee 120` still in the field. Editing `main.js` itself still reloads the page (`Aborted because ./src/main.js is not accepted`), because `accept` here only covers `expenses.js`.

The `if` matters. `import.meta.webpackHot` exists only while HMR is running. In a production build it is `undefined`, webpack removes the whole block as dead code, and searching the production `main.js` for `webpackHot` or `accept(` finds nothing. In real projects you rarely write these calls by hand. Framework tooling, such as React Fast Refresh, adds accept handling for components, and style-loader does it for CSS, as §6 showed.
