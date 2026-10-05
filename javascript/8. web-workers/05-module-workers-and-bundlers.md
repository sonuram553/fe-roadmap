# Lesson 5 — Module workers and bundlers

Level: intermediate. Using `import` inside a worker, the one line of code bundlers look for, and inline workers made from a string. Examples use Vite 8.

## 1. Classic workers and module workers

Every worker so far has been a **classic worker**: an old-style script, loaded with `importScripts`. Kabir's real editor is a Vite project with ES modules everywhere, so he wants his worker to use `import` like the rest of his code:

```js
// src/blur.worker.js
import { blur } from './blur.js';

self.onmessage = (event) => {
  const { pixels, width, height, radius } = event.data;
  self.postMessage(blur(pixels, width, height, radius));
};
```

A worker only understands `import` if you ask for a **module worker** when you create it:

```js
const worker = new Worker('/src/blur.worker.js', { type: 'module' });
```

Kabir tried mixing the two up, both ways round:

```
[classic with import]        error: Uncaught SyntaxError: Cannot use import statement outside a module
[module with importScripts]  error: Uncaught TypeError: Failed to execute 'importScripts' on 'WorkerGlobalScope': Module scripts don't support importScripts().
```

Without `type: 'module'`, the `import` line is a syntax error. With it, `importScripts` is gone. It's one or the other. Module workers also behave like `<script type="module">` in the other ways you'd expect: they run in strict mode, and top-level `await` works. All current browsers support them; Firefox was last, in 2023.

## 2. The line bundlers look for

In a bundled project there's a catch. The file Kabir writes (`src/blur.worker.js`) is not the file that ends up on the server. The bundler rewrites it, pulls in `blur.js`, and gives it a new name with a hash like `blur.worker-BDY6OdrP.js`. A string such as `'/src/blur.worker.js'` works in the dev server but points at nothing in the production build.

The fix is a pattern that Vite, webpack 5, Parcel and Rollup plugins all understand:

```js
const worker = new Worker(new URL('./blur.worker.js', import.meta.url), { type: 'module' });
```

`import.meta.url` is the URL of the current module, and `new URL('./blur.worker.js', import.meta.url)` means "the file next to this one". The path is resolved from the folder that `import.meta.url` is in, not from the module file itself:

```js
// import.meta.url = http://localhost:5173/src/main.js
new URL('./blur.worker.js', import.meta.url)
// → http://localhost:5173/src/blur.worker.js
```

On its own that's just standard JavaScript. The trick is that the bundler recognises this exact shape, `new Worker(new URL('…', import.meta.url))`, treats the path as a separate entry point, bundles it with its imports, and replaces the path with the final hashed file name. Write it as one expression like this. If the URL is built in a variable first, or the path is computed, most bundlers won't spot it.

Kabir's production build (`vite build`) emitted the worker as its own file, with `blur.js` folded into it:

```
dist/assets/blur.worker-BDY6OdrP.js           0.44 kB
dist/assets/index-DZD7_wGR.js                 1.25 kB │ gzip: 0.68 kB
```

In both `vite` (dev) and `vite preview` (the production build), the worker came up and returned a blurred `Uint8ClampedArray`.

## 3. Vite's `?worker` import

Vite also has its own shortcut. Adding `?worker` to an import gives you a class that starts the worker:

```js
import BlurWorker from './blur.worker.js?worker';

const worker = new BlurWorker();
```

It produces the same thing. With both forms in the same project, the build still contained one `blur.worker-BDY6OdrP.js`. Pick whichever you like, but know that `?worker` only works in Vite, while the `new URL` form is plain JavaScript that other bundlers (and no bundler at all) understand. Kabir uses the `new URL` form so his code isn't tied to one tool.

## 4. Inline workers from a string

Sometimes there's no separate file to point at. A worker needs its own file, which the browser fetches by URL. For an app, that's no problem, because you control the server and the bundler emits the worker file for you (§2). A library is different: its author doesn't control the server it ends up on.

Say someone publishes an image-filter library as one file, `filters.js`, and you load it with a `<script>` tag or from a CDN. If its code ran `new Worker('filters-worker.js')`, two things would go wrong:

- **The file probably isn't there.** The browser would look for `filters-worker.js` relative to *your* page, so you'd have to find that file in the library's package, copy it onto your server, and keep it at the same version as `filters.js`.
- **A CDN copy wouldn't help.** If the library comes from a CDN, the worker file lives on the CDN's domain. A page can only start a worker from its own origin ([lesson 1](01-why-workers.md) §5), so the browser refuses.

PDF.js, the library that renders PDFs in the browser, shows what that costs: it asks you to host its worker file yourself and tell it where it is with `GlobalWorkerOptions.workerSrc`.

The old trick avoids all of that. The library carries the worker's code as a string inside its one file, turns that string into a **Blob** (an in-memory file), and gives the worker a URL to that:

```js
const code = `
  self.onmessage = (e) => self.postMessage(e.data * 2);
`;
const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
const worker = new Worker(url);
worker.onmessage = (e) => console.log('blob worker says', e.data);
worker.postMessage(21);
```

```
blob url: blob:http://localhost:5299/<id>
blob worker says 42
```

It works, and a blob URL counts as the page's own origin, so it gets around the same-origin rule from [lesson 1](01-why-workers.md) §5. The library ships as one file with nothing extra to host, and its worker always matches its version. But a blob has no folder. When Kabir's blob worker tried `importScripts('blur.js')`:

```
Uncaught SyntaxError: Failed to execute 'importScripts' on 'WorkerGlobalScope': The URL 'blur.js' is invalid.
```

There's nothing for `blur.js` to be relative to. An inline worker has to be entirely self-contained, or use full absolute URLs for anything it loads. Vite's `?worker&inline` does this for you by bundling everything into the string first. For an app, a real file is simpler; save inline workers for libraries.

With the worker set up properly, Kabir's editor now needs more than one kind of request, and a way to tell the replies apart. That is [lesson 6](06-request-and-response.md).
