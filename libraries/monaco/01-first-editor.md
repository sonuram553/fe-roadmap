# Lesson 1 — Your first Monaco editor

Level: beginner. Written against `monaco-editor` **0.57.0** with Vite 8. Monaco's setup changed a lot between 0.53 and 0.56, so tutorials from before 2025 are often wrong in small, confusing ways. When a snippet you found online disagrees with these lessons, check the version it was written for.

## 1. What Monaco is

Monaco is the text editor from VS Code, lifted out and packaged as an npm library. When you type in VS Code, the part that draws the lines, colours the keywords, handles multiple cursors, find-and-replace, code folding and the little suggestion popup is Monaco. You can put that same editor on any web page.

What you do not get is everything around the editor. There is no file tree, no terminal, no Git panel, no extensions marketplace, no settings screen. Monaco is one box on a page that edits text very well. If you want tabs or a file list, you build them yourself around it.

Throughout these lessons, think of Monaco as **stage machinery taken out of a big theatre**. VS Code is the theatre. Monaco is the stage, the lighting rig and the backstage crew, unbolted so you can install them in your own building. You bring the building (your page), and you decide what plays on the stage.

Our running example is Priya. She works on an internal tools team, and she has been asked to build a **query playground**: a web page where her colleagues can write SQL and a small log-search language the team invented, called LogQ. Over these lessons she will go from an empty page to a playground with tabs, themes, error squiggles, a Run button, autocomplete for her own language, a diff view and a React wrapper.

## 2. Installing it and wiring up the workers

Priya starts with a fresh Vite project and installs the package:

```bash
npm create vite@latest query-playground -- --template vanilla
cd query-playground
npm install monaco-editor
```

Before she writes any editor code, she needs to know about **web workers**. A web worker is a separate JavaScript thread in the browser. Code running in a worker cannot touch the page, but it also cannot freeze it. Monaco uses workers for slow jobs: working out what changed between two versions of a file, checking TypeScript for errors, validating JSON against a schema. In our theatre, the workers are the backstage crew. They build the sets out of sight so the performance on stage never stops.

Monaco has one general worker, plus four specialist ones for the languages it understands deeply. Priya creates a file that loads Monaco and tells it where each worker lives:

```js
// src/monaco-setup.js
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import TsWorker from 'monaco-editor/languages/features/typescript/ts.worker?worker';
import JsonWorker from 'monaco-editor/languages/features/json/json.worker?worker';
import CssWorker from 'monaco-editor/languages/features/css/css.worker?worker';
import HtmlWorker from 'monaco-editor/languages/features/html/html.worker?worker';

self.MonacoEnvironment = {
  getWorker(_workerId, label) {
    if (label === 'typescript' || label === 'javascript') return new TsWorker();
    if (label === 'json') return new JsonWorker();
    if (label === 'css' || label === 'scss' || label === 'less') return new CssWorker();
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new HtmlWorker();
    return new EditorWorker();
  },
};

export { monaco };
```

The `?worker` at the end of each import is a Vite feature. It means "don't run this file here; bundle it as a separate worker script and give me a class that starts it". `new TsWorker()` then starts a real browser worker.

`MonacoEnvironment` is a global object Monaco looks for. Whenever Monaco needs a worker, it calls `getWorker` with a **label**. The label is the language id for the specialist workers (`'typescript'`, `'json'`, and so on), and something else for the general one (it is `'editorWorkerService'`, but you only need the fallback `return new EditorWorker()` to catch it).

If Priya's playground never edits CSS or HTML, she can drop those two imports and branches. The workers are only downloaded when a model of that language is opened, but leaving out the import also keeps them out of the build.

## 3. Why the worker setup is not optional

Monaco 0.57 can actually find its workers on its own. Internally it creates them with `new Worker(new URL('ts.worker.js', import.meta.url))`, a pattern Vite and webpack both understand. So Priya tried deleting `MonacoEnvironment` to see what happens.

In the dev server (`npm run dev`) everything worked. Autocomplete for JavaScript came up with `fill`, `filter`, `find`, `findIndex`, `findLast` after typing `arr.fi`.

Then she ran `npm run build` and opened the production build. The browser console showed this:

```
Failed to load worker script for label: editorWorkerService.
Ensure your bundler properly bundles modules referenced by "new URL('...?esm', import.meta.url)". TypeError: Failed to resolve module specifier "../../../base/common/worker/webWorkerBootstrap.js". Invalid relative url or base scheme isn't hierarchical.
```

The two workers are referenced in two different ways, and Vite treats them differently. The TypeScript worker is started with `new Worker(new URL('ts.worker.js', import.meta.url))` on one line. Vite recognises that whole pattern as "a worker lives here", so it **bundles** the file: it follows every import inside it and packs the lot into one self-contained `ts.worker-*.js`. The general worker's URL is built with a bare `new URL('editorWebWorkerMain.js', import.meta.url)` inside a helper function, away from any `new Worker`. Vite can't tell that is a worker, so it treats the file as a plain asset, like an image, and copies it **without looking at its imports**. That file is only a few lines long, and most of them are imports:

```js
import { bootstrapWebWorker } from '../../../base/common/worker/webWorkerBootstrap.js';
import { EditorWorker } from './editorWebWorker.js';
```

Those paths point at files in `node_modules` that never made it into `dist`, so the worker can't start. Because the file is under 4 KB, Vite also inlined it as a `data:` URL (its `build.assetsInlineLimit` rule), which is why the error talks about a base that "isn't hierarchical": a `data:` URL has no folder for `../../../` to climb out of. Turning inlining off only changes the error. Priya rebuilt with `assetsInlineLimit: 0`, and the file became `editorWebWorkerMain-J2ryhYi2.js` with the same unresolvable imports inside.

Putting `MonacoEnvironment.getWorker` back fixed the production build. The browser then fetched `editor.worker-DWPaKKV_.js` and `ts.worker-D0RfN2Tp.js` as real files. The lesson: the dev server is not proof. Always configure the workers yourself, and always test a production build once.

## 4. Putting an editor on the page

The editor needs an empty element to live in. Priya adds one to `index.html`:

```html
<div id="editor" style="width: 800px; height: 400px"></div>
<script type="module" src="/src/main.js"></script>
```

And creates the editor:

```js
// src/main.js
import { monaco } from './monaco-setup.js';

const editor = monaco.editor.create(document.getElementById('editor'), {
  value: 'SELECT name, email\nFROM users\nWHERE active = true;',
  language: 'sql',
});

console.log(editor.getValue());
```

That is a full, working code editor with SQL colouring, line numbers, a minimap on the right, find (`Ctrl/Cmd+F`), multiple cursors (`Alt+click`) and a command palette (`F1`). `editor.getValue()` returns the current text as a plain string.

`monaco.editor.create` takes two arguments: the container element, and an options object. `value` and `language` are the two you will use every time. [Lesson 3](03-options-and-themes.md) covers the rest of the options.

The one thing that trips up nearly everyone is the container's size. Monaco fills the element you give it. It does not grow to fit its text. If the element has no height, the editor has no height. Priya tested this by creating an editor in a plain `<div>` with no styles:

```
editor height: 5 / container offsetHeight 5
```

Five pixels tall. The editor exists, but you see a thin line, or nothing. Whenever an editor "doesn't show up", check the container's height first. Give it a fixed height, or make it a flex or grid child that stretches.

## 5. When the container changes size

Monaco measures its container once, when it is created, and lays everything out to fit. It does not watch for changes on its own. Priya made an 800px-wide editor and then shrank its container to 500px:

```
width before:              800
after shrinking container: 800
after editor.layout():     500
```

The editor kept drawing itself 800px wide, spilling out of its box, until she called `editor.layout()`, which tells it to measure again. Calling `layout()` from a window resize handler works, but there is an easier way. The `automaticLayout` option makes Monaco watch its container with a `ResizeObserver`:

```js
const editor = monaco.editor.create(container, {
  value: '',
  language: 'sql',
  automaticLayout: true,
});
```

With it on, the same experiment went from 800 to 500 by itself. Priya's playground lives in a resizable panel, so she turns it on everywhere.

## 6. Cleaning up

When Priya's page removes an editor (closing a panel, leaving a route), she must call `dispose()` on it. Monaco attaches listeners, observers and DOM nodes, and none of them go away if you just remove the container from the page.

```js
editor.dispose();
```

After `dispose()`, the container that had held the editor was empty again: its child count went from 1 to 0. Cleaning up the text the editor was holding has a few more details, and [lesson 2](02-models-and-tabs.md) §5 covers them.
