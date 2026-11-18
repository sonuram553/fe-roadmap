# Lesson 3 — Loaders: teaching webpack other file types

Level: beginner. How webpack handles files that are not JavaScript: stylesheets through css-loader and style-loader, images through asset modules, and why the order of loaders matters. Examples use webpack 5.112, css-loader 7.1 and style-loader 4.0.

## 1. A stylesheet in the module graph

At the end of [lesson 2](02-first-webpack-build.md) Neha's tracker works, but it is plain black text on a white page. Neha writes a first stylesheet, `src/style.css`:

```css
body {
  font-family: system-ui, sans-serif;
  max-width: 28rem;
  margin: 2rem auto;
}

#list li {
  padding: 0.25rem 0;
  border-bottom: 1px solid #ddd;
}
```

and imports it at the top of `src/main.js`:

```js
import './style.css';
import { expenses, total } from './expenses.js';
import { formatMoney, formatDay } from './format.js';
```

Importing a stylesheet from JavaScript looks strange at first. A browser could never do this, because `import` only loads JavaScript. The point is that the import puts the stylesheet into webpack's module graph. Webpack now knows that `main.js` needs `style.css`, in the same way it knows that `main.js` needs `format.js`. The build can then process the CSS along with everything else, and if a module that imports a stylesheet is ever removed, its styles leave the build with it.

In the publishing house, webpack is a printer who reads one language: JavaScript. Every chapter has to be in that language before it can be bound into the book. A chapter written in another language needs a translator first. Webpack calls its translators **loaders**.

For most of webpack's life, the import above failed. Here is what webpack 5.108 printed for exactly this project:

```
ERROR in ./src/style.css 1:5
Module parse failed: Unexpected token (1:5)
You may need an appropriate loader to handle this file type, currently no loaders are configured to process this file. See https://webpack.js.org/concepts#loaders
> body {
|   font-family: system-ui, sans-serif;
|   max-width: 28rem;
```

Webpack tried to read the stylesheet as JavaScript and gave up at `body {`. Almost every webpack tutorial shows this error and then fixes it with loaders.

Webpack 5.109, released in July 2026, changed this. It learned to read CSS by itself, and it switches that ability on automatically when no loader is set up for `.css` files. With webpack 5.112, Neha's build succeeds:

```
asset main.js 19.2 KiB [emitted] [minimized] (name: main)
asset main.css 217 bytes [emitted] [minimized] (name: main)
Entrypoint main 19.4 KiB = main.js 19.2 KiB main.css 217 bytes
orphan modules 473 KiB [orphan] 268 modules
runtime modules 0 bytes 1 module
cacheable modules 98.3 KiB (javascript) 157 bytes (css)
  ./src/main.js + 39 modules 98.3 KiB [built] [code generated]
  css ./src/style.css 157 bytes [built] [code generated]
webpack 5.112.2 compiled successfully in 1045 ms
```

The stylesheet came out as a separate, minified file, `dist/main.css`. Yet the page in the browser was still unstyled. Asking Chrome for `getComputedStyle(document.body).maxWidth` gave `none`. Webpack wrote the file, but nothing loads it: `index.html` only has the `<script>` tag. After Neha added `<link rel="stylesheet" href="dist/main.css">` by hand, the same check gave `448px`, which is `28rem`. [Lesson 4](04-webpack-plugins-and-dev-server.md) §2 hands the job of writing that tag to a plugin.

The built-in CSS support is still configured under `experiments.css`, and a comment in webpack's source says it becomes the normal default in the next major version. Most projects you will work on handle CSS with loaders, and loaders are also how webpack handles every other kind of file, so the rest of this lesson uses them.

## 2. css-loader and style-loader

Neha installs two loaders:

```bash
npm install --save-dev css-loader style-loader
```

and tells webpack when to use them, in a new `module.rules` section of `webpack.config.js`:

```js
const path = require('node:path');

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
    ],
  },
};
```

`module.rules` is a list of rules. Each rule says: for every imported file whose path matches `test`, pass it through the loaders in `use` before reading it. The build now says:

```
asset main.js 23.9 KiB [emitted] [minimized] (name: main)
orphan modules 480 KiB [orphan] 275 modules
runtime modules 1.44 KiB 5 modules
cacheable modules 108 KiB
  modules by path ./src/ 106 KiB
    ./src/main.js + 45 modules 105 KiB [built] [code generated]
    ./node_modules/css-loader/dist/cjs.js!./src/style.css 583 bytes [built] [code generated]
  modules by path ./node_modules/ 2.31 KiB
    ./node_modules/css-loader/dist/runtime/noSourceMaps.js 64 bytes [built] [code generated]
    ./node_modules/css-loader/dist/runtime/api.js 2.25 KiB [built] [code generated]
webpack 5.112.2 compiled successfully in 1055 ms
```

There is no `main.css` any more. Because a loader rule now covers `.css` files, webpack's built-in CSS handling stepped aside, and the stylesheet travels inside `main.js` instead, which grew from 19.2 KiB to 23.9 KiB. The module name `./node_modules/css-loader/dist/cjs.js!./src/style.css` is worth reading once: it is the file on the right and the loader it went through on the left, joined by `!`. Two small helper files from css-loader were bundled too.

Neha opens the page without adding any `<link>`. The `<head>` now holds this, and `body` is 448px wide again:

```html
<title>Expenses</title>
<style>body {
  font-family: system-ui, sans-serif;
  max-width: 28rem;
  margin: 2rem auto;
}

#list li {
  padding: 0.25rem 0;
  border-bottom: 1px solid #ddd;
}
</style>
```

Nobody wrote that `<style>` element into the HTML. It was created by JavaScript inside `main.js` when the script ran. That is the work of the two loaders together.

## 3. What each loader does on its own

To see the two jobs separately, Neha first keeps only css-loader (`use: ['css-loader']`) and builds a tiny test file that prints what the import gives back:

```js
// src/peek.js
import css from './style.css';

console.log(Array.isArray(css), css.length);
console.log(css.toString());
```

Running the bundle with Node printed:

```
true 1
body {
  font-family: system-ui, sans-serif;
  max-width: 28rem;
  margin: 2rem auto;
}

#list li {
  padding: 0.25rem 0;
  border-bottom: 1px solid #ddd;
}
```

css-loader turned the stylesheet into a JavaScript module. Its default export is a list of stylesheet entries (one entry here), and `toString()` gives the CSS text back. This is a real translation: the chapter is now in the printer's language and can be bound into the book. But nothing in it touches the page. With only css-loader, Neha's tracker has its CSS inside `main.js` and still looks unstyled.

Then Neha keeps only style-loader (`use: ['style-loader']`):

```
ERROR in ./src/style.css 1:5
Module parse failed: Unexpected token (1:5)
File was parsed as module type 'javascript/auto'.
You may need an appropriate loader to handle this file type, currently no loaders are configured to process this file. See https://webpack.js.org/concepts#loaders
> 1 | body {
    |      ^
  2 |   font-family: system-ui, sans-serif;
 @ ./src/style.css 8:6-60 20:17-24 25:22-29 25:33-47 25:50-64 24:0-30 24:0-30
 @ ./src/main.js 1:0-21
```

style-loader cannot read CSS at all. It expects to be handed a JavaScript module like the one css-loader produces, and its only job is to add code that says "when this runs, put that CSS into a `<style>` tag". With no loader after it, the code it writes imports the raw stylesheet, and webpack chokes on `body {` just as it did in §1. So css-loader translates the stylesheet into JavaScript, and style-loader decides what that JavaScript does in the browser. Each one is useless without the other.

## 4. Loaders run from right to left

The `use` array is applied from the last entry to the first. `['style-loader', 'css-loader']` means css-loader reads the file first, and style-loader works on css-loader's result. One way to remember it is to read the array as nested function calls, `styleLoader(cssLoader(file))`: the loader closest to the file is on the right.

Neha swapped the order to see what happens:

```js
use: ['css-loader', 'style-loader'],
```

```
ERROR in ./src/style.css
Module build failed (from ./node_modules/css-loader/dist/cjs.js):

SyntaxError

(2:7) …/expense-tracker/src/style.css Unknown word import

  1 | 
> 2 |       import API from "!../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js";
    |       ^
  3 |       import domAPI from "!../node_modules/style-loader/dist/runtime/styleDomAPI.js";
  4 |       import insertFn from "!../node_modules/style-loader/dist/runtime/insertBySelector.js";
 @ ./src/main.js 1:0-21
```

The error is confusing until you read it as a story:

1. **style-loader went first.** It produced its usual JavaScript, a set of `import` lines that pull in its helpers for creating `<style>` tags.
2. **css-loader got that JavaScript.** css-loader expects CSS, so it tried to read `import API from …` as a stylesheet.
3. **The CSS parser stopped at the first word.** `import` is not valid CSS, hence "Unknown word import" at line 2, column 7.

When a loader chain fails with an error that shows code from a different loader, the order in `use` is the first thing to check.

## 5. Images: asset modules

Neha wants a logo at the top of the page. The image goes in `src/images/logo.png`, `index.html` gets an empty `<img>`:

```html
<img id="logo" alt="Expense tracker" width="48" height="48">
```

and `main.js` imports the image and sets its address:

```js
import './style.css';
import logoUrl from './images/logo.png';
import { expenses, total } from './expenses.js';
import { formatMoney, formatDay } from './format.js';

document.querySelector('#logo').src = logoUrl;
```

With no rule for `.png` files, webpack tries to read the image as JavaScript:

```
ERROR in ./src/images/logo.png 1:0
Module parse failed: Unexpected character '�' (1:0)
File was parsed as module type 'javascript/auto'.
You may need an appropriate loader to handle this file type, currently no loaders are configured to process this file. See https://webpack.js.org/concepts#loaders
(Source code omitted for this binary file)
 @ ./src/main.js 2:0-40 6:38-45
```

The error suggests a loader, and older projects did use loaders for this (`file-loader` and `url-loader`). Since webpack 5 there is a built-in way called **asset modules**. A picture is not translated into the printer's language. The printer keeps it as a separate plate, files the plate next to the book, and prints the plate's address in the text wherever the picture was mentioned. Neha adds a second rule:

```js
{
  test: /\.(png|svg)$/,
  type: 'asset/resource',
},
```

This rule has `type` instead of `use`. It tells webpack which kind of module these files are, rather than which loaders to run. The build:

```
asset main.js 24.5 KiB [emitted] [minimized] (name: main)
asset 19d718f1e71342a628c7.png 8.84 KiB [emitted] [immutable] [from: src/images/logo.png] (auxiliary name: main)
…
webpack 5.112.2 compiled successfully in 817 ms
```

The 9,051-byte logo was copied into `dist/` under a new name made from a hash of its contents ([lesson 9](09-hashes-and-caching.md) explains why that name is useful). Inside `main.js`, `logoUrl` is that file's address. In the browser, the `<img>` ended up with `src="http://localhost:5611/dist/19d718f1e71342a628c7.png"` and loaded. Neha never told webpack that the site lives under `/dist/`. Webpack's default `output.publicPath` is `'auto'`, which means the bundle works out the folder at run time from the address `main.js` itself was loaded from.

## 6. css-loader follows `@import` and `url()`

Stylesheets can point at other files too. Neha moves a small list reset into `src/reset.css`:

```css
ul {
  list-style: none;
  padding: 0;
}
```

and gives each row a little receipt icon, `src/images/receipt.svg`:

```css
@import './reset.css';

body {
  font-family: system-ui, sans-serif;
  max-width: 28rem;
  margin: 2rem auto;
}

#list li {
  padding: 0.25rem 0 0.25rem 1.5rem;
  border-bottom: 1px solid #ddd;
  background: url('./images/receipt.svg') no-repeat left center;
}
```

css-loader treats `@import` and `url()` the same way webpack treats `import` in JavaScript: as cross-references the printer must follow. The build now lists `reset.css` as its own module and emits the icon through the image rule from §5:

```
asset main.js 25.2 KiB [emitted] [minimized] (name: main)
asset 19d718f1e71342a628c7.png 8.84 KiB [emitted] [immutable] [from: src/images/logo.png] (auxiliary name: main)
asset 24df29a553460df819c7.svg 250 bytes [emitted] [immutable] [from: src/images/receipt.svg] (auxiliary name: main)
…
      ./node_modules/css-loader/dist/cjs.js!./src/style.css 1.1 KiB [built] [code generated]
      ./node_modules/css-loader/dist/cjs.js!./src/reset.css 467 bytes [built] [code generated]
…
webpack 5.112.2 compiled successfully in 1128 ms
```

In the browser, style-loader created two `<style>` elements, the reset first and then the main stylesheet, and the background line had been rewritten to the emitted file:

```
background: url(http://localhost:5611/dist/24df29a553460df819c7.svg) no-repeat left center;
```

Because `url()` is followed like an import, a broken path is now a build error rather than a missing icon you might not notice. Neha misspelled the file name once:

```
ERROR in ./src/style.css (./node_modules/css-loader/dist/cjs.js!./src/style.css) 6:36-84
Module not found: Error: Can't resolve './images/reciept.svg' in '…/expense-tracker/src'
Did you mean './images/receipt.svg'?
'receipt.svg' is the closest name in that directory. It differs from the request by 1 character, ignoring case and file extension.
```

## 7. Inline the image, or keep it as a file

An image can also be written straight into the bundle as a `data:` URL, a long string such as `data:image/png;base64,iVBORw0KGgo…` that contains the whole file. Webpack offers three types, and Neha built the tracker with each one:

| `type` | Files in `dist/` besides `main.js` | `main.js` |
| --- | --- | --- |
| `asset/resource` | logo (8.84 KiB) and icon (250 bytes) | 25.2 KiB |
| `asset/inline` | none | 36.7 KiB |
| `asset` | logo only | 25.5 KiB |

With `asset/resource`, every image is a separate file and costs a separate request. With `asset/inline`, every image is inside the JavaScript. The 9,051-byte logo added about 11 KiB to `main.js`, because base64 text is about a third bigger than the file it encodes. An inlined image also cannot be cached on its own: any change to the code means downloading the logo again inside the new `main.js`.

The plain `asset` type chooses per file. Files under a size limit are inlined and larger ones are emitted. The default limit is 8,096 bytes (the documentation calls it "8kb"; the number in webpack's source is 8096). The 250-byte icon went inline and the 9,051-byte logo stayed a file. The limit can be changed on the rule:

```js
{
  test: /\.(png|svg)$/,
  type: 'asset',
  parser: {
    dataUrlCondition: { maxSize: 10 * 1024 },
  },
},
```

With a 10 KiB limit the logo was inlined too, and `main.js` went back to 36.7 KiB. Neha keeps the default: tiny icons inline, everything else as files.

## 8. TypeScript and JSX

Code written in other languages goes through the same machinery. To see where webpack 5.112 stands, Neha tried two tiny files with no rules for them at all. The first, `total.ts`, has type annotations:

```ts
type Expense = { id: number; date: string; note: string; amount: number };

export function total(list: Expense[]): number {
  return list.reduce((sum, e) => sum + e.amount, 0);
}
```

imported from a test entry:

```js
import { total } from './total.ts';
console.log(total([{ id: 1, date: '2026-11-02', note: 'Groceries', amount: 2340 }]));
```

It built, the bundle printed `2340`, and Node printed a warning during the build:

```
(node:71038) ExperimentalWarning: stripTypeScriptTypes is an experimental feature and might change at any time
```

Webpack 5.112 removes TypeScript types by itself when Node provides `module.stripTypeScriptTypes` (Node 22.13 does), as long as no loader is set up for `.ts` files. It only deletes the annotations. It does not check them.

The second file, `row.jsx`, has one line of JSX:

```
ERROR in ./src/row.jsx 1:26
Module parse failed: Unexpected token (1:26)
File was parsed as module type 'javascript/auto'.
You may need an appropriate loader to handle this file type, currently no loaders are configured to process this file. See https://webpack.js.org/concepts#loaders
> 1 | export const row = (e) => <li>{e.note}</li>;
    |                           ^
```

JSX still needs a translator, such as babel-loader, ts-loader or swc-loader. [Lesson 12](12-typescript-and-jsx.md) sets those up, and shows why removing types is not the same as checking them.
